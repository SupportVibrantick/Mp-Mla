import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { generateProjectCode } from "./helpers.js";

export async function createProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { milestones, ...data } = req.body;

    const ward = await prisma.ward.findUnique({ where: { id: data.wardId } });
    if (!ward) throw ApiError.notFound("Ward not found");

    const projectCode = await generateProjectCode(data.category);

    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.expectedEndDate)
      data.expectedEndDate = new Date(data.expectedEndDate);

    const msData = (milestones || []).map((m: any, i: number) => ({
      title: m.title,
      description: m.description,
      targetDate: m.targetDate ? new Date(m.targetDate) : null,
      orderIndex: i,
    }));

    const project = await prisma.project.create({
      data: {
        ...data,
        projectCode,
        createdById: req.user!.id,
        ...(msData.length > 0
          ? { milestones: { createMany: { data: msData } } }
          : {}),
      },
      include: {
        ward: { select: { name: true, wardNumber: true } },
        milestones: { orderBy: { orderIndex: "asc" } },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "projects",
      recordId: project.id,
      description: `Created project ${projectCode} — "${project.name}" (₹${data.budgetSanctioned.toLocaleString()})`,
      newData: {
        projectCode,
        name: project.name,
        budgetSanctioned: data.budgetSanctioned,
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
