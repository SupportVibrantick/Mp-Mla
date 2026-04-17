import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { authenticate, requireActiveUser } from "../../../middleware/auth.js";
import { requirePermission } from "../../../middleware/permission.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import catchAsync from "@/utils/catchAsync.js";
import { DEFAULT_SETTING_DEFS } from "../../../lib/settingDefaults.js";
import { clearSettingsCache } from "../../../lib/settings.js";
import { createUploader, deleteFile, getUploadPath } from "../../../lib/upload.js";

const router = Router();
const settingsUploader = createUploader("settings");

// ════════════════════════════════════════════════════════
// DEFAULT SETTINGS DEFINITION (map for fast lookup)
// ════════════════════════════════════════════════════════

const DEFAULT_SETTINGS: Record<string, any> = {};
DEFAULT_SETTING_DEFS.forEach((d) => {
  DEFAULT_SETTINGS[d.key] = d;
});

// ════════════════════════════════════════════════════════
// Helper: parse settings from multipart or JSON body
// ════════════════════════════════════════════════════════

function parseIncomingSettings(req: any) {
  if (Array.isArray(req.body?.settings)) {
    return req.body.settings;
  }

  if (typeof req.body?.settings === "string") {
    try {
      const parsed = JSON.parse(req.body.settings);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      throw ApiError.badRequest("settings must be valid JSON");
    }
  }

  return null;
}

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
    "brand_favicon_url",
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

router.put(
  "/",
  authenticate,
  requireActiveUser,
  requirePermission("settings", "update"),
  settingsUploader.any(),
  catchAsync(async (req, res) => {
    const settings = parseIncomingSettings(req);
    if (!settings) {
      throw ApiError.badRequest("Expected body.settings to be an array");
    }

    const defsByKey = new Map(DEFAULT_SETTING_DEFS.map((def) => [def.key, def]));
    const fileMap = new Map<string, Express.Multer.File>();
    const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];

    for (const file of files) {
      if (file.fieldname.startsWith("settingImage__")) {
        const key = file.fieldname.replace("settingImage__", "");
        fileMap.set(key, file);
      }
    }

    const changed: any[] = [];

    for (const item of settings) {
      const key = typeof item?.key === "string" ? item.key : "";
      const rawValue = typeof item?.value === "string" ? item.value : "";
      const def = defsByKey.get(key);

      if (!def) continue;

      // Skip if masked secret and user sent dots
      if (def.type === "secret" && rawValue.includes("••••")) continue;

      const uploadedFile = fileMap.get(key);
      const existing = await prisma.systemSetting.findUnique({
        where: { key },
      });

      let value = rawValue;

      if (uploadedFile) {
        value = getUploadPath(uploadedFile.filename, "settings");

        // Delete old file if different
        if (
          existing?.value &&
          existing.value !== value &&
          existing.value.startsWith("/uploads/settings/")
        ) {
          deleteFile(existing.value);
        }
      }

      const oldValue = existing?.value ?? def.value;
      if (oldValue === value && !uploadedFile) continue;

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
      // Delete uploaded files when resetting
      const existing = await prisma.systemSetting.findUnique({
        where: { key: def.key },
      });
      if (
        existing?.value &&
        typeof existing.value === "string" &&
        existing.value.startsWith("/uploads/settings/")
      ) {
        deleteFile(existing.value);
      }

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

import { testSmtpConnection } from "../../../lib/email.js";

router.post(
  "/test-email",
  authenticate,
  requireActiveUser,
  requirePermission("settings", "read"), // any admin with settings read can test
  catchAsync(async (req, res) => {
    const { to } = req.body;
    if (!to) {
      throw ApiError.badRequest("Recipient email 'to' is required");
    }

    const result = await testSmtpConnection(to);
    
    if (result.success) {
      res.json({ success: true, message: "Test email sent successfully!" });
    } else {
      res.status(400).json({ 
        success: false, 
        message: result.error || "Failed to send test email" 
      });
    }
  })
);

import { testWhatsAppConnection } from "../../../lib/whatsapp.js";

router.post(
  "/test-whatsapp",
  authenticate,
  requireActiveUser,
  requirePermission("settings", "read"),
  catchAsync(async (req, res) => {
    const { to } = req.body;
    if (!to) {
      throw ApiError.badRequest("Recipient phone number 'to' is required");
    }

    const result = await testWhatsAppConnection(to);
    
    if (result.success) {
      res.json({ success: true, message: "Test WhatsApp message sent successfully!" });
    } else {
      res.status(400).json({ 
        success: false, 
        message: result.error || "Failed to send test WhatsApp message" 
      });
    }
  })
);

export default router;
