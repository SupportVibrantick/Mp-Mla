import { z } from "zod";

// ─── Param Schemas ─────────────────────────────────────

export const idParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const tenantIdParamSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
});

export const moduleIdParamSchema = z.object({
  moduleId: z.string().min(1, "Module ID is required"),
});

export const tenantModuleParamSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  moduleId: z.string().min(1, "Module ID is required"),
});

// ─── Module Schemas ────────────────────────────────────

export const listModulesSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

export const createModuleSchema = z.object({
  code: z.string().min(2, "Module code is required"),
  name: z.string().min(2, "Module name is required"),
  description: z.string().optional(),
  category: z.string().optional().default("core"),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export const updateModuleSchema = createModuleSchema.partial();

// ─── Tenant Module Access Schemas ──────────────────────

export const listTenantModulesSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  isEnabled: z.enum(["true", "false"]).optional(),
});

export const grantModuleAccessSchema = z.object({
  moduleId: z.string().min(1, "Module ID is required"),
  isEnabled: z.boolean().optional().default(true),
});

export const updateModuleAccessSchema = z.object({
  isEnabled: z.boolean().optional(),
});

export const bulkGrantModulesSchema = z.object({
  moduleIds: z.array(z.string().min(1)).min(1, "At least one module ID is required"),
  isEnabled: z.boolean().optional().default(true),
});
