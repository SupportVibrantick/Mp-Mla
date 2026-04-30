import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";
import { z } from "zod";

async function getInstitutionOrThrow(id: string) {
  const inst = await prisma.institution.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!inst) throw ApiError.notFound("Institution not found");
  return inst;
}

export async function syncToLeaders(incharge: any, wardId: string) {
  if (!incharge.dateOfBirth) return;

  // Try to find existing leader by adharNumber first, then phone and name
  let existing = null;
  if (incharge.adharNumber) {
    existing = await prisma.leader.findFirst({
      where: {
        adharNumber: incharge.adharNumber,
        isDeleted: false,
      },
    });
  }

  if (!existing) {
    existing = await prisma.leader.findFirst({
      where: {
        phone: incharge.contactNo,
        name: incharge.name,
        isDeleted: false,
      },
    });
  }

  const leaderData: any = {
    name: incharge.name,
    category: "COMMUNITY_LEADER",
    designation: incharge.designation,
    dateOfBirth: incharge.dateOfBirth,
    adharNumber: incharge.adharNumber || undefined,
    phone: incharge.contactNo,
    email: incharge.email || undefined,
    wardId: wardId,
    isActive: true,
  };

  if (existing) {
    await prisma.leader.update({
      where: { id: existing.id },
      data: leaderData,
    });
  } else {
    await prisma.leader.create({
      data: leaderData,
    });
  }
}

// ─── List ───────────────────────────────────────────────

export async function listIncharges(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const institutionId = req.params.institutionId as string;
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
      where: { id: req.params.inchargeId as string },
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
    const institutionId = req.params.institutionId as string;
    const inst = await getInstitutionOrThrow(institutionId);

    const data: any = { ...req.body, institutionId };
    if (data.email === "") delete data.email;
    if (data.adharNumber === "") delete data.adharNumber;
    if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
    if (data.appointedDate) data.appointedDate = new Date(data.appointedDate);

    // Check Aadhaar uniqueness manually for better error message
    if (data.adharNumber) {
      const existing = await prisma.incharge.findUnique({
        where: { adharNumber: data.adharNumber },
      });
      if (existing) {
        throw ApiError.conflict("An incharge with this Aadhaar number is already registered.");
      }
    }

    const incharge = await prisma.incharge.create({ data });

    // Sync to Leaders if DOB is provided
    const instDetail = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { wardId: true },
    });
    if (instDetail) {
      await syncToLeaders(incharge, instDetail.wardId);
    }

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
    const inchargeId = req.params.inchargeId as string;
    const old = await prisma.incharge.findUnique({
      where: { id: inchargeId },
    });
    if (!old) throw ApiError.notFound("Incharge not found");

    const data: any = { ...req.body };
    if (data.email === "") delete data.email;
    if (data.adharNumber === "") delete data.adharNumber;
    if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
    if (data.appointedDate) data.appointedDate = new Date(data.appointedDate);

    // Check Aadhaar uniqueness manually for better error message
    if (data.adharNumber && data.adharNumber !== old.adharNumber) {
      const existing = await prisma.incharge.findUnique({
        where: { adharNumber: data.adharNumber },
      });
      if (existing) {
        throw ApiError.conflict("An incharge with this Aadhaar number is already registered.");
      }
    }

    const incharge = await prisma.incharge.update({
      where: { id: inchargeId },
      data,
      include: {
        institution: {
          select: { wardId: true },
        },
      },
    });

    // Sync to Leaders if DOB is provided
    if (incharge.institution) {
      await syncToLeaders(incharge, incharge.institution.wardId);
    }

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
    const inchargeId = req.params.inchargeId as string;

    const incharge = await prisma.incharge.findUnique({
      where: { id: inchargeId },
    });
    if (!incharge) throw ApiError.notFound("Incharge not found");

    await archiveToRecycleBin({
      module: "institutions",
      entityType: "incharge",
      recordId: incharge.id,
      recordLabel: incharge.name,
      payload: incharge,
      deletedById: req.user?.id,
    });

    await prisma.incharge.delete({
      where: { id: inchargeId },
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
      message: `Incharge "${incharge.name}" moved to recycle bin`,
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
    const inchargeId = req.params.inchargeId as string;

    const incharge = await prisma.incharge.findUnique({
      where: { id: inchargeId },
    });
    if (!incharge) throw ApiError.notFound("Incharge not found");

    const updated = await prisma.incharge.update({
      where: { id: inchargeId },
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
