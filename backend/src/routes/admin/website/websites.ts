import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { DEFAULT_WEBSITE_TEMPLATES } from "./defaultTemplates.js";

// ══════════════════════════════════════════════════════════
// LIST TEMPLATES
// ══════════════════════════════════════════════════════════

export async function listWebsiteTemplates(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({
      success: true,
      data: DEFAULT_WEBSITE_TEMPLATES,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// LIST WEBSITES FOR TENANT
// ══════════════════════════════════════════════════════════

export async function listWebsites(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);

    const websites = await prisma.website.findMany({
      where: { tenantId },
      include: {
        domains: {
          select: {
            id: true,
            domain: true,
            type: true,
            isPrimary: true,
            isVerified: true,
            sslStatus: true,
          },
        },
        _count: {
          select: {
            pages: true,
            deployments: true,
            assets: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: websites,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// GET SINGLE WEBSITE
// ══════════════════════════════════════════════════════════

export async function getWebsite(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;

    const website = await prisma.website.findFirst({
      where: { id, tenantId },
      include: {
        pages: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            content: true,
            isHomePage: true,
            isPublished: true,
            order: true,
            updatedAt: true,
          },
          orderBy: [{ isHomePage: "desc" }, { order: "asc" }],
        },
        domains: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        menus: true,
        deployments: {
          take: 5,
          orderBy: { version: "desc" },
          select: {
            id: true,
            version: true,
            status: true,
            snapshot: true,
            notes: true,
            publishedBy: true,
            publishedAt: true,
          },
        },
      },
    });

    if (!website) {
      res.status(404).json({ success: false, message: "Website not found" });
      return;
    }

    res.json({
      success: true,
      data: website,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// CREATE WEBSITE
// ══════════════════════════════════════════════════════════

export async function createWebsite(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { name, slug, templateId, faviconUrl, logoUrl, globalStyles } = req.body;

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

    // Check duplicate slug for tenant
    const existing = await prisma.website.findUnique({
      where: { tenantId_slug: { tenantId, slug: cleanSlug } },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: `Website with slug "${cleanSlug}" already exists. Please choose a different slug.`,
      });
      return;
    }

    // Find selected template if provided
    const template = templateId
      ? DEFAULT_WEBSITE_TEMPLATES.find((t) => t.id === templateId)
      : null;

    const finalStyles = globalStyles || template?.globalStyles || {
      colors: {
        primary: "#1e3a8a",
        secondary: "#0284c7",
        accent: "#f59e0b",
        background: "#ffffff",
        surface: "#f8fafc",
        text: "#0f172a",
        muted: "#64748b",
      },
      typography: {
        headingFont: "Outfit, Inter, sans-serif",
        bodyFont: "Inter, sans-serif",
      },
      radius: "16px",
      containerWidth: "1240px",
    };

    // Create Website in database
    const website = await prisma.website.create({
      data: {
        tenantId,
        name: name.trim(),
        slug: cleanSlug,
        templateId: templateId || null,
        faviconUrl: faviconUrl || null,
        logoUrl: logoUrl || null,
        globalStyles: finalStyles,
        status: "DRAFT",
      },
    });

    // Create default primary subdomain
    await prisma.websiteDomain.create({
      data: {
        websiteId: website.id,
        domain: `${cleanSlug}.mpmla.in`,
        type: "SUBDOMAIN",
        isPrimary: true,
        isVerified: true,
        isActive: true,
        sslStatus: "ACTIVE",
        verifiedAt: new Date(),
      },
    });

    // Create default navigation menu
    const menuItems = template?.menuItems || [
      { label: "Home", url: "/" },
      { label: "About", url: "/about" },
      { label: "Development", url: "/projects" },
      { label: "Grievance", url: "/grievance" },
      { label: "Contact", url: "/contact" },
    ];

    await prisma.websiteMenu.create({
      data: {
        websiteId: website.id,
        name: "main",
        items: menuItems,
      },
    });

    // Create pages from template or default starter Home page
    const templatePages = template?.pages || [
      {
        title: "Home",
        slug: "home",
        isHomePage: true,
        seoTitle: `${name} - Official Portal`,
        seoDescription: `Official public constituency portal of ${name}`,
        content: {
          version: 1,
          sections: [
            {
              id: "hero-1",
              type: "representative-hero",
              props: {
                badge: "Official Constituency Portal",
                headline: "Dedicated to the Progress & Prosperity of Our People",
                subheadline: "Transparency, rapid grievance resolution, and modern infrastructure development.",
                primaryButtonText: "Submit Grievance",
                primaryButtonLink: "/grievance",
                secondaryButtonText: "View Projects",
                secondaryButtonLink: "/projects",
              },
            },
            {
              id: "stats-1",
              type: "constituency-stats",
              props: {
                title: "Constituency Milestones",
              },
            },
            {
              id: "grievance-1",
              type: "grievance-cta",
              props: {
                title: "Have a Civic Problem or Infrastructure Issue?",
                description: "Submit your problem directly to our constituency office.",
                buttonText: "Lodge Your Grievance Online",
                buttonLink: "/grievance",
              },
            },
          ],
        },
      },
    ];

    for (let i = 0; i < templatePages.length; i++) {
      const p = templatePages[i];
      await prisma.websitePage.create({
        data: {
          websiteId: website.id,
          title: p.title,
          slug: p.slug,
          isHomePage: p.isHomePage ?? false,
          isPublished: false,
          status: "DRAFT",
          order: i,
          seoTitle: p.seoTitle || null,
          seoDescription: p.seoDescription || null,
          content: p.content,
        },
      });
    }

    createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "website_builder",
      recordId: website.id,
      description: `Created website "${website.name}" (${website.slug})`,
      ...getRequestMeta(req),
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Website created successfully with template pages",
      data: website,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// UPDATE WEBSITE
// ══════════════════════════════════════════════════════════

export async function updateWebsite(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const data = req.body;

    const existing = await prisma.website.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Website not found" });
      return;
    }

    // Check slug uniqueness if updating slug
    if (data.slug && data.slug !== existing.slug) {
      const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      const duplicate = await prisma.website.findUnique({
        where: { tenantId_slug: { tenantId, slug: cleanSlug } },
      });
      if (duplicate) {
        res.status(409).json({
          success: false,
          message: `Slug "${cleanSlug}" is already taken by another website`,
        });
        return;
      }
      data.slug = cleanSlug;
    }

    const updated = await prisma.website.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.templateId !== undefined && { templateId: data.templateId || null }),
        ...(data.faviconUrl !== undefined && { faviconUrl: data.faviconUrl || null }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl || null }),
        ...(data.globalStyles !== undefined && { globalStyles: data.globalStyles }),
      },
    });

    res.json({
      success: true,
      message: "Website settings updated",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// DELETE WEBSITE
// ══════════════════════════════════════════════════════════

export async function deleteWebsite(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;

    const existing = await prisma.website.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Website not found" });
      return;
    }

    await prisma.website.delete({ where: { id } });

    createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "website_builder",
      recordId: id,
      description: `Deleted website "${existing.name}" (${existing.slug})`,
      ...getRequestMeta(req),
    }).catch(() => {});

    res.json({
      success: true,
      message: `Website "${existing.name}" deleted successfully`,
    });
  } catch (err) {
    next(err);
  }
}
