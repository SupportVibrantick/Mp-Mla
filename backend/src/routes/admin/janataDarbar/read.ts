import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";

export async function listSessions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { page, limit, skip } = parsePagination(req.query);
    const { type, status, dateFrom, dateTo, search } = req.query as Record<string, string>;

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (type && type !== "all") where.type = type;
    if (status && status !== "all") where.status = status;

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { sessionNumber: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.janataDarbarSession.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { tokens: true, grievances: true, tasks: true } },
        },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.janataDarbarSession.count({ where }),
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

export async function getSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const session = await prisma.janataDarbarSession.findFirst({
      where: { id: req.params.id as string, tenantId, isDeleted: false },
      include: {
        createdBy: { select: { id: true, name: true } },
        tokens: {
          include: {
            assignedOfficer: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            ward: { select: { id: true, name: true, wardNumber: true } },
          },
          orderBy: { tokenNumber: "asc" },
        },
      },
    });

    if (!session) throw ApiError.notFound("Session not found");

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSessionStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const sessionId = req.params.id as string;

    const session = await prisma.janataDarbarSession.findFirst({
      where: { id: sessionId, tenantId, isDeleted: false },
    });
    if (!session) throw ApiError.notFound("Session not found");

    const tokens = await prisma.janataDarbarToken.findMany({
      where: { sessionId, tenantId },
      include: { department: { select: { name: true } } },
    });

    const totalTokens = tokens.length;
    let waiting = 0;
    let called = 0;
    let inProgress = 0;
    let resolved = 0;
    let referred = 0;
    let absent = 0;

    const deptMap: Record<string, number> = {};

    for (const t of tokens) {
      if (t.status === "WAITING") waiting++;
      else if (t.status === "CALLED") called++;
      else if (t.status === "IN_PROGRESS") inProgress++;
      else if (t.status === "RESOLVED") resolved++;
      else if (t.status === "REFERRED") referred++;
      else if (t.status === "ABSENT") absent++;

      if (t.status === "REFERRED" && t.department) {
        const dName = t.department.name;
        deptMap[dName] = (deptMap[dName] || 0) + 1;
      }
    }

    const [grievancesCount, tasksCount] = await Promise.all([
      prisma.grievance.count({ where: { tenantId, janataSessionId: sessionId, isDeleted: false } }),
      prisma.task.count({ where: { tenantId, janataSessionId: sessionId, isDeleted: false } }),
    ]);

    res.json({
      success: true,
      data: {
        sessionDetails: {
          sessionNumber: session.sessionNumber,
          title: session.title,
          type: session.type,
          status: session.status,
          date: session.date,
          location: session.location,
        },
        totalTokens,
        waiting,
        called,
        inProgress,
        resolved,
        referred,
        absent,
        completed: resolved + referred,
        grievancesCreated: grievancesCount,
        tasksCreated: tasksCount,
        referredByDepartment: deptMap,
      },
    });
  } catch (error) {
    next(error);
  }
}
