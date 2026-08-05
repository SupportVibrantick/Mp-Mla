import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";
import { Prisma, VoterGender } from "@prisma/client";

import ExcelJS from "exceljs";

// ══════════════════════════════════════════════════════════
// EXPORT VOTERS AS CSV (streamed)
// GET /api/admin/voter-list/export
// ══════════════════════════════════════════════════════════

const CSV_HEADERS = [
  "Voter ID",
  "Sl No",
  "Section No",
  "Booth No",
  "Name",
  "Relative Name",
  "Relation Type",
  "Gender",
  "Age",
  "House No",
  "Address",
  "Locality",
  "Phone",
  "Is Disabled",
  "Is New Voter",
  "Ward Name",
  "Ward Number",
  "Ward Area",
  "Status",
];

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportVoters(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { wardId, gender, search } = req.query as any;

    const where: Prisma.VoterWhereInput = {
      tenantId,
      isDeleted: false,
    };

    if (wardId && typeof wardId === "string") {
      where.wardId = wardId;
    }
    if (
      gender &&
      typeof gender === "string" &&
      ["MALE", "FEMALE", "TRANSGENDER"].includes(gender)
    ) {
      where.gender = gender as VoterGender;
    }
    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { voterIdNumber: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { relativeName: { contains: q, mode: "insensitive" } },
        { locality: { contains: q, mode: "insensitive" } },
      ];
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="voter_list_${timestamp}.csv"`,
    );

    // Write UTF-8 BOM for Excel compatibility
    res.write("\uFEFF");
    res.write(CSV_HEADERS.join(",") + "\n");

    let cursorId: string | undefined = undefined;
    const batchSize = 1000;
    let exportedCount = 0;

    while (true) {
      const voters: any[] = await prisma.voter.findMany({
        where,
        take: batchSize,
        skip: cursorId ? 1 : 0,
        cursor: cursorId ? { id: cursorId } : undefined,
        orderBy: { id: "asc" },
        select: {
          id: true,
          voterIdNumber: true,
          slNo: true,
          sectionNo: true,
          boothNo: true,
          name: true,
          relativeName: true,
          relationType: true,
          gender: true,
          age: true,
          houseNo: true,
          address: true,
          locality: true,
          phone: true,
          isDisabled: true,
          status: true,
          ward: { select: { name: true, wardNumber: true } },
          wardArea: { select: { name: true } },
        },
      });

      if (voters.length === 0) break;

      // Write rows
      for (const v of voters) {
        const row = [
          escapeCSV(v.voterIdNumber),
          escapeCSV(v.slNo),
          escapeCSV(v.sectionNo),
          escapeCSV(v.boothNo),
          escapeCSV(v.name),
          escapeCSV(v.relativeName),
          escapeCSV(v.relationType),
          escapeCSV(v.gender),
          escapeCSV(v.age),
          escapeCSV(v.houseNo),
          escapeCSV(v.address),
          escapeCSV(v.locality),
          escapeCSV(v.phone),
          escapeCSV(v.isDisabled ? "Yes" : "No"),
          escapeCSV(v.isNewVoter ? "Yes" : "No"),
          escapeCSV(v.ward?.name),
          escapeCSV(v.ward?.wardNumber),
          escapeCSV(v.wardArea?.name),
          escapeCSV(v.status),
        ];
        res.write(row.join(",") + "\n");
        exportedCount++;
      }

      cursorId = voters[voters.length - 1].id;
    }

    res.end();

    // Audit log & notification
    createAuditLog({
      userId: req.user!.id,
      action: "EXPORT",
      module: "voter_list",
      description: `Exported ${exportedCount} voter records`,
      newData: { exportedCount, filters: { wardId, gender, search } },
      ...getRequestMeta(req),
    }).catch(() => {});

    sendAdminNotification(
      tenantId,
      `Voter List Export: ${exportedCount} records by ${req.user!.name || "Unknown"}`,
      buildActivityEmailHtml({
        action: "EXPORT",
        module: "voter_list",
        userName: req.user!.name || "Unknown",
        recordCount: exportedCount,
        timestamp: new Date(),
      }),
    ).catch(() => {});
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// DOWNLOAD SAMPLE CSV TEMPLATE
// GET /api/admin/voter-list/sample
// GET /api/admin/voter-list/bulk/sample
// ══════════════════════════════════════════════════════════

const SAMPLE_CSV_HEADERS = [
  "voterIdNumber",
  "wardNumber",
  "name",
  "gender",
  "relativeName",
  "relationType",
  "age",
  "houseNo",
  "address",
  "locality",
  "phone",
  "boothNo",
  "sectionNo",
  "slNo",
  "wardAreaName",
  "isDisabled",
];

const SAMPLE_ROWS = [
  [
    "ABC1234567",
    "1",
    "Rajesh Kumar",
    "MALE",
    "Suresh Kumar",
    "F",
    "34",
    "H.No. 45/A",
    "Main Road Sector 4",
    "Green Park",
    "9876543210",
    "12",
    "1",
    "101",
    "Block A",
    "No",
  ],
  [
    "XYZ9876543",
    "1",
    "Sunita Devi",
    "FEMALE",
    "Ramesh Chand",
    "H",
    "29",
    "12-B",
    "Gali No. 3",
    "Shanti Nagar",
    "9812345678",
    "12",
    "1",
    "102",
    "Block A",
    "No",
  ],
  [
    "EPIC001122",
    "2",
    "Priya Sharma",
    "TRANSGENDER",
    "Kailash Sharma",
    "F",
    "25",
    "House 88",
    "Near City Hospital",
    "Civil Lines",
    "9711223344",
    "15",
    "2",
    "45",
    "Block B",
    "Yes",
  ],
];



// ══════════════════════════════════════════════════════════
// DOWNLOAD SAMPLE EXCEL TEMPLATE WITH DATA VALIDATION DROPDOWNS
// GET /api/admin/voter-list/sample/excel
// ══════════════════════════════════════════════════════════

export async function downloadSampleExcel(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);

    // Fetch active wards for tenant
    const wards = await prisma.ward.findMany({
      where: { tenantId },
      select: { wardNumber: true, name: true },
      orderBy: { wardNumber: "asc" },
    });

    const wardNumbers = wards.map((w) => String(w.wardNumber));
    const wardDropdownFormula =
      wardNumbers.length > 0
        ? `"${wardNumbers.join(",")}"`
        : `"1,2,3,4,5"`;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Constituency Management System";

    const worksheet = workbook.addWorksheet("Voter Ingestion Template");

    // Define columns (slNo in the first place for readability)
    worksheet.columns = [
      { header: "slNo", key: "slNo", width: 10 },
      { header: "voterIdNumber", key: "voterIdNumber", width: 18 },
      { header: "wardNumber", key: "wardNumber", width: 14 },
      { header: "name", key: "name", width: 22 },
      { header: "gender", key: "gender", width: 16 },
      { header: "relativeName", key: "relativeName", width: 20 },
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

    // Style Header Row (Row 1)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1E293B" }, // Dark slate header
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 24;

    // Add sample rows
    worksheet.addRow({
      slNo: 101,
      voterIdNumber: "ABC1234567",
      wardNumber: wardNumbers[0] || "1",
      name: "Rajesh Kumar",
      gender: "MALE",
      relativeName: "Suresh Kumar",
      relationType: "F",
      age: 34,
      houseNo: "H.No. 45/A",
      address: "Main Road Sector 4",
      locality: "Green Park",
      phone: "9876543210",
      boothNo: 12,
      sectionNo: 1,
      wardAreaName: "Block A",
      isDisabled: "No",
    });

    worksheet.addRow({
      slNo: 102,
      voterIdNumber: "XYZ9876543",
      wardNumber: wardNumbers[0] || "1",
      name: "Sunita Devi",
      gender: "FEMALE",
      relativeName: "Ramesh Chand",
      relationType: "H",
      age: 29,
      houseNo: "12-B",
      address: "Gali No. 3",
      locality: "Shanti Nagar",
      phone: "9812345678",
      boothNo: 12,
      sectionNo: 1,
      wardAreaName: "Block A",
      isDisabled: "No",
    });

    worksheet.addRow({
      slNo: 45,
      voterIdNumber: "EPIC001122",
      wardNumber: wardNumbers[1] || wardNumbers[0] || "2",
      name: "Priya Sharma",
      gender: "TRANSGENDER",
      relativeName: "Kailash Sharma",
      relationType: "F",
      age: 25,
      houseNo: "House 88",
      address: "Near City Hospital",
      locality: "Civil Lines",
      phone: "9711223344",
      boothNo: 15,
      sectionNo: 2,
      wardAreaName: "Block B",
      isDisabled: "Yes",
    });

    // Add Data Validation Dropdowns for rows 2 to 500
    for (let rowIdx = 2; rowIdx <= 500; rowIdx++) {
      const row = worksheet.getRow(rowIdx);

      // Ward Number Dropdown (Column C)
      row.getCell("C").dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [wardDropdownFormula],
        showErrorMessage: true,
        errorTitle: "Invalid Ward Number",
        error: "Please select an available ward number from the dropdown list.",
      };

      // Gender Dropdown (Column E)
      row.getCell("E").dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: ['"MALE,FEMALE,TRANSGENDER"'],
        showErrorMessage: true,
        errorTitle: "Invalid Gender",
        error: "Please select MALE, FEMALE, or TRANSGENDER.",
      };

      // Relation Type Dropdown (Column G)
      row.getCell("G").dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"F,H,M"'],
        showErrorMessage: true,
        errorTitle: "Invalid Relation Type",
        error: "F = Father, H = Husband, M = Mother.",
      };

      // Is Disabled Dropdown (Column P)
      row.getCell("P").dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"Yes,No"'],
        showErrorMessage: true,
        errorTitle: "Invalid Selection",
        error: "Please select Yes or No.",
      };
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="voter_list_excel_template.xlsx"',
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}
