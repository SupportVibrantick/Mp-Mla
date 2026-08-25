import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

export async function deleteSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const sessionId = req.params.id as string;

    const session = await prisma.janataDarbarSession.findFirst({
      where: { id: sessionId, tenantId },
    });
    if (!session) throw ApiError.notFound("Session not found");
    if (session.isDeleted) throw ApiError.badRequest("Session is already deleted.");

    // Archive in recycle bin
    await archiveToRecycleBin({
      tenantId,
      module: "janata_darbar",
      entityType: "janata_darbar_session" as any,
      recordId: sessionId,
      recordLabel: `${session.sessionNumber} - ${session.title}`,
      payload: session,
      deletedById: req.user!.id,
    });

    // Soft delete
    await prisma.janataDarbarSession.update({
      where: { id: sessionId },
      data: { isDeleted: true },
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "DELETE",
      module: "janata_darbar",
      recordId: sessionId,
      description: `Soft-deleted Janata Darbar session "${session.title}" (${session.sessionNumber})`,
      oldData: { title: session.title, isDeleted: false },
      newData: { isDeleted: true },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Session "${session.title}" (${session.sessionNumber}) successfully moved to recycle bin`,
    });
  } catch (error) {
    next(error);
  }
}
