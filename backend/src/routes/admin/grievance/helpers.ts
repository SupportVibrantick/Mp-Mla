import prisma from "../../../lib/prisma.js";

export async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `GRV-${year}-`;

  const last = await prisma.grievance.findFirst({
    where: { ticketNumber: { startsWith: prefix } },
    orderBy: { ticketNumber: "desc" },
    select: { ticketNumber: true },
  });

  let next = 1;
  if (last) {
    const num = parseInt(last.ticketNumber.split("-")[2], 10);
    if (!isNaN(num)) next = num + 1;
  }

  return `${prefix}${String(next).padStart(5, "0")}`;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["IN_PROGRESS", "ESCALATED", "REJECTED", "CLOSED"],
  IN_PROGRESS: ["ESCALATED", "RESOLVED", "OPEN"],
  ESCALATED: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  REJECTED: ["OPEN"],
  CLOSED: ["OPEN"],
};

export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getTransitionLabel(from: string, to: string): string {
  const labels: Record<string, string> = {
    "OPEN→IN_PROGRESS": "Started working on grievance",
    "OPEN→ESCALATED": "Escalated to higher authority",
    "OPEN→REJECTED": "Grievance rejected",
    "OPEN→CLOSED": "Directly closed",
    "IN_PROGRESS→RESOLVED": "Grievance resolved",
    "IN_PROGRESS→ESCALATED": "Escalated from in-progress",
    "IN_PROGRESS→OPEN": "Sent back to open",
    "ESCALATED→IN_PROGRESS": "De-escalated, work resumed",
    "ESCALATED→RESOLVED": "Resolved after escalation",
    "RESOLVED→CLOSED": "Closed after resolution",
    "RESOLVED→IN_PROGRESS": "Reopened from resolved",
    "REJECTED→OPEN": "Reopened from rejection",
    "CLOSED→OPEN": "Reopened from closed",
  };
  return labels[`${from}→${to}`] || `${from} → ${to}`;
}

export const PRIORITY_SLA_DAYS: Record<string, number> = {
  URGENT: 1,
  HIGH: 3,
  MEDIUM: 7,
  LOW: 15,
};

export function calculateExpectedDate(priority: string): Date {
  const days = PRIORITY_SLA_DAYS[priority] || 7;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
