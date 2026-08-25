import { Request, Response, NextFunction } from "express";
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

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId, isDeleted: false },
    });
    if (!event) throw ApiError.notFound("Event not found");

    const media = await prisma.eventMedia.create({
      data: {
        tenantId,
        eventId,
        type: data.type,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType || null,
        fileSize: data.fileSize ? parseInt(String(data.fileSize), 10) : null,
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
