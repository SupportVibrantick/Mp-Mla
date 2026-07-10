import { Router, Request } from "express";
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
import { PLATFORM_SETTING_DEFS } from "../../../lib/platformSettingDefaults.js";
import { clearSettingsCache } from "../../../lib/settings.js";
import {
  createUploader,
  deleteFile,
  getUploadPath,
  enforceStorageAndTrack,
} from "../../../lib/upload.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { testSmtpConnection } from "../../../lib/email.js";
import { testWhatsAppConnection } from "../../../lib/whatsapp.js";

const router = Router();
const settingsUploader = createUploader("settings");

const DEFAULT_SETTINGS: Record<string, (typeof DEFAULT_SETTING_DEFS)[number]> =
  {};
DEFAULT_SETTING_DEFS.forEach((d) => {
  DEFAULT_SETTINGS[d.key] = d;
});

const ALL_DEFAULT_SETTINGS: Record<string, any> = {};
DEFAULT_SETTING_DEFS.forEach((d) => {
  ALL_DEFAULT_SETTINGS[d.key] = d;
});
PLATFORM_SETTING_DEFS.forEach((d) => {
  ALL_DEFAULT_SETTINGS[d.key] = d;
});

const PUBLIC_BRANDING_KEYS = [
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

async function resolvePublicTenantId(req: Request): Promise<string | null> {
  const tenantId =
    (req.headers["x-tenant-id"] as string | undefined) ||
    (req.query.tenantId as string | undefined);

  if (tenantId) {
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, status: "ACTIVE" },
      select: { id: true },
    });
    return tenant?.id ?? null;
  }

  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
    take: 2,
  });
  return tenants.length === 1 ? tenants[0].id : null;
}

function parseIncomingSettings(req: Request) {
  if (Array.isArray(req.body?.settings)) {
    return req.body.settings;
  }
  if (typeof req.body?.settings === "string") {
    try {
      const parsed = JSON.parse(req.body.settings);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      throw ApiError.badRequest("settings must be valid JSON");
    }
  }
  return null;
}

export const getPublicBranding = catchAsync(async (req, res) => {
  const tenantId = await resolvePublicTenantId(req);

  const platformDbSettings = await prisma.platformSetting.findMany({
    where: {
      key: {
        in: [
          "brand_primary_color",
          "brand_secondary_color",
          "brand_logo_url",
          "brand_favicon_url",
          "brand_login_bg",
          "brand_footer_text",
        ],
      },
    },
  });
  const platformMap = new Map(platformDbSettings.map((s) => [s.key, s.value]));

  if (tenantId) {
    const [tenant, tenantDbSettings] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.tenantSetting.findMany({
        where: {
          tenantId,
          key: {
            in: [
              "org_name",
              "org_short_name",
              "constituency_name",
              "representative_name",
              "representative_title",
            ],
          },
        },
      }),
    ]);
    const tenantMap = new Map(tenantDbSettings.map((s) => [s.key, s.value]));

    const data: Record<string, string> = {
      org_name: tenantMap.get("org_name") ?? tenant?.name ?? "",
      org_short_name: tenantMap.get("org_short_name") ?? "",
      constituency_name:
        tenantMap.get("constituency_name") ?? tenant?.constituencyName ?? "",
      representative_name:
        tenantMap.get("representative_name") ?? tenant?.representativeName ?? "",
      representative_title:
        tenantMap.get("representative_title") ?? tenant?.representativeTitle ?? "",
      brand_primary_color:
        platformMap.get("brand_primary_color") ?? ALL_DEFAULT_SETTINGS["brand_primary_color"]?.value ?? "#2563eb",
      brand_secondary_color:
        platformMap.get("brand_secondary_color") ?? ALL_DEFAULT_SETTINGS["brand_secondary_color"]?.value ?? "#7c3aed",
      brand_logo_url: platformMap.get("brand_logo_url") ?? "",
      brand_favicon_url:
        platformMap.get("brand_favicon_url") ?? "",
      brand_login_bg: platformMap.get("brand_login_bg") ?? "gradient",
      brand_footer_text: platformMap.get("brand_footer_text") ?? "Powered by Vibrantick Infotech Solutions",
    };
    res.json({ success: true, data });
    return;
  }

  const data: Record<string, string> = {
    org_name: "MP-MLA Platform",
    org_short_name: "Platform",
    brand_primary_color:
      platformMap.get("brand_primary_color") ?? ALL_DEFAULT_SETTINGS["brand_primary_color"]?.value ?? "#2563eb",
    brand_secondary_color:
      platformMap.get("brand_secondary_color") ?? ALL_DEFAULT_SETTINGS["brand_secondary_color"]?.value ?? "#7c3aed",
    brand_logo_url: platformMap.get("brand_logo_url") ?? "",
    brand_favicon_url:
      platformMap.get("brand_favicon_url") ?? "",
    brand_login_bg: platformMap.get("brand_login_bg") ?? "gradient",
    brand_footer_text: platformMap.get("brand_footer_text") ?? "Powered by Vibrantick Infotech Solutions",
  };
  res.json({ success: true, data });
});

router.get("/public/branding", getPublicBranding);

router.get(
  "/",
  authenticate,
  requireActiveUser,
  requirePermission("settings", "read"),
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const dbSettings = await prisma.tenantSetting.findMany({ where: { tenantId } });
    const dbMap = new Map(dbSettings.map((s) => [s.key, s]));

    const grouped: Record<string, unknown[]> = {};
    for (const def of DEFAULT_SETTING_DEFS) {
      if (!grouped[def.group]) grouped[def.group] = [];
      const dbVal = dbMap.get(def.key);
      grouped[def.group].push({
        ...def,
        value: dbVal?.value ?? def.value,
        updatedAt: dbVal?.updatedAt ?? null,
        masked: def.type === "secret" && !!(dbVal?.value ?? def.value),
      });
    }

    for (const g of Object.keys(grouped)) {
      grouped[g].sort((a: any, b: any) => a.order - b.order);
      for (const s of grouped[g] as any[]) {
        if (s.masked && s.value) s.value = "••••••••";
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
    const tenantId = requireTenantId(req);
    const key = req.params.key as string;
    const def = DEFAULT_SETTINGS[key];
    if (!def) throw ApiError.notFound("Setting not found");

    const setting = await prisma.tenantSetting.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });

    res.json({
      success: true,
      data: { ...def, value: setting?.value ?? def.value },
    });
  }),
);

router.put(
  "/",
  authenticate,
  requireActiveUser,
  requirePermission("settings", "update"),
  settingsUploader.any(),
  enforceStorageAndTrack,
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const settings = parseIncomingSettings(req);
    if (!settings) {
      throw ApiError.badRequest("Expected body.settings to be an array");
    }

    const defsByKey = new Map(DEFAULT_SETTING_DEFS.map((def) => [def.key, def]));
    const fileMap = new Map<string, Express.Multer.File>();
    const files = Array.isArray(req.files)
      ? (req.files as Express.Multer.File[])
      : [];

    for (const file of files) {
      if (file.fieldname.startsWith("settingImage__")) {
        fileMap.set(file.fieldname.replace("settingImage__", ""), file);
      }
    }

    const changed: { key: string; old: string; new: string }[] = [];

    for (const item of settings) {
      const key = typeof item?.key === "string" ? item.key : "";
      const rawValue = typeof item?.value === "string" ? item.value : "";
      const def = defsByKey.get(key);
      if (!def) continue;
      if (def.type === "secret" && rawValue.includes("••••")) continue;

      const uploadedFile = fileMap.get(key);
      const existing = await prisma.tenantSetting.findUnique({
        where: { tenantId_key: { tenantId, key } },
      });

      let value = rawValue;
      if (uploadedFile) {
        value = getUploadPath(uploadedFile.filename, "settings");
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

      await prisma.tenantSetting.upsert({
        where: { tenantId_key: { tenantId, key } },
        update: { value },
        create: {
          tenantId,
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
      clearSettingsCache(tenantId);
      await createAuditLog({
        tenantId,
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
    const tenantId = requireTenantId(req);
    const { group } = req.params;
    const groupDefs = DEFAULT_SETTING_DEFS.filter((d) => d.group === group);
    if (groupDefs.length === 0) throw ApiError.notFound("Group not found");

    for (const def of groupDefs) {
      const existing = await prisma.tenantSetting.findUnique({
        where: { tenantId_key: { tenantId, key: def.key } },
      });
      if (
        existing?.value?.startsWith("/uploads/settings/")
      ) {
        deleteFile(existing.value);
      }

      await prisma.tenantSetting.upsert({
        where: { tenantId_key: { tenantId, key: def.key } },
        update: { value: def.value },
        create: {
          tenantId,
          key: def.key,
          value: def.value,
          group: def.group,
          type: def.type,
          description: def.description,
        },
      });
    }

    clearSettingsCache(tenantId);
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "settings",
      description: `Reset "${group}" settings to defaults`,
      ...getRequestMeta(req),
    });

    res.json({ success: true, message: `"${group}" settings reset` });
  }),
);

router.post(
  "/test-email",
  authenticate,
  requireActiveUser,
  requirePermission("settings", "read"),
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const { to } = req.body;
    if (!to) throw ApiError.badRequest("Recipient email 'to' is required");

    const result = await testSmtpConnection(tenantId, to);
    if (result.success) {
      res.json({ success: true, message: "Test email sent successfully!" });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || "Failed to send test email",
      });
    }
  }),
);

router.post(
  "/test-whatsapp",
  authenticate,
  requireActiveUser,
  requirePermission("settings", "read"),
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const { to } = req.body;
    if (!to) {
      throw ApiError.badRequest("Recipient phone number 'to' is required");
    }

    const result = await testWhatsAppConnection(tenantId, to);
    if (result.success) {
      res.json({
        success: true,
        message: "Test WhatsApp message sent successfully!",
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || "Failed to send test WhatsApp message",
      });
    }
  }),
);

export default router;
