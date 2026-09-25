import { Router, Request, Response } from "express";
import prisma from "../../../lib/prisma.js";

const router = Router();

// Standard emergency & civic helplines template for India / Constituency
const DEFAULT_HELPLINES = [
  {
    category: "EMERGENCY",
    title: "National Emergency Number",
    subtitle: "All-in-One Emergency Services (Police, Fire, Ambulance)",
    phonePrimary: "112",
    tollFreeNumber: "112",
    is24x7: true,
    isEmergency: true,
    isTollFree: true,
    isWhatsAppEnabled: false,
    availableHours: "24x7 All Days",
    areaWardCoverage: "National / State-wide",
    colorScheme: "red",
    iconKey: "Flame",
    displayOrder: 1,
    notes: "Universal emergency response support system (ERSS).",
  },
  {
    category: "HEALTHCARE",
    title: "National Health Emergency / Ambulance",
    subtitle: "Immediate Medical Emergency & Ambulance Dispatch",
    phonePrimary: "108",
    tollFreeNumber: "108",
    is24x7: true,
    isEmergency: true,
    isTollFree: true,
    isWhatsAppEnabled: false,
    availableHours: "24x7 All Days",
    areaWardCoverage: "State / District / Ward",
    colorScheme: "rose",
    iconKey: "Activity",
    displayOrder: 2,
    notes: "Emergency medical response & patient transport.",
  },
  {
    category: "POLICE",
    title: "Police Emergency Control Room",
    subtitle: "Immediate Police Assistance & Crime Reporting",
    phonePrimary: "100",
    phoneSecondary: "112",
    tollFreeNumber: "100",
    is24x7: true,
    isEmergency: true,
    isTollFree: true,
    isWhatsAppEnabled: false,
    availableHours: "24x7 All Days",
    areaWardCoverage: "City / Constituency Police Stations",
    colorScheme: "indigo",
    iconKey: "ShieldCheck",
    displayOrder: 3,
    notes: "Direct line to City & District Police Command Room.",
  },
  {
    category: "WOMEN_CHILD",
    title: "Women in Distress Helpline",
    subtitle: "National Commission for Women & Police Safety Desk",
    phonePrimary: "1091",
    tollFreeNumber: "1091",
    is24x7: true,
    isEmergency: true,
    isTollFree: true,
    isWhatsAppEnabled: false,
    availableHours: "24x7 All Days",
    areaWardCoverage: "Constituency-wide & State",
    colorScheme: "pink",
    iconKey: "HeartHandshake",
    displayOrder: 4,
    notes: "Instant safety support and legal guidance for women.",
  },
  {
    category: "WOMEN_CHILD",
    title: "Childline India Foundation",
    subtitle: "Child Protection, Safety & Care Helpline",
    phonePrimary: "1098",
    tollFreeNumber: "1098",
    is24x7: true,
    isEmergency: true,
    isTollFree: true,
    isWhatsAppEnabled: false,
    availableHours: "24x7 All Days",
    areaWardCoverage: "National & Local Child Welfare",
    colorScheme: "amber",
    iconKey: "Baby",
    displayOrder: 5,
    notes: "24-hour emergency phone outreach service for children in need.",
  },
  {
    category: "CONSTITUENCY_OFFICE",
    title: "Citizen Grievance & MLA Helpline",
    subtitle: "Official MLA Constituency Assistance Desk",
    phonePrimary: "+91 9876543210",
    whatsappNumber: "+91 9876543210",
    is24x7: false,
    isEmergency: false,
    isTollFree: false,
    isWhatsAppEnabled: true,
    availableHours: "9:00 AM - 7:00 PM (Mon-Sat)",
    areaWardCoverage: "All Wards in Constituency",
    colorScheme: "emerald",
    iconKey: "Building2",
    displayOrder: 6,
    notes: "Constituency support desk for public grievances, letters & schemes.",
  },
  {
    category: "DISASTER",
    title: "State Disaster Management (SDMA)",
    subtitle: "Floods, Storms & Natural Calamity Response",
    phonePrimary: "1077",
    tollFreeNumber: "1077",
    is24x7: true,
    isEmergency: true,
    isTollFree: true,
    isWhatsAppEnabled: false,
    availableHours: "24x7 All Days",
    areaWardCoverage: "District & State Disaster Zones",
    colorScheme: "orange",
    iconKey: "AlertTriangle",
    displayOrder: 7,
    notes: "District disaster control desk for rapid relief deployment.",
  },
  {
    category: "GOVERNMENT_SERVICES",
    title: "Cyber Crime Reporting Helpline",
    subtitle: "Financial Fraud & Online Harassment Reporting",
    phonePrimary: "1930",
    tollFreeNumber: "1930",
    is24x7: true,
    isEmergency: true,
    isTollFree: true,
    isWhatsAppEnabled: false,
    availableHours: "24x7 All Days",
    areaWardCoverage: "National Cyber Crime Reporting Portal",
    colorScheme: "cyan",
    iconKey: "Laptop",
    displayOrder: 8,
    notes: "Ministry of Home Affairs citizen financial fraud reporting line.",
  },
  {
    category: "SENIOR_CITIZEN",
    title: "Elder Line (National Helpline for Senior Citizens)",
    subtitle: "Care, Pension, Legal & Health Guidance",
    phonePrimary: "14567",
    tollFreeNumber: "14567",
    is24x7: false,
    isEmergency: false,
    isTollFree: true,
    isWhatsAppEnabled: false,
    availableHours: "8:00 AM - 8:00 PM (Daily)",
    areaWardCoverage: "State & District Elder Desks",
    colorScheme: "purple",
    iconKey: "Users",
    displayOrder: 9,
    notes: "Government toll-free service providing support to elderly citizens.",
  },
  {
    category: "ELECTRICITY",
    title: "Electricity Board Helpline / Power Disruption",
    subtitle: "Report Faults, Power Outages & Wire Sparks",
    phonePrimary: "1912",
    tollFreeNumber: "1912",
    is24x7: true,
    isEmergency: false,
    isTollFree: true,
    isWhatsAppEnabled: false,
    availableHours: "24x7 All Days",
    areaWardCoverage: "Constituency Power Distribution Zones",
    colorScheme: "yellow",
    iconKey: "Zap",
    displayOrder: 10,
    notes: "24x7 Electricity complaint redressal.",
  },
  {
    category: "CIVIC_MUNICIPAL",
    title: "Municipal Corporation Civic Control Room",
    subtitle: "Sanitation, Roads, Streetlights & Water Supply Complaints",
    phonePrimary: "+91 11 23225000",
    is24x7: false,
    isEmergency: false,
    isTollFree: false,
    isWhatsAppEnabled: true,
    availableHours: "8:00 AM - 8:00 PM (Mon-Sat)",
    areaWardCoverage: "Municipal Corporation Limits",
    colorScheme: "blue",
    iconKey: "MapPin",
    displayOrder: 11,
    notes: "General municipal services and citizen issue reporting.",
  },
];

// ─── GET /stats ─────────────────────────────────────────────────────────────
router.get("/stats", async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId as string;
    if (!tenantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const [total, active, emergency, tollFree, twentyFourSeven, whatsappEnabled] = await Promise.all([
      prisma.helplineContact.count({ where: { tenantId } }),
      prisma.helplineContact.count({ where: { tenantId, isActive: true } }),
      prisma.helplineContact.count({ where: { tenantId, isEmergency: true } }),
      prisma.helplineContact.count({ where: { tenantId, isTollFree: true } }),
      prisma.helplineContact.count({ where: { tenantId, is24x7: true } }),
      prisma.helplineContact.count({ where: { tenantId, isWhatsAppEnabled: true } }),
    ]);

    const categoryGroups = await prisma.helplineContact.groupBy({
      by: ["category"],
      where: { tenantId },
      _count: { id: true },
    });

    const categoryCounts: Record<string, number> = {};
    categoryGroups.forEach((g) => {
      categoryCounts[g.category] = g._count.id;
    });

    res.json({
      success: true,
      data: {
        total,
        active,
        emergency,
        tollFree,
        twentyFourSeven,
        whatsappEnabled,
        categoryCounts,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch helpline stats:", error);
    res.status(500).json({ success: false, message: "Failed to load helpline statistics" });
  }
});

// ─── GET / ──────────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId as string;
    if (!tenantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { category, search, isEmergency, isActive } = req.query;

    const where: any = { tenantId };

    if (category && typeof category === "string" && category !== "ALL") {
      where.category = category;
    }

    if (isEmergency !== undefined && isEmergency !== "") {
      where.isEmergency = isEmergency === "true";
    }

    if (isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true";
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
        { createdAt: "desc" },
      ],
    });

    res.json({ success: true, data: helplines });
  } catch (error: any) {
    console.error("Failed to fetch helplines:", error);
    res.status(500).json({ success: false, message: "Failed to load helplines" });
  }
});

// ─── GET /:id ───────────────────────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId as string;
    const id = req.params.id as string;

    const helpline = await prisma.helplineContact.findFirst({
      where: { id, tenantId },
    });

    if (!helpline) {
      res.status(404).json({ success: false, message: "Helpline contact not found" });
      return;
    }

    res.json({ success: true, data: helpline });
  } catch (error: any) {
    console.error("Failed to get helpline contact:", error);
    res.status(500).json({ success: false, message: "Failed to fetch helpline details" });
  }
});

// ─── POST / ─────────────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId as string;
    if (!tenantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const {
      category = "EMERGENCY",
      title,
      subtitle,
      phonePrimary,
      phoneSecondary,
      tollFreeNumber,
      whatsappNumber,
      email,
      availableHours,
      is24x7 = false,
      isEmergency = false,
      isTollFree = false,
      isWhatsAppEnabled = false,
      areaWardCoverage,
      address,
      iconKey,
      colorScheme = "indigo",
      displayOrder = 0,
      isActive = true,
      notes,
      metadata,
    } = req.body;

    if (!title || !phonePrimary) {
      res.status(400).json({
        success: false,
        message: "Title and Primary Phone Number are required",
      });
      return;
    }

    const helpline = await prisma.helplineContact.create({
      data: {
        tenantId,
        category,
        title: title.trim(),
        subtitle: subtitle?.trim() || null,
        phonePrimary: phonePrimary.trim(),
        phoneSecondary: phoneSecondary?.trim() || null,
        tollFreeNumber: tollFreeNumber?.trim() || null,
        whatsappNumber: whatsappNumber?.trim() || null,
        email: email?.trim() || null,
        availableHours: availableHours?.trim() || null,
        is24x7: Boolean(is24x7),
        isEmergency: Boolean(isEmergency),
        isTollFree: Boolean(isTollFree),
        isWhatsAppEnabled: Boolean(isWhatsAppEnabled),
        areaWardCoverage: areaWardCoverage?.trim() || null,
        address: address?.trim() || null,
        iconKey: iconKey || null,
        colorScheme: colorScheme || "indigo",
        displayOrder: Number(displayOrder) || 0,
        isActive: Boolean(isActive),
        notes: notes?.trim() || null,
        metadata: metadata || undefined,
      },
    });

    res.status(201).json({
      success: true,
      message: "Helpline contact created successfully",
      data: helpline,
    });
  } catch (error: any) {
    console.error("Failed to create helpline contact:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create helpline contact" });
  }
});

// ─── PUT /:id ───────────────────────────────────────────────────────────────
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId as string;
    const id = req.params.id as string;

    if (!tenantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const existing = await prisma.helplineContact.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Helpline contact not found" });
      return;
    }

    const {
      category,
      title,
      subtitle,
      phonePrimary,
      phoneSecondary,
      tollFreeNumber,
      whatsappNumber,
      email,
      availableHours,
      is24x7,
      isEmergency,
      isTollFree,
      isWhatsAppEnabled,
      areaWardCoverage,
      address,
      iconKey,
      colorScheme,
      displayOrder,
      isActive,
      notes,
      metadata,
    } = req.body;

    const updated = await prisma.helplineContact.update({
      where: { id },
      data: {
        category: category ?? existing.category,
        title: title !== undefined ? title.trim() : existing.title,
        subtitle: subtitle !== undefined ? (subtitle?.trim() || null) : existing.subtitle,
        phonePrimary: phonePrimary !== undefined ? phonePrimary.trim() : existing.phonePrimary,
        phoneSecondary: phoneSecondary !== undefined ? (phoneSecondary?.trim() || null) : existing.phoneSecondary,
        tollFreeNumber: tollFreeNumber !== undefined ? (tollFreeNumber?.trim() || null) : existing.tollFreeNumber,
        whatsappNumber: whatsappNumber !== undefined ? (whatsappNumber?.trim() || null) : existing.whatsappNumber,
        email: email !== undefined ? (email?.trim() || null) : existing.email,
        availableHours: availableHours !== undefined ? (availableHours?.trim() || null) : existing.availableHours,
        is24x7: is24x7 !== undefined ? Boolean(is24x7) : existing.is24x7,
        isEmergency: isEmergency !== undefined ? Boolean(isEmergency) : existing.isEmergency,
        isTollFree: isTollFree !== undefined ? Boolean(isTollFree) : existing.isTollFree,
        isWhatsAppEnabled: isWhatsAppEnabled !== undefined ? Boolean(isWhatsAppEnabled) : existing.isWhatsAppEnabled,
        areaWardCoverage: areaWardCoverage !== undefined ? (areaWardCoverage?.trim() || null) : existing.areaWardCoverage,
        address: address !== undefined ? (address?.trim() || null) : existing.address,
        iconKey: iconKey !== undefined ? iconKey : existing.iconKey,
        colorScheme: colorScheme !== undefined ? colorScheme : existing.colorScheme,
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : existing.displayOrder,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        notes: notes !== undefined ? (notes?.trim() || null) : existing.notes,
        metadata: metadata !== undefined ? metadata : existing.metadata,
      },
    });

    res.json({
      success: true,
      message: "Helpline contact updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Failed to update helpline contact:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update helpline contact" });
  }
});

// ─── PATCH /:id/status ──────────────────────────────────────────────────────
router.patch("/:id/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId as string;
    const id = req.params.id as string;
    const { isActive } = req.body;

    if (!tenantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const helpline = await prisma.helplineContact.findFirst({
      where: { id, tenantId },
    });

    if (!helpline) {
      res.status(404).json({ success: false, message: "Helpline contact not found" });
      return;
    }

    const newStatus = isActive !== undefined ? Boolean(isActive) : !helpline.isActive;

    const updated = await prisma.helplineContact.update({
      where: { id },
      data: { isActive: newStatus },
    });

    res.json({
      success: true,
      message: `Helpline contact marked as ${newStatus ? "Active" : "Inactive"}`,
      data: updated,
    });
  } catch (error: any) {
    console.error("Failed to toggle helpline status:", error);
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
});

// ─── POST /seed-defaults ────────────────────────────────────────────────────
router.post("/seed-defaults", async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId as string;
    if (!tenantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { overwrite = false } = req.body;

    if (overwrite) {
      await prisma.helplineContact.deleteMany({
        where: { tenantId },
      });
    }

    // Get current maximum displayOrder
    const existingHelplines = await prisma.helplineContact.findMany({
      where: { tenantId },
      select: { phonePrimary: true, title: true },
    });

    const existingPhones = new Set(existingHelplines.map((h) => h.phonePrimary));

    const toInsert = DEFAULT_HELPLINES.filter((h) => overwrite || !existingPhones.has(h.phonePrimary)).map((h) => ({
      ...h,
      tenantId,
      category: h.category as any,
    }));

    if (toInsert.length === 0) {
      res.json({
        success: true,
        message: "All default standard emergency numbers are already present.",
        count: 0,
      });
      return;
    }

    const created = await prisma.helplineContact.createMany({
      data: toInsert,
      skipDuplicates: true,
    });

    res.json({
      success: true,
      message: `Successfully seeded ${created.count} standard emergency & civic helpline contacts!`,
      count: created.count,
    });
  } catch (error: any) {
    console.error("Failed to seed default helplines:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to seed default numbers" });
  }
});

// ─── POST /bulk-delete ──────────────────────────────────────────────────────
router.post("/bulk-delete", async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId as string;
    const { ids } = req.body;

    if (!tenantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: "No helpline contact IDs provided" });
      return;
    }

    const deleteResult = await prisma.helplineContact.deleteMany({
      where: {
        id: { in: ids },
        tenantId,
      },
    });

    res.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} helpline contact(s)`,
      count: deleteResult.count,
    });
  } catch (error: any) {
    console.error("Failed to bulk delete helpline contacts:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to bulk delete helpline contacts" });
  }
});

// ─── DELETE /:id ────────────────────────────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId as string;
    const id = req.params.id as string;

    if (!tenantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const helpline = await prisma.helplineContact.findFirst({
      where: { id, tenantId },
    });

    if (!helpline) {
      res.status(404).json({ success: false, message: "Helpline contact not found" });
      return;
    }

    await prisma.helplineContact.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Helpline contact deleted successfully",
    });
  } catch (error: any) {
    console.error("Failed to delete helpline contact:", error);
    res.status(500).json({ success: false, message: "Failed to delete helpline contact" });
  }
});

export default router;
