import dns from "node:dns/promises";

export interface DnsVerificationResult {
  verified: boolean;
  checks: {
    txt: boolean;
    a: boolean;
    cname: boolean;
  };
  records: {
    txt: string[];
    a: string[];
    cname: string[];
  };
  expected: {
    cnameTarget: string;
    targetIp: string;
    verificationToken: string;
    txtHost: string;
  };
  errors: string[];
}

export interface DomainDnsInstructions {
  type: "APEX" | "SUBDOMAIN";
  domain: string;
  records: {
    a?: {
      type: "A";
      host: string;
      value: string;
      ttl: number;
      description: string;
    };
    cname?: {
      type: "CNAME";
      host: string;
      target: string;
      ttl: number;
      description: string;
    };
    txt: {
      type: "TXT";
      host: string;
      value: string;
      ttl: number;
      description: string;
    };
  };
}

/**
 * Safely resolves DNS TXT records.
 */
async function resolveTxtSafe(hostname: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(hostname);
    return records.map((entry) => entry.join("").trim());
  } catch {
    return [];
  }
}

/**
 * Safely resolves DNS A records.
 */
async function resolve4Safe(hostname: string): Promise<string[]> {
  try {
    const records = await dns.resolve4(hostname);
    return records.map((ip) => ip.trim());
  } catch {
    return [];
  }
}

/**
 * Safely resolves DNS CNAME records.
 */
async function resolveCnameSafe(hostname: string): Promise<string[]> {
  try {
    const records = await dns.resolveCname(hostname);
    return records.map((target) =>
      target.toLowerCase().replace(/\.$/, "").trim(),
    );
  } catch {
    return [];
  }
}

/**
 * Generates tailored DNS configuration instructions based on whether the hostname
 * is an apex root domain (e.g. `example.com`) or a subdomain (e.g. `portal.example.com`).
 */
export function getDnsInstructionsForDomain(
  cleanDomain: string,
  verificationToken: string,
): DomainDnsInstructions {
  const cnameTarget = (
    process.env.DOMAIN_CNAME_TARGET || "domains.mp.mla.vibrantick.org"
  )
    .toLowerCase()
    .replace(/\.$/, "")
    .trim();

  const targetIp = (process.env.DOMAIN_TARGET_IP || "89.116.32.160").trim();

  const parts = cleanDomain.split(".");
  const isApex = parts.length === 2;

  if (isApex) {
    // Apex Domain (e.g., example.com)
    return {
      type: "APEX",
      domain: cleanDomain,
      records: {
        a: {
          type: "A",
          host: "@",
          value: targetIp,
          ttl: 300,
          description: `Direct apex traffic (${cleanDomain}) to MP-MLA production VPS IP`,
        },
        cname: {
          type: "CNAME",
          host: "www",
          target: cnameTarget,
          ttl: 300,
          description: `Direct www subdomain (www.${cleanDomain}) to platform routing router`,
        },
        txt: {
          type: "TXT",
          host: "_mpmla-verification",
          value: verificationToken,
          ttl: 300,
          description: `Ownership verification challenge record in ${cleanDomain} zone`,
        },
      },
    };
  }

  // Subdomain (e.g. portal.example.com or volunteer.sharma.in)
  const subdomainPrefix = parts[0];
  return {
    type: "SUBDOMAIN",
    domain: cleanDomain,
    records: {
      cname: {
        type: "CNAME",
        host: subdomainPrefix,
        target: cnameTarget,
        ttl: 300,
        description: `Direct subdomain (${cleanDomain}) to platform routing target`,
      },
      a: {
        type: "A",
        host: subdomainPrefix,
        value: targetIp,
        ttl: 300,
        description: `Alternative: Direct subdomain directly to server IP`,
      },
      txt: {
        type: "TXT",
        host: `_mpmla-verification.${subdomainPrefix}`,
        value: verificationToken,
        ttl: 300,
        description: `Ownership verification challenge record for ${cleanDomain}`,
      },
    },
  };
}

/**
 * Performs actual DNS record verification for a custom domain.
 *
 * Production Rule:
 * Domain passes verification IF AND ONLY IF:
 * 1. Ownership Challenge Passed: TXT record matches verificationToken EXACTLY.
 * 2. Routing Challenge Passed: Either A record matches server IP OR CNAME matches router.
 *
 * `verified = txtMatched && routingConfigured`
 */
export async function verifyDomainDns(
  domain: string,
  token: string,
): Promise<DnsVerificationResult> {
  const errors: string[] = [];

  const expectedCnameTarget = (
    process.env.DOMAIN_CNAME_TARGET || "domains.mp.mla.vibrantick.org"
  )
    .toLowerCase()
    .replace(/\.$/, "")
    .trim();

  const expectedTargetIp = (
    process.env.DOMAIN_TARGET_IP || "89.116.32.160"
  ).trim();

  const txtHost = `_mpmla-verification.${domain}`;

  // 1. Check TXT records for ownership proof
  const [subTxt, rootTxt, aRecords, cnameRecords] = await Promise.all([
    resolveTxtSafe(txtHost),
    resolveTxtSafe(domain),
    resolve4Safe(domain),
    resolveCnameSafe(domain),
  ]);

  const allTxt = Array.from(new Set([...subTxt, ...rootTxt]));

  // Exact TXT match check
  const txtMatched = allTxt.some(
    (record) => record.trim() === token.trim(),
  );

  if (!txtMatched) {
    errors.push(
      `TXT verification token not found or does not match. Please add a TXT record for "${txtHost}" with exact value "${token}".`,
    );
  }

  // 2. Check A records for routing proof
  const aMatched = aRecords.includes(expectedTargetIp);

  // 3. Check CNAME records for routing proof (exact target match)
  const cnameMatched = cnameRecords.some(
    (record) => record === expectedCnameTarget,
  );

  const routingConfigured = aMatched || cnameMatched;

  if (!routingConfigured) {
    if (aRecords.length > 0) {
      errors.push(
        `A record points to [${aRecords.join(", ")}], but expected "${expectedTargetIp}". If using Cloudflare, disable proxy (set DNS-Only / Grey Cloud) during initial verification.`,
      );
    } else if (cnameRecords.length > 0) {
      errors.push(
        `CNAME record points to [${cnameRecords.join(", ")}], but expected "${expectedCnameTarget}".`,
      );
    } else {
      errors.push(
        `No routing A record (${expectedTargetIp}) or CNAME record (${expectedCnameTarget}) found for "${domain}".`,
      );
    }
  }

  // Strict verification rule: Both ownership (TXT) and routing (A/CNAME) are required!
  const verified = txtMatched && routingConfigured;

  return {
    verified,
    checks: {
      txt: txtMatched,
      a: aMatched,
      cname: cnameMatched,
    },
    records: {
      txt: allTxt,
      a: aRecords,
      cname: cnameRecords,
    },
    expected: {
      cnameTarget: expectedCnameTarget,
      targetIp: expectedTargetIp,
      verificationToken: token,
      txtHost,
    },
    errors,
  };
}
