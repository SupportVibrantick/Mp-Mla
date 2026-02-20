import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";

const LEADER_CATEGORIES = [
  "PARTY_LEADER",
  "OPPOSITION_LEADER",
  "BUREAUCRAT",
  "COMMUNITY_LEADER",
  "RELIGIOUS_LEADER",
  "BUSINESS_LEADER",
  "MEDIA_PERSON",
  "YOUTH_LEADER",
  "WOMEN_LEADER",
  "SENIOR_CITIZEN",
  "ACADEMIC",
  "LEGAL",
  "MEDICAL",
  "NGO_HEAD",
  "TRADE_UNION",
  "OTHER",
] as const;

export const createSchema = z.object({
  name: z.string().min(1, "Name required"),
  category: z.enum(LEADER_CATEGORIES),
  designation: z.string().optional(),
  organization: z.string().optional(),
  partyName: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth required"),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  photoUrl: z.string().optional(),
  address: z.string().optional(),
  wardId: z.string().optional(),
  phone: z.string().optional(),
  altPhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  whatsapp: z.string().optional(),
  facebookUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  relation: z
    .enum(["Supporter", "Neutral", "Alliance", "Opposition", "Other"])
    .optional(),
  influence: z.enum(["High", "Medium", "Low"]).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function createLeader(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data: any = { ...req.body };

    if (data.email === "") delete data.email;
    data.dateOfBirth = new Date(data.dateOfBirth);

    if (data.wardId) {
      const ward = await prisma.ward.findUnique({
        where: { id: data.wardId },
      });
      if (!ward) throw ApiError.notFound("Ward not found");
    }

    const leader = await prisma.leader.create({
      data,
      include: {
        ward: {
          select: { name: true, wardNumber: true },
        },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "leaders",
      recordId: leader.id,
      description: `Added leader "${leader.name}" (${leader.category})`,
      newData: {
        name: leader.name,
        category: leader.category,
        dateOfBirth: leader.dateOfBirth,
      },
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `"${leader.name}" added`,
      data: leader,
    });
  } catch (error) {
    next(error);
  }
}
