import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "@/utils/catchAsync.js";
import {
  normalizeLeaderCategory,
  normalizeBoolean,
} from "../../../utils/enumParser.js";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";
import { requireTenantId } from "../../../utils/tenant.js";

const VALID_RELATIONS = [
  "Supporter",
  "Neutral",
  "Alliance",
  "Opposition",
  "Other",
];
const VALID_INFLUENCES = ["High", "Medium", "Low"];
const VALID_GENDERS = ["Male", "Female", "Other"];

function normalizeFromList(val: any, list: string[]): string | undefined {
  if (!val) return undefined;
  const s = String(val).trim();
  const found = list.find((v) => v.toLowerCase() === s.toLowerCase());
  return found || undefined;
}

/**
 * POST /api/admin/leaders/bulk
 * Bulk imports leaders with upsert logic by name+phone or email.
 */
export const bulkCreateLeaders = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const leaders = req.body;

    if (!Array.isArray(leaders) || leaders.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid data format. Expected a non-empty array.",
      });
    }

    let upsertedCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    // Pre-fetch all wards for wardNumber -> wardId mapping
    const allWards = await prisma.ward.findMany({
      where: { tenantId },
      select: { id: true, wardNumber: true },
    });
    const wardMap = new Map(allWards.map((w) => [w.wardNumber, w.id]));

    for (let rowIndex = 0; rowIndex < leaders.length; rowIndex++) {
      const row = leaders[rowIndex];
      try {
        const {
          name,
          category,
          designation,
          organization,
          partyName,
          dateOfBirth,
          gender,
          address,
          wardNumber,
          phone,
          altPhone,
          email,
          whatsapp,
          facebookUrl,
          twitterUrl,
          instagramUrl,
          relation,
          influence,
          notes,
          tags,
          isActive,
        } = row;

        // ── Validate required fields ──
        if (!name || !String(name).trim()) {
          throw new Error("Missing required field: name");
        }
        if (!dateOfBirth) {
          throw new Error("Missing required field: dateOfBirth");
        }

        // ── Safe converters ──
        const safeString = (val: any): string | undefined =>
          val !== undefined && val !== null && String(val).trim() !== ""
            ? String(val).trim()
            : undefined;

        const safeDate = (val: any): Date | undefined => {
          if (!val) return undefined;
          const d = new Date(val);
          if (isNaN(d.getTime())) return undefined;
          return d;
        };

        // ── Parse dateOfBirth strictly ──
        const parsedDob = safeDate(dateOfBirth);
        if (!parsedDob) {
          throw new Error(
            `Invalid dateOfBirth: "${dateOfBirth}". Use YYYY-MM-DD format.`,
          );
        }

        // ── Ward lookup ──
        let wardId: string | null = null;
        if (
          wardNumber !== undefined &&
          wardNumber !== null &&
          wardNumber !== ""
        ) {
          const wNum = parseInt(String(wardNumber), 10);
          if (isNaN(wNum)) {
            throw new Error(`Invalid wardNumber: "${wardNumber}"`);
          }
          wardId = wardMap.get(wNum) || null;
          if (!wardId) {
            throw new Error(`Ward #${wNum} not found in system`);
          }
        }

        // ── Normalize enums ──
        const normalizedCategory = normalizeLeaderCategory(category) || "OTHER";
        const normalizedRelation = normalizeFromList(relation, VALID_RELATIONS);
        const normalizedInfluence = normalizeFromList(
          influence,
          VALID_INFLUENCES,
        );
        const normalizedGender = normalizeFromList(gender, VALID_GENDERS);

        // ── Parse tags ──
        let parsedTags: string[] = [];
        if (tags) {
          if (Array.isArray(tags)) {
            parsedTags = tags.map(String);
          } else if (typeof tags === "string" && tags.trim()) {
            parsedTags = tags
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean);
          }
        }

        const leaderData = {
          tenantId,
          name: String(name).trim(),
          category: normalizedCategory,
          designation: safeString(designation),
          organization: safeString(organization),
          partyName: safeString(partyName),
          dateOfBirth: parsedDob,
          gender: normalizedGender,
          address: safeString(address),
          wardId,
          phone: safeString(phone),
          altPhone: safeString(altPhone),
          email: safeString(email),
          whatsapp: safeString(whatsapp),
          facebookUrl: safeString(facebookUrl),
          twitterUrl: safeString(twitterUrl),
          instagramUrl: safeString(instagramUrl),
          relation: normalizedRelation,
          influence: normalizedInfluence,
          notes: safeString(notes),
          tags: parsedTags,
          isActive: normalizeBoolean(isActive) ?? true,
        };

        // ── Find existing: match by (name + phone) or by email ──
        const orConditions: any[] = [];

        const sPhone = safeString(phone);
        const sEmail = safeString(email);

        if (sPhone) {
          orConditions.push({ name: leaderData.name, phone: sPhone });
        }
        if (sEmail) {
          orConditions.push({ email: sEmail });
        }

        let existing = null;
        if (orConditions.length > 0) {
          existing = await prisma.leader.findFirst({
            where: { tenantId, OR: orConditions },
          });
        }

        if (existing) {
          await prisma.leader.update({
            where: { id: existing.id },
            data: leaderData,
          });
        } else {
          await prisma.leader.create({
            data: leaderData,
          });
        }

        upsertedCount++;
      } catch (error: any) {
        failedCount++;
        errors.push({
          rowIndex: rowIndex + 1,
          name: row?.name || "Unknown",
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk import completed. Upserted ${upsertedCount} leaders. Failed ${failedCount}.`,
      data: { upsertedCount, failedCount, errors },
    });

    // Log data activity (fire-and-forget)
    prisma.dataActivity.create({
      data: {
        tenantId,
        userId: req.user!.id,
        userName: req.user!.name || "Unknown",
        action: "IMPORT",
        module: "leaders",
        recordCount: upsertedCount,
        details: `Bulk imported ${upsertedCount} leaders (${failedCount} failed)`,
      },
    }).catch(() => {});

    // Send admin notification (fire-and-forget)
    sendAdminNotification(
      `Data Import: leaders by ${req.user!.name || "Unknown"}`,
      buildActivityEmailHtml({
        action: "IMPORT",
        module: "leaders",
        userName: req.user!.name || "Unknown",
        recordCount: upsertedCount,
        timestamp: new Date(),
      }),
    );
  },
);
