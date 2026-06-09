import prisma from "./prisma.js";
import { ApiError } from "../utils/ApiError.js";

export async function assertCanCreateUser(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { maxUsers: true, _count: { select: { users: true } } },
  });
  if (!tenant) throw ApiError.notFound("Tenant not found");
  if (tenant._count.users >= tenant.maxUsers) {
    throw ApiError.forbidden(
      `User limit reached (${tenant.maxUsers}). Upgrade your plan or contact support.`,
    );
  }
}

export async function assertCanCreateWard(tenantId: string): Promise<void> {
  const [tenant, wardCount, subscription] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } }),
    prisma.ward.count({ where: { tenantId, isDeleted: false } }),
    prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: { select: { maxWards: true } } },
    }),
  ]);
  if (!tenant) throw ApiError.notFound("Tenant not found");
  const maxWards = subscription?.plan.maxWards ?? 10;
  if (wardCount >= maxWards) {
    throw ApiError.forbidden(
      `Ward limit reached (${maxWards}). Upgrade your plan or contact support.`,
    );
  }
}

export async function assertStorageQuota(
  tenantId: string,
  additionalBytes: number,
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { storageQuotaMB: true, storageUsedMB: true },
  });
  if (!tenant) throw ApiError.notFound("Tenant not found");
  const additionalMB = additionalBytes / (1024 * 1024);
  if (tenant.storageUsedMB + additionalMB > tenant.storageQuotaMB) {
    throw ApiError.forbidden(
      `Storage quota exceeded (${tenant.storageQuotaMB} MB). Free up space or upgrade your plan.`,
    );
  }
}

export async function trackStorageDelta(
  tenantId: string,
  deltaBytes: number,
): Promise<void> {
  const deltaMB = deltaBytes / (1024 * 1024);
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { storageUsedMB: { increment: deltaMB } },
  });
}

export async function getTenantUsage(tenantId: string) {
  const [tenant, userCount, wardCount, subscription] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { maxUsers: true, storageQuotaMB: true, storageUsedMB: true },
    }),
    prisma.user.count({ where: { tenantId } }),
    prisma.ward.count({ where: { tenantId, isDeleted: false } }),
    prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: { select: { name: true, maxWards: true } } },
    }),
  ]);

  return {
    users: { used: userCount, limit: tenant?.maxUsers ?? 0 },
    wards: {
      used: wardCount,
      limit: subscription?.plan.maxWards ?? 10,
    },
    storage: {
      usedMB: Math.round((tenant?.storageUsedMB ?? 0) * 100) / 100,
      limitMB: tenant?.storageQuotaMB ?? 0,
    },
    planName: subscription?.plan.name ?? null,
  };
}
