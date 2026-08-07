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

import { generateInvoicePdf as generatePdf } from "../services/invoice.service.js";

export async function generateInvoicePdf(
  paymentId: string,
): Promise<string | null> {
  return generatePdf(paymentId);
}

