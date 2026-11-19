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

import jwt from "jsonwebtoken";
import { GrievancePriority } from "@prisma/client";
import { generateApplicationNumber } from "../../admin/schemes/helpers.js";
import { generateTicketNumber } from "../../admin/grievance/helpers.js";
import { calculateGrievanceSla } from "../../../services/grievance/sla.service.js";
import { VoterTokenPayload } from "../../../services/voterPortal/voterAuth.service.js";

const JWT_SECRET = process.env.JWT_SECRET || "mp-mla-secret-key-2026";
const voterUploader = createUploader("voters");
const grievanceUploader = createUploader("grievances");
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

// ─── 15. GET All Active Schemes for Voter Portal ─────────────
router.get("/schemes", async (req: Request, res: Response, next: NextFunction) => {
  try {
    let tenantId = req.query.tenantId as string | undefined;
    let voterId: string | undefined = undefined;

    // Check if voter token is present in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const payload = jwt.verify(token, JWT_SECRET) as VoterTokenPayload;
        if (payload && payload.tenantId) {
          tenantId = payload.tenantId;
          voterId = payload.voterId;
        }
      } catch {
        // Token expired/invalid, fallback to query tenantId if available
      }
    }

    if (!tenantId) {
      res.status(400).json({ success: false, message: "Tenant ID is required to fetch schemes." });
      return;
    }

    const { department, level, search } = req.query as Record<string, string>;

    const where: any = {
      tenantId,
      status: "ACTIVE",
      isDeleted: false,
    };

    if (department && department !== "all") {
      where.department = department;
    }

    if (level && level !== "all") {
      where.level = level;
    }

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { department: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
        { benefits: { contains: search.trim(), mode: "insensitive" } },
        { eligibility: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const schemes = await prisma.scheme.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // If voter is logged in, attach their latest application for each scheme
    let userApplications: Record<string, any> = {};
    if (voterId) {
      const voter = await prisma.voter.findUnique({
        where: { id: voterId },
        select: { phone: true, name: true },
      });

      const apps = await prisma.schemeApplication.findMany({
        where: {
          tenantId,
          isDeleted: false,
          OR: [
            { createdById: voterId },
            { notes: { contains: `[Voter ID: ${voterId}]` } },
            ...(voter?.phone ? [{ beneficiaryPhone: voter.phone }] : []),
          ],
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          schemeId: true,
          applicationNumber: true,
          beneficiaryName: true,
          beneficiaryPhone: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      for (const app of apps) {
        if (!userApplications[app.schemeId]) {
          userApplications[app.schemeId] = app;
        }
      }
    }

    const enrichedSchemes = schemes.map((s) => ({
      ...s,
      myApplication: userApplications[s.id] || null,
    }));

    res.json({
      success: true,
      data: enrichedSchemes,
      meta: {
        total: enrichedSchemes.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── 16. GET Single Scheme Details ───────────────────────────
router.get("/schemes/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    let tenantId = req.query.tenantId as string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const payload = jwt.verify(token, JWT_SECRET) as VoterTokenPayload;
        if (payload && payload.tenantId) {
          tenantId = payload.tenantId;
        }
      } catch {
        // Ignored
      }
    }

    const where: any = {
      id,
      status: "ACTIVE",
      isDeleted: false,
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    const scheme = await prisma.scheme.findFirst({
      where,
    });

    if (!scheme) {
      res.status(404).json({ success: false, message: "Scheme not found or is currently inactive." });
      return;
    }

    res.json({ success: true, data: scheme });
  } catch (error) {
    next(error);
  }
});

// ─── 17. POST Apply for a Scheme (Voter Auth Required) ──────
router.post("/schemes/:id/apply", requireVoterAuth, async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
  try {
    const schemeId = String(req.params.id);
    const voterId = req.voterId!;
    const tenantId = req.tenantId!;

    const scheme = await prisma.scheme.findFirst({
      where: { id: schemeId, tenantId, status: "ACTIVE", isDeleted: false },
    });

    if (!scheme) {
      res.status(404).json({ success: false, message: "Scheme not found or is currently inactive." });
      return;
    }

    const voter = await prisma.voter.findUnique({
      where: { id: voterId },
      include: {
        ward: true,
      },
    });

    if (!voter) {
      res.status(404).json({ success: false, message: "Voter profile not found." });
      return;
    }

    const {
      applyFor, // "SELF" or "FAMILY_MEMBER"
      familyMemberId,
      beneficiaryName,
      beneficiaryPhone,
      beneficiaryEmail,
      address,
      wardId,
      notes,
    } = req.body;

    let finalName = voter.name;
    let finalPhone = voter.phone || null;
    let finalEmail = null;
    let finalAddress = voter.address || null;
    let finalWardId = voter.wardId || null;
    let applicantContext = `Self (${voter.name})`;

    if (applyFor === "FAMILY_MEMBER" && familyMemberId) {
      const familyMember = await prisma.voterFamilyMember.findFirst({
        where: { id: familyMemberId, voterId, tenantId },
      });

      if (familyMember) {
        finalName = familyMember.name;
        finalPhone = familyMember.phone || voter.phone || null;
        finalEmail = familyMember.email || null;
        finalAddress = familyMember.address || voter.address || null;
        applicantContext = `Family Member: ${familyMember.name} (${familyMember.relationType})`;
      }
    } else {
      if (beneficiaryName && beneficiaryName.trim()) finalName = beneficiaryName.trim();
      if (beneficiaryPhone && beneficiaryPhone.trim()) finalPhone = beneficiaryPhone.trim();
      if (beneficiaryEmail && beneficiaryEmail.trim()) finalEmail = beneficiaryEmail.trim();
      if (address && address.trim()) finalAddress = address.trim();
      if (wardId) finalWardId = wardId;
    }

    const applicationNumber = await generateApplicationNumber(tenantId);

    const voterNote = `Applied via Voter Portal for ${applicantContext} by ${voter.name} (EPIC: ${voter.voterIdNumber || "N/A"}) [Voter ID: ${voter.id}]${notes ? `\nCitizen Note: ${notes.trim()}` : ""}`;

    const application = await prisma.schemeApplication.create({
      data: {
        tenantId,
        schemeId,
        applicationNumber,
        beneficiaryName: finalName,
        beneficiaryPhone: finalPhone,
        beneficiaryEmail: finalEmail,
        address: finalAddress,
        wardId: finalWardId,
        status: "SUBMITTED",
        notes: voterNote,
        createdById: voterId,
      },
      include: {
        scheme: { select: { id: true, name: true, department: true, level: true } },
        ward: { select: { id: true, name: true, wardNumber: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: `Scheme application ${applicationNumber} submitted successfully! You can track its status under 'My Scheme Applications'.`,
      data: application,
    });
  } catch (error) {
    next(error);
  }
});

// ─── 18. GET Logged-in Voter's Scheme Applications ──────────
router.get("/my-scheme-applications", requireVoterAuth, async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
  try {
    const voterId = req.voterId!;
    const tenantId = req.tenantId!;

    const voter = await prisma.voter.findUnique({
      where: { id: voterId },
      select: { phone: true, name: true },
    });

    const applications = await prisma.schemeApplication.findMany({
      where: {
        tenantId,
        isDeleted: false,
        OR: [
          { createdById: voterId },
          { notes: { contains: `[Voter ID: ${voterId}]` } },
          ...(voter?.phone ? [{ beneficiaryPhone: voter.phone }] : []),
        ],
      },
      include: {
        scheme: {
          select: {
            id: true,
            name: true,
            code: true,
            department: true,
            level: true,
            benefits: true,
            eligibility: true,
          },
        },
        ward: { select: { id: true, name: true, wardNumber: true } },
        documents: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
});

// ─── 19. GET Voter Helpline Directory (Tenant-Scoped) ───────
router.get("/helplines", requireVoterAuth, async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { category, search, emergencyOnly } = req.query;

    const where: any = {
      tenantId,
      isActive: true,
    };

    if (category && typeof category === "string" && category !== "ALL") {
      where.category = category;
    }

    if (emergencyOnly === "true") {
      where.isEmergency = true;
    }

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { subtitle: { contains: q, mode: "insensitive" } },
        { phonePrimary: { contains: q, mode: "insensitive" } },
        { phoneSecondary: { contains: q, mode: "insensitive" } },
        { tollFreeNumber: { contains: q, mode: "insensitive" } },
        { whatsappNumber: { contains: q, mode: "insensitive" } },
        { areaWardCoverage: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ];
    }

    const [helplines, emergencyCount, totalCount, tollFreeCount, roundTheClockCount, whatsappCount] = await Promise.all([
      prisma.helplineContact.findMany({
        where,
        orderBy: [
          { isEmergency: "desc" },
          { displayOrder: "asc" },
          { title: "asc" },
        ],
      }),
      prisma.helplineContact.count({ where: { tenantId, isActive: true, isEmergency: true } }),
      prisma.helplineContact.count({ where: { tenantId, isActive: true } }),
      prisma.helplineContact.count({ where: { tenantId, isActive: true, isTollFree: true } }),
      prisma.helplineContact.count({ where: { tenantId, isActive: true, is24x7: true } }),
      prisma.helplineContact.count({ where: { tenantId, isActive: true, isWhatsAppEnabled: true } }),
    ]);

    const tenantInfo = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        constituencyName: true,
        state: true,
        district: true,
        representativeName: true,
        representativeTitle: true,
        representativePhoto: true,
        logoUrl: true,
        partyLogoUrl: true,
        email: true,
        phone: true,
      },
    });

    res.json({
      success: true,
      data: helplines,
      tenant: tenantInfo,
      stats: {
        total: totalCount,
        emergency: emergencyCount,
        tollFree: tollFreeCount,
        twentyFourSeven: roundTheClockCount,
        whatsappEnabled: whatsappCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── 20. GET Voter Emergency Speed-Dial (Tenant-Scoped) ──────
router.get("/helplines/emergency", requireVoterAuth, async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;

    const emergencyContacts = await prisma.helplineContact.findMany({
      where: {
        tenantId,
        isActive: true,
        isEmergency: true,
      },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
      take: 8,
    });

    res.json({
      success: true,
      data: emergencyContacts,
    });
  } catch (error) {
    next(error);
  }
});

// ─── 21. GET Grievances Meta & Form Config ────────────────────
router.get("/grievances/meta", requireVoterAuth, async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const voterId = req.voterId!;

    const [voter, departments, tenant] = await Promise.all([
      prisma.voter.findUnique({
        where: { id: voterId },
        include: { ward: { select: { id: true, name: true, wardNumber: true } } },
      }),
      prisma.department.findMany({
        where: { tenantId, isActive: true, isDeleted: false },
        select: { id: true, name: true, code: true, description: true },
        orderBy: { name: "asc" },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          constituencyName: true,
          representativeName: true,
          representativeTitle: true,
        },
      }),
    ]);

    const categories = [
      {
        id: "ROADS_INFRASTRUCTURE",
        label: "Roads, Potholes & Footpaths",
        labelHi: "सड़क, गड्ढे एवं फुटपाथ",
        subcategories: ["Pothole Repair", "Road Widening", "Damaged Footpath", "Speed Breaker Request", "Street Construction"],
        icon: "Road",
      },
      {
        id: "WATER_SUPPLY",
        label: "Water Supply & Pipelines",
        labelHi: "पेयजल आपूर्ति एवं पाइपलाइन",
        subcategories: ["Contaminated Water", "Low Water Pressure", "Pipeline Leakage", "Water Tanker Request", "Borewell / Handpump Issue"],
        icon: "Droplets",
      },
      {
        id: "ELECTRICITY",
        label: "Electricity & Power Outage",
        labelHi: "बिजली आपूर्ति एवं ट्रांसफार्मर",
        subcategories: ["Power Outage / Fluctuation", "Damaged Transformer", "Hanging Electric Wires", "Faulty Meter", "New Connection Delay"],
        icon: "Zap",
      },
      {
        id: "SANITATION_CLEANLINESS",
        label: "Sanitation & Waste Management",
        labelHi: "सफाई एवं कचरा प्रबंधन",
        subcategories: ["Garbage Not Lifted", "Open Dumping Ground", "Public Dustbin Request", "Dead Animal Removal", "Littering in Public Area"],
        icon: "Trash2",
      },
      {
        id: "DRAINAGE_SEWERAGE",
        label: "Drainage, Sewage & Waterlogging",
        labelHi: "नाली, सीवर एवं जलभराव",
        subcategories: ["Choked Drain", "Sewage Overflow", "Rainwater Waterlogging", "Open / Missing Manhole Cover", "Nala Cleaning"],
        icon: "Waves",
      },
      {
        id: "STREET_LIGHTS",
        label: "Street Lights & Illumination",
        labelHi: "स्ट्रीट लाइट व्यवस्था",
        subcategories: ["Dark Street / Light Off", "Blinking / Faulty Light", "New Pole / Light Request", "Solar Light Issue"],
        icon: "Lightbulb",
      },
      {
        id: "HEALTHCARE_HYGIENE",
        label: "Healthcare & Public Hospitals",
        labelHi: "स्वास्थ्य एवं चिकित्सा सेवा",
        subcategories: ["Dispensary Doctor Availability", "Medicine Shortage", "Mosquito Fogging Request", "Ambulance Issue"],
        icon: "HeartPulse",
      },
      {
        id: "EDUCATION_SCHOOLS",
        label: "Schools & Anganwadi Centers",
        labelHi: "सरकारी विद्यालय एवं आंगनवाड़ी",
        subcategories: ["School Infrastructure", "Anganwadi Ration / Facilities", "Teacher Shortage", "Mid-day Meal Complaint"],
        icon: "GraduationCap",
      },
      {
        id: "PARKS_PUBLIC_SPACES",
        label: "Parks, Playgrounds & Public Amenities",
        labelHi: "पार्क एवं खेल मैदान",
        subcategories: ["Park Maintenance", "Broken Play Equipment", "Public Toilet Cleanliness", "Community Center Maintenance"],
        icon: "Trees",
      },
      {
        id: "SAFETY_ENCROACHMENT",
        label: "Civic Safety & Encroachment",
        labelHi: "सुरक्षा एवं अवैध अतिक्रमण",
        subcategories: ["Footpath / Road Encroachment", "Illegal Parking", "Public Nuisance", "CCTV Camera Request"],
        icon: "ShieldAlert",
      },
      {
        id: "OTHER_CIVIC_ISSUES",
        label: "Other Constituency Issues",
        labelHi: "अन्य नागरिक समस्या",
        subcategories: ["General Public Request", "Administrative Delay", "Other Citizen Concern"],
        icon: "HelpCircle",
      },
    ];

    res.json({
      success: true,
      data: {
        categories,
        priorities: ["LOW", "MEDIUM", "HIGH", "URGENT"],
        departments,
        voterWard: voter?.ward || null,
        tenant,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── 22. POST Upload Evidence / Attachment for Grievance ─────
router.post(
  "/grievances/upload",
  requireVoterAuth,
  grievanceUploader.single("file"),
  async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: "No file uploaded." });
        return;
      }
      const fileUrl = getUploadPath(req.file.filename, "grievances");
      res.json({
        success: true,
        data: {
          fileUrl,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          fileType: req.file.mimetype,
        },
        message: "Evidence file uploaded successfully.",
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── 23. POST Submit Grievance to Constituent Tenant ─────────
router.post(
  "/grievances",
  requireVoterAuth,
  async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!;
      const voterId = req.voterId!;
      const {
        subject,
        category,
        subcategory,
        description,
        priority = "MEDIUM",
        locationAddress,
        departmentId,
        attachments = [],
      } = req.body;

      if (!subject || !subject.trim()) {
        res.status(400).json({ success: false, message: "Subject / Issue title is required." });
        return;
      }
      if (!category || !category.trim()) {
        res.status(400).json({ success: false, message: "Category is required." });
        return;
      }
      if (!description || !description.trim()) {
        res.status(400).json({ success: false, message: "Grievance description is required." });
        return;
      }

      // Fetch voter to get ward and constituent profile
      const voter = await prisma.voter.findUnique({
        where: { id: voterId },
        include: {
          ward: true,
        },
      });

      if (!voter || voter.tenantId !== tenantId) {
        res.status(404).json({ success: false, message: "Constituent voter record not found in this constituency." });
        return;
      }

      const voterAccount = req.voterAccountId
        ? await prisma.voterAccount.findUnique({ where: { id: req.voterAccountId } })
        : null;

      // Determine wardId
      let wardId = voter.wardId;
      if (!wardId) {
        const fallbackWard = await prisma.ward.findFirst({
          where: { tenantId },
          select: { id: true },
        });
        if (!fallbackWard) {
          res.status(400).json({ success: false, message: "No wards configured in this constituency to route the grievance." });
          return;
        }
        wardId = fallbackWard.id;
      }

      // Validate department if provided
      let validDepartmentId: string | null = null;
      if (departmentId) {
        const dept = await prisma.department.findFirst({
          where: { id: departmentId, tenantId, isActive: true, isDeleted: false },
        });
        if (dept) {
          validDepartmentId = dept.id;
        }
      }

      // Generate Ticket Number
      const ticketNumber = await generateTicketNumber(tenantId);

      // SLA calculation
      const safePriority = (["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)
        ? priority
        : "MEDIUM") as GrievancePriority;

      const slaDetails = await calculateGrievanceSla(
        tenantId,
        validDepartmentId,
        safePriority,
        new Date()
      );

      const complainantPhone = voterAccount?.mobile || voter.phone || "";
      const complainantName = voter.name;
      const complainantAddress = voter.address || "";

      const grievance = await prisma.grievance.create({
        data: {
          tenantId,
          ticketNumber,
          subject: subject.trim(),
          category: category.trim(),
          subcategory: subcategory?.trim() || null,
          description: description.trim(),
          wardId,
          priority: safePriority,
          status: "OPEN",
          source: "VOTER_PORTAL",
          departmentId: validDepartmentId,
          complainantName,
          complainantPhone,
          complainantEmail: null,
          complainantAddress,
          locationAddress: locationAddress?.trim() || voter.address || null,
          slaStartedAt: slaDetails.slaStartedAt,
          slaHoursApplied: slaDetails.slaHoursApplied,
          expectedResolutionDate: slaDetails.expectedResolutionDate,
          timeline: {
            create: {
              tenantId,
              action: "CREATED",
              toStatus: "OPEN",
              comment: "Grievance filed by constituent via Voter Portal (नागरिक पोर्टल द्वारा शिकायत दर्ज की गई)",
              changedBy: complainantName,
              metadata: {
                voterId: voter.id,
                voterAccountId: req.voterAccountId,
                membershipId: req.membershipId,
                source: "VOTER_PORTAL",
              },
            },
          },
          attachments:
            Array.isArray(attachments) && attachments.length > 0
              ? {
                  create: attachments.map((att: any) => ({
                    tenantId,
                    fileUrl: att.fileUrl,
                    fileName: att.fileName || "evidence_document",
                    fileType: att.fileType || "image",
                    fileSize: att.fileSize || 0,
                    classification: "DOCUMENT",
                  })),
                }
              : undefined,
        },
        include: {
          ward: { select: { id: true, name: true, wardNumber: true } },
          department: { select: { id: true, name: true, code: true } },
          timeline: { orderBy: { createdAt: "asc" } },
          attachments: true,
        },
      });

      res.status(201).json({
        success: true,
        data: grievance,
        message: `Grievance submitted successfully. Ticket Number: ${ticketNumber}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── 24. GET Voter's Submitted Grievances ────────────────────
router.get(
  "/grievances/my",
  requireVoterAuth,
  async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!;
      const voterId = req.voterId!;

      const [voter, voterAccount] = await Promise.all([
        prisma.voter.findUnique({ where: { id: voterId } }),
        req.voterAccountId
          ? prisma.voterAccount.findUnique({ where: { id: req.voterAccountId } })
          : null,
      ]);

      const phoneCandidates = [
        voterAccount?.mobile,
        voter?.phone,
      ].filter(Boolean) as string[];

      const phoneFilters = phoneCandidates.map((p) => {
        const clean = p.replace(/\D/g, "");
        const last10 = clean.slice(-10);
        return { complainantPhone: { contains: last10 } };
      });

      const orConditions: any[] = [];
      if (phoneFilters.length > 0) {
        orConditions.push(...phoneFilters);
      }
      if (req.voterAccountId) {
        orConditions.push({
          timeline: {
            some: {
              metadata: {
                path: ["voterAccountId"],
                equals: req.voterAccountId,
              },
            },
          },
        });
      }

      if (orConditions.length === 0) {
        res.json({
          success: true,
          data: [],
          stats: { total: 0, open: 0, inProgress: 0, resolved: 0, rejected: 0 },
        });
        return;
      }

      const grievances = await prisma.grievance.findMany({
        where: {
          tenantId,
          isDeleted: false,
          OR: orConditions,
        },
        include: {
          ward: { select: { id: true, name: true, wardNumber: true } },
          department: { select: { id: true, name: true, code: true } },
          timeline: { orderBy: { createdAt: "asc" } },
          attachments: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const stats = {
        total: grievances.length,
        open: grievances.filter((g) => g.status === "OPEN").length,
        inProgress: grievances.filter((g) => g.status === "IN_PROGRESS" || g.status === "ESCALATED").length,
        resolved: grievances.filter((g) => g.status === "RESOLVED" || g.status === "CLOSED").length,
        rejected: grievances.filter((g) => g.status === "REJECTED").length,
      };

      res.json({
        success: true,
        data: grievances,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── 25. GET Single Grievance Details ─────────────────────────
router.get(
  "/grievances/:id",
  requireVoterAuth,
  async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!;
      const grievanceId = String(req.params.id);

      const grievance = await prisma.grievance.findFirst({
        where: {
          id: grievanceId,
          tenantId,
          isDeleted: false,
        },
        include: {
          ward: { select: { id: true, name: true, wardNumber: true } },
          department: { select: { id: true, name: true, code: true } },
          assignedTo: { select: { name: true, role: true } },
          timeline: { orderBy: { createdAt: "asc" } },
          attachments: true,
        },
      });

      if (!grievance) {
        res.status(404).json({ success: false, message: "Grievance record not found in this constituency." });
        return;
      }

      res.json({
        success: true,
        data: grievance,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
