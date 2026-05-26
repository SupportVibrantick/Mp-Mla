import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";
import { requireTenantId } from "../../../utils/tenant.js";

export async function deleteLeader(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const lenderId = req.params.id as string;
    const leader = await prisma.leader.findFirst({
      where: { id: lenderId, tenantId },
      include: { greetings: true },
    });
    if (!leader) throw ApiError.notFound("Leader not found");

    if (leader.isDeleted) {
      throw ApiError.badRequest("Leader is already in recycle bin");
    }

    await archiveToRecycleBin({
      tenantId,
      module: "leaders",
      entityType: "leader",
      recordId: leader.id,
      recordLabel: leader.name,
      payload: leader,
      deletedById: req.user?.id,
    });

    await prisma.leader.update({
      where: { id: lenderId },
      data: { isDeleted: true },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "DELETE",
      module: "leaders",
      recordId: leader.id,
      description: `Moved leader "${leader.name}" to recycle bin`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `"${leader.name}" moved to recycle bin`,
    });
  } catch (error) {
    next(error);
  }
}
