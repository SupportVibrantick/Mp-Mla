import { Request, Response, NextFunction } from "express";
import path from "path";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

export async function getMedia(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;

    const media = await prisma.eventMedia.findMany({
      where: { eventId, tenantId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: media });
  } catch (error) {
    next(error);
  }
}

export async function addMedia(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;
    const data = req.body;

    let fileUrl = data.fileUrl;
    let fileName = data.fileName;
    let fileType = data.fileType;
    let fileSize = data.fileSize;

    if (req.file) {
      fileUrl = `/uploads/documents/${req.file.filename}`;
      if (!fileName) fileName = req.file.originalname;
      if (!fileType) fileType = path.extname(req.file.originalname).replace(".", "");
      if (!fileSize) fileSize = req.file.size;
    }

    if (!fileUrl || !fileName) {
      throw ApiError.badRequest("File upload or fileUrl and fileName are required");
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId, isDeleted: false },
    });
    if (!event) throw ApiError.notFound("Event not found");

    const media = await prisma.eventMedia.create({
      data: {
        tenantId,
        eventId,
        type: data.type || "IMAGE",
        fileUrl,
        fileName,
        fileType: fileType || null,
        fileSize: fileSize ? parseInt(String(fileSize), 10) : null,
        caption: data.caption || null,
        uploadedById: req.user!.id,
      },
    });

    await prisma.eventTimeline.create({
      data: {
        tenantId,
        eventId,
        action: "MEDIA_UPLOADED",
        description: `Uploaded media file: ${media.fileName} (${media.type}).`,
        changedById: req.user!.id,
      },
    });

    res.status(201).json({ success: true, data: media });
  } catch (error) {
    next(error);
  }
}

export async function deleteMedia(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;
    const mediaId = req.params.mediaId as string;

    const media = await prisma.eventMedia.findFirst({
      where: { id: mediaId, eventId, tenantId },
    });
    if (!media) throw ApiError.notFound("Media item not found");

    await prisma.eventMedia.delete({
      where: { id: mediaId },
    });

    res.json({ success: true, message: "Media item successfully deleted" });
  } catch (error) {
    next(error);
  }
}
