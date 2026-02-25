import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

export async function updateLeader(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const lenderId = req.params.id as string;
    const old = await prisma.leader.findUnique({
      where: { id: lenderId },
    });
    if (!old) throw ApiError.notFound("Leader not found");

    const data: any = { ...req.body };
    if (data.email === "") delete data.email;
    if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);

    const leader = await prisma.leader.update({
      where: { id: lenderId },
      data,
      include: {
        ward: { select: { name: true, wardNumber: true } },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "leaders",
      recordId: leader.id,
      description: `Updated leader "${leader.name}"`,
      oldData: { name: old.name, category: old.category },
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `"${leader.name}" updated`,
      data: leader,
    });
  } catch (error) {
    next(error);
  }
}
