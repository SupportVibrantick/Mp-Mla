import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";

/**
 * GET /api/admin/correspondence
 * List correspondence records with search and filters
 */
export async function listCorrespondence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { page, limit, skip } = parsePagination(req.query);
    const { search, type, status, departmentId, assignedToId, dateFrom, dateTo, dueDateFrom, dueDateTo } = req.query as Record<string, string>;

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (type && type !== "all") where.type = type;
    if (status && status !== "all") where.status = status;
    if (departmentId && departmentId !== "all") where.departmentId = departmentId;
    if (assignedToId && assignedToId !== "all") where.assignedToId = assignedToId;

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { senderName: { contains: search, mode: "insensitive" } },
        { senderPhone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (dateFrom || dateTo) {
      where.receivedDate = {};
      if (dateFrom) where.receivedDate.gte = new Date(dateFrom);
      if (dateTo) where.receivedDate.lte = new Date(dateTo);
    }

    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) where.dueDate.gte = new Date(dueDateFrom);
      if (dueDateTo) where.dueDate.lte = new Date(dueDateTo);
    }

    const [data, total] = await Promise.all([
      prisma.correspondence.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true, code: true } },
          _count: { select: { documents: true, timeline: true } },
        },
        orderBy: { receivedDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.correspondence.count({ where }),
    ]);

    // Format output including dynamic overdue flag
    const now = new Date();
    const enriched = data.map((item) => {
      const isOverdue =
        item.dueDate &&
        item.dueDate < now &&
        !["COMPLETED", "CLOSED", "REJECTED"].includes(item.status);

      return {
        ...item,
        isOverdue: !!isOverdue,
      };
    });

    res.json({
      success: true,
      data: enriched,
      pagination: buildPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/correspondence/:id
 * Get single correspondence record details
 */
export async function getCorrespondence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const corrId = req.params.id as string;

    const correspondence = await prisma.correspondence.findFirst({
      where: { id: corrId, tenantId, isDeleted: false },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
        documents: {
          include: {
            document: {
              select: {
                id: true,
                name: true,
                fileName: true,
                fileUrl: true,
                fileType: true,
                fileSize: true,
                version: true,
              },
            },
          },
        },
        timeline: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!correspondence) throw ApiError.notFound("Correspondence not found");

    const now = new Date();
    const isOverdue =
      correspondence.dueDate &&
      correspondence.dueDate < now &&
      !["COMPLETED", "CLOSED", "REJECTED"].includes(correspondence.status);

    res.json({
      success: true,
      data: {
        ...correspondence,
        isOverdue: !!isOverdue,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/correspondence/:id/timeline
 * Get timeline history for correspondence
 */
export async function getCorrespondenceTimeline(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const corrId = req.params.id as string;

    const correspondence = await prisma.correspondence.findFirst({
      where: { id: corrId, tenantId, isDeleted: false },
    });
    if (!correspondence) throw ApiError.notFound("Correspondence not found");

    const timeline = await prisma.correspondenceTimeline.findMany({
      where: { correspondenceId: corrId, tenantId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    next(error);
  }
}
