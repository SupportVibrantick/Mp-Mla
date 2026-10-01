import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "../lib/prisma.js";
import logger from "../utils/logger.js";
import { Prisma } from "@prisma/client";

/**
 * Invoice Service
 *
 * Handles invoice number generation and PDF/HTML creation.
 * IMPORTANT: Invoice number is generated ONLY after payment verification (SUCCESS).
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INVOICE_DIR = path.join(
  __dirname,
  "..",
  "..",
  "public",
  "uploads",
  "invoices",
);

/** Sequential counter for invoice numbers within a day */
let dailyCounter = 0;
let lastCounterDate = "";

/**
 * Generate a unique invoice number.
 * Format: INV-YYYYMMDD-XXXX (date + 4-char random)
 */
export function generateInvoiceNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const todayStr = datePart;

  if (todayStr !== lastCounterDate) {
    dailyCounter = 0;
    lastCounterDate = todayStr;
  }
  dailyCounter++;

  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${datePart}-${rand}`;
}

/**
 * Generate an HTML invoice for a payment and save it as a file.
 * Called ONLY after payment is verified as SUCCESS.
 * Returns the public URL path to the invoice.
 */
export async function generateInvoicePdf(
  paymentId: string,
  tx?: Prisma.TransactionClient,
): Promise<string | null> {
  const client = tx || prisma;

  const payment = await client.payment.findUnique({
    where: { id: paymentId },
    include: {
      subscription: {
        include: { tenant: true, plan: true },
      },
    },
  });

  if (!payment) return null;

  if (!fs.existsSync(INVOICE_DIR)) {
    fs.mkdirSync(INVOICE_DIR, { recursive: true });
  }

  const tenant = payment.subscription.tenant;
  const plan = payment.subscription.plan;
  const subtotal = payment.amount;
  const tax = payment.taxAmount ?? 0;
  const total = subtotal + tax;

  // Generate invoice number if not already set
  let invoiceNumber = payment.invoiceNumber;
  if (!invoiceNumber) {
    invoiceNumber = generateInvoiceNumber();
    await client.payment.update({
      where: { id: paymentId },
      data: { invoiceNumber },
    });
  }

  const filename = `invoice-${invoiceNumber}.html`;
  const filePath = path.join(INVOICE_DIR, filename);

  const methodLabel = payment.method || "OFFLINE";
  const gatewayLabel = payment.gateway || "";
  const txnRef =
    payment.gatewayPaymentId || payment.transactionId || payment.id.slice(-12).toUpperCase();

  // Date formatting
  const d = payment.paidAt || payment.createdAt;
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const year = d.getFullYear();
  const formattedDate = `${day} ${month}, ${year}`;

  const symbolMap: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  const currencySymbol = symbolMap[payment.currency?.toUpperCase()] || "₹";

  // Fetch dynamic branding & platform settings
  const platformSettings = await client.platformSetting.findMany({
    where: {
      key: {
        in: [
          "brand_company_name",
          "brand_company_address",
          "brand_company_phone",
          "brand_company_gstin",
          "brand_bank_name",
          "brand_bank_account",
          "brand_bank_ifsc",
          "brand_support_email",
          "brand_invoice_footer_note",
          "brand_invoice_logo_url",
          "brand_logo_url",
          "brand_primary_color",
        ],
      },
    },
  }).catch(() => []);

  const settingsMap = new Map(platformSettings.map((s) => [s.key, s.value]));

  const companyName = settingsMap.get("brand_company_name") || "Vibrantick Infotech Solutions";
  const companyAddress = settingsMap.get("brand_company_address") || "Sector 62, Noida, UP 201301";
  const companyPhone = settingsMap.get("brand_company_phone") || "+91 98765 43210";
  const companyGstin = settingsMap.get("brand_company_gstin") || "07AAAAA0000A1Z5";
  const bankName = settingsMap.get("brand_bank_name") || "HDFC Bank (Primary Account)";
  const bankAccount = settingsMap.get("brand_bank_account") || "50100234567890";
  const bankIfsc = settingsMap.get("brand_bank_ifsc") || "HDFC0001234";
  const supportEmail = settingsMap.get("brand_support_email") || "support@vibrantick.org";
  const footerNote =
    settingsMap.get("brand_invoice_footer_note") ||
    `Thank you for your business! If you have any questions, please contact ${supportEmail}`;
  const logoUrl = settingsMap.get("brand_invoice_logo_url") || settingsMap.get("brand_logo_url") || "";
  const primaryColor = settingsMap.get("brand_primary_color") || "#13538A";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${invoiceNumber} - ${companyName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    color: #1e293b;
    background-color: #f1f5f9;
    padding: 30px 15px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Floating Toolbar */
  .toolbar {
    max-width: 850px;
    margin: 0 auto 16px auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #ffffff;
    padding: 12px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
    border: 1px solid #e2e8f0;
  }
  .toolbar-title {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .btn-print {
    background-color: ${primaryColor};
    color: #ffffff;
    border: none;
    padding: 9px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 3px 8px rgba(2, 132, 199, 0.3);
    transition: all 0.2s ease;
  }
  .btn-print:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  /* Invoice Main Card */
  .invoice-card {
    position: relative;
    max-width: 850px;
    margin: 0 auto;
    background: #ffffff;
    box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 1px rgba(15, 23, 42, 0.1);
    overflow: hidden;
    border: 1px solid #cbd5e1;
  }

  /* Full Width Header Banner (Matching Reference Image) */
  .header-banner {
    background-color: ${primaryColor};
    color: #ffffff;
    padding: 28px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .logo-img {
    max-height: 52px;
    max-width: 160px;
    object-fit: contain;
    background: #ffffff;
    padding: 4px 8px;
    border-radius: 6px;
  }
  .header-banner-title {
    font-family: 'Outfit', sans-serif;
    font-size: 38px;
    font-weight: 800;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #ffffff;
  }
  .company-meta-right {
    text-align: right;
    font-size: 13px;
    line-height: 1.5;
    opacity: 0.95;
  }
  .company-meta-right strong {
    font-size: 16px;
    font-weight: 800;
  }

  /* Card Inner Body */
  .card-body {
    padding: 36px 40px;
  }

  /* Sub Header Metadata (Bill To & Invoice Info) */
  .meta-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
    gap: 20px;
  }
  .meta-col {
    flex: 1;
  }
  .meta-title {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #64748b;
    margin-bottom: 8px;
  }
  .meta-item-row {
    display: flex;
    align-items: baseline;
    font-size: 13px;
    margin-bottom: 6px;
  }
  .meta-item-label {
    width: 110px;
    font-weight: 700;
    color: #0f172a;
  }
  .meta-item-val {
    color: #334155;
    font-weight: 600;
  }
  .client-name {
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 4px;
  }
  .client-details {
    font-size: 13px;
    color: #475569;
    line-height: 1.5;
  }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #ecfdf5;
    color: #047857;
    border: 1px solid #a7f3d0;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 800;
    margin-left: 8px;
  }

  /* Table Section (Matching Reference Image) */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 28px;
    font-size: 13px;
    border: 1px solid #cbd5e1;
  }
  .items-table th {
    background-color: ${primaryColor};
    color: #ffffff;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 12px 14px;
    text-align: left;
    border-right: 1px solid rgba(255, 255, 255, 0.2);
  }
  .items-table th:last-child {
    border-right: none;
  }
  .items-table th.text-center, .items-table td.text-center {
    text-align: center;
  }
  .items-table th.text-right, .items-table td.text-right {
    text-align: right;
  }
  .items-table td {
    padding: 14px 14px;
    color: #334155;
    border-bottom: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
    vertical-align: top;
  }
  .items-table td:last-child {
    border-right: none;
  }
  .items-table tr.zebra-row {
    background-color: #f8fafc;
  }
  .items-table tr.empty-row td {
    height: 38px;
    padding: 0;
  }

  /* Bottom Section: Payment Info Left + Totals Summary Right */
  .bottom-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 30px;
    margin-bottom: 28px;
  }
  .payment-info-box {
    flex: 1.2;
    font-size: 12px;
    color: #475569;
  }
  .section-heading {
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #0f172a;
    border-bottom: 2px solid ${primaryColor};
    padding-bottom: 4px;
    margin-bottom: 10px;
    display: inline-block;
  }
  .info-list {
    line-height: 1.6;
    margin-bottom: 16px;
  }
  .info-list strong {
    color: #0f172a;
  }

  .totals-summary {
    flex: 0.9;
    font-size: 13px;
  }
  .totals-table {
    width: 100%;
    border-collapse: collapse;
  }
  .totals-table td {
    padding: 6px 0;
    color: #475569;
  }
  .totals-table td.label {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
  }
  .totals-table td.val {
    text-align: right;
    font-weight: 700;
    color: #0f172a;
  }
  .totals-table tr.grand-total-row td {
    border-top: 2px solid ${primaryColor};
    border-bottom: 2px solid ${primaryColor};
    padding: 10px 10px;
    background-color: #eaf2f8;
  }
  .totals-table tr.grand-total-row td.label {
    font-size: 13px;
    font-weight: 800;
    color: ${primaryColor};
  }
  .totals-table tr.grand-total-row td.val {
    font-size: 18px;
    font-weight: 800;
    color: ${primaryColor};
  }

  /* Bottom Banner Footer */
  .footer-banner {
    background-color: ${primaryColor};
    color: #ffffff;
    text-align: center;
    padding: 14px 20px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }

  /* Media Print Rules */
  @media print {
    body {
      background: none;
      padding: 0;
    }
    .toolbar {
      display: none !important;
    }
    .invoice-card {
      box-shadow: none;
      border: none;
      max-width: 100%;
    }
    .card-body {
      padding: 30px 40px;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
  }
</style>
</head>
<body>

<div class="toolbar">
  <div class="toolbar-title">
    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
    Tax Invoice Preview
  </div>
  <button type="button" class="btn-print" id="btnPrintBtn">
    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"></path></svg>
    Print / Save PDF
  </button>
</div>

<div class="invoice-card">
  <!-- Full Width Header Banner -->
  <div class="header-banner">
    <div class="header-left">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo-img">` : ""}
      <h1 class="header-banner-title">INVOICE</h1>
    </div>
    <div class="company-meta-right">
      <strong>${companyName}</strong><br>
      ${companyAddress}<br>
      Phone: ${companyPhone} | GSTIN: ${companyGstin}
    </div>
  </div>

  <div class="card-body">
    <!-- Sub Header Meta Grid -->
    <div class="meta-section">
      <!-- Left: Invoice Meta -->
      <div class="meta-col">
        <div class="meta-item-row">
          <span class="meta-item-label">Invoice No:</span>
          <span class="meta-item-val" style="font-family: monospace; font-size:14px; color:${primaryColor};">${invoiceNumber}</span>
        </div>
        <div class="meta-item-row">
          <span class="meta-item-label">Date of Issue:</span>
          <span class="meta-item-val">${formattedDate}</span>
        </div>
        <div class="meta-item-row">
          <span class="meta-item-label">Payment Status:</span>
          <span class="status-badge">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
            PAID
          </span>
        </div>
      </div>

      <!-- Right: Bill To -->
      <div class="meta-col" style="text-align: right;">
        <div class="meta-title">Bill To</div>
        <div class="client-name">${tenant.name}</div>
        <div class="client-details">
          ${tenant.constituencyName ? `Constituency: <strong>${tenant.constituencyName}</strong><br>` : ""}
          ${tenant.email ? `Email: ${tenant.email}<br>` : ""}
          ${payment.gstNumber ? `Client GSTIN: <strong>${payment.gstNumber}</strong>` : ""}
        </div>
      </div>
    </div>

    <!-- Items Table (Matching Reference Images Layout) -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="text-center" style="width: 8%;">SL</th>
          <th style="width: 52%;">ITEM DESCRIPTION</th>
          <th class="text-right" style="width: 14%;">PRICE</th>
          <th class="text-center" style="width: 8%;">QTY</th>
          <th class="text-right" style="width: 18%;">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-center" style="font-weight:700;">1</td>
          <td>
            <strong style="color:#0f172a; font-size:14px;">${plan.name} Plan Subscription</strong><br>
            <span style="font-size:12px; color:#64748b;">${payment.subscription.billingCycle} Billing Cycle — Full Access for Constituency Management</span>
          </td>
          <td class="text-right">${currencySymbol}${subtotal.toFixed(2)}</td>
          <td class="text-center">1</td>
          <td class="text-right" style="font-weight:700; color:#0f172a;">${currencySymbol}${subtotal.toFixed(2)}</td>
        </tr>
        ${tax > 0 ? `
        <tr class="zebra-row">
          <td class="text-center" style="font-weight:700;">2</td>
          <td>
            <strong style="color:#0f172a; font-size:14px;">Goods & Services Tax (GST)</strong><br>
            <span style="font-size:12px; color:#64748b;">Statutory Regulatory Tax (18%)</span>
          </td>
          <td class="text-right">${currencySymbol}${tax.toFixed(2)}</td>
          <td class="text-center">1</td>
          <td class="text-right" style="font-weight:700; color:#0f172a;">${currencySymbol}${tax.toFixed(2)}</td>
        </tr>
        ` : `
        <tr class="zebra-row empty-row">
          <td></td><td></td><td></td><td></td><td></td>
        </tr>
        `}
        <tr class="empty-row">
          <td></td><td></td><td></td><td></td><td></td>
        </tr>
      </tbody>
    </table>

    <!-- Bottom Section: Payment Info + Summary -->
    <div class="bottom-section">
      <!-- Left: Payment Info & Notes -->
      <div class="payment-info-box">
        <div class="section-heading">PAYMENT INFO</div>
        <div class="info-list">
          Method: <strong>${methodLabel} ${gatewayLabel ? `(${gatewayLabel})` : ""}</strong><br>
          Ref / Txn ID: <strong>${txnRef}</strong><br>
          Bank: <strong>${bankName}</strong><br>
          Account: <strong>${bankAccount}</strong> | IFSC: <strong>${bankIfsc}</strong>
        </div>

        <div class="section-heading">TERMS & CONDITIONS</div>
        <div style="font-size:11px; color:#64748b; line-height:1.4;">
          ${footerNote}<br>
          <em>This is a computer-generated tax invoice. Signature not required.</em>
        </div>
      </div>

      <!-- Right: Summary Table -->
      <div class="totals-summary">
        <table class="totals-table">
          <tr>
            <td class="label">SUB TOTAL:</td>
            <td class="val">${currencySymbol}${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td class="label">TAX / GST:</td>
            <td class="val">${currencySymbol}${tax.toFixed(2)}</td>
          </tr>
          <tr class="grand-total-row">
            <td class="label">GRAND TOTAL:</td>
            <td class="val">${currencySymbol}${total.toFixed(2)}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>

  <!-- Bottom Banner Footer -->
  <div class="footer-banner">
    Thank you for your business! — ${companyName}
  </div>
</div>

<script>
  (function() {
    function doPrint() {
      try {
        window.focus();
        window.print();
      } catch(e) {
        console.error(e);
      }
    }
    var btn = document.getElementById("btnPrintBtn");
    if (btn) {
      btn.addEventListener("click", doPrint);
    }
  })();
</script>

</body>
</html>`;

  fs.writeFileSync(filePath, html, "utf-8");
  const invoiceUrl = `/uploads/invoices/${filename}`;

  // Update payment with invoice URL
  await client.payment.update({
    where: { id: paymentId },
    data: { invoiceUrl },
  });

  logger.info(`Invoice generated: ${invoiceNumber} for payment ${paymentId}`);
  return invoiceUrl;
}

/**
 * Regenerate HTML files for all payments that have completed/success status
 * with the latest dynamic branding, banking, and billing settings.
 */
export async function regenerateAllInvoices(): Promise<number> {
  const payments = await prisma.payment.findMany({
    where: {
      status: "SUCCESS",
    },
    select: { id: true },
  });

  let count = 0;
  for (const p of payments) {
    try {
      await generateInvoicePdf(p.id);
      count++;
    } catch (e) {
      logger.error(`Failed to regenerate invoice for payment ${p.id}:`, e);
    }
  }
  logger.info(`✅ Regenerated ${count} invoice(s) with latest dynamic settings.`);
  return count;
}



