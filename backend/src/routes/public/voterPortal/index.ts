import { Router, Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { createUploader, getUploadPath } from "../../../lib/upload.js";
import { requireVoterAuth, VoterAuthRequest } from "../../../middleware/voterAuth.js";
import {
  searchApplicationByEpic,
  loginWithApplicationNumber,
  loginWithMobile,
  selectVoterProfile,
  sendPasswordResetOtp,
  verifyOtpAndResetPassword,
  changeVoterPassword,
} from "../../../services/voterPortal/voterAuth.service.js";

const voterUploader = createUploader("voters");
const router = Router();

// ─── 1. Search Application Number by EPIC Number ──────────────
router.get("/search-epic", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const epicNumber = req.query.epicNumber as string;
    if (!epicNumber || !epicNumber.trim()) {
      res.status(400).json({ success: false, message: "EPIC Number is required." });
      return;
    }
    const tenantId = req.query.tenantId as string | undefined;
    const result = await searchApplicationByEpic(epicNumber, tenantId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ─── 2. Login with Application Number + Password ───────────────
router.post("/login/application", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { applicationNumber, password, tenantId } = req.body;
    if (!applicationNumber || !password) {
      res.status(400).json({ success: false, message: "Application Number and Password are required." });
      return;
    }
    const result = await loginWithApplicationNumber(applicationNumber, password, tenantId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ─── 3. Login with Mobile Number + Password ────────────────────
router.post("/login/mobile", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mobileNumber, password } = req.body;
    if (!mobileNumber || !password) {
      res.status(400).json({ success: false, message: "Mobile Number and Password are required." });
      return;
    }
    const result = await loginWithMobile(mobileNumber, password);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ─── 4. Select Profile for Multi-Constituency Mobile Login ─────
router.post("/select-profile", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { voterAccountId, membershipId } = req.body;
    if (!voterAccountId || !membershipId) {
      res.status(400).json({ success: false, message: "voterAccountId and membershipId are required." });
      return;
    }
    const result = await selectVoterProfile(voterAccountId, membershipId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ─── 5. Send Password Reset OTP ──────────────────────────────
router.post("/forgot-password/send-otp", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mobileNumber } = req.body;
    if (!mobileNumber || !mobileNumber.trim()) {
      res.status(400).json({ success: false, message: "Mobile Number is required." });
      return;
    }
    const result = await sendPasswordResetOtp(mobileNumber);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ─── 6. Verify OTP and Reset Password ─────────────────────────
router.post("/forgot-password/verify-reset", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mobileNumber, otpCode, newPassword } = req.body;
    if (!mobileNumber || !otpCode || !newPassword) {
      res.status(400).json({ success: false, message: "Mobile Number, OTP code, and new password are required." });
      return;
    }
    const result = await verifyOtpAndResetPassword(mobileNumber, otpCode, newPassword);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ─── 7. Change Password (Authenticated Voter) ────────────────
router.post("/change-password", requireVoterAuth, async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: "Current password and new password are required." });
      return;
    }
    const result = await changeVoterPassword(req.voterAccountId!, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ─── 8. Get Logged In Voter Profile ─────────────────────────
router.get("/profile", requireVoterAuth, async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
  try {
    const voter = await prisma.voter.findFirst({
      where: { id: req.voterId!, tenantId: req.tenantId!, isDeleted: false },
      include: {
        tenant: { select: { id: true, name: true, constituencyName: true, logoUrl: true, partyLogoUrl: true } },
        ward: { select: { id: true, name: true, wardNumber: true } },
        wardArea: { select: { id: true, name: true } },
        accountMemberships: {
          where: { voterAccountId: req.voterAccountId },
          include: { voterAccount: { select: { forcePasswordChange: true } } },
        },
        identityVerifications: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!voter) {
      res.status(404).json({ success: false, message: "Voter profile not found." });
      return;
    }

    const accountForceChange = voter.accountMemberships[0]?.voterAccount?.forcePasswordChange;
    const forcePasswordChange = accountForceChange !== undefined ? accountForceChange : voter.forcePasswordChange;

    const latestVerification = voter.identityVerifications[0] || null;
    const isIdentityVerified = latestVerification?.status === "VERIFIED" || latestVerification?.status === "SUBMITTED";

    res.json({
      success: true,
      data: {
        ...voter,
        forcePasswordChange,
        isIdentityVerified,
        latestVerification,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── 9. Update Voter Profile Details ────────────────────────
router.put("/profile", requireVoterAuth, async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
  try {
    // 🔒 RESTRICTION: Check if voter has uploaded verification document (Aadhaar Card)
    const verification = await prisma.voterIdentityVerification.findFirst({
      where: {
        voterId: req.voterId!,
        tenantId: req.tenantId!,
        status: { in: ["VERIFIED", "SUBMITTED"] },
      },
    });

    if (!verification) {
      res.status(403).json({
        success: false,
        message: "Profile updates are locked! Please upload your Aadhaar Card verification document first to unlock updating profile details.",
        code: "VERIFICATION_REQUIRED",
      });
      return;
    }

    const { name, relativeName, relationType, gender, age, houseNo, address, locality, phone, bloodGroup } = req.body;

    const updated = await prisma.voter.update({
      where: { id: req.voterId! },
      data: {
        ...(name && { name: name.trim() }),
        ...(relativeName !== undefined && { relativeName: relativeName ? relativeName.trim() : null }),
        ...(relationType !== undefined && { relationType: relationType || null }),
        ...(gender && { gender }),
        ...(age !== undefined && { age: age ? parseInt(String(age), 10) : null }),
        ...(houseNo !== undefined && { houseNo: houseNo ? houseNo.trim() : null }),
        ...(address !== undefined && { address: address ? address.trim() : null }),
        ...(locality !== undefined && { locality: locality ? locality.trim() : null }),
        ...(phone !== undefined && { phone: phone ? phone.trim() : null }),
        ...(bloodGroup !== undefined && { bloodGroup: bloodGroup ? bloodGroup.trim() : null }),
      },
      include: {
        tenant: { select: { id: true, name: true, constituencyName: true } },
        ward: { select: { id: true, name: true, wardNumber: true } },
        wardArea: { select: { id: true, name: true } },
      },
    });

    // If mobile number updated, update VoterAccount mobile if primary
    if (phone && phone.trim()) {
      const cleanPhone = phone.trim();
      const existingAccount = await prisma.voterAccount.findUnique({
        where: { id: req.voterAccountId! },
      });
      if (existingAccount && (existingAccount.mobile.startsWith("APP_") || existingAccount.mobile !== cleanPhone)) {
        const taken = await prisma.voterAccount.findUnique({ where: { mobile: cleanPhone } });
        if (!taken) {
          await prisma.voterAccount.update({
            where: { id: req.voterAccountId! },
            data: { mobile: cleanPhone },
          });
        }
      }
    }

    res.json({ success: true, data: updated, message: "Profile details updated successfully." });
  } catch (error) {
    next(error);
  }
});

// ─── 9B. Identity Verification Endpoints ────────────────────
router.get("/verification", requireVoterAuth, async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
  try {
    const verifications = await prisma.voterIdentityVerification.findMany({
      where: { voterId: req.voterId!, tenantId: req.tenantId! },
      orderBy: { createdAt: "desc" },
    });
    const latest = verifications[0] || null;
    res.json({
      success: true,
      data: {
        isVerified: latest?.status === "VERIFIED" || latest?.status === "SUBMITTED",
        latestVerification: latest,
        history: verifications,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/verification/upload",
  requireVoterAuth,
  voterUploader.single("document"),
  async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
    try {
      const { aadhaarNumber } = req.body;
      const documentFile = req.file;

      if (!aadhaarNumber && !documentFile) {
        res.status(400).json({ success: false, message: "Aadhaar Card number or document file is required." });
        return;
      }

      let documentUrl: string | undefined = undefined;
      if (documentFile) {
        documentUrl = getUploadPath(documentFile.filename, "voters");
      }

      const cleanAadhaar = aadhaarNumber ? aadhaarNumber.replace(/\D/g, "") : null;
      if (cleanAadhaar && cleanAadhaar.length !== 12) {
        res.status(400).json({ success: false, message: "Aadhaar Card number must be exactly 12 digits." });
        return;
      }

      const maskedAadhaar = cleanAadhaar ? `XXXX-XXXX-${cleanAadhaar.slice(-4)}` : null;

      const verification = await prisma.voterIdentityVerification.create({
        data: {
          tenantId: req.tenantId!,
          voterId: req.voterId!,
          method: "AADHAAR_CARD_UPLOAD",
          status: "VERIFIED",
          provider: "AADHAAR_CARD",
          aadhaarNumber: maskedAadhaar,
          documentUrl: documentUrl || null,
          referenceId: `ADH-${Date.now()}`,
          verifiedAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: verification,
        message: "Aadhaar Card verification document uploaded and verified successfully! Profile editing is now unlocked.",
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── 10. Upload Voter Profile Photo ─────────────────────────
router.post(
  "/profile/photo",
  requireVoterAuth,
  voterUploader.single("photo"),
  async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: "Photo file is required." });
        return;
      }

      const photoUrl = getUploadPath(req.file.filename, "voters");

      const updated = await prisma.voter.update({
        where: { id: req.voterId! },
        data: { photoUrl },
      });

      res.json({ success: true, data: { photoUrl: updated.photoUrl }, message: "Photo uploaded successfully." });
    } catch (error) {
      next(error);
    }
  }
);

// ─── 10b. Upload Photo (General / Family Member) ───────────────
router.post(
  "/upload-photo",
  requireVoterAuth,
  voterUploader.single("photo"),
  async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: "Photo file is required." });
        return;
      }

      const photoUrl = getUploadPath(req.file.filename, "voters");
      res.json({ success: true, data: { photoUrl }, message: "Photo uploaded successfully." });
    } catch (error) {
      next(error);
    }
  }
);

// ─── 11. GET Voter Family & Household Members ───────────────
router.get("/family", requireVoterAuth, async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
  try {
    const voterId = req.voterId!;
    const tenantId = req.tenantId!;

    const members = await prisma.voterFamilyMember.findMany({
      where: { voterId, tenantId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    const enrichedMembers = members.map((m) => {
      let computedAge = m.age;
      if (m.dateOfBirth) {
        const today = new Date();
        const dob = new Date(m.dateOfBirth);
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        computedAge = age >= 0 ? age : m.age;
      }
      return {
        ...m,
        computedAge,
      };
    });

    res.json({ success: true, data: enrichedMembers });
  } catch (error) {
    next(error);
  }
});

// ─── 12. ADD Family Member from Voter Portal ────────────────
router.post("/family", requireVoterAuth, async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
  try {
    const voterId = req.voterId!;
    const tenantId = req.tenantId!;
    const voter = await prisma.voter.findUnique({ where: { id: voterId } });

    if (!voter) {
      res.status(404).json({ success: false, message: "Voter profile not found." });
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
      voterIdNumber,
      isDependent,
      isEmergencyContact,
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
      res.status(400).json({ success: false, message: "Member name is required." });
      return;
    }
    if (!relationType) {
      res.status(400).json({ success: false, message: "Relation type is required." });
      return;
    }
    if (!gender) {
      res.status(400).json({ success: false, message: "Gender is required." });
      return;
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
        age: age ? parseInt(String(age), 10) : null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        voterIdNumber: voterIdNumber?.trim() || null,
        isDependent: Boolean(isDependent),
        isEmergencyContact: Boolean(isEmergencyContact),
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

    res.status(201).json({ success: true, data: member, message: "Family member added successfully." });
  } catch (error) {
    next(error);
  }
});

// ─── 13. UPDATE Family Member from Voter Portal ─────────────
router.put("/family/:id", requireVoterAuth, async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const voterId = req.voterId!;
    const tenantId = req.tenantId!;

    const existing = await prisma.voterFamilyMember.findFirst({
      where: { id, voterId, tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Family member record not found." });
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
      voterIdNumber,
      isDependent,
      isEmergencyContact,
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
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(relationType && { relationType }),
        relationCustom: relationType === "OTHER" ? (relationCustom?.trim() || null) : (relationType ? null : existing.relationCustom),
        ...(gender && { gender }),
        dateOfBirth: dateOfBirth !== undefined ? (dateOfBirth ? new Date(dateOfBirth) : null) : existing.dateOfBirth,
        age: age !== undefined ? (age ? parseInt(String(age), 10) : null) : existing.age,
        phone: phone !== undefined ? (phone?.trim() || null) : existing.phone,
        email: email !== undefined ? (email?.trim() || null) : existing.email,
        voterIdNumber: voterIdNumber !== undefined ? (voterIdNumber?.trim() || null) : existing.voterIdNumber,
        isDependent: isDependent !== undefined ? Boolean(isDependent) : existing.isDependent,
        isEmergencyContact: isEmergencyContact !== undefined ? Boolean(isEmergencyContact) : existing.isEmergencyContact,
        sameAddress: sameAddress !== undefined ? Boolean(sameAddress) : existing.sameAddress,
        address: address !== undefined ? (address?.trim() || null) : existing.address,
        bloodGroup: bloodGroup !== undefined ? (bloodGroup?.trim() || null) : existing.bloodGroup,
        occupationCategory: occupationCategory !== undefined ? occupationCategory : existing.occupationCategory,
        occupationTitle: occupationTitle !== undefined ? (occupationTitle?.trim() || null) : existing.occupationTitle,
        workingOrganization: workingOrganization !== undefined ? (workingOrganization?.trim() || null) : existing.workingOrganization,
        workingDescription: workingDescription !== undefined ? (workingDescription?.trim() || null) : existing.workingDescription,
        incomeRange: incomeRange !== undefined ? incomeRange : existing.incomeRange,
        remarks: remarks !== undefined ? (remarks?.trim() || null) : existing.remarks,
      },
    });

    res.json({ success: true, data: updated, message: "Family member updated successfully." });
  } catch (error) {
    next(error);
  }
});

// ─── 14. DELETE Family Member from Voter Portal ─────────────
router.delete("/family/:id", requireVoterAuth, async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const voterId = req.voterId!;
    const tenantId = req.tenantId!;

    const existing = await prisma.voterFamilyMember.findFirst({
      where: { id, voterId, tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Family member record not found." });
      return;
    }

    await prisma.voterFamilyMember.delete({ where: { id } });

    res.json({ success: true, message: "Family member deleted successfully." });
  } catch (error) {
    next(error);
  }
});

export default router;
