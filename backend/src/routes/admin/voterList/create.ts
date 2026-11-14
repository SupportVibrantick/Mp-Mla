import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { syncVoterDemographics } from "./demographicsSync.js";
import { generateApplicationNumber } from "../../../services/voterPortal/applicationNumber.service.js";
import { createVoterAccountForVoter } from "../../../services/voterPortal/voterAuth.service.js";
import { assertCanCreateVoters } from "../../../lib/quota.js";

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

    // Check voter quota
    await assertCanCreateVoters(tenantId, 1);

    // If user is a WARD_VOLUNTEER, enforce ward authorization
    if (req.user?.role === "WARD_VOLUNTEER") {
      const activeAssignment = await prisma.wardVolunteerAssignment.findFirst({
        where: {
          tenantId,
          userId: req.user.id,
          wardId: data.wardId,
          status: "ACTIVE",
        },
      });

      if (!activeAssignment) {
        res.status(403).json({
          success: false,
          message: "You are not authorized to register voters for this ward",
        });
        return;
      }
    }

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

    // Auto-generate application number for voter
    const applicationNumber = await generateApplicationNumber(tenantId);

    const voter = await prisma.voter.create({
      data: {
        tenantId,
        wardId: data.wardId,
        wardAreaId: data.wardAreaId || null,
        voterIdNumber: data.voterIdNumber.trim(),
        applicationNumber,
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
        bloodGroup: data.bloodGroup?.trim() || null,
        photoUrl: data.photoUrl?.trim() || null,
        isDisabled: data.isDisabled ?? false,
        isOurVoter: data.isOurVoter ?? (data.voterLeaning === "OUR_VOTER" || data.voterLeaning === "SUPPORTER"),
        voterLeaning: data.voterLeaning ?? (data.isOurVoter ? "OUR_VOTER" : "UNKNOWN"),
        voterCadreNotes: data.voterCadreNotes?.trim() || null,
        taggedById: (data.isOurVoter || (data.voterLeaning && data.voterLeaning !== "UNKNOWN")) ? req.user?.id : null,
        taggedAt: (data.isOurVoter || (data.voterLeaning && data.voterLeaning !== "UNKNOWN")) ? new Date() : null,
        createdByUserId: req.user?.id || null,
      },
      include: {
        ward: { select: { id: true, name: true, wardNumber: true } },
      },
    });

    // Create Family Members if provided
    if (data.familyMembers && Array.isArray(data.familyMembers) && data.familyMembers.length > 0) {
      const validMembers = data.familyMembers.filter(
        (m: any) => m && typeof m.name === "string" && m.name.trim().length > 0
      );

      if (validMembers.length > 0) {
        await prisma.voterFamilyMember.createMany({
          data: validMembers.map((m: any) => ({
            tenantId,
            voterId: voter.id,
            name: m.name.trim(),
            relationType: m.relationType || "OTHER",
            relationCustom: m.relationType === "OTHER" ? (m.relationCustom?.trim() || null) : null,
            gender: m.gender || "MALE",
            age: m.age ? parseInt(String(m.age), 10) : null,
            phone: m.phone?.trim() || null,
            voterIdNumber: m.voterIdNumber?.trim() || null,
            bloodGroup: m.bloodGroup?.trim() || null,
            occupationTitle: m.occupationTitle?.trim() || null,
            isDependent: Boolean(m.isDependent),
            isEmergencyContact: Boolean(m.isEmergencyContact),
            sameAddress: m.sameAddress !== undefined ? Boolean(m.sameAddress) : true,
            address: m.address?.trim() || voter.address || null,
            remarks: m.remarks?.trim() || null,
            status: "ACTIVE",
          })),
        });
      }
    }

    // If registered by a volunteer, track in volunteer_voter_submissions
    if (req.user?.role === "WARD_VOLUNTEER") {
      await prisma.volunteerVoterSubmission.create({
        data: {
          tenantId,
          wardId: data.wardId,
          volunteerUserId: req.user.id,
          voterId: voter.id,
          status: "APPROVED",
          submissionNotes: data.submissionNotes || "Direct entry by volunteer",
          data: {
            name: data.name,
            voterIdNumber: data.voterIdNumber,
            applicationNumber,
            gender: data.gender,
            age: data.age,
            phone: data.phone,
          },
        },
      }).catch((e) => console.error("Error creating volunteer submission record:", e));
    }

    // Create Voter Account & Membership with default password = applicationNumber
    await createVoterAccountForVoter(
      tenantId,
      voter.id,
      applicationNumber,
      data.phone
    );

    // Auto-sync Demographics for this ward
    await syncVoterDemographics(tenantId, data.wardId);

    // Audit log (fire-and-forget)
    createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "voter_list",
      recordId: voter.id,
      description: `Created voter "${data.name}" (${data.voterIdNumber}) with Application No ${applicationNumber}`,
      newData: { name: data.name, voterIdNumber: data.voterIdNumber, applicationNumber, wardId: data.wardId },
      ...getRequestMeta(req),
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Voter created successfully",
      data: {
        ...voter,
        applicationNumber,
        initialPassword: applicationNumber,
      },
    });
  } catch (err) {
    next(err);
  }
}
