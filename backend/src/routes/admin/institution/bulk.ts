import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import {
  // normalizeInstitutionCategory,
  // normalizeInstitutionStatus,
  normalizeBoolean,
} from "../../../utils/enumParser.js";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";
import { syncToLeaders } from "./incharges.js";

// If you don't have these normalizers yet, add them to enumParser.ts:
// They just do case-insensitive matching against the valid enum values.
import { InstitutionCategory, InstitutionStatus } from "@prisma/client";
import { requireTenantId } from "../../../utils/tenant.js";
const VALID_CATEGORIES = [
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
  "FIRE_STATION",
  "LAW_OFFICE",
  "GOVT_OFFICE",
  "NGO",
  "GYM",
  "SPORTS_FACILITY",
  "COMMUNITY_HALL",
  "LIBRARY",
  "PUBLIC_LIBRARY",
  "BUS_STAND",
  "PARK",
  "MARKET",
  "RWA",
  "OLD_AGE_HOME",
  "STADIUM",
  "SKILL_DEVELOPMENT_CENTER",
  "CSC_CENTER",
  "OTHER",
];

const VALID_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "UNDER_MAINTENANCE",
  "CLOSED",
  "PROPOSED",
];

function normalizeEnum(
  val: any,
  validValues: string[],
  fallback: string,
): string {
  if (!val) return fallback;
  const s = String(val)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  return validValues.includes(s) ? s : fallback;
}

function safeString(val: any): string | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  return s === "" ? undefined : s;
}

function safeNumber(val: any): number | undefined {
  if (val === undefined || val === null || val === "") return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

function safeDate(val: any): Date | undefined {
  if (!val || val === "") return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

interface FlatRow {
  // Institution fields
  name?: string;
  category?: string;
  subcategory?: string;
  address?: string;
  wardNumber?: string | number;
  contactNo?: string;
  email?: string;
  website?: string;
  status?: string;
  description?: string;
  capacity?: string | number;
  establishedDate?: string;
  // Incharge fields
  inchargeName?: string;
  inchargeDesignation?: string;
  inchargeContactNo?: string;
  inchargeEmail?: string;
  inchargeDateOfBirth?: string;
  inchargeAppointedDate?: string;
  inchargeIsActive?: string | boolean;
  [key: string]: any;
}

/**
 * POST /api/admin/institutions/bulk
 * Bulk imports institutions with incharges from flat JSON array.
 * Rows are grouped by (name + wardNumber). Upserts institution, creates/updates incharges.
 */
export async function bulkCreateInstitutions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const rawRows: FlatRow[] = req.body;

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      res.status(400).json({
        success: false,
        message: "Request body must be a non-empty array.",
      });
      return;
    }

    // Pre-fetch wards for wardNumber -> wardId mapping
    const allWards = await prisma.ward.findMany({
      where: { tenantId },
      select: { id: true, wardNumber: true },
    });
    const wardMap = new Map(allWards.map((w) => [w.wardNumber, w.id]));

    // Group rows by institution identity (name + wardNumber)
    const grouped: Map<string, FlatRow[]> = new Map();
    const skippedRows: any[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const instName = safeString(row.name);
      const wNum =
        row.wardNumber !== undefined && row.wardNumber !== ""
          ? parseInt(String(row.wardNumber), 10)
          : NaN;

      if (!instName) {
        skippedRows.push({
          rowIndex: i + 1,
          error: "Missing required field: name",
        });
        continue;
      }

      // Use name + wardNumber as group key
      const key = `${instName.toLowerCase()}__${isNaN(wNum) ? "noward" : wNum}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row);
    }

    const upsertedInstitutions: any[] = [];
    const errors: any[] = [...skippedRows];

    for (const [groupKey, rows] of grouped.entries()) {
      try {
        const firstRow = rows[0];

        // ── Parse institution fields from first row ──
        const instName = String(firstRow.name).trim();
        const wNum =
          firstRow.wardNumber !== undefined && firstRow.wardNumber !== ""
            ? parseInt(String(firstRow.wardNumber), 10)
            : NaN;

        if (!instName) {
          throw new Error("Missing institution name");
        }

        // Ward lookup
        let wardId: string | null = null;
        if (!isNaN(wNum)) {
          wardId = wardMap.get(wNum) || null;
          if (!wardId) {
            throw new Error(`Ward #${wNum} not found in system`);
          }
        }

        // Get first non-empty value for each institution field across rows
        const getFirst = (field: string): string | undefined => {
          for (const r of rows) {
            const v = safeString(r[field]);
            if (v) return v;
          }
          return undefined;
        };

        const category = normalizeEnum(
          getFirst("category"),
          VALID_CATEGORIES,
          "OTHER",
        );
        const status = normalizeEnum(
          getFirst("status"),
          VALID_STATUSES,
          "ACTIVE",
        );
        const address = getFirst("address");

        if (!address) {
          throw new Error(`Missing required field: address for "${instName}"`);
        }
        if (!wardId) {
          throw new Error(`Missing or invalid wardNumber for "${instName}"`);
        }

        const institutionData = {
          tenantId,
          name: instName,
          category: category as InstitutionCategory,
          subcategory: getFirst("subcategory") || null,
          address,
          wardId,
          contactNo: getFirst("contactNo") || null,
          email: getFirst("email") || null,
          website: getFirst("website") || null,
          status: status as InstitutionStatus,
          description: getFirst("description") || null,
          capacity: safeNumber(getFirst("capacity")) || null,
          establishedDate: safeDate(getFirst("establishedDate")) || null,
        };

        // ── Collect incharges from all rows ──
        const inchargeInputs: {
          name: string;
          designation: string;
          contactNo: string;
          email?: string;
          dateOfBirth?: Date;
          appointedDate?: Date;
          isActive: boolean;
        }[] = [];

        const seenIncharges = new Set<string>();

        for (const r of rows) {
          const icName = safeString(r.inchargeName);
          const icDesignation = safeString(r.inchargeDesignation);
          const icContact = safeString(r.inchargeContactNo);

          if (!icName || !icDesignation || !icContact) continue;

          // Dedupe by name+contact within this institution
          const dedupeKey = `${icName.toLowerCase()}_${icContact}`;
          if (seenIncharges.has(dedupeKey)) continue;
          seenIncharges.add(dedupeKey);

          inchargeInputs.push({
            name: icName,
            designation: icDesignation,
            contactNo: icContact,
            email: safeString(r.inchargeEmail) || undefined,
            dateOfBirth: safeDate(r.inchargeDateOfBirth),
            appointedDate: safeDate(r.inchargeAppointedDate),
            isActive: normalizeBoolean(r.inchargeIsActive) ?? true,
          });
        }

        // ── Transaction: upsert institution + incharges ──
        const result = await prisma.$transaction(async (tx) => {
          // Find existing institution by name + ward
          const existing = await tx.institution.findFirst({
            where: { name: instName, wardId },
            include: { incharges: true },
          });

          let institution;

          if (existing) {
            // Update institution
            institution = await tx.institution.update({
              where: { id: existing.id },
              data: institutionData,
            });

            // Upsert incharges
            for (const ic of inchargeInputs) {
              const existingIc = existing.incharges.find(
                (e) =>
                  e.name.toLowerCase() === ic.name.toLowerCase() &&
                  e.contactNo === ic.contactNo,
              );

              if (existingIc) {
                await tx.incharge.update({
                  where: { id: existingIc.id },
                  data: {
                    designation: ic.designation,
                    email: ic.email,
                    dateOfBirth: ic.dateOfBirth,
                    appointedDate: ic.appointedDate,
                    isActive: ic.isActive,
                  },
                });
              } else {
                await tx.incharge.create({
                  data: {
                    institutionId: existing.id,
                    ...ic,
                  },
                });
              }
            }
          } else {
            // Create institution with incharges
            institution = await tx.institution.create({
              data: {
                ...institutionData,
                ...(inchargeInputs.length > 0
                  ? {
                      incharges: {
                        createMany: { data: inchargeInputs },
                      },
                    }
                  : {}),
              },
            });
          }

          return { institution, isUpdate: !!existing };
        });

        // Sync incharges to Leaders
        const allIncharges = await prisma.incharge.findMany({
          where: { institutionId: result.institution.id },
        });
        for (const ic of allIncharges) {
          await syncToLeaders(ic, wardId);
        }

        // Audit log (outside transaction to not block on failure)
        try {
          await createAuditLog({
            userId: req.user!.id,
            action: result.isUpdate ? "UPDATE" : "CREATE",
            module: "institutions",
            recordId: result.institution.id,
            description: `Bulk ${result.isUpdate ? "updated" : "created"} institution "${instName}" with ${inchargeInputs.length} incharge(s)`,
            newData: {
              name: instName,
              category,
              wardId,
              incharges: inchargeInputs.length,
            },
            ...getRequestMeta(req),
          });
        } catch (_auditErr) {
          // Don't fail the import for audit errors
        }

        upsertedInstitutions.push(result.institution);
      } catch (err: any) {
        errors.push({
          institution: rows[0]?.name || "Unknown",
          wardNumber: rows[0]?.wardNumber || "",
          error: err.message || "Failed to upsert institution",
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk import completed. Upserted ${upsertedInstitutions.length} institutions. ${errors.length > 0 ? `Failed ${errors.length}.` : ""}`,
      data: {
        upsertedCount: upsertedInstitutions.length,
        failedCount: errors.length,
        errors,
      },
    });

    // Log data activity (fire-and-forget)
    prisma.dataActivity.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        userName: req.user!.name || "Unknown",
        action: "IMPORT",
        module: "institutions",
        recordCount: upsertedInstitutions.length,
        details: `Bulk imported ${upsertedInstitutions.length} institutions (${errors.length} failed)`,
      },
    }).catch(() => {});

    // Send admin notification (fire-and-forget)
    sendAdminNotification(
        tenantId,
      `Data Import: institutions by ${req.user!.name || "Unknown"}`,
      buildActivityEmailHtml({
        action: "IMPORT",
        module: "institutions",
        userName: req.user!.name || "Unknown",
        recordCount: upsertedInstitutions.length,
        timestamp: new Date(),
      }),
    );
  } catch (err) {
    next(err);
  }
}
