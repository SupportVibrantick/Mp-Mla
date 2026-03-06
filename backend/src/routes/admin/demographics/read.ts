import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import { ApiError } from "../../../utils/ApiError.js";
import catchAsync from "@/utils/catchAsync.js";

/**
 * GET /api/admin/demographics/summary
 * Gets constituency-wide demographic summary.
 */
export const summaryDemographics = catchAsync(async (req, res) => {
  // Get all ward-level demographics (wardAreaId = null)
  const wardDemos = await prisma.demographics.findMany({
    where: { wardAreaId: null },
    include: {
      ward: {
        select: {
          id: true,
          name: true,
          wardNumber: true,
          zone: true,
          status: true,
          totalPopulation: true,
          totalHouseholds: true,
          areaType: true,
        },
      },
    },
    orderBy: { ward: { wardNumber: "asc" } },
  });

  // Aggregate totals
  const sum = (field: string) =>
    wardDemos.reduce((s, d) => s + (Number((d as any)[field]) || 0), 0);

  const totals = {
    totalPopulation: sum("totalPopulation"),
    maleCount: sum("maleCount"),
    femaleCount: sum("femaleCount"),
    transgenderCount: sum("transgenderCount"),
    // Age
    age0to6: sum("age0to6"),
    age7to18: sum("age7to18"),
    age19to35: sum("age19to35"),
    age36to60: sum("age36to60"),
    age60plus: sum("age60plus"),
    // Households
    totalHouseholds: sum("totalHouseholds"),
    bplHouseholds: sum("bplHouseholds"),
    aplHouseholds: sum("aplHouseholds"),
    // Caste
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
  };

  // Weighted literacy
  const popWithLit = wardDemos.filter((d) => d.literacyRate !== null);
  let avgLiteracy: number | null = null;
  let avgMaleLiteracy: number | null = null;
  let avgFemaleLiteracy: number | null = null;

  if (popWithLit.length > 0) {
    const totalLitPop = popWithLit.reduce((s, d) => s + d.totalPopulation, 0);
    avgLiteracy =
      popWithLit.reduce(
        (s, d) => s + (d.literacyRate || 0) * d.totalPopulation,
        0,
      ) / (totalLitPop || 1);
    avgMaleLiteracy =
      popWithLit.reduce(
        (s, d) => s + (d.maleLiteracyRate || 0) * d.maleCount,
        0,
      ) / (totals.maleCount || 1);
    avgFemaleLiteracy =
      popWithLit.reduce(
        (s, d) => s + (d.femaleLiteracyRate || 0) * d.femaleCount,
        0,
      ) / (totals.femaleCount || 1);
  }

  // Build chart data
  const genderChart = [
    { label: "Male", value: totals.maleCount, color: "#3b82f6" },
    { label: "Female", value: totals.femaleCount, color: "#ec4899" },
    ...(totals.transgenderCount > 0
      ? [
        {
          label: "Transgender",
          value: totals.transgenderCount,
          color: "#a855f7",
        },
      ]
      : []),
  ];

  const ageChart = [
    { label: "0-6", value: totals.age0to6, color: "#f97316" },
    { label: "7-18", value: totals.age7to18, color: "#3b82f6" },
    { label: "19-35", value: totals.age19to35, color: "#10b981" },
    { label: "36-60", value: totals.age36to60, color: "#f59e0b" },
    { label: "60+", value: totals.age60plus, color: "#8b5cf6" },
  ];

  const religionChart = [
    { label: "Hindu", value: totals.hinduCount, color: "#f97316" },
    { label: "Muslim", value: totals.muslimCount, color: "#16a34a" },
    { label: "Sikh", value: totals.sikhCount, color: "#2563eb" },
    { label: "Christian", value: totals.christianCount, color: "#ef4444" },
    { label: "Buddhist", value: totals.buddhistCount, color: "#ca8a04" },
    { label: "Jain", value: totals.jainCount, color: "#9333ea" },
    {
      label: "Other",
      value: totals.otherReligionCount,
      color: "#6b7280",
    },
  ].filter((r) => r.value > 0);

  const casteChart = [
    { label: "General", value: totals.generalCount, color: "#64748b" },
    { label: "OBC", value: totals.obcCount, color: "#f59e0b" },
    { label: "SC", value: totals.scCount, color: "#3b82f6" },
    { label: "ST", value: totals.stCount, color: "#10b981" },
    { label: "Minority", value: totals.minorityCount, color: "#8b5cf6" },
  ].filter((c) => c.value > 0);

  const economicChart = [
    { label: "BPL", value: totals.bplHouseholds, color: "#ef4444" },
    { label: "APL", value: totals.aplHouseholds, color: "#22c55e" },
  ];

  const voterChart = [
    { label: "Male Voters", value: totals.maleVoters, color: "#3b82f6" },
    {
      label: "Female Voters",
      value: totals.femaleVoters,
      color: "#ec4899",
    },
  ];

  // Ward-wise comparison table
  const wardComparison = wardDemos.map((d) => ({
    wardId: d.ward.id,
    wardName: d.ward.name,
    wardNumber: d.ward.wardNumber,
    zone: d.ward.zone,
    areaType: d.ward.areaType,
    totalPopulation: d.totalPopulation,
    maleCount: d.maleCount,
    femaleCount: d.femaleCount,
    age0to6: d.age0to6,
    age7to18: d.age7to18,
    age19to35: d.age19to35,
    age36to60: d.age36to60,
    age60plus: d.age60plus,
    totalHouseholds: d.totalHouseholds,
    bplHouseholds: d.bplHouseholds,
    aplHouseholds: d.aplHouseholds,
    generalCount: d.generalCount,
    obcCount: d.obcCount,
    scCount: d.scCount,
    stCount: d.stCount,
    minorityCount: d.minorityCount,
    hinduCount: d.hinduCount,
    muslimCount: d.muslimCount,
    sikhCount: d.sikhCount,
    christianCount: d.christianCount,
    buddhistCount: d.buddhistCount,
    jainCount: d.jainCount,
    otherReligionCount: d.otherReligionCount,
    literacyRate: d.literacyRate,
    totalVoters: d.totalVoters,
    maleVoters: d.maleVoters,
    femaleVoters: d.femaleVoters,
    source: d.source,
    surveyDate: d.surveyDate,
  }));

  // Zone-wise aggregation
  const zoneMap: Record<string, typeof wardDemos> = {};
  wardDemos.forEach((d) => {
    const zone = d.ward.zone || "Unzoned";
    if (!zoneMap[zone]) zoneMap[zone] = [];
    zoneMap[zone].push(d);
  });

  const byZone = Object.entries(zoneMap).map(([zone, demos]) => ({
    zone,
    wardCount: demos.length,
    totalPopulation: demos.reduce((s, d) => s + d.totalPopulation, 0),
    maleCount: demos.reduce((s, d) => s + d.maleCount, 0),
    femaleCount: demos.reduce((s, d) => s + d.femaleCount, 0),
    totalVoters: demos.reduce((s, d) => s + d.totalVoters, 0),
    bplHouseholds: demos.reduce((s, d) => s + d.bplHouseholds, 0),
  }));

  res.json({
    success: true,
    data: {
      totals: {
        ...totals,
        literacyRate: avgLiteracy,
        maleLiteracyRate: avgMaleLiteracy,
        femaleLiteracyRate: avgFemaleLiteracy,
      },
      charts: {
        gender: genderChart,
        age: ageChart,
        religion: religionChart,
        caste: casteChart,
        economic: economicChart,
        voter: voterChart,
      },
      wardComparison,
      byZone,
      totalWards: wardDemos.length,
    },
  });
});

/**
 * GET /api/admin/demographics/ward/:wardId
 * Gets demographics for a single ward.
 */
export const getWardDemographics = catchAsync(async (req, res) => {
  const wardId = req.params.wardId as string;

  const ward = await prisma.ward.findUnique({
    where: { id: wardId },
    select: { id: true, name: true, wardNumber: true },
  });
  if (!ward) throw ApiError.notFound("Ward not found");

  const wardLevel = await prisma.demographics.findFirst({
    where: { wardId, wardAreaId: null },
    orderBy: { surveyDate: "desc" },
  });

  const areaLevel = await prisma.demographics.findMany({
    where: { wardId, wardAreaId: { not: null } },
    include: {
      wardArea: { select: { id: true, name: true, areaType: true } },
    },
    orderBy: { wardArea: { name: "asc" } },
  });

  res.json({ success: true, data: { ward, wardLevel, areaLevel } });
});
