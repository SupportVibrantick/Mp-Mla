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
      },
    });

    if (!voter) {
      res.status(404).json({ success: false, message: "Voter profile not found." });
      return;
    }

    const accountForceChange = voter.accountMemberships[0]?.voterAccount?.forcePasswordChange;
    const forcePasswordChange = accountForceChange !== undefined ? accountForceChange : voter.forcePasswordChange;

    res.json({
      success: true,
      data: {
        ...voter,
        forcePasswordChange,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── 9. Update Voter Profile Details ────────────────────────
router.put("/profile", requireVoterAuth, async (req: VoterAuthRequest, res: Response, next: NextFunction) => {
  try {
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
        // Update account mobile if not colliding with another existing mobile
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

export default router;
