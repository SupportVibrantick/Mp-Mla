import prisma from "../../../lib/prisma.js";

/**
 * Recompute ward aggregate fields (totalPopulation, etc.)
 * from its active areas. Called after any area create/update/delete.
 */
export async function recomputeWardAggregates(wardId: string) {
  const areas = await prisma.wardArea.findMany({
    where: { wardId, isActive: true },
    select: {
      population: true,
      households: true,
      maleCount: true,
      femaleCount: true,
    },
  });

  await prisma.ward.update({
    where: { id: wardId },
    data: {
      totalPopulation: areas.reduce((s, a) => s + a.population, 0),
      totalHouseholds: areas.reduce((s, a) => s + a.households, 0),
      totalMale: areas.reduce((s, a) => s + a.maleCount, 0),
      totalFemale: areas.reduce((s, a) => s + a.femaleCount, 0),
      totalAreas: areas.length,
    },
  });
}

/**
 * Recompute the ward-level Demographics record (wardAreaId=null)
 * by aggregating all area-level Demographics records.
 */
export async function recomputeWardDemographics(wardId: string) {
  const areaDemos = await prisma.demographics.findMany({
    where: { wardId, wardAreaId: { not: null } },
  });

  if (areaDemos.length === 0) return;

  const aggregated = {
    totalPopulation: areaDemos.reduce((s, d) => s + d.totalPopulation, 0),
    maleCount: areaDemos.reduce((s, d) => s + d.maleCount, 0),
    femaleCount: areaDemos.reduce((s, d) => s + d.femaleCount, 0),
    transgenderCount: areaDemos.reduce((s, d) => s + d.transgenderCount, 0),
    age0to6: areaDemos.reduce((s, d) => s + d.age0to6, 0),
    age7to18: areaDemos.reduce((s, d) => s + d.age7to18, 0),
    age19to35: areaDemos.reduce((s, d) => s + d.age19to35, 0),
    age36to60: areaDemos.reduce((s, d) => s + d.age36to60, 0),
    age60plus: areaDemos.reduce((s, d) => s + d.age60plus, 0),
    totalHouseholds: areaDemos.reduce((s, d) => s + d.totalHouseholds, 0),
    bplHouseholds: areaDemos.reduce((s, d) => s + d.bplHouseholds, 0),
    aplHouseholds: areaDemos.reduce((s, d) => s + d.aplHouseholds, 0),
    generalCount: areaDemos.reduce((s, d) => s + d.generalCount, 0),
    obcCount: areaDemos.reduce((s, d) => s + d.obcCount, 0),
    scCount: areaDemos.reduce((s, d) => s + d.scCount, 0),
    stCount: areaDemos.reduce((s, d) => s + d.stCount, 0),
    minorityCount: areaDemos.reduce((s, d) => s + d.minorityCount, 0),
    otherCount: areaDemos.reduce((s, d) => s + d.otherCount, 0),
    totalVoters: areaDemos.reduce((s, d) => s + d.totalVoters, 0),
    maleVoters: areaDemos.reduce((s, d) => s + d.maleVoters, 0),
    femaleVoters: areaDemos.reduce((s, d) => s + d.femaleVoters, 0),
  };

  // Weighted average for literacy
  const totalPop = aggregated.totalPopulation || 1;
  const litRates = areaDemos.filter((d) => d.literacyRate !== null);
  let literacyRate: number | null = null;
  let maleLiteracyRate: number | null = null;
  let femaleLiteracyRate: number | null = null;

  if (litRates.length > 0) {
    literacyRate =
      litRates.reduce(
        (s, d) => s + (d.literacyRate || 0) * d.totalPopulation,
        0,
      ) / totalPop;

    const maleLit = litRates.filter((d) => d.maleLiteracyRate !== null);
    if (maleLit.length > 0) {
      const totalMale = aggregated.maleCount || 1;
      maleLiteracyRate =
        maleLit.reduce(
          (s, d) => s + (d.maleLiteracyRate || 0) * d.maleCount,
          0,
        ) / totalMale;
    }

    const femaleLit = litRates.filter((d) => d.femaleLiteracyRate !== null);
    if (femaleLit.length > 0) {
      const totalFemale = aggregated.femaleCount || 1;
      femaleLiteracyRate =
        femaleLit.reduce(
          (s, d) => s + (d.femaleLiteracyRate || 0) * d.femaleCount,
          0,
        ) / totalFemale;
    }
  }

  const updateData = {
    ...aggregated,
    literacyRate,
    maleLiteracyRate,
    femaleLiteracyRate,
    source: "Aggregated from areas",
  };

  const existing = await prisma.demographics.findFirst({
    where: { wardId, wardAreaId: null },
  });

  if (existing) {
    await prisma.demographics.update({
      where: { id: existing.id },
      data: updateData,
    });
  } else {
    await prisma.demographics.create({
      data: {
        wardId,
        wardAreaId: null,
        ...updateData,
        surveyDate: new Date(),
      },
    });
  }
}

/**
 * Build a Demographics record from either user-provided data
 * or auto-estimated from population numbers.
 *
 * @param wardId      - Parent ward ID
 * @param wardAreaId  - null for ward-level, area ID for area-level
 * @param totalPop    - Total population (from area or ward)
 * @param totalMale   - Male count
 * @param totalFemale - Female count
 * @param totalHH     - Household count
 * @param userInput   - Optional explicit demographic data from the request
 */
export function buildDemographicsData(
  wardId: string,
  wardAreaId: string | null,
  totalPop: number,
  totalMale: number,
  totalFemale: number,
  totalHH: number,
  userInput?: Record<string, any> | null,
) {
  // If user provided detailed demographics, merge with population data
  if (userInput && Object.keys(userInput).length > 0) {
    return {
      wardId,
      wardAreaId,
      totalPopulation: totalPop,
      maleCount: totalMale,
      femaleCount: totalFemale,
      totalHouseholds: totalHH,
      age0to6: userInput.age0to6 ?? 0,
      age7to18: userInput.age7to18 ?? 0,
      age19to35: userInput.age19to35 ?? 0,
      age36to60: userInput.age36to60 ?? 0,
      age60plus: userInput.age60plus ?? 0,
      generalCount: userInput.generalCount ?? 0,
      obcCount: userInput.obcCount ?? 0,
      scCount: userInput.scCount ?? 0,
      stCount: userInput.stCount ?? 0,
      minorityCount: userInput.minorityCount ?? 0,
      otherCount: userInput.otherCount ?? 0,
      bplHouseholds: userInput.bplHouseholds ?? 0,
      aplHouseholds: userInput.aplHouseholds ?? 0,
      literacyRate: userInput.literacyRate ?? null,
      maleLiteracyRate: userInput.maleLiteracyRate ?? null,
      femaleLiteracyRate: userInput.femaleLiteracyRate ?? null,
      totalVoters: userInput.totalVoters ?? 0,
      maleVoters: userInput.maleVoters ?? 0,
      femaleVoters: userInput.femaleVoters ?? 0,
      source: userInput.source ?? null,
      notes: userInput.notes ?? null,
      surveyDate: userInput.surveyDate
        ? new Date(userInput.surveyDate)
        : new Date(),
    };
  }

  // Auto-estimate using Indian census average ratios
  return {
    wardId,
    wardAreaId,
    totalPopulation: totalPop,
    maleCount: totalMale,
    femaleCount: totalFemale,
    totalHouseholds: totalHH,
    age0to6: Math.round(totalPop * 0.08),
    age7to18: Math.round(totalPop * 0.18),
    age19to35: Math.round(totalPop * 0.3),
    age36to60: Math.round(totalPop * 0.28),
    age60plus: Math.round(totalPop * 0.16),
    generalCount: Math.round(totalPop * 0.35),
    obcCount: Math.round(totalPop * 0.28),
    scCount: Math.round(totalPop * 0.2),
    stCount: Math.round(totalPop * 0.08),
    minorityCount: Math.round(totalPop * 0.09),
    bplHouseholds: Math.round(totalHH * 0.15),
    aplHouseholds: Math.round(totalHH * 0.85),
    totalVoters: Math.round(totalPop * 0.55),
    maleVoters: Math.round(totalMale * 0.55),
    femaleVoters: Math.round(totalFemale * 0.55),
    source: "Auto-estimated",
    surveyDate: new Date(),
  };
}

/**
 * Shared demographics zod schema for inline use in other schemas.
 */
export { demographicsZodSchema };

import { z } from "zod";

const demographicsZodSchema = z
  .object({
    age0to6: z.number().int().min(0).default(0),
    age7to18: z.number().int().min(0).default(0),
    age19to35: z.number().int().min(0).default(0),
    age36to60: z.number().int().min(0).default(0),
    age60plus: z.number().int().min(0).default(0),
    generalCount: z.number().int().min(0).default(0),
    obcCount: z.number().int().min(0).default(0),
    scCount: z.number().int().min(0).default(0),
    stCount: z.number().int().min(0).default(0),
    minorityCount: z.number().int().min(0).default(0),
    otherCount: z.number().int().min(0).default(0),
    bplHouseholds: z.number().int().min(0).default(0),
    aplHouseholds: z.number().int().min(0).default(0),
    literacyRate: z.number().min(0).max(100).optional(),
    maleLiteracyRate: z.number().min(0).max(100).optional(),
    femaleLiteracyRate: z.number().min(0).max(100).optional(),
    totalVoters: z.number().int().min(0).default(0),
    maleVoters: z.number().int().min(0).default(0),
    femaleVoters: z.number().int().min(0).default(0),
    source: z.string().optional(),
    notes: z.string().optional(),
    surveyDate: z.string().datetime().optional(),
  })
  .optional();
