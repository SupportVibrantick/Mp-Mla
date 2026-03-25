import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";

export async function getTodayBirthdays(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const today = new Date();
    const month = today.getMonth();
    const day = today.getDate();
    const year = today.getFullYear();

    const allLeaders = await prisma.leader.findMany({
      where: { isActive: true, isDeleted: false },
      include: {
        ward: {
          select: { name: true, wardNumber: true },
        },
        greetings: {
          where: { type: "BIRTHDAY", year },
          select: {
            id: true,
            channel: true,
            status: true,
            sentAt: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const birthdayLeaders = allLeaders
      .filter((l) => {
        const dob = new Date(l.dateOfBirth);
        return dob.getMonth() === month && dob.getDate() === day;
      })
      .map((l) => {
        const dob = new Date(l.dateOfBirth);
        const age = year - dob.getFullYear();
        const greeted = l.greetings.some((g) =>
          ["SENT", "DELIVERED"].includes(g.status),
        );
        return { ...l, age, turningAge: age, greeted };
      });

    res.json({
      success: true,
      data: birthdayLeaders,
      count: birthdayLeaders.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUpcomingBirthdays(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allLeaders = await prisma.leader.findMany({
      where: { isActive: true, isDeleted: false },
      include: {
        ward: {
          select: { name: true, wardNumber: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const upcoming = allLeaders
      .map((l) => {
        const dob = new Date(l.dateOfBirth);
        const nextBday = new Date(
          today.getFullYear(),
          dob.getMonth(),
          dob.getDate(),
        );
        if (nextBday < today) nextBday.setFullYear(nextBday.getFullYear() + 1);

        const diff = Math.ceil(
          (nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        const age = nextBday.getFullYear() - dob.getFullYear();

        return {
          ...l,
          daysUntil: diff,
          turningAge: age,
          nextBirthday: nextBday.toISOString(),
          isBirthdayToday: diff === 0,
        };
      })
      .filter((l) => l.daysUntil >= 0 && l.daysUntil <= days)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    res.json({
      success: true,
      data: upcoming,
      count: upcoming.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function getThisMonthBirthdays(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const today = new Date();
    const month = today.getMonth();

    const allLeaders = await prisma.leader.findMany({
      where: { isActive: true, isDeleted: false },
      include: {
        ward: {
          select: { name: true, wardNumber: true },
        },
      },
    });

    const thisMonth = allLeaders
      .filter((l) => new Date(l.dateOfBirth).getMonth() === month)
      .map((l) => {
        const dob = new Date(l.dateOfBirth);
        return {
          ...l,
          day: dob.getDate(),
          age: today.getFullYear() - dob.getFullYear(),
          isPast: dob.getDate() < today.getDate(),
          isToday: dob.getDate() === today.getDate(),
        };
      })
      .sort((a, b) => a.day - b.day);

    res.json({
      success: true,
      data: thisMonth,
      count: thisMonth.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function getBirthdayCalendar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const allLeaders = await prisma.leader.findMany({
      where: { isActive: true, isDeleted: false },
      select: {
        id: true,
        name: true,
        dateOfBirth: true,
        category: true,
        photoUrl: true,
      },
    });

    // Group by day
    const calendar: Record<number, any[]> = {};
    allLeaders.forEach((l) => {
      const dob = new Date(l.dateOfBirth);
      if (!isNaN(month) && dob.getMonth() !== month) return;
      const day = dob.getDate();
      const m = dob.getMonth();
      const key = !isNaN(month) ? day : m * 100 + day;
      if (!calendar[key]) calendar[key] = [];
      calendar[key].push({
        ...l,
        turningAge: year - dob.getFullYear(),
        month: m,
        day,
      });
    });

    res.json({ success: true, data: calendar });
  } catch (error) {
    next(error);
  }
}
