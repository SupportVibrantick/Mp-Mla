import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";

export const createInchargeSchema = z.object({
  name: z.string().min(1, "Name required"),
  designation: z.string().min(1, "Designation required"),
  contactNo: z.string().min(1, "Contact number required"),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().datetime().optional(),
  photoUrl: z.string().optional(),
  appointedDate: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

export const updateInchargeSchema = createInchargeSchema.partial();

async function getInstitutionOrThrow(id: string) {
  const inst = await prisma.institution.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!inst) throw ApiError.notFound("Institution not found");
  return inst;
}

// ─── List ───────────────────────────────────────────────

export async function listIncharges(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { institutionId } = req.params;
    const inst = await getInstitutionOrThrow(institutionId);

    const incharges = await prisma.incharge.findMany({
      where: { institutionId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });

    res.json({
      success: true,
      data: { institution: inst, incharges },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Get One ────────────────────────────────────────────

export async function getIncharge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const incharge = await prisma.incharge.findUnique({
      where: { id: req.params.inchargeId },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
            category: true,
            wardId: true,
          },
        },
      },
    });
    if (!incharge) throw ApiError.notFound("Incharge not found");
    res.json({ success: true, data: incharge });
  } catch (error) {
    next(error);
  }
}

// ─── Create ─────────────────────────────────────────────

export async function createIncharge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { institutionId } = req.params;
    const inst = await getInstitutionOrThrow(institutionId);

    const data: any = { ...req.body, institutionId };
    if (data.email === "") delete data.email;
    if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
    if (data.appointedDate) data.appointedDate = new Date(data.appointedDate);

    const incharge = await prisma.incharge.create({ data });

    await createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "institutions",
      recordId: incharge.id,
      description: `Added incharge "${incharge.name}" (${incharge.designation}) to "${inst.name}"`,
      newData: {
        name: incharge.name,
        designation: incharge.designation,
        institutionId,
      },
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Incharge "${incharge.name}" added`,
      data: incharge,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Update ─────────────────────────────────────────────

export async function updateIncharge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const old = await prisma.incharge.findUnique({
      where: { id: req.params.inchargeId },
    });
    if (!old) throw ApiError.notFound("Incharge not found");

    const data: any = { ...req.body };
    if (data.email === "") delete data.email;
    if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
    if (data.appointedDate) data.appointedDate = new Date(data.appointedDate);

    const incharge = await prisma.incharge.update({
      where: { id: req.params.inchargeId },
      data,
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "institutions",
      recordId: incharge.id,
      description: `Updated incharge "${incharge.name}"`,
      oldData: {
        name: old.name,
        designation: old.designation,
        isActive: old.isActive,
      },
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Incharge "${incharge.name}" updated`,
      data: incharge,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Delete ─────────────────────────────────────────────

export async function deleteIncharge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const incharge = await prisma.incharge.findUnique({
      where: { id: req.params.inchargeId },
    });
    if (!incharge) throw ApiError.notFound("Incharge not found");

    await prisma.incharge.delete({
      where: { id: req.params.inchargeId },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "institutions",
      recordId: incharge.id,
      description: `Removed incharge "${incharge.name}"`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Incharge "${incharge.name}" removed`,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Toggle Active ──────────────────────────────────────

export async function toggleInchargeActive(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const incharge = await prisma.incharge.findUnique({
      where: { id: req.params.inchargeId },
    });
    if (!incharge) throw ApiError.notFound("Incharge not found");

    const updated = await prisma.incharge.update({
      where: { id: req.params.inchargeId },
      data: { isActive: !incharge.isActive },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "institutions",
      recordId: updated.id,
      description: `${updated.isActive ? "Activated" : "Deactivated"} incharge "${updated.name}"`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `"${updated.name}" ${updated.isActive ? "activated" : "deactivated"}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
