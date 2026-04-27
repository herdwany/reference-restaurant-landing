import { AppwriteException, Client, ID, Query, TablesDB, Users } from "node-appwrite";

const MAX_TEXT_LENGTH = 500;
const ALLOWED_BUSINESS_TYPES = ["restaurant", "cafe", "bakery", "cloud_kitchen", "other"];
const ALLOWED_STATUSES = ["draft", "active"];
const ALLOWED_PLANS = ["starter", "pro", "premium"];

const env = (key, fallback = "") => process.env[key]?.trim() || fallback;

const config = {
  endpoint: env("APPWRITE_ENDPOINT", env("APPWRITE_FUNCTION_API_ENDPOINT")),
  projectId: env("APPWRITE_PROJECT_ID", env("APPWRITE_FUNCTION_PROJECT_ID")),
  apiKey: env("APPWRITE_API_KEY"),
  databaseId: env("APPWRITE_DATABASE_ID"),
  restaurantsTableId: env("APPWRITE_RESTAURANTS_TABLE_ID", "restaurants"),
  profilesTableId: env("APPWRITE_PROFILES_TABLE_ID", "profiles"),
  siteSettingsTableId: env("APPWRITE_SITE_SETTINGS_TABLE_ID", "site_settings"),
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

const getHeader = (req, key) => {
  const headers = req.headers ?? {};
  const normalizedKey = key.toLowerCase();

  for (const [headerKey, value] of Object.entries(headers)) {
    if (headerKey.toLowerCase() === normalizedKey) {
      return Array.isArray(value) ? value[0] : value;
    }
  }

  return "";
};

const cleanText = (value, maxLength = MAX_TEXT_LENGTH) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
};

const normalizeEmail = (value) => cleanText(value, 255).toLowerCase();

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isSlug = (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const isOptionalPhone = (value) => !value || /^\+?[0-9\s().-]{6,50}$/.test(value);

const createServerClients = () => {
  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);

  return {
    tablesDb: new TablesDB(client),
    users: new Users(client),
  };
};

const getColumnKeys = async (tablesDb, tableId) => {
  const response = await tablesDb.listColumns({
    databaseId: config.databaseId,
    tableId,
    queries: [Query.limit(100)],
  });

  const columns = response.columns ?? response.rows ?? [];
  return new Set(columns.map((column) => column.key).filter(Boolean));
};

const pickExistingColumns = (data, columnKeys) =>
  Object.fromEntries(Object.entries(data).filter(([key]) => columnKeys.has(key)));

const getAgencyUserId = (req) => cleanText(getHeader(req, "x-appwrite-user-id"), 255);

const assertAgencyAdmin = async (tablesDb, req) => {
  const userId = getAgencyUserId(req);

  if (!userId) {
    throw new HttpError(403, "لا يمكن إنشاء عميل بدون جلسة وكالة موثقة.");
  }

  const response = await tablesDb.listRows({
    databaseId: config.databaseId,
    tableId: config.profilesTableId,
    queries: [Query.equal("userId", userId), Query.limit(1)],
  });

  const profile = response.rows[0];

  if (!profile || profile.role !== "agency_admin" || profile.isActive === false) {
    throw new HttpError(403, "هذه العملية متاحة لحسابات الوكالة فقط.");
  }

  return { profile, userId };
};

const validateInput = (input) => {
  const restaurantName = cleanText(input.restaurantName, 255);
  const restaurantNameAr = cleanText(input.restaurantNameAr, 255);
  const slug = cleanText(input.slug, 120).toLowerCase();
  const businessType = cleanText(input.businessType, 80);
  const ownerName = cleanText(input.ownerName, 128);
  const ownerEmail = normalizeEmail(input.ownerEmail);
  const ownerPhone = cleanText(input.ownerPhone, 50);
  const temporaryPassword = cleanText(input.temporaryPassword, 256);
  const status = cleanText(input.status, 50) || "draft";
  const plan = cleanText(input.plan, 50);
  const notes = cleanText(input.notes, 1000);

  if (!restaurantName) {
    throw new HttpError(400, "اسم المطعم مطلوب.");
  }

  if (!slug || !isSlug(slug)) {
    throw new HttpError(400, "الرابط يجب أن يحتوي أحرفًا صغيرة وأرقامًا وشرطات فقط.");
  }

  if (!ALLOWED_BUSINESS_TYPES.includes(businessType)) {
    throw new HttpError(400, "نوع النشاط غير صالح.");
  }

  if (!ownerName) {
    throw new HttpError(400, "اسم المالك مطلوب.");
  }

  if (!ownerEmail || !isEmail(ownerEmail)) {
    throw new HttpError(400, "بريد المالك غير صالح.");
  }

  if (temporaryPassword.length < 8) {
    throw new HttpError(400, "كلمة المرور المؤقتة يجب أن تكون 8 أحرف على الأقل.");
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new HttpError(400, "حالة المطعم غير صالحة.");
  }

  if (plan && !ALLOWED_PLANS.includes(plan)) {
    throw new HttpError(400, "الخطة غير صالحة.");
  }

  if (!isOptionalPhone(ownerPhone)) {
    throw new HttpError(400, "رقم الهاتف غير صالح.");
  }

  return {
    restaurantName,
    restaurantNameAr: restaurantNameAr || restaurantName,
    slug,
    businessType,
    ownerName,
    ownerEmail,
    ownerPhone,
    temporaryPassword,
    status,
    plan: plan || null,
    notes: notes || null,
  };
};

const assertSlugAvailable = async (tablesDb, slug) => {
  const response = await tablesDb.listRows({
    databaseId: config.databaseId,
    tableId: config.restaurantsTableId,
    queries: [Query.equal("slug", slug), Query.limit(1)],
  });

  if (response.rows.length > 0) {
    throw new HttpError(409, "هذا الرابط مستخدم بالفعل.");
  }
};

const assertOwnerEmailAvailable = async (users, ownerEmail) => {
  const response = await users.list({
    queries: [Query.equal("email", ownerEmail), Query.limit(1)],
  });

  if (response.users.length > 0) {
    throw new HttpError(409, "هذا البريد مستخدم بالفعل.");
  }
};

const createOwnerUser = async (users, input) => {
  try {
    return await users.create({
      userId: ID.unique(),
      email: input.ownerEmail,
      password: input.temporaryPassword,
      name: input.ownerName,
    });
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 409) {
      throw new HttpError(409, "هذا البريد مستخدم بالفعل.");
    }

    throw error;
  }
};

const createRestaurant = async (tablesDb, input, ownerUserId, agencyUserId, restaurantColumnKeys) => {
  const baseData = {
    slug: input.slug,
    name: input.restaurantName,
    nameAr: input.restaurantNameAr,
    status: input.status,
    teamId: "",
    ownerUserId,
    businessType: input.businessType,
    tagline: input.restaurantNameAr,
    description: "",
    primaryColor: "#e51b2b",
    secondaryColor: "#f97316",
    accentColor: "#fbbf24",
    successColor: "#22c55e",
    phone: input.ownerPhone,
    whatsappNumber: input.ownerPhone,
    email: input.ownerEmail,
    address: "",
    workingHours: "",
    createdByAgencyUserId: agencyUserId,
    plan: input.plan,
    notes: input.notes,
  };

  try {
    return await tablesDb.createRow({
      databaseId: config.databaseId,
      tableId: config.restaurantsTableId,
      rowId: ID.unique(),
      data: pickExistingColumns(baseData, restaurantColumnKeys),
    });
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 409) {
      throw new HttpError(409, "هذا الرابط مستخدم بالفعل.");
    }

    throw error;
  }
};

const createOwnerProfile = async (tablesDb, input, ownerUserId, restaurantId, profileColumnKeys) => {
  const baseData = {
    userId: ownerUserId,
    restaurantId,
    teamId: "",
    role: "owner",
    fullName: input.ownerName,
    email: input.ownerEmail,
    phone: input.ownerPhone,
    isActive: true,
  };

  return tablesDb.createRow({
    databaseId: config.databaseId,
    tableId: config.profilesTableId,
    rowId: ID.unique(),
    data: pickExistingColumns(baseData, profileColumnKeys),
  });
};

const createDefaultSiteSettings = async (tablesDb, restaurantId, settingsColumnKeys) => {
  const baseData = {
    restaurantId,
    currency: "د.م",
    language: "ar",
    direction: "rtl",
    orderMode: "both",
    reservationMode: "both",
    showHero: true,
    showTrustBadges: true,
    showFeaturedDishes: true,
    showOffers: true,
    showGallery: true,
    showTestimonials: true,
    showActionGrid: true,
    showFaq: true,
    showFooter: true,
  };

  return tablesDb.createRow({
    databaseId: config.databaseId,
    tableId: config.siteSettingsTableId,
    rowId: ID.unique(),
    data: pickExistingColumns(baseData, settingsColumnKeys),
  });
};

const json = (res, body, status = 200) => res.json(body, status);

export default async ({ req, res, log, error }) => {
  try {
    assertFunctionConfig();

    const input = validateInput(parseBody(req));
    const { tablesDb, users } = createServerClients();
    const { userId: agencyUserId } = await assertAgencyAdmin(tablesDb, req);

    await assertSlugAvailable(tablesDb, input.slug);
    await assertOwnerEmailAvailable(users, input.ownerEmail);

    const [restaurantColumnKeys, profileColumnKeys, settingsColumnKeys] = await Promise.all([
      getColumnKeys(tablesDb, config.restaurantsTableId),
      getColumnKeys(tablesDb, config.profilesTableId),
      getColumnKeys(tablesDb, config.siteSettingsTableId),
    ]);

    const owner = await createOwnerUser(users, input);
    const restaurant = await createRestaurant(tablesDb, input, owner.$id, agencyUserId, restaurantColumnKeys);
    await createOwnerProfile(tablesDb, input, owner.$id, restaurant.$id, profileColumnKeys);

    let warning = null;

    try {
      await createDefaultSiteSettings(tablesDb, restaurant.$id, settingsColumnKeys);
    } catch {
      warning = "تم إنشاء العميل، لكن تعذر إنشاء إعدادات الموقع الافتراضية. قد تحتاج لإصلاحها لاحقًا.";
    }

    log(`Created client restaurant ${restaurant.$id} by agency user ${agencyUserId}`);

    return json(res, {
      ok: true,
      restaurantId: restaurant.$id,
      ownerUserId: owner.$id,
      slug: input.slug,
      warning,
    });
  } catch (caughtError) {
    const status = caughtError instanceof HttpError ? caughtError.status : 500;
    const message = caughtError instanceof Error ? caughtError.message : "تعذر إنشاء العميل.";

    error(status >= 500 ? "createClient failed." : message);

    return json(
      res,
      {
        ok: false,
        message: status >= 500 ? "تعذر إنشاء العميل. حاول مرة أخرى أو راجع إعدادات Function." : message,
      },
      status,
    );
  }
};
