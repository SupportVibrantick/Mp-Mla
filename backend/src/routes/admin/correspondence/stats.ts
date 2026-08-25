import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * GET /api/admin/correspondence/stats
 * Compile correspondence overview counts and overdue statistics
 */
export async function getCorrespondenceStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const now = new Date();

    const correspondences = await prisma.correspondence.findMany({
      where: { tenantId, isDeleted: false },
      include: {
        department: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    });

    const total = correspondences.length;
    let overdue = 0;

    // Status breakdown counts initialized
    const statusCounts = {
      RECEIVED: 0,
      UNDER_REVIEW: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      REPLY_PENDING: 0,
      REPLIED: 0,
      COMPLETED: 0,
      REJECTED: 0,
      CLOSED: 0,
    };

    const typeCounts: Record<string, number> = {};
    const departmentCounts: Record<string, number> = {};
    const officerCounts: Record<string, number> = {};

    correspondences.forEach((item) => {
      // 1. Overdue check
      const isOverdue =
        item.dueDate &&
        item.dueDate < now &&
        !["COMPLETED", "CLOSED", "REJECTED"].includes(item.status);
      if (isOverdue) overdue++;

      // 2. Status count
      if (statusCounts[item.status] !== undefined) {
        statusCounts[item.status]++;
      }

      // 3. Type count
      typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;

      // 4. Department count
      const deptName = item.department?.name || "Unassigned";
      departmentCounts[deptName] = (departmentCounts[deptName] || 0) + 1;

      // 5. Officer count
      const officerName = item.assignedTo?.name || "Unassigned";
      officerCounts[officerName] = (officerCounts[officerName] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total,
        overdue,
        status: statusCounts,
        byType: typeCounts,
        byDepartment: departmentCounts,
        byOfficer: officerCounts,
      },
    });
  } catch (error) {
    next(error);
  }
}
