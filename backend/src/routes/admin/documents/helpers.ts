import { ApiError } from "../../../utils/ApiError.js";

// Allowed MIME types & extensions
export const ALLOWED_EXTENSIONS = [
  "pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx", "csv"
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

/**
 * Validates file properties before DB write
 */
export function validateFileProperties(fileName: string, fileSize?: number | null) {
  // 1. File size check
  if (fileSize && fileSize > MAX_FILE_SIZE) {
    throw ApiError.badRequest("File size exceeds the maximum limit of 50MB");
  }

  // 2. Extension check
  const parts = fileName.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw ApiError.badRequest(
      `Invalid file format. Supported formats: ${ALLOWED_EXTENSIONS.join(", ")}`
    );
  }
}
