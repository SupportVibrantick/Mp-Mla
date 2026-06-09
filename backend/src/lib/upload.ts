import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import type { Request } from "express";
import { assertStorageQuota, trackStorageDelta } from "./quota.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, "..", "..", "public", "uploads");

// Ensure upload directories exist
const dirs = ["documents", "images", "attachments"];
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

async function quotaAwareFileFilter(
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  try {
    const tenantId = req.user?.tenantId;
    if (tenantId) {
      await assertStorageQuota(tenantId, MAX_FILE_BYTES);
    }
    baseFileFilter(req, file, cb);
  } catch (error) {
    cb(error as Error);
  }
}

const baseFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
    const allowedTypes = [
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
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
};

export const upload = multer({
    storage,
    fileFilter: quotaAwareFileFilter,
    limits: { fileSize: MAX_FILE_BYTES },
});

// Helper to create category-specific upload
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

export async function trackMulterUploads(req: Request): Promise<void> {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return;

  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files && typeof req.files === "object") {
    for (const arr of Object.values(req.files)) {
      if (Array.isArray(arr)) files.push(...arr);
    }
  }

  for (const file of files) {
    await trackStorageDelta(tenantId, file.size);
  }
}

export function getUploadPath(filename: string, subDir: string = "attachments"): string {
    return `/uploads/${subDir}/${filename}`;
}

export function deleteFile(filePath: string): boolean {
    try {
        const absolutePath = path.join(UPLOAD_DIR, "..", filePath.replace("/uploads/", "uploads/"));
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            return true;
        }
        return false;
    } catch {
        return false;
    }
}
