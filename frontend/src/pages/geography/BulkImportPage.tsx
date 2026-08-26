import React, {
  ChangeEvent,
  DragEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import * as XLSX from "xlsx";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Download,
  FileSpreadsheet,
  FileUp,
  Info,
  Loader2,
  RefreshCw,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import { toast } from "sonner";

import api from "@/lib/api";

import { MainLayout } from "@/components/layout/MainLayout";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { Progress } from "@/components/ui/progress";

import {
  useGeographyImport,
  type GeographyImportError,
  type GeographyImportType,
  type ImportRow,
} from "@/hooks/useGeographyImport";

/* ============================================================
 * TYPES
 * ========================================================== */

interface ImportTemplate {
  type: GeographyImportType;

  label: string;

  description: string;

  required: string[];

  optional: string[];

  aliases?: Record<string, string[]>;
}

/* ============================================================
 * TEMPLATE DEFINITIONS
 * ========================================================== */

const IMPORT_TEMPLATES: Record<GeographyImportType, ImportTemplate> = {
  district: {
    type: "district",
    label: "Districts",
    description: "Import administrative districts.",
    required: ["name", "state"],
    optional: ["code", "latitude", "longitude"],
    aliases: {
      name: ["name", "district", "districtname", "district name", "districts"],
      state: ["state"],
      code: ["code", "districtcode", "district code"],
      latitude: ["latitude", "lat"],
      longitude: ["longitude", "lng", "lon"],
    },
  },

  block: {
    type: "block",
    label: "Blocks",
    description: "Import blocks under districts.",
    required: ["name", "districtName"],
    optional: ["code", "districtCode", "latitude", "longitude"],
    aliases: {
      name: ["name", "block", "blockname", "block name", "blocks"],
      districtName: ["districtname", "district name", "district"],
      districtCode: ["districtcode", "district code"],
      code: ["code", "blockcode", "block code"],
      latitude: ["latitude", "lat"],
      longitude: ["longitude", "lng", "lon"],
    },
  },

  constituency: {
    type: "constituency",
    label: "Constituencies",
    description: "Import Assembly or Parliamentary constituencies.",
    required: ["name", "type"],
    optional: ["code", "districtName", "districtCode", "latitude", "longitude"],
    aliases: {
      name: [
        "name",
        "constituency",
        "constituencyname",
        "constituency name",
        "constituencies",
      ],
      type: ["type", "constituencytype", "constituency type"],
      districtName: ["districtname", "district name", "district"],
      districtCode: ["districtcode", "district code"],
      code: ["code", "constituencycode", "constituency code"],
      latitude: ["latitude", "lat"],
      longitude: ["longitude", "lng", "lon"],
    },
  },

  "town-village": {
    type: "town-village",
    label: "Town / Villages",
    description: "Import towns and villages.",
    required: ["name", "districtName"],
    optional: [
      "type",
      "nature",
      "code",
      "districtCode",
      "blockName",
      "blockCode",
      "constituencyName",
      "constituencyCode",
      "pincode",
      "latitude",
      "longitude",
    ],
    aliases: {
      name: [
        "name",
        "town",
        "village",
        "townvillage",
        "town village",
        "townvillages",
      ],
      districtName: ["districtname", "district name", "district"],
      districtCode: ["districtcode", "district code"],
      blockName: ["blockname", "block name", "block"],
      blockCode: ["blockcode", "block code"],
      constituencyName: [
        "constituencyname",
        "constituency name",
        "constituency",
      ],
      constituencyCode: ["constituencycode", "constituency code"],
      type: ["type", "townvillagetype", "town village type"],
      nature: ["nature", "geographynature", "geography nature"],
      code: ["code", "townvillagecode", "town village code"],
      pincode: ["pincode", "pin", "postalcode", "postal code"],
      latitude: ["latitude", "lat"],
      longitude: ["longitude", "lng", "lon"],
    },
  },

  ward: {
    type: "ward",
    label: "Wards",
    description: "Import urban wards.",
    required: ["wardNumber", "name"],
    optional: [
      "code",
      "constituencyName",
      "constituencyCode",
      "townVillageName",
      "townVillageCode",
      "latitude",
      "longitude",
    ],
    aliases: {
      wardNumber: ["wardnumber", "ward number", "wardno", "ward no", "number"],
      name: ["name", "wardname", "ward name", "wardnames"],
      code: ["code", "wardcode", "ward code"],
      constituencyName: [
        "constituencyname",
        "constituency name",
        "constituency",
      ],
      constituencyCode: ["constituencycode", "constituency code"],
      townVillageName: [
        "townvillagename",
        "town village name",
        "townvillage",
        "town village",
      ],
      townVillageCode: ["townvillagecode", "town village code"],
      latitude: ["latitude", "lat"],
      longitude: ["longitude", "lng", "lon"],
    },
  },

  booth: {
    type: "booth",
    label: "Booths",
    description: "Import polling booths mapped to constituencies.",
    required: ["constituencyName", "boothNumber", "boothName"],
    optional: [
      "constituencyCode",
      "code",
      "wardName",
      "wardCode",
      "townVillageName",
      "townVillageCode",
      "pollingLocationName",
      "pollingLocationCode",
      "latitude",
      "longitude",
    ],
    aliases: {
      constituencyName: [
        "constituencyname",
        "constituency name",
        "constituency",
      ],
      constituencyCode: ["constituencycode", "constituency code"],
      boothNumber: ["boothnumber", "booth number", "boothno", "booth no"],
      boothName: ["boothname", "booth name", "booth"],
      code: ["code", "boothcode", "booth code"],
      wardName: ["wardname", "ward name"],
      wardCode: ["wardcode", "ward code"],
      townVillageName: [
        "townvillagename",
        "town village name",
        "townvillage",
        "town village",
      ],
      townVillageCode: ["townvillagecode", "town village code"],
      pollingLocationName: [
        "pollinglocationname",
        "polling location name",
        "pollinglocation",
        "polling location",
      ],
      pollingLocationCode: ["pollinglocationcode", "polling location code"],
      latitude: ["latitude", "lat"],
      longitude: ["longitude", "lng", "lon"],
    },
  },

  "polling-location": {
    type: "polling-location",
    label: "Polling Locations",
    description: "Import physical polling locations.",
    required: ["name"],
    optional: [
      "code",
      "buildingName",
      "address",
      "pincode",
      "landmark",
      "latitude",
      "longitude",
      "isAccessible",
    ],
    aliases: {
      name: [
        "name",
        "pollinglocation",
        "polling location",
        "pollinglocationname",
        "polling location name",
      ],
      code: ["code", "pollinglocationcode", "polling location code"],
      buildingName: ["buildingname", "building name", "building"],
      address: ["address"],
      pincode: ["pincode", "pin", "postalcode", "postal code"],
      landmark: ["landmark"],
      latitude: ["latitude", "lat"],
      longitude: ["longitude", "lng", "lon"],
      isAccessible: ["isaccessible", "is accessible", "accessible"],
    },
  },
};

/* ============================================================
 * HELPERS
 * ========================================================== */

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\r\n]+/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s/g, "");
}

function cleanCell(value: unknown): unknown {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

function isBlankValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string" && value.trim() === "") {
    return true;
  }

  return false;
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((value) => isBlankValue(value));
}

function rowHasMeaningfulData(row: Record<string, unknown>): boolean {
  return Object.values(row).some((value) => !isBlankValue(value));
}

function isTemplateInstructionRow(row: Record<string, unknown>): boolean {
  const values = Object.values(row)
    .map((value) =>
      String(value ?? "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);

  if (!values.length) {
    return true;
  }

  const instructionWords = new Set([
    "required",
    "optional",
    "required*",
    "optional*",
    "required (text)",
    "optional (text)",
    "optional (decimal)",
    "required (decimal)",
  ]);

  const instructionCount = values.filter((value) =>
    instructionWords.has(value),
  ).length;

  return instructionCount === values.length;
}

function canonicalHeaderForColumn(
  header: string,
  template: ImportTemplate,
): string | null {
  const normalized = normalizeHeader(header);

  if (!normalized) {
    return null;
  }

  for (const required of [...template.required, ...template.optional]) {
    const aliases = template.aliases?.[required] ?? [required];

    const normalizedAliases = aliases.map(normalizeHeader);

    if (normalizedAliases.includes(normalized)) {
      return required;
    }
  }

  return null;
}

interface ParsedWorksheet {
  sheetName: string;
  headerRowIndex: number;
  headers: string[];
  rows: ImportRow[];
}

function scoreHeaderRow(row: unknown[], template: ImportTemplate): number {
  const headers = row
    .map((value) => canonicalHeaderForColumn(String(value ?? ""), template))
    .filter(Boolean) as string[];

  if (!headers.length) {
    return 0;
  }

  const requiredMatches = template.required.filter((required) =>
    headers.includes(required),
  ).length;

  const optionalMatches = template.optional.filter((optional) =>
    headers.includes(optional),
  ).length;

  return requiredMatches * 100 + optionalMatches * 10 + headers.length;
}

function findHeaderRow(matrix: unknown[][], template: ImportTemplate): number {
  let bestIndex = -1;
  let bestScore = 0;

  const maxRows = Math.min(matrix.length, 20);

  for (let index = 0; index < maxRows; index++) {
    const score = scoreHeaderRow(matrix[index] ?? [], template);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  const requiredCount = template.required.length;

  const minimumScore = requiredCount * 100;

  if (bestIndex === -1 || bestScore < minimumScore) {
    return -1;
  }

  return bestIndex;
}

function parseWorksheet(
  worksheet: XLSX.WorkSheet,
  sheetName: string,
  template: ImportTemplate,
): ParsedWorksheet | null {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: true,
  });

  if (!matrix.length) {
    return null;
  }

  const headerRowIndex = findHeaderRow(matrix, template);

  if (headerRowIndex === -1) {
    return null;
  }

  const rawHeaders = matrix[headerRowIndex] ?? [];

  const headers = rawHeaders.map((header, index) => {
    const canonical = canonicalHeaderForColumn(String(header ?? ""), template);

    return canonical || `__unknown_${index}`;
  });

  const rows: ImportRow[] = [];

  for (
    let rowIndex = headerRowIndex + 1;
    rowIndex < matrix.length;
    rowIndex++
  ) {
    const rawRow = matrix[rowIndex] ?? [];

    if (isBlankRow(rawRow)) {
      continue;
    }

    const mapped: ImportRow = {};

    headers.forEach((header, columnIndex) => {
      if (header.startsWith("__unknown_")) {
        return;
      }

      mapped[header] = cleanCell(rawRow[columnIndex]);
    });

    if (!rowHasMeaningfulData(mapped)) {
      continue;
    }

    if (isTemplateInstructionRow(mapped)) {
      continue;
    }

    rows.push(mapped);
  }

  return {
    sheetName,
    headerRowIndex,
    headers,
    rows,
  };
}

function findImportWorksheet(
  workbook: XLSX.WorkBook,
  template: ImportTemplate,
): ParsedWorksheet {
  const sheetMetadata = workbook.Workbook?.Sheets ?? [];

  const candidates: Array<{
    parsed: ParsedWorksheet;
    score: number;
    visible: boolean;
  }> = [];

  for (let index = 0; index < workbook.SheetNames.length; index++) {
    const sheetName = workbook.SheetNames[index];

    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      continue;
    }

    const metadata = sheetMetadata[index];

    const hidden = metadata?.Hidden === 1 || metadata?.Hidden === 2;

    /**
     * Lookups should never be used as the
     * import worksheet.
     *
     * Prefer visible worksheets first.
     */
    const parsed = parseWorksheet(worksheet, sheetName, template);

    if (!parsed) {
      continue;
    }

    const normalizedSheetName = normalizeHeader(sheetName);

    let score = parsed.headers.length;

    if (normalizedSheetName.includes(normalizeHeader(template.label))) {
      score += 1000;
    }

    if (normalizedSheetName.includes("import")) {
      score += 500;
    }

    if (normalizedSheetName.includes("template")) {
      score += 250;
    }

    if (normalizedSheetName.includes("lookup")) {
      score -= 5000;
    }

    if (!hidden) {
      score += 100;
    }

    candidates.push({
      parsed,
      score,
      visible: !hidden,
    });
  }

  if (!candidates.length) {
    const visibleSheets = workbook.SheetNames.filter((_, index) => {
      const hidden = sheetMetadata[index]?.Hidden;

      return hidden !== 1 && hidden !== 2;
    });

    throw new Error(
      [
        `Invalid ${template.label.toLowerCase()} Excel template.`,
        `Required columns: ${template.required.join(", ")}.`,
        `Detected visible sheets: ${visibleSheets.join(", ") || "none"}.`,
        `Please download and use the ${template.label.toLowerCase()} import template.`,
      ].join(" "),
    );
  }

  candidates.sort((a, b) => b.score - a.score);

  return candidates[0].parsed;
}

function normalizeRowValues(rows: ImportRow[]): ImportRow[] {
  return rows.map((row) => {
    const result: ImportRow = {};

    Object.entries(row).forEach(([key, value]) => {
      if (typeof value === "string") {
        result[key] = value.trim();
      } else {
        result[key] = value;
      }
    });

    return result;
  });
}

function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function validateLocalRows(
  rows: ImportRow[],
  template: ImportTemplate,
): GeographyImportError[] {
  const errors: GeographyImportError[] = [];

  rows.forEach((row, index) => {
    template.required.forEach((field) => {
      if (isBlankValue(row[field])) {
        errors.push({
          rowIndex: index + 1,
          field,
          value: row[field] ?? null,
          reason: `${field} is required.`,
        });
      }
    });

    if (template.type === "district") {
      const latitude = row.latitude;

      const longitude = row.longitude;

      if (!isBlankValue(latitude) && Number.isNaN(Number(latitude))) {
        errors.push({
          rowIndex: index + 1,
          field: "latitude",
          value: latitude,
          reason: "Latitude must be a valid number.",
        });
      }

      if (!isBlankValue(longitude) && Number.isNaN(Number(longitude))) {
        errors.push({
          rowIndex: index + 1,
          field: "longitude",
          value: longitude,
          reason: "Longitude must be a valid number.",
        });
      }
    }
  });

  return errors;
}

/* ============================================================
 * TEMPLATE DOWNLOAD
 * ========================================================== */

async function downloadTemplate(type: GeographyImportType) {
  try {
    const response = await api.get("/admin/constituency/import/template", {
      params: {
        type,
      },
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${type}-import-template.xlsx`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(url);

    toast.success("Template downloaded.");
  } catch (error: any) {
    console.error("Template download failed:", error);

    toast.error(
      error?.response?.data?.message || "Failed to download template.",
    );
  }
}

/* ============================================================
 * STATUS BADGE
 * ========================================================== */

function StatusBadge({ status }: { status: string | undefined | null }) {
  switch (status) {
    case "COMPLETED":
      return (
        <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Completed
        </Badge>
      );

    case "FAILED":
      return (
        <Badge className="gap-1 bg-rose-600 hover:bg-rose-600">
          <XCircle className="h-3.5 w-3.5" />
          Failed
        </Badge>
      );

    case "PARTIAL":
      return (
        <Badge className="gap-1 bg-amber-600 hover:bg-amber-600">
          <CircleAlert className="h-3.5 w-3.5" />
          Partial
        </Badge>
      );

    case "VALIDATING":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Validating
        </Badge>
      );

    case "IMPORTING":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Importing
        </Badge>
      );

    case "PREVIEW":
      return (
        <Badge variant="secondary" className="gap-1">
          <Info className="h-3.5 w-3.5" />
          Ready for confirmation
        </Badge>
      );

    default:
      return (
        <Badge variant="outline" className="gap-1">
          {status || "Pending"}
        </Badge>
      );
  }
}

/* ============================================================
 * MAIN PAGE
 * ========================================================== */

export default function BulkImportPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [importType, setImportType] = useState<GeographyImportType>("district");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);

  const [parsedSheet, setParsedSheet] = useState<string>("");

  const [parsedHeaderRow, setParsedHeaderRow] = useState<number | null>(null);

  const [localErrors, setLocalErrors] = useState<GeographyImportError[]>([]);

  const [isParsing, setIsParsing] = useState(false);

  const [dragActive, setDragActive] = useState(false);

  const [step, setStep] = useState<"select" | "preview" | "job">("select");

  const template = IMPORT_TEMPLATES[importType];

  const {
    job,
    errors,
    uploading,
    confirming,
    refreshJob,
    uploadImport,
    confirmImport,
    reset,
  } = useGeographyImport();

  const allErrors = useMemo(
    () => [...localErrors, ...errors],
    [localErrors, errors],
  );

  const processedRows = job?.processedRows ?? 0;

  const totalRows = job?.totalRows ?? parsedRows.length;

  const progress =
    totalRows > 0
      ? Math.min(100, Math.round((processedRows / totalRows) * 100))
      : 0;

  /* ========================================================
   * RESET
   * ====================================================== */

  const resetPage = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setParsedSheet("");
    setParsedHeaderRow(null);
    setLocalErrors([]);
    setStep("select");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    reset();
  };

  /* ========================================================
   * PARSE EXCEL
   * ====================================================== */

  const parseExcelFile = async (file: File) => {
    setIsParsing(true);
    setLocalErrors([]);

    try {
      const extension = getFileExtension(file.name);

      if (extension !== "xlsx" && extension !== "xls") {
        throw new Error("Only .xlsx and .xls files are supported.");
      }

      if (file.size === 0) {
        throw new Error("The selected Excel file is empty.");
      }

      const arrayBuffer = await file.arrayBuffer();

      const workbook = XLSX.read(arrayBuffer, {
        type: "array",
        cellDates: true,
        raw: false,
        dense: true,
      });

      if (!workbook.SheetNames.length) {
        throw new Error("The Excel workbook contains no worksheets.");
      }

      /**
       * IMPORTANT:
       *
       * Do NOT use:
       *
       * workbook.SheetNames[0]
       *
       * because the generated workbook can
       * contain a Lookups sheet.
       *
       * findImportWorksheet() searches every
       * worksheet and chooses the sheet whose
       * headers match the selected import type.
       */
      const parsed = findImportWorksheet(workbook, template);

      const normalizedRows = normalizeRowValues(parsed.rows);

      if (normalizedRows.length === 0) {
        throw new Error(
          `No data rows were found in "${parsed.sheetName}". Add at least one ${template.label.toLowerCase()} row.`,
        );
      }

      const validationErrors = validateLocalRows(normalizedRows, template);

      setSelectedFile(file);
      setParsedRows(normalizedRows);

      setParsedSheet(parsed.sheetName);

      setParsedHeaderRow(parsed.headerRowIndex + 1);

      setLocalErrors(validationErrors);

      setStep("preview");

      if (validationErrors.length) {
        toast.warning(
          `${validationErrors.length} local validation issue${
            validationErrors.length === 1 ? "" : "s"
          } found.`,
        );
      } else {
        toast.success(
          `${normalizedRows.length} row${
            normalizedRows.length === 1 ? "" : "s"
          } detected successfully.`,
        );
      }
    } catch (error: any) {
      console.error("Excel parsing failed:", error);

      toast.error(error?.message || "Failed to read Excel file.");

      setSelectedFile(null);
      setParsedRows([]);
      setParsedSheet("");
      setParsedHeaderRow(null);
    } finally {
      setIsParsing(false);
    }
  };

  /* ========================================================
   * FILE HANDLERS
   * ====================================================== */

  const handleFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await parseExcelFile(file);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);

    const file = event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    await parseExcelFile(file);
  };

  /* ========================================================
   * UPLOAD
   * ====================================================== */

  const handleUpload = async () => {
    if (!selectedFile || parsedRows.length === 0) {
      toast.error("Please select a valid Excel file first.");

      return;
    }

    /**
     * Never send local-invalid rows.
     *
     * This prevents obvious bad rows from
     * entering the server job.
     *
     * IMPORTANT:
     * The backend still performs authoritative
     * validation.
     */
    if (localErrors.length > 0) {
      toast.error("Fix the validation errors before uploading.");

      return;
    }

    try {
      const result = await uploadImport({
        type: importType,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        rows: parsedRows,
      });

      setStep("job");

      /**
       * The backend job must now use exactly
       * parsedRows.length as totalRows.
       */
      console.log("Import job created:", result);
    } catch {
      // Hook already shows toast.
    }
  };

  /* ========================================================
   * CONFIRM
   * ====================================================== */

  const handleConfirm = async () => {
    if (!job?.id) {
      return;
    }

    try {
      await confirmImport(job.id);
    } catch {
      // Hook handles toast.
    }
  };

  /* ========================================================
   * REFRESH
   * ====================================================== */

  const handleRefresh = async () => {
    if (!job?.id) {
      return;
    }

    await refreshJob(job.id);

    toast.success("Import status refreshed.");
  };

  /* ========================================================
   * RENDER
   * ====================================================== */

  return (
    <MainLayout title="Geography Import">
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
        {/* ==================================================
         * HEADER
         * ================================================ */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Geography Import
                </h1>

                <p className="text-sm text-muted-foreground">
                  Import geography data using validated Excel templates.
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => downloadTemplate(importType)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </div>

        {/* ==================================================
         * TYPE
         * ================================================ */}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Select Import Type</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 md:grid-cols-[280px_1fr]">
              <div className="space-y-2">
                <Label>Geography Type</Label>

                <Select
                  value={importType}
                  onValueChange={(value) => {
                    resetPage();

                    setImportType(value as GeographyImportType);
                  }}
                  disabled={uploading || confirming || step === "job"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {Object.values(IMPORT_TEMPLATES).map((item) => (
                      <SelectItem key={item.type} value={item.type}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex gap-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                  <div className="space-y-2">
                    <p className="text-sm font-semibold">{template.label}</p>

                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Required:
                      </span>

                      {template.required.map((field) => (
                        <Badge
                          key={field}
                          variant="secondary"
                          className="font-mono text-[11px]"
                        >
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================================================
         * UPLOAD
         * ================================================ */}

        {step === "select" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Upload Excel File</CardTitle>
            </CardHeader>

            <CardContent>
              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={[
                  "cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/20",
                ].join(" ")}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileInput}
                />

                {isParsing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />

                    <p className="font-semibold">Reading Excel workbook...</p>

                    <p className="text-sm text-muted-foreground">
                      Finding the correct import worksheet.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <Upload className="h-7 w-7 text-primary" />
                    </div>

                    <div>
                      <p className="font-semibold">Drop your Excel file here</p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        or click to browse
                      </p>
                    </div>

                    <Badge variant="secondary" className="font-mono">
                      .xlsx / .xls
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ==================================================
         * PREVIEW
         * ================================================ */}

        {step === "preview" && (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-base">
                      3. Review Import
                    </CardTitle>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Verify the rows before creating the server-side import
                      job.
                    </p>
                  </div>

                  <Button variant="outline" onClick={resetPage}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Choose Another File
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* File information */}

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      File
                    </p>

                    <p className="mt-1 truncate font-semibold">
                      {selectedFile?.name}
                    </p>
                  </div>

                  <div className="rounded-xl border p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Worksheet
                    </p>

                    <p className="mt-1 font-semibold">{parsedSheet}</p>
                  </div>

                  <div className="rounded-xl border p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Header Row
                    </p>

                    <p className="mt-1 font-semibold">
                      {parsedHeaderRow ?? "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Data Rows
                    </p>

                    <p className="mt-1 text-xl font-bold text-primary">
                      {parsedRows.length}
                    </p>
                  </div>
                </div>

                {/* Correct worksheet warning */}

                {parsedSheet.toLowerCase().includes("lookup") && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />

                    <AlertTitle>Wrong worksheet detected</AlertTitle>

                    <AlertDescription>
                      The Lookups worksheet must never be imported. Please
                      select the actual geography import worksheet.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Local errors */}

                {localErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />

                    <AlertTitle>Fix validation errors</AlertTitle>

                    <AlertDescription>
                      {localErrors.length} required field validation issue
                      {localErrors.length === 1 ? "" : "s"} found. These rows
                      will not be uploaded.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Preview table */}

                <div className="overflow-hidden rounded-xl border">
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-background">
                        <TableRow>
                          <TableHead className="w-16">#</TableHead>

                          {[...template.required, ...template.optional]
                            .slice(0, 8)
                            .map((field) => (
                              <TableHead key={field}>{field}</TableHead>
                            ))}
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {parsedRows.slice(0, 100).map((row, index) => {
                          const rowErrors = localErrors.filter(
                            (error) => error.rowIndex === index + 1,
                          );

                          return (
                            <TableRow
                              key={index}
                              className={
                                rowErrors.length ? "bg-rose-50/50" : ""
                              }
                            >
                              <TableCell className="font-semibold">
                                {index + 1}
                              </TableCell>

                              {[...template.required, ...template.optional]
                                .slice(0, 8)
                                .map((field) => (
                                  <TableCell
                                    key={field}
                                    className="max-w-[240px] truncate"
                                  >
                                    {String(row[field] ?? "")}
                                  </TableCell>
                                ))}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {parsedRows.length > 100 && (
                  <p className="text-xs text-muted-foreground">
                    Showing first 100 of {parsedRows.length} rows.
                  </p>
                )}

                {/* Upload */}

                <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={resetPage}>
                    Cancel
                  </Button>

                  <Button
                    onClick={handleUpload}
                    disabled={
                      uploading ||
                      isParsing ||
                      localErrors.length > 0 ||
                      parsedRows.length === 0
                    }
                    className="gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating Import Job...
                      </>
                    ) : (
                      <>
                        <FileUp className="h-4 w-4" />
                        Start Import Validation
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ==================================================
         * JOB STATUS
         * ================================================ */}

        {step === "job" && job && (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-base">
                      Import Job
                      <StatusBadge status={job.status} />
                    </CardTitle>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {job.fileName || selectedFile?.name || "Import file"}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Stats */}

                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard label="Total Rows" value={job.totalRows} />

                  <StatCard label="Processed" value={job.processedRows} />

                  <StatCard
                    label="Passed Validation"
                    value={job.successCount}
                    success
                  />

                  <StatCard
                    label="Failed Rows"
                    value={job.failedCount}
                    danger={job.failedCount > 0}
                  />
                </div>

                {/* Progress */}

                {(job.status === "PENDING" ||
                  job.status === "VALIDATING" ||
                  job.status === "IMPORTING") && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Processing</span>

                      <span className="text-muted-foreground">{progress}%</span>
                    </div>

                    <Progress value={progress} />
                  </div>
                )}

                {/* PREVIEW */}

                {job.status === "PREVIEW" && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />

                    <AlertTitle>Validation completed</AlertTitle>

                    <AlertDescription>
                      The file passed validation and is ready for administrator
                      confirmation.
                    </AlertDescription>
                  </Alert>
                )}

                {/* FAILED */}

                {job.status === "FAILED" && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />

                    <AlertTitle>Import validation failed</AlertTitle>

                    <AlertDescription>
                      Review the validation errors below and upload a corrected
                      file.
                    </AlertDescription>
                  </Alert>
                )}

                {/* COMPLETED */}

                {job.status === "COMPLETED" && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />

                    <AlertTitle>Import completed successfully</AlertTitle>

                    <AlertDescription>
                      All valid geography rows have been imported successfully.
                    </AlertDescription>
                  </Alert>
                )}

                {/* PARTIAL */}

                {job.status === "PARTIAL" && (
                  <Alert>
                    <CircleAlert className="h-4 w-4" />

                    <AlertTitle>Import partially completed</AlertTitle>

                    <AlertDescription>
                      Some rows were imported while others failed. Review the
                      errors below.
                    </AlertDescription>
                  </Alert>
                )}

                {/* CONFIRM */}

                {job.status === "PREVIEW" && (
                  <div className="flex justify-end border-t pt-5">
                    <Button
                      onClick={handleConfirm}
                      disabled={confirming}
                      className="gap-2"
                    >
                      {confirming ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Confirm & Import
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* ERRORS */}

                {allErrors.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-rose-600">
                      <AlertCircle className="h-4 w-4" />
                      Validation Errors ({allErrors.length})
                    </div>

                    <div className="overflow-hidden rounded-xl border border-rose-200">
                      <div className="max-h-[500px] overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Row</TableHead>

                              <TableHead>Field</TableHead>

                              <TableHead>Value</TableHead>

                              <TableHead>Error</TableHead>
                            </TableRow>
                          </TableHeader>

                          <TableBody>
                            {allErrors.map((error, index) => (
                              <TableRow
                                key={`${error.rowIndex}-${error.field}-${index}`}
                              >
                                <TableCell className="font-semibold">
                                  Row {error.rowIndex}
                                </TableCell>

                                <TableCell className="font-mono text-xs text-rose-600">
                                  {error.field || "N/A"}
                                </TableCell>

                                <TableCell className="max-w-[240px] truncate text-muted-foreground">
                                  {error.value === null ||
                                  error.value === undefined
                                    ? "null"
                                    : String(error.value)}
                                </TableCell>

                                <TableCell className="font-medium text-rose-600">
                                  {error.reason}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}

                {/* NEW IMPORT */}

                {(job.status === "FAILED" ||
                  job.status === "COMPLETED" ||
                  job.status === "PARTIAL") && (
                  <div className="flex justify-end border-t pt-5">
                    <Button variant="outline" onClick={resetPage}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Start New Import
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ==================================================
         * IMPORTANT IMPLEMENTATION NOTE
         * ================================================ */}

        <Alert>
          <Info className="h-4 w-4" />

          <AlertTitle>Import worksheet detection</AlertTitle>

          <AlertDescription>
            The importer does not assume the first Excel worksheet is the import
            sheet. It searches the workbook for the worksheet whose headers
            match the selected geography type and ignores the Lookups worksheet.
          </AlertDescription>
        </Alert>
      </div>
    </MainLayout>
  );
}

/* ============================================================
 * STAT CARD
 * ========================================================== */

function StatCard({
  label,
  value,
  success,
  danger,
}: {
  label: string;
  value: number;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>

      <p
        className={[
          "mt-2 text-2xl font-bold",
          success ? "text-emerald-600" : "",
          danger ? "text-rose-600" : "",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
