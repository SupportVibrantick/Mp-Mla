export const PLATFORM_SETTING_DEFS = [
  {
    key: "platform_name",
    value: "MP-MLA Platform",
    type: "text",
    group: "general",
    description: "Platform operator name",
  },
  {
    key: "support_email",
    value: "support@admin.mpmla.in",
    type: "text",
    group: "general",
    description: "Support email shown to tenants",
  },
  {
    key: "default_trial_days",
    value: "14",
    type: "number",
    group: "billing",
    description: "Default trial period for new tenants",
  },
  {
    key: "allow_tenant_creation",
    value: "true",
    type: "boolean",
    group: "general",
    description: "Allow operators to create new tenants",
  },
  {
    key: "renewal_reminder_days",
    value: "7",
    type: "number",
    group: "billing",
    description: "Days before renewal to send reminder",
  },
];
