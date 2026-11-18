import { domainToASCII } from "node:url";

/**
 * Normalizes a user-entered domain or URL into a canonical, lowercase, ASCII hostname.
 * Strips protocols (http/https), paths, query strings, ports, credentials, and trailing dots.
 */
export function normalizeDomain(input: string): string {
  if (!input || typeof input !== "string") {
    throw new Error("Domain is required");
  }

  const value = input.trim();

  // Accept a hostname, optionally entered with a scheme.
  const url = new URL(
    value.includes("://") ? value : `https://${value}`,
  );

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Invalid protocol. Only HTTP and HTTPS are permitted.");
  }

  if (url.port || url.username || url.password) {
    throw new Error("Ports and credentials are not allowed in domain names");
  }

  const hostname = domainToASCII(
    url.hostname.toLowerCase().replace(/\.$/, ""),
  );

  // Reject raw IPv4 or IPv6 addresses
  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(":");
  if (isIp) {
    throw new Error("IP addresses are not permitted. Please enter a valid domain name.");
  }

  if (
    !hostname ||
    hostname.length > 253 ||
    !hostname.includes(".") ||
    hostname.split(".").some(
      (part) =>
        !part ||
        part.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(part),
    )
  ) {
    throw new Error("Invalid domain name format");
  }

  return hostname;
}

/**
 * Validates whether a domain is allowed to be registered as a custom domain.
 * Rejects platform domains, API endpoints, internal hosts, and reserved names.
 */
export function validateDomainForRegistration(domain: string): {
  isValid: boolean;
  cleanDomain: string;
  isPlatformSubdomain: boolean;
  error?: string;
} {
  try {
    const cleanDomain = normalizeDomain(domain);

    const platformDomain = (
      process.env.PLATFORM_DOMAIN || "mp.mla.vibrantick.org"
    )
      .toLowerCase()
      .trim();

    const cnameTarget = (
      process.env.DOMAIN_CNAME_TARGET || "domains.mp.mla.vibrantick.org"
    )
      .toLowerCase()
      .replace(/\.$/, "")
      .trim();

    // Check reserved infrastructure hosts (must never be claimable as tenant domains)
    const reservedHosts = [
      "localhost",
      "127.0.0.1",
      "mp.mla.vibrantick.org",
      "admin.mp.mla.vibrantick.org",
      "api-mp-mla.vibrantick.org",
      "domains.mp.mla.vibrantick.org",
      platformDomain,
      `api.${platformDomain}`,
      `admin.${platformDomain}`,
      `app.${platformDomain}`,
      `mail.${platformDomain}`,
      `ns1.${platformDomain}`,
      `ns2.${platformDomain}`,
      cnameTarget,
    ];

    if (reservedHosts.includes(cleanDomain)) {
      return {
        isValid: false,
        cleanDomain,
        isPlatformSubdomain: false,
        error: `"${cleanDomain}" is a reserved infrastructure domain and cannot be registered.`,
      };
    }

    // Platform subdomains (e.g. rajesh.mp.mla.vibrantick.org)
    const isPlatformSubdomain = cleanDomain.endsWith(`.${platformDomain}`);

    return {
      isValid: true,
      cleanDomain,
      isPlatformSubdomain,
    };
  } catch (err: any) {
    return {
      isValid: false,
      cleanDomain: "",
      isPlatformSubdomain: false,
      error: err.message || "Invalid domain name",
    };
  }
}
