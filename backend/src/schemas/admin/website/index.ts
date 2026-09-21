import { z } from "zod";

export const WEBSITE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export const PAGE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export const DOMAIN_TYPES = ["SUBDOMAIN", "CUSTOM"] as const;
export const SSL_STATUSES = [
  "PENDING",
  "PROVISIONING",
  "ACTIVE",
  "FAILED",
  "EXPIRED",
] as const;
export const DEPLOYMENT_STATUSES = [
  "PENDING",
  "SUCCESS",
  "ROLLED_BACK",
  "FAILED",
] as const;

// ══════════════════════════════════════════════════════════
// WEBSITE SCHEMAS
// ══════════════════════════════════════════════════════════

export const createWebsiteSchema = z.object({
  name: z.string().min(1, "Website name is required").max(100),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  templateId: z.string().optional().nullable(),
  faviconUrl: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  globalStyles: z.record(z.any()).optional().nullable(),
});

export const updateWebsiteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  status: z.enum(WEBSITE_STATUSES).optional(),
  templateId: z.string().optional().nullable(),
  faviconUrl: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  globalStyles: z.record(z.any()).optional().nullable(),
});

// ══════════════════════════════════════════════════════════
// PAGE SCHEMAS
// ══════════════════════════════════════════════════════════

export const createPageSchema = z.object({
  title: z.string().min(1, "Page title is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9\/-]+$/, "Slug can contain lowercase letters, numbers, hyphens, and slashes"),
  content: z.record(z.any()).default({ version: 1, sections: [] }),
  seoTitle: z.string().max(150).optional().nullable(),
  seoDescription: z.string().max(300).optional().nullable(),
  seoImageUrl: z.string().optional().nullable(),
  isHomePage: z.boolean().default(false),
  status: z.enum(PAGE_STATUSES).default("DRAFT"),
  order: z.number().int().default(0),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9\/-]+$/).optional(),
  content: z.record(z.any()).optional(),
  seoTitle: z.string().max(150).optional().nullable(),
  seoDescription: z.string().max(300).optional().nullable(),
  seoImageUrl: z.string().optional().nullable(),
  isHomePage: z.boolean().optional(),
  status: z.enum(PAGE_STATUSES).optional(),
  order: z.number().int().optional(),
});

// ══════════════════════════════════════════════════════════
// DOMAIN SCHEMAS
// ══════════════════════════════════════════════════════════

export const addDomainSchema = z.object({
  domain: z
    .string()
    .min(3, "Domain name is required")
    .max(255)
    .toLowerCase()
    .trim(),
  type: z.enum(DOMAIN_TYPES).default("CUSTOM"),
  isPrimary: z.boolean().default(false),
});

// ══════════════════════════════════════════════════════════
// PUBLISH / DEPLOYMENT SCHEMAS
// ══════════════════════════════════════════════════════════

export const publishWebsiteSchema = z.object({
  notes: z.string().max(500).optional(),
});

// ══════════════════════════════════════════════════════════
// MENU SCHEMAS
// ══════════════════════════════════════════════════════════

export const saveMenuSchema = z.object({
  name: z.string().min(1).max(50).default("main"),
  items: z.array(
    z.object({
      label: z.string().min(1),
      url: z.string().min(1),
      target: z.enum(["_self", "_blank"]).default("_self"),
      icon: z.string().optional().nullable(),
      children: z.array(z.any()).optional(),
    })
  ),
});

// ══════════════════════════════════════════════════════════
// FORM SCHEMAS
// ══════════════════════════════════════════════════════════

export const saveFormSchema = z.object({
  title: z.string().min(1).max(100),
  formType: z.enum([
    "GRIEVANCE",
    "CONTACT",
    "APPOINTMENT",
    "JANATA_DARBAR",
    "FEEDBACK",
    "VOLUNTEER",
    "CUSTOM",
  ]),
  fields: z.array(z.record(z.any())),
});
