import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";

export async function listLeaders(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { category, wardId, relation, /* influence, */ search, isActive } =
      req.query as Record<string, string>;

    const where: any = { isDeleted: false };
    if (category && category !== "all") where.category = category;
    if (wardId && wardId !== "all") where.wardId = wardId;
    if (relation && relation !== "all") where.relation = relation;
    // if (influence && influence !== "all") where.influence = influence;
    if (isActive !== undefined && isActive !== "all")
      where.isActive = isActive === "true";
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { designation: { contains: search, mode: "insensitive" } },
        { organization: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.leader.findMany({
        where,
        include: {
          ward: {
            select: { id: true, name: true, wardNumber: true },
          },
          _count: { select: { greetings: true } },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.leader.count({ where }),
    ]);

    // Enrich with birthday info
    const today = new Date();
    const enriched = data.map((l) => {
      const dob = new Date(l.dateOfBirth);
      const nextBday = new Date(
        today.getFullYear(),
        dob.getMonth(),
        dob.getDate(),
      );
      if (nextBday < today) {
        nextBday.setFullYear(nextBday.getFullYear() + 1);
      }
      const daysUntilBirthday = Math.ceil(
        (nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      const isBirthdayToday =
        dob.getMonth() === today.getMonth() &&
        dob.getDate() === today.getDate();
      const age =
        today.getFullYear() -
        dob.getFullYear() -
        (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
          ? 1
          : 0);

      return {
        ...l,
        age,
        isBirthdayToday,
        daysUntilBirthday: isBirthdayToday ? 0 : daysUntilBirthday,
        nextBirthday: nextBday.toISOString(),
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

export async function getLeader(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const leaderId = req.params.id as string;

    const leader = await prisma.leader.findUnique({
      where: { id: leaderId },
      include: {
        ward: {
          select: {
            id: true,
            name: true,
            wardNumber: true,
          },
        },
        greetings: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
    if (!leader || leader.isDeleted) throw ApiError.notFound("Leader not found");

    const today = new Date();
    const dob = new Date(leader.dateOfBirth);
    const age =
      today.getFullYear() -
      dob.getFullYear() -
      (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
        ? 1
        : 0);

    const nextBday = new Date(
      today.getFullYear(),
      dob.getMonth(),
      dob.getDate(),
    );
    if (nextBday < today) nextBday.setFullYear(nextBday.getFullYear() + 1);
    const daysUntilBirthday = Math.ceil(
      (nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const isBirthdayToday =
      dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();

    // Check if greeting already sent this year
    const thisYearGreeting = await prisma.leaderGreeting.findFirst({
      where: {
        leaderId: leader.id,
        type: "BIRTHDAY",
        year: today.getFullYear(),
        status: { in: ["SENT", "DELIVERED"] },
      },
    });

    res.json({
      success: true,
      data: {
        ...leader,
        age,
        isBirthdayToday,
        daysUntilBirthday: isBirthdayToday ? 0 : daysUntilBirthday,
        nextBirthday: nextBday.toISOString(),
        birthdayGreetedThisYear: !!thisYearGreeting,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getLeaderStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const where = { isDeleted: false };

    const [total, active, byCategory, /* byInfluence, */ byRelation] =
      await Promise.all([
        prisma.leader.count({ where }),
        prisma.leader.count({ where: { ...where, isActive: true } }),
        prisma.leader.groupBy({
          by: ["category"],
          where,
          _count: true,
          orderBy: { _count: { category: "desc" } },
        }),
        /* prisma.leader.groupBy({
          by: ["influence"],
          where: { ...where, influence: { not: null } },
          _count: true,
        }), */
        prisma.leader.groupBy({
          by: ["relation"],
          where: { ...where, relation: { not: null } },
          _count: true,
        }),
      ]);

    // Today's birthdays count
    const today = new Date();
    const allLeaders = await prisma.leader.findMany({
      where: { ...where, isActive: true },
      select: { dateOfBirth: true },
    });
    const todayBirthdays = allLeaders.filter((l) => {
      const d = new Date(l.dateOfBirth);
      return (
        d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
      );
    }).length;

    // Upcoming 7 days
    const upcoming7 = allLeaders.filter((l) => {
      const d = new Date(l.dateOfBirth);
      const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
      if (next < today) next.setFullYear(next.getFullYear() + 1);
      const diff = Math.ceil(
        (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      return diff > 0 && diff <= 7;
    }).length;

    res.json({
      success: true,
      data: {
        total,
        active,
        todayBirthdays,
        upcoming7,
        byCategory: byCategory.map((c) => ({
          category: c.category,
          count: c._count,
        })),
        /* byInfluence: byInfluence.map((i) => ({
          influence: i.influence,
          count: i._count,
        })), */
        byRelation: byRelation.map((r) => ({
          relation: r.relation,
          count: r._count,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}
