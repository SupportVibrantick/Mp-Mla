import PDFDocument from "pdfkit";
import { Readable } from "stream";
import crypto from "crypto";

// ════════════════════════════════════════════════════════
// INTERFACES
// ════════════════════════════════════════════════════════

export interface PdfTenantInfo {
  name: string;
  constituencyName: string;
  representativeName: string;
  representativeTitle: string;
  state?: string | null;
  district?: string | null;
}

export interface ChartDataItem {
  label: string;
  value: number;
  color?: string;
}

export interface PdfReportOptions {
  title: string;
  type: string;
  tenant: PdfTenantInfo;
  generatedBy: string;
  referenceNumber: string;
  dateRangeText?: string;
  data: any;
}

// ════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════

export function generateReportReference(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 5);
  return `RPT-${yyyy}-${mm}-${dd}-${rand}`;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "N/A";
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "N/A";
  return dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "N/A";
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "N/A";
  return dateObj.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return n.toLocaleString("en-IN");
}

function pct(part: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

// ════════════════════════════════════════════════════════
// CHART COLOR PALETTE
// ════════════════════════════════════════════════════════
const CHART_COLORS = [
  "#1e40af", "#059669", "#d97706", "#dc2626",
  "#7c3aed", "#0891b2", "#be185d", "#4338ca",
  "#15803d", "#b45309", "#9333ea", "#0369a1",
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#ef4444",
  IN_PROGRESS: "#f59e0b",
  IN_PROGRE: "#f59e0b",
  RESOLVED: "#22c55e",
  CLOSED: "#6b7280",
  REJECTED: "#991b1b",
  ESCALATED: "#dc2626",
  PENDING: "#f59e0b",
  RUNNING: "#3b82f6",
  COMPLETED: "#22c55e",
  DELAYED: "#ef4444",
  ON_HOLD: "#6b7280",
  CANCELLED: "#991b1b",
};

// ════════════════════════════════════════════════════════
// MAIN PDF STREAM CREATOR
// ════════════════════════════════════════════════════════

export function createReportPdfStream(options: PdfReportOptions): Readable {
  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });

  const { title, type, tenant, generatedBy, referenceNumber, dateRangeText, data } = options;
  const repTitle = tenant.representativeTitle || "Representative";
  const repName = tenant.representativeName || "Shri Representative";
  const constituency = tenant.constituencyName || "Constituency";
  const districtState = [tenant.district, tenant.state].filter(Boolean).join(", ");
  const generationDateStr = formatDateTime(new Date());

  const pageWidth = doc.page.width;   // 595.28 for A4
  const pageHeight = doc.page.height; // 841.89 for A4
  const margin = 40;
  const printableWidth = pageWidth - margin * 2;
  const bottomThreshold = pageHeight - margin - 40;

  // ────────────────────────────────────────────────────────
  // COVER PAGE (Page 1 — Dedicated)
  // ────────────────────────────────────────────────────────
  function drawCoverPage() {
    let y = margin;

    // Top government-style header band
    doc.rect(margin, y, printableWidth, 80).fill("#1e293b");

    doc
      .fontSize(9).font("Helvetica-Bold").fillColor("#94a3b8")
      .text("GOVERNMENT / CONSTITUENCY REPORT", margin + 16, y + 12, { width: printableWidth - 32, lineBreak: false });

    doc
      .fontSize(16).font("Helvetica-Bold").fillColor("#38bdf8")
      .text(repName, margin + 16, y + 28, { width: printableWidth - 32, lineBreak: false });

    doc
      .fontSize(10).font("Helvetica").fillColor("#e2e8f0")
      .text(repTitle, margin + 16, y + 48, { width: printableWidth - 32, lineBreak: false });

    doc
      .fontSize(9).font("Helvetica").fillColor("#94a3b8")
      .text(`${constituency} • ${districtState || "India"}`, margin + 16, y + 62, { width: printableWidth - 32, lineBreak: false });

    y += 80;

    // Divider
    doc.moveTo(margin, y).lineTo(margin + printableWidth, y).strokeColor("#334155").lineWidth(2).stroke();
    y += 2;

    // Report title centered block
    doc.rect(margin, y, printableWidth, 130).fill("#f8fafc");
    doc.rect(margin, y, printableWidth, 130).strokeColor("#e2e8f0").lineWidth(0.5).stroke();

    const titleCenterY = y + 25;
    doc
      .fontSize(22).font("Helvetica-Bold").fillColor("#0f172a")
      .text(title.toUpperCase(), margin, titleCenterY, { width: printableWidth, align: "center", lineBreak: true });

    doc
      .fontSize(12).font("Helvetica").fillColor("#475569")
      .text("Constituency Management System", margin, titleCenterY + 55, { width: printableWidth, align: "center", lineBreak: false });

    if (dateRangeText) {
      doc
        .fontSize(10).font("Helvetica-Oblique").fillColor("#64748b")
        .text(`Report Period: ${dateRangeText}`, margin, titleCenterY + 75, { width: printableWidth, align: "center", lineBreak: false });
    }

    y += 130;

    // Divider
    doc.moveTo(margin, y).lineTo(margin + printableWidth, y).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
    y += 12;

    // Metadata section
    const metaX = margin + 40;
    const metaValX = margin + 200;
    const metaW = printableWidth - 240;

    doc.rect(margin, y - 4, printableWidth, 76).fillAndStroke("#ffffff", "#e2e8f0");

    const metaItems = [
      ["Generated On", generationDateStr],
      ["Generated By", generatedBy],
      ["Reference No.", referenceNumber],
    ];

    metaItems.forEach(([label, value], idx) => {
      const my = y + 8 + idx * 22;
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#64748b").text(`${label}`, metaX, my, { lineBreak: false });
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#64748b").text(":", metaValX - 15, my, { lineBreak: false });
      doc.fontSize(10).font("Helvetica").fillColor("#0f172a").text(value!, metaValX, my, { width: metaW, lineBreak: false });
    });

    y += 76 + 12;

    // Confidentiality seal section
    doc.rect(margin, y, printableWidth, 100).fillAndStroke("#fefce8", "#fbbf24");

    const sealY = y + 15;
    doc
      .fontSize(14).font("Helvetica-Bold").fillColor("#92400e")
      .text("CONFIDENTIAL", margin, sealY, { width: printableWidth, align: "center", lineBreak: false });

    doc
      .fontSize(11).font("Helvetica").fillColor("#a16207")
      .text("FOR OFFICIAL USE ONLY", margin, sealY + 22, { width: printableWidth, align: "center", lineBreak: false });

    doc
      .moveTo(margin + 60, sealY + 44).lineTo(margin + printableWidth - 60, sealY + 44)
      .strokeColor("#d97706").lineWidth(0.5).stroke();

    doc
      .fontSize(9).font("Helvetica").fillColor("#92400e")
      .text("Authorized By:", margin, sealY + 52, { width: printableWidth, align: "center", lineBreak: false });
    doc
      .fontSize(11).font("Helvetica-Bold").fillColor("#78350f")
      .text(repName, margin, sealY + 66, { width: printableWidth, align: "center", lineBreak: false });

    y += 100 + 20;

    // Disclaimer at bottom of cover
    doc
      .fontSize(7).font("Helvetica-Oblique").fillColor("#94a3b8")
      .text(
        "This document is computer-generated by the Constituency Management Platform and does not require a physical signature. " +
        "All data within this report is sourced from the platform's administrative records and is intended for internal governance purposes only.",
        margin + 20, pageHeight - margin - 40,
        { width: printableWidth - 40, align: "center", lineBreak: true },
      );
  }

  drawCoverPage();

  // ────────────────────────────────────────────────────────
  // CONTENT PAGE HEADER (Pages 2+)
  // ────────────────────────────────────────────────────────
  function drawContentHeader() {
    const y = margin;

    // Slim header bar
    doc.rect(margin, y, printableWidth, 38).fillAndStroke("#1e293b", "#0f172a");

    // Left: Office + Rep
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#94a3b8")
      .text(`OFFICE OF ${repTitle.toUpperCase()}`, margin + 10, y + 6, { width: printableWidth / 2, lineBreak: false });
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#38bdf8")
      .text(repName, margin + 10, y + 18, { width: printableWidth / 2, lineBreak: false });

    // Right: Reference
    doc.fontSize(7).font("Helvetica").fillColor("#94a3b8")
      .text(`Ref: ${referenceNumber}`, margin + printableWidth / 2, y + 6, { width: printableWidth / 2 - 10, align: "right", lineBreak: false });
    doc.fontSize(7).font("Helvetica").fillColor("#94a3b8")
      .text(generationDateStr, margin + printableWidth / 2, y + 18, { width: printableWidth / 2 - 10, align: "right", lineBreak: false });

    // Sub-band: Report title
    const subY = y + 42;
    doc.rect(margin, subY, printableWidth, 18).fillAndStroke("#f1f5f9", "#e2e8f0");
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#0f172a")
      .text(title.toUpperCase(), margin + 8, subY + 4, { width: printableWidth - 16, lineBreak: false });

    doc.y = subY + 22;
  }

  // ────────────────────────────────────────────────────────
  // HELPERS
  // ────────────────────────────────────────────────────────
  function startContentPage() {
    doc.addPage();
    drawContentHeader();
  }

  function checkPageOverflow(neededHeight: number): boolean {
    if (doc.y + neededHeight > bottomThreshold) {
      startContentPage();
      return true;
    }
    return false;
  }

  function drawSectionTitle(heading: string) {
    checkPageOverflow(30);
    const y = doc.y;
    doc.rect(margin, y, printableWidth, 20).fill("#1e40af");
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#ffffff")
      .text(heading.toUpperCase(), margin + 8, y + 5, { width: printableWidth - 16, lineBreak: false });
    doc.y = y + 24;
  }

  function drawSubSectionTitle(heading: string) {
    checkPageOverflow(24);
    const y = doc.y;
    doc.rect(margin, y, printableWidth, 16).fillAndStroke("#e0e7ff", "#a5b4fc");
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#1e3a8a")
      .text(heading, margin + 8, y + 4, { width: printableWidth - 16, lineBreak: false });
    doc.y = y + 20;
  }

  // ────────────────────────────────────────────────────────
  // SUMMARY CARDS
  // ────────────────────────────────────────────────────────
  function drawSummaryCards(cards: { label: string; value: string | number }[]) {
    if (!cards.length) return;
    checkPageOverflow(60);

    const cardWidth = (printableWidth - (cards.length - 1) * 6) / cards.length;
    const cardY = doc.y;

    cards.forEach((card, idx) => {
      const cx = margin + idx * (cardWidth + 6);
      doc.rect(cx, cardY, cardWidth, 42).fillAndStroke("#f8fafc", "#cbd5e1");

      doc.fontSize(7).font("Helvetica-Bold").fillColor("#64748b")
        .text(card.label.toUpperCase(), cx + 3, cardY + 6, { width: cardWidth - 6, align: "center", lineBreak: false });
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#0f172a")
        .text(String(card.value), cx + 3, cardY + 22, { width: cardWidth - 6, align: "center", lineBreak: false });
    });

    doc.y = cardY + 50;
  }

  // ────────────────────────────────────────────────────────
  // HORIZONTAL BAR CHART (with count + percentage labels)
  // ────────────────────────────────────────────────────────
  function drawHorizontalBarChart(chartTitle: string, items: ChartDataItem[], options?: { maxItems?: number; showTopSummary?: boolean }) {
    const maxItems = options?.maxItems || 10;
    const sorted = [...items].sort((a, b) => b.value - a.value);
    const display = sorted.slice(0, maxItems);
    const total = items.reduce((s, i) => s + i.value, 0);

    const chartHeight = 26 + display.length * 22 + (options?.showTopSummary ? 50 : 0);
    checkPageOverflow(chartHeight + 10);

    // Title
    const startY = doc.y;
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#1e293b")
      .text(chartTitle, margin, startY, { lineBreak: false });
    doc.y = startY + 16;

    const barStartX = margin + 120;
    const barMaxWidth = printableWidth - 120 - 80; // space for labels on right

    display.forEach((item, idx) => {
      const y = doc.y;
      const barWidth = total > 0 ? Math.max(2, (item.value / (sorted[0]?.value || 1)) * barMaxWidth) : 2;
      const color = item.color || STATUS_COLORS[item.label] || CHART_COLORS[idx % CHART_COLORS.length];

      // Label
      doc.fontSize(7.5).font("Helvetica").fillColor("#334155")
        .text(item.label, margin, y + 3, { width: 115, lineBreak: false, ellipsis: true });

      // Bar
      doc.rect(barStartX, y + 1, barWidth, 14).fill(color);

      // Count + Percentage
      const labelText = `${formatNum(item.value)}  (${pct(item.value, total)})`;
      doc.fontSize(7).font("Helvetica-Bold").fillColor("#475569")
        .text(labelText, barStartX + barWidth + 6, y + 4, { lineBreak: false });

      doc.y = y + 20;
    });

    // Show summary stats if requested (for ward population)
    if (options?.showTopSummary && items.length > 0) {
      doc.y += 4;
      const y = doc.y;
      doc.rect(margin, y, printableWidth, 42).fillAndStroke("#f0fdf4", "#86efac");

      const highest = sorted[0];
      const lowest = sorted[sorted.length - 1];
      const avg = Math.round(total / items.length);

      doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#166534")
        .text(`Highest: ${highest.label} — ${formatNum(highest.value)}`, margin + 10, y + 6, { width: printableWidth / 3, lineBreak: false });
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#166534")
        .text(`Lowest: ${lowest.label} — ${formatNum(lowest.value)}`, margin + printableWidth / 3, y + 6, { width: printableWidth / 3, lineBreak: false });
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#166534")
        .text(`Average: ${formatNum(avg)}`, margin + (printableWidth / 3) * 2, y + 6, { width: printableWidth / 3, lineBreak: false });

      if (items.length > maxItems) {
        doc.fontSize(7).font("Helvetica-Oblique").fillColor("#15803d")
          .text(`Showing Top ${maxItems} of ${items.length} total items`, margin + 10, y + 24, { width: printableWidth - 20, lineBreak: false });
      }

      doc.y = y + 46;
    }

    doc.y += 8;
  }

  // ────────────────────────────────────────────────────────
  // TWO-COLUMN KEY-VALUE LAYOUT (Demographics)
  // ────────────────────────────────────────────────────────
  function drawKeyValueSection(sectionTitle: string, items: [string, string | number][]) {
    drawSubSectionTitle(sectionTitle);
    const colWidth = (printableWidth - 10) / 2;

    for (let i = 0; i < items.length; i += 2) {
      checkPageOverflow(16);
      const y = doc.y;
      const bg = Math.floor(i / 2) % 2 === 0 ? "#ffffff" : "#f8fafc";
      doc.rect(margin, y, printableWidth, 14).fillAndStroke(bg, "#e2e8f0");

      // Left column
      doc.fontSize(7.5).font("Helvetica").fillColor("#475569")
        .text(items[i][0], margin + 4, y + 3, { width: colWidth / 2, lineBreak: false });
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#0f172a")
        .text(String(items[i][1]), margin + colWidth / 2, y + 3, { width: colWidth / 2, lineBreak: false });

      // Right column
      if (i + 1 < items.length) {
        const rx = margin + colWidth + 10;
        doc.fontSize(7.5).font("Helvetica").fillColor("#475569")
          .text(items[i + 1][0], rx, y + 3, { width: colWidth / 2, lineBreak: false });
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#0f172a")
          .text(String(items[i + 1][1]), rx + colWidth / 2, y + 3, { width: colWidth / 2, lineBreak: false });
      }

      doc.y = y + 14;
    }

    doc.y += 8;
  }

  // ────────────────────────────────────────────────────────
  // TABLE RENDERER
  // ────────────────────────────────────────────────────────
  function renderTable(
    columns: { header: string; width: number; align?: "left" | "center" | "right" }[],
    rows: any[],
    getValue: (row: any, colIdx: number) => string,
  ) {
    if (!rows || rows.length === 0) {
      checkPageOverflow(22);
      doc.fontSize(8).font("Helvetica-Oblique").fillColor("#64748b")
        .text("No records found for the selected criteria.", margin, doc.y + 4, { lineBreak: false });
      doc.y += 20;
      return;
    }

    function drawTableHeader() {
      const y = doc.y;
      doc.rect(margin, y, printableWidth, 16).fill("#334155");
      let cx = margin;
      columns.forEach((col) => {
        doc.fontSize(7).font("Helvetica-Bold").fillColor("#ffffff")
          .text(col.header.toUpperCase(), cx + 2, y + 4, { width: col.width - 4, align: col.align || "left", lineBreak: false });
        cx += col.width;
      });
      doc.y = y + 16;
    }

    checkPageOverflow(34);
    drawTableHeader();

    rows.forEach((row, rowIdx) => {
      const pageBroke = checkPageOverflow(16);
      if (pageBroke) drawTableHeader();

      const y = doc.y;
      const bg = rowIdx % 2 === 0 ? "#ffffff" : "#f8fafc";
      doc.rect(margin, y, printableWidth, 16).fillAndStroke(bg, "#e2e8f0");

      let cx = margin;
      columns.forEach((col, colIdx) => {
        const val = getValue(row, colIdx) || "-";
        doc.fontSize(7).font("Helvetica").fillColor("#1e293b")
          .text(val, cx + 2, y + 4, { width: col.width - 4, align: col.align || "left", lineBreak: false, ellipsis: true });
        cx += col.width;
      });

      doc.y = y + 16;
    });

    doc.y += 10;
  }

  // ────────────────────────────────────────────────────────
  // REPORT END SECTION
  // ────────────────────────────────────────────────────────
  function drawReportEnd() {
    checkPageOverflow(90);
    const y = doc.y + 10;

    // End marker
    doc.moveTo(margin, y).lineTo(margin + printableWidth, y).strokeColor("#cbd5e1").lineWidth(1).stroke();

    doc.fontSize(10).font("Helvetica-Bold").fillColor("#1e293b")
      .text("— END OF REPORT —", margin, y + 10, { width: printableWidth, align: "center", lineBreak: false });

    doc.fontSize(7.5).font("Helvetica-Oblique").fillColor("#64748b")
      .text(
        "This document is computer-generated by the Constituency Management Platform and does not require a physical signature. " +
        "All data is sourced from administrative records and is intended for official internal governance purposes only.",
        margin + 20, y + 30,
        { width: printableWidth - 40, align: "center", lineBreak: true },
      );

    const authY = y + 60;
    doc.fontSize(8).font("Helvetica").fillColor("#475569")
      .text(`Authorized By: ${repName} (${repTitle})`, margin, authY, { width: printableWidth, align: "center", lineBreak: false });
    doc.fontSize(7).font("Helvetica").fillColor("#94a3b8")
      .text(`Ref: ${referenceNumber} | Generated: ${generationDateStr}`, margin, authY + 14, { width: printableWidth, align: "center", lineBreak: false });
  }

  // ════════════════════════════════════════════════════════
  // START CONTENT (Page 2+)
  // ════════════════════════════════════════════════════════
  startContentPage();

  // ─── Executive Summary Cards ────────────────────────────
  if (data.summary) {
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b")
      .text("EXECUTIVE OVERVIEW", margin, doc.y, { lineBreak: false });
    doc.y += 14;

    const cards: { label: string; value: string | number }[] = [];
    const s = data.summary;

    if (s.totalGrievances !== undefined) {
      cards.push({ label: "Total Requests", value: formatNum(s.totalGrievances) });
      cards.push({ label: "Resolved", value: formatNum(s.resolvedGrievances || 0) });
      if (s.urgentGrievances !== undefined) cards.push({ label: "Urgent / High", value: formatNum(s.urgentGrievances) });
    }
    if (s.totalProjects !== undefined) {
      cards.push({ label: "Projects", value: formatNum(s.totalProjects) });
      if (s.completedProjects !== undefined) cards.push({ label: "Completed", value: formatNum(s.completedProjects) });
      cards.push({ label: "Budget", value: formatCurrency(s.totalBudgetSanctioned) });
    }
    if (s.totalWards !== undefined) cards.push({ label: "Wards", value: formatNum(s.totalWards) });
    if (s.totalPopulation !== undefined) cards.push({ label: "Population", value: formatNum(s.totalPopulation) });
    if (s.totalVoters !== undefined) cards.push({ label: "Voters", value: formatNum(s.totalVoters) });
    if (s.totalInstitutions !== undefined) cards.push({ label: "Facilities", value: formatNum(s.totalInstitutions) });
    if (s.totalLeaders !== undefined) cards.push({ label: "Leaders", value: formatNum(s.totalLeaders) });
    if (s.totalDepartments !== undefined) cards.push({ label: "Departments", value: formatNum(s.totalDepartments) });
    if (s.totalFunds !== undefined) cards.push({ label: "Funds", value: formatNum(s.totalFunds) });

    // Render cards in rows of max 5
    while (cards.length > 0) {
      const batch = cards.splice(0, 5);
      drawSummaryCards(batch);
    }
  }

  // ─── ANALYTICS CHARTS ──────────────────────────────────
  if (data.chartData) {
    drawSectionTitle("Analytics & Statistics");

    // Grievance Status Distribution
    if (data.chartData.grievanceByStatus?.length) {
      drawHorizontalBarChart("Grievance Status Distribution", data.chartData.grievanceByStatus);
    }

    // Grievance Category Breakdown
    if (data.chartData.grievanceByCategory?.length) {
      drawHorizontalBarChart("Grievances by Category", data.chartData.grievanceByCategory, { maxItems: 10 });
    }

    // Project Status Distribution
    if (data.chartData.projectByStatus?.length) {
      drawHorizontalBarChart("Project Status Distribution", data.chartData.projectByStatus);
    }

    // Project Budget by Ward (Top 10)
    if (data.chartData.budgetByWard?.length) {
      drawHorizontalBarChart("Project Budget Allocation by Ward (Top 10)", data.chartData.budgetByWard, { maxItems: 10, showTopSummary: true });
    }

    // Ward Population (Top 10)
    if (data.chartData.populationByWard?.length) {
      drawHorizontalBarChart("Ward Population Comparison (Top 10)", data.chartData.populationByWard, { maxItems: 10, showTopSummary: true });
    }
  }

  // ─── DEMOGRAPHICS SECTION ──────────────────────────────
  if (data.demographics) {
    drawSectionTitle("Constituency Demographics Summary");
    const d = data.demographics;

    drawKeyValueSection("Population & Gender", [
      ["Total Population", formatNum(d.totalPopulation)],
      ["Total Households", formatNum(d.totalHouseholds)],
      ["Male Population", formatNum(d.maleCount)],
      ["Female Population", formatNum(d.femaleCount)],
      ["Transgender", formatNum(d.transgenderCount)],
      ["Gender Ratio (F:M)", d.maleCount > 0 ? `${Math.round((d.femaleCount / d.maleCount) * 1000)}` : "N/A"],
    ]);

    drawKeyValueSection("Age Distribution", [
      ["0-6 Years", formatNum(d.age0to6)],
      ["7-18 Years", formatNum(d.age7to18)],
      ["19-35 Years", formatNum(d.age19to35)],
      ["36-60 Years", formatNum(d.age36to60)],
      ["60+ Years", formatNum(d.age60plus)],
      ["Working Age (19-60)", formatNum((d.age19to35 || 0) + (d.age36to60 || 0))],
    ]);

    drawKeyValueSection("Household Classification", [
      ["Total Households", formatNum(d.totalHouseholds)],
      ["BPL Households", formatNum(d.bplHouseholds)],
      ["APL Households", formatNum(d.aplHouseholds)],
      ["BPL Percentage", d.totalHouseholds > 0 ? pct(d.bplHouseholds, d.totalHouseholds) : "N/A"],
    ]);

    drawKeyValueSection("Social Category Distribution", [
      ["General", formatNum(d.generalCount)],
      ["OBC", formatNum(d.obcCount)],
      ["SC", formatNum(d.scCount)],
      ["ST", formatNum(d.stCount)],
      ["Minority", formatNum(d.minorityCount)],
      ["Others", formatNum(d.otherCount)],
    ]);

    drawKeyValueSection("Voter Registration", [
      ["Total Voters", formatNum(d.totalVoters)],
      ["Male Voters", formatNum(d.maleVoters)],
      ["Female Voters", formatNum(d.femaleVoters)],
      ["New Voters", formatNum(d.newVotersCount)],
    ]);

    if (d.literacyRate !== undefined || d.maleLiteracyRate !== undefined) {
      drawKeyValueSection("Literacy & Education", [
        ["Overall Literacy Rate", d.literacyRate ? `${d.literacyRate.toFixed(1)}%` : "N/A"],
        ["Male Literacy Rate", d.maleLiteracyRate ? `${d.maleLiteracyRate.toFixed(1)}%` : "N/A"],
        ["Female Literacy Rate", d.femaleLiteracyRate ? `${d.femaleLiteracyRate.toFixed(1)}%` : "N/A"],
        ["Total Births", formatNum(d.totalBirths)],
        ["Total Deaths", formatNum(d.totalDeaths)],
        ["Birth-Death Ratio", d.totalDeaths > 0 ? `${(d.totalBirths / d.totalDeaths).toFixed(2)}` : "N/A"],
      ]);
    }
  }

  // ════════════════════════════════════════════════════════
  // MODULE DATA TABLES
  // ════════════════════════════════════════════════════════

  // 1. GRIEVANCES
  if (type === "consolidated" || type === "grievance") {
    const grievances = data.grievances || [];
    if (grievances.length > 0 || type === "grievance") {
      drawSectionTitle(`Public Requests / Grievances (${grievances.length})`);

      const cols = [
        { header: "S.No", width: 26, align: "center" as const },
        { header: "Ticket #", width: 62 },
        { header: "Complainant", width: 80 },
        { header: "Subject", width: 90 },
        { header: "Category", width: 58 },
        { header: "Ward", width: 40 },
        { header: "Priority", width: 42, align: "center" as const },
        { header: "Status", width: 50, align: "center" as const },
        { header: "Source", width: 35, align: "center" as const },
        { header: "Filed", width: 32, align: "center" as const },
      ];

      renderTable(cols, grievances, (g, ci) => {
        switch (ci) {
          case 0: return String(grievances.indexOf(g) + 1);
          case 1: return g.ticketNumber || g.id?.slice(0, 8);
          case 2: return g.complainantName || "-";
          case 3: return g.subject || "-";
          case 4: return g.category || "-";
          case 5: return g.ward ? `W${g.ward.wardNumber}` : "-";
          case 6: return g.priority || "MED";
          case 7: return g.status || "OPEN";
          case 8: return g.source || "OFFICE";
          case 9: return formatDate(g.createdAt);
          default: return "";
        }
      });
    }
  }

  // 2. PROJECTS
  if (type === "consolidated" || type === "project") {
    const projects = data.projects || [];
    if (projects.length > 0 || type === "project") {
      drawSectionTitle(`Development Projects (${projects.length})`);

      const cols = [
        { header: "S.No", width: 26, align: "center" as const },
        { header: "Code", width: 55 },
        { header: "Project Title", width: 100 },
        { header: "Category", width: 55 },
        { header: "Ward", width: 35 },
        { header: "Sanctioned", width: 60, align: "right" as const },
        { header: "Utilized", width: 55, align: "right" as const },
        { header: "Progress", width: 40, align: "center" as const },
        { header: "Status", width: 50, align: "center" as const },
        { header: "Contractor", width: 39 },
      ];

      renderTable(cols, projects, (p, ci) => {
        switch (ci) {
          case 0: return String(projects.indexOf(p) + 1);
          case 1: return p.projectCode || "-";
          case 2: return p.name || p.title || "-";
          case 3: return p.category || "-";
          case 4: return p.ward ? `W${p.ward.wardNumber}` : "-";
          case 5: return formatCurrency(p.budgetSanctioned);
          case 6: return formatCurrency(p.budgetUsed);
          case 7: return `${p.completionPercent || 0}%`;
          case 8: return p.status || "PENDING";
          case 9: return p.contractor || "-";
          default: return "";
        }
      });
    }
  }

  // 3. WARDS
  if (type === "consolidated" || type === "ward" || type === "demographic") {
    const wards = data.wards || [];
    if (wards.length > 0 || type === "ward") {
      drawSectionTitle(`Ward Performance & Demographics (${wards.length})`);

      const cols = [
        { header: "W#", width: 26, align: "center" as const },
        { header: "Ward Name", width: 80 },
        { header: "Zone", width: 30, align: "center" as const },
        { header: "Pop.", width: 45, align: "right" as const },
        { header: "Male", width: 40, align: "right" as const },
        { header: "Female", width: 40, align: "right" as const },
        { header: "Voters", width: 45, align: "right" as const },
        { header: "Requests", width: 42, align: "right" as const },
        { header: "Projects", width: 40, align: "right" as const },
        { header: "Budget", width: 55, align: "right" as const },
        { header: "Inst.", width: 32, align: "right" as const },
      ];

      renderTable(cols, wards, (w, ci) => {
        switch (ci) {
          case 0: return String(w.wardNumber || "-");
          case 1: return w.name || "-";
          case 2: return w.zone || "-";
          case 3: return formatNum(w.totalPopulation);
          case 4: return formatNum(w.totalMale);
          case 5: return formatNum(w.totalFemale);
          case 6: return formatNum(w.totalVoters);
          case 7: return String(w.grievances || 0);
          case 8: return String(w.projects || 0);
          case 9: return formatCurrency(w.projectBudget);
          case 10: return String(w.institutions || 0);
          default: return "";
        }
      });
    }
  }

  // 4. DEPARTMENTS
  if (type === "consolidated" || type === "department") {
    const departments = data.departments || [];
    if (departments.length > 0 || type === "department") {
      drawSectionTitle(`Departments (${departments.length})`);

      const cols = [
        { header: "S.No", width: 26, align: "center" as const },
        { header: "Department Name", width: 130 },
        { header: "Code", width: 50 },
        { header: "Head Name", width: 95 },
        { header: "Phone", width: 70 },
        { header: "Requests", width: 52, align: "right" as const },
        { header: "Status", width: 52, align: "center" as const },
      ];

      renderTable(cols, departments, (d, ci) => {
        switch (ci) {
          case 0: return String(departments.indexOf(d) + 1);
          case 1: return d.name || "-";
          case 2: return d.code || "-";
          case 3: return d.headName || "-";
          case 4: return d.headPhone || d.phone || "-";
          case 5: return String(d.totalGrievances || 0);
          case 6: return d.isActive === false ? "INACTIVE" : "ACTIVE";
          default: return "";
        }
      });
    }
  }

  // 5. INSTITUTIONS
  if (type === "consolidated" || type === "institution") {
    const institutions = data.institutions || [];
    if (institutions.length > 0 || type === "institution") {
      drawSectionTitle(`Public Facilities & Institutions (${institutions.length})`);

      const cols = [
        { header: "S.No", width: 26, align: "center" as const },
        { header: "Facility Name", width: 130 },
        { header: "Category", width: 75 },
        { header: "Ward", width: 50 },
        { header: "Contact", width: 80 },
        { header: "Address", width: 80 },
        { header: "Status", width: 34, align: "center" as const },
      ];

      renderTable(cols, institutions, (inst, ci) => {
        switch (ci) {
          case 0: return String(institutions.indexOf(inst) + 1);
          case 1: return inst.name || "-";
          case 2: return inst.category || "-";
          case 3: return inst.ward ? `Ward ${inst.ward.wardNumber}` : "-";
          case 4: return inst.contactNo || "-";
          case 5: return inst.address || "-";
          case 6: return inst.status || "ACT";
          default: return "";
        }
      });
    }
  }

  // 6. FUNDS
  if (type === "consolidated" || type === "fund") {
    const funds = data.funds || [];
    if (funds.length > 0 || type === "fund") {
      drawSectionTitle(`Funds & Budget (${funds.length})`);

      const cols = [
        { header: "S.No", width: 26, align: "center" as const },
        { header: "Fund Type", width: 80 },
        { header: "FY", width: 50 },
        { header: "Allocated", width: 80, align: "right" as const },
        { header: "Released", width: 80, align: "right" as const },
        { header: "Utilized", width: 80, align: "right" as const },
        { header: "Balance", width: 79, align: "right" as const },
      ];

      renderTable(cols, funds, (f, ci) => {
        const alloc = f.totalAllocated || 0;
        const released = f.totalReleased || 0;
        const utilized = f.totalUtilized || 0;
        switch (ci) {
          case 0: return String(funds.indexOf(f) + 1);
          case 1: return f.fundType || f.name || "-";
          case 2: return f.financialYear || "-";
          case 3: return formatCurrency(alloc);
          case 4: return formatCurrency(released);
          case 5: return formatCurrency(utilized);
          case 6: return formatCurrency(alloc - utilized);
          default: return "";
        }
      });
    }
  }

  // 7. LEADERS
  if (type === "leader") {
    const leaders = data.leaders || [];
    drawSectionTitle(`Local Representatives & Leaders (${leaders.length})`);

    const cols = [
      { header: "S.No", width: 26, align: "center" as const },
      { header: "Name", width: 110 },
      { header: "Category", width: 75 },
      { header: "Designation", width: 85 },
      { header: "Organization", width: 80 },
      { header: "Ward", width: 50 },
      { header: "Phone", width: 49 },
    ];

    renderTable(cols, leaders, (l, ci) => {
      switch (ci) {
        case 0: return String(leaders.indexOf(l) + 1);
        case 1: return l.name || "-";
        case 2: return l.category || "-";
        case 3: return l.designation || "-";
        case 4: return l.organization || l.partyName || "-";
        case 5: return l.ward ? `Ward ${l.ward.wardNumber}` : "-";
        case 6: return l.phone || "-";
        default: return "";
      }
    });
  }

  // ─── END OF REPORT ─────────────────────────────────────
  drawReportEnd();

  // ════════════════════════════════════════════════════════
  // FOOTER PASS (Page numbers on all pages except cover)
  // ════════════════════════════════════════════════════════
  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  const contentPages = totalPages - 1; // Exclude cover page

  for (let i = range.start; i < range.start + totalPages; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;

    if (i === 0) {
      // Cover page — no page number, just the cover footer (already drawn)
      continue;
    }

    const footerY = pageHeight - 22;

    doc.moveTo(margin, pageHeight - 30).lineTo(pageWidth - margin, pageHeight - 30)
      .strokeColor("#cbd5e1").lineWidth(0.5).stroke();

    doc.fontSize(6.5).font("Helvetica").fillColor("#94a3b8")
      .text(
        `Confidential — ${constituency} Governance Report | Ref: ${referenceNumber}`,
        margin, footerY,
        { width: printableWidth - 80, lineBreak: false },
      );

    doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#475569")
      .text(`Page ${i} of ${contentPages}`, pageWidth - margin - 70, footerY, { width: 70, align: "right", lineBreak: false });
  }

  doc.end();
  return doc as unknown as Readable;
}
