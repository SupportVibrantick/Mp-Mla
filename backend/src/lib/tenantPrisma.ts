import { AsyncLocalStorage } from "async_hooks";
import { PrismaClient } from "@prisma/client";

/**
 * Creates a tenant-scoped Prisma client extension.
 * This automatically injects `tenantId` into all queries for tenant-scoped models,
 * ensuring complete data isolation between tenants.
 */

// Models that have a tenantId field and should be automatically scoped
const tenantContextStorage = new AsyncLocalStorage<{ tenantId: string }>();

// Models that have a tenantId field and should be automatically scoped.
const TENANT_SCOPED_MODELS = [
  "user",
  "ward",
  "grievance",
  "project",
  "department",
  "leader",
  "institution",
  "institutionRequest",
  "communityGroup",
  "demographics",
  "fund",
  "meeting",
  "competitor",
  "task",
  "notification",
  "notificationTemplate",
  "auditLog",
  "tenantSetting",
  "dataActivity",
  "recycleBinEntry",
  "ownMetricEntry",
] as const;

type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

function isTenantScoped(model: string): model is TenantScopedModel {
  return TENANT_SCOPED_MODELS.includes(model as TenantScopedModel);
}

export function getCurrentTenantId(): string | undefined {
  return tenantContextStorage.getStore()?.tenantId;
}

export function runWithTenantContext<T>(tenantId: string, callback: () => T): T {
  return tenantContextStorage.run({ tenantId }, callback);
}

function applyTenantWhere(args: any, tenantId: string) {
  args.where = { ...args.where, tenantId };
}

function applyTenantData(args: any, tenantId: string) {
  if (!args.data) return;

  if (Array.isArray(args.data)) {
    args.data = args.data.map((item: any) => ({ ...item, tenantId }));
    return;
  }

  args.data = { ...args.data, tenantId };
}

function tenantScopedExtension(getTenantId: () => string | undefined) {
  return {
    query: {
      $allModels: {
        async findMany({ model, args, query }: any) {
          const tenantId = getTenantId();
          if (tenantId && isTenantScoped(model)) applyTenantWhere(args, tenantId);
          return query(args);
        },
        async findFirst({ model, args, query }: any) {
          const tenantId = getTenantId();
          if (tenantId && isTenantScoped(model)) applyTenantWhere(args, tenantId);
          return query(args);
        },
        async findUnique({ model, args, query }: any) {
          const tenantId = getTenantId();
          const result = await query(args);

          if (
            tenantId &&
            isTenantScoped(model) &&
            result &&
            result.tenantId !== tenantId
          ) {
            return null;
          }

          return result;
        },
        async create({ model, args, query }: any) {
          const tenantId = getTenantId();
          if (tenantId && isTenantScoped(model)) applyTenantData(args, tenantId);
          return query(args);
        },
        async createMany({ model, args, query }: any) {
          const tenantId = getTenantId();
          if (tenantId && isTenantScoped(model)) applyTenantData(args, tenantId);
          return query(args);
        },
        async update({ model, args, query }: any) {
          const tenantId = getTenantId();
          if (tenantId && isTenantScoped(model)) applyTenantWhere(args, tenantId);
          return query(args);
        },
        async updateMany({ model, args, query }: any) {
          const tenantId = getTenantId();
          if (tenantId && isTenantScoped(model)) applyTenantWhere(args, tenantId);
          return query(args);
        },
        async delete({ model, args, query }: any) {
          const tenantId = getTenantId();
          if (tenantId && isTenantScoped(model)) applyTenantWhere(args, tenantId);
          return query(args);
        },
        async deleteMany({ model, args, query }: any) {
          const tenantId = getTenantId();
          if (tenantId && isTenantScoped(model)) applyTenantWhere(args, tenantId);
          return query(args);
        },
        async count({ model, args, query }: any) {
          const tenantId = getTenantId();
          if (tenantId && isTenantScoped(model)) applyTenantWhere(args, tenantId);
          return query(args);
        },
        async aggregate({ model, args, query }: any) {
          const tenantId = getTenantId();
          if (tenantId && isTenantScoped(model)) applyTenantWhere(args, tenantId);
          return query(args);
        },
        async groupBy({ model, args, query }: any) {
          const tenantId = getTenantId();
          if (tenantId && isTenantScoped(model)) applyTenantWhere(args, tenantId);
          return query(args);
        },
      },
    },
  };
}

export function createTenantAwarePrisma(basePrisma: PrismaClient) {
  return basePrisma.$extends(tenantScopedExtension(getCurrentTenantId));
}

/**
 * Creates a Prisma client extension that automatically scopes all queries
 * to the given tenantId. This ensures data isolation at the ORM level.
 *
 * Usage:
 *   const scopedPrisma = createTenantPrisma(basePrisma, tenantId);
 *   // All queries on scoped models will automatically filter by tenantId
 *   const wards = await scopedPrisma.ward.findMany(); // auto-filtered
 */
export function createTenantPrisma(basePrisma: PrismaClient, tenantId: string) {
  return basePrisma.$extends(tenantScopedExtension(() => tenantId));
}

export type TenantPrismaClient = ReturnType<typeof createTenantPrisma>;
