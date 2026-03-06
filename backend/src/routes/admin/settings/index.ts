import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { authenticate, requireActiveUser } from "../../../middleware/auth.js";
import { requirePermission } from "../../../middleware/permission.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";
import { validate } from "../../../middleware/validate.js";
import catchAsync from "@/utils/catchAsync.js";
import { DEFAULT_SETTING_DEFS } from "../../../lib/settingDefaults.js";
import { clearSettingsCache } from "../../../lib/settings.js";

const router = Router();

// ════════════════════════════════════════════════════════
// DEFAULT SETTINGS DEFINITION (map for fast lookup)
// ════════════════════════════════════════════════════════

const DEFAULT_SETTINGS: Record<string, any> = {};
DEFAULT_SETTING_DEFS.forEach((d) => {
  DEFAULT_SETTINGS[d.key] = d;
});

// ════════════════════════════════════════════════════════
// PUBLIC ROUTE (Branding/General)
// ════════════════════════════════════════════════════════

export const getPublicBranding = catchAsync(async (_req, res) => {
  const publicKeys = [
    "org_name",
    "org_short_name",
    "constituency_name",
    "representative_name",
    "representative_title",
    "brand_primary_color",
    "brand_secondary_color",
    "brand_logo_url",
    "brand_favicon_emoji",
    "brand_login_bg",
    "brand_footer_text",
  ];

  const dbSettings = await prisma.systemSetting.findMany({
    where: { key: { in: publicKeys } },
  });
  const dbMap = new Map(dbSettings.map((s) => [s.key, s.value]));

  const data: Record<string, string> = {};
  publicKeys.forEach((k) => {
    data[k] = dbMap.get(k) ?? DEFAULT_SETTINGS[k]?.value ?? "";
  });

  res.json({ success: true, data });
});

router.get("/public/branding", getPublicBranding);

// ════════════════════════════════════════════════════════
// ADMIN ROUTES
// ════════════════════════════════════════════════════════

router.get(
  "/",
  authenticate,
  requireActiveUser,
  requirePermission("settings", "read"),
  catchAsync(async (_req, res) => {
    const dbSettings = await prisma.systemSetting.findMany();
    const dbMap = new Map(dbSettings.map((s) => [s.key, s]));

    const grouped: Record<string, any[]> = {};

    for (const def of DEFAULT_SETTING_DEFS) {
      if (!grouped[def.group]) grouped[def.group] = [];
      const dbVal = dbMap.get(def.key);

      grouped[def.group].push({
        ...def,
        value: dbVal?.value ?? def.value,
        updatedAt: dbVal?.updatedAt || null,
        masked: def.type === "secret" && !!(dbVal?.value ?? def.value),
      });
    }

    // Mask secrets and sort
    for (const g of Object.keys(grouped)) {
      grouped[g].sort((a, b) => a.order - b.order);
      for (const s of grouped[g]) {
        if (s.masked && s.value) {
          s.value = "••••••••";
        }
      }
    }

    res.json({ success: true, data: grouped });
  }),
);

router.get(
  "/:key",
  authenticate,
  requireActiveUser,
  requirePermission("settings", "read"),
  catchAsync(async (req, res) => {
    const key = req.params.key as string;
    const def = DEFAULT_SETTINGS[key];
    if (!def) throw ApiError.notFound("Setting not found");

    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    res.json({
      success: true,
      data: {
        ...def,
        value: setting?.value ?? def.value,
      },
    });
  }),
);

const updateSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string(),
    }),
  ),
});

router.put(
  "/",
  authenticate,
  requireActiveUser,
  requirePermission("settings", "update"),
  validate(updateSchema),
  catchAsync(async (req, res) => {
    const { settings: updates } = req.body;
    const changed: any[] = [];

    for (const { key, value } of updates) {
      const def = DEFAULT_SETTINGS[key];
      if (!def) continue;

      // Skip if masked secret and user sent dots
      if (def.type === "secret" && value.includes("••••")) continue;

      const old = await prisma.systemSetting.findUnique({ where: { key } });
      const oldValue = old?.value ?? def.value;

      if (oldValue === value) continue;

      await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: {
          key,
          value,
          group: def.group,
          type: def.type,
          description: def.description,
        },
      });

      changed.push({
        key,
        old: def.type === "secret" ? "***" : oldValue,
        new: def.type === "secret" ? "***" : value,
      });
    }

    if (changed.length > 0) {
      clearSettingsCache();
      await createAuditLog({
        userId: req.user!.id,
        action: "UPDATE",
        module: "settings",
        description: `Updated ${changed.length} setting(s)`,
        oldData: Object.fromEntries(changed.map((c) => [c.key, c.old])),
        newData: Object.fromEntries(changed.map((c) => [c.key, c.new])),
        ...getRequestMeta(req),
      });
    }

    res.json({
      success: true,
      message:
        changed.length > 0
          ? `${changed.length} setting(s) updated`
          : "No changes",
    });
  }),
);

router.post(
  "/reset/:group",
  authenticate,
  requireActiveUser,
  requirePermission("settings", "update"),
  catchAsync(async (req, res) => {
    const { group } = req.params;
    const groupDefs = DEFAULT_SETTING_DEFS.filter((d) => d.group === group);
    if (groupDefs.length === 0) throw ApiError.notFound("Group not found");

    for (const def of groupDefs) {
      await prisma.systemSetting.upsert({
        where: { key: def.key },
        update: { value: def.value },
        create: {
          key: def.key,
          value: def.value,
          group: def.group,
          type: def.type,
          description: def.description,
        },
      });
    }

    clearSettingsCache();
    await createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "settings",
      description: `Reset "${group}" settings to defaults`,
      ...getRequestMeta(req),
    });

    res.json({ success: true, message: `"${group}" settings reset` });
  }),
);

export default router;
