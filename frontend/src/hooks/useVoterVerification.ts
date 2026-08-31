import api from "@/lib/api";

export function useVoterVerification() {
  const searchVoter = async (epicNumber: string, tenantId: string) => {
    const response = await api.post("/public/verify/search", {
      epicNumber,
      tenantId,
    });
    return response.data.data;
  };

  const startAadhaarVerification = async (
    voterId: string,
    aadhaarNumber: string,
    tenantId: string,
  ) => {
    const response = await api.post("/public/verify/aadhaar/start", {
      voterId,
      aadhaarNumber,
      tenantId,
    });
    return response.data.data;
  };

  const verifyAadhaarOtp = async (verificationId: string, otp: string, tenantId: string) => {
    const response = await api.post("/public/verify/aadhaar/confirm", {
      verificationId,
      otp,
      tenantId,
    });
    return response.data.data;
  };

  const updateVoterDetails = async (
    voterId: string,
    formData: FormData,
    tenantId: string,
  ) => {
    if (!formData.has("tenantId")) {
      formData.append("tenantId", tenantId);
    }
    const response = await api.put(`/public/verify/update/${voterId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data.data;
  };

  return {
    searchVoter,
    startAadhaarVerification,
    verifyAadhaarOtp,
    updateVoterDetails,
  };
}
