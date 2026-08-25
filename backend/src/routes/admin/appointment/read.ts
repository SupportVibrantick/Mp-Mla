import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";

export async function listAppointments(
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
      date,
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

    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      where.date = d;
    } else if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { requesterName: { contains: search, mode: "insensitive" } },
        { requesterPhone: { contains: search, mode: "insensitive" } },
        { requesterEmail: { contains: search, mode: "insensitive" } },
        { purpose: { contains: search, mode: "insensitive" } },
        { appointmentNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where }),
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

export async function getAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id as string, tenantId, isDeleted: false },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        tasks: {
          where: { isDeleted: false },
          select: { id: true, taskCode: true, title: true, status: true, priority: true },
        },
      },
    });

    if (!appointment) throw ApiError.notFound("Appointment not found");

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCalendar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { from, to } = req.query as Record<string, string>;

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const appointments = await prisma.appointment.findMany({
      where,
      select: {
        id: true,
        appointmentNumber: true,
        title: true,
        type: true,
        status: true,
        date: true,
        startTime: true,
        endTime: true,
        location: true,
        requesterName: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    res.json({
      success: true,
      data: appointments,
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
    const w = { tenantId, isDeleted: false };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      total,
      byStatus,
      todayCount,
      upcomingCount,
    ] = await Promise.all([
      prisma.appointment.count({ where: w }),
      prisma.appointment.groupBy({ by: ["status"], where: w, _count: true }),
      prisma.appointment.count({ where: { ...w, date: today } }),
      prisma.appointment.count({ where: { ...w, date: { gt: today } } }),
    ]);

    const sm = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));

    res.json({
      success: true,
      data: {
        total,
        pending: sm["PENDING"] || 0,
        approved: sm["APPROVED"] || 0,
        rejected: sm["REJECTED"] || 0,
        rescheduled: sm["RESCHEDULED"] || 0,
        completed: sm["COMPLETED"] || 0,
        cancelled: sm["CANCELLED"] || 0,
        todayAppointments: todayCount,
        upcomingAppointments: upcomingCount,
      },
    });
  } catch (error) {
    next(error);
  }
}
