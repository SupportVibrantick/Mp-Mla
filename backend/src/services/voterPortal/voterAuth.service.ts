import prisma from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiError } from "../../utils/ApiError.js";
import { generateApplicationNumber } from "./applicationNumber.service.js";

const JWT_SECRET = process.env.JWT_SECRET || "mp-mla-secret-key-2026";
const JWT_EXPIRES_IN = "30d";

export interface VoterTokenPayload {
  accountType: "voter";
  voterAccountId: string;
  membershipId: string;
  tenantId: string;
  voterId: string;
}

/**
 * Creates/links a VoterAccount and VoterAccountMembership for a newly created voter.
 * Password is defaulted to applicationNumber.
 */
export async function createVoterAccountForVoter(
  tenantId: string,
  voterId: string,
  applicationNumber: string,
  mobileNumber?: string | null
) {
  const cleanAppNum = applicationNumber.trim().toUpperCase();
  const initialPassword = cleanAppNum;
  const passwordHash = await bcrypt.hash(initialPassword, 10);
  const mobile = mobileNumber && mobileNumber.trim() ? mobileNumber.trim() : `APP_${cleanAppNum}`;

  // Find or create VoterAccount by mobile
  let account = await prisma.voterAccount.findUnique({
    where: { mobile },
  });

  if (!account) {
    account = await prisma.voterAccount.create({
      data: {
        mobile,
        passwordHash,
        forcePasswordChange: true,
      },
    });
  }

  // Create membership for this tenant & voter
  const membership = await prisma.voterAccountMembership.upsert({
    where: {
      tenantId_voterId: { tenantId, voterId },
    },
    update: {
      voterAccountId: account.id,
    },
    create: {
      voterAccountId: account.id,
      tenantId,
      voterId,
    },
  });

  return { account, membership };
}

/**
 * Search voter applications by EPIC Number.
 * Returns all matching applications across active constituencies.
 */
export async function searchApplicationByEpic(epicNumber: string, tenantId?: string) {
  const cleanEpic = epicNumber.trim().toUpperCase();
  const where: any = {
    voterIdNumber: { equals: cleanEpic, mode: "insensitive" },
    isDeleted: false,
  };
  if (tenantId) where.tenantId = tenantId;

  const voters = await prisma.voter.findMany({
    where,
    include: {
      tenant: { select: { id: true, name: true, constituencyName: true } },
      ward: { select: { id: true, name: true, wardNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (voters.length === 0) {
    throw ApiError.notFound("No voter application found matching this EPIC number.");
  }

  return voters.map((voter) => ({
    applicationNumber: voter.applicationNumber,
    name: voter.name,
    constituencyName: voter.tenant?.constituencyName || voter.tenant?.name || "",
    tenantId: voter.tenantId,
    wardName: voter.ward ? `Ward #${voter.ward.wardNumber} - ${voter.ward.name}` : null,
  }));
}

/**
 * Login with Application Number + Password
 */
export async function loginWithApplicationNumber(
  applicationNumber: string,
  passwordInput: string,
  tenantId?: string
) {
  const cleanAppNum = applicationNumber.trim().toUpperCase();
  const cleanPassword = passwordInput.trim();

  const where: any = {
    applicationNumber: cleanAppNum,
    isDeleted: false,
  };
  if (tenantId) where.tenantId = tenantId;

  let voter = await prisma.voter.findFirst({
    where,
    include: {
      tenant: { select: { id: true, name: true, constituencyName: true } },
      accountMemberships: {
        include: {
          voterAccount: true,
        },
      },
    },
  });

  if (!voter) {
    throw ApiError.unauthorized("Invalid Application Number or Password");
  }

  // Auto-heal: If voter account membership is missing, create it automatically if initial password matches
  if (voter.accountMemberships.length === 0) {
    if (cleanPassword.toUpperCase() === cleanAppNum) {
      await createVoterAccountForVoter(voter.tenantId, voter.id, voter.applicationNumber!, voter.phone);
      voter = await prisma.voter.findFirst({
        where: { id: voter.id },
        include: {
          tenant: { select: { id: true, name: true, constituencyName: true } },
          accountMemberships: {
            include: {
              voterAccount: true,
            },
          },
        },
      });
    }
  }

  if (!voter || voter.accountMemberships.length === 0) {
    throw ApiError.unauthorized("Invalid Application Number or Password");
  }

  const membership = voter.accountMemberships[0];
  const account = membership.voterAccount;

  if (account.status !== "ACTIVE") {
    throw ApiError.forbidden("Your voter portal account is deactivated or suspended.");
  }

  let isMatch = false;

  // If initial password change is pending, allow login with applicationNumber as default password
  if (account.forcePasswordChange && cleanPassword.toUpperCase() === cleanAppNum) {
    isMatch = true;
    const newHash = await bcrypt.hash(cleanAppNum, 10);
    await prisma.voterAccount.update({
      where: { id: account.id },
      data: { passwordHash: newHash },
    });
  } else {
    isMatch = await bcrypt.compare(cleanPassword, account.passwordHash);
    if (!isMatch && cleanPassword.toUpperCase() === cleanAppNum) {
      isMatch = await bcrypt.compare(cleanPassword.toUpperCase(), account.passwordHash);
    }
  }

  if (!isMatch) {
    throw ApiError.unauthorized("Invalid Application Number or Password");
  }

  const forcePasswordChange = account.forcePasswordChange || voter.forcePasswordChange;

  const token = jwt.sign(
    {
      accountType: "voter",
      voterAccountId: account.id,
      membershipId: membership.id,
      tenantId: voter.tenantId,
      voterId: voter.id,
    } as VoterTokenPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  await prisma.voterAccount.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    accessToken: token,
    forcePasswordChange,
    voter: {
      id: voter.id,
      name: voter.name,
      applicationNumber: voter.applicationNumber,
      voterIdNumber: voter.voterIdNumber,
      tenantId: voter.tenantId,
      constituencyName: voter.tenant.constituencyName || voter.tenant.name,
    },
  };
}

/**
 * Login with Mobile Number + Password
 */
export async function loginWithMobile(mobileNumber: string, passwordInput: string) {
  const cleanMobile = mobileNumber.trim();
  const account = await prisma.voterAccount.findUnique({
    where: { mobile: cleanMobile },
    include: {
      memberships: {
        include: {
          tenant: { select: { id: true, name: true, constituencyName: true } },
          voter: { select: { id: true, name: true, applicationNumber: true, voterIdNumber: true, isDeleted: true } },
        },
      },
    },
  });

  if (!account) {
    throw ApiError.unauthorized("Invalid Mobile Number or Password");
  }

  if (account.status !== "ACTIVE") {
    throw ApiError.forbidden("Your voter account is suspended or deactivated.");
  }

  const isMatch = await bcrypt.compare(passwordInput, account.passwordHash);
  if (!isMatch) {
    throw ApiError.unauthorized("Invalid Mobile Number or Password");
  }

  const activeMemberships = account.memberships.filter((m) => m.voter && !m.voter.isDeleted);
  if (activeMemberships.length === 0) {
    throw ApiError.notFound("No active voter profile associated with this mobile number.");
  }

  // If multiple profiles exist, prompt user to select profile
  if (activeMemberships.length > 1) {
    return {
      requiresProfileSelection: true,
      voterAccountId: account.id,
      profiles: activeMemberships.map((m) => ({
        membershipId: m.id,
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        constituencyName: m.tenant.constituencyName,
        voterName: m.voter.name,
        applicationNumber: m.voter.applicationNumber,
      })),
    };
  }

  const membership = activeMemberships[0];
  const token = jwt.sign(
    {
      accountType: "voter",
      voterAccountId: account.id,
      membershipId: membership.id,
      tenantId: membership.tenantId,
      voterId: membership.voterId,
    } as VoterTokenPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  await prisma.voterAccount.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    requiresProfileSelection: false,
    accessToken: token,
    forcePasswordChange: account.forcePasswordChange,
    voter: {
      id: membership.voter.id,
      name: membership.voter.name,
      applicationNumber: membership.voter.applicationNumber,
      voterIdNumber: membership.voter.voterIdNumber,
      tenantId: membership.tenantId,
      constituencyName: membership.tenant.constituencyName || membership.tenant.name,
    },
  };
}

/**
 * Select Constituency Profile when mobile is linked to multiple tenant profiles
 */
export async function selectVoterProfile(voterAccountId: string, membershipId: string) {
  const membership = await prisma.voterAccountMembership.findFirst({
    where: { id: membershipId, voterAccountId },
    include: {
      tenant: { select: { id: true, name: true, constituencyName: true } },
      voter: { select: { id: true, name: true, applicationNumber: true, voterIdNumber: true, isDeleted: true } },
      voterAccount: true,
    },
  });

  if (!membership || !membership.voter || membership.voter.isDeleted) {
    throw ApiError.notFound("Invalid profile selection.");
  }

  const token = jwt.sign(
    {
      accountType: "voter",
      voterAccountId: membership.voterAccountId,
      membershipId: membership.id,
      tenantId: membership.tenantId,
      voterId: membership.voterId,
    } as VoterTokenPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    accessToken: token,
    forcePasswordChange: membership.voterAccount.forcePasswordChange,
    voter: {
      id: membership.voter.id,
      name: membership.voter.name,
      applicationNumber: membership.voter.applicationNumber,
      voterIdNumber: membership.voter.voterIdNumber,
      tenantId: membership.tenantId,
      constituencyName: membership.tenant.constituencyName || membership.tenant.name,
    },
  };
}

/**
 * Send Password Reset OTP to mobile
 */
export async function sendPasswordResetOtp(mobileNumber: string) {
  const cleanMobile = mobileNumber.trim();
  const account = await prisma.voterAccount.findUnique({
    where: { mobile: cleanMobile },
  });

  if (!account) {
    // Return success to prevent mobile enumeration attack
    return { success: true, message: "If an account exists for this mobile number, an OTP code has been sent." };
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await bcrypt.hash(otpCode, 8);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.voterOtp.create({
    data: {
      mobile: cleanMobile,
      purpose: "PASSWORD_RESET",
      codeHash,
      expiresAt,
    },
  });

  // In development, log the OTP code. In production, integrate SMS provider.
  console.log(`[VOTER OTP] Mobile: ${cleanMobile}, OTP: ${otpCode}`);

  return {
    success: true,
    message: "OTP code sent to mobile number.",
    devOtp: process.env.NODE_ENV === "development" ? otpCode : undefined,
  };
}

/**
 * Verify OTP and Reset Password
 */
export async function verifyOtpAndResetPassword(mobileNumber: string, otpCode: string, newPassword: string) {
  const cleanMobile = mobileNumber.trim();
  const otpRecord = await prisma.voterOtp.findFirst({
    where: {
      mobile: cleanMobile,
      purpose: "PASSWORD_RESET",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    throw ApiError.badRequest("Invalid or expired OTP code.");
  }

  const isMatch = await bcrypt.compare(otpCode, otpRecord.codeHash);
  if (!isMatch) {
    await prisma.voterOtp.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });
    throw ApiError.badRequest("Invalid OTP code.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.voterAccount.update({
    where: { mobile: cleanMobile },
    data: {
      passwordHash,
      forcePasswordChange: false,
      passwordChangedAt: new Date(),
    },
  });

  await prisma.voterOtp.delete({ where: { id: otpRecord.id } });

  return { success: true, message: "Password reset successfully. You can now login with your new password." };
}

/**
 * Change Password (for logged in voter or force password change flow)
 */
export async function changeVoterPassword(voterAccountId: string, currentPassword: string, newPassword: string) {
  const account = await prisma.voterAccount.findUnique({
    where: { id: voterAccountId },
  });

  if (!account) {
    throw ApiError.notFound("Account not found.");
  }

  let isMatch = await bcrypt.compare(currentPassword, account.passwordHash);

  // If forcePasswordChange is true, allow currentPassword to match initial applicationNumber
  if (!isMatch && account.forcePasswordChange) {
    const membership = await prisma.voterAccountMembership.findFirst({
      where: { voterAccountId },
      include: { voter: { select: { applicationNumber: true } } },
    });
    if (
      membership?.voter?.applicationNumber &&
      currentPassword.trim().toUpperCase() === membership.voter.applicationNumber.toUpperCase()
    ) {
      isMatch = true;
    }
  }

  if (!isMatch) {
    throw ApiError.badRequest("Current password is incorrect.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.voterAccount.update({
    where: { id: voterAccountId },
    data: {
      passwordHash,
      forcePasswordChange: false,
      passwordChangedAt: new Date(),
    },
  });

  // Sync forcePasswordChange: false to all linked Voter records
  const memberships = await prisma.voterAccountMembership.findMany({
    where: { voterAccountId },
    select: { voterId: true },
  });
  if (memberships.length > 0) {
    await prisma.voter.updateMany({
      where: { id: { in: memberships.map((m) => m.voterId) } },
      data: { forcePasswordChange: false },
    });
  }

  return { success: true, message: "Password updated successfully." };
}
