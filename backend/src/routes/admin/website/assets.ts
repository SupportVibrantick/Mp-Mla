import { Request, Response } from "express";
import { prisma } from "../../../lib/prisma.js";
import { createUploader, getUploadPath, enforceStorageAndTrack } from "../../../lib/upload.js";

export const websiteUploader = createUploader("website");

async function assertWebsiteOwnership(websiteId: string, tenantId: string) {
  const website = await prisma.website.findFirst({
    where: { id: websiteId, tenantId },
  });
  if (!website) {
    const error: any = new Error("Website not found or unauthorized");
    error.status = 404;
    throw error;
  }
  return website;
}

export async function uploadWebsiteAsset(req: Request, res: Response) {
  try {
    const tenantId = (req as any).user?.tenantId as string;
    const websiteId = req.params.websiteId as string;
    if (websiteId) {
      await assertWebsiteOwnership(websiteId, tenantId);
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const fileUrl = getUploadPath(req.file.filename, "website");
    const name = req.body.name || req.file.originalname;

    let asset = null;
    if (websiteId) {
      try {
        asset = await prisma.websiteAsset.create({
          data: {
            websiteId,
            name,
            url: fileUrl,
            mimeType: req.file.mimetype || "image/jpeg",
            size: req.file.size || 0,
            folder: req.body.folder || "general",
          },
        });
      } catch (err) {
        console.warn("Could not save asset to db, returning file url:", err);
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        fileUrl,
        url: fileUrl,
        name,
        asset,
      },
    });
  } catch (error: any) {
    console.error("uploadWebsiteAsset error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to upload asset" });
  }
}

export async function listAssets(req: Request, res: Response) {
  try {
    const tenantId = (req as any).user?.tenantId as string;
    const websiteId = req.params.websiteId as string;
    await assertWebsiteOwnership(websiteId, tenantId);

    const assets = await prisma.websiteAsset.findMany({
      where: { websiteId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: assets });
  } catch (error: any) {
    console.error("listAssets error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to list assets" });
  }
}

export async function createAsset(req: Request, res: Response) {
  try {
    const tenantId = (req as any).user?.tenantId as string;
    const websiteId = req.params.websiteId as string;
    await assertWebsiteOwnership(websiteId, tenantId);

    const { name, url, mimeType, size, folder, width, height } = req.body;
    if (!name || !url) {
      return res.status(400).json({ success: false, message: "name and url are required" });
    }

    const asset = await prisma.websiteAsset.create({
      data: {
        websiteId,
        name,
        url,
        mimeType: mimeType || "image/jpeg",
        size: size || 0,
        folder: folder || "general",
        width: width || null,
        height: height || null,
      },
    });

    return res.status(201).json({ success: true, data: asset });
  } catch (error: any) {
    console.error("createAsset error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to save asset" });
  }
}

export async function deleteAsset(req: Request, res: Response) {
  try {
    const tenantId = (req as any).user?.tenantId as string;
    const websiteId = req.params.websiteId as string;
    const assetId = req.params.assetId as string;
    await assertWebsiteOwnership(websiteId, tenantId);

    const asset = await prisma.websiteAsset.findFirst({
      where: { id: assetId, websiteId },
    });

    if (!asset) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    await prisma.websiteAsset.delete({
      where: { id: assetId },
    });

    return res.json({ success: true, message: "Asset deleted successfully" });
  } catch (error: any) {
    console.error("deleteAsset error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to delete asset" });
  }
}
