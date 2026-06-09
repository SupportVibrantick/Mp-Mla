import prisma from "./prisma.js";
import { DEFAULT_SETTING_DEFS } from "./settingDefaults.js";

/**
 * Build default TenantSetting rows for a new tenant.
 */
export function buildDefaultTenantSettings(tenantId: string) {
  return DEFAULT_SETTING_DEFS.map((def) => ({
    tenantId,
    key: def.key,
    value: def.value,
    type: def.type,
    group: def.group,
    description: def.description,
  }));
}

/**
 * Seed all default settings for a tenant (skips existing keys).
 */
export async function seedDefaultTenantSettings(tenantId: string) {
  const existing = await prisma.tenantSetting.findMany({
    where: { tenantId },
    select: { key: true },
  });
  const existingKeys = new Set(existing.map((s) => s.key));
  const toCreate = buildDefaultTenantSettings(tenantId).filter(
    (s) => !existingKeys.has(s.key),
  );
  if (toCreate.length > 0) {
    await prisma.tenantSetting.createMany({ data: toCreate });
  }
}

/**
 * Migrate global SystemSetting values into a tenant's TenantSetting rows.
 */
export async function migrateSystemSettingsToTenant(tenantId: string) {
  const [systemSettings, tenantSettings] = await Promise.all([
    prisma.systemSetting.findMany(),
    prisma.tenantSetting.findMany({ where: { tenantId }, select: { key: true } }),
  ]);
  const existingKeys = new Set(tenantSettings.map((s) => s.key));
  const systemMap = new Map(systemSettings.map((s) => [s.key, s]));

  await seedDefaultTenantSettings(tenantId);

  for (const def of DEFAULT_SETTING_DEFS) {
    const systemVal = systemMap.get(def.key);
    if (!systemVal) continue;
    await prisma.tenantSetting.upsert({
      where: { tenantId_key: { tenantId, key: def.key } },
      update: { value: systemVal.value },
      create: {
        tenantId,
        key: def.key,
        value: systemVal.value,
        type: def.type,
        group: def.group,
        description: def.description,
      },
    });
  }
}
