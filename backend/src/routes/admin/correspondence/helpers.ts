import prisma from "../../../lib/prisma.js";
import { CorrespondenceType } from "@prisma/client";

const TYPE_PREFIX: Record<CorrespondenceType, string> = {
  LETTER: "LET",
  APPLICATION: "APP",
  REQUEST: "REQ",
  REPRESENTATION: "REP",
  COMPLAINT: "COM",
  RECOMMENDATION: "REC",
  OTHER: "OTH",
};

/**
 * Generate a unique reference number based on type and calendar year
 */
export async function generateReferenceNumber(
  tenantId: string,
  type: CorrespondenceType
): Promise<string> {
  const prefix = TYPE_PREFIX[type] || "COR";
  const year = new Date().getFullYear();

  // Count existing records of this type and year in tenant
  const count = await prisma.correspondence.count({
    where: {
      tenantId,
      type,
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lte: new Date(`${year}-12-31T23:59:59.999Z`),
      },
    },
  });

  const sequentialNumber = String(count + 1).padStart(6, "0");
  return `${prefix}-${year}-${sequentialNumber}`;
}
