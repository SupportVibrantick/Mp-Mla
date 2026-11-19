import { Router, Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import { normalizeDomain } from "../../../utils/domain.js";

const router = Router();

// ════════════════════════════════════════════════════════════════════════
// MULTI-TENANT DEDICATED HOSTNAME RESOLVER
// ════════════════════════════════════════════════════════════════════════
router.get("/resolve-domain", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawDomain =
      (req.get("x-site-domain") as string) ||
      (req.headers["x-site-domain"] as string) ||
      (req.query.domain as string) ||
      (req.headers["x-forwarded-host"] as string) ||
      req.hostname ||
      "";

    if (!rawDomain) {
      res.status(400).json({
        success: false,
        message: "No domain provided in X-Site-Domain header or query parameter",
      });
      return;
    }

    let cleanDomain = "";
    try {
      cleanDomain = normalizeDomain(rawDomain);
    } catch (normErr: any) {
      res.status(400).json({
        success: false,
        message: `Invalid domain name: ${normErr?.message || "Invalid domain format"}`,
      });
      return;
    }

    const domainSelect = {
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
          orderBy: [{ isHomePage: "desc" as const }, { order: "asc" as const }],
        },
        menus: true,
        settings: true,
        deployments: {
          where: { status: "SUCCESS" as const },
          orderBy: { publishedAt: "desc" as const },
          take: 1,
        },
      },
    };

    // Lookup matching active domain record
    let domainRecord = await prisma.websiteDomain.findFirst({
      where: {
        domain: cleanDomain,
        isActive: true,
        isVerified: true,
      },
      include: {
        website: domainSelect,
      },
    });

    // Fallback: try without 'www.' if supplied with www
    if (!domainRecord && cleanDomain.startsWith("www.")) {
      const nonWww = cleanDomain.replace(/^www\./, "");
      domainRecord = await prisma.websiteDomain.findFirst({
        where: {
          domain: nonWww,
          isActive: true,
          isVerified: true,
        },
        include: {
          website: domainSelect,
        },
      });
    }

    // Fallback: try with 'www.' if supplied without www
    if (!domainRecord && !cleanDomain.startsWith("www.")) {
      const withWww = `www.${cleanDomain}`;
      domainRecord = await prisma.websiteDomain.findFirst({
        where: {
          domain: withWww,
          isActive: true,
          isVerified: true,
        },
        include: {
          website: domainSelect,
        },
      });
    }

    if (!domainRecord) {
      res.status(404).json({
        success: false,
        message: `Domain "${cleanDomain}" is not connected, verified, or active.`,
      });
      return;
    }

    // Over HTTPS or in production, ensure SSL certificate is ACTIVE
    const isHttps = req.secure || req.get("x-forwarded-proto") === "https";
    if ((process.env.NODE_ENV === "production" || isHttps) && domainRecord.sslStatus !== "ACTIVE") {
      res.status(403).json({
        success: false,
        message: `SSL certificate for "${cleanDomain}" is not active (current status: ${domainRecord.sslStatus}). HTTPS traffic cannot be served until SSL provisioning is complete.`,
      });
      return;
    }

    const website = domainRecord.website;
    const isWebsiteLive =
      website &&
      (website.status === "PUBLISHED" ||
        website.publishedAt ||
        (website.deployments && website.deployments.length > 0));

    if (!isWebsiteLive) {
      res.status(404).json({
        success: false,
        message: "Website is not published yet.",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        website,
        tenant: website.tenant,
        pages: website.pages,
        menus: website.menus,
        settings: website.settings,
        deployment: website.deployments?.[0] || null,
        domain: {
          domain: domainRecord.domain,
          type: domainRecord.type,
          isPrimary: domainRecord.isPrimary,
          sslStatus: domainRecord.sslStatus,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to resolve domain",
    });
  }
});

// Resolve host or slug to a published website snapshot
router.get("/resolve", async (req: Request, res: Response) => {
  try {
    const hostHeader = (req.headers["x-forwarded-host"] as string) || req.hostname || "";
    const cleanHost = hostHeader.split(":")[0].toLowerCase();
    const querySlug = (req.query.slug as string) || "";
    const queryWebsiteId = (req.query.websiteId as string) || "";
    const queryDomain = (req.query.domain as string) || "";

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

    // 3. Lookup by domain if not found (supports query param or host header)
    const rawTargetDomain =
      queryDomain ||
      (cleanHost !== "localhost" && cleanHost !== "127.0.0.1" ? cleanHost : "");
    const targetDomain = rawTargetDomain
      ? rawTargetDomain
          .toLowerCase()
          .trim()
          .replace(/^https?:\/\//, "")
          .replace(/\/.*$/, "")
      : "";

    if (!website && targetDomain) {
      let matchedDomain = await prisma.websiteDomain.findFirst({
        where: {
          domain: targetDomain,
          isActive: true,
          isVerified: true,
        },
      });

      // Try www fallback or non-www fallback
      if (!matchedDomain && targetDomain.startsWith("www.")) {
        matchedDomain = await prisma.websiteDomain.findFirst({
          where: {
            domain: targetDomain.replace(/^www\./, ""),
            isActive: true,
            isVerified: true,
          },
        });
      } else if (!matchedDomain && !targetDomain.startsWith("www.")) {
        matchedDomain = await prisma.websiteDomain.findFirst({
          where: {
            domain: `www.${targetDomain}`,
            isActive: true,
            isVerified: true,
          },
        });
      }

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

    // 4. Safe fallback: only for local dev without slug/domain on localhost
    const isLocalDev =
      process.env.NODE_ENV !== "production" &&
      !queryDomain &&
      !querySlug &&
      !targetDomain &&
      (cleanHost === "localhost" || cleanHost === "127.0.0.1");

    if (!website && isLocalDev) {
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
