import { Request, Response, NextFunction } from "express";
import prisma from "../../lib/prisma.js";
import { createAuditLog, getRequestMeta } from "../../middleware/auditLog.js";
import { PLATFORM_SETTING_DEFS } from "../../lib/platformSettingDefaults.js";
import { clearPlatformSettingsCache } from "../../lib/settings.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { getUploadPath, deleteFile } from "../../lib/upload.js";
import { testSmtpConnection } from "../../lib/email.js";

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

export async function listPlatformSettings(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dbSettings = await prisma.platformSetting.findMany();
    const dbMap = new Map(dbSettings.map((s) => [s.key, s]));

    const grouped: Record<string, unknown[]> = {};
    for (const def of PLATFORM_SETTING_DEFS) {
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
      grouped[g].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      for (const s of grouped[g] as any[]) {
        if (s.masked && s.value) s.value = "••••••••";
      }
    }

    res.json(ApiResponse.success(grouped));
  } catch (error) {
    next(error);
  }
}

export async function updatePlatformSettings(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const settings = parseIncomingSettings(req);
    if (!settings) {
      throw ApiError.badRequest("Expected body.settings to be an array");
    }

    const defsByKey = new Map(PLATFORM_SETTING_DEFS.map((d) => [d.key, d]));
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
      const existing = await prisma.platformSetting.findUnique({
        where: { key },
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

      await prisma.platformSetting.upsert({
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
        old: def.type === "secret" ? "***" : (oldValue ?? ""),
        new: def.type === "secret" ? "***" : (value ?? ""),
      });
    }

    clearPlatformSettingsCache();
    if (changed.length > 0) {
      await createAuditLog({
        userId: (req as any).platformUser?.id ?? null,
        action: "UPDATE",
        module: "settings",
        description: `Updated ${changed.length} platform setting(s)`,
        oldData: Object.fromEntries(changed.map((c) => [c.key, c.old])),
        newData: Object.fromEntries(changed.map((c) => [c.key, c.new])),
        ...getRequestMeta(req),
      });
    }

    res.json(ApiResponse.success(null, `${changed.length} setting(s) updated`));
  } catch (error) {
    next(error);
  }
}

export async function resetPlatformSettings(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { group } = req.params;
    const groupDefs = PLATFORM_SETTING_DEFS.filter((d) => d.group === group);
    if (groupDefs.length === 0) {
      throw ApiError.notFound("Group not found");
    }

    for (const def of groupDefs) {
      const existing = await prisma.platformSetting.findUnique({
        where: { key: def.key },
      });
      if (existing?.value?.startsWith("/uploads/settings/")) {
        deleteFile(existing.value);
      }

      await prisma.platformSetting.upsert({
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

    clearPlatformSettingsCache();
    await createAuditLog({
      userId: (req as any).platformUser?.id ?? null,
      action: "UPDATE",
      module: "settings",
      description: `Reset "${group}" platform settings to defaults`,
      ...getRequestMeta(req),
    });

    res.json(ApiResponse.success(null, `"${group}" settings reset`));
  } catch (error) {
    next(error);
  }
}

export async function testPlatformSmtpConnection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { to } = req.body;
    if (!to) {
      throw ApiError.badRequest("Recipient email 'to' is required");
    }

    const result = await testSmtpConnection("platform", to);
    if (result.success) {
      res.json(ApiResponse.success(null, "Test email sent successfully!"));
    } else {
      res.status(400).json({
        success: false,
        message: result.error || "Failed to send test email",
      });
    }
  } catch (error) {
    next(error);
  }
}
