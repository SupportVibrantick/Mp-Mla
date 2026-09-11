import { Router, Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createUploader, getUploadPath } from "../../../lib/upload.js";
import { createAuditLog } from "../../../middleware/auditLog.js";
import crypto from "crypto";

const assetUploader = createUploader("creatives");
const router = Router();

// ── 4 CURATED MASTER SYSTEM TEMPLATES ──────────────────────────────────────
const SYSTEM_DEFAULT_TEMPLATES = [
  // 1. BIRTHDAY TEMPLATE
  {
    slug: "happy-birthday-celebration",
    name: "Birthday Wish (जन्मदिन शुभकामना)",
    category: "BIRTHDAY",
    description: "Hero festive design for leaders, supporters, citizens & VIP birthdays with elegant golden accents.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#ea580c", secondary: "#c2410c", background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 40%, #fde68a 100%)" },
    layoutConfig: { layoutType: "birthday", templateType: "birthday" },
  },
  // 2. MEETING TEMPLATE
  {
    slug: "review-public-meeting",
    name: "Meeting & Samvad (समीक्षा एवं बैठक)",
    category: "MEETING",
    description: "Official public meeting & consultation notice with clear Date, Time, Venue badges and agenda.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#047857", secondary: "#064e3b", background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 40%, #bbf7d0 100%)" },
    layoutConfig: { layoutType: "meeting", templateType: "meeting" },
  },
  // 3. GENERAL TEMPLATE
  {
    slug: "public-notice-general",
    name: "General Notice (जन संदेश एवं सूचना)",
    category: "GENERAL",
    description: "Public announcements, progress updates, developmental achievements and community notices.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#1e40af", secondary: "#172554", background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 45%, #bfdbfe 100%)" },
    layoutConfig: { layoutType: "general", templateType: "general" },
  },
  // 4. OTHER TEMPLATE
  {
    slug: "greetings-achievements-other",
    name: "Other & Greetings (हार्दिक बधाई एवं अन्य)",
    category: "OTHER",
    description: "Versatile celebratory poster for achievements, congratulations, festival greetings, and special events.",
    format: "SQUARE_POST",
    width: 1080,
    height: 1080,
    defaultColors: { primary: "#b91c1c", secondary: "#881337", background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 45%, #fecdd3 100%)" },
    layoutConfig: { layoutType: "other", templateType: "other" },
  },
];

// Helper to seed default system templates and purge legacy outdated ones
async function ensureSystemTemplates() {
  const masterSlugs = SYSTEM_DEFAULT_TEMPLATES.map((t) => t.slug);

  // Purge any old legacy templates
  await prisma.creativeTemplate.deleteMany({
    where: {
      isSystemTemplate: true,
      slug: { notIn: masterSlugs },
    },
  });

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
