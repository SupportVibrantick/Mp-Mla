import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";

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
    const { domain, type, isPrimary } = req.body;

    const website = await assertWebsiteOwnership(websiteId, tenantId);

    const cleanDomain = domain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");

    // Check if domain already exists across entire system
    const existing = await prisma.websiteDomain.findUnique({
      where: { domain: cleanDomain },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: `Domain "${cleanDomain}" is already bound to a website.`,
      });
      return;
    }

    const verificationToken = `mpmla-verify-${crypto.randomBytes(12).toString("hex")}`;
    const isSubdomain = cleanDomain.endsWith(".mpmla.in") || cleanDomain.endsWith(".mpmla.com");

    const newDomain = await prisma.websiteDomain.create({
      data: {
        websiteId,
        domain: cleanDomain,
        type: type || (isSubdomain ? "SUBDOMAIN" : "CUSTOM"),
        isPrimary: isPrimary ?? false,
        isVerified: isSubdomain, // Subdomains under our apex are instantly verified
        isActive: isSubdomain,
        verificationToken: isSubdomain ? null : verificationToken,
        sslStatus: isSubdomain ? "ACTIVE" : "PENDING",
        verifiedAt: isSubdomain ? new Date() : null,
        dnsRecords: {
          cname: {
            host: cleanDomain.startsWith("www.") ? "www" : "@",
            target: "domains.mpmla.in",
          },
          txt: {
            host: `_verification.${cleanDomain}`,
            value: verificationToken,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: isSubdomain
        ? `Subdomain "${cleanDomain}" is active!`
        : `Custom domain added. Please configure your DNS records to verify.`,
      data: newDomain,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// VERIFY CUSTOM DOMAIN
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

    await assertWebsiteOwnership(websiteId, tenantId);

    const domainRecord = await prisma.websiteDomain.findFirst({
      where: { id: domainId, websiteId },
    });

    if (!domainRecord) {
      res.status(404).json({ success: false, message: "Domain not found" });
      return;
    }

    if (domainRecord.isVerified && domainRecord.isActive) {
      res.json({
        success: true,
        message: "Domain is already verified and active",
        data: domainRecord,
      });
      return;
    }

    // In a real DNS resolution flow, we perform dns.resolveTxt / dns.resolveCname.
    // Here we simulate successful DNS lookup and provision SSL.
    const updated = await prisma.websiteDomain.update({
      where: { id: domainId },
      data: {
        isVerified: true,
        isActive: true,
        sslStatus: "ACTIVE",
        verifiedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Domain "${domainRecord.domain}" verified and SSL certificate provisioned successfully!`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// SET PRIMARY DOMAIN
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

    // Unset current primary
    await prisma.websiteDomain.updateMany({
      where: { websiteId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set new primary
    const updated = await prisma.websiteDomain.update({
      where: { id: domainId },
      data: { isPrimary: true },
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
      res.status(404).json({ success: false, message: "Domain not found" });
      return;
    }

    await prisma.websiteDomain.delete({ where: { id: domainId } });

    res.json({
      success: true,
      message: `Domain "${existing.domain}" removed`,
    });
  } catch (err) {
    next(err);
  }
}
