import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";

const CATEGORIES = [
  "TEMPLE",
  "MOSQUE",
  "GURUDWARA",
  "CHURCH",
  "HOSPITAL",
  "CLINIC",
  "SCHOOL",
  "COLLEGE",
  "UNIVERSITY",
  "COACHING_CENTER",
  "POLICE_STATION",
  "GOVT_OFFICE",
  "NGO",
  "GYM",
  "SPORTS_FACILITY",
  "COMMUNITY_HALL",
  "LIBRARY",
  "MARKET",
  "RWA",
  "OLD_AGE_HOME",
  "OTHER",
] as const;

const STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "UNDER_MAINTENANCE",
  "CLOSED",
  "PROPOSED",
] as const;

const inchargeInlineSchema = z.object({
  name: z.string().min(1, "Incharge name required"),
  designation: z.string().min(1, "Designation required"),
  contactNo: z.string().min(1, "Contact number required"),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().datetime().optional(),
  appointedDate: z.string().datetime().optional(),
  photoUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const createInstitutionSchema = z.object({
  name: z.string().min(1, "Name is required").max(300),
  category: z.enum(CATEGORIES),
  subcategory: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  wardId: z.string().min(1, "Ward is required"),
  contactNo: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  status: z.enum(STATUSES).default("ACTIVE"),
  description: z.string().optional(),
  photoUrl: z.string().optional(),
  capacity: z.number().int().min(0).optional(),
  establishedDate: z.string().datetime().optional(),
  // Inline incharges
  incharges: z.array(inchargeInlineSchema).optional(),
});

export async function createInstitution(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { incharges, ...data } = req.body;

    // Verify ward
    const ward = await prisma.ward.findUnique({
      where: { id: data.wardId },
    });
    if (!ward) throw ApiError.notFound("Ward not found");

    // Clean data
    if (data.email === "") delete data.email;
    if (data.establishedDate)
      data.establishedDate = new Date(data.establishedDate);

    // Build incharge create data
    const inchargeData = (incharges || []).map((ic: any) => ({
      ...ic,
      email: ic.email === "" ? undefined : ic.email,
      dateOfBirth: ic.dateOfBirth ? new Date(ic.dateOfBirth) : undefined,
      appointedDate: ic.appointedDate ? new Date(ic.appointedDate) : undefined,
    }));

    const institution = await prisma.institution.create({
      data: {
        ...data,
        ...(inchargeData.length > 0
          ? {
              incharges: {
                createMany: { data: inchargeData },
              },
            }
          : {}),
      },
      include: {
        ward: { select: { name: true, wardNumber: true } },
        incharges: true,
        _count: { select: { incharges: true } },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "institutions",
      recordId: institution.id,
      description: `Created institution "${institution.name}" (${institution.category}) in ward "${institution.ward.name}" with ${inchargeData.length} incharge(s)`,
      newData: {
        name: institution.name,
        category: institution.category,
        wardId: institution.wardId,
        incharges: inchargeData.length,
      },
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `"${institution.name}" created with ${inchargeData.length} incharge(s)`,
      data: institution,
    });
  } catch (error) {
    next(error);
  }
}
