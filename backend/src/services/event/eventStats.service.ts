import prisma from "../../lib/prisma.js";

export async function getEventStats(tenantId: string) {
  const w = { tenantId, isDeleted: false };
  const now = new Date();

  const [
    total,
    byStatus,
    byType,
    upcoming,
    byWard,
    byOrganizer,
    tasksCount,
  ] = await Promise.all([
    prisma.event.count({ where: w }),
    prisma.event.groupBy({ by: ["status"], where: w, _count: true }),
    prisma.event.groupBy({ by: ["type"], where: w, _count: true }),
    prisma.event.count({ where: { ...w, startDate: { gte: now } } }),
    prisma.event.groupBy({
      by: ["wardId"],
      where: { ...w, wardId: { not: null } },
      _count: true,
    }),
    prisma.event.groupBy({
      by: ["organizerId"],
      where: { ...w, organizerId: { not: null } },
      _count: true,
    }),
    prisma.task.count({
      where: { tenantId, eventId: { not: null }, isDeleted: false },
    }),
  ]);

  const sm = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
  const tm = Object.fromEntries(byType.map((t) => [t.type, t._count]));

  // Get Ward details
  const wardIds = byWard.map((wd) => wd.wardId as string);
  const wards = await prisma.ward.findMany({
    where: { tenantId, id: { in: wardIds } },
    select: { id: true, name: true, wardNumber: true },
  });
  const wardMap = Object.fromEntries(wards.map((wd) => [wd.id, wd]));

  const wardStats = byWard.map((wd) => {
    const wdInfo = wardMap[wd.wardId as string];
    return {
      wardId: wd.wardId,
      wardName: wdInfo ? `${wdInfo.name} (Ward ${wdInfo.wardNumber})` : "Unknown Ward",
      count: wd._count,
    };
  });

  // Get Organizer details
  const organizerIds = byOrganizer.map((org) => org.organizerId as string);
  const organizers = await prisma.user.findMany({
    where: { tenantId, id: { in: organizerIds } },
    select: { id: true, name: true },
  });
  const organizerMap = Object.fromEntries(organizers.map((org) => [org.id, org.name]));

  const organizerStats = byOrganizer.map((org) => ({
    organizerId: org.organizerId,
    organizerName: organizerMap[org.organizerId as string] || "Unknown Organizer",
    count: org._count,
  }));

  return {
    total,
    draft: sm["DRAFT"] || 0,
    scheduled: sm["SCHEDULED"] || 0,
    ongoing: sm["ONGOING"] || 0,
    completed: sm["COMPLETED"] || 0,
    cancelled: sm["CANCELLED"] || 0,
    postponed: sm["POSTPONED"] || 0,
    upcoming,
    byType: tm,
    byWard: wardStats,
    byOrganizer: organizerStats,
    followUpTasksCount: tasksCount,
  };
}
