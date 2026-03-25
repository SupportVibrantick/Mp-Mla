import prisma from "../lib/prisma.js";
import { getSetting, getSettingBoolean } from "../lib/settings.js";
import { sendEmail, buildMeetingEmailHtml } from "../lib/email.js";
import logger from "./logger.js";

/**
 * Checks for upcoming meetings and sends reminder emails.
 * This is designed to be called periodically (e.g., every 15-30 minutes).
 */
export async function checkMeetingReminders() {
    try {
        const enabled = await getSettingBoolean("meeting_reminder_enabled");
        if (!enabled) return;

        const reminderHours = parseInt(await getSetting("meeting_reminder_hours"), 10) || 4;
        const orgEmail = await getSetting("org_email");
        
        if (!orgEmail) {
            logger.warn("checkMeetingReminders: No org_email configured, skipping reminders");
            return;
        }

        // Current time
        const now = new Date();
        const futureLimit = new Date(now.getTime() + (reminderHours * 60 * 60 * 1000));
        
        // Start of today (to make sure we catch meetings today that might have date set to 00:00:00)
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        // Find meetings that are:
        // 1. Scheduled
        // 2. Not deleted
        // 3. Reminder not yet sent
        // 4. Starting today or later (broad filter)
        const upcomingMeetings = await prisma.meeting.findMany({
            where: {
                status: "SCHEDULED",
                isDeleted: false,
                reminderSent: false,
                date: {
                    lte: futureLimit,
                    gte: startOfToday
                }
            }
        });

        if (upcomingMeetings.length === 0) return;

        logger.info(`Found ${upcomingMeetings.length} meetings requiring reminders.`);

        for (const meeting of upcomingMeetings) {
            // Check specific time if it exists
            // Since meeting.date is a DateTime with time 00:00:00 in many cases,
            // we should ideally combine it with the 'time' string if available.
            let meetingStartTime = new Date(meeting.date);
            
            if (meeting.time) {
                const [hours, minutes] = meeting.time.split(':').map(Number);
                if (!isNaN(hours)) meetingStartTime.setHours(hours);
                if (!isNaN(minutes)) meetingStartTime.setMinutes(minutes);
            }

            // Re-verify if it's within the window now that we have the exact time
            const diffMs = meetingStartTime.getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours > 0 && diffHours <= reminderHours) {
                logger.info(`Sending reminder for meeting: ${meeting.title}`);
                
                const html = buildMeetingEmailHtml({ 
                    meeting, 
                    action: "REMINDER" as any 
                });

                const subject = `Reminder: ${meeting.title} - Upcoming Meeting`;

                // 1. Notify Org Email
                await sendEmail(orgEmail, subject, html);

                // 2. Notify Attendees if they look like emails
                if (meeting.attendees) {
                    const emails = meeting.attendees.split(/[,\s]+/).filter(e => 
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
                    );
                    
                    for (const email of emails) {
                        await sendEmail(email.trim(), subject, html);
                    }
                }

                await prisma.meeting.update({
                    where: { id: meeting.id },
                    data: { reminderSent: true }
                });
            } else if (diffHours <= 0) {
                // Meeting already started or passed, mark as sent to avoid repeated checks
                await prisma.meeting.update({
                    where: { id: meeting.id },
                    data: { reminderSent: true }
                });
            }
        }
    } catch (error: any) {
        logger.error("checkMeetingReminders error:", error);
    }
}

/**
 * Starts the meeting reminder scheduler.
 */
export function startMeetingScheduler(intervalMs: number = 15 * 60 * 1000) {
    logger.info(`Starting meeting reminder scheduler (Interval: ${intervalMs / 60000} mins)`);
    
    // Run immediately on start
    checkMeetingReminders();
    
    // Then run at interval
    setInterval(checkMeetingReminders, intervalMs);
}
