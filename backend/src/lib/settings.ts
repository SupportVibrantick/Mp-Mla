import prisma from "./prisma.js";
import { DEFAULT_SETTING_DEFS } from "./settingDefaults.js";

const TTL = 60 * 1000;

type CacheEntry = { map: Record<string, string>; lastFetch: number };

const tenantCache = new Map<string, CacheEntry>();
const platformCache: { entry: CacheEntry | null } = { entry: null };

function buildMapFromDefs(
  dbSettings: { key: string; value: string }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const def of DEFAULT_SETTING_DEFS) {
    map[def.key] = def.value;
  }
  for (const s of dbSettings) {
    map[s.key] = s.value;
  }
  return map;
}

async function getTenantSettingsMap(tenantId: string): Promise<Record<string, string>> {
  const now = Date.now();
  const cached = tenantCache.get(tenantId);
  if (cached && now - cached.lastFetch < TTL) {
    return cached.map;
  }

  const dbSettings = await prisma.tenantSetting.findMany({
    where: { tenantId },
    select: { key: true, value: true },
  });
  const map = buildMapFromDefs(dbSettings);
  tenantCache.set(tenantId, { map, lastFetch: now });
  return map;
}

async function getPlatformSettingsMap(): Promise<Record<string, string>> {
  const now = Date.now();
  if (platformCache.entry && now - platformCache.entry.lastFetch < TTL) {
    return platformCache.entry.map;
  }

  const dbSettings = await prisma.platformSetting.findMany({
    select: { key: true, value: true },
  });
  const map: Record<string, string> = {};
  for (const s of dbSettings) {
    map[s.key] = s.value;
  }
  platformCache.entry = { map, lastFetch: now };
  return map;
}

/**
 * Get a tenant-scoped setting value.
 */
export async function getSetting(key: string, tenantId: string): Promise<string> {
  const map = await getTenantSettingsMap(tenantId);
  const def = DEFAULT_SETTING_DEFS.find((d) => d.key === key);
  return map[key] ?? def?.value ?? "";
}

export async function getSettingBoolean(
  key: string,
  tenantId: string,
): Promise<boolean> {
  return (await getSetting(key, tenantId)) === "true";
}

export async function getSettingNumber(
  key: string,
  tenantId: string,
): Promise<number> {
  return parseInt(await getSetting(key, tenantId), 10) || 0;
}

/**
 * Get a platform-level setting value.
 */
export async function getPlatformSetting(key: string): Promise<string> {
  const map = await getPlatformSettingsMap();
  return map[key] ?? "";
}

export async function getPlatformSettingBoolean(key: string): Promise<boolean> {
  return (await getPlatformSetting(key)) === "true";
}

export function clearSettingsCache(tenantId?: string) {
  if (tenantId) {
    tenantCache.delete(tenantId);
  } else {
    tenantCache.clear();
  }
}

export function clearPlatformSettingsCache() {
  platformCache.entry = null;
}
