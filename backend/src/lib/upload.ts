import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import type { Request, Response, NextFunction } from "express";
import { assertStorageQuota, trackStorageDelta, trackStorageRelease } from "./quota.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, "..", "..", "public", "uploads");

// Ensure upload directories exist
const dirs = ["documents", "images", "attachments", "settings"];
dirs.forEach((dir) => {
  const fullPath = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(UPLOAD_DIR, "attachments"));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

async function quotaAwareFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
    return;
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter: quotaAwareFileFilter,
  limits: { fileSize: MAX_FILE_BYTES },
});

// Helper to create category-specific uploader (e.g. "settings", "leader", "institution")
export function createUploader(subDir: string) {
  const dir = path.join(UPLOAD_DIR, subDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dir),
      filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: quotaAwareFileFilter,
    limits: { fileSize: MAX_FILE_BYTES },
  });
}

/**
 * AC-5 & AC-6 — Must be called AFTER multer writes files to disk but BEFORE
 * the response is sent.
 *
 * For each uploaded file:
 *   1. Re-checks the actual file size against the storage quota.
 *   2. Calls trackStorageDelta to increment storageUsedMB on the tenant.
 *   3. If the quota is exceeded, deletes the file and throws HTTP 413 with detailed message.
 *
 * Usage in route handlers:
 *   router.post("/", upload.single("file"), async (req, res, next) => {
 *     await enforceStorageAndTrack(req, res, next);
 *     // ... rest of handler
 *   });
 *
 * Or as inline middleware:
 *   router.post("/", upload.single("file"), enforceStorageAndTrack, handler);
 */
export async function enforceStorageAndTrack(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  if (!tenantId) {
    next();
    return;
  }

  // Collect all files from this request
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) {
    files.push(...req.files);
  } else if (req.files && typeof req.files === "object") {
    for (const arr of Object.values(
      req.files as Record<string, Express.Multer.File[]>,
    )) {
      if (Array.isArray(arr)) files.push(...arr);
    }
  }

  if (files.length === 0) {
    next();
    return;
  }

  try {
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

    // Hard quota check against actual byte size
    try {
      await assertStorageQuota(tenantId, totalBytes);
    } catch (quotaErr: any) {
      // Delete every uploaded file before rejecting
      for (const f of files) {
        try {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        } catch (unlinkErr) {
          logger.warn(
            `Failed to delete over-quota file ${f.path}: ${unlinkErr}`,
          );
        }
      }
      next(
        quotaErr instanceof ApiError
          ? quotaErr
          : new ApiError(
              413,
              quotaErr?.message || "Storage quota exceeded. Free up space or upgrade your plan.",
            ),
      );
      return;
    }

    // Track usage delta
    await trackStorageDelta(tenantId, totalBytes);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Legacy helper retained for backward compatibility.
 * New code should prefer the `enforceStorageAndTrack` middleware instead.
 */
export async function trackMulterUploads(req: Request): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  if (!tenantId) return;

  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files && typeof req.files === "object") {
    for (const arr of Object.values(
      req.files as Record<string, Express.Multer.File[]>,
    )) {
      if (Array.isArray(arr)) files.push(...arr);
    }
  }

  for (const file of files) {
    await trackStorageDelta(tenantId, file.size);
  }
}

export function getUploadPath(
  filename: string,
  subDir: string = "attachments",
): string {
  return `/uploads/${subDir}/${filename}`;
}

export function deleteFile(filePath: string): boolean {
  try {
    const absolutePath = path.join(
      UPLOAD_DIR,
      "..",
      filePath.replace("/uploads/", "uploads/"),
    );
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function deleteFileAndReleaseStorage(
  filePath: string,
  tenantId?: string,
  explicitSizeBytes?: number,
): Promise<boolean> {
  try {
    const absolutePath = path.join(
      UPLOAD_DIR,
      "..",
      filePath.replace("/uploads/", "uploads/"),
    );
    let sizeBytes = explicitSizeBytes || 0;
    if (fs.existsSync(absolutePath)) {
      if (!sizeBytes) {
        try {
          const stats = fs.statSync(absolutePath);
          sizeBytes = stats.size;
        } catch {
          // ignore stat error
        }
      }
      fs.unlinkSync(absolutePath);
      if (tenantId && sizeBytes > 0) {
        await trackStorageRelease(tenantId, sizeBytes, true);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function createImageUploader(subDir: string) {
  const dir = path.join(UPLOAD_DIR, subDir);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const imageMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ]);

  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, dir);
      },

      filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

        const ext = path.extname(file.originalname);

        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),

    fileFilter: (_req, file, cb) => {
      if (!imageMimeTypes.has(file.mimetype)) {
        cb(new Error("Only JPG, PNG, WEBP and GIF images are allowed."));
        return;
      }

      cb(null, true);
    },

    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });
}
