import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "./prisma.js";

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

export async function generateInvoicePdf(
  paymentId: string,
): Promise<string | null> {
  const payment = await prisma.payment.findUnique({
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
  const filename = `invoice-${payment.invoiceNumber || payment.id}.html`;
  const filePath = path.join(INVOICE_DIR, filename);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${payment.invoiceNumber || payment.id}</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:24px}
table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:8px;border-bottom:1px solid #e5e7eb;text-align:left}
h1{color:#1e40af}</style></head><body>
<h1>INVOICE</h1>
<p><strong>${tenant.name}</strong><br>${tenant.constituencyName}<br>${tenant.email || ""}</p>
${payment.gstNumber ? `<p>GSTIN: ${payment.gstNumber}</p>` : ""}
<p>Invoice #: ${payment.invoiceNumber || payment.id}<br>
Date: ${(payment.paidAt || payment.createdAt).toLocaleDateString("en-IN")}<br>
Status: ${payment.status}</p>
<table><tr><th>Description</th><th>Amount (${payment.currency})</th></tr>
<tr><td>${plan.name} (${payment.subscription.billingCycle})</td><td>${subtotal.toFixed(2)}</td></tr>
${tax > 0 ? `<tr><td>Tax</td><td>${tax.toFixed(2)}</td></tr>` : ""}
<tr><td><strong>Total</strong></td><td><strong>${total.toFixed(2)}</strong></td></tr></table>
${payment.notes ? `<p style="margin-top:24px;color:#64748b">${payment.notes}</p>` : ""}
</body></html>`;

  fs.writeFileSync(filePath, html, "utf-8");
  return `/uploads/invoices/${filename}`;
}
