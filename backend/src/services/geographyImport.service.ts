import prisma from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { Prisma } from "@prisma/client";
import logger from "../utils/logger.js";

interface RowError {
  rowIndex: number;
  field?: string;
  value?: any;
  reason: string;
}

export async function createImportJob(
  tenantId: string,
  type: string,
  fileName: string,
  totalRows: number,
  userId?: string,
  userName?: string,
) {
  return prisma.geographyImportJob.create({
    data: {
      tenantId,
      fileName,
      totalRows,
      status: "PENDING",
      uploadedById: userId || null,
      uploadedByName: userName || "System",
      summary: { type },
    },
  });
}

export async function getImportJob(tenantId: string, id: string) {
  const job = await prisma.geographyImportJob.findFirst({
    where: { id, tenantId },
  });
  if (!job) {
    throw ApiError.notFound("Geography import job not found.");
  }
  return job;
}

// Background validation function
export async function startValidationJob(
  jobId: string,
  tenantId: string,
  type: string,
  rows: any[],
) {
  // Run asynchronously
  setTimeout(async () => {
    try {
      await prisma.geographyImportJob.update({
        where: { id: jobId },
        data: { status: "VALIDATING", startedAt: new Date() },
      });

      const errors: RowError[] = [];
      const validatedRows: any[] = [];
      let successCount = 0;
      let failedCount = 0;

      // Pre-load reference maps for validation
      const districts = await prisma.district.findMany({
        where: { tenantId },
        select: { id: true, name: true, code: true },
      });
      const districtMap = new Map(
        districts.map((d) => [d.name.toLowerCase(), d.id]),
      );
      const districtCodeMap = new Map(
        districts.map((d) => [d.code?.toLowerCase(), d.id]),
      );

      const blocks = await prisma.block.findMany({
        where: { tenantId },
        select: { id: true, name: true, districtId: true, code: true },
      });
      const blockMap = new Map(
        blocks.map((b) => [`${b.districtId}__${b.name.toLowerCase()}`, b.id]),
      );

      const constituencies = await prisma.constituency.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      });
      const constituencyMap = new Map(
        constituencies.map((c) => [c.name.toLowerCase(), c.id]),
      );

      const townVillages = await prisma.townVillage.findMany({
        where: { tenantId },
        select: { id: true, name: true, districtId: true, blockId: true },
      });
      const townVillageMap = new Map(
        townVillages.map((v) => [
          `${v.districtId}__${v.blockId || "none"}__${v.name.toLowerCase()}`,
          v.id,
        ]),
      );

      const wards = await prisma.ward.findMany({
        where: { tenantId, isDeleted: false },
        select: { id: true, name: true, wardNumber: true },
      });
      const wardMap = new Map(wards.map((w) => [w.name.toLowerCase(), w.id]));
      const wardNumberMap = new Map(wards.map((w) => [w.wardNumber, w.id]));

      const pollingLocations = await prisma.pollingLocation.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      });
      const pollingLocationMap = new Map(
        pollingLocations.map((p) => [p.name.toLowerCase(), p.id]),
      );

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowIndex = i + 1;

        // Skip empty rows (all values are null/undefined/empty string)
        const rowValues = Object.values(row).map(v => String(v ?? "").trim());
        if (rowValues.every(v => v === "" || v === "undefined" || v === "null")) continue;

        // Skip instruction helper rows (contain keywords like "Required", "Optional", "Dropdown")
        const INSTRUCTION_WORDS = ["required", "optional", "dropdown", "yyyy-mm-dd", "number (", "integer"];
        const lowerJoined = rowValues.join(" ").toLowerCase();
        if (INSTRUCTION_WORDS.some(kw => lowerJoined.includes(kw))) continue;

        try {
          const validatedRow: any = {};

          if (type === "district") {
            const name = String(row.name || "").trim();
            const state = String(row.state || "").trim();
            if (!name) throw new Error("District name is required.");
            if (!state) throw new Error("State is required.");

            validatedRow.name = name;
            validatedRow.state = state;
            validatedRow.code = row.code ? String(row.code).trim() : null;
            validatedRow.latitude = row.latitude
              ? parseFloat(row.latitude)
              : null;
            validatedRow.longitude = row.longitude
              ? parseFloat(row.longitude)
              : null;
            validatedRow.boundary = row.boundary
              ? typeof row.boundary === "string"
                ? JSON.parse(row.boundary)
                : row.boundary
              : null;
          } else if (type === "block") {
            const name = String(row.name || "").trim();
            const districtName = String(row.districtName || "").trim();
            if (!name) throw new Error("Block name is required.");
            if (!districtName) throw new Error("District name is required.");

            const districtId = districtMap.get(districtName.toLowerCase());
            if (!districtId)
              throw new Error(
                `District "${districtName}" not found in this tenant.`,
              );

            validatedRow.name = name;
            validatedRow.districtId = districtId;
            validatedRow.code = row.code ? String(row.code).trim() : null;
            validatedRow.latitude = row.latitude
              ? parseFloat(row.latitude)
              : null;
            validatedRow.longitude = row.longitude
              ? parseFloat(row.longitude)
              : null;
          } else if (type === "ward") {
            const name = String(row.name || "").trim();
            const wardNumber = parseInt(row.wardNumber || row.number, 10);
            if (!name) throw new Error("Ward name is required.");
            if (isNaN(wardNumber))
              throw new Error("Valid ward number is required.");

            let constituencyId = null;
            if (row.constituencyName) {
              constituencyId = constituencyMap.get(
                String(row.constituencyName).toLowerCase(),
              );
              if (!constituencyId)
                throw new Error(
                  `Constituency "${row.constituencyName}" not found.`,
                );
            }

            let townVillageId = null;
            if (row.townVillageName && row.districtName) {
              const districtId = districtMap.get(
                String(row.districtName).toLowerCase(),
              );
              if (districtId)
                townVillageId = townVillageMap.get(
                  `${districtId}__none__${String(row.townVillageName).toLowerCase()}`,
                );
              if (!townVillageId)
                throw new Error(
                  `Town/village "${row.townVillageName}" not found.`,
                );
            }

            validatedRow.name = name;
            validatedRow.wardNumber = wardNumber;
            validatedRow.code = row.code ? String(row.code).trim() : null;
            validatedRow.zone = row.zone ? String(row.zone).trim() : null;
            validatedRow.areaType = row.areaType || "Urban";
            validatedRow.pincode = row.pincode
              ? String(row.pincode).trim()
              : null;
            validatedRow.latitude = row.latitude
              ? parseFloat(row.latitude)
              : null;
            validatedRow.longitude = row.longitude
              ? parseFloat(row.longitude)
              : null;
            validatedRow.constituencyId = constituencyId;
            validatedRow.townVillageId = townVillageId;
          } else if (type === "town-village") {
            const name = String(row.name || "").trim();
            const districtName = String(row.districtName || "").trim();
            if (!name) throw new Error("Town/village name is required.");
            if (!districtName) throw new Error("District name is required.");

            const districtId = districtMap.get(districtName.toLowerCase());
            if (!districtId)
              throw new Error(`District "${districtName}" not found.`);

            let blockId = null;
            if (row.blockName) {
              blockId = blockMap.get(
                `${districtId}__${String(row.blockName).toLowerCase()}`,
              );
              if (!blockId)
                throw new Error(
                  `Block "${row.blockName}" not found in district "${districtName}".`,
                );
            }

            let constituencyId = null;
            if (row.constituencyName) {
              constituencyId = constituencyMap.get(
                String(row.constituencyName).toLowerCase(),
              );
              if (!constituencyId)
                throw new Error(
                  `Constituency "${row.constituencyName}" not found.`,
                );
            }

            validatedRow.name = name;
            validatedRow.districtId = districtId;
            validatedRow.blockId = blockId;
            validatedRow.constituencyId = constituencyId;
            validatedRow.type = row.type === "TOWN" ? "TOWN" : "VILLAGE";
            validatedRow.nature = row.nature === "URBAN" ? "URBAN" : "RURAL";
            validatedRow.code = row.code ? String(row.code).trim() : null;
            validatedRow.description = row.description
              ? String(row.description).trim()
              : null;
            validatedRow.pincode = row.pincode
              ? String(row.pincode).trim()
              : null;
            validatedRow.latitude = row.latitude
              ? parseFloat(row.latitude)
              : null;
            validatedRow.longitude = row.longitude
              ? parseFloat(row.longitude)
              : null;
          } else if (type === "polling-location") {
            const name = String(row.name || "").trim();
            if (!name) throw new Error("Location name is required.");

            validatedRow.name = name;
            validatedRow.address = row.address
              ? String(row.address).trim()
              : null;
            validatedRow.pincode = row.pincode
              ? String(row.pincode).trim()
              : null;
            validatedRow.buildingName = row.buildingName
              ? String(row.buildingName).trim()
              : null;
            validatedRow.landmark = row.landmark
              ? String(row.landmark).trim()
              : null;
            validatedRow.isAccessible =
              row.isAccessible !== undefined ? Boolean(row.isAccessible) : true;
            validatedRow.latitude = row.latitude
              ? parseFloat(row.latitude)
              : null;
            validatedRow.longitude = row.longitude
              ? parseFloat(row.longitude)
              : null;
          } else if (type === "booth") {
            const boothName = String(row.boothName || row.name || "").trim();
            const boothNumber = parseInt(row.boothNumber || row.number, 10);
            const constituencyName = String(row.constituencyName || "").trim();

            if (!boothName) throw new Error("Booth name is required.");
            if (isNaN(boothNumber))
              throw new Error("Valid booth number is required.");
            if (!constituencyName)
              throw new Error("Constituency name is required.");

            const constituencyId = constituencyMap.get(
              constituencyName.toLowerCase(),
            );
            if (!constituencyId)
              throw new Error(`Constituency "${constituencyName}" not found.`);

            let wardId = null;
            if (row.wardName) {
              wardId = wardMap.get(String(row.wardName).toLowerCase());
            } else if (row.wardNumber) {
              wardId = wardNumberMap.get(parseInt(row.wardNumber, 10));
            }

            let townVillageId = null;
            if (row.townVillageName) {
              townVillageId =
                townVillages.find(
                  (v) =>
                    v.name.toLowerCase() ===
                    String(row.townVillageName).toLowerCase(),
                )?.id || null;
            }

            let pollingLocationId = null;
            if (row.pollingLocationName) {
              pollingLocationId = pollingLocationMap.get(
                String(row.pollingLocationName).toLowerCase(),
              );
            }

            validatedRow.boothName = boothName;
            validatedRow.boothNumber = boothNumber;
            validatedRow.constituencyId = constituencyId;
            validatedRow.wardId = wardId;
            validatedRow.townVillageId = townVillageId;
            validatedRow.pollingLocationId = pollingLocationId;
            validatedRow.code = row.code ? String(row.code).trim() : null;
            validatedRow.latitude = row.latitude
              ? parseFloat(row.latitude)
              : null;
            validatedRow.longitude = row.longitude
              ? parseFloat(row.longitude)
              : null;
          } else if (type === "constituency") {
            const name = String(row.name || "").trim();
            if (!name) throw new Error("Constituency name is required.");

            validatedRow.name = name;
            validatedRow.code = row.code ? String(row.code).trim() : null;
            validatedRow.type = ["ASSEMBLY", "PARLIAMENTARY"].includes(row.type)
              ? row.type
              : "ASSEMBLY";
            validatedRow.description = row.description
              ? String(row.description).trim()
              : null;
            validatedRow.latitude = row.latitude
              ? parseFloat(row.latitude)
              : null;
            validatedRow.longitude = row.longitude
              ? parseFloat(row.longitude)
              : null;
          }

          validatedRows.push(validatedRow);
          successCount++;
        } catch (err: any) {
          errors.push({
            rowIndex,
            field: err.field,
            value: row[err.field || ""] || null,
            reason: err.message,
          });
          failedCount++;
        }
      }

      const status =
        failedCount === rows.length
          ? "FAILED"
          : failedCount > 0
            ? "PARTIAL"
            : "PREVIEW";

      await prisma.geographyImportJob.update({
        where: { id: jobId },
        data: {
          status,
          successCount,
          failedCount,
          errors: errors as any,
          summary: { type, validatedRows },
        },
      });
    } catch (err: any) {
      logger.error(`Validation job failed in background: ${err.message}`);
      await prisma.geographyImportJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errors: [{ rowIndex: 0, reason: err.message }] as any,
        },
      });
    }
  }, 100);
}

// Background import confirmation function
export async function startImportExecution(jobId: string, tenantId: string) {
  const job = await prisma.geographyImportJob.findFirst({
    where: { id: jobId, tenantId },
  });
  if (!job) throw ApiError.notFound("Geography import job not found.");
  if (job.status !== "PREVIEW" && job.status !== "PARTIAL") {
    throw ApiError.badRequest(
      `Import job cannot be executed in current status: ${job.status}`,
    );
  }

  // Set to IMPORTING
  await prisma.geographyImportJob.update({
    where: { id: jobId },
    data: { status: "IMPORTING" },
  });

  setTimeout(async () => {
    try {
      const summary = job.summary as any;
      const type = summary.type;
      const validatedRows: any[] = summary.validatedRows || [];

      let importedCount = 0;
      let skippedCount = 0;

      // Executed inside database queries
      for (const row of validatedRows) {
        try {
          if (type === "district") {
            await prisma.district.upsert({
              where: { tenantId_name: { tenantId, name: row.name } },
              update: row,
              create: { ...row, tenantId },
            });
          } else if (type === "block") {
            await prisma.block.upsert({
              where: {
                tenantId_districtId_name: {
                  tenantId,
                  districtId: row.districtId,
                  name: row.name,
                },
              },
              update: row,
              create: { ...row, tenantId },
            });
          } else if (type === "town-village") {
            await prisma.townVillage.upsert({
              where: {
                tenantId_districtId_name: {
                  tenantId,
                  districtId: row.districtId,
                  name: row.name,
                },
              },
              update: row,
              create: { ...row, tenantId },
            });
          } else if (type === "ward") {
            await prisma.ward.upsert({
              where: {
                tenantId_wardNumber: { tenantId, wardNumber: row.wardNumber },
              },
              update: {
                name: row.name,
                code: row.code,
                zone: row.zone,
                areaType: row.areaType,
                pincode: row.pincode,
                latitude: row.latitude,
                longitude: row.longitude,
                boundaryGeoJson: row.boundaryGeoJson,
                constituencyId: row.constituencyId,
                townVillageId: row.townVillageId,
                status: "ACTIVE",
                isDeleted: false,
              },
              create: { ...row, tenantId },
            });
          } else if (type === "polling-location") {
            await prisma.pollingLocation.create({
              data: { ...row, tenantId },
            });
          } else if (type === "booth") {
            await prisma.booth.upsert({
              where: {
                tenantId_constituencyId_boothNumber: {
                  tenantId,
                  constituencyId: row.constituencyId,
                  boothNumber: row.boothNumber,
                },
              },
              update: row,
              create: { ...row, tenantId },
            });
          } else if (type === "constituency") {
            await prisma.constituency.upsert({
              where: { tenantId_name: { tenantId, name: row.name } },
              update: row,
              create: { ...row, tenantId },
            });
          }
          importedCount++;
        } catch (err: any) {
          logger.error(`Failed to import row: ${err.message}`);
          skippedCount++;
        }
      }

      await prisma.geographyImportJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          successCount: importedCount,
          failedCount: job.failedCount + skippedCount,
          completedAt: new Date(),
          summary: {
            type,
            importedCount,
            skippedCount,
          },
        },
      });
    } catch (err: any) {
      logger.error(`Import execution failed: ${err.message}`);
      await prisma.geographyImportJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errors: [{ rowIndex: 0, reason: err.message }] as any,
        },
      });
    }
  }, 100);
}
