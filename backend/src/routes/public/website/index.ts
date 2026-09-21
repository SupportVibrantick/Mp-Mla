import { Router, Request, Response } from "express";
import prisma from "../../../lib/prisma.js";

const router = Router();

// Resolve host or slug to a published website snapshot
router.get("/resolve", async (req: Request, res: Response) => {
  try {
    const hostHeader = (req.headers["x-forwarded-host"] as string) || req.hostname || "";
    const cleanHost = hostHeader.split(":")[0].toLowerCase();
    const querySlug = (req.query.slug as string) || "";
    const queryWebsiteId = (req.query.websiteId as string) || "";

    let website: any = null;

    // 1. Direct website ID lookup
    if (queryWebsiteId) {
      website = await prisma.website.findUnique({
        where: { id: queryWebsiteId },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              constituencyName: true,
              state: true,
              district: true,
              representativeName: true,
              representativeTitle: true,
              representativePhoto: true,
              partyName: true,
              partyLogoUrl: true,
              primaryColor: true,
              secondaryColor: true,
              logoUrl: true,
              phone: true,
              email: true,
              address: true,
            },
          },
          domains: true,
          pages: {
            where: { isPublished: true },
            orderBy: [{ isHomePage: "desc" }, { order: "asc" }],
          },
          menus: true,
          settings: true,
          deployments: {
            where: { status: "SUCCESS" },
            orderBy: { publishedAt: "desc" },
            take: 1,
          },
        },
      });
    }

    // 2. Lookup by slug if not found
    if (!website && querySlug) {
      website = await prisma.website.findFirst({
        where: {
          slug: querySlug,
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              constituencyName: true,
              state: true,
              district: true,
              representativeName: true,
              representativeTitle: true,
              representativePhoto: true,
              partyName: true,
              partyLogoUrl: true,
              primaryColor: true,
              secondaryColor: true,
              logoUrl: true,
              phone: true,
              email: true,
              address: true,
            },
          },
          domains: true,
          pages: {
            where: { isPublished: true },
            orderBy: [{ isHomePage: "desc" }, { order: "asc" }],
          },
          menus: true,
          settings: true,
          deployments: {
            where: { status: "SUCCESS" },
            orderBy: { publishedAt: "desc" },
            take: 1,
          },
        },
      });
    }

    // 3. Lookup by domain if not found
    if (!website && cleanHost) {
      const matchedDomain = await prisma.websiteDomain.findFirst({
        where: { domain: cleanHost },
      });

      if (matchedDomain) {
        website = await prisma.website.findUnique({
          where: { id: matchedDomain.websiteId },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                constituencyName: true,
                state: true,
                district: true,
                representativeName: true,
                representativeTitle: true,
                representativePhoto: true,
                partyName: true,
                partyLogoUrl: true,
                primaryColor: true,
                secondaryColor: true,
                logoUrl: true,
                phone: true,
                email: true,
                address: true,
              },
            },
            domains: true,
            pages: {
              where: { isPublished: true },
              orderBy: [{ isHomePage: "desc" }, { order: "asc" }],
            },
            menus: true,
            settings: true,
            deployments: {
              where: { status: "SUCCESS" },
              orderBy: { publishedAt: "desc" },
              take: 1,
            },
          },
        });
      }
    }

    // 4. Fallback for development if only 1 website exists
    if (!website) {
      website = await prisma.website.findFirst({
        orderBy: { updatedAt: "desc" },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              constituencyName: true,
              state: true,
              district: true,
              representativeName: true,
              representativeTitle: true,
              representativePhoto: true,
              partyName: true,
              partyLogoUrl: true,
              primaryColor: true,
              secondaryColor: true,
              logoUrl: true,
              phone: true,
              email: true,
              address: true,
            },
          },
          domains: true,
          pages: {
            where: { isPublished: true },
            orderBy: [{ isHomePage: "desc" }, { order: "asc" }],
          },
          menus: true,
          settings: true,
          deployments: {
            where: { status: "SUCCESS" },
            orderBy: { publishedAt: "desc" },
            take: 1,
          },
        },
      });
    }

    if (!website) {
      return res.status(404).json({ success: false, message: "No website found matching this host or slug" });
    }

    // Fetch dynamic live tenant widgets data
    const tenantId = website.tenantId;

    const [projects, schemes, events, leaderProfiles] = await Promise.all([
      prisma.project.findMany({
        where: { tenantId, isDeleted: false },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          category: true,
          budgetSanctioned: true,
          budgetUsed: true,
          address: true,
          startDate: true,
          expectedEndDate: true,
        },
        take: 6,
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
      prisma.scheme.findMany({
        where: { tenantId, isDeleted: false, status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          description: true,
          department: true,
          benefits: true,
          eligibility: true,
        },
        take: 6,
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
      prisma.event.findMany({
        where: { tenantId, isDeleted: false },
        select: {
          id: true,
          title: true,
          description: true,
          startDate: true,
          endDate: true,
          location: true,
          status: true,
        },
        take: 4,
        orderBy: { startDate: "asc" },
      }).catch(() => []),
      prisma.leader.findMany({
        where: { tenantId, isDeleted: false, isActive: true },
        select: {
          id: true,
          name: true,
          designation: true,
          category: true,
          phone: true,
          email: true,
          photoUrl: true,
        },
        take: 6,
      }).catch(() => []),
    ]);

    return res.json({
      success: true,
      data: {
        website: {
          id: website.id,
          name: website.name,
          slug: website.slug,
          status: website.status,
          globalStyles: website.globalStyles,
          faviconUrl: website.faviconUrl,
          logoUrl: website.logoUrl,
          publishedVersion: website.publishedVersion,
        },
        tenant: website.tenant,
        pages: website.pages,
        menus: website.menus,
        settings: website.settings,
        latestDeployment: website.deployments[0] || null,
        liveData: {
          projects: projects.map((p) => ({
            ...p,
            title: p.name,
            budget: p.budgetSanctioned,
            location: p.address,
          })),
          schemes: schemes.map((s: any) => ({
            ...s,
            title: s.name,
            department: s.department || "Govt. Department",
            eligibilityCriteria: s.eligibility,
          })),
          events,
          leaders: leaderProfiles,
        },
      },
    });
  } catch (error: any) {
    console.error("Public website resolve error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to resolve website" });
  }
});

// Submit form response
router.post("/:websiteId/forms/:formId/submit", async (req: Request, res: Response) => {
  try {
    const { websiteId, formId } = req.params as { websiteId: string; formId: string };

    const form = await prisma.websiteForm.findFirst({
      where: { id: formId, websiteId },
    });

    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found" });
    }

    await prisma.websiteForm.update({
      where: { id: formId },
      data: {
        submitCount: { increment: 1 },
      },
    });

    return res.json({ success: true, message: "Form submitted successfully" });
  } catch (error: any) {
    console.error("Form submission error:", error);
    return res.status(500).json({ success: false, message: "Failed to submit form" });
  }
});

export default router;
