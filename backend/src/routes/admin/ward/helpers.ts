import prisma from "../../../lib/prisma.js";
import { syncVoterDemographics } from "../voterList/demographicsSync.js";
import { z } from "zod";

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
 * by aggregating all area-level Demographics records for survey/census data,
 * and syncing actual voter counts from the Voter table.
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

    // Sync actual voter counts from Voter table
    await syncVoterDemographics(tenantId, wardId);
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
 * Build a Demographics record from either user-provided data
 * or auto-estimated from population numbers.
 * Derived voter fields (totalVoters, maleVoters, femaleVoters, newVotersCount)
 * are excluded from user input and auto-estimation.
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
    const {
      totalVoters,
      maleVoters,
      femaleVoters,
      ...cleanInput
    } = userInput;

    return {
      wardId,
      tenantId,
      wardAreaId,
      totalPopulation: totalPop,
      maleCount: totalMale,
      femaleCount: totalFemale,
      totalHouseholds: totalHH,
      // Age
      age0to6: cleanInput.age0to6 ?? 0,
      age7to18: cleanInput.age7to18 ?? 0,
      age19to35: cleanInput.age19to35 ?? 0,
      age36to60: cleanInput.age36to60 ?? 0,
      age60plus: cleanInput.age60plus ?? 0,
      // Caste
      generalCount: cleanInput.generalCount ?? 0,
      obcCount: cleanInput.obcCount ?? 0,
      scCount: cleanInput.scCount ?? 0,
      stCount: cleanInput.stCount ?? 0,
      minorityCount: cleanInput.minorityCount ?? 0,
      otherCount: cleanInput.otherCount ?? 0,
      // Religion
      hinduCount: cleanInput.hinduCount ?? 0,
      muslimCount: cleanInput.muslimCount ?? 0,
      sikhCount: cleanInput.sikhCount ?? 0,
      christianCount: cleanInput.christianCount ?? 0,
      buddhistCount: cleanInput.buddhistCount ?? 0,
      jainCount: cleanInput.jainCount ?? 0,
      otherReligionCount: cleanInput.otherReligionCount ?? 0,
      // Economic
      bplHouseholds: cleanInput.bplHouseholds ?? 0,
      aplHouseholds: cleanInput.aplHouseholds ?? 0,
      // Literacy
      literacyRate: cleanInput.literacyRate ?? null,
      maleLiteracyRate: cleanInput.maleLiteracyRate ?? null,
      femaleLiteracyRate: cleanInput.femaleLiteracyRate ?? null,
      newVotersCount: cleanInput.newVotersCount ?? 0,
      totalBirths: cleanInput.totalBirths ?? 0,
      totalDeaths: cleanInput.totalDeaths ?? 0,
      // Meta
      source: cleanInput.source ?? null,
      notes: cleanInput.notes ?? null,
      surveyDate: cleanInput.surveyDate
        ? new Date(cleanInput.surveyDate)
        : new Date(),
    };
  }

  // Default values when no survey data is provided (all 0/null until survey data exists)
  return {
    wardId,
    tenantId,
    wardAreaId,
    totalPopulation: totalPop,
    maleCount: totalMale,
    femaleCount: totalFemale,
    totalHouseholds: totalHH,
    // Age
    age0to6: 0,
    age7to18: 0,
    age19to35: 0,
    age36to60: 0,
    age60plus: 0,
    // Caste
    generalCount: 0,
    obcCount: 0,
    scCount: 0,
    stCount: 0,
    minorityCount: 0,
    otherCount: 0,
    // Religion
    hinduCount: 0,
    muslimCount: 0,
    sikhCount: 0,
    christianCount: 0,
    buddhistCount: 0,
    jainCount: 0,
    otherReligionCount: 0,
    // Economic
    bplHouseholds: 0,
    aplHouseholds: 0,
    literacyRate: null,
    maleLiteracyRate: null,
    femaleLiteracyRate: null,
    newVotersCount: 0,
    totalBirths: 0,
    totalDeaths: 0,
    source: "Pending Survey Data",
    surveyDate: new Date(),
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
    // Voters (optional derived fields, excluded from manual mutation)
    totalVoters: z.number().int().min(0).optional(),
    maleVoters: z.number().int().min(0).optional(),
    femaleVoters: z.number().int().min(0).optional(),
    newVotersCount: z.number().int().min(0).optional(),
    totalBirths: z.number().int().min(0).default(0),
    totalDeaths: z.number().int().min(0).default(0),
    // Meta
    source: z.string().optional(),
    notes: z.string().optional(),
    surveyDate: z.string().datetime().optional(),
  })
  .optional();
