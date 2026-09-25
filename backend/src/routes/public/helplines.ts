import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma.js";

const router = Router();

async function resolvePublicTenantId(req: Request): Promise<string | null> {
  const tenantId =
    (req.headers["x-tenant-id"] as string | undefined) ||
    (req.query.tenantId as string | undefined) ||
    (req.body?.tenantId as string | undefined);

  if (tenantId) {
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, status: "ACTIVE" },
      select: { id: true },
    });
    return tenant?.id || null;
  }

  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
    take: 2,
  });
  return tenants.length === 1 ? tenants[0].id : null;
}

// ─── GET /api/public/helplines ──────────────────────────────────────────────
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = await resolvePublicTenantId(req);
    const { category, search, emergencyOnly } = req.query;

    const where: any = {
      isActive: true,
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (category && typeof category === "string" && category !== "ALL") {
      where.category = category;
    }

    if (emergencyOnly === "true") {
      where.isEmergency = true;
    }

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { subtitle: { contains: q, mode: "insensitive" } },
        { phonePrimary: { contains: q, mode: "insensitive" } },
        { phoneSecondary: { contains: q, mode: "insensitive" } },
        { tollFreeNumber: { contains: q, mode: "insensitive" } },
        { areaWardCoverage: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ];
    }

    const helplines = await prisma.helplineContact.findMany({
      where,
      orderBy: [
        { isEmergency: "desc" },
        { displayOrder: "asc" },
        { title: "asc" },
      ],
    });

    // Optional tenant information for public header
    let tenantInfo = null;
    if (tenantId) {
      tenantInfo = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          constituencyName: true,
          state: true,
          district: true,
          email: true,
          phone: true,
        },
      });
    }

    res.json({
      success: true,
      data: helplines,
      tenant: tenantInfo,
    });
  } catch (error: any) {
    console.error("Public helpline fetch error:", error);
    res.status(500).json({ success: false, message: "Failed to load public helplines" });
  }
});

// ─── GET /api/public/helplines/emergency ────────────────────────────────────
router.get("/emergency", async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = await resolvePublicTenantId(req);

    const where: any = {
      isActive: true,
      isEmergency: true,
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    const emergencyContacts = await prisma.helplineContact.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
      take: 8,
    });

    res.json({ success: true, data: emergencyContacts });
  } catch (error: any) {
    console.error("Public emergency helplines error:", error);
    res.status(500).json({ success: false, message: "Failed to load emergency helplines" });
  }
});

export default router;
