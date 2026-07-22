import { z } from "zod";

const billingCycleSchema = z.enum([
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "YEARLY",
]);

const subscriptionStatusSchema = z.enum([
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "CANCELLED",
  "EXPIRED",
]);

export const idParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const tenantIdParamSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
});

export const listPlansSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

export const createPlanSchema = z.object({
  name: z.string().min(2, "Plan name is required"),
  code: z.string().min(2, "Plan code is required"),
  description: z.string().optional(),
  priceMonthly: z.coerce.number().min(0).default(0),
  priceYearly: z.coerce.number().min(0).default(0),
  maxUsers: z.coerce.number().int().min(1).default(5),
  maxWards: z.coerce.number().int().min(1).default(10),
  storageMB: z.coerce.number().int().min(100).default(1024),
  features: z.any().optional().default([]),
  isActive: z.boolean().optional().default(true),
  isPopular: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().optional().default(0),
  moduleIds: z.array(z.string()).optional(),
});

export const updatePlanSchema = createPlanSchema.partial();

export const listTenantSubscriptionsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  planId: z.string().optional(),
  tenantId: z.string().optional(),
  status: subscriptionStatusSchema.optional(),
});

export const listInvoicesSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]).optional(),
  search: z.string().optional(),
});

export const upsertTenantSubscriptionSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  billingCycle: billingCycleSchema.default("MONTHLY"),
  status: subscriptionStatusSchema.optional(),
  trialEndsAt: z.string().optional(),
  nextPaymentDue: z.string().optional(),
  amountDue: z.coerce.number().min(0).optional(),
  syncTenantLimits: z.boolean().optional().default(true),
});

export const upgradeTenantSubscriptionSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  billingCycle: billingCycleSchema.optional(),
  prorateImmediately: z.boolean().optional().default(false),
  syncTenantLimits: z.boolean().optional().default(true),
});

export const updateTenantSubscriptionStatusSchema = z.object({
  status: subscriptionStatusSchema,
});

export const listRenewalsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});

export const listPlanUpgradeRequestsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z
    .enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"])
    .optional(),
});

export const reviewPlanUpgradeRequestSchema = z.object({
  adminNote: z.string().max(1000).optional(),
  prorateImmediately: z.boolean().optional().default(true),
  syncTenantLimits: z.boolean().optional().default(true),
});

