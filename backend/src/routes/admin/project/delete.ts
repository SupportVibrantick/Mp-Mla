import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

export async function deleteProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const p = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!p) throw ApiError.notFound("Project not found");
    await prisma.project.delete({ where: { id: req.params.id } });
    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "projects",
      recordId: p.id,
      description: `Deleted project ${p.projectCode}`,
      ...getRequestMeta(req),
    });
    res.json({ success: true, message: `${p.projectCode} deleted` });
  } catch (error) {
    next(error);
  }
}
