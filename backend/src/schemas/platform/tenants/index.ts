import { z } from "zod";

// ─── Create Tenant ─────────────────────────────────────
export const createTenantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  constituencyName: z.string().min(2, "Constituency name is required"),
  state: z.string().min(2, "State is required"),
  district: z.string().min(2, "District is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),

  representativeName: z.string().min(2, "Representative name is required"),
  representativeTitle: z.string().min(2, "Representative title is required"),
  representativePhoto: z.string().optional(),
  partyName: z.string().optional(),
  partyLogoUrl: z.string().optional(),
  termStartDate: z.string().optional(),
  termEndDate: z.string().optional(),

  // Constituency specific properties
  constituencyType: z.enum(["ASSEMBLY", "PARLIAMENTARY"]).optional().default("ASSEMBLY"),
  constituencyCode: z.string().optional(),

  // Admin user to create for this tenant
  adminEmail: z.string().email("Admin email is required"),
  adminPassword: z.string().min(6, "Admin password must be at least 6 characters"),
  adminName: z.string().min(2, "Admin name is required"),
  adminPhone: z.string().optional(),

  // Subscription plan
  planId: z.string().optional(),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]).optional(),
  trialDays: z.coerce.number().int().min(1).max(90).optional(),
});

// ─── Update Tenant ─────────────────────────────────────
export const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  constituencyName: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  district: z.string().min(2).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),

  representativeName: z.string().min(2).optional(),
  representativeTitle: z.string().min(2).optional(),
  representativePhoto: z.string().optional(),
  partyName: z.string().optional(),
  partyLogoUrl: z.string().optional(),
  termStartDate: z.string().optional(),
  termEndDate: z.string().optional(),

  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]).optional(),
  constituencyType: z.enum(["ASSEMBLY", "PARLIAMENTARY"]).optional(),
  constituencyCode: z.string().optional(),
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
