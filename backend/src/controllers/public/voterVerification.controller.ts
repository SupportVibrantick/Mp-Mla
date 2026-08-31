import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/ApiError.js";
import * as voterService from "../../services/voterVerification/voterVerification.service.js";
import * as aadhaarService from "../../services/voterVerification/aadhaarVerification.service.js";

function maskEpicNumber(epic: string): string {
  if (epic.length <= 5) return epic;
  return epic.substring(0, 3) + "*".repeat(epic.length - 5) + epic.substring(epic.length - 2);
}

export const searchVoter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { epicNumber, tenantId } = req.body;
    if (!epicNumber || !tenantId) {
      throw ApiError.badRequest("EPIC number and Tenant ID are required");
    }

    const voter = await voterService.findVoter(epicNumber, tenantId);
    if (!voter) {
      throw ApiError.notFound("Voter record not found");
    }

    res.json({
      success: true,
      data: {
        id: voter.id,
        name: voter.name,
        relativeName: voter.relativeName || "XXXX",
        age: voter.age,
        gender: voter.gender,
        epicNumber: maskEpicNumber(voter.voterIdNumber),
        phone: voter.phone,
        address: voter.address,
        photoUrl: voter.photoUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const startAadhaarVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { voterId, aadhaarNumber, tenantId } = req.body;
    if (!voterId || !aadhaarNumber || !tenantId) {
      throw ApiError.badRequest("Voter ID, Aadhaar number, and Tenant ID are required");
    }

    try {
      await aadhaarService.startAadhaarVerification(voterId, aadhaarNumber, tenantId);
    } catch (error: any) {
      if (error.message === "AADHAAR_PROVIDER_NOT_CONFIGURED") {
        throw new ApiError(503, "Aadhaar verification service is currently unavailable");
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

export const confirmAadhaarVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: false,
      message: "Aadhaar OTP verification is not available yet.",
    });
  } catch (error) {
    next(error);
  }
};

export const updateVoterDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { voterId } = req.params;
    const { name, relativeName, age, gender, phone, address, tenantId } = req.body;
    if (!voterId || !tenantId) {
      throw ApiError.badRequest("Voter ID and Tenant ID are required");
    }

    const parsedAge = age ? parseInt(age, 10) : undefined;
    const photoFilename = req.file?.filename;

    const updatedVoter = await voterService.updateVoter(
      voterId as string,
      tenantId as string,
      {
        name,
        relativeName,
        age: parsedAge,
        gender,
        phone,
        address,
      },
      photoFilename,
    );

    res.json({
      success: true,
      message: "Voter details updated successfully",
      data: {
        id: updatedVoter.id,
        name: updatedVoter.name,
        relativeName: updatedVoter.relativeName || "XXXX",
        age: updatedVoter.age,
        gender: updatedVoter.gender,
        epicNumber: maskEpicNumber(updatedVoter.voterIdNumber),
        phone: updatedVoter.phone,
        address: updatedVoter.address,
        photoUrl: updatedVoter.photoUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};
