import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "../lib/prisma.js";
import logger from "../utils/logger.js";
import { Prisma } from "@prisma/client";

/**
 * Invoice Service
 *
 * Handles invoice number generation and PDF creation.
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

  const methodLabel = payment.method || "—";
  const gatewayLabel = payment.gateway || "";
  const txnRef =
    payment.gatewayPaymentId || payment.transactionId || "—";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${invoiceNumber}</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:720px;margin:40px auto;padding:24px;color:#1e293b}
h1{color:#1e40af;margin-bottom:8px;font-size:28px}
.meta{color:#64748b;font-size:14px;margin-bottom:24px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
.box{padding:16px;border:1px solid #e2e8f0;border-radius:8px}
.box h3{margin:0 0 8px;font-size:13px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px}
table{width:100%;border-collapse:collapse;margin-top:24px}
td,th{padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:14px}
th{background:#f8fafc;font-weight:600;color:#475569}
.total td{font-weight:700;border-top:2px solid #1e40af;font-size:16px}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600}
.badge-success{background:#dcfce7;color:#166534}
.badge-pending{background:#fef3c7;color:#92400e}
.footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;color:#94a3b8;font-size:12px}
</style></head><body>
<h1>INVOICE</h1>
<p class="meta">Invoice #: ${invoiceNumber}</p>

<div class="grid">
  <div class="box">
    <h3>Billed To</h3>
    <p><strong>${tenant.name}</strong><br>${tenant.constituencyName}<br>${tenant.email || ""}</p>
    ${payment.gstNumber ? `<p>GSTIN: ${payment.gstNumber}</p>` : ""}
  </div>
  <div class="box">
    <h3>Invoice Details</h3>
    <p>Date: ${(payment.paidAt || payment.createdAt).toLocaleDateString("en-IN")}<br>
    Status: <span class="badge ${payment.status === "SUCCESS" ? "badge-success" : "badge-pending"}">${payment.status}</span><br>
    Payment: ${methodLabel}${gatewayLabel ? ` (${gatewayLabel})` : ""}<br>
    Ref: ${txnRef}</p>
  </div>
</div>

<table>
<tr><th>Description</th><th style="text-align:right">Amount (${payment.currency})</th></tr>
<tr><td>${plan.name} — ${payment.subscription.billingCycle} plan</td><td style="text-align:right">${subtotal.toFixed(2)}</td></tr>
${tax > 0 ? `<tr><td>Tax / GST</td><td style="text-align:right">${tax.toFixed(2)}</td></tr>` : ""}
<tr class="total"><td>Total</td><td style="text-align:right">₹${total.toFixed(2)}</td></tr>
</table>

${payment.notes ? `<p style="margin-top:24px;color:#64748b;font-size:13px"><em>${payment.notes}</em></p>` : ""}

<div class="footer">
  <p>This is a computer-generated invoice. No signature required.</p>
</div>
</body></html>`;

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
