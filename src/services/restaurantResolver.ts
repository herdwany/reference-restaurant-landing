/**
 * restaurantResolver.ts
 * 
 * Helper for resolving restaurants by various methods:
 * - Path: /r/:slug (already implemented)
 * - Subdomain: feature-flagged (VITE_ENABLE_SUBDOMAIN_RESOLVER)
 * - Custom domain: feature-flagged (VITE_ENABLE_CUSTOM_DOMAIN_RESOLVER)
 * 
 * This is a foundation for multi-tenant routing.
 * DNS and SSL automation are NOT implemented.
 */

const BASE_DOMAIN = "pixelonevisuals.tech";
const ENABLE_SUBDOMAIN_RESOLVER = import.meta.env.VITE_ENABLE_SUBDOMAIN_RESOLVER === "true";
const ENABLE_CUSTOM_DOMAIN_RESOLVER = import.meta.env.VITE_ENABLE_CUSTOM_DOMAIN_RESOLVER === "true";

/**
 * Resolve restaurant slug from current hostname
 * 
 * Examples:
 * - localhost:5173 -> null (no slug)
 * - demo.pixelonevisuals.tech -> "demo" (if feature-flagged)
 * - restaurant.example.com -> lookup by customDomain (if feature-flagged)
 * - pixelonevisuals.tech -> null (no slug)
 * - www.pixelonevisuals.tech -> null (no slug)
 * - app.pixelonevisuals.tech -> null (no slug)
 */
export const resolveRestaurantSlugFromHostname = (): string | null => {
    if (typeof window === "undefined") {
        return null;
    }

    const hostname = window.location.hostname;

    // Don't try to resolve localhost or IP addresses
    if (hostname === "localhost" || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        return null;
    }

    // Subdomain resolver (feature-flagged)
    if (ENABLE_SUBDOMAIN_RESOLVER && hostname.endsWith(`.${BASE_DOMAIN}`)) {
        const subdomain = hostname.split(".")[0];

        // Ignore reserved subdomains
        const reserved = ["www", "app", "api", "admin", "mail", "ftp"];
        if (!reserved.includes(subdomain) && subdomain.length > 0) {
            return subdomain;
        }
    }

    // Custom domain resolver (feature-flagged)
    if (ENABLE_CUSTOM_DOMAIN_RESOLVER && !hostname.includes(BASE_DOMAIN)) {
        // Return null here - actual lookup would happen in the component
        // using a separate query to restaurants.customDomain
        return null;
    }

    return null;
};

/**
 * Get resolver status (for debugging/logging)
 */
export const getResolverStatus = () => ({
    subdomainEnabled: ENABLE_SUBDOMAIN_RESOLVER,
    customDomainEnabled: ENABLE_CUSTOM_DOMAIN_RESOLVER,
    detectedHostname: typeof window !== "undefined" ? window.location.hostname : "unknown",
    resolvedSlug: resolveRestaurantSlugFromHostname(),
});

/**
 * Feature flags for resolvers
 * Note: These are disabled by default for production safety.
 */
export const isSubdomainResolverEnabled = () => ENABLE_SUBDOMAIN_RESOLVER;
export const isCustomDomainResolverEnabled = () => ENABLE_CUSTOM_DOMAIN_RESOLVER;
