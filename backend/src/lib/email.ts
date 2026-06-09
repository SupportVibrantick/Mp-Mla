import nodemailer from "nodemailer";
import { getSetting, getSettingBoolean } from "./settings.js";
import logger from "../utils/logger.js";

async function createTransport(tenantId: string) {
  const host = await getSetting("smtp_host", tenantId);
  const port = parseInt(await getSetting("smtp_port", tenantId), 10) || 587;
  const user = await getSetting("smtp_user", tenantId);
  const pass = await getSetting("smtp_password", tenantId);

  if (!host || !user) {
    logger.warn("createTransport: Missing SMTP host or user", {
      host,
      user: user ? "***" : undefined,
    });
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(
  tenantId: string,
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  try {
    const enabled = await getSettingBoolean("email_enabled", tenantId);
    if (!enabled) {
      logger.debug("Email disabled via settings, skipping send");
      return false;
    }

    const transport = await createTransport(tenantId);
    if (!transport) {
      logger.warn("SMTP not configured, skipping email");
      return false;
    }

    const emailFrom = await getSetting("email_from", tenantId);
    const smtpUser = await getSetting("smtp_user", tenantId);
    const from = emailFrom || smtpUser;
    if (!from) {
      logger.warn("sendEmail: No from address configured");
      return false;
    }

    await transport.sendMail({ from, to, subject, html });
    logger.info(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Email send failed: ${message}`);
    return false;
  }
}

export async function sendAdminNotification(
  tenantId: string,
  subject: string,
  html: string,
): Promise<void> {
  try {
    const notifyEnabled = await getSettingBoolean(
      "notify_on_export_import",
      tenantId,
    );
    if (!notifyEnabled) return;

    const adminEmail = await getSetting("org_email", tenantId);
    if (!adminEmail) {
      logger.warn("No org_email configured, skipping admin notification");
      return;
    }

    sendEmail(tenantId, adminEmail, subject, html).catch((err) =>
      logger.error(`Admin notification failed: ${err.message}`),
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Admin notification check failed: ${message}`);
  }
}

export async function testSmtpConnection(
  tenantId: string,
  to: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = await createTransport(tenantId);
    if (!transport) {
      return {
        success: false,
        error:
          "SMTP settings (host, user, pass) are incomplete. Please check your settings.",
      };
    }

    try {
      await transport.verify();
    } catch (verifyError: unknown) {
      const message =
        verifyError instanceof Error ? verifyError.message : String(verifyError);
      return { success: false, error: `SMTP Connection failed: ${message}` };
    }

    const emailFrom = await getSetting("email_from", tenantId);
    const smtpUser = await getSetting("smtp_user", tenantId);
    const from = emailFrom || smtpUser || "noreply@example.com";

    await transport.sendMail({
      from,
      to,
      subject: "Constituency Management Portal: SMTP Test",
      html: `<div style="font-family: sans-serif; padding: 20px;">
        <h2>SMTP Configuration Successful</h2>
        <p>Your email settings are correctly configured.</p>
      </div>`,
    });

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to send email: ${message}` };
  }
}

export function buildActivityEmailHtml({
  action,
  module,
  userName,
  recordCount,
  timestamp,
}: {
  action: "EXPORT" | "IMPORT";
  module: string;
  userName: string;
  recordCount: number;
  timestamp: Date;
}): string {
  const actionLabel = action === "EXPORT" ? "exported" : "imported";
  const actionColor = action === "EXPORT" ? "#3b82f6" : "#22c55e";

  return `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <h2>Data ${action} Notification</h2>
      <p>User <strong>${userName}</strong> has ${actionLabel} ${recordCount} record(s) from ${module}.</p>
      <p>Time: ${timestamp.toLocaleString("en-IN")}</p>
    </div>
  `;
}

export function buildMeetingEmailHtml({
  meeting,
  action,
}: {
  meeting: Record<string, unknown>;
  action: "CREATED" | "UPDATED" | "CANCELLED" | "REMINDER";
}): string {
  const title = String(meeting.title ?? "Meeting");
  const dateStr = meeting.date
    ? new Date(meeting.date as string).toLocaleDateString("en-IN")
    : "";
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h1>${title}</h1>
      <p>Action: ${action}</p>
      <p>Date: ${dateStr} ${meeting.time ? `at ${meeting.time}` : ""}</p>
      ${meeting.description ? `<p>${meeting.description}</p>` : ""}
    </div>
  `;
}

export function buildInstitutionRequestEmailHtml({
  request,
  orgName,
}: {
  request: Record<string, unknown>;
  orgName: string;
}): string {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h1>New Registration: ${request.name}</h1>
      <p>Category: ${request.category}</p>
      <a href="${frontendUrl}/institutions/requests">Review Request</a>
      <p>From ${orgName}</p>
    </div>
  `;
}
