import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

export async function getAgenda(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;

    const agenda = await prisma.eventAgenda.findMany({
      where: { eventId, tenantId },
      orderBy: { orderIndex: "asc" },
    });

    res.json({ success: true, data: agenda });
  } catch (error) {
    next(error);
  }
}

export async function createAgendaItem(
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

    const agenda = await prisma.eventAgenda.create({
      data: {
        tenantId,
        eventId,
        title: data.title,
        description: data.description || null,
        orderIndex: data.orderIndex || 0,
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
      },
    });

    res.status(201).json({ success: true, data: agenda });
  } catch (error) {
    next(error);
  }
}

export async function updateAgendaItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;
    const agendaId = req.params.agendaId as string;
    const data = req.body;

    const agenda = await prisma.eventAgenda.findFirst({
      where: { id: agendaId, eventId, tenantId },
    });
    if (!agenda) throw ApiError.notFound("Agenda item not found");

    const updated = await prisma.eventAgenda.update({
      where: { id: agendaId },
      data: {
        title: data.title,
        description: data.description,
        orderIndex: data.orderIndex,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteAgendaItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;
    const agendaId = req.params.agendaId as string;

    const agenda = await prisma.eventAgenda.findFirst({
      where: { id: agendaId, eventId, tenantId },
    });
    if (!agenda) throw ApiError.notFound("Agenda item not found");

    await prisma.eventAgenda.delete({
      where: { id: agendaId },
    });

    res.json({ success: true, message: "Agenda item successfully deleted" });
  } catch (error) {
    next(error);
  }
}
