import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

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
// PUBLISH WEBSITE (CREATE DEPLOYMENT SNAPSHOT)
// ══════════════════════════════════════════════════════════

export async function publishWebsite(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;
    const { notes } = req.body;

    const website = await assertWebsiteOwnership(websiteId, tenantId);

    // Fetch complete state for snapshot
    const [pages, domains, menus, settings] = await Promise.all([
      prisma.websitePage.findMany({
        where: { websiteId },
        orderBy: [{ isHomePage: "desc" }, { order: "asc" }],
      }),
      prisma.websiteDomain.findMany({
        where: { websiteId, isActive: true },
      }),
      prisma.websiteMenu.findMany({
        where: { websiteId },
      }),
      prisma.websiteSetting.findMany({
        where: { websiteId },
      }),
    ]);

    if (pages.length === 0) {
      res.status(400).json({
        success: false,
        message: "Cannot publish a website with 0 pages. Create at least a Home page.",
      });
      return;
    }

    const nextVersion = website.publishedVersion + 1;

    // Create complete snapshot
    const snapshot = {
      version: nextVersion,
      publishedAt: new Date().toISOString(),
      website: {
        id: website.id,
        tenantId: website.tenantId,
        name: website.name,
        slug: website.slug,
        faviconUrl: website.faviconUrl,
        logoUrl: website.logoUrl,
        globalStyles: website.globalStyles,
      },
      pages: pages.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        isHomePage: p.isHomePage,
        order: p.order,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        seoImageUrl: p.seoImageUrl,
        content: p.content,
      })),
      domains: domains.map((d) => ({
        domain: d.domain,
        type: d.type,
        isPrimary: d.isPrimary,
      })),
      menus: menus.map((m) => ({
        name: m.name,
        items: m.items,
      })),
      settings: settings.map((s) => ({
        key: s.key,
        value: s.value,
      })),
    };

    // Save Deployment and update Website in a transaction
    const [deployment, updatedWebsite] = await prisma.$transaction([
      prisma.websiteDeployment.create({
        data: {
          websiteId,
          version: nextVersion,
          status: "SUCCESS",
          snapshot,
          notes: notes?.trim() || null,
          publishedBy: req.user?.name || req.user?.email || "Admin",
          publishedAt: new Date(),
        },
      }),
      prisma.website.update({
        where: { id: websiteId },
        data: {
          status: "PUBLISHED",
          publishedVersion: nextVersion,
          publishedAt: new Date(),
        },
      }),
      // Mark all pages as published
      prisma.websitePage.updateMany({
        where: { websiteId },
        data: { isPublished: true, status: "PUBLISHED" },
      }),
    ]);

    createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "website_builder",
      recordId: website.id,
      description: `Published website "${website.name}" (version ${nextVersion})`,
      ...getRequestMeta(req),
    }).catch(() => {});

    res.json({
      success: true,
      message: `Website published successfully! Version ${nextVersion} is now live.`,
      data: {
        deployment: {
          id: deployment.id,
          version: deployment.version,
          status: deployment.status,
          publishedAt: deployment.publishedAt,
        },
        website: updatedWebsite,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// LIST DEPLOYMENTS
// ══════════════════════════════════════════════════════════

export async function listDeployments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;

    await assertWebsiteOwnership(websiteId, tenantId);

    const deployments = await prisma.websiteDeployment.findMany({
      where: { websiteId },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        status: true,
        notes: true,
        publishedBy: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: deployments,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// ROLLBACK TO A DEPLOYMENT
// ══════════════════════════════════════════════════════════

export async function rollbackDeployment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;
    const deploymentId = req.params.deploymentId as string;

    const website = await assertWebsiteOwnership(websiteId, tenantId);

    const targetDeployment = await prisma.websiteDeployment.findFirst({
      where: { id: deploymentId, websiteId },
    });

    if (!targetDeployment) {
      res.status(404).json({ success: false, message: "Deployment version not found" });
      return;
    }

    const snapshot = targetDeployment.snapshot as any;
    if (!snapshot || !Array.isArray(snapshot.pages)) {
      res.status(400).json({ success: false, message: "Corrupted deployment snapshot" });
      return;
    }

    // Rollback pages
    for (const p of snapshot.pages) {
      const existing = await prisma.websitePage.findUnique({
        where: { websiteId_slug: { websiteId, slug: p.slug } },
      });

      if (existing) {
        await prisma.websitePage.update({
          where: { id: existing.id },
          data: {
            title: p.title,
            content: p.content,
            isHomePage: p.isHomePage,
            seoTitle: p.seoTitle,
            seoDescription: p.seoDescription,
            seoImageUrl: p.seoImageUrl,
            order: p.order,
            status: "PUBLISHED",
            isPublished: true,
          },
        });
      } else {
        await prisma.websitePage.create({
          data: {
            websiteId,
            title: p.title,
            slug: p.slug,
            content: p.content,
            isHomePage: p.isHomePage,
            seoTitle: p.seoTitle,
            seoDescription: p.seoDescription,
            seoImageUrl: p.seoImageUrl,
            order: p.order,
            status: "PUBLISHED",
            isPublished: true,
          },
        });
      }
    }

    // Update website state
    await prisma.website.update({
      where: { id: websiteId },
      data: {
        globalStyles: snapshot.website?.globalStyles || website.globalStyles,
        publishedVersion: targetDeployment.version,
        publishedAt: new Date(),
        status: "PUBLISHED",
      },
    });

    createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "website_builder",
      recordId: website.id,
      description: `Rolled back website "${website.name}" to version ${targetDeployment.version}`,
      ...getRequestMeta(req),
    }).catch(() => {});

    res.json({
      success: true,
      message: `Successfully rolled back to version ${targetDeployment.version}`,
    });
  } catch (err) {
    next(err);
  }
}
