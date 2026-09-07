import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { syncVoterDemographics } from "./demographicsSync.js";

import bcrypt from "bcryptjs";
import { createVoterAccountForVoter } from "../../../services/voterPortal/voterAuth.service.js";

// ══════════════════════════════════════════════════════════
// UPDATE VOTER
// ══════════════════════════════════════════════════════════

export async function updateVoter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const data = req.body;

    // Find existing voter
    const existing = await prisma.voter.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Voter not found" });
      return;
    }

    // If changing wardId, verify new ward exists
    if (data.wardId && data.wardId !== existing.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId },
      });
      if (!ward) {
        res.status(400).json({
          success: false,
          message: "Ward not found in this organization",
        });
        return;
      }
    }

    // If changing voterIdNumber, check for duplicates
    if (data.voterIdNumber && data.voterIdNumber !== existing.voterIdNumber) {
      const duplicate = await prisma.voter.findUnique({
        where: {
          tenantId_voterIdNumber: {
            tenantId,
            voterIdNumber: data.voterIdNumber,
          },
        },
      });
      if (duplicate) {
        res.status(409).json({
          success: false,
          message: `Voter with ID ${data.voterIdNumber} already exists`,
        });
        return;
      }
    }

    const updated = await prisma.voter.update({
      where: { id },
      data: {
        ...(data.wardId !== undefined && { wardId: data.wardId }),
        ...(data.wardAreaId !== undefined && {
          wardAreaId: data.wardAreaId || null,
        }),
        ...(data.voterIdNumber !== undefined && {
          voterIdNumber: data.voterIdNumber.trim(),
        }),
        ...(data.slNo !== undefined && { slNo: data.slNo }),
        ...(data.sectionNo !== undefined && { sectionNo: data.sectionNo }),
        ...(data.boothNo !== undefined && { boothNo: data.boothNo }),
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.relativeName !== undefined && {
          relativeName: data.relativeName?.trim() || null,
        }),
        ...(data.relationType !== undefined && {
          relationType: data.relationType || null,
        }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.age !== undefined && { age: data.age }),
        ...(data.houseNo !== undefined && {
          houseNo: data.houseNo?.trim() || null,
        }),
        ...(data.address !== undefined && {
          address: data.address?.trim() || null,
        }),
        ...(data.locality !== undefined && {
          locality: data.locality?.trim() || null,
        }),
        ...(data.phone !== undefined && {
          phone: data.phone?.trim() || null,
        }),
        ...(data.bloodGroup !== undefined && {
          bloodGroup: data.bloodGroup?.trim() || null,
        }),
        ...(data.isDisabled !== undefined && { isDisabled: data.isDisabled }),
      },
      include: {
        ward: { select: { id: true, name: true, wardNumber: true } },
      },
    });

    // Auto-sync Demographics for affected ward(s)
    await syncVoterDemographics(tenantId, existing.wardId);
    if (updated.wardId !== existing.wardId) {
      await syncVoterDemographics(tenantId, updated.wardId);
    }

    // Audit log (fire-and-forget)
    createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "voter_list",
      recordId: id,
      description: `Updated voter "${updated.name}" (${updated.voterIdNumber})`,
      oldData: { name: existing.name, voterIdNumber: existing.voterIdNumber },
      newData: data,
      ...getRequestMeta(req),
    }).catch(() => {});

    res.json({
      success: true,
      message: "Voter updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// RESET VOTER PORTAL PASSWORD
// ══════════════════════════════════════════════════════════

export async function resetVoterPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const { newPassword } = req.body;

    const voter = await prisma.voter.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!voter) {
      res.status(404).json({ success: false, message: "Voter not found" });
      return;
    }

    if (!voter.applicationNumber) {
      res.status(400).json({
        success: false,
        message: "Voter does not have an application number assigned.",
      });
      return;
    }

    const cleanAppNum = voter.applicationNumber.trim().toUpperCase();
    const finalPassword =
      newPassword && newPassword.trim() ? newPassword.trim() : cleanAppNum;
    const passwordHash = await bcrypt.hash(finalPassword, 10);
    const forcePasswordChange =
      !newPassword ||
      newPassword.trim() === "" ||
      newPassword.trim().toUpperCase() === cleanAppNum;

    // Create or find voter account
    const { account } = await createVoterAccountForVoter(
      tenantId,
      voter.id,
      cleanAppNum,
      voter.phone,
    );

    // Update VoterAccount password
    await prisma.voterAccount.update({
      where: { id: account.id },
      data: {
        passwordHash,
        forcePasswordChange,
        passwordChangedAt: forcePasswordChange ? null : new Date(),
      },
    });

    // Update Voter model forcePasswordChange
    await prisma.voter.update({
      where: { id: voter.id },
      data: { forcePasswordChange },
    });

    // Audit log
    createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "voter_list",
      recordId: id,
      description: `Reset voter portal password for "${voter.name}" (${voter.applicationNumber})`,
      ...getRequestMeta(req),
    }).catch(() => {});

    res.json({
      success: true,
      message: `Voter portal password updated successfully for ${voter.name}.`,
    });
  } catch (err) {
    next(err);
  }
}
