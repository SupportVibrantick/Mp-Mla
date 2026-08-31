export async function startAadhaarVerification(
  voterId: string,
  aadhaarNumber: string,
  tenantId: string,
): Promise<any> {
  throw new Error("AADHAAR_PROVIDER_NOT_CONFIGURED");
}

export async function verifyAadhaarOtp(
  verificationId: string,
  otp: string,
  tenantId: string,
): Promise<any> {
  throw new Error("AADHAAR_PROVIDER_NOT_CONFIGURED");
}
