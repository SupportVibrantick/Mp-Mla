import prisma from "../../lib/prisma.js";

interface TaskStatsOptions {
  departmentId?: string;
  assignedToId?: string;
  projectId?: string;
  grievanceId?: string;
}

export async function getTaskStats(tenantId: string, options: TaskStatsOptions) {
  const { departmentId, assignedToId, projectId, grievanceId } = options;

  const w: any = { tenantId, isDeleted: false };
  if (departmentId && departmentId !== "all") w.departmentId = departmentId;
  if (assignedToId) w.assignedToId = assignedToId;
  if (projectId) w.projectId = projectId;
  if (grievanceId) w.grievanceId = grievanceId;

  const now = new Date();

  const [
    total,
    byStatus,
    byPriority,
    overdueCount,
  ] = await Promise.all([
    prisma.task.count({ where: w }),
    prisma.task.groupBy({ by: ["status"], where: w, _count: true }),
    prisma.task.groupBy({ by: ["priority"], where: w, _count: true }),
    prisma.task.count({
      where: {
        ...w,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { lt: now },
      },
    }),
  ]);

  const tasksForStats = await prisma.task.findMany({
    where: w,
    select: {
      departmentId: true,
      assignedToId: true,
    },
  });

  const deptCounts: Record<string, number> = {};
  const userCounts: Record<string, number> = {};

  for (const t of tasksForStats) {
    if (t.departmentId) {
      deptCounts[t.departmentId] = (deptCounts[t.departmentId] || 0) + 1;
    }
    if (t.assignedToId) {
      userCounts[t.assignedToId] = (userCounts[t.assignedToId] || 0) + 1;
    }
  }

  const byDept = Object.entries(deptCounts).map(([departmentId, count]) => ({
    departmentId,
    _count: count,
  }));

  const byUser = Object.entries(userCounts).map(([assignedToId, count]) => ({
    assignedToId,
    _count: count,
  }));

  const sm = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
  const pm = Object.fromEntries(byPriority.map((p) => [p.priority, p._count]));

  // Get department names
  const deptIds = byDept.map((d) => d.departmentId as string);
  const departments = await prisma.department.findMany({
    where: { tenantId, id: { in: deptIds } },
    select: { id: true, name: true, code: true },
  });
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));

  const departmentStats = byDept.map((d) => {
    const deptInfo = deptMap[d.departmentId as string];
    return {
      departmentId: d.departmentId,
      departmentName: deptInfo?.name || "Unknown Department",
      departmentCode: deptInfo?.code || "UNK",
      count: d._count,
    };
  });

  // Get officer names and specific completed/overdue counts
  const userIds = byUser.map((u) => u.assignedToId);
  const users = await prisma.user.findMany({
    where: { tenantId, id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  // Count individual user metrics
  const userMetrics = await Promise.all(
    userIds.map(async (uId) => {
      const [totalAssigned, completed, overdue] = await Promise.all([
        prisma.task.count({ where: { ...w, assignedToId: uId } }),
        prisma.task.count({ where: { ...w, assignedToId: uId, status: "COMPLETED" } }),
        prisma.task.count({
          where: {
            ...w,
            assignedToId: uId,
            status: { notIn: ["COMPLETED", "CANCELLED"] },
            dueDate: { lt: now },
          },
        }),
      ]);

      return {
        officerId: uId,
        officerName: userMap[uId] || "Unknown Officer",
        assigned: totalAssigned,
        completed,
        overdue,
      };
    })
  );

  return {
    total,
    todo: sm["TODO"] || 0,
    inProgress: sm["IN_PROGRESS"] || 0,
    completed: sm["COMPLETED"] || 0,
    cancelled: sm["CANCELLED"] || 0,
    overdue: overdueCount,
    byPriority: {
      low: pm["LOW"] || 0,
      medium: pm["MEDIUM"] || 0,
      high: pm["HIGH"] || 0,
      urgent: pm["URGENT"] || 0,
    },
    byDepartment: departmentStats,
    byOfficer: userMetrics,
  };
}
