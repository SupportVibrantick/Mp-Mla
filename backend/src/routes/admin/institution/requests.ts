import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { syncToLeaders } from "./incharges.js";

const formatDocumentsUrl = (documents: any, req: Request) => {
  if (!documents || !Array.isArray(documents)) return documents;
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return documents.map(doc => {
    if (doc.url) {
      let cleanUrl = doc.url.replace(/\\/g, "/");
      if (!cleanUrl.startsWith("/")) cleanUrl = "/" + cleanUrl;
      return { ...doc, url: `${baseUrl}${cleanUrl}` };
    }
    return doc;
  });
};

// ─── List institution requests ───────────────────────────
export async function listRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      status,
      page = "1",
      limit = "20",
      search,
    } = req.query as Record<string, string>;

    const where: any = {};
    if (status && status !== "all") where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { submitterName: { contains: search, mode: "insensitive" } },
        { headName: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      prisma.institutionRequest.findMany({
        where,
        include: {
          ward: { select: { name: true, wardNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.institutionRequest.count({ where }),
    ]);

    const pendingCount = await prisma.institutionRequest.count({
      where: { status: "PENDING" },
    });

    const formattedRequests = requests.map(r => ({
      ...r,
      documents: formatDocumentsUrl(r.documents, req),
    }));

    res.json({
      success: true,
      data: {
        requests: formattedRequests,
        total,
        pendingCount,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Get single request ──────────────────────────────────
export async function getRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requestId = req.params.requestId as string;
    const request = await prisma.institutionRequest.findUnique({
      where: { id: requestId },
      include: {
        ward: { select: { name: true, wardNumber: true } },
      },
    });

    if (!request) {
      res.status(404).json({ success: false, message: "Request not found" });
      return;
    }

    const formattedRequest = {
      ...request,
      documents: formatDocumentsUrl(request.documents, req),
    };

    res.json({ success: true, data: formattedRequest });
  } catch (error) {
    next(error);
  }
}

// ─── Approve request ─────────────────────────────────────
export async function approveRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requestId = req.params.requestId as string;

    const request = await prisma.institutionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      res.status(404).json({ success: false, message: "Request not found" });
      return;
    }

    if (request.status !== "PENDING") {
      res.status(400).json({
        success: false,
        message: `Request is already ${request.status.toLowerCase()}`,
      });
      return;
    }

    // Create the institution from the request data
    const institution = await prisma.institution.create({
      data: {
        name: request.name,
        category: request.category,
        subcategory: request.subcategory,
        address: request.address,
        wardId: request.wardId,
        contactNo: request.contactNo,
        email: request.email,
        website: request.website,
        description: request.description,
        capacity: request.capacity,
        establishedDate: request.establishedDate,
        status: "ACTIVE",
        incharges: {
          create: {
            name: request.headName,
            designation: request.headDesignation,
            contactNo: request.headContact,
            email: request.headEmail,
            dateOfBirth: request.headDateOfBirth,
            appointedDate: request.headAppointedDate,
            isActive: true,
          },
        },
      },
      include: {
        ward: { select: { name: true, wardNumber: true } },
        incharges: true,
      },
    });

    // Sync head to Leaders if dateOfBirth present
    if (institution.incharges.length > 0) {
      for (const ic of institution.incharges) {
        await syncToLeaders(ic, institution.wardId);
      }
    }

    // Update request status
    await prisma.institutionRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
        institutionId: institution.id,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "institutions",
      recordId: institution.id,
      description: `Approved institution request and created "${institution.name}" (${institution.category}) in ward "${institution.ward.name}"`,
      newData: {
        requestId,
        institutionId: institution.id,
        name: institution.name,
        category: institution.category,
      },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Institution "${institution.name}" approved and created successfully`,
      data: institution,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Reject request ──────────────────────────────────────
export async function rejectRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requestId = req.params.requestId as string;
    const { reason } = req.body;

    const request = await prisma.institutionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      res.status(404).json({ success: false, message: "Request not found" });
      return;
    }

    if (request.status !== "PENDING") {
      res.status(400).json({
        success: false,
        message: `Request is already ${request.status.toLowerCase()}`,
      });
      return;
    }

    await prisma.institutionRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
        rejectionReason: reason || "Request rejected by administration",
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "institutions",
      recordId: requestId,
      description: `Rejected institution request "${request.name}" — ${reason || "No reason provided"}`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Request for "${request.name}" has been rejected`,
    });
  } catch (error) {
    next(error);
  }
}
