import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { syncVoterDemographics } from "./demographicsSync.js";

// ══════════════════════════════════════════════════════════
// SOFT-DELETE VOTER
// ══════════════════════════════════════════════════════════

export async function deleteVoter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;

    const voter = await prisma.voter.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!voter) {
      res.status(404).json({ success: false, message: "Voter not found" });
      return;
    }

    await prisma.voter.update({
      where: { id },
      data: { isDeleted: true, status: "DELETED" },
    });

    // Auto-sync Demographics for this ward
    await syncVoterDemographics(tenantId, voter.wardId);

    // Audit log (fire-and-forget)
    createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "voter_list",
      recordId: id,
      description: `Soft-deleted voter "${voter.name}" (${voter.voterIdNumber})`,
      oldData: { name: voter.name, voterIdNumber: voter.voterIdNumber },
      ...getRequestMeta(req),
    }).catch(() => {});

    res.json({
      success: true,
      message: "Voter deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}
