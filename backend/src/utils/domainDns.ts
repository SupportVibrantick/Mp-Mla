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
 * Performs actual DNS record verification for a custom domain.
 *
 * Requirements for verification:
 * 1. Ownership proof: TXT record at `_mpmla-verification.<domain>` must match `token`.
 *    (Or root TXT record matching `token`).
 * 2. Routing proof: Either an A record resolving to server IP OR CNAME pointing to platform router.
 *
 * If Cloudflare or a CDN proxy is active, the A record might return Cloudflare's anycast IPs.
 * In that case, matching the TXT ownership token proves domain ownership.
 */
export async function verifyDomainDns(
  domain: string,
  token: string,
): Promise<DnsVerificationResult> {
  const errors: string[] = [];

  const expectedCnameTarget = (
    process.env.DOMAIN_CNAME_TARGET ||
    process.env.CUSTOM_DOMAIN_CNAME_TARGET ||
    "domains.mpmla.in"
  )
    .toLowerCase()
    .replace(/\.$/, "")
    .trim();

  const expectedTargetIp = (
    process.env.DOMAIN_TARGET_IP ||
    process.env.CUSTOM_DOMAIN_A_RECORD ||
    "76.76.21.21"
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

  const txtMatched = allTxt.some((rec) => rec.includes(token));
  if (!txtMatched) {
    errors.push(
      `TXT verification token not found. Please add a TXT record for "${txtHost}" with value "${token}".`,
    );
  }

  // 2. Check A records for routing proof
  const aMatched =
    aRecords.length > 0 &&
    (aRecords.includes(expectedTargetIp) ||
      expectedTargetIp === "YOUR_VPS_PUBLIC_IP");

  // 3. Check CNAME records for routing proof
  const cnameMatched = cnameRecords.some(
    (c) =>
      c === expectedCnameTarget ||
      c.endsWith(`.${expectedCnameTarget}`) ||
      c === "cname.mpmla.in",
  );

  if (!aMatched && !cnameMatched) {
    if (aRecords.length > 0) {
      // Domain resolves to an IP, but not our configured IP (could be Cloudflare proxy or wrong IP)
      errors.push(
        `A record resolves to [${aRecords.join(", ")}], expected "${expectedTargetIp}". If using Cloudflare proxy, ensure TXT record is present.`,
      );
    } else if (cnameRecords.length > 0) {
      errors.push(
        `CNAME record points to [${cnameRecords.join(", ")}], expected "${expectedCnameTarget}".`,
      );
    } else {
      errors.push(
        `No A or CNAME records detected for "${domain}". Please configure routing at your registrar.`,
      );
    }
  }

  // Domain ownership is verified if:
  // - TXT ownership token matches AND (A record or CNAME record is configured)
  // - OR if routing records match exactly
  const routingConfigured = aMatched || cnameMatched || aRecords.length > 0;
  const verified = (txtMatched && routingConfigured) || (aMatched || cnameMatched);

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
