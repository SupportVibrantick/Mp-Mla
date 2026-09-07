import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { VoterTokenPayload } from "../services/voterPortal/voterAuth.service.js";

const JWT_SECRET = process.env.JWT_SECRET || "mp-mla-secret-key-2026";

export interface VoterAuthRequest extends Request {
  voterAuth?: VoterTokenPayload;
  voterAccountId?: string;
  membershipId?: string;
  tenantId?: string;
  voterId?: string;
}

export interface AuthenticatedVoterRequest extends VoterAuthRequest {}

/**
 * Middleware to authenticate Voter JWT tokens and inject req.voterAuth context.
 */
export async function authenticateVoter(
  req: VoterAuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Authentication required. Please log in.");
    }

    const token = authHeader.split(" ")[1];
    let payload: VoterTokenPayload;

    try {
      payload = jwt.verify(token, JWT_SECRET) as VoterTokenPayload;
    } catch {
      throw ApiError.unauthorized("Session expired or invalid token. Please log in again.");
    }

    if (payload.accountType !== "voter") {
      throw ApiError.forbidden("Access denied. Invalid token type.");
    }

    // Verify membership exists and is valid
    const membership = await prisma.voterAccountMembership.findUnique({
      where: { id: payload.membershipId },
      include: {
        voter: true,
        voterAccount: true,
      },
    });

    if (
      !membership ||
      !membership.voter ||
      membership.voter.isDeleted ||
      membership.voterAccount.status !== "ACTIVE"
    ) {
      throw ApiError.unauthorized("Voter account is inactive or profile has been removed.");
    }

    req.voterAuth = payload;
    req.voterAccountId = payload.voterAccountId;
    req.membershipId = payload.membershipId;
    req.tenantId = payload.tenantId;
    req.voterId = payload.voterId;

    next();
  } catch (error) {
    next(error);
  }
}

export const requireVoterAuth = authenticateVoter;
