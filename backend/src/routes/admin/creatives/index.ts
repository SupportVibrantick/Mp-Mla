import { Router, Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createUploader, getUploadPath } from "../../../lib/upload.js";
import { createAuditLog } from "../../../middleware/auditLog.js";
import crypto from "crypto";

const assetUploader = createUploader("creatives");
const router = Router();

// ── SYSTEM DEFAULT TEMPLATES SEED DATA (30+ Professional Templates across 12 Categories) ──
const SYSTEM_DEFAULT_TEMPLATES = [
  // BIRTHDAY (4)
  {
    slug: "happy-birthday-classic",
    name: "Happy Birthday Classic Wish",
    category: "BIRTHDAY",
    description: "Elegant birthday celebration design with leader photo, tricolor accents, and festive decorations.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#ea580c", secondary: "#047857", background: "linear-gradient(135deg, #fffdfa 0%, #fef3c7 40%, #fde68a 100%)" },
    layoutConfig: { layoutType: "birthday", templateType: "birthday" }
  },
  {
    slug: "birthday-full-photo-celebration",
    name: "Birthday Full Photo Celebration",
    category: "BIRTHDAY",
    description: "Full portrait celebration card for senior leaders and supporters.",
    format: "PORTRAIT_POST",
    width: 1080,
    height: 1350,
    defaultColors: { primary: "#d97706", secondary: "#1e3a8a", background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" },
    layoutConfig: { layoutType: "full-photo", templateType: "birthday" }
  },
  {
    slug: "birthday-minimal-premium",
    name: "Birthday Minimal Premium",
    category: "BIRTHDAY",
    description: "Clean minimal birthday wish banner with elegant typography.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#b45309", secondary: "#047857", background: "linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)" },
    layoutConfig: { layoutType: "minimal", templateType: "birthday" }
  },
  {
    slug: "birthday-floral-wishes",
    name: "Birthday Floral Celebration",
    category: "BIRTHDAY",
    description: "Warm festive floral border card for milestone birthday wishes.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#dc2626", secondary: "#d97706", background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)" },
    layoutConfig: { layoutType: "floral", templateType: "birthday" }
  },

  // MEETING (4)
  {
    slug: "janata-samvad-meeting",
    name: "Janata Samvad Meeting Invitation",
    category: "MEETING",
    description: "Official public meeting invite with date, time, venue & agenda details.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#047857", secondary: "#13538A", background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" },
    layoutConfig: { layoutType: "meeting-card", templateType: "meeting" }
  },
  {
    slug: "community-consultation-meeting",
    name: "Community Consultation Meeting",
    category: "MEETING",
    description: "Interactive townhall and ward consultation meeting notice.",
    format: "PORTRAIT_POST",
    width: 1080,
    height: 1350,
    defaultColors: { primary: "#0369a1", secondary: "#047857", background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)" },
    layoutConfig: { layoutType: "townhall", templateType: "meeting" }
  },
  {
    slug: "ward-committee-meeting",
    name: "Ward Committee Meeting Notice",
    category: "MEETING",
    description: "Official notice for constituency ward committee members.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#15803d", secondary: "#ca8a04", background: "linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)" },
    layoutConfig: { layoutType: "notice-card", templateType: "meeting" }
  },
  {
    slug: "cadre-review-meeting",
    name: "Party Worker Review Meeting",
    category: "MEETING",
    description: "Internal organization meeting banner with schedule block.",
    format: "BANNER_WIDE",
    width: 1200,
    height: 630,
    defaultColors: { primary: "#b91c1c", secondary: "#047857", background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)" },
    layoutConfig: { layoutType: "banner", templateType: "meeting" }
  },

  // JANATA DARBAR (3)
  {
    slug: "janata-darbar-hearing-official",
    name: "Janata Darbar Official Hearing",
    category: "JANATA_DARBAR",
    description: "Dedicated weekly grievance camp hearing notice with office timings.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#c2410c", secondary: "#047857", background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)" },
    layoutConfig: { layoutType: "darbar", templateType: "darbar" }
  },
  {
    slug: "janata-darbar-weekly-camp",
    name: "Weekly Grievance Redressal Camp",
    category: "JANATA_DARBAR",
    description: "Weekly public audience camp notification poster.",
    format: "PORTRAIT_POST",
    width: 1080,
    height: 1350,
    defaultColors: { primary: "#ea580c", secondary: "#1e3a8a", background: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)" },
    layoutConfig: { layoutType: "darbar-portrait", templateType: "darbar" }
  },
  {
    slug: "janata-darbar-mobile-camp",
    name: "Mobile Panchayat Janata Darbar",
    category: "JANATA_DARBAR",
    description: "Village-to-village mobile grievance hearing schedule.",
    format: "PRINT_A4",
    width: 2480,
    height: 3508,
    defaultColors: { primary: "#047857", secondary: "#ea580c", background: "linear-gradient(135deg, #f0fdf4 0%, #a7f3d0 100%)" },
    layoutConfig: { layoutType: "print-notice", templateType: "darbar" }
  },

  // EVENTS (3)
  {
    slug: "constituency-marathon-sports",
    name: "Green Valley Constituency Marathon",
    category: "EVENTS",
    description: "Sports and health marathon poster with runner silhouettes & stadium venue.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#dc2626", secondary: "#047857", background: "linear-gradient(135deg, #fff5f5 0%, #fee2e2 100%)" },
    layoutConfig: { layoutType: "marathon", templateType: "event" }
  },
  {
    slug: "cultural-heritage-festival-event",
    name: "Constituency Cultural Festival",
    category: "EVENTS",
    description: "Grand cultural music and arts festival invitation.",
    format: "PORTRAIT_POST",
    width: 1080,
    height: 1350,
    defaultColors: { primary: "#7e22ce", secondary: "#d97706", background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)" },
    layoutConfig: { layoutType: "cultural", templateType: "event" }
  },
  {
    slug: "youth-sports-tournament",
    name: "Youth Sports Tournament 2026",
    category: "EVENTS",
    description: "Inter-ward cricket and sports league announcement.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#0284c7", secondary: "#ea580c", background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)" },
    layoutConfig: { layoutType: "sports", templateType: "event" }
  },

  // GOVT SCHEME (3)
  {
    slug: "pm- आवास-yojana-scheme",
    name: "PM Awas Yojana Benefit Poster",
    category: "GOVT_SCHEME",
    description: "Public welfare scheme guide with eligibility checks and office contact.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#0284c7", secondary: "#047857", background: "linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)" },
    layoutConfig: { layoutType: "scheme-card", templateType: "scheme" }
  },
  {
    slug: "free-medical-health-card-scheme",
    name: "Ayushman Free Health Card Camp",
    category: "GOVT_SCHEME",
    description: "Health card registration and benefits information poster.",
    format: "PORTRAIT_POST",
    width: 1080,
    height: 1350,
    defaultColors: { primary: "#0d9488", secondary: "#13538A", background: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)" },
    layoutConfig: { layoutType: "health-scheme", templateType: "scheme" }
  },
  {
    slug: "farmer-subsidy-scheme",
    name: "Kisan Agriculture Assistance Scheme",
    category: "GOVT_SCHEME",
    description: "Agricultural equipment and seed subsidy scheme awareness poster.",
    format: "PRINT_A4",
    width: 2480,
    height: 3508,
    defaultColors: { primary: "#15803d", secondary: "#ca8a04", background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" },
    layoutConfig: { layoutType: "print-scheme", templateType: "scheme" }
  },

  // AWARENESS (3)
  {
    slug: "green-constituency-tree-plantation",
    name: "Clean & Green Tree Plantation Drive",
    category: "AWARENESS",
    description: "Environmental conservation drive poster with eco-action icon badges.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#16a34a", secondary: "#0284c7", background: "linear-gradient(135deg, #f0fdf4 0%, #86efac 100%)" },
    layoutConfig: { layoutType: "eco-awareness", templateType: "awareness" }
  },
  {
    slug: "swachh-bharat-cleanliness-drive",
    name: "Swachh Bharat Cleanliness Campaign",
    category: "AWARENESS",
    description: "Public cleanliness and plastic reduction campaign banner.",
    format: "PORTRAIT_POST",
    width: 1080,
    height: 1350,
    defaultColors: { primary: "#047857", secondary: "#ea580c", background: "linear-gradient(135deg, #f0fdf4 0%, #a7f3d0 100%)" },
    layoutConfig: { layoutType: "cleanliness", templateType: "awareness" }
  },
  {
    slug: "digital-literacy-awareness",
    name: "Digital Literacy & Cyber Safety Drive",
    category: "AWARENESS",
    description: "Cyber security and online public service awareness poster.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#4338ca", secondary: "#0284c7", background: "linear-gradient(135deg, #eef2ff 0%, #c7d2fe 100%)" },
    layoutConfig: { layoutType: "digital-awareness", templateType: "awareness" }
  },

  // FESTIVAL (3)
  {
    slug: "diwali-festive-greeting-dark",
    name: "Deepawali Golden Festive Greeting",
    category: "FESTIVAL",
    description: "Traditional Deepawali greeting with glowing brass diyas and golden lights.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#eab308", secondary: "#dc2626", background: "linear-gradient(180deg, #1e1b4b 0%, #311042 50%, #4c0519 100%)" },
    layoutConfig: { layoutType: "diwali-night", templateType: "festival" }
  },
  {
    slug: "holi-color-festive-wishes",
    name: "Holi Colors Festival Greeting",
    category: "FESTIVAL",
    description: "Vibrant colors of Holi greeting banner.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#db2777", secondary: "#eab308", background: "linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)" },
    layoutConfig: { layoutType: "holi-colors", templateType: "festival" }
  },
  {
    slug: "eid-mubarak-wishes",
    name: "Eid Mubarak Festive Wishes",
    category: "FESTIVAL",
    description: "Elegant crescent and star golden festive greeting card.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#047857", secondary: "#ca8a04", background: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)" },
    layoutConfig: { layoutType: "eid-crescent", templateType: "festival" }
  },

  // NATIONAL DAYS (3)
  {
    slug: "republic-day-tricolor-tribute",
    name: "Republic Day Tricolor Tribute",
    category: "NATIONAL_DAYS",
    description: "Patriotic 26 January Republic Day greeting with Ashoka Chakra accents.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#ea580c", secondary: "#047857", background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #f0fdf4 100%)" },
    layoutConfig: { layoutType: "republic-day", templateType: "national_day" }
  },
  {
    slug: "independence-day-78-salute",
    name: "Independence Day Patriotic Salute",
    category: "NATIONAL_DAYS",
    description: "15 August Independence Day celebration poster.",
    format: "PORTRAIT_POST",
    width: 1080,
    height: 1350,
    defaultColors: { primary: "#ea580c", secondary: "#047857", background: "linear-gradient(135deg, #fff7ed 0%, #f0fdf4 100%)" },
    layoutConfig: { layoutType: "independence-day", templateType: "national_day" }
  },
  {
    slug: "gandhi-jayanti-swachh-tribute",
    name: "Gandhi Jayanti National Tribute",
    category: "NATIONAL_DAYS",
    description: "2 October Gandhi Jayanti inspirational quote poster.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#b45309", secondary: "#047857", background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" },
    layoutConfig: { layoutType: "gandhi-tribute", templateType: "national_day" }
  },

  // DEVELOPMENT WORK (2)
  {
    slug: "road-inauguration-development-achievement",
    name: "4-Lane Road Project Completion",
    category: "DEVELOPMENT_WORK",
    description: "Infrastructure achievement poster highlighting highway road construction.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#0d9488", secondary: "#047857", background: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)" },
    layoutConfig: { layoutType: "road-dev", templateType: "achievement" }
  },
  {
    slug: "before-after-bridge-development",
    name: "Bridge Development Project (Before vs After)",
    category: "DEVELOPMENT_WORK",
    description: "Visual before-and-after development comparison card.",
    format: "PORTRAIT_POST",
    width: 1080,
    height: 1350,
    defaultColors: { primary: "#0284c7", secondary: "#047857", background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)" },
    layoutConfig: { layoutType: "before-after", templateType: "development" }
  },

  // ACHIEVEMENT (2)
  {
    slug: "constituency-metrics-achievement",
    name: "Constituency 5-Year Development Record",
    category: "ACHIEVEMENT",
    description: "Data-driven statistics poster showing projects completed and budget spent.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#047857", secondary: "#d97706", background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" },
    layoutConfig: { layoutType: "stats-achievement", templateType: "achievement" }
  },
  {
    slug: "top-constituency-award-achievement",
    name: "Best Constituency Excellence Award",
    category: "ACHIEVEMENT",
    description: "Public recognition award announcement banner.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#b45309", secondary: "#047857", background: "linear-gradient(135deg, #fffbeb 0%, #fde68a 100%)" },
    layoutConfig: { layoutType: "award-card", templateType: "achievement" }
  },

  // PUBLIC ANNOUNCEMENT (2)
  {
    slug: "urgent-power-outage-announcement",
    name: "Power Supply Maintenance Notice",
    category: "PUBLIC_ANNOUNCEMENT",
    description: "High-priority public utility notice banner with alert badge.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#4338ca", secondary: "#dc2626", background: "linear-gradient(135deg, #eef2ff 0%, #c7d2fe 100%)" },
    layoutConfig: { layoutType: "announcement-notice", templateType: "announcement" }
  },
  {
    slug: "weather-alert-safety-notice",
    name: "Monsoon Safety Advisory Announcement",
    category: "PUBLIC_ANNOUNCEMENT",
    description: "Emergency public weather and safety alert poster.",
    format: "PORTRAIT_POST",
    width: 1080,
    height: 1350,
    defaultColors: { primary: "#dc2626", secondary: "#1e3a8a", background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)" },
    layoutConfig: { layoutType: "alert-banner", templateType: "announcement" }
  },

  // GENERAL (1)
  {
    slug: "a-better-tomorrow-general-quote",
    name: "A Better Tomorrow Together",
    category: "GENERAL",
    description: "Inspiring motivational message with large leader portrait and slogan.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#047857", secondary: "#13538A", background: "linear-gradient(135deg, #f0fdf4 0%, #a7f3d0 100%)" },
    layoutConfig: { layoutType: "general-quote", templateType: "general" }
  },
];

// Helper to seed default system templates if none exist or update them
async function ensureSystemTemplates() {
  const count = await prisma.creativeTemplate.count({ where: { isSystemTemplate: true } });
  if (count < SYSTEM_DEFAULT_TEMPLATES.length) {
    for (const t of SYSTEM_DEFAULT_TEMPLATES) {
      await prisma.creativeTemplate.upsert({
        where: { slug: t.slug },
        update: {
          name: t.name,
          category: t.category as any,
          description: t.description,
          format: t.format as any,
          width: t.width,
          height: t.height,
          layoutConfig: t.layoutConfig as any,
          defaultColors: t.defaultColors as any,
          isSystemTemplate: true,
          isActive: true,
        },
        create: {
          slug: t.slug,
          name: t.name,
          category: t.category as any,
          description: t.description,
          format: t.format as any,
          width: t.width,
          height: t.height,
          layoutConfig: t.layoutConfig as any,
          defaultColors: t.defaultColors as any,
          isSystemTemplate: true,
          isActive: true,
        },
      });
    }
  }
}

// ── 1. GET /api/admin/creatives/templates ───────────────────────────────
router.get("/templates", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenantId(req);
    await ensureSystemTemplates();

    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const format = typeof req.query.format === "string" ? req.query.format : undefined;

    const where: any = {
      isActive: true,
      OR: [
        { isSystemTemplate: true },
        { tenantId },
      ],
    };

    if (category && category !== "ALL") {
      where.category = category;
    }
    if (format && format !== "ALL") {
      where.format = format;
    }

    const templates = await prisma.creativeTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
});

// ── 2. GET /api/admin/creatives/templates/:id ───────────────────────────
router.get("/templates/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;

    const template = await prisma.creativeTemplate.findFirst({
      where: {
        id,
        isActive: true,
        OR: [{ isSystemTemplate: true }, { tenantId }],
      },
    });

    if (!template) {
      res.status(404).json({ success: false, message: "Template not found" });
      return;
    }

    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});

// ── 3. POST /api/admin/creatives/templates ───────────────────────────────
router.post("/templates", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenantId(req);
    const { name, category, format, width, height, layoutConfig, defaultColors, description } = req.body;

    if (!name || !layoutConfig) {
      res.status(400).json({ success: false, message: "Template name and layout configuration are required." });
      return;
    }

    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

    const template = await prisma.creativeTemplate.create({
      data: {
        name: name.trim(),
        slug,
        category: category || "CUSTOM",
        description,
        format: format || "SQUARE_POST",
        width: width || 1080,
        height: height || 1080,
        layoutConfig,
        defaultColors: defaultColors || {},
        isSystemTemplate: false,
        isTenantTemplate: true,
        tenantId,
        createdBy: req.user!.id,
      },
    });

    res.status(201).json({ success: true, data: template, message: "Custom template created successfully." });
  } catch (error) {
    next(error);
  }
});

// ── 4. GET /api/admin/creatives/saved ───────────────────────────────────
router.get("/saved", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenantId(req);
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const where: any = { tenantId };

    if (category && category !== "ALL") {
      where.category = category;
    }
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (search && search.trim()) {
      where.title = { contains: search.trim(), mode: "insensitive" };
    }

    const saved = await prisma.savedCreative.findMany({
      where,
      include: {
        template: {
          select: { id: true, name: true, format: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json({ success: true, data: saved });
  } catch (error) {
    next(error);
  }
});

// ── 5. POST /api/admin/creatives/saved (Save Draft / New Design) ────────
router.post("/saved", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenantId(req);
    const { title, templateId, category, format, designJson, previewUrl, status } = req.body;

    if (!title || !designJson) {
      res.status(400).json({ success: false, message: "Title and design content are required." });
      return;
    }

    const saved = await prisma.savedCreative.create({
      data: {
        tenantId,
        createdBy: req.user!.id,
        templateId: templateId || null,
        title: title.trim(),
        category: category || "GENERAL",
        format: format || "SQUARE_POST",
        designJson,
        previewUrl: previewUrl || null,
        status: status || "DRAFT",
        version: 1,
      },
    });

    createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "creative",
      recordId: saved.id,
      description: `Saved creative design: ${saved.title}`,
    });

    res.status(201).json({ success: true, data: saved, message: "Design saved successfully." });
  } catch (error) {
    next(error);
  }
});

// ── 6. PUT /api/admin/creatives/saved/:id ──────────────────────────────
router.put("/saved/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const { title, category, format, designJson, previewUrl, status } = req.body;

    const existing = await prisma.savedCreative.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Saved creative not found." });
      return;
    }

    const updated = await prisma.savedCreative.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(category !== undefined && { category }),
        ...(format !== undefined && { format }),
        ...(designJson !== undefined && { designJson }),
        ...(previewUrl !== undefined && { previewUrl }),
        ...(status !== undefined && { status }),
        version: { increment: 1 },
      },
    });

    createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "creative",
      recordId: updated.id,
      description: `Updated creative design: ${updated.title}`,
    });

    res.json({ success: true, data: updated, message: "Design updated successfully." });
  } catch (error) {
    next(error);
  }
});

// ── 7. DELETE /api/admin/creatives/saved/:id ───────────────────────────
router.delete("/saved/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;

    const existing = await prisma.savedCreative.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Saved creative not found." });
      return;
    }

    await prisma.savedCreative.delete({ where: { id } });

    res.json({ success: true, message: "Creative design deleted." });
  } catch (error) {
    next(error);
  }
});

// ── 8. POST /api/admin/creatives/saved/:id/submit ──────────────────────
router.post("/saved/:id/submit", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;

    const existing = await prisma.savedCreative.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Saved creative not found." });
      return;
    }

    const creative = await prisma.savedCreative.update({
      where: { id },
      data: { status: "PENDING_REVIEW" },
    });

    createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "creative",
      recordId: creative.id,
      description: `Submitted creative for review: ${creative.title}`,
    });

    res.json({ success: true, data: creative, message: "Creative submitted for manager review." });
  } catch (error) {
    next(error);
  }
});

// ── 9. POST /api/admin/creatives/saved/:id/approve ────────────────────
router.post("/saved/:id/approve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;

    const existing = await prisma.savedCreative.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Saved creative not found." });
      return;
    }

    const creative = await prisma.savedCreative.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: req.user!.id,
        approvedAt: new Date(),
      },
    });

    createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "creative",
      recordId: creative.id,
      description: `Approved creative design: ${creative.title}`,
    });

    res.json({ success: true, data: creative, message: "Creative design approved successfully." });
  } catch (error) {
    next(error);
  }
});

// ── 10. POST /api/admin/creatives/saved/:id/reject ───────────────────
router.post("/saved/:id/reject", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const { reason } = req.body;

    const existing = await prisma.savedCreative.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Saved creative not found." });
      return;
    }

    const creative = await prisma.savedCreative.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason || "Requires changes",
      },
    });

    createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "creative",
      recordId: creative.id,
      description: `Rejected creative design: ${creative.title}`,
    });

    res.json({ success: true, data: creative, message: "Creative design rejected." });
  } catch (error) {
    next(error);
  }
});

// ── 11. POST /api/admin/creatives/saved/:id/share (Generate Share Token) ───────────
router.post("/saved/:id/share", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;

    const creative = await prisma.savedCreative.findFirst({
      where: { id, tenantId },
    });

    if (!creative) {
      res.status(404).json({ success: false, message: "Creative design not found." });
      return;
    }

    const shareToken = crypto.randomBytes(16).toString("hex");
    const shareUrl = `${req.protocol}://${req.get("host")}/creatives/shared/${shareToken}`;

    res.json({
      success: true,
      data: { shareToken, shareUrl, title: creative.title },
      message: "Share link generated successfully.",
    });
  } catch (error) {
    next(error);
  }
});

// ── 12. GET /api/admin/creatives/assets ────────────────────────────────
router.get("/assets", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenantId(req);
    const type = typeof req.query.type === "string" ? req.query.type : undefined;

    const where: any = {
      isActive: true,
      OR: [{ isSystem: true }, { tenantId }],
    };

    if (type && type !== "ALL") {
      where.type = type;
    }

    const assets = await prisma.creativeAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: assets });
  } catch (error) {
    next(error);
  }
});

// ── 13. POST /api/admin/creatives/upload-asset ────────────────────────
router.post(
  "/upload-asset",
  assetUploader.single("asset"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = requireTenantId(req);

      if (!req.file) {
        res.status(400).json({ success: false, message: "Asset file is required." });
        return;
      }

      const fileUrl = getUploadPath(req.file.filename, "creatives");
      const name = req.body.name || req.file.originalname;
      const type = req.body.type || "OTHER";

      const asset = await prisma.creativeAsset.create({
        data: {
          tenantId,
          name,
          type: type as any,
          fileUrl,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          isSystem: false,
          createdBy: req.user!.id,
        },
      });

      res.status(201).json({ success: true, data: asset, message: "Asset uploaded successfully." });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
