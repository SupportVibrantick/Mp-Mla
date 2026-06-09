import { Request, Response, NextFunction } from "express";
import prisma from "../../lib/prisma.js";
import { PLATFORM_SETTING_DEFS } from "../../lib/platformSettingDefaults.js";
import { clearPlatformSettingsCache } from "../../lib/settings.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";

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
      });
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
    const { settings } = req.body as {
      settings?: { key: string; value: string }[];
    };
    if (!Array.isArray(settings)) {
      throw ApiError.badRequest("Expected body.settings array");
    }

    const defsByKey = new Map(PLATFORM_SETTING_DEFS.map((d) => [d.key, d]));
    let updated = 0;

    for (const item of settings) {
      const def = defsByKey.get(item.key);
      if (!def) continue;
      await prisma.platformSetting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: {
          key: item.key,
          value: item.value,
          type: def.type,
          group: def.group,
          description: def.description,
        },
      });
      updated++;
    }

    clearPlatformSettingsCache();
    res.json(ApiResponse.success(null, `${updated} setting(s) updated`));
  } catch (error) {
    next(error);
  }
}
