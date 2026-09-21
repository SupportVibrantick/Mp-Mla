import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";

// Helper to verify website belongs to tenant
async function assertWebsiteOwnership(websiteId: string, tenantId: string) {
  const website = await prisma.website.findFirst({
    where: { id: websiteId, tenantId },
  });
  if (!website) {
    const error: any = new Error("Website not found in your organization");
    error.statusCode = 404;
    throw error;
  }
  return website;
}

// ══════════════════════════════════════════════════════════
// LIST PAGES
// ══════════════════════════════════════════════════════════

export async function listPages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;

    await assertWebsiteOwnership(websiteId, tenantId);

    const pages = await prisma.websitePage.findMany({
      where: { websiteId },
      orderBy: [{ isHomePage: "desc" }, { order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        websiteId: true,
        title: true,
        slug: true,
        status: true,
        content: true,
        seoTitle: true,
        seoDescription: true,
        seoImageUrl: true,
        isHomePage: true,
        isPublished: true,
        order: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: pages,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// GET SINGLE PAGE (WITH FULL JSON CONTENT FOR BUILDER)
// ══════════════════════════════════════════════════════════

export async function getPage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;
    const pageId = req.params.pageId as string;

    const website = await assertWebsiteOwnership(websiteId, tenantId);

    const page = await prisma.websitePage.findFirst({
      where: { id: pageId, websiteId },
    });

    if (!page) {
      res.status(404).json({ success: false, message: "Page not found" });
      return;
    }

    res.json({
      success: true,
      data: {
        ...page,
        website: {
          id: website.id,
          name: website.name,
          slug: website.slug,
          globalStyles: website.globalStyles,
          logoUrl: website.logoUrl,
          faviconUrl: website.faviconUrl,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// CREATE PAGE
// ══════════════════════════════════════════════════════════

export async function createPage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;
    const data = req.body;

    await assertWebsiteOwnership(websiteId, tenantId);

    const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9\/-]/g, "");

    // Check slug collision
    const existing = await prisma.websitePage.findUnique({
      where: { websiteId_slug: { websiteId, slug: cleanSlug } },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: `Page with path "/${cleanSlug}" already exists in this website`,
      });
      return;
    }

    // If making this home page, unmark any previous home page
    if (data.isHomePage) {
      await prisma.websitePage.updateMany({
        where: { websiteId, isHomePage: true },
        data: { isHomePage: false },
      });
    }

    const maxOrder = await prisma.websitePage.aggregate({
      where: { websiteId },
      _max: { order: true },
    });

    const page = await prisma.websitePage.create({
      data: {
        websiteId,
        title: data.title.trim(),
        slug: cleanSlug,
        content: data.content || { version: 1, sections: [] },
        seoTitle: data.seoTitle?.trim() || null,
        seoDescription: data.seoDescription?.trim() || null,
        seoImageUrl: data.seoImageUrl?.trim() || null,
        isHomePage: data.isHomePage ?? false,
        status: data.status || "DRAFT",
        order: (maxOrder._max.order ?? 0) + 1,
      },
    });

    res.status(201).json({
      success: true,
      message: "Page created successfully",
      data: page,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// UPDATE PAGE (AUTOSAVE DRAFT / RENAME / SEO)
// ══════════════════════════════════════════════════════════

export async function updatePage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;
    const pageId = req.params.pageId as string;
    const data = req.body;

    await assertWebsiteOwnership(websiteId, tenantId);

    const existing = await prisma.websitePage.findFirst({
      where: { id: pageId, websiteId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Page not found" });
      return;
    }

    // If slug changing, check collision
    if (data.slug && data.slug !== existing.slug) {
      const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9\/-]/g, "");
      const duplicate = await prisma.websitePage.findUnique({
        where: { websiteId_slug: { websiteId, slug: cleanSlug } },
      });
      if (duplicate) {
        res.status(409).json({
          success: false,
          message: `Slug "/${cleanSlug}" already exists`,
        });
        return;
      }
      data.slug = cleanSlug;
    }

    // If marking as home page
    if (data.isHomePage === true && !existing.isHomePage) {
      await prisma.websitePage.updateMany({
        where: { websiteId, isHomePage: true },
        data: { isHomePage: false },
      });
    }

    const updated = await prisma.websitePage.update({
      where: { id: pageId },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle?.trim() || null }),
        ...(data.seoDescription !== undefined && { seoDescription: data.seoDescription?.trim() || null }),
        ...(data.seoImageUrl !== undefined && { seoImageUrl: data.seoImageUrl?.trim() || null }),
        ...(data.isHomePage !== undefined && { isHomePage: data.isHomePage }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    res.json({
      success: true,
      message: "Page saved successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// DUPLICATE PAGE
// ══════════════════════════════════════════════════════════

export async function duplicatePage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;
    const pageId = req.params.pageId as string;

    await assertWebsiteOwnership(websiteId, tenantId);

    const source = await prisma.websitePage.findFirst({
      where: { id: pageId, websiteId },
    });

    if (!source) {
      res.status(404).json({ success: false, message: "Page not found" });
      return;
    }

    const newSlug = `${source.slug}-copy-${Date.now().toString().slice(-4)}`;

    const duplicated = await prisma.websitePage.create({
      data: {
        websiteId,
        title: `${source.title} (Copy)`,
        slug: newSlug,
        content: source.content as any,
        seoTitle: source.seoTitle,
        seoDescription: source.seoDescription,
        seoImageUrl: source.seoImageUrl,
        isHomePage: false,
        status: "DRAFT",
        order: source.order + 1,
      },
    });

    res.status(201).json({
      success: true,
      message: "Page duplicated successfully",
      data: duplicated,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// DELETE PAGE
// ══════════════════════════════════════════════════════════

export async function deletePage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const websiteId = req.params.websiteId as string;
    const pageId = req.params.pageId as string;

    await assertWebsiteOwnership(websiteId, tenantId);

    const existing = await prisma.websitePage.findFirst({
      where: { id: pageId, websiteId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Page not found" });
      return;
    }

    if (existing.isHomePage) {
      res.status(400).json({
        success: false,
        message: "Cannot delete the Home page. Please designate another page as Home first.",
      });
      return;
    }

    await prisma.websitePage.delete({ where: { id: pageId } });

    res.json({
      success: true,
      message: `Page "${existing.title}" deleted`,
    });
  } catch (err) {
    next(err);
  }
}
