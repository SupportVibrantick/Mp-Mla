import prisma from "./prisma.js";
import { ApiError } from "../utils/ApiError.js";

export async function assertCanCreateUser(tenantId: string): Promise<void> {
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });

  if (subscription?.plan && subscription.plan.maxUsers > 0) {
    const userCount = await prisma.user.count({ where: { tenantId } });
    if (userCount >= subscription.plan.maxUsers) {
      throw ApiError.forbidden(
        `User limit reached (${userCount}/${subscription.plan.maxUsers}) for your subscription plan (${subscription.plan.name}). Please upgrade your plan to create more users.`,
      );
    }
  }
}

export async function assertCanCreateVoters(
  tenantId: string,
  additionalCount: number = 1,
): Promise<void> {
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });

  if (subscription?.plan && subscription.plan.maxVoters > 0) {
    const voterCount = await prisma.voter.count({ where: { tenantId } });
    if (voterCount + additionalCount > subscription.plan.maxVoters) {
      throw ApiError.forbidden(
        `Voter quota limit exceeded. Current voters: ${voterCount}, attempting to add: ${additionalCount}, plan limit: ${subscription.plan.maxVoters} (${subscription.plan.name} plan). Please upgrade your subscription plan.`,
      );
    }
  }
}

export async function assertCanCreateWard(_tenantId: string): Promise<void> {
  // Unlimited wards
  return;
}

export async function assertStorageQuota(
  tenantId: string,
  additionalBytes: number,
): Promise<void> {
  const [subscription, tenant] = await Promise.all([
    prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { storageUsedMB: true, name: true },
    }),
  ]);

  if (subscription?.plan && subscription.plan.storageLimitMB > 0) {
    const additionalMB = additionalBytes / (1024 * 1024);
    const currentUsedMB = tenant?.storageUsedMB ?? 0;
    const projectedMB = currentUsedMB + additionalMB;

    if (projectedMB > subscription.plan.storageLimitMB) {
      throw new ApiError(
        413,
        `Storage quota limit exceeded (${currentUsedMB.toFixed(2)} MB / ${subscription.plan.storageLimitMB} MB used). Uploading ${additionalMB.toFixed(2)} MB would exceed your ${subscription.plan.name} plan limit. Please upgrade your subscription plan to upload more files.`,
      );
    }
  }
}

export async function trackStorageDelta(
  tenantId: string,
  deltaBytes: number,
): Promise<void> {
  if (!tenantId || deltaBytes === 0) return;
  const deltaMB = deltaBytes / (1024 * 1024);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      storageUsedMB: {
        increment: deltaMB,
      },
    },
  });
}

export async function trackStorageRelease(
  tenantId: string,
  amount: number,
  isBytes: boolean = true,
): Promise<void> {
  if (!tenantId || amount <= 0) return;
  const releaseMB = isBytes ? amount / (1024 * 1024) : amount;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { storageUsedMB: true },
  });

  if (tenant) {
    const newUsedMB = Math.max(0, (tenant.storageUsedMB ?? 0) - releaseMB);
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { storageUsedMB: newUsedMB },
    });
  }
}

export async function getTenantUsage(tenantId: string) {
  const [tenant, userCount, wardCount, voterCount, subscription] =
    await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, storageUsedMB: true },
      }),
      prisma.user.count({ where: { tenantId } }),
      prisma.ward.count({ where: { tenantId, isDeleted: false } }),
      prisma.voter.count({ where: { tenantId } }),
      prisma.tenantSubscription.findUnique({
        where: { tenantId },
        include: { plan: true },
      }),
    ]);

  const plan = subscription?.plan;

  return {
    users: {
      used: userCount,
      limit: plan?.maxUsers && plan.maxUsers > 0 ? plan.maxUsers : null,
    },
    voters: {
      used: voterCount,
      limit: plan?.maxVoters && plan.maxVoters > 0 ? plan.maxVoters : null,
    },
    wards: {
      used: wardCount,
      limit: null,
    },
    storage: {
      usedMB: Math.round((tenant?.storageUsedMB ?? 0) * 100) / 100,
      limitMB: plan?.storageLimitMB && plan.storageLimitMB > 0 ? plan.storageLimitMB : null,
    },
    planName: plan?.name ?? null,
  };
}
