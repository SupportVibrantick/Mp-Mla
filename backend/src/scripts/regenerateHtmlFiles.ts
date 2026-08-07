import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INVOICE_DIR = path.join(__dirname, "..", "..", "public", "uploads", "invoices");

function renderInvoiceHtml({
  invoiceNumber,
  customerName,
  constituency,
  email,
  gstin,
  formattedDate,
  description,
  subtotal,
  tax,
  total,
  currencySymbol = "₹",
  methodLabel = "ONLINE",
  gatewayLabel = "RAZORPAY",
  txnRef = "—",
}: any) {
  const companyName = "Vibrantick Infotech Solutions";
  const companyAddress = "Sector 62, Noida, UP 201301";
  const companyPhone = "+91 98765 43210";
  const bankName = "HDFC Bank (Test Branch)";
  const bankAccount = "50100234567890 (IFSC: HDFC0001234)";
  const supportEmail = "support@vibrantick.org";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Invoice ${invoiceNumber}</title>
<script>
  function triggerPrint() {
    window.focus();
    window.print();
  }
</script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    color: #111827;
    background-color: #f8fafc;
    padding: 40px 20px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  .invoice-card {
    position: relative;
    max-width: 800px;
    margin: 0 auto;
    background: #ffffff;
    padding: 56px 64px;
    border-radius: 4px;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01);
    overflow: hidden;
  }

  .bg-watermark {
    position: absolute;
    top: 0;
    left: 0;
    width: 280px;
    height: 280px;
    pointer-events: none;
    z-index: 0;
  }

  .header {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 48px;
  }

  .company-info {
    text-align: right;
  }
  .company-logo {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-bottom: 12px;
  }
  .logo-icon {
    width: 32px;
    height: 32px;
  }
  .company-name {
    font-size: 22px;
    font-weight: 800;
    color: #111827;
    letter-spacing: -0.5px;
  }
  .company-details {
    font-size: 13px;
    color: #6b7280;
    line-height: 1.4;
  }

  .invoice-title-block {
    position: relative;
    z-index: 1;
    margin-top: 10px;
    margin-bottom: 32px;
  }
  .invoice-title {
    font-size: 42px;
    font-weight: 800;
    letter-spacing: 4px;
    color: #111827;
    text-transform: uppercase;
  }

  .meta-grid {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 40px;
    font-size: 14px;
  }
  .meta-left {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .meta-item {
    display: flex;
    align-items: baseline;
  }
  .meta-label {
    font-weight: 700;
    color: #111827;
    min-width: 95px;
  }
  .meta-value {
    color: #4b5563;
  }
  .bill-to-box {
    margin-top: 4px;
  }
  .bill-to-name {
    font-weight: 700;
    color: #111827;
  }
  .bill-to-address {
    color: #6b7280;
    margin-top: 2px;
    font-size: 13px;
  }

  .meta-right {
    text-align: right;
  }

  .items-table {
    position: relative;
    z-index: 1;
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
  }
  .items-table th {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
    padding: 12px 10px;
    text-align: left;
    border-top: 2px solid #111827;
    border-bottom: 2px solid #111827;
  }
  .items-table th.right, .items-table td.right {
    text-align: right;
  }
  .items-table td {
    padding: 14px 10px;
    font-size: 14px;
    color: #4b5563;
    vertical-align: top;
  }
  .items-table tr.item-row td {
    border-bottom: 1px solid #f1f5f9;
  }
  .items-table tr.table-bottom-border td {
    border-bottom: 2px solid #111827;
    padding: 0;
  }

  .total-container {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 48px;
    padding-top: 12px;
  }
  .total-label {
    font-size: 26px;
    font-weight: 800;
    color: #111827;
    margin-right: 48px;
  }
  .total-amount {
    font-size: 26px;
    font-weight: 800;
    color: #111827;
  }

  .bottom-grid {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 40px;
  }
  .bank-details {
    font-size: 13px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .bank-row {
    display: flex;
    align-items: center;
  }
  .bank-label {
    font-weight: 700;
    color: #111827;
    min-width: 110px;
  }
  .bank-value {
    color: #4b5563;
  }

  .footer-divider {
    position: relative;
    z-index: 1;
    border: none;
    border-top: 1px solid #d1d5db;
    margin-bottom: 20px;
  }
  .footer-text {
    position: relative;
    z-index: 1;
    text-align: center;
    font-size: 12px;
    color: #6b7280;
  }

  .toolbar {
    max-width: 800px;
    margin: 0 auto 20px auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 9999;
  }
  .btn-print {
    background-color: #111827;
    color: #ffffff;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: background 0.2s, transform 0.1s;
    user-select: none;
    position: relative;
    z-index: 9999;
    pointer-events: auto;
  }
  .btn-print:hover {
    background-color: #1f2937;
    transform: translateY(-1px);
  }
  .btn-print:active {
    transform: translateY(0);
  }

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
      border-radius: 0;
      padding: 40px 48px;
      max-width: 100%;
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
  <span style="font-size:13px; color:#64748b; font-weight:600;">Invoice Document</span>
  <button type="button" class="btn-print" id="btnPrintBtn">
    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"></path></svg>
    Print / Save PDF
  </button>
</div>

<div class="invoice-card">
  <svg class="bg-watermark" viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M-80 -80 L180 -80 L-80 180 Z" fill="#F1F5F9" opacity="0.9"/>
    <path d="M-40 -40 L220 -40 L-40 220 Z" fill="#E2E8F0" opacity="0.6"/>
    <path d="M-60 80 L120 -100 L-60 -100 Z" fill="#CBD5E1" opacity="0.4"/>
    <path d="M-20 -20 L90 90 L-20 200 Z" fill="#E2E8F0" opacity="0.5"/>
    <polygon points="-80,0 60,-140 -80,-140" fill="#E2E8F0" opacity="0.7"/>
    <polygon points="-40,140 140,-40 80,-40 -40,80" fill="#CBD5E1" opacity="0.4"/>
  </svg>

  <div class="header">
    <div></div>
    <div class="company-info">
      <div class="company-logo">
        <svg class="logo-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 28L24 16L20 12L8 24L12 28Z" fill="#111827"/>
          <path d="M20 28L32 16L28 12L16 24L20 28Z" fill="#374151"/>
          <path d="M16 32L28 20L24 16L12 28L16 32Z" fill="#6B7280"/>
        </svg>
        <span class="company-name">${companyName}</span>
      </div>
      <div class="company-details">
        ${companyAddress}<br>
        Tel: ${companyPhone}
      </div>
    </div>
  </div>

  <div class="invoice-title-block">
    <h1 class="invoice-title">INVOICE</h1>
  </div>

  <div class="meta-grid">
    <div class="meta-left">
      <div class="meta-item">
        <span class="meta-label">Invoice No:</span>
        <span class="meta-value">${invoiceNumber}</span>
      </div>
      <div class="meta-item bill-to-box">
        <span class="meta-label">Bill to:</span>
        <div>
          <div class="bill-to-name">${customerName}</div>
          <div class="bill-to-address">
            ${constituency ? `${constituency}<br>` : ""}
            ${email || ""}
            ${gstin ? `<br>GSTIN: ${gstin}` : ""}
          </div>
        </div>
      </div>
    </div>
    <div class="meta-right">
      <div class="meta-item">
        <span class="meta-label">Date:</span>
        <span class="meta-value">${formattedDate}</span>
      </div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 8%;">Item</th>
        <th style="width: 52%;">Description</th>
        <th class="right" style="width: 20%;">Price</th>
        <th class="right" style="width: 20%;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr class="item-row">
        <td>1.</td>
        <td>
          <strong style="color:#111827;">${description}</strong><br>
          <span style="font-size:12px; color:#9ca3af;">Method: ${methodLabel} ${gatewayLabel ? `(${gatewayLabel})` : ""} | Ref: ${txnRef}</span>
        </td>
        <td class="right">${currencySymbol}${subtotal.toFixed(2)}</td>
        <td class="right">${currencySymbol}${subtotal.toFixed(2)}</td>
      </tr>
      ${tax > 0 ? `
      <tr class="item-row">
        <td>2.</td>
        <td>GST / Service Tax</td>
        <td class="right">${currencySymbol}${tax.toFixed(2)}</td>
        <td class="right">${currencySymbol}${tax.toFixed(2)}</td>
      </tr>
      ` : ""}
      <tr class="table-bottom-border">
        <td colspan="4"></td>
      </tr>
    </tbody>
  </table>

  <div class="total-container">
    <span class="total-label">Total</span>
    <span class="total-amount">${currencySymbol}${total.toFixed(2)}</span>
  </div>

  <div class="bottom-grid">
    <div class="bank-details">
      <div class="bank-row">
        <span class="bank-label">Bank Name:</span>
        <span class="bank-value">${bankName}</span>
      </div>
      <div class="bank-row">
        <span class="bank-label">Bank Account:</span>
        <span class="bank-value">${bankAccount}</span>
      </div>
    </div>
  </div>

  <hr class="footer-divider">
  <div class="footer-text">
    If you have any question please contact : ${supportEmail}
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
}

function processFiles() {
  if (!fs.existsSync(INVOICE_DIR)) return;

  const files = fs.readdirSync(INVOICE_DIR).filter(f => f.endsWith(".html"));
  console.log(`Transforming ${files.length} existing HTML files...`);

  for (const file of files) {
    const fullPath = path.join(INVOICE_DIR, file);
    const content = fs.readFileSync(fullPath, "utf-8");

    // Extract invoice number
    const invMatch = content.match(/Invoice\s*(?:#|No)?:?\s*([A-Z0-9-]+)/i);
    const invoiceNumber = invMatch ? invMatch[1] : file.replace("invoice-", "").replace(".html", "");

    // Extract customer name
    const custMatch = content.match(/<strong>([^<]+)<\/strong>/i);
    const customerName = custMatch ? custMatch[1].trim() : "Liceria & Co.";

    // Extract constituency
    const constMatch = content.match(/<\/strong><br>([^<]+)<br>/i);
    const constituency = constMatch ? constMatch[1].trim() : "Chandni Chowk";

    // Extract amount
    const amtMatch = content.match(/Total<\/td><td[^>]*>(?:₹|\$)?([\d.]+)/i) || content.match(/([\d.]+)\s*<\/td><\/tr><\/table>/i);
    const totalVal = amtMatch ? parseFloat(amtMatch[1]) : 1900;

    // Extract plan/description
    const descMatch = content.match(/<td>([^<]+(?:plan|YEARLY|Enterprise|Starter)[^<]*)<\/td>/i);
    const description = descMatch ? descMatch[1].trim() : "Logo & Branding Package";

    // Date
    const dateMatch = content.match(/Date:\s*([^<]+)/i);
    let formattedDate = "12 October, 2025";
    if (dateMatch) {
      const rawDateStr = dateMatch[1].trim();
      const parsed = new Date(rawDateStr);
      if (!isNaN(parsed.getTime())) {
        const d = parsed.getDate();
        const month = parsed.toLocaleDateString("en-US", { month: "long" });
        const year = parsed.getFullYear();
        formattedDate = `${d} ${month}, ${year}`;
      }
    }

    const newHtml = renderInvoiceHtml({
      invoiceNumber,
      customerName,
      constituency,
      email: "",
      gstin: "",
      formattedDate,
      description,
      subtotal: totalVal,
      tax: 0,
      total: totalVal,
      currencySymbol: "₹"
    });

    fs.writeFileSync(fullPath, newHtml, "utf-8");
    console.log(`Transformed: ${file}`);
  }
}

processFiles();
