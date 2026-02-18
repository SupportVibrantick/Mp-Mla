import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";

export const updateWardSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  zone: z.string().max(10).optional().nullable(),
  status: z
    .enum(["ACTIVE", "INACTIVE", "PROPOSED", "MERGED", "DELIMITATION_PENDING"])
    .optional(),
  areaType: z.string().optional(),
  pincode: z.string().max(10).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  establishedDate: z.string().datetime().optional().nullable(),
});

export async function updateWard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const wardId = req.params.id as string;

    const old = await prisma.ward.findUnique({ where: { id: wardId } });
    if (!old) throw ApiError.notFound("Ward not found");

    const updateData: any = { ...req.body };
    if (updateData.establishedDate) {
      updateData.establishedDate = new Date(updateData.establishedDate);
    }

    const ward = await prisma.ward.update({
      where: { id: wardId },
      data: updateData,
      include: {
        areas: true,
        councillors: { where: { isCurrent: true }, take: 1 },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "wards",
      recordId: ward.id,
      description: `Updated ward #${ward.wardNumber} "${ward.name}"`,
      oldData: { name: old.name, zone: old.zone, status: old.status },
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({ success: true, message: "Ward updated", data: ward });
  } catch (error) {
    next(error);
  }
}
