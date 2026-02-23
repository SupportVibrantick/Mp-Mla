import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";
import { validate } from "../../../middleware/validate.js";
import catchAsync from "@/utils/catchAsync.js";

const router = Router();

// ════════════════════════════════════════════════════════
// DEFAULT SETTINGS DEFINITION (source of truth)
// ════════════════════════════════════════════════════════

const DEFAULT_SETTINGS: Record<
  string,
  {
    key: string;
    value: string;
    type: string;
    group: string;
    label: string;
    description: string;
    options?: string[];
    isSecret?: boolean;
    order: number;
  }
> = {};

const defs = [
  // ── General ───────────────────────────────────────
  {
    key: "org_name",
    value: "Constituency Management Portal",
    type: "text",
    group: "general",
    label: "Organization Name",
    description: "Display name of the portal",
    order: 1,
  },
  {
    key: "org_short_name",
    value: "CMP",
    type: "text",
    group: "general",
    label: "Short Name / Acronym",
    description: "Used in compact UI areas",
    order: 2,
  },
  {
    key: "constituency_name",
    value: "Chandni Chowk",
    type: "text",
    group: "general",
    label: "Constituency Name",
    description: "Name of the constituency",
    order: 3,
  },
  {
    key: "constituency_type",
    value: "Parliamentary",
    type: "select",
    group: "general",
    label: "Constituency Type",
    description: "Parliamentary or Assembly",
    options: ["Parliamentary", "Assembly", "Municipal"],
    order: 4,
  },
  {
    key: "state",
    value: "Delhi",
    type: "text",
    group: "general",
    label: "State",
    description: "State name",
    order: 5,
  },
  {
    key: "district",
    value: "Central Delhi",
    type: "text",
    group: "general",
    label: "District",
    description: "District name",
    order: 6,
  },
  {
    key: "representative_name",
    value: "Shri Example Singh",
    type: "text",
    group: "general",
    label: "Representative Name",
    description: "MP/MLA name",
    order: 7,
  },
  {
    key: "representative_title",
    value: "Member of Parliament",
    type: "select",
    group: "general",
    label: "Representative Title",
    description: "Designation",
    options: [
      "Member of Parliament",
      "Member of Legislative Assembly",
      "Municipal Councillor",
      "Mayor",
      "Sarpanch",
    ],
    order: 8,
  },
  {
    key: "org_address",
    value: "Constituency Office, Main Road",
    type: "textarea",
    group: "general",
    label: "Office Address",
    description: "Physical address",
    order: 9,
  },
  {
    key: "org_phone",
    value: "+91 11 1234 5678",
    type: "text",
    group: "general",
    label: "Office Phone",
    description: "Primary contact",
    order: 10,
  },
  {
    key: "org_email",
    value: "office@constituency.gov.in",
    type: "text",
    group: "general",
    label: "Office Email",
    description: "Primary email",
    order: 11,
  },
  {
    key: "org_website",
    value: "",
    type: "text",
    group: "general",
    label: "Website URL",
    description: "Official website",
    order: 12,
  },
  {
    key: "timezone",
    value: "Asia/Kolkata",
    type: "select",
    group: "general",
    label: "Timezone",
    description: "System timezone",
    options: ["Asia/Kolkata", "Asia/Colombo", "Asia/Dhaka", "Asia/Kathmandu"],
    order: 13,
  },
  {
    key: "default_language",
    value: "en",
    type: "select",
    group: "general",
    label: "Default Language",
    description: "UI language",
    options: ["en", "hi", "mr", "ta", "te", "bn", "gu", "kn", "ml", "pa", "ur"],
    order: 14,
  },
  {
    key: "financial_year_start",
    value: "April",
    type: "select",
    group: "general",
    label: "Financial Year Start",
    description: "FY start month",
    options: ["January", "April"],
    order: 15,
  },
  {
    key: "date_format",
    value: "dd/MM/yyyy",
    type: "select",
    group: "general",
    label: "Date Format",
    description: "Display format",
    options: ["dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "dd-MMM-yyyy"],
    order: 16,
  },
  {
    key: "currency_symbol",
    value: "₹",
    type: "text",
    group: "general",
    label: "Currency Symbol",
    description: "Currency display",
    order: 17,
  },

  // ── Branding ──────────────────────────────────────
  {
    key: "brand_primary_color",
    value: "#2563eb",
    type: "color",
    group: "branding",
    label: "Primary Color",
    description: "Main theme color",
    order: 1,
  },
  {
    key: "brand_secondary_color",
    value: "#7c3aed",
    type: "color",
    group: "branding",
    label: "Secondary Color",
    description: "Accent color",
    order: 2,
  },
  {
    key: "brand_success_color",
    value: "#16a34a",
    type: "color",
    group: "branding",
    label: "Success Color",
    description: "Success/positive",
    order: 3,
  },
  {
    key: "brand_warning_color",
    value: "#d97706",
    type: "color",
    group: "branding",
    label: "Warning Color",
    description: "Warning/caution",
    order: 4,
  },
  {
    key: "brand_danger_color",
    value: "#dc2626",
    type: "color",
    group: "branding",
    label: "Danger Color",
    description: "Error/destructive",
    order: 5,
  },
  {
    key: "brand_logo_url",
    value: "",
    type: "text",
    group: "branding",
    label: "Logo URL",
    description: "Organization logo (URL or emoji)",
    order: 6,
  },
  {
    key: "brand_favicon_emoji",
    value: "🏛️",
    type: "text",
    group: "branding",
    label: "Favicon Emoji",
    description: "Browser tab icon",
    order: 7,
  },
  {
    key: "brand_sidebar_style",
    value: "default",
    type: "select",
    group: "branding",
    label: "Sidebar Style",
    description: "Navigation style",
    options: ["default", "compact", "minimal"],
    order: 8,
  },
  {
    key: "brand_login_bg",
    value: "gradient",
    type: "select",
    group: "branding",
    label: "Login Page Background",
    description: "Login screen style",
    options: ["gradient", "solid", "image"],
    order: 9,
  },
  {
    key: "brand_footer_text",
    value: "Powered by Vibrantick Infotech Solutions",
    type: "text",
    group: "branding",
    label: "Footer Text",
    description: "Shown at bottom of pages",
    order: 10,
  },

  // ── Security ──────────────────────────────────────
  {
    key: "session_timeout_minutes",
    value: "30",
    type: "number",
    group: "security",
    label: "Session Timeout (minutes)",
    description: "Auto-logout after inactivity",
    order: 1,
  },
  {
    key: "max_failed_logins",
    value: "5",
    type: "number",
    group: "security",
    label: "Max Failed Login Attempts",
    description: "Lock account after N failures",
    order: 2,
  },
  {
    key: "lockout_duration_minutes",
    value: "15",
    type: "number",
    group: "security",
    label: "Lockout Duration (minutes)",
    description: "How long account stays locked",
    order: 3,
  },
  {
    key: "password_min_length",
    value: "8",
    type: "number",
    group: "security",
    label: "Min Password Length",
    description: "Minimum characters required",
    order: 4,
  },
  {
    key: "password_require_uppercase",
    value: "true",
    type: "boolean",
    group: "security",
    label: "Require Uppercase",
    description: "At least one uppercase letter",
    order: 5,
  },
  {
    key: "password_require_number",
    value: "true",
    type: "boolean",
    group: "security",
    label: "Require Number",
    description: "At least one digit",
    order: 6,
  },
  {
    key: "password_require_special",
    value: "true",
    type: "boolean",
    group: "security",
    label: "Require Special Character",
    description: "At least one special char",
    order: 7,
  },
  {
    key: "password_expiry_days",
    value: "90",
    type: "number",
    group: "security",
    label: "Password Expiry (days)",
    description: "Force change after N days (0=never)",
    order: 8,
  },
  {
    key: "enable_2fa",
    value: "false",
    type: "boolean",
    group: "security",
    label: "Enable Two-Factor Auth",
    description: "OTP-based login verification",
    order: 9,
  },
  {
    key: "allowed_ip_ranges",
    value: "",
    type: "textarea",
    group: "security",
    label: "Allowed IP Ranges",
    description: "Restrict access by IP (one per line, blank=all)",
    order: 10,
  },
  {
    key: "enable_audit_log",
    value: "true",
    type: "boolean",
    group: "security",
    label: "Enable Audit Logging",
    description: "Track all user actions",
    order: 11,
  },

  // ── Grievance ─────────────────────────────────────
  {
    key: "grievance_sla_days",
    value: "7",
    type: "number",
    group: "grievance",
    label: "Default SLA (days)",
    description: "Expected resolution time",
    order: 1,
  },
  {
    key: "grievance_auto_assign",
    value: "false",
    type: "boolean",
    group: "grievance",
    label: "Auto-Assign by Category",
    description: "Auto-assign to department",
    order: 2,
  },
  {
    key: "grievance_escalation_days",
    value: "3",
    type: "number",
    group: "grievance",
    label: "Auto Escalation (days)",
    description: "Escalate if not acted upon",
    order: 3,
  },
  {
    key: "grievance_allow_anonymous",
    value: "false",
    type: "boolean",
    group: "grievance",
    label: "Allow Anonymous Complaints",
    description: "Accept without citizen name",
    order: 4,
  },
  {
    key: "grievance_require_phone",
    value: "true",
    type: "boolean",
    group: "grievance",
    label: "Require Phone Number",
    description: "Mandatory phone for tracking",
    order: 5,
  },
  {
    key: "grievance_ticket_prefix",
    value: "GRV",
    type: "text",
    group: "grievance",
    label: "Ticket Number Prefix",
    description: "e.g. GRV-2025-00001",
    order: 6,
  },
  {
    key: "grievance_categories",
    value:
      "Water Supply,Road Damage,Electricity,Sanitation,Drainage,Street Light,Health,Education,Law & Order,Encroachment,Noise,Other",
    type: "textarea",
    group: "grievance",
    label: "Grievance Categories",
    description: "Comma-separated list",
    order: 7,
  },
  {
    key: "grievance_sources",
    value: "WALK_IN,PHONE,EMAIL,WHATSAPP,SOCIAL_MEDIA,CAMP,REFERRAL,ONLINE",
    type: "textarea",
    group: "grievance",
    label: "Grievance Sources",
    description: "Comma-separated intake channels",
    order: 8,
  },

  // ── Notifications ─────────────────────────────────
  {
    key: "sms_enabled",
    value: "false",
    type: "boolean",
    group: "notifications",
    label: "SMS Enabled",
    description: "Send SMS notifications",
    order: 1,
  },
  {
    key: "sms_provider",
    value: "twilio",
    type: "select",
    group: "notifications",
    label: "SMS Provider",
    description: "Gateway provider",
    options: ["twilio", "msg91", "textlocal", "fast2sms", "custom"],
    order: 2,
  },
  {
    key: "sms_api_key",
    value: "",
    type: "secret",
    group: "notifications",
    label: "SMS API Key",
    description: "Provider API key",
    isSecret: true,
    order: 3,
  },
  {
    key: "sms_sender_id",
    value: "CONSTY",
    type: "text",
    group: "notifications",
    label: "SMS Sender ID",
    description: "6-char sender ID",
    order: 4,
  },
  {
    key: "whatsapp_enabled",
    value: "false",
    type: "boolean",
    group: "notifications",
    label: "WhatsApp Enabled",
    description: "Send WhatsApp messages",
    order: 5,
  },
  {
    key: "whatsapp_api_key",
    value: "",
    type: "secret",
    group: "notifications",
    label: "WhatsApp API Key",
    description: "WhatsApp Business API key",
    isSecret: true,
    order: 6,
  },
  {
    key: "email_enabled",
    value: "false",
    type: "boolean",
    group: "notifications",
    label: "Email Enabled",
    description: "Send email notifications",
    order: 7,
  },
  {
    key: "email_from",
    value: "noreply@constituency.gov.in",
    type: "text",
    group: "notifications",
    label: "From Email",
    description: "Sender email address",
    order: 8,
  },
  {
    key: "smtp_host",
    value: "",
    type: "text",
    group: "notifications",
    label: "SMTP Host",
    description: "Mail server host",
    order: 9,
  },
  {
    key: "smtp_port",
    value: "587",
    type: "number",
    group: "notifications",
    label: "SMTP Port",
    description: "Mail server port",
    order: 10,
  },
  {
    key: "smtp_user",
    value: "",
    type: "text",
    group: "notifications",
    label: "SMTP Username",
    description: "Mail server login",
    order: 11,
  },
  {
    key: "smtp_password",
    value: "",
    type: "secret",
    group: "notifications",
    label: "SMTP Password",
    description: "Mail server password",
    isSecret: true,
    order: 12,
  },
  {
    key: "notify_on_grievance_create",
    value: "true",
    type: "boolean",
    group: "notifications",
    label: "Notify on Grievance Filed",
    description: "Send confirmation to citizen",
    order: 13,
  },
  {
    key: "notify_on_grievance_resolve",
    value: "true",
    type: "boolean",
    group: "notifications",
    label: "Notify on Grievance Resolved",
    description: "Send resolution notice",
    order: 14,
  },
  {
    key: "notify_birthday_reminder",
    value: "true",
    type: "boolean",
    group: "notifications",
    label: "Birthday Reminders",
    description: "Daily leader birthday alerts",
    order: 15,
  },

  // ── Backup ────────────────────────────────────────
  {
    key: "backup_enabled",
    value: "false",
    type: "boolean",
    group: "backup",
    label: "Auto Backup",
    description: "Enable scheduled backups",
    order: 1,
  },
  {
    key: "backup_frequency",
    value: "daily",
    type: "select",
    group: "backup",
    label: "Backup Frequency",
    description: "How often to backup",
    options: ["hourly", "daily", "weekly", "monthly"],
    order: 2,
  },
  {
    key: "backup_time",
    value: "02:00",
    type: "text",
    group: "backup",
    label: "Backup Time",
    description: "Scheduled time (24h)",
    order: 3,
  },
  {
    key: "backup_retention_days",
    value: "30",
    type: "number",
    group: "backup",
    label: "Retention (days)",
    description: "Keep backups for N days",
    order: 4,
  },
  {
    key: "backup_storage",
    value: "local",
    type: "select",
    group: "backup",
    label: "Storage Location",
    description: "Where to store backups",
    options: ["local", "s3", "gcs", "azure"],
    order: 5,
  },
];

defs.forEach((d) => {
  DEFAULT_SETTINGS[d.key] = d;
});

// ════════════════════════════════════════════════════════
// GET ALL SETTINGS (grouped)
// ════════════════════════════════════════════════════════

router.get(
  "/",
  requirePermission("settings", "read"),
  catchAsync(async (_req, res) => {
    const dbSettings = await prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    });
    const dbMap = new Map(dbSettings.map((s) => [s.key, s]));

    // Merge defaults with DB values
    const grouped: Record<string, any[]> = {};

    for (const def of defs) {
      if (!grouped[def.group]) grouped[def.group] = [];
      const dbVal = dbMap.get(def.key);
      grouped[def.group].push({
        key: def.key,
        value: dbVal?.value ?? def.value,
        type: def.type,
        group: def.group,
        label: def.label,
        description: def.description,
        options: def.options || null,
        isSecret: def.isSecret || false,
        order: def.order,
        updatedAt: dbVal?.updatedAt || null,
      });
    }

    // Sort each group by order
    for (const g of Object.keys(grouped)) {
      grouped[g].sort((a: any, b: any) => a.order - b.order);
    }

    // Mask secrets
    for (const g of Object.values(grouped)) {
      for (const s of g) {
        if (s.isSecret && s.value) {
          s.value = s.value.slice(0, 4) + "••••••••";
          s.masked = true;
        }
      }
    }

    res.json({ success: true, data: grouped });
  }),
);

// ════════════════════════════════════════════════════════
// GET SINGLE SETTING
// ════════════════════════════════════════════════════════

router.get(
  "/:key",
  requirePermission("settings", "read"),
  catchAsync(async (req, res) => {
    const key = Array.isArray(req.params.key)
      ? req.params.key[0]
      : req.params.key;
    const setting = await prisma.systemSetting.findUnique({
      where: { key: key },
    });
    const def = DEFAULT_SETTINGS[key];
    if (!setting && !def) throw ApiError.notFound("Setting not found");

    res.json({
      success: true,
      data: {
        ...(def || {}),
        key,
        value: setting?.value ?? def?.value ?? "",
      },
    });
  }),
);

// ════════════════════════════════════════════════════════
// UPDATE SETTINGS (bulk by group)
// ════════════════════════════════════════════════════════

const updateSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string(),
    }),
  ),
});

router.put(
  "/",
  requirePermission("settings", "update"),
  validate(updateSchema),
  catchAsync(async (req, res) => {
    const { settings: updates } = req.body;
    const changed: any[] = [];

    for (const { key, value } of updates) {
      const def = DEFAULT_SETTINGS[key];
      if (!def) continue; // Skip unknown keys

      // Don't update if masked secret unchanged
      if (def.isSecret && value.includes("••••")) continue;

      const old = await prisma.systemSetting.findUnique({ where: { key } });
      const oldValue = old?.value ?? def.value;

      if (oldValue === value) continue; // No change

      await prisma.systemSetting.upsert({
        where: { key },
        update: {
          value,
          group: def.group,
          description: def.description,
          type: def.type,
        },
        create: {
          key,
          value,
          group: def.group,
          description: def.description,
          type: def.type,
        },
      });

      changed.push({
        key,
        old: def.isSecret ? "***" : oldValue,
        new: def.isSecret ? "***" : value,
      });
    }

    if (changed.length > 0) {
      await createAuditLog({
        userId: req.user!.id,
        action: "UPDATE",
        module: "settings",
        description: `Updated ${changed.length} setting(s): ${changed.map((c) => c.key).join(", ")}`,
        oldData: Object.fromEntries(changed.map((c) => [c.key, c.old])),
        newData: Object.fromEntries(changed.map((c) => [c.key, c.new])),
        ...getRequestMeta(req),
      });
    }

    res.json({
      success: true,
      message:
        changed.length > 0
          ? `${changed.length} setting(s) updated`
          : "No changes",
      data: { changed: changed.length, keys: changed.map((c) => c.key) },
    });
  }),
);

// ════════════════════════════════════════════════════════
// RESET GROUP TO DEFAULTS
// ════════════════════════════════════════════════════════

router.post(
  "/reset/:group",
  requirePermission("settings", "update"),
  catchAsync(async (req, res) => {
    const { group } = req.params;
    const groupDefs = defs.filter((d) => d.group === group);
    if (groupDefs.length === 0) throw ApiError.notFound("Group not found");

    for (const def of groupDefs) {
      await prisma.systemSetting.upsert({
        where: { key: def.key },
        update: { value: def.value },
        create: {
          key: def.key,
          value: def.value,
          group: def.group,
          description: def.description,
          type: def.type,
        },
      });
    }

    await createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "settings",
      description: `Reset "${group}" settings to defaults`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `"${group}" settings reset to defaults`,
    });
  }),
);

// ════════════════════════════════════════════════════════
// PUBLIC SETTINGS (for login page, no auth needed)
// ════════════════════════════════════════════════════════

router.get(
  "/public/branding",
  catchAsync(async (_req, res) => {
    const publicKeys = [
      "org_name",
      "org_short_name",
      "constituency_name",
      "representative_name",
      "representative_title",
      "brand_primary_color",
      "brand_secondary_color",
      "brand_logo_url",
      "brand_favicon_emoji",
      "brand_login_bg",
      "brand_footer_text",
    ];

    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: publicKeys } },
    });
    const data: Record<string, string> = {};
    publicKeys.forEach((k) => {
      const s = settings.find((x) => x.key === k);
      data[k] = s?.value ?? DEFAULT_SETTINGS[k]?.value ?? "";
    });

    res.json({ success: true, data });
  }),
);

export default router;
