import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { syncVoterDemographics } from "./demographicsSync.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";

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

    // Archive to Recycle Bin
    await archiveToRecycleBin({
      tenantId,
      module: "voter_list",
      entityType: "voter",
      recordId: voter.id,
      recordLabel: `${voter.name} (${voter.voterIdNumber})`,
      payload: voter,
      deletedById: req.user!.id,
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

// ══════════════════════════════════════════════════════════
// BULK SOFT-DELETE VOTERS
// ══════════════════════════════════════════════════════════

export async function bulkDeleteVoters(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        message: "Request body must contain a non-empty 'ids' array.",
      });
      return;
    }

    const voters = await prisma.voter.findMany({
      where: {
        id: { in: ids },
        tenantId,
        isDeleted: false,
      },
    });

    if (voters.length === 0) {
      res.status(404).json({ success: false, message: "No valid active voters found to delete." });
      return;
    }

    const validIds = voters.map((v) => v.id);
    const wardIds = Array.from(new Set(voters.map((v) => v.wardId)));

    await prisma.voter.updateMany({
      where: { id: { in: validIds } },
      data: { isDeleted: true, status: "DELETED" },
    });

    // Archive all deleted voters to Recycle Bin
    for (const voter of voters) {
      await archiveToRecycleBin({
        tenantId,
        module: "voter_list",
        entityType: "voter",
        recordId: voter.id,
        recordLabel: `${voter.name} (${voter.voterIdNumber})`,
        payload: voter,
        deletedById: req.user!.id,
      });
    }

    // Auto-sync Demographics for affected wards
    for (const wardId of wardIds) {
      await syncVoterDemographics(tenantId, wardId);
    }

    // Audit log (fire-and-forget)
    createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "voter_list",
      recordId: validIds[0],
      description: `Soft-deleted ${validIds.length} voters`,
      newData: { deletedCount: validIds.length, ids: validIds },
      ...getRequestMeta(req),
    }).catch(() => {});

    res.json({
      success: true,
      message: `Successfully deleted ${validIds.length} voter(s)`,
      data: { deletedCount: validIds.length },
    });
  } catch (err) {
    next(err);
  }
}

