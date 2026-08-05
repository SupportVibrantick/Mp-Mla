import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { syncVoterDemographics } from "./demographicsSync.js";

// ══════════════════════════════════════════════════════════
// CREATE SINGLE VOTER
// ══════════════════════════════════════════════════════════

export async function createVoter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const data = req.body;

    // Verify ward exists for this tenant
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

    // Verify wardArea if provided
    if (data.wardAreaId) {
      const area = await prisma.wardArea.findFirst({
        where: { id: data.wardAreaId, wardId: data.wardId },
      });
      if (!area) {
        res.status(400).json({
          success: false,
          message: "Ward area not found under this ward",
        });
        return;
      }
    }

    // Check for duplicate voter ID
    const existing = await prisma.voter.findUnique({
      where: {
        tenantId_voterIdNumber: {
          tenantId,
          voterIdNumber: data.voterIdNumber,
        },
      },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: `Voter with ID ${data.voterIdNumber} already exists`,
      });
      return;
    }

    const voter = await prisma.voter.create({
      data: {
        tenantId,
        wardId: data.wardId,
        wardAreaId: data.wardAreaId || null,
        voterIdNumber: data.voterIdNumber.trim(),
        slNo: data.slNo ?? null,
        sectionNo: data.sectionNo ?? null,
        boothNo: data.boothNo ?? null,
        name: data.name.trim(),
        relativeName: data.relativeName?.trim() || null,
        relationType: data.relationType || null,
        gender: data.gender,
        age: data.age ?? null,
        houseNo: data.houseNo?.trim() || null,
        address: data.address?.trim() || null,
        locality: data.locality?.trim() || null,
        phone: data.phone?.trim() || null,
        isDisabled: data.isDisabled ?? false,
      },
      include: {
        ward: { select: { id: true, name: true, wardNumber: true } },
      },
    });

    // Auto-sync Demographics for this ward
    await syncVoterDemographics(tenantId, data.wardId);

    // Audit log (fire-and-forget)
    createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "voter_list",
      recordId: voter.id,
      description: `Created voter "${data.name}" (${data.voterIdNumber})`,
      newData: { name: data.name, voterIdNumber: data.voterIdNumber, wardId: data.wardId },
      ...getRequestMeta(req),
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Voter created successfully",
      data: voter,
    });
  } catch (err) {
    next(err);
  }
}
