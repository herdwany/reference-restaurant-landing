import { Client, ID, Query, TablesDB } from "node-appwrite";

const env = (key, fallback = "") => process.env[key]?.trim() || fallback;

const config = {
    endpoint: env("APPWRITE_ENDPOINT", env("APPWRITE_FUNCTION_API_ENDPOINT")),
    projectId: env("APPWRITE_PROJECT_ID", env("APPWRITE_FUNCTION_PROJECT_ID")),
    apiKey: env("APPWRITE_API_KEY"),
    databaseId: env("APPWRITE_DATABASE_ID"),
    restaurantsTableId: env("APPWRITE_RESTAURANTS_TABLE_ID", "restaurants"),
    profilesTableId: env("APPWRITE_PROFILES_TABLE_ID", "profiles"),
    auditLogsTableId: env("APPWRITE_AUDIT_LOGS_TABLE_ID", "audit_logs"),
};

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.name = "HttpError";
        this.status = status;
    }
}

const requiredConfigKeys = ["endpoint", "projectId", "apiKey", "databaseId"];

const assertFunctionConfig = () => {
    const missingKeys = requiredConfigKeys.filter((key) => !config[key]);

    if (missingKeys.length > 0) {
        throw new HttpError(500, `Function is missing required environment variables: ${missingKeys.join(", ")}`);
    }
};

const parseBody = (req) => {
    if (req.bodyJson && typeof req.bodyJson === "object") {
        return req.bodyJson;
    }

    const rawBody = req.bodyText ?? req.bodyRaw ?? req.body ?? req.payload ?? "";

    if (typeof rawBody === "object" && rawBody !== null) {
        return rawBody;
    }

    if (!rawBody || typeof rawBody !== "string") {
        throw new HttpError(400, "Request body must be valid JSON.");
    }

    try {
        return JSON.parse(rawBody);
    } catch {
        throw new HttpError(400, "Request body must be valid JSON.");
    }
};

const cleanText = (value, maxLength = 255) => {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim().slice(0, maxLength);
};

const getUserId = (req) => {
    const userId = req.headers?.["x-appwrite-user-id"] ?? req.headers?.["X-Appwrite-User-Id"];

    if (!userId || typeof userId !== "string") {
        throw new HttpError(401, "Unauthorized: user ID not provided.");
    }

    return cleanText(userId, 255);
};

const createTablesDb = () => {
    const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
    return new TablesDB(client);
};

const validateCallerIsAgencyAdmin = async (tablesDb, userId, restaurantId) => {
    try {
        const response = await tablesDb.listRows({
            databaseId: config.databaseId,
            tableId: config.profilesTableId,
            queries: [
                Query.equal("userId", userId),
                Query.equal("role", "agency_admin"),
                Query.equal("active", true),
                Query.limit(1),
            ],
        });

        const profile = response.rows[0];

        if (!profile) {
            throw new HttpError(403, "Forbidden: insufficient permissions.");
        }

        return profile;
    } catch (error) {
        if (error instanceof HttpError) {
            throw error;
        }

        throw new HttpError(403, "Forbidden: could not verify permissions.");
    }
};

const parseUpdateInput = (input, restaurantId) => {
    const allowedFields = [
        "domainType",
        "subdomain",
        "customDomain",
        "dnsTarget",
        "domainStatus",
        "domainVerifiedAt",
        "domainNotes",
    ];
    const updates = {};
    const updateFields = [];

    for (const field of allowedFields) {
        if (field in input) {
            const value = input[field];

            if (value === null || value === undefined) {
                updates[field] = null;
            } else if (typeof value === "string") {
                const cleanedValue = cleanText(value, 500);
                if (cleanedValue || field === "domainNotes") {
                    updates[field] = cleanedValue;
                }
            } else if (typeof value === "boolean") {
                updates[field] = value;
            } else if (typeof value === "number" && !Number.isNaN(value)) {
                updates[field] = value;
            }

            if (field in updates) {
                updateFields.push(field);
            }
        }
    }

    if (updateFields.length === 0) {
        throw new HttpError(400, "No valid domain fields provided for update.");
    }

    return { updates, updateFields };
};

const validateAllowedEnumValues = (updates) => {
    const allowedEnums = {
        domainType: ["subdomain", "customDomain", "none"],
        domainStatus: ["none", "pending", "verified", "failed", "error"],
    };

    for (const [field, allowedValues] of Object.entries(allowedEnums)) {
        if (field in updates && updates[field] && !allowedValues.includes(updates[field])) {
            throw new HttpError(400, `Invalid value for ${field}.`);
        }
    }
};

const validateDomainFormat = (updates) => {
    if (updates.subdomain) {
        const subdomainPattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;

        if (!subdomainPattern.test(updates.subdomain)) {
            throw new HttpError(400, "Invalid subdomain format.");
        }
    }

    if (updates.customDomain) {
        const domainPattern =
            /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

        if (!domainPattern.test(updates.customDomain)) {
            throw new HttpError(400, "Invalid custom domain format.");
        }
    }
};

const logAudit = async (tablesDb, userId, restaurantId, action, changes, status = "success") => {
    try {
        await tablesDb.createRow({
            databaseId: config.databaseId,
            tableId: config.auditLogsTableId,
            rowId: ID.unique(),
            data: {
                userId,
                restaurantId,
                action: cleanText(action, 255),
                changes: JSON.stringify(changes || {}),
                status: cleanText(status, 50),
                createdAtText: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.warn(`Audit log failed for ${action}: ${error.message}`);
    }
};

const json = (res, body, status = 200) => res.json(body, status);

export default async ({ req, res, log, error }) => {
    try {
        assertFunctionConfig();

        const userId = getUserId(req);
        const input = parseBody(req);
        const restaurantId = cleanText(input.restaurantId, 255);

        if (!restaurantId) {
            throw new HttpError(400, "restaurantId is required.");
        }

        // Verify caller is agency_admin
        const tablesDb = createTablesDb();
        const profile = await validateCallerIsAgencyAdmin(tablesDb, userId, restaurantId);

        // Get current restaurant to verify it exists
        const currentRestaurant = await tablesDb.getRow({
            databaseId: config.databaseId,
            tableId: config.restaurantsTableId,
            rowId: restaurantId,
        });

        if (!currentRestaurant) {
            throw new HttpError(404, "Restaurant not found.");
        }

        // Parse and validate updates
        const { updates, updateFields } = parseUpdateInput(input, restaurantId);
        validateAllowedEnumValues(updates);
        validateDomainFormat(updates);

        // Update restaurant with validated fields only
        const updatedRestaurant = await tablesDb.updateRow({
            databaseId: config.databaseId,
            tableId: config.restaurantsTableId,
            rowId: restaurantId,
            data: updates,
        });

        // Log audit
        await logAudit(tablesDb, userId, restaurantId, "updateDomainSettings", {
            updatedFields,
            changes: updates,
        });

        log(`Agency admin ${userId} updated domain settings for restaurant ${restaurantId}`);

        return json(res, {
            ok: true,
            restaurantId,
            updatedFields,
            message: "Domain settings updated successfully.",
        });
    } catch (caughtError) {
        const status = caughtError instanceof HttpError ? caughtError.status : 500;
        const message = caughtError instanceof Error ? caughtError.message : "Failed to update domain settings.";

        error(message);

        return json(
            res,
            {
                ok: false,
                message: status >= 500 ? "Failed to update domain settings. Please try again." : message,
            },
            status,
        );
    }
};
