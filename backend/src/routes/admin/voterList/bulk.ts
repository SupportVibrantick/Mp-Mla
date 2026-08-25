import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import {
  sendAdminNotification,
  buildActivityEmailHtml,
} from "../../../lib/email.js";
import { VoterGender, Prisma } from "@prisma/client";
import logger from "../../../utils/logger.js";
import { syncVoterDemographics } from "./demographicsSync.js";

// ══════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════

const BATCH_SIZE = 5000; // Records per createMany batch
const VALID_GENDERS = ["MALE", "FEMALE", "TRANSGENDER"];
const VALID_RELATION_TYPES = ["F", "H", "M"];

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

function safeString(val: any): string | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  return s === "" ? undefined : s;
}

function safeInt(val: any): number | undefined {
  if (val === undefined || val === null || val === "") return undefined;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? undefined : n;
}

function normalizeBoolean(val: any): boolean {
  if (typeof val === "boolean") return val;
  if (val === undefined || val === null) return false;
  const s = String(val).trim().toLowerCase();
  return ["true", "1", "yes", "y"].includes(s);
}

function normalizeGender(val: any): VoterGender | null {
  if (!val) return null;
  const s = String(val).trim().toUpperCase();
  // Common aliases
  if (s === "M" || s === "MALE") return "MALE";
  if (s === "F" || s === "FEMALE") return "FEMALE";
  if (s === "T" || s === "TRANSGENDER" || s === "TRANS" || s === "OTHER")
    return "TRANSGENDER";
  return VALID_GENDERS.includes(s) ? (s as VoterGender) : null;
}

function normalizeRelationType(val: any): string | null {
  if (!val) return null;
  const s = String(val).trim().toUpperCase();
  if (s === "FATHER" || s === "F") return "F";
  if (s === "HUSBAND" || s === "H") return "H";
  if (s === "MOTHER" || s === "M") return "M";
  return VALID_RELATION_TYPES.includes(s) ? s : null;
}

function getRowValue(row: any, ...aliases: string[]): any {
  if (!row || typeof row !== "object") return undefined;
  for (const alias of aliases) {
    if (
      row[alias] !== undefined &&
      row[alias] !== null &&
      String(row[alias]).trim() !== ""
    ) {
      return row[alias];
    }
  }
  // Try case-insensitive & stripped matching
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const target = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const k of keys) {
      const cleanK = k
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (
        cleanK === target &&
        row[k] !== undefined &&
        row[k] !== null &&
        String(row[k]).trim() !== ""
      ) {
        return row[k];
      }
    }
  }
  return undefined;
}

interface RowError {
  rowIndex: number;
  voterIdNumber?: string;
  field?: string;
  error: string;
}

interface ValidatedVoter {
  tenantId: string;
  wardId: string;
  wardAreaId: string | null;
  voterIdNumber: string;
  slNo: number | null;
  sectionNo: number | null;
  boothNo: number | null;
  name: string;
  relativeName: string | null;
  relationType: string | null;
  gender: VoterGender;
  age: number | null;
  houseNo: string | null;
  address: string | null;
  locality: string | null;
  phone: string | null;
  isDisabled: boolean;
  uploadBatchId: string;
}

// ══════════════════════════════════════════════════════════
// BULK UPLOAD — Scalable for 1M+ records
// POST /api/admin/voter-list/bulk
// ══════════════════════════════════════════════════════════

export async function bulkUploadVoters(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const rawRows: any[] = req.body.rows || req.body;
    const fileName = req.body.fileName || "bulk_upload";

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      res.status(400).json({
        success: false,
        message:
          "Request body must contain a non-empty 'rows' array (or be a JSON array).",
      });
      return;
    }

    // ─── 1. Create BulkUploadJob ──────────────────────────
    const job = await prisma.bulkUploadJob.create({
      data: {
        tenantId,
        module: "voters",
        fileName: safeString(fileName) || "bulk_upload",
        totalRows: rawRows.length,
        status: "VALIDATING",
        startedAt: new Date(),
        uploadedById: req.user?.id || null,
        uploadedByName: req.user?.name || "Unknown",
      },
    });

    // ─── 2. Pre-fetch lookup maps (single queries) ────────
    const [allWards, allAreas, existingVoterIds] = await Promise.all([
      prisma.ward.findMany({
        where: { tenantId },
        select: { id: true, wardNumber: true, name: true },
      }),
      prisma.wardArea.findMany({
        where: { ward: { tenantId } },
        select: { id: true, wardId: true, name: true },
      }),
      prisma.voter.findMany({
        where: { tenantId },
        select: { voterIdNumber: true },
      }),
    ]);

    const wardByNumber = new Map(allWards.map((w) => [w.wardNumber, w]));
    const wardByName = new Map(allWards.map((w) => [w.name.toLowerCase(), w]));
    const areaByWardAndName = new Map(
      allAreas.map((a) => [`${a.wardId}__${a.name.toLowerCase()}`, a.id]),
    );
    const existingIds = new Set(existingVoterIds.map((v) => v.voterIdNumber));

    // ─── 3. Validate all rows ─────────────────────────────
    const errors: RowError[] = [];
    const validRows: ValidatedVoter[] = [];
    const seenInBatch = new Set<string>(); // Track duplicates within this batch
    let duplicateCount = 0;

    // Update job status to PROCESSING
    await prisma.bulkUploadJob.update({
      where: { id: job.id },
      data: { status: "PROCESSING" },
    });

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowIndex = i + 1; // 1-indexed for user-facing errors

      // Required: voterIdNumber
      const voterIdNumber = safeString(
        getRowValue(
          row,
          "voterIdNumber",
          "voterId",
          "epicNo",
          "epicNumber",
          "voter_id_number",
        ),
      );
      if (!voterIdNumber) {
        errors.push({
          rowIndex,
          error: "Missing required field: voterIdNumber (EPIC number)",
        });
        continue;
      }

      // Check duplicate within this batch
      if (seenInBatch.has(voterIdNumber)) {
        errors.push({
          rowIndex,
          voterIdNumber,
          error: "Duplicate voterIdNumber within this upload batch",
        });
        duplicateCount++;
        continue;
      }

      // Check against existing database records
      if (existingIds.has(voterIdNumber)) {
        errors.push({
          rowIndex,
          voterIdNumber,
          error: "Voter ID already exists in the database",
        });
        duplicateCount++;
        continue;
      }

      seenInBatch.add(voterIdNumber);

      // Required: name
      const name = safeString(
        getRowValue(row, "name", "voterName", "voter_name", "fullname"),
      );
      if (!name) {
        errors.push({
          rowIndex,
          voterIdNumber,
          field: "name",
          error: "Missing required field: name",
        });
        continue;
      }

      // Required: gender
      const rawGender = getRowValue(row, "gender", "sex");
      const gender = normalizeGender(rawGender);
      if (!gender) {
        errors.push({
          rowIndex,
          voterIdNumber,
          field: "gender",
          error: `Invalid gender: "${rawGender || ""}". Expected: MALE/M, FEMALE/F, or TRANSGENDER/T`,
        });
        continue;
      }

      // Required: wardNumber (resolve to wardId)
      const rawWardNumber = getRowValue(
        row,
        "wardNumber",
        "wardNo",
        "ward_number",
        "ward",
      );
      let wardId: string | null = null;

      if (
        rawWardNumber !== undefined &&
        rawWardNumber !== null &&
        rawWardNumber !== ""
      ) {
        const wNum = parseInt(String(rawWardNumber), 10);
        if (!isNaN(wNum)) {
          const ward = wardByNumber.get(wNum);
          wardId = ward?.id || null;
        }
        // Try by name if number lookup failed
        if (!wardId) {
          const nameStr = String(rawWardNumber).trim().toLowerCase();
          const ward = wardByName.get(nameStr);
          wardId = ward?.id || null;
        }
      }

      if (!wardId) {
        errors.push({
          rowIndex,
          voterIdNumber,
          field: "wardNumber",
          error: `Ward "${rawWardNumber || ""}" not found. Provide a valid ward number or name.`,
        });
        continue;
      }

      // Optional: wardAreaName → resolve to wardAreaId
      const rawWardAreaName = getRowValue(
        row,
        "wardAreaName",
        "wardArea",
        "ward_area_name",
      );
      let wardAreaId: string | null = null;
      if (rawWardAreaName) {
        const areaName = String(rawWardAreaName).trim().toLowerCase();
        wardAreaId = areaByWardAndName.get(`${wardId}__${areaName}`) || null;
      }

      // Build validated record
      const validated: ValidatedVoter = {
        tenantId,
        wardId,
        wardAreaId,
        voterIdNumber,
        slNo:
          safeInt(
            getRowValue(row, "slNo", "serialNo", "sl_no", "sno", "srno"),
          ) ?? null,
        sectionNo:
          safeInt(getRowValue(row, "sectionNo", "section_no", "section")) ??
          null,
        boothNo:
          safeInt(getRowValue(row, "boothNo", "booth_no", "booth")) ?? null,
        name,
        relativeName:
          safeString(
            getRowValue(
              row,
              "relativeName",
              "guardianName",
              "fatherName",
              "husbandName",
            ),
          ) || null,
        relationType: normalizeRelationType(
          getRowValue(row, "relationType", "relation"),
        ),
        gender,
        age: safeInt(getRowValue(row, "age")) ?? null,
        houseNo:
          safeString(getRowValue(row, "houseNo", "hNo", "house_no")) || null,
        address: safeString(getRowValue(row, "address", "fullAddress")) || null,
        locality:
          safeString(getRowValue(row, "locality", "area", "colony")) || null,
        phone:
          safeString(getRowValue(row, "phone", "mobile", "contact")) || null,
        isDisabled: normalizeBoolean(
          getRowValue(row, "isDisabled", "disabled", "is_disabled"),
        ),
        uploadBatchId: job.id,
      };

      validRows.push(validated);
    }

    // ─── 4. Batch insert valid rows using createMany ──────
    let successCount = 0;
    const batchErrors: RowError[] = [];

    if (validRows.length > 0) {
      // Split into chunks of BATCH_SIZE
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const chunk = validRows.slice(i, i + BATCH_SIZE);
        const chunkStart = i;

        try {
          const result = await prisma.voter.createMany({
            data: chunk,
            skipDuplicates: true, // Extra safety for race conditions
          });

          successCount += result.count;

          // If some were skipped (race condition duplicates)
          const skippedInChunk = chunk.length - result.count;
          if (skippedInChunk > 0) {
            duplicateCount += skippedInChunk;
          }
        } catch (err: any) {
          logger.error(
            `Bulk voter upload batch failed (rows ${chunkStart + 1}-${chunkStart + chunk.length}): ${err.message}`,
          );
          for (let j = 0; j < chunk.length; j++) {
            batchErrors.push({
              rowIndex: chunkStart + j + 1,
              voterIdNumber: chunk[j].voterIdNumber,
              error: `Batch insert failed: ${err.message}`,
            });
          }
        }

        // Update progress
        await prisma.bulkUploadJob.update({
          where: { id: job.id },
          data: {
            processedRows: Math.min(i + BATCH_SIZE, validRows.length),
          },
        });
      }
    }

    // Merge all errors
    const allErrors = [...errors, ...batchErrors];

    // ─── 5. Update job record ─────────────────────────────
    const finalStatus =
      allErrors.length === 0
        ? "COMPLETED"
        : successCount > 0
          ? "COMPLETED_WITH_ERRORS"
          : "FAILED";

    // Only store first 1000 errors to prevent JSON bloat
    const storedErrors = allErrors.slice(0, 1000);

    const summary = {
      totalRows: rawRows.length,
      validRows: validRows.length,
      successCount,
      failedCount: allErrors.length,
      duplicateCount,
      validationErrors: errors.length,
      batchInsertErrors: batchErrors.length,
    };

    await prisma.bulkUploadJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus as any,
        processedRows: rawRows.length,
        successCount,
        failedCount: allErrors.length,
        duplicateCount,
        errors: storedErrors as unknown as Prisma.InputJsonValue,
        summary,
        completedAt: new Date(),
      },
    });

    // ─── 6. Auto-update Demographics voter counts ─────────
    if (successCount > 0) {
      await syncVoterDemographics(tenantId);
    }

    // ─── 7. Respond ───────────────────────────────────────
    res.status(200).json({
      success: true,
      message: `Bulk upload completed. ${successCount} voters added.${allErrors.length > 0 ? ` ${allErrors.length} failed.` : ""}${duplicateCount > 0 ? ` ${duplicateCount} duplicates skipped.` : ""}`,
      data: {
        jobId: job.id,
        ...summary,
        errors: storedErrors,
        hasMoreErrors: allErrors.length > 1000,
      },
    });

    // ─── 8. Fire-and-forget: audit log + data activity + notification ──
    createAuditLog({
      userId: req.user!.id,
      action: "IMPORT",
      module: "voter_list",
      recordId: job.id,
      description: `Bulk uploaded ${successCount} voters (${allErrors.length} failed, ${duplicateCount} duplicates)`,
      newData: summary,
      ...getRequestMeta(req),
    }).catch(() => {});

    prisma.dataActivity
      .create({
        data: {
          tenantId,
          userId: req.user!.id,
          userName: req.user!.name || "Unknown",
          action: "IMPORT",
          module: "voter_list",
          recordCount: successCount,
          fileName: safeString(fileName),
          details: `Bulk imported ${successCount} voters (${allErrors.length} failed, ${duplicateCount} duplicates)`,
        },
      })
      .catch(() => {});

    sendAdminNotification(
      tenantId,
      `Voter List Import: ${successCount} voters by ${req.user!.name || "Unknown"}`,
      buildActivityEmailHtml({
        action: "IMPORT",
        module: "voter_list",
        userName: req.user!.name || "Unknown",
        recordCount: successCount,
        timestamp: new Date(),
      }),
    ).catch(() => {});
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// LIST BULK UPLOAD JOBS
// GET /api/admin/voter-list/bulk/jobs
// ══════════════════════════════════════════════════════════

export async function listBulkJobs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      prisma.bulkUploadJob.findMany({
        where: { tenantId, module: "voters" },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          fileName: true,
          status: true,
          totalRows: true,
          processedRows: true,
          successCount: true,
          failedCount: true,
          duplicateCount: true,
          summary: true,
          uploadedByName: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
      }),
      prisma.bulkUploadJob.count({
        where: { tenantId, module: "voters" },
      }),
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// GET BULK JOB DETAILS
// GET /api/admin/voter-list/bulk/jobs/:jobId
// ══════════════════════════════════════════════════════════

export async function getBulkJob(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const jobId = req.params.jobId as string;

    const job = await prisma.bulkUploadJob.findFirst({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      res.status(404).json({ success: false, message: "Upload job not found" });
      return;
    }

    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
}
