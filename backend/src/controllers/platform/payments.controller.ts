import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { advanceSubscriptionPeriod } from "../../jobs/subscriptionSweep.js";
import { generateInvoicePdf } from "../../lib/invoicePdf.js";

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
    } = req.body;

    // Verify subscription exists
    const subscription = await prisma.tenantSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw ApiError.notFound("Tenant subscription not found");
    }

    // Determine paidAt value if status is SUCCESS
    const paidAtDate = status === "SUCCESS" ? (paidAt ? new Date(paidAt) : new Date()) : null;

    // Generate automatic invoice number if not provided
    let finalInvoiceNumber = invoiceNumber;
    if (!finalInvoiceNumber) {
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      finalInvoiceNumber = `INV-${datePart}-${randomPart}`;
    }

    // Run in transaction to create payment and update subscription if successful
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          subscriptionId,
          amount,
          currency: currency || "INR",
          method,
          transactionId,
          status: status || "PENDING",
          invoiceNumber: finalInvoiceNumber,
          invoiceUrl,
          notes,
          paidAt: paidAtDate,
        },
      });

      if (status === "SUCCESS") {
        // Update subscription last payment details
        await tx.tenantSubscription.update({
          where: { id: subscriptionId },
          data: {
            lastPaymentAt: paidAtDate,
            amountDue: Math.max(0, subscription.amountDue - amount),
          },
        });
      }

      return payment;
    });

    res.status(201).json(ApiResponse.created(result, "Payment recorded successfully"));
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

    const existingPayment = await prisma.payment.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!existingPayment) {
      throw ApiError.notFound("Payment record not found");
    }

    const paidAtDate = status === "SUCCESS" ? (paidAt ? new Date(paidAt) : new Date()) : null;

    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          status,
          paidAt: paidAtDate,
          transactionId: transactionId !== undefined ? transactionId : existingPayment.transactionId,
          method: method !== undefined ? method : existingPayment.method,
          invoiceUrl: invoiceUrl !== undefined ? invoiceUrl : existingPayment.invoiceUrl,
          notes: notes !== undefined ? notes : existingPayment.notes,
        },
      });

      // If status changed to SUCCESS and wasn't SUCCESS before, update subscription payment info
      if (status === "SUCCESS" && existingPayment.status !== "SUCCESS") {
        const newAmountDue = Math.max(
          0,
          existingPayment.subscription.amountDue - existingPayment.amount,
        );
        await tx.tenantSubscription.update({
          where: { id: existingPayment.subscriptionId },
          data: {
            lastPaymentAt: paidAtDate,
            amountDue: newAmountDue,
            status:
              existingPayment.subscription.status === "PAST_DUE" ||
              existingPayment.subscription.status === "SUSPENDED"
                ? "ACTIVE"
                : existingPayment.subscription.status,
          },
        });

        if (newAmountDue === 0) {
          await advanceSubscriptionPeriod(existingPayment.subscriptionId, tx);
        }
      }

      return updatedPayment;
    });

    if (result.status === "SUCCESS" && !result.invoiceUrl) {
      try {
        const pdfUrl = await generateInvoicePdf(result.id);
        if (pdfUrl) {
          await prisma.payment.update({
            where: { id: result.id },
            data: { invoiceUrl: pdfUrl },
          });
          result.invoiceUrl = pdfUrl;
        }
      } catch {
        // PDF generation is best-effort
      }
    }

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
