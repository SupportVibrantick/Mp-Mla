import prisma from "./prisma.js";
import { ApiError } from "../utils/ApiError.js";

export async function assertCanCreateUser(_tenantId: string): Promise<void> {
  // Unlimited users
  return;
}

export async function assertCanCreateWard(_tenantId: string): Promise<void> {
  // Unlimited wards
  return;
}

export async function assertStorageQuota(
  _tenantId: string,
  _additionalBytes: number,
): Promise<void> {
  // Unlimited storage
  return;
}

export async function trackStorageDelta(
  _tenantId: string,
  _deltaBytes: number,
): Promise<void> {
  // Unlimited storage tracking
  return;
}

export async function getTenantUsage(tenantId: string) {
  const [tenant, userCount, wardCount, subscription] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    }),
    prisma.user.count({ where: { tenantId } }),
    prisma.ward.count({ where: { tenantId, isDeleted: false } }),
    prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: { select: { name: true } } },
    }),
  ]);

  return {
    users: { used: userCount, limit: null },
    wards: {
      used: wardCount,
      limit: null,
    },
    storage: {
      usedMB: 0,
      limitMB: null,
    },
    planName: subscription?.plan?.name ?? null,
  };
}
