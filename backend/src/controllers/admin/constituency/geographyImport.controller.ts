import { Request, Response } from "express";
import ExcelJS from "exceljs";
import prisma from "../../../lib/prisma.js";
import * as importService from "../../../services/geographyImport.service.js";
import catchAsync from "../../../utils/catchAsync.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

export const uploadImportData = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const { type, rows, fileName } = req.body;

  if (!type || !Array.isArray(rows) || rows.length === 0) {
    throw ApiError.badRequest("Invalid request body. 'type' and a non-empty 'rows' array are required.");
  }

  const job = await importService.createImportJob(
    tenantId,
    type,
    fileName || "import_data",
    rows.length,
    req.user?.id,
    req.user?.name
  );

  // Kick off async background validation
  await importService.startValidationJob(job.id, tenantId, type, rows);

  await createAuditLog({
    userId: req.user!.id,
    tenantId,
    action: "CREATE",
    module: "geography-import",
    recordId: job.id,
    description: `Initiated geographic import job for type "${type}" (${rows.length} rows)`,
    ...getRequestMeta(req),
  });

  res.status(201).json(ApiResponse.created({
    jobId: job.id,
    status: job.status,
    totalRows: job.totalRows,
  }, "Geography import file uploaded and validation started in background."));
});

export const getImportStatus = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const id = req.params.id as string;

  const job = await importService.getImportJob(tenantId, id);

  res.json(ApiResponse.success({
    id: job.id,
    status: job.status,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    successCount: job.successCount,
    failedCount: job.failedCount,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    uploadedByName: job.uploadedByName,
    summary: job.summary,
  }, "Geography import status fetched successfully."));
});

export const getImportErrors = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const id = req.params.id as string;

  const job = await importService.getImportJob(tenantId, id);

  res.json(ApiResponse.success(job.errors, "Geography import errors fetched successfully."));
});

export const confirmImport = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const id = req.params.id as string;

  const job = await importService.getImportJob(tenantId, id);

  // Trigger background import execution
  await importService.startImportExecution(job.id, tenantId);

  await createAuditLog({
    userId: req.user!.id,
    tenantId,
    action: "IMPORT",
    module: "geography-import",
    recordId: job.id,
    description: `Confirmed import execution for job ID ${job.id}`,
    ...getRequestMeta(req),
  });

  res.json(ApiResponse.success({
    jobId: job.id,
    status: "IMPORTING",
  }, "Geography import execution started in background."));
});

export const downloadGeographyTemplate = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const type = (req.query.type as string) || "district";

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Constituency Management System";

  // â”€â”€â”€ Fetch all lookup data in parallel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [
    existingDistricts,
    existingBlocks,
    existingConstituencies,
    existingTownVillages,
    existingPollingLocations,
    existingWards,
    existingBooths,
    existingWardAreas,
  ] = await Promise.all([
    prisma.district.findMany({
      where: { tenantId, isDeleted: false },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.block.findMany({
      where: { tenantId, isDeleted: false },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.constituency.findMany({
      where: { tenantId, isDeleted: false },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.townVillage.findMany({
      where: { tenantId, isDeleted: false },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.pollingLocation.findMany({
      where: { tenantId, isDeleted: false },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.ward.findMany({
      where: { tenantId, isDeleted: false },
      select: { name: true, wardNumber: true },
      orderBy: { wardNumber: "asc" },
    }),
    prisma.booth.findMany({
      where: { tenantId, isDeleted: false },
      select: { boothNumber: true },
      orderBy: { boothNumber: "asc" },
    }),
    prisma.wardArea.findMany({
      where: { tenantId, isDeleted: false },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // â”€â”€â”€ Build Lookups Sheet (veryHidden - cannot be unhidden by user) â”€â”€
  const lookupsSheet = workbook.addWorksheet("Lookups", { state: "veryHidden" });

  // Column headers
  lookupsSheet.getCell("A1").value = "Districts";
  lookupsSheet.getCell("B1").value = "Blocks";
  lookupsSheet.getCell("C1").value = "Constituencies";
  lookupsSheet.getCell("D1").value = "TownVillages";
  lookupsSheet.getCell("E1").value = "PollingLocations";
  lookupsSheet.getCell("F1").value = "WardNumbers";
  lookupsSheet.getCell("G1").value = "BoothNumbers";
  lookupsSheet.getCell("H1").value = "WardNames";
  lookupsSheet.getCell("I1").value = "WardAreas";

  // Populate lookup data
  const populateLookupCol = (col: string, items: string[]) => {
    items.forEach((val, i) => {
      lookupsSheet.getCell(`${col}${i + 2}`).value = val;
    });
  };

  populateLookupCol("A", existingDistricts.map(d => d.name));
  populateLookupCol("B", existingBlocks.map(b => b.name));
  populateLookupCol("C", existingConstituencies.map(c => c.name));
  populateLookupCol("D", existingTownVillages.map(tv => tv.name));
  populateLookupCol("E", existingPollingLocations.map(pl => pl.name));
  populateLookupCol("F", existingWards.map(w => String(w.wardNumber)));
  populateLookupCol("G", existingBooths.map(b => String(b.boothNumber)));
  populateLookupCol("H", existingWards.map(w => w.name));
  populateLookupCol("I", existingWardAreas.map(a => a.name));

  // Build range references (safe: if no data, range still works but dropdown is empty)
  const makeRange = (col: string, count: number) => {
    const end = Math.max(2, count + 1);
    return `Lookups!$${col}$2:$${col}$${end}`;
  };

  const distRange = makeRange("A", existingDistricts.length);
  const blockRange = makeRange("B", existingBlocks.length);
  const constRange = makeRange("C", existingConstituencies.length);
  const tvRange = makeRange("D", existingTownVillages.length);
  const plRange = makeRange("E", existingPollingLocations.length);
  const wardNumRange = makeRange("F", existingWards.length);
  const boothNumRange = makeRange("G", existingBooths.length);
  const wardNameRange = makeRange("H", existingWards.length);
  const wardAreaRange = makeRange("I", existingWardAreas.length);

  const MAX_DATA_ROWS = 500;

  // Helper: apply data validation to a column range
  const applyListValidation = (sheet: any, colLetter: string, formulae: string[], allowBlank: boolean, errorTitle: string, errorMsg: string) => {
    for (let r = 3; r <= MAX_DATA_ROWS; r++) {
      sheet.getCell(`${colLetter}${r}`).dataValidation = {
        type: "list",
        allowBlank,
        formulae,
        showErrorMessage: true,
        errorTitle,
        error: errorMsg,
      };
    }
  };

  // Helper: style the header row
  const styleHeaderRow = (sheet: any) => {
    const hRow = sheet.getRow(1);
    hRow.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
    hRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E293B" } };
    hRow.alignment = { vertical: "middle", horizontal: "center" };
    hRow.height = 26;
  };

  // Helper: style the instruction row
  const styleInstructionRow = (sheet: any) => {
    const iRow = sheet.getRow(2);
    iRow.font = { italic: true, color: { argb: "4A5568" }, size: 9 };
    iRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EBF8FF" } };
    iRow.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    iRow.height = 30;
  };

  // â”€â”€â”€ Create main template sheet based on type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const mainSheet = workbook.addWorksheet(`${type.replace("-", " ").toUpperCase()} Import Template`);

  if (type === "district") {
    mainSheet.columns = [
      { header: "name", key: "name", width: 22 },
      { header: "state", key: "state", width: 22 },
      { header: "code", key: "code", width: 15 },
      { header: "latitude", key: "latitude", width: 15 },
      { header: "longitude", key: "longitude", width: 15 },
    ];
    // Instruction row
    mainSheet.addRow({ name: "Required", state: "Required", code: "Optional", latitude: "Optional (decimal)", longitude: "Optional (decimal)" });
    // Sample rows
    mainSheet.addRow({ name: "Ludhiana", state: "Punjab", code: "LDH", latitude: 30.900965, longitude: 75.857277 });
    mainSheet.addRow({ name: "Amritsar", state: "Punjab", code: "ASR", latitude: 31.63398, longitude: 74.872261 });
  }
  else if (type === "block") {
    mainSheet.columns = [
      { header: "name", key: "name", width: 22 },
      { header: "districtName", key: "districtName", width: 22 },
      { header: "code", key: "code", width: 15 },
      { header: "latitude", key: "latitude", width: 15 },
      { header: "longitude", key: "longitude", width: 15 },
    ];
    mainSheet.addRow({ name: "Required", districtName: "Required (dropdown)", code: "Optional", latitude: "Optional (decimal)", longitude: "Optional (decimal)" });
    mainSheet.addRow({ name: "Dehlon", districtName: existingDistricts[0]?.name || "Ludhiana", code: "DEH", latitude: 30.7601, longitude: 75.8893 });
    applyListValidation(mainSheet, "B", [distRange], false, "Invalid District", "Select a valid district from the dropdown.");
  }
  else if (type === "town-village") {
    mainSheet.columns = [
      { header: "name", key: "name", width: 22 },
      { header: "districtName", key: "districtName", width: 22 },
      { header: "blockName", key: "blockName", width: 22 },
      { header: "constituencyName", key: "constituencyName", width: 24 },
      { header: "type", key: "type", width: 14 },
      { header: "nature", key: "nature", width: 14 },
      { header: "code", key: "code", width: 15 },
      { header: "pincode", key: "pincode", width: 15 },
      { header: "latitude", key: "latitude", width: 15 },
      { header: "longitude", key: "longitude", width: 15 },
    ];
    mainSheet.addRow({
      name: "Required", districtName: "Required (dropdown)", blockName: "Optional (dropdown)",
      constituencyName: "Optional (dropdown)", type: "TOWN or VILLAGE", nature: "URBAN or RURAL",
      code: "Optional", pincode: "Optional", latitude: "Optional (decimal)", longitude: "Optional (decimal)",
    });
    mainSheet.addRow({
      name: "Rampur", districtName: existingDistricts[0]?.name || "Ludhiana",
      blockName: existingBlocks[0]?.name || "", constituencyName: existingConstituencies[0]?.name || "",
      type: "VILLAGE", nature: "RURAL", code: "RPR", pincode: "141118", latitude: 30.7231, longitude: 75.8942,
    });
    applyListValidation(mainSheet, "B", [distRange], false, "Invalid District", "Select a valid district.");
    applyListValidation(mainSheet, "C", [blockRange], true, "Invalid Block", "Select a valid block or leave blank.");
    applyListValidation(mainSheet, "D", [constRange], true, "Invalid Constituency", "Select a valid constituency or leave blank.");
    applyListValidation(mainSheet, "E", ['"TOWN,VILLAGE"'], false, "Invalid Type", "Select TOWN or VILLAGE.");
    applyListValidation(mainSheet, "F", ['"URBAN,RURAL"'], false, "Invalid Nature", "Select URBAN or RURAL.");
  }
  else if (type === "ward") {
    mainSheet.columns = [
      { header: "name", key: "name", width: 22 },
      { header: "wardNumber", key: "wardNumber", width: 15 },
      { header: "districtName", key: "districtName", width: 22 },
      { header: "constituencyName", key: "constituencyName", width: 24 },
      { header: "townVillageName", key: "townVillageName", width: 22 },
      { header: "code", key: "code", width: 15 },
      { header: "zone", key: "zone", width: 15 },
      { header: "areaType", key: "areaType", width: 16 },
      { header: "pincode", key: "pincode", width: 15 },
      { header: "latitude", key: "latitude", width: 15 },
      { header: "longitude", key: "longitude", width: 15 },
    ];
    mainSheet.addRow({
      name: "Required", wardNumber: "Required (integer)", districtName: "Required (dropdown)",
      constituencyName: "Optional (dropdown)", townVillageName: "Optional (dropdown)",
      code: "Optional", zone: "Optional", areaType: "Dropdown", pincode: "Optional",
      latitude: "Optional (decimal)", longitude: "Optional (decimal)",
    });
    mainSheet.addRow({
      name: "Gandhi Ward", wardNumber: 1, districtName: existingDistricts[0]?.name || "Ludhiana",
      constituencyName: existingConstituencies[0]?.name || "", townVillageName: existingTownVillages[0]?.name || "",
      code: "WARD-1", zone: "Zone A", areaType: "Urban", pincode: "141001", latitude: 30.9123, longitude: 75.8678,
    });
    applyListValidation(mainSheet, "C", [distRange], false, "Invalid District", "Select a valid district.");
    applyListValidation(mainSheet, "D", [constRange], true, "Invalid Constituency", "Select a valid constituency or leave blank.");
    applyListValidation(mainSheet, "E", [tvRange], true, "Invalid Town/Village", "Select a valid town/village or leave blank.");
    applyListValidation(mainSheet, "H", ['"Urban,Rural,Semi-Urban"'], false, "Invalid Area Type", "Select Urban, Rural, or Semi-Urban.");
  }
  else if (type === "ward-bulk") {
    // Ward bulk import template (for AllWards page /api/admin/wards/bulk)
    // This is a rich flat structure: ward info + councillor + area + demographics per row
    mainSheet.columns = [
      // Ward Core
      { header: "wardNumber", key: "wardNumber", width: 14 },
      { header: "wardName", key: "wardName", width: 22 },
      { header: "wardZone", key: "wardZone", width: 14 },
      { header: "wardStatus", key: "wardStatus", width: 14 },
      { header: "wardAreaType", key: "wardAreaType", width: 16 },
      { header: "wardPincode", key: "wardPincode", width: 14 },
      { header: "wardDescription", key: "wardDescription", width: 24 },
      { header: "establishedDate", key: "establishedDate", width: 16 },
      // Councillor
      { header: "councillorName", key: "councillorName", width: 22 },
      { header: "councillorPhone", key: "councillorPhone", width: 16 },
      { header: "councillorEmail", key: "councillorEmail", width: 22 },
      { header: "councillorParty", key: "councillorParty", width: 18 },
      { header: "councillorDesignation", key: "councillorDesignation", width: 20 },
      { header: "councillorSinceDate", key: "councillorSinceDate", width: 16 },
      // Area
      { header: "areaName", key: "areaName", width: 20 },
      { header: "areaType", key: "areaType", width: 16 },
      { header: "areaPopulation", key: "areaPopulation", width: 16 },
      { header: "areaHouseholds", key: "areaHouseholds", width: 16 },
      { header: "areaMaleCount", key: "areaMaleCount", width: 14 },
      { header: "areaFemaleCount", key: "areaFemaleCount", width: 14 },
      { header: "areaPincode", key: "areaPincode", width: 14 },
      { header: "areaLandmark", key: "areaLandmark", width: 20 },
      { header: "areaDescription", key: "areaDescription", width: 22 },
      // Ward-Level Demographics (wd_)
      { header: "wd_totalPopulation", key: "wd_totalPopulation", width: 16 },
      { header: "wd_maleCount", key: "wd_maleCount", width: 14 },
      { header: "wd_femaleCount", key: "wd_femaleCount", width: 14 },
      { header: "wd_transgenderCount", key: "wd_transgenderCount", width: 16 },
      { header: "wd_literacyRate", key: "wd_literacyRate", width: 14 },
      { header: "wd_totalVoters", key: "wd_totalVoters", width: 14 },
      // Area-Level Demographics (ad_)
      { header: "ad_totalPopulation", key: "ad_totalPopulation", width: 16 },
      { header: "ad_maleCount", key: "ad_maleCount", width: 14 },
      { header: "ad_femaleCount", key: "ad_femaleCount", width: 14 },
      { header: "ad_transgenderCount", key: "ad_transgenderCount", width: 16 },
      { header: "ad_literacyRate", key: "ad_literacyRate", width: 14 },
      { header: "ad_totalVoters", key: "ad_totalVoters", width: 14 },
    ];
    mainSheet.addRow({
      wardNumber: "Required (integer)", wardName: "Required for new wards", wardZone: "Optional",
      wardStatus: "Dropdown", wardAreaType: "Dropdown", wardPincode: "Optional",
      wardDescription: "Optional", establishedDate: "YYYY-MM-DD",
      councillorName: "Optional", councillorPhone: "Optional", councillorEmail: "Optional",
      councillorParty: "Optional", councillorDesignation: "Optional", councillorSinceDate: "YYYY-MM-DD",
      areaName: "Optional (one row per area)", areaType: "Dropdown",
      areaPopulation: "Number", areaHouseholds: "Number", areaMaleCount: "Number",
      areaFemaleCount: "Number", areaPincode: "Optional", areaLandmark: "Optional",
      areaDescription: "Optional",
      wd_totalPopulation: "Number", wd_maleCount: "Number", wd_femaleCount: "Number",
      wd_transgenderCount: "Number", wd_literacyRate: "Number (0-100)", wd_totalVoters: "Number",
      ad_totalPopulation: "Number", ad_maleCount: "Number", ad_femaleCount: "Number",
      ad_transgenderCount: "Number", ad_literacyRate: "Number (0-100)", ad_totalVoters: "Number",
    });
    mainSheet.addRow({
      wardNumber: 101, wardName: "Sample Ward Alpha", wardZone: "North",
      wardStatus: "ACTIVE", wardAreaType: "URBAN", wardPincode: "110001",
      wardDescription: "Main urban ward", establishedDate: "2020-01-01",
      councillorName: "John Doe", councillorPhone: "9876543210", councillorEmail: "john@example.com",
      councillorParty: "Party A", councillorDesignation: "Ward Councillor", councillorSinceDate: "2021-01-01",
      areaName: "Area 1", areaType: "RESIDENTIAL", areaPopulation: 5000, areaHouseholds: 1000,
      areaMaleCount: 2500, areaFemaleCount: 2500, areaPincode: "110001",
      areaLandmark: "Near Park", areaDescription: "Main residential block",
      wd_totalPopulation: 15000, wd_maleCount: 7500, wd_femaleCount: 7500,
      wd_transgenderCount: 0, wd_literacyRate: 85.5, wd_totalVoters: 8250,
      ad_totalPopulation: 5000, ad_maleCount: 2500, ad_femaleCount: 2500,
      ad_transgenderCount: 0, ad_literacyRate: 86, ad_totalVoters: 2750,
    });

    // Dropdown validations for ward-bulk
    applyListValidation(mainSheet, "D", ['"ACTIVE,INACTIVE,PROPOSED,DEPRECATED"'], true, "Invalid Status", "Select ACTIVE, INACTIVE, PROPOSED, or DEPRECATED.");
    applyListValidation(mainSheet, "E", ['"URBAN,SEMI_URBAN,RURAL"'], true, "Invalid Area Type", "Select URBAN, SEMI_URBAN, or RURAL.");
    applyListValidation(mainSheet, "P", ['"RESIDENTIAL,COMMERCIAL,MIXED,INDUSTRIAL,PARK,INSTITUTIONAL,OTHER"'], true, "Invalid Area Type", "Select a valid area type.");
  }
  else if (type === "booth") {
    mainSheet.columns = [
      { header: "boothName", key: "boothName", width: 28 },
      { header: "boothNumber", key: "boothNumber", width: 15 },
      { header: "constituencyName", key: "constituencyName", width: 24 },
      { header: "wardName", key: "wardName", width: 22 },
      { header: "townVillageName", key: "townVillageName", width: 22 },
      { header: "pollingLocationName", key: "pollingLocationName", width: 28 },
      { header: "code", key: "code", width: 15 },
      { header: "latitude", key: "latitude", width: 15 },
      { header: "longitude", key: "longitude", width: 15 },
    ];
    mainSheet.addRow({
      boothName: "Required", boothNumber: "Required (integer)", constituencyName: "Required (dropdown)",
      wardName: "Optional (dropdown)", townVillageName: "Optional (dropdown)",
      pollingLocationName: "Optional (dropdown)", code: "Optional",
      latitude: "Optional (decimal)", longitude: "Optional (decimal)",
    });
    mainSheet.addRow({
      boothName: "Government High School Booth 1", boothNumber: 1,
      constituencyName: existingConstituencies[0]?.name || "Constituency A",
      wardName: existingWards[0]?.name || "", townVillageName: existingTownVillages[0]?.name || "",
      pollingLocationName: existingPollingLocations[0]?.name || "", code: "BOOTH-1",
      latitude: 30.9056, longitude: 75.8612,
    });
    applyListValidation(mainSheet, "C", [constRange], false, "Invalid Constituency", "Select a valid constituency.");
    applyListValidation(mainSheet, "D", [wardNameRange], true, "Invalid Ward", "Select a valid ward name or leave blank.");
    applyListValidation(mainSheet, "E", [tvRange], true, "Invalid Town/Village", "Select a valid town/village or leave blank.");
    applyListValidation(mainSheet, "F", [plRange], true, "Invalid Polling Location", "Select a valid polling location or leave blank.");
  }
  else if (type === "polling-location") {
    mainSheet.columns = [
      { header: "name", key: "name", width: 28 },
      { header: "buildingName", key: "buildingName", width: 28 },
      { header: "address", key: "address", width: 28 },
      { header: "pincode", key: "pincode", width: 15 },
      { header: "landmark", key: "landmark", width: 22 },
      { header: "isAccessible", key: "isAccessible", width: 15 },
      { header: "latitude", key: "latitude", width: 15 },
      { header: "longitude", key: "longitude", width: 15 },
    ];
    mainSheet.addRow({
      name: "Required", buildingName: "Optional", address: "Optional",
      pincode: "Optional", landmark: "Optional", isAccessible: "TRUE or FALSE",
      latitude: "Optional (decimal)", longitude: "Optional (decimal)",
    });
    mainSheet.addRow({
      name: "Government High School Building", buildingName: "Government High School",
      address: "Model Town", pincode: "141002", landmark: "Near Fountain Chowk",
      isAccessible: "TRUE", latitude: 30.9054, longitude: 75.861,
    });
    applyListValidation(mainSheet, "F", ['"TRUE,FALSE"'], false, "Invalid Value", "Select TRUE or FALSE.");
  }
  else if (type === "voter") {
    mainSheet.columns = [
      { header: "slNo", key: "slNo", width: 10 },
      { header: "voterIdNumber", key: "voterIdNumber", width: 18 },
      { header: "wardNumber", key: "wardNumber", width: 14 },
      { header: "name", key: "name", width: 22 },
      { header: "gender", key: "gender", width: 16 },
      { header: "relativeName", key: "relativeName", width: 22 },
      { header: "relationType", key: "relationType", width: 14 },
      { header: "age", key: "age", width: 10 },
      { header: "houseNo", key: "houseNo", width: 15 },
      { header: "address", key: "address", width: 28 },
      { header: "locality", key: "locality", width: 18 },
      { header: "phone", key: "phone", width: 16 },
      { header: "boothNo", key: "boothNo", width: 12 },
      { header: "sectionNo", key: "sectionNo", width: 12 },
      { header: "wardAreaName", key: "wardAreaName", width: 18 },
      { header: "isDisabled", key: "isDisabled", width: 14 },
    ];
    mainSheet.addRow({
      slNo: "Optional (integer)", voterIdNumber: "Required (EPIC No.)", wardNumber: "Required (dropdown)",
      name: "Required", gender: "Required (dropdown)", relativeName: "Optional",
      relationType: "Dropdown (F/H/M/O)", age: "Optional (integer)",
      houseNo: "Optional", address: "Optional", locality: "Optional", phone: "Optional",
      boothNo: "Required (dropdown)", sectionNo: "Optional (integer)",
      wardAreaName: "Optional (dropdown)", isDisabled: "Yes/No",
    });
    mainSheet.addRow({
      slNo: 101, voterIdNumber: "ABC1234567", wardNumber: existingWards[0]?.wardNumber || 1,
      name: "Rajesh Kumar", gender: "MALE", relativeName: "Suresh Kumar", relationType: "F",
      age: 34, houseNo: "H.No. 45/A", address: "Main Road Sector 4", locality: "Green Park",
      phone: "9876543210", boothNo: existingBooths[0]?.boothNumber || 12, sectionNo: 1,
      wardAreaName: existingWardAreas[0]?.name || "Block A", isDisabled: "No",
    });
    mainSheet.addRow({
      slNo: 102, voterIdNumber: "XYZ9876543", wardNumber: existingWards[0]?.wardNumber || 1,
      name: "Sunita Devi", gender: "FEMALE", relativeName: "Ramesh Chand", relationType: "H",
      age: 29, houseNo: "12-B", address: "Gali No. 3", locality: "Shanti Nagar",
      phone: "9812345678", boothNo: existingBooths[0]?.boothNumber || 12, sectionNo: 1,
      wardAreaName: existingWardAreas[0]?.name || "Block A", isDisabled: "No",
    });
    applyListValidation(mainSheet, "C", [wardNumRange], false, "Invalid Ward Number", "Select a valid ward number.");
    applyListValidation(mainSheet, "E", ['"MALE,FEMALE,TRANSGENDER"'], false, "Invalid Gender", "Select MALE, FEMALE, or TRANSGENDER.");
    applyListValidation(mainSheet, "G", ['"F,H,M,O"'], true, "Invalid Relation", "F=Father, H=Husband, M=Mother, O=Other.");
    applyListValidation(mainSheet, "M", [boothNumRange], false, "Invalid Booth Number", "Select a valid booth number.");
    applyListValidation(mainSheet, "O", [wardAreaRange], true, "Invalid Ward Area", "Select a valid ward area or leave blank.");
    applyListValidation(mainSheet, "P", ['"Yes,No"'], true, "Invalid Selection", "Select Yes or No.");
  }
  else if (type === "constituency") {
    mainSheet.columns = [
      { header: "name", key: "name", width: 22 },
      { header: "type", key: "type", width: 20 },
      { header: "code", key: "code", width: 15 },
      { header: "description", key: "description", width: 28 },
      { header: "latitude", key: "latitude", width: 15 },
      { header: "longitude", key: "longitude", width: 15 },
    ];
    mainSheet.addRow({
      name: "Required", type: "ASSEMBLY or PARLIAMENTARY", code: "Optional",
      description: "Optional", latitude: "Optional (decimal)", longitude: "Optional (decimal)",
    });
    mainSheet.addRow({
      name: "Ludhiana Central", type: "ASSEMBLY", code: "LDH-C",
      description: "Central area of Ludhiana", latitude: 30.9010, longitude: 75.8573,
    });
    applyListValidation(mainSheet, "B", ['"ASSEMBLY,PARLIAMENTARY"'], false, "Invalid Type", "Select ASSEMBLY or PARLIAMENTARY.");
  }

  // â”€â”€â”€ Style headers and instruction rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  styleHeaderRow(mainSheet);
  styleInstructionRow(mainSheet);

  // â”€â”€â”€ Set Content-Disposition & write â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const safeTypeName = type.replace(/[^a-z0-9_-]/gi, "_");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${safeTypeName}_import_template.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
});
