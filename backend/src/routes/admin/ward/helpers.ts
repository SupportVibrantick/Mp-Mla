import prisma from "../../../lib/prisma.js";
import { syncVoterDemographics } from "../voterList/demographicsSync.js";
import { z } from "zod";

/**
 * Recompute ward aggregate fields (totalAreas)
 * from its active areas. Called after any area create/update/delete.
 */
export async function recomputeWardAggregates(wardId: string) {
  const activeAreaCount = await prisma.wardArea.count({
    where: { wardId, isActive: true },
  });

  await prisma.ward.update({
    where: { id: wardId },
    data: {
      totalAreas: activeAreaCount,
    },
  });
}

/**
 * Synchronize authoritative ward population metrics (totalPopulation, maleCount, femaleCount, totalHouseholds)
 * into the ward-level Demographics record (wardAreaId=null).
 */
export async function syncWardDemographicsFromWard(
  tenantId: string,
  wardId: string,
) {
  const ward = await prisma.ward.findFirst({
    where: { id: wardId, tenantId },
    select: {
      totalPopulation: true,
      totalHouseholds: true,
      totalMale: true,
      totalFemale: true,
    },
  });

  if (!ward) return;

  const existing = await prisma.demographics.findFirst({
    where: { tenantId, wardId, wardAreaId: null },
  });

  const data = {
    totalPopulation: ward.totalPopulation || 0,
    maleCount: ward.totalMale || 0,
    femaleCount: ward.totalFemale || 0,
    totalHouseholds: ward.totalHouseholds || 0,
  };

  if (existing) {
    await prisma.demographics.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.demographics.create({
      data: {
        tenantId,
        wardId,
        wardAreaId: null,
        ...data,
        source: "Authoritative Ward Population",
        surveyDate: new Date(),
      },
    });
  }

  await syncVoterDemographics(tenantId, wardId);
}

/**
 * Recompute the ward-level Demographics record (wardAreaId=null)
 * by aggregating all area-level Demographics records for survey/census data,
 * and syncing actual voter counts from the Voter table.
 */
export async function recomputeWardDemographics(wardId: string) {
  const ward = await prisma.ward.findUnique({
    where: { id: wardId },
    select: {
      tenantId: true,
      totalPopulation: true,
      totalHouseholds: true,
      totalMale: true,
      totalFemale: true,
    },
  });
  if (!ward) return;
  const tenantId = ward.tenantId;

  const areaDemos = await prisma.demographics.findMany({
    where: { tenantId, wardId, wardAreaId: { not: null } },
  });

  if (areaDemos.length === 0) {
    await syncWardDemographicsFromWard(tenantId, wardId);
    return;
  }
  const sum = (field: keyof (typeof areaDemos)[0]) =>
    areaDemos.reduce((s, d) => s + (Number(d[field]) || 0), 0);

  const aggregated = {
    totalPopulation: ward.totalPopulation > 0 ? ward.totalPopulation : sum("totalPopulation"),
    maleCount: ward.totalMale > 0 ? ward.totalMale : sum("maleCount"),
    femaleCount: ward.totalFemale > 0 ? ward.totalFemale : sum("femaleCount"),
    transgenderCount: sum("transgenderCount"),
    age0to6: sum("age0to6"),
    age7to18: sum("age7to18"),
    age19to35: sum("age19to35"),
    age36to60: sum("age36to60"),
    age60plus: sum("age60plus"),
    totalHouseholds: ward.totalHouseholds > 0 ? ward.totalHouseholds : sum("totalHouseholds"),
    bplHouseholds: sum("bplHouseholds"),
    aplHouseholds: sum("aplHouseholds"),
    generalCount: sum("generalCount"),
    obcCount: sum("obcCount"),
    scCount: sum("scCount"),
    stCount: sum("stCount"),
    minorityCount: sum("minorityCount"),
    otherCount: sum("otherCount"),
    // Religion
    hinduCount: sum("hinduCount"),
    muslimCount: sum("muslimCount"),
    sikhCount: sum("sikhCount"),
    christianCount: sum("christianCount"),
    buddhistCount: sum("buddhistCount"),
    jainCount: sum("jainCount"),
    otherReligionCount: sum("otherReligionCount"),
    totalBirths: sum("totalBirths"),
    totalDeaths: sum("totalDeaths"),
  };

  // Weighted literacy
  const totalPop = aggregated.totalPopulation || 1;
  const litRates = areaDemos.filter((d) => d.literacyRate !== null);
  let literacyRate: number | null = null;
  if (litRates.length > 0) {
    literacyRate =
      litRates.reduce(
        (s, d) => s + (d.literacyRate || 0) * d.totalPopulation,
        0,
      ) / totalPop;
  }

  const existing = await prisma.demographics.findFirst({
    where: { tenantId, wardId, wardAreaId: null },
  });

  const data = { ...aggregated, literacyRate, source: "Aggregated from areas" };

  if (existing) {
    await prisma.demographics.update({ where: { id: existing.id }, data });
  } else {
    await prisma.demographics.create({
      data: { tenantId, wardId, wardAreaId: null, ...data, surveyDate: new Date() },
    });
  }

  // Sync actual voter counts from Voter table
  await syncVoterDemographics(tenantId, wardId);
}

/**
 * Build a Demographics record from user-provided input or auto-estimated numbers.
 * Derived voter fields (totalVoters, maleVoters, femaleVoters) are strictly excluded from user input.
 */
export function buildDemographicsData(
  tenantId: string,
  wardId: string,
  wardAreaId: string | null,
  totalPop: number,
  totalMale: number,
  totalFemale: number,
  totalHH: number,
  userInput?: Record<string, any> | null,
) {
  const cleanInput = { ...(userInput || {}) };

  // Never accept system-derived voter values from frontend input
  delete cleanInput.totalVoters;
  delete cleanInput.maleVoters;
  delete cleanInput.femaleVoters;

  return {
    tenantId,
    wardId,
    wardAreaId,

    // Authoritative population values
    totalPopulation: Number(totalPop) || 0,
    maleCount: Number(totalMale) || 0,
    femaleCount: Number(totalFemale) || 0,
    totalHouseholds: Number(totalHH) || 0,

    // Age
    age0to6: Number(cleanInput.age0to6) || 0,
    age7to18: Number(cleanInput.age7to18) || 0,
    age19to35: Number(cleanInput.age19to35) || 0,
    age36to60: Number(cleanInput.age36to60) || 0,
    age60plus: Number(cleanInput.age60plus) || 0,

    // Caste
    generalCount: Number(cleanInput.generalCount) || 0,
    obcCount: Number(cleanInput.obcCount) || 0,
    scCount: Number(cleanInput.scCount) || 0,
    stCount: Number(cleanInput.stCount) || 0,
    minorityCount: Number(cleanInput.minorityCount) || 0,
    otherCount: Number(cleanInput.otherCount) || 0,

    // Religion
    hinduCount: Number(cleanInput.hinduCount) || 0,
    muslimCount: Number(cleanInput.muslimCount) || 0,
    sikhCount: Number(cleanInput.sikhCount) || 0,
    christianCount: Number(cleanInput.christianCount) || 0,
    buddhistCount: Number(cleanInput.buddhistCount) || 0,
    jainCount: Number(cleanInput.jainCount) || 0,
    otherReligionCount: Number(cleanInput.otherReligionCount) || 0,

    // Economic
    bplHouseholds: Number(cleanInput.bplHouseholds) || 0,
    aplHouseholds: Number(cleanInput.aplHouseholds) || 0,

    // Literacy
    literacyRate:
      cleanInput.literacyRate !== undefined && cleanInput.literacyRate !== null
        ? Number(cleanInput.literacyRate)
        : null,
    maleLiteracyRate:
      cleanInput.maleLiteracyRate !== undefined && cleanInput.maleLiteracyRate !== null
        ? Number(cleanInput.maleLiteracyRate)
        : null,
    femaleLiteracyRate:
      cleanInput.femaleLiteracyRate !== undefined && cleanInput.femaleLiteracyRate !== null
        ? Number(cleanInput.femaleLiteracyRate)
        : null,

    // Derived/recorded metrics
    newVotersCount: Number(cleanInput.newVotersCount) || 0,
    totalBirths: Number(cleanInput.totalBirths) || 0,
    totalDeaths: Number(cleanInput.totalDeaths) || 0,

    // Meta
    source: cleanInput.source || "Pending Survey Data",
    notes: cleanInput.notes || null,
    surveyDate: cleanInput.surveyDate
      ? new Date(cleanInput.surveyDate)
      : new Date(),
  };
}

/**
 * Shared demographics zod schema for inline use in other schemas.
 */
export const demographicsZodSchema = z
  .object({
    // Age
    age0to6: z.number().int().min(0).default(0),
    age7to18: z.number().int().min(0).default(0),
    age19to35: z.number().int().min(0).default(0),
    age36to60: z.number().int().min(0).default(0),
    age60plus: z.number().int().min(0).default(0),
    // Caste
    generalCount: z.number().int().min(0).default(0),
    obcCount: z.number().int().min(0).default(0),
    scCount: z.number().int().min(0).default(0),
    stCount: z.number().int().min(0).default(0),
    minorityCount: z.number().int().min(0).default(0),
    otherCount: z.number().int().min(0).default(0),
    // Religion
    hinduCount: z.number().int().min(0).default(0),
    muslimCount: z.number().int().min(0).default(0),
    sikhCount: z.number().int().min(0).default(0),
    christianCount: z.number().int().min(0).default(0),
    buddhistCount: z.number().int().min(0).default(0),
    jainCount: z.number().int().min(0).default(0),
    otherReligionCount: z.number().int().min(0).default(0),
    // Economic
    bplHouseholds: z.number().int().min(0).default(0),
    aplHouseholds: z.number().int().min(0).default(0),
    // Literacy
    literacyRate: z.number().min(0).max(100).optional(),
    maleLiteracyRate: z.number().min(0).max(100).optional(),
    femaleLiteracyRate: z.number().min(0).max(100).optional(),
    newVotersCount: z.number().int().min(0).optional(),
    totalBirths: z.number().int().min(0).default(0),
    totalDeaths: z.number().int().min(0).default(0),
    // Meta
    source: z.string().optional(),
    notes: z.string().optional(),
    surveyDate: z.string().datetime().optional(),
  })
  .optional();
