import { Request, Response, NextFunction } from "express";
import path from "path";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { ProjectAttachmentClassification } from "@prisma/client";

/**
 * POST /api/admin/projects/:id/attachments
 * Adds a new attachment to a project.
 */
export async function addAttachment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const projectId = req.params.id as string;
    
    let fileUrl = req.body.fileUrl;
    let fileName = req.body.fileName;
    let fileType = req.body.fileType;
    let fileSize = req.body.fileSize;
    const classification = req.body.classification;

    if (req.file) {
      fileUrl = `/uploads/attachments/${req.file.filename}`;
      if (!fileName) fileName = req.file.originalname;
      if (!fileType) fileType = path.extname(req.file.originalname).replace(".", "");
      if (!fileSize) fileSize = Math.round(req.file.size / 1024); // KB
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId, isDeleted: false },
    });
    if (!project) throw ApiError.notFound("Project not found");

    if (!fileUrl || !fileName) {
      throw ApiError.badRequest("File upload or fileUrl and fileName are required");
    }

    // Validate classification enum
    let targetClass: ProjectAttachmentClassification = ProjectAttachmentClassification.OTHER;
    if (classification) {
      if (Object.values(ProjectAttachmentClassification).includes(classification)) {
        targetClass = classification as ProjectAttachmentClassification;
      } else {
        throw ApiError.badRequest(`Invalid attachment classification: ${classification}`);
      }
    }

    const attachment = await prisma.projectAttachment.create({
      data: {
        tenantId,
        projectId,
        fileUrl,
        fileName,
        fileType: fileType || null,
        fileSize: fileSize ? parseInt(fileSize, 10) : null,
        classification: targetClass,
      },
    });

    // Write to system timeline log
    await prisma.projectTimeline.create({
      data: {
        tenantId,
        projectId,
        action: "ATTACHMENT_UPLOAD",
        comment: `Document "${fileName}" (${targetClass}) uploaded by ${req.user!.name || req.user!.email}`,
        changedById: req.user!.id,
        metadata: { attachmentId: attachment.id, fileName, classification: targetClass },
      },
    });

    res.status(201).json({
      success: true,
      message: "Attachment uploaded successfully",
      data: attachment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/projects/:id/attachments
 * Lists all attachments for a project.
 */
export async function listAttachments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const projectId = req.params.id as string;

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId, isDeleted: false },
    });
    if (!project) throw ApiError.notFound("Project not found");

    const attachments = await prisma.projectAttachment.findMany({
      where: { tenantId, projectId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: attachments,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/projects/:id/attachments/:attachmentId
 * Deletes an attachment from a project.
 */
export async function deleteAttachment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const projectId = req.params.id as string;
    const attachmentId = req.params.attachmentId as string;

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId, isDeleted: false },
    });
    if (!project) throw ApiError.notFound("Project not found");

    const attachment = await prisma.projectAttachment.findFirst({
      where: { id: attachmentId, projectId, tenantId },
    });
    if (!attachment) throw ApiError.notFound("Attachment not found for this project");

    await prisma.projectAttachment.delete({
      where: { id: attachmentId },
    });

    // Write to system timeline log
    await prisma.projectTimeline.create({
      data: {
        tenantId,
        projectId,
        action: "ATTACHMENT_DELETE",
        comment: `Document "${attachment.fileName}" deleted by ${req.user!.name || req.user!.email}`,
        changedById: req.user!.id,
        metadata: { attachmentId, fileName: attachment.fileName },
      },
    });

    res.json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
