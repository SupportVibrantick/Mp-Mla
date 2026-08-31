import prisma from "../../lib/prisma.js";

export async function findVoter(epicNumber: string, tenantId: string) {
  return await prisma.voter.findFirst({
    where: {
      voterIdNumber: {
        equals: epicNumber,
        mode: "insensitive",
      },
      tenantId,
      isDeleted: false,
    },
  });
}

export async function updateVoter(
  voterId: string,
  tenantId: string,
  data: {
    name?: string;
    relativeName?: string;
    age?: number;
    gender?: any;
    phone?: string;
    address?: string;
  },
  photoFilename?: string,
) {
  const updateData: any = { ...data };
  if (photoFilename) {
    updateData.photoUrl = `/uploads/voters/${photoFilename}`;
  }

  return await prisma.voter.update({
    where: {
      id: voterId,
      tenantId,
    },
    data: updateData,
  });
}

export async function createVerification(
  tenantId: string,
  voterId: string,
  method: "AADHAAR_OTP" = "AADHAAR_OTP",
) {
  return await prisma.voterIdentityVerification.create({
    data: {
      tenantId,
      voterId,
      method,
      status: "PENDING",
    },
  });
}

export async function getVerificationStatus(verificationId: string) {
  return await prisma.voterIdentityVerification.findUnique({
    where: { id: verificationId },
  });
}
