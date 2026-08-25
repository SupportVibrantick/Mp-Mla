import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";
import { getEventStats } from "../../../services/event/eventStats.service.js";

export async function listEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { page, limit, skip } = parsePagination(req.query);
    const {
      type,
      status,
      mode,
      wardId,
      organizerId,
      dateFrom,
      dateTo,
      search,
    } = req.query as Record<string, string>;

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (type && type !== "all") where.type = type;
    if (status && status !== "all") where.status = status;
    if (mode && mode !== "all") where.mode = mode;
    if (wardId && wardId !== "all") where.wardId = wardId;
    if (organizerId && organizerId !== "all") where.organizerId = organizerId;

    if (dateFrom || dateTo) {
      where.startDate = {};
      if (dateFrom) where.startDate.gte = new Date(dateFrom);
      if (dateTo) where.startDate.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { eventCode: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          organizer: { select: { id: true, name: true, email: true } },
          ward: { select: { id: true, name: true, wardNumber: true } },
          _count: {
            select: { team: true, guests: true, attendance: true, tasks: true },
          },
        },
        orderBy: { startDate: "asc" },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    res.json({
      success: true,
      data,
      pagination: buildPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

export async function getEvent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const event = await prisma.event.findFirst({
      where: { id: req.params.id as string, tenantId, isDeleted: false },
      include: {
        organizer: { select: { id: true, name: true, email: true, phone: true } },
        ward: { select: { id: true, name: true, wardNumber: true } },
        team: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        agenda: { orderBy: { orderIndex: "asc" } },
        guests: true,
        attendance: true,
        media: true,
        report: true,
        tasks: {
          where: { isDeleted: false },
          select: { id: true, taskCode: true, title: true, status: true, priority: true },
        },
        timeline: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!event) throw ApiError.notFound("Event not found");

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
}

export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const stats = await getEventStats(tenantId);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/events/calendar
 * Returns optimized event records for calendar visualizations.
 */
export async function getCalendar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { dateFrom, dateTo } = req.query as Record<string, string>;

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (dateFrom || dateTo) {
      where.startDate = {};
      if (dateFrom) where.startDate.gte = new Date(dateFrom);
      if (dateTo) where.startDate.lte = new Date(dateTo);
    }

    const events = await prisma.event.findMany({
      where,
      select: {
        id: true,
        eventCode: true,
        title: true,
        type: true,
        status: true,
        mode: true,
        startDate: true,
        endDate: true,
        location: true,
        ward: { select: { name: true, wardNumber: true } },
      },
      orderBy: { startDate: "asc" },
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
}
