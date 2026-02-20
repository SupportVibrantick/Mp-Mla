import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";
import { generateProjectCode } from "./helpers.js";

export const createSchema = z.object({
  name: z.string().min(1, "Name required"),
  category: z.string().min(1, "Category required"),
  department: z.string().min(1, "Department required"),
  wardId: z.string().min(1, "Ward required"),
  contractor: z.string().optional(),
  contractorPhone: z.string().optional(),
  startDate: z.string().datetime().optional(),
  expectedEndDate: z.string().datetime().optional(),
  budgetSanctioned: z.number().min(0).default(0),
  budgetReleased: z.number().min(0).default(0),
  budgetUsed: z.number().min(0).default(0),
  fundType: z
    .enum(["MPLAD", "MLALAD", "STATE_FUND", "CENTRAL_FUND", "CSR", "OTHER"])
    .default("OTHER"),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        targetDate: z.string().datetime().optional(),
      }),
    )
    .optional(),
});

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

    res
      .status(201)
      .json({
        success: true,
        message: `Project ${projectCode} created`,
        data: project,
      });
  } catch (error) {
    next(error);
  }
}
