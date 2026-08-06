import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import * as paymentService from "../../services/payment.service.js";
import { generateInvoicePdf } from "../../services/invoice.service.js";

function getParamId(req: Request, name = "id"): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

// ════════════════════════════════════════════════════════
// LIST PAYMENTS
// ════════════════════════════════════════════════════════
export const listPayments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const subscriptionId = req.query.subscriptionId as string;
    const search = req.query.search as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    const where: Prisma.PaymentWhereInput = {};

    if (status) {
      where.status = status as any;
    }

    if (subscriptionId) {
      where.subscriptionId = subscriptionId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { transactionId: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        {
          subscription: {
            tenant: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          subscription: {
            include: {
              tenant: { select: { id: true, name: true, constituencyName: true } },
              plan: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    res.status(200).json(
      ApiResponse.success({
        payments,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════════
// GET PAYMENT BY ID
// ════════════════════════════════════════════════════════
export const getPaymentById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getParamId(req);

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        subscription: {
          include: {
            tenant: { select: { id: true, name: true, constituencyName: true, status: true } },
            plan: { select: { id: true, name: true, code: true, priceMonthly: true, priceYearly: true } },
          },
        },
      },
    });

    if (!payment) {
      throw ApiError.notFound("Payment record not found");
    }

    res.status(200).json(ApiResponse.success(payment));
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════════
// CREATE PAYMENT
// ════════════════════════════════════════════════════════
export const createPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      subscriptionId,
      amount,
      currency,
      method,
      transactionId,
      status,
      invoiceNumber,
      invoiceUrl,
      notes,
      paidAt,
      taxAmount,
      gstNumber,
    } = req.body;

    // For SUCCESS payments, use the payment service (handles subscription updates, invoicing)
    if (status === "SUCCESS") {
      const result = await paymentService.recordManualPayment({
        subscriptionId,
        amount,
        currency,
        method: method || "OFFLINE",
        transactionId,
        notes,
        paidAt,
        status: "SUCCESS",
        taxAmount,
        gstNumber,
        performedBy: req.platformUser?.id,
      });
      res.status(201).json(ApiResponse.created(result, "Payment recorded successfully"));
      return;
    }

    // For non-SUCCESS (PENDING, FAILED, etc.), create directly
    const subscription = await prisma.tenantSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw ApiError.notFound("Tenant subscription not found");
    }

    let finalInvoiceNumber = invoiceNumber;
    if (!finalInvoiceNumber) {
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      finalInvoiceNumber = `INV-${datePart}-${randomPart}`;
    }

    // Map method string to enum
    const validMethods = ["ONLINE", "OFFLINE", "BANK_TRANSFER", "CHEQUE", "CASH", "UPI"];
    const paymentMethod = method && validMethods.includes(method.toUpperCase())
      ? method.toUpperCase()
      : "OFFLINE";

    const payment = await prisma.payment.create({
      data: {
        subscriptionId,
        amount,
        currency: currency || "INR",
        method: paymentMethod as any,
        transactionId,
        status: status || "PENDING",
        invoiceNumber: finalInvoiceNumber,
        invoiceUrl,
        notes,
        paidAt: null,
        taxAmount: taxAmount ?? null,
        gstNumber: gstNumber ?? null,
      },
    });

    res.status(201).json(ApiResponse.created(payment, "Payment recorded successfully"));
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════════
// UPDATE PAYMENT
// ════════════════════════════════════════════════════════
export const updatePayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getParamId(req);
    const data = req.body;

    const existingPayment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      throw ApiError.notFound("Payment record not found");
    }

    // format dates if present
    const updateData: any = { ...data };
    if (data.paidAt) {
      updateData.paidAt = new Date(data.paidAt);
    } else if (data.paidAt === null) {
      updateData.paidAt = null;
    }

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json(ApiResponse.success(updatedPayment, "Payment updated successfully"));
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════════
// UPDATE PAYMENT STATUS
// ════════════════════════════════════════════════════════
export const updatePaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getParamId(req);
    const { status, paidAt, transactionId, method, invoiceUrl, notes } = req.body;

    // Delegate to payment service for full lifecycle handling
    const result = await paymentService.updatePaymentStatus({
      paymentId: id,
      status,
      paidAt,
      transactionId,
      method,
      notes,
      performedBy: req.platformUser?.id,
    });

    res.status(200).json(ApiResponse.success(result, "Payment status updated successfully"));
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════════
// DELETE PAYMENT
// ════════════════════════════════════════════════════════
export const deletePayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getParamId(req);

    const existingPayment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      throw ApiError.notFound("Payment record not found");
    }

    await prisma.payment.delete({
      where: { id },
    });

    res.status(200).json(ApiResponse.success(null, "Payment record deleted successfully"));
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════════
// GET PAYMENT STATS
// ════════════════════════════════════════════════════════
export const getPaymentStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1. Core aggregates
    const aggregates = await prisma.payment.groupBy({
      by: ["status"],
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // 2. Method breakdown for SUCCESS payments
    const methodBreakdown = await prisma.payment.groupBy({
      by: ["method"],
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: { id: true },
    });

    // 3. Last 12 months revenue history (SUCCESS payments only)
    const successPayments = await prisma.payment.findMany({
      where: {
        status: "SUCCESS",
        paidAt: {
          gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        },
      },
      select: {
        amount: true,
        paidAt: true,
      },
      orderBy: {
        paidAt: "asc",
      },
    });

    // Aggregate payments by Year-Month
    const monthlyHistoryMap: Record<string, number> = {};
    successPayments.forEach((payment) => {
      if (payment.paidAt) {
        const monthKey = payment.paidAt.toISOString().slice(0, 7); // "YYYY-MM"
        monthlyHistoryMap[monthKey] = (monthlyHistoryMap[monthKey] || 0) + payment.amount;
      }
    });

    const monthlyHistory = Object.entries(monthlyHistoryMap).map(([month, amount]) => ({
      month,
      amount,
    }));

    res.status(200).json(
      ApiResponse.success({
        aggregates: aggregates.map((agg) => ({
          status: agg.status,
          totalAmount: agg._sum.amount || 0,
          count: agg._count.id,
        })),
        methodBreakdown: methodBreakdown.map((m) => ({
          method: m.method || "UNKNOWN",
          totalAmount: m._sum.amount || 0,
          count: m._count.id,
        })),
        monthlyHistory,
      }),
    );
  } catch (error) {
    next(error);
  }
};
