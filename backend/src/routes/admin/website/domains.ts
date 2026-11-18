import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import {
  normalizeDomain,
  validateDomainForRegistration,
} from "../../../utils/domain.js";
import {
  verifyDomainDns,
  getDnsInstructionsForDomain,
} from "../../../utils/domainDns.js";
import {
  provisionDomainSsl,
  removeDomainSslAndNginx,
} from "../../../services/ssl.service.js";

async function assertWebsiteOwnership(websiteId: string, tenantId: string) {
  const website = await prisma.website.findFirst({
    where: { id: websiteId, tenantId },
  });
  if (!website) {
    const error: any = new Error("Website not found");
    error.statusCode = 404;
    throw error;
  }
  return website;
}

// ══════════════════════════════════════════════════════════
// LIST DOMAINS
// ══════════════════════════════════════════════════════════

export async function listDomains(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;

    await assertWebsiteOwnership(websiteId, tenantId);

    const domains = await prisma.websiteDomain.findMany({
      where: { websiteId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    res.json({
      success: true,
      data: domains,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// ADD DOMAIN
// ══════════════════════════════════════════════════════════

export async function addDomain(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;
    const { domain, isPrimary } = req.body;

    await assertWebsiteOwnership(websiteId, tenantId);

    // 1. Normalize and Validate Domain
    const validation = validateDomainForRegistration(domain);
    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        message: validation.error || "Invalid domain name",
      });
      return;
    }

    const cleanDomain = validation.cleanDomain;
    const isPlatformSubdomain = validation.isPlatformSubdomain;

    // 2. Check if domain already exists across entire system
    const existing = await prisma.websiteDomain.findUnique({
      where: { domain: cleanDomain },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: `Domain "${cleanDomain}" is already connected to a website.`,
      });
      return;
    }

    // 3. Generate verification token and tailored DNS instructions
    const verificationToken = `mpmla-verify-${crypto.randomBytes(12).toString("hex")}`;
    const dnsInstructions = getDnsInstructionsForDomain(
      cleanDomain,
      verificationToken,
    );

    // 4. Create database record
    // Custom domains start as PENDING / inactive. Platform subdomains auto-activate.
    const newDomain = await prisma.websiteDomain.create({
      data: {
        websiteId,
        domain: cleanDomain,
        type: isPlatformSubdomain ? "SUBDOMAIN" : "CUSTOM",
        isPrimary: isPrimary ?? false,
        isVerified: isPlatformSubdomain,
        isActive: isPlatformSubdomain,
        verificationToken: isPlatformSubdomain ? null : verificationToken,
        sslStatus: isPlatformSubdomain ? "ACTIVE" : "PENDING",
        verifiedAt: isPlatformSubdomain ? new Date() : null,
        dnsRecords: dnsInstructions.records,
      },
    });

    res.status(201).json({
      success: true,
      message: isPlatformSubdomain
        ? `Platform subdomain "${cleanDomain}" is active!`
        : `Custom domain added. Please configure DNS records at your registrar to verify ownership.`,
      data: newDomain,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// VERIFY DOMAIN DNS
// ══════════════════════════════════════════════════════════

export async function verifyDomain(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;
    const domainId = req.params.domainId as string;

    const isDevelopment = process.env.NODE_ENV !== "production";
    const forceSimulate =
      isDevelopment &&
      (req.body?.simulate === true || req.query?.simulate === "true");

    // 1. Strict Production Check: Simulation is forbidden in production!
    if (req.body?.simulate === true || req.query?.simulate === "true") {
      if (!isDevelopment) {
        res.status(403).json({
          success: false,
          verified: false,
          message:
            "Simulation / dev bypass mode is strictly disabled in production. Real DNS ownership verification is required.",
        });
        return;
      }
    }

    await assertWebsiteOwnership(websiteId, tenantId);

    // Verify domain belongs to this website
    const domainRecord = await prisma.websiteDomain.findFirst({
      where: { id: domainId, websiteId },
    });

    if (!domainRecord) {
      res.status(404).json({ success: false, message: "Domain not found for this website" });
      return;
    }

    const cleanDomain = normalizeDomain(domainRecord.domain);
    const validation = validateDomainForRegistration(cleanDomain);
    const isPlatformSubdomain = validation.isPlatformSubdomain;

    // Dev Simulation Bypass (only permitted when NOT in production)
    if (forceSimulate) {
      const updated = await prisma.websiteDomain.update({
        where: { id: domainId },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          sslStatus: "ACTIVE",
          isActive: true,
        },
      });

      res.json({
        success: true,
        verified: true,
        message: "Domain ownership verified (Dev Simulation Mode)",
        data: updated,
      });
      return;
    }

    // Platform subdomains auto-activate (under platform wildcard DNS)
    if (isPlatformSubdomain) {
      const updated = await prisma.websiteDomain.update({
        where: { id: domainId },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          sslStatus: "ACTIVE",
          isActive: true,
        },
      });

      res.json({
        success: true,
        verified: true,
        message: "Platform subdomain is active and verified",
        data: updated,
      });
      return;
    }

    if (!domainRecord.verificationToken) {
      res.status(400).json({
        success: false,
        verified: false,
        message: "Verification token is unavailable for this domain",
      });
      return;
    }

    // 2. Perform actual DNS lookup
    const result = await verifyDomainDns(
      cleanDomain,
      domainRecord.verificationToken,
    );

    if (!result.verified) {
      res.status(200).json({
        success: true,
        verified: false,
        message:
          result.errors.length > 0
            ? result.errors[0]
            : "DNS records are not configured correctly yet. Changes may take up to 30 minutes to propagate.",
        data: result,
      });
      return;
    }

    // 3. Mark DNS as verified, but keep isActive=false until SSL is provisioned
    const updated = await prisma.websiteDomain.update({
      where: { id: domainId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        sslStatus: "PROVISIONING",
        isActive: false, // Activated only after HTTPS handshake confirms live cert
      },
    });

    // 4. Trigger SSL certificate provisioning in background
    provisionDomainSsl(domainId, websiteId).catch((err) => {
      console.error(`[SSL Provisioning Error for ${cleanDomain}]:`, err);
    });

    res.json({
      success: true,
      verified: true,
      message: "Domain ownership verified successfully! SSL certificate is being provisioned.",
      data: updated,
      diagnostics: result,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// PROVISION SSL MANUALLY / RETRY
// ══════════════════════════════════════════════════════════

export async function provisionSsl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;
    const domainId = req.params.domainId as string;

    await assertWebsiteOwnership(websiteId, tenantId);

    const domainRecord = await prisma.websiteDomain.findFirst({
      where: { id: domainId, websiteId },
    });

    if (!domainRecord) {
      res.status(404).json({ success: false, message: "Domain not found" });
      return;
    }

    const result = await provisionDomainSsl(domainId, websiteId);

    res.json({
      success: result.success,
      message: result.message,
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || "Failed to provision SSL certificate",
    });
  }
}

// ══════════════════════════════════════════════════════════
// GET DOMAIN LIVE STATUS
// ══════════════════════════════════════════════════════════

export async function getDomainStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;
    const domainId = req.params.domainId as string;

    await assertWebsiteOwnership(websiteId, tenantId);

    const domain = await prisma.websiteDomain.findFirst({
      where: { id: domainId, websiteId },
    });

    if (!domain) {
      res.status(404).json({ success: false, message: "Domain not found" });
      return;
    }

    res.json({
      success: true,
      data: {
        id: domain.id,
        domain: domain.domain,
        type: domain.type,
        isPrimary: domain.isPrimary,
        isVerified: domain.isVerified,
        isActive: domain.isActive,
        sslStatus: domain.sslStatus,
        verifiedAt: domain.verifiedAt,
        dnsRecords: domain.dnsRecords,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// SET PRIMARY DOMAIN (Safe transaction & ownership check)
// ══════════════════════════════════════════════════════════

export async function setPrimaryDomain(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;
    const domainId = req.params.domainId as string;

    await assertWebsiteOwnership(websiteId, tenantId);

    // Validate that the domain belongs to this specific website AND is verified/active/SSL-ready
    const domain = await prisma.websiteDomain.findFirst({
      where: {
        id: domainId,
        websiteId,
        isVerified: true,
        isActive: true,
        sslStatus: "ACTIVE",
      },
    });

    if (!domain) {
      res.status(400).json({
        success: false,
        message:
          "Domain must be verified, active, and have an active SSL certificate before it can be set as primary.",
      });
      return;
    }

    // Atomic transaction: unset any existing primary and set new primary
    const updated = await prisma.$transaction(async (tx) => {
      await tx.websiteDomain.updateMany({
        where: {
          websiteId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });

      return tx.websiteDomain.update({
        where: {
          id: domainId,
        },
        data: {
          isPrimary: true,
        },
      });
    });

    res.json({
      success: true,
      message: `Set "${updated.domain}" as the primary domain`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// DELETE DOMAIN
// ══════════════════════════════════════════════════════════

export async function deleteDomain(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;
    const domainId = req.params.domainId as string;

    await assertWebsiteOwnership(websiteId, tenantId);

    const existing = await prisma.websiteDomain.findFirst({
      where: { id: domainId, websiteId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Domain not found for this website" });
      return;
    }

    // Clean up Nginx virtual host files and Certbot registration in production
    await removeDomainSslAndNginx(existing.domain).catch((cleanupErr: any) => {
      console.warn(`[Domain Deletion] Nginx cleanup warning:`, cleanupErr);
    });

    await prisma.websiteDomain.delete({ where: { id: domainId } });

    res.json({
      success: true,
      message: `Domain "${existing.domain}" removed and Nginx routing cleared`,
    });
  } catch (err) {
    next(err);
  }
}
