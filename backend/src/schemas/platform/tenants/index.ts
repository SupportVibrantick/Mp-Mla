import { z } from "zod";

// ─── Create Tenant ─────────────────────────────────────
export const createTenantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  constituencyName: z.string().min(2, "Constituency name is required"),
  state: z.string().min(2, "State is required"),
  district: z.string().min(2, "District is required"),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().email("Invalid email").nullable().optional()
  ),
  website: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url("Invalid URL").nullable().optional()
  ),
  logoUrl: z.string().optional().nullable(),
  faviconUrl: z.string().optional().nullable(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),

  representativeName: z.string().min(2, "Representative name is required"),
  representativeTitle: z.string().min(2, "Representative title is required"),
  representativePhoto: z.string().optional().nullable(),
  partyName: z.string().optional().nullable(),
  partyLogoUrl: z.string().optional().nullable(),
  termStartDate: z.string().optional().nullable(),
  termEndDate: z.string().optional().nullable(),

  // Constituency specific properties
  constituencyType: z.enum(["ASSEMBLY", "PARLIAMENTARY"]).optional().default("ASSEMBLY"),
  constituencyCode: z.string().optional().nullable(),

  // Admin user to create for this tenant
  adminEmail: z.string().email("Admin email is required"),
  adminPassword: z.string().min(6, "Admin password must be at least 6 characters"),
  adminName: z.string().min(2, "Admin name is required"),
  adminPhone: z.string().optional().nullable(),

  // Subscription plan
  planId: z.string().optional().nullable(),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]).optional(),
  trialDays: z.coerce.number().int().min(1).max(90).optional(),
});

// ─── Update Tenant ─────────────────────────────────────
export const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  constituencyName: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  district: z.string().min(2).optional(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().email("Invalid email").nullable().optional()
  ),
  website: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url("Invalid URL").nullable().optional()
  ),
  logoUrl: z.string().optional().nullable(),
  faviconUrl: z.string().optional().nullable(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),

  representativeName: z.string().min(2).optional(),
  representativeTitle: z.string().min(2).optional(),
  representativePhoto: z.string().optional().nullable(),
  partyName: z.string().optional().nullable(),
  partyLogoUrl: z.string().optional().nullable(),
  termStartDate: z.string().optional().nullable(),
  termEndDate: z.string().optional().nullable(),

  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]).optional(),
  constituencyType: z.enum(["ASSEMBLY", "PARLIAMENTARY"]).optional(),
  constituencyCode: z.string().optional().nullable(),
  planId: z.string().optional().nullable(),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]).optional(),
});

// ─── List Tenants Query ────────────────────────────────
export const listTenantsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  planId: z.string().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// ─── Create User for Tenant ───────────────────────────
export const createTenantUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  role: z.enum(["SYSTEM_ADMIN", "MLA_MP", "OFFICE_STAFF"]),
  designation: z.string().optional(),
  department: z.string().optional(),
});
