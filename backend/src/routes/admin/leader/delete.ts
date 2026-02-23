import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

export async function deleteLeader(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const lenderId = req.params.id as string;
    const leader = await prisma.leader.findUnique({
      where: { id: lenderId },
    });
    if (!leader) throw ApiError.notFound("Leader not found");

    await prisma.leader.delete({
      where: { id: lenderId },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "leaders",
      recordId: leader.id,
      description: `Deleted leader "${leader.name}"`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `"${leader.name}" removed`,
    });
  } catch (error) {
    next(error);
  }
}
