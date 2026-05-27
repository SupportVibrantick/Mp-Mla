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
  const ward = await prisma.ward.findUnique({
    where: { id: wardId },
    select: { tenantId: true },
  });
  if (!ward) return;
  const tenantId = ward.tenantId;

  const areaDemos = await prisma.demographics.findMany({
    where: { tenantId, wardId, wardAreaId: { not: null } },
  });
  type Area = Awaited<ReturnType<typeof prisma.wardArea.findMany>>[number];

  if (areaDemos.length === 0) {
    const areas = await prisma.wardArea.findMany({
      where: { wardId, isActive: true },
    });

    const sum = (field: keyof Area) =>
      areas.reduce((s, a) => s + (Number(a[field]) || 0), 0);
    const data = {
      totalPopulation: sum("population"),
      maleCount: sum("maleCount"),
      femaleCount: sum("femaleCount"),
      totalHouseholds: sum("households"),
      source: "Aggregated from ward areas",
    };
    const existing = await prisma.demographics.findFirst({
      where: { tenantId, wardId, wardAreaId: null },
    });
    if (existing)
      await prisma.demographics.update({ where: { id: existing.id }, data });
    else
      await prisma.demographics.create({
        data: { tenantId, wardId, wardAreaId: null, ...data },
      });
    return;
  }
  const sum = (field: keyof (typeof areaDemos)[0]) =>
    areaDemos.reduce((s, d) => s + (Number(d[field]) || 0), 0);

  const aggregated = {
    totalPopulation: sum("totalPopulation"),
    maleCount: sum("maleCount"),
    femaleCount: sum("femaleCount"),
    transgenderCount: sum("transgenderCount"),
    age0to6: sum("age0to6"),
    age7to18: sum("age7to18"),
    age19to35: sum("age19to35"),
    age36to60: sum("age36to60"),
    age60plus: sum("age60plus"),
    totalHouseholds: sum("totalHouseholds"),
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
    // Voters
    totalVoters: sum("totalVoters"),
    maleVoters: sum("maleVoters"),
    femaleVoters: sum("femaleVoters"),
    newVotersCount: sum("newVotersCount"),
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
  tenantId: string,
  wardId: string,
  wardAreaId: string | null,
  totalPop: number,
  totalMale: number,
  totalFemale: number,
  totalHH: number,
  userInput?: Record<string, any> | null,
) {
  if (userInput && Object.keys(userInput).length > 0) {
    return {
      wardId,
      tenantId,
      wardAreaId,
      totalPopulation: totalPop,
      maleCount: totalMale,
      femaleCount: totalFemale,
      totalHouseholds: totalHH,
      // Age
      age0to6: userInput.age0to6 ?? 0,
      age7to18: userInput.age7to18 ?? 0,
      age19to35: userInput.age19to35 ?? 0,
      age36to60: userInput.age36to60 ?? 0,
      age60plus: userInput.age60plus ?? 0,
      // Caste
      generalCount: userInput.generalCount ?? 0,
      obcCount: userInput.obcCount ?? 0,
      scCount: userInput.scCount ?? 0,
      stCount: userInput.stCount ?? 0,
      minorityCount: userInput.minorityCount ?? 0,
      otherCount: userInput.otherCount ?? 0,
      // Religion
      hinduCount: userInput.hinduCount ?? 0,
      muslimCount: userInput.muslimCount ?? 0,
      sikhCount: userInput.sikhCount ?? 0,
      christianCount: userInput.christianCount ?? 0,
      buddhistCount: userInput.buddhistCount ?? 0,
      jainCount: userInput.jainCount ?? 0,
      otherReligionCount: userInput.otherReligionCount ?? 0,
      // Economic
      bplHouseholds: userInput.bplHouseholds ?? 0,
      aplHouseholds: userInput.aplHouseholds ?? 0,
      // Literacy
      literacyRate: userInput.literacyRate ?? null,
      maleLiteracyRate: userInput.maleLiteracyRate ?? null,
      femaleLiteracyRate: userInput.femaleLiteracyRate ?? null,
      // Voters
      totalVoters: userInput.totalVoters ?? 0,
      maleVoters: userInput.maleVoters ?? 0,
      femaleVoters: userInput.femaleVoters ?? 0,
      newVotersCount: userInput.newVotersCount ?? 0,
      totalBirths: userInput.totalBirths ?? 0,
      totalDeaths: userInput.totalDeaths ?? 0,
      // Meta
      source: userInput.source ?? null,
      notes: userInput.notes ?? null,
      surveyDate: userInput.surveyDate
        ? new Date(userInput.surveyDate)
        : new Date(),
    };
  }

  // Auto-estimate (Indian census 2011 averages)
  return {
    wardId,
    tenantId,
    wardAreaId,
    totalPopulation: totalPop,
    maleCount: totalMale,
    femaleCount: totalFemale,
    totalHouseholds: totalHH,
    // Age
    age0to6: Math.round(totalPop * 0.08),
    age7to18: Math.round(totalPop * 0.18),
    age19to35: Math.round(totalPop * 0.3),
    age36to60: Math.round(totalPop * 0.28),
    age60plus: Math.round(totalPop * 0.16),
    // Caste
    generalCount: Math.round(totalPop * 0.31),
    obcCount: Math.round(totalPop * 0.41),
    scCount: Math.round(totalPop * 0.17),
    stCount: Math.round(totalPop * 0.09),
    minorityCount: Math.round(totalPop * 0.02),
    // Religion (Census 2011 India averages)
    hinduCount: Math.round(totalPop * 0.8),
    muslimCount: Math.round(totalPop * 0.14),
    sikhCount: Math.round(totalPop * 0.02),
    christianCount: Math.round(totalPop * 0.02),
    buddhistCount: Math.round(totalPop * 0.01),
    jainCount: Math.round(totalPop * 0.004),
    otherReligionCount: Math.round(totalPop * 0.006),
    // Economic
    bplHouseholds: Math.round(totalHH * 0.15),
    aplHouseholds: Math.round(totalHH * 0.85),
    // Voters
    totalVoters: Math.round(totalPop * 0.55),
    maleVoters: Math.round(totalMale * 0.55),
    femaleVoters: Math.round(totalFemale * 0.55),
    newVotersCount: Math.round(totalPop * 0.02),
    totalBirths: Math.round(totalPop * 0.018),
    totalDeaths: Math.round(totalPop * 0.007),
    source: "Auto-estimated",
    surveyDate: new Date(),
  };
}

/**
 * Shared demographics zod schema for inline use in other schemas.
 */

import { z } from "zod";

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
    // Voters
    totalVoters: z.number().int().min(0).default(0),
    maleVoters: z.number().int().min(0).default(0),
    femaleVoters: z.number().int().min(0).default(0),
    newVotersCount: z.number().int().min(0).default(0),
    totalBirths: z.number().int().min(0).default(0),
    totalDeaths: z.number().int().min(0).default(0),
    // Meta
    source: z.string().optional(),
    notes: z.string().optional(),
    surveyDate: z.string().datetime().optional(),
  })
  .optional();
