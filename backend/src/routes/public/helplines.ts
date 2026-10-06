import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "mp-mla-secret-key-2026";

interface AuthTenantContext {
  tenantId: string | null;
  voter: any | null;
  authType: "voter" | "admin" | "tenant_header" | null;
}

async function resolveTenantAndAuthContext(req: Request): Promise<AuthTenantContext> {
  // 1. Check Authorization Bearer Header (Voter JWT or Admin JWT)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded) {
        // Check if Voter Token
        if (decoded.accountType === "voter" && decoded.tenantId) {
          let voterData: any = null;
          try {
            if (decoded.membershipId) {
              const membership = await prisma.voterAccountMembership.findUnique({
                where: { id: decoded.membershipId },
                include: {
                  voter: {
                    select: {
                      id: true,
                      name: true,
                      voterIdNumber: true,
                      applicationNumber: true,
                      tenantId: true,
                      ward: { select: { id: true, name: true, wardNumber: true } },
                    },
                  },
                },
              });
              if (membership?.voter) {
                voterData = membership.voter;
              }
            } else if (decoded.voterId) {
              voterData = await prisma.voter.findUnique({
                where: { id: decoded.voterId },
                select: {
                  id: true,
                  name: true,
                  voterIdNumber: true,
                  applicationNumber: true,
                  tenantId: true,
                  ward: { select: { id: true, name: true, wardNumber: true } },
                },
              });
            }
          } catch (e) {
            console.error("Voter lookup error in helplines resolveTenantAndAuthContext:", e);
          }

          return {
            tenantId: decoded.tenantId,
            voter: voterData,
            authType: "voter",
          };
        }

        // Check if Admin / Staff Token
        if (decoded.tenantId) {
          const tenant = await prisma.tenant.findFirst({
            where: { id: decoded.tenantId, status: "ACTIVE" },
            select: { id: true },
          });
          if (tenant) {
            return {
              tenantId: tenant.id,
              voter: null,
              authType: "admin",
            };
          }
        }
      }
    } catch {
      // Token verification failed / expired
    }
  }

  // 2. Check explicitly provided tenantId header / param if any
  const headerTenantId =
    (req.headers["x-tenant-id"] as string | undefined) ||
    (req.query.tenantId as string | undefined) ||
    (req.body?.tenantId as string | undefined);

  if (headerTenantId) {
    const tenant = await prisma.tenant.findFirst({
      where: { id: headerTenantId, status: "ACTIVE" },
      select: { id: true },
    });
    if (tenant) {
      return {
        tenantId: tenant.id,
        voter: null,
        authType: "tenant_header",
      };
    }
  }

  return {
    tenantId: null,
    voter: null,
    authType: null,
  };
}

// ─── GET /api/public/helplines ──────────────────────────────────────────────
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId, voter, authType } = await resolveTenantAndAuthContext(req);

    if (!tenantId) {
      res.status(401).json({
        success: false,
        requiresAuth: true,
        message:
          "Multi-tenant constituency authentication required. Please log in with your Voter Application ID or Mobile Number to view the emergency and citizen helplines for your specific constituency.",
      });
      return;
    }

    const { category, search, emergencyOnly } = req.query;

    const where: any = {
      tenantId,
      isActive: true,
    };

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
        { whatsappNumber: { contains: q, mode: "insensitive" } },
        { areaWardCoverage: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ];
    }

    const [helplines, emergencyCount, totalCount, tollFreeCount, roundTheClockCount, whatsappCount] = await Promise.all([
      prisma.helplineContact.findMany({
        where,
        orderBy: [
          { isEmergency: "desc" },
          { displayOrder: "asc" },
          { title: "asc" },
        ],
      }),
      prisma.helplineContact.count({ where: { tenantId, isActive: true, isEmergency: true } }),
      prisma.helplineContact.count({ where: { tenantId, isActive: true } }),
      prisma.helplineContact.count({ where: { tenantId, isActive: true, isTollFree: true } }),
      prisma.helplineContact.count({ where: { tenantId, isActive: true, is24x7: true } }),
      prisma.helplineContact.count({ where: { tenantId, isActive: true, isWhatsAppEnabled: true } }),
    ]);

    const tenantInfo = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        constituencyName: true,
        state: true,
        district: true,
        representativeName: true,
        representativeTitle: true,
        representativePhoto: true,
        logoUrl: true,
        partyLogoUrl: true,
        email: true,
        phone: true,
      },
    });

    res.json({
      success: true,
      data: helplines,
      tenant: tenantInfo,
      voter,
      authType,
      stats: {
        total: totalCount,
        emergency: emergencyCount,
        tollFree: tollFreeCount,
        twentyFourSeven: roundTheClockCount,
        whatsappEnabled: whatsappCount,
      },
    });
  } catch (error: any) {
    console.error("Public helpline fetch error:", error);
    res.status(500).json({ success: false, message: "Failed to load public helplines" });
  }
});

// ─── GET /api/public/helplines/emergency ────────────────────────────────────
router.get("/emergency", async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = await resolveTenantAndAuthContext(req);

    if (!tenantId) {
      res.status(401).json({
        success: false,
        requiresAuth: true,
        message: "Authentication required to load emergency speed-dial contacts for your constituency.",
      });
      return;
    }

    const emergencyContacts = await prisma.helplineContact.findMany({
      where: {
        tenantId,
        isActive: true,
        isEmergency: true,
      },
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
