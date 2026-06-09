import prisma from "../lib/prisma.js";
import { getSetting, getSettingBoolean } from "../lib/settings.js";
import { sendEmail, buildMeetingEmailHtml } from "../lib/email.js";
import logger from "./logger.js";

async function checkMeetingRemindersForTenant(tenantId: string) {
  const enabled = await getSettingBoolean("meeting_reminder_enabled", tenantId);
  if (!enabled) return;

  const reminderHours =
    parseInt(await getSetting("meeting_reminder_hours", tenantId), 10) || 4;
  const orgEmail = await getSetting("org_email", tenantId);
  if (!orgEmail) return;

  const now = new Date();
  const futureLimit = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      tenantId,
      status: "SCHEDULED",
      isDeleted: false,
      reminderSent: false,
      date: { lte: futureLimit, gte: startOfToday },
    },
  });

  for (const meeting of upcomingMeetings) {
    let meetingStartTime = new Date(meeting.date);
    if (meeting.time) {
      const [hours, minutes] = meeting.time.split(":").map(Number);
      if (!isNaN(hours)) meetingStartTime.setHours(hours);
      if (!isNaN(minutes)) meetingStartTime.setMinutes(minutes);
    }

    const diffHours =
      (meetingStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours > 0 && diffHours <= reminderHours) {
      const html = buildMeetingEmailHtml({ meeting, action: "REMINDER" });
      const subject = `Reminder: ${meeting.title} - Upcoming Meeting`;
      await sendEmail(tenantId, orgEmail, subject, html);

      if (meeting.attendees) {
        const emails = meeting.attendees
          .split(/[,\s]+/)
          .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));
        for (const email of emails) {
          await sendEmail(tenantId, email.trim(), subject, html);
        }
      }

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { reminderSent: true },
      });
    } else if (diffHours <= 0) {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { reminderSent: true },
      });
    }
  }
}

export async function checkMeetingReminders() {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    for (const tenant of tenants) {
      await checkMeetingRemindersForTenant(tenant.id);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("checkMeetingReminders error:", message);
  }
}

export function startMeetingScheduler(intervalMs: number = 15 * 60 * 1000) {
  logger.info(
    `Starting meeting reminder scheduler (Interval: ${intervalMs / 60000} mins)`,
  );
  checkMeetingReminders();
  setInterval(checkMeetingReminders, intervalMs);
}
