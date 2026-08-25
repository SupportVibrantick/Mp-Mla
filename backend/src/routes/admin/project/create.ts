import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { generateProjectCode } from "./helpers.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { validateBudgets } from "../../../services/project/projectBudget.service.js";

/**
 * POST /api/admin/projects
 * Creates a new project.
 */
export async function createProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { milestones, ...data } = req.body;

    // Validate Ward
    const ward = await prisma.ward.findFirst({
      where: { id: data.wardId, tenantId, isDeleted: false, status: "ACTIVE" },
    });
    if (!ward) throw ApiError.notFound("Active ward not found");

    // Validate Department (if provided)
    if (data.departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: data.departmentId, tenantId, isDeleted: false, isActive: true },
      });
      if (!department) throw ApiError.notFound("Active department not found");
    }

    // Validate Budgets
    validateBudgets(
      data.budgetSanctioned || 0,
      data.budgetReleased || 0,
      data.budgetUsed || 0
    );

    // Auto-generate project code
    const projectCode = await generateProjectCode(data.category, tenantId);

    // Prepare milestones array
    const msData = (milestones || []).map((m: any, i: number) => ({
      tenantId,
      title: m.title,
      description: m.description,
      targetDate: m.targetDate ? new Date(m.targetDate) : null,
      orderIndex: i,
    }));

    const project = await prisma.project.create({
      data: {
        tenantId,
        projectCode,
        name: data.name,
        category: data.category,
        contractor: data.contractor,
        contractorPhone: data.contractorPhone,
        wardId: data.wardId,
        departmentId: data.departmentId,
        startDate: data.startDate ? new Date(data.startDate) : null,
        expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : null,
        budgetSanctioned: data.budgetSanctioned || 0,
        budgetReleased: data.budgetReleased || 0,
        budgetUsed: data.budgetUsed || 0,
        fundType: data.fundType || "OTHER",
        status: data.status || "PENDING",
        completionPercent: data.status === "COMPLETED" ? 100 : 0,
        description: data.description,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        createdById: req.user!.id,
        milestones: msData.length > 0 ? { createMany: { data: msData } } : undefined,
      },
      include: {
        ward: { select: { name: true, wardNumber: true } },
        department: { select: { name: true, code: true } },
        milestones: { orderBy: { orderIndex: "asc" } },
      },
    });

    // Create system timeline entry
    await prisma.projectTimeline.create({
      data: {
        tenantId,
        projectId: project.id,
        action: "CREATE",
        comment: `Project ${projectCode} created: "${project.name}" (Sanctioned: ₹${project.budgetSanctioned.toLocaleString()})`,
        changedById: req.user!.id,
        metadata: {
          projectCode,
          name: project.name,
          budgetSanctioned: project.budgetSanctioned,
        },
      },
    });

    // Create system audit log
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "projects",
      recordId: project.id,
      description: `Created project ${projectCode} — "${project.name}" (₹${project.budgetSanctioned.toLocaleString()})`,
      newData: {
        projectCode,
        name: project.name,
        budgetSanctioned: project.budgetSanctioned,
      },
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Project ${projectCode} created`,
      data: project,
    });
  } catch (error) {
    next(error);
  }
}
