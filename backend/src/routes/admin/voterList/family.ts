import { Router, Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import logger from "../../../utils/logger.js";

const router = Router();

/**
 * Calculate dynamic age from DOB if available, fallback to snapshot age
 */
function computeAge(dateOfBirth: Date | null | undefined, snapshotAge: number | null | undefined): number | null {
  if (dateOfBirth) {
    const today = new Date();
    const dob = new Date(dateOfBirth);
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : (snapshotAge ?? null);
  }
  return snapshotAge ?? null;
}

// ─── GET ALL FAMILY MEMBERS FOR A VOTER ─────────────────────────────────
router.get("/:voterId/family", async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const voterId = String(req.params.voterId);

    if (!tenantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // Verify voter exists and belongs to tenant
    const voter = await prisma.voter.findFirst({
      where: { id: voterId, tenantId },
      select: { id: true, name: true, voterIdNumber: true, houseNo: true, address: true },
    });

    if (!voter) {
      res.status(404).json({ success: false, message: "Voter not found" });
      return;
    }

    const members = await prisma.voterFamilyMember.findMany({
      where: { voterId, tenantId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    const enrichedMembers = members.map((m) => ({
      ...m,
      computedAge: computeAge(m.dateOfBirth, m.age),
    }));

    // Stats
    const earningCategories = [
      "GOVERNMENT_EMPLOYEE",
      "PRIVATE_EMPLOYEE",
      "BUSINESS",
      "SELF_EMPLOYED",
      "PROFESSIONAL",
      "SKILLED_WORKER",
      "DAILY_WAGE",
      "LABOURER",
      "FARMER",
      "DRIVER",
      "SHOPKEEPER",
    ];

    const stats = {
      totalMembers: enrichedMembers.length,
      earningMembers: enrichedMembers.filter(
        (m) => m.occupationCategory && earningCategories.includes(m.occupationCategory)
      ).length,
      dependentsCount: enrichedMembers.filter((m) => m.isDependent).length,
      emergencyContactsCount: enrichedMembers.filter((m) => m.isEmergencyContact).length,
    };

    res.json({
      success: true,
      data: {
        voter,
        members: enrichedMembers,
        stats,
      },
    });
  } catch (error: any) {
    logger.error("Error fetching voter family members:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch family members",
    });
  }
});

// ─── ADD A NEW FAMILY MEMBER ─────────────────────────────────────────────
router.post("/:voterId/family", async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const voterId = String(req.params.voterId);

    if (!tenantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const voter = await prisma.voter.findFirst({
      where: { id: voterId, tenantId },
    });

    if (!voter) {
      res.status(404).json({ success: false, message: "Voter not found" });
      return;
    }

    const {
      name,
      relationType,
      relationCustom,
      gender,
      dateOfBirth,
      age,
      phone,
      email,
      photoUrl,
      voterIdNumber,
      isDependent,
      isEmergencyContact,
      isPrimaryContact,
      sameAddress,
      address,
      bloodGroup,
      occupationCategory,
      occupationTitle,
      workingOrganization,
      workingDescription,
      incomeRange,
      remarks,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: "Member name is required" });
      return;
    }

    if (!relationType) {
      res.status(400).json({ success: false, message: "Relation type is required" });
      return;
    }

    if (!gender) {
      res.status(400).json({ success: false, message: "Gender is required" });
      return;
    }

    // Optional EPIC uniqueness check
    if (voterIdNumber && voterIdNumber.trim()) {
      const existingEPIC = await prisma.voterFamilyMember.findFirst({
        where: {
          tenantId,
          voterIdNumber: voterIdNumber.trim(),
          status: "ACTIVE",
        },
      });
      if (existingEPIC) {
        logger.info(`Family member EPIC ${voterIdNumber} already registered under another family member`);
      }
    }

    const member = await prisma.voterFamilyMember.create({
      data: {
        tenantId,
        voterId,
        name: name.trim(),
        relationType,
        relationCustom: relationType === "OTHER" ? (relationCustom?.trim() || null) : null,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        age: age ? parseInt(age, 10) : null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        photoUrl: photoUrl?.trim() || null,
        voterIdNumber: voterIdNumber?.trim() || null,
        isDependent: Boolean(isDependent),
        isEmergencyContact: Boolean(isEmergencyContact),
        isPrimaryContact: Boolean(isPrimaryContact),
        sameAddress: sameAddress !== undefined ? Boolean(sameAddress) : true,
        address: sameAddress === false ? (address?.trim() || null) : (voter.address || null),
        bloodGroup: bloodGroup?.trim() || null,
        occupationCategory: occupationCategory || null,
        occupationTitle: occupationTitle?.trim() || null,
        workingOrganization: workingOrganization?.trim() || null,
        workingDescription: workingDescription?.trim() || null,
        incomeRange: incomeRange || "NOT_DISCLOSED",
        remarks: remarks?.trim() || null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Family member added successfully",
      data: {
        ...member,
        computedAge: computeAge(member.dateOfBirth, member.age),
      },
    });
  } catch (error: any) {
    logger.error("Error creating family member:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create family member",
    });
  }
});

// ─── UPDATE FAMILY MEMBER ────────────────────────────────────────────────
router.put("/family/:familyMemberId", async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const familyMemberId = String(req.params.familyMemberId);

    if (!tenantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const existingMember = await prisma.voterFamilyMember.findFirst({
      where: { id: familyMemberId, tenantId },
    });

    if (!existingMember) {
      res.status(404).json({ success: false, message: "Family member record not found" });
      return;
    }

    const {
      name,
      relationType,
      relationCustom,
      gender,
      dateOfBirth,
      age,
      phone,
      email,
      photoUrl,
      voterIdNumber,
      isDependent,
      isEmergencyContact,
      isPrimaryContact,
      sameAddress,
      address,
      bloodGroup,
      occupationCategory,
      occupationTitle,
      workingOrganization,
      workingDescription,
      incomeRange,
      remarks,
    } = req.body;

    const updated = await prisma.voterFamilyMember.update({
      where: { id: familyMemberId },
      data: {
        ...(name && { name: name.trim() }),
        ...(relationType && { relationType }),
        relationCustom: relationType === "OTHER" ? (relationCustom?.trim() || null) : (relationType ? null : existingMember.relationCustom),
        ...(gender && { gender }),
        dateOfBirth: dateOfBirth !== undefined ? (dateOfBirth ? new Date(dateOfBirth) : null) : existingMember.dateOfBirth,
        age: age !== undefined ? (age ? parseInt(age, 10) : null) : existingMember.age,
        phone: phone !== undefined ? (phone?.trim() || null) : existingMember.phone,
        email: email !== undefined ? (email?.trim() || null) : existingMember.email,
        photoUrl: photoUrl !== undefined ? (photoUrl?.trim() || null) : existingMember.photoUrl,
        voterIdNumber: voterIdNumber !== undefined ? (voterIdNumber?.trim() || null) : existingMember.voterIdNumber,
        isDependent: isDependent !== undefined ? Boolean(isDependent) : existingMember.isDependent,
        isEmergencyContact: isEmergencyContact !== undefined ? Boolean(isEmergencyContact) : existingMember.isEmergencyContact,
        isPrimaryContact: isPrimaryContact !== undefined ? Boolean(isPrimaryContact) : existingMember.isPrimaryContact,
        sameAddress: sameAddress !== undefined ? Boolean(sameAddress) : existingMember.sameAddress,
        address: address !== undefined ? (address?.trim() || null) : existingMember.address,
        bloodGroup: bloodGroup !== undefined ? (bloodGroup?.trim() || null) : existingMember.bloodGroup,
        occupationCategory: occupationCategory !== undefined ? occupationCategory : existingMember.occupationCategory,
        occupationTitle: occupationTitle !== undefined ? (occupationTitle?.trim() || null) : existingMember.occupationTitle,
        workingOrganization: workingOrganization !== undefined ? (workingOrganization?.trim() || null) : existingMember.workingOrganization,
        workingDescription: workingDescription !== undefined ? (workingDescription?.trim() || null) : existingMember.workingDescription,
        incomeRange: incomeRange !== undefined ? incomeRange : existingMember.incomeRange,
        remarks: remarks !== undefined ? (remarks?.trim() || null) : existingMember.remarks,
      },
    });

    res.json({
      success: true,
      message: "Family member updated successfully",
      data: {
        ...updated,
        computedAge: computeAge(updated.dateOfBirth, updated.age),
      },
    });
  } catch (error: any) {
    logger.error("Error updating family member:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update family member",
    });
  }
});

// ─── DELETE FAMILY MEMBER ────────────────────────────────────────────────
router.delete("/family/:familyMemberId", async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const familyMemberId = String(req.params.familyMemberId);

    if (!tenantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const existingMember = await prisma.voterFamilyMember.findFirst({
      where: { id: familyMemberId, tenantId },
    });

    if (!existingMember) {
      res.status(404).json({ success: false, message: "Family member record not found" });
      return;
    }

    await prisma.voterFamilyMember.delete({
      where: { id: familyMemberId },
    });

    res.json({
      success: true,
      message: "Family member deleted successfully",
    });
  } catch (error: any) {
    logger.error("Error deleting family member:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete family member",
    });
  }
});

export default router;
