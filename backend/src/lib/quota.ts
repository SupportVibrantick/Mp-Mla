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
  const [tenant, userCount, wardCount, voterCount, subscription] =
    await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true },
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
      usedMB: 0,
      limitMB: null,
    },
    planName: plan?.name ?? null,
  };
}
