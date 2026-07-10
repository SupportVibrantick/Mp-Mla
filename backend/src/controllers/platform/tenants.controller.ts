import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { Prisma } from "@prisma/client";
import { buildDefaultTenantSettings } from "../../lib/tenantSettingsHelper.js";

function getParamId(req: Request, name = "id"): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeOptionalUrl(value?: string | null): string | null | undefined {
  if (value === "") return null;
  return value ?? undefined;
}

function calculatePeriodEnd(billingCycle = "MONTHLY"): Date {
  const end = new Date();
  const monthsByCycle: Record<string, number> = {
    MONTHLY: 1,
    QUARTERLY: 3,
    HALF_YEARLY: 6,
    YEARLY: 12,
  };
  end.setMonth(end.getMonth() + (monthsByCycle[billingCycle] ?? 1));
  return end;
}

function buildTenantWhere(search?: string, status?: string, planId?: string): Prisma.TenantWhereInput {
  const where: Prisma.TenantWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { constituencyName: { contains: search, mode: "insensitive" } },
      { representativeName: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status as any;
  }

  if (planId) {
    where.subscription = {
      is: {
        planId,
      },
    };
  }

  return where;
}

function getMonthlyRecurringRevenue(
  subscription?: {
    billingCycle: string;
    plan?: { priceMonthly: number; priceYearly: number } | null;
  } | null,
) {
  if (!subscription?.plan) return 0;

  const { billingCycle, plan } = subscription;

  if (billingCycle === "YEARLY") return plan.priceYearly / 12;
  if (billingCycle === "HALF_YEARLY") return (plan.priceYearly / 2) / 6;
  if (billingCycle === "QUARTERLY") return plan.priceMonthly * 3 / 3;

  return plan.priceMonthly;
}

// --- Create Tenant ---
export const createTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      name,
      constituencyName,
      state,
      district,
      address,
      phone,
      email,
      website,
      logoUrl,
      faviconUrl,
      primaryColor,
      secondaryColor,
      representativeName,
      representativeTitle,
      representativePhoto,
      partyName,
      partyLogoUrl,
      termStartDate,
      termEndDate,
      maxUsers,
      storageQuotaMB,
      adminEmail,
      adminPassword,
      adminName,
      adminPhone,
      planId,
      billingCycle,
      trialDays,
    } = req.body;

    // Validate if a tenant with similar core info already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { name: name },
          { constituencyName: constituencyName },
        ],
      },
    });

    if (existingTenant) {
      throw ApiError.conflict("A tenant with this name or constituency already exists");
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create the tenant and the first tenant super-admin within a transaction.
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the tenant
      const newTenant = await tx.tenant.create({
        data: {
          name,
          constituencyName,
          state,
          district,
          address,
          phone,
          email,
          website: normalizeOptionalUrl(website),
          logoUrl: logoUrl || undefined,
          faviconUrl: faviconUrl || undefined,
          primaryColor,
          secondaryColor,
          representativeName,
          representativeTitle,
          representativePhoto,
          partyName,
          partyLogoUrl,
          termStartDate: termStartDate ? new Date(termStartDate) : undefined,
          termEndDate: termEndDate ? new Date(termEndDate) : undefined,
          maxUsers: maxUsers || 50,
          storageQuotaMB: storageQuotaMB || 1024,
          status: "ACTIVE",
        },
      });

      await tx.tenantSetting.createMany({
        data: buildDefaultTenantSettings(newTenant.id),
      });

      // 2. Create the system admin user for this tenant
      const adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          phone: adminPhone,
          role: "SYSTEM_ADMIN",
          status: "ACTIVE",
          tenantId: newTenant.id,
        },
      });

      // 3. Create a subscription if planId is provided
      if (planId) {
        const subscriptionStatus = trialDays ? "TRIALING" : "ACTIVE";
        const trialEndsAt = trialDays
          ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
          : null;

        await tx.tenantSubscription.create({
          data: {
            tenantId: newTenant.id,
            planId,
            status: subscriptionStatus,
            billingCycle: billingCycle || "MONTHLY",
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEndsAt || calculatePeriodEnd(billingCycle),
            nextPaymentDue: trialEndsAt ? null : calculatePeriodEnd(billingCycle),
            trialEndsAt,
          },
        });
      }

      const activeModules = await tx.module.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      if (activeModules.length > 0) {
        await tx.tenantModuleAccess.createMany({
          data: activeModules.map((module) => ({
            tenantId: newTenant.id,
            moduleId: module.id,
            isEnabled: true,
          })),
          skipDuplicates: true,
        });
      }

      return {
        tenant: newTenant,
        admin: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          tenantId: adminUser.tenantId,
        },
        modulesEnabled: activeModules.length,
      };
    });

    res.status(201).json(ApiResponse.created(result, "Tenant created successfully"));
  } catch (error) {
    next(error);
  }
};

// --- List Tenants ---
export const listTenants = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const planId = req.query.planId as string;
    const allowedSortFields = new Set(["createdAt", "updatedAt", "name", "status"]);
    const requestedSortBy = (req.query.sortBy as string) || "createdAt";
    const sortBy = allowedSortFields.has(requestedSortBy)
      ? requestedSortBy
      : "createdAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? "asc" : "desc";

    const where = buildTenantWhere(search, status, planId);

    const [tenants, total, activeTenants, filteredSubscriptions] = await Promise.all([
      prisma.tenant.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
          _count: {
            select: { users: true },
          },
        },
      }),
      prisma.tenant.count({ where }),
      prisma.tenant.count({
        where: {
          ...where,
          status: "ACTIVE",
        },
      }),
      prisma.tenantSubscription.findMany({
        where: {
          tenant: where,
        },
        select: {
          billingCycle: true,
          plan: {
            select: {
              priceMonthly: true,
              priceYearly: true,
            },
          },
        },
      }),
    ]);

    const filteredMrr = filteredSubscriptions.reduce((sum, subscription) => {
      return sum + getMonthlyRecurringRevenue(subscription);
    }, 0);

    res.status(200).json(
      ApiResponse.success({
        tenants,
        stats: {
          totalTenants: total,
          activeTenants,
          filteredMrr,
        },
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

// --- Get Tenant By ID ---
export const getTenantById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getParamId(req);

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        settings: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
          where: {
            role: "SYSTEM_ADMIN",
          },
        },
        _count: {
          select: { users: true, grievances: true },
        },
      },
    });

    if (!tenant) {
      throw ApiError.notFound("Tenant not found");
    }

    res.status(200).json(ApiResponse.success(tenant));
  } catch (error) {
    next(error);
  }
};

// --- Update Tenant ---
export const updateTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getParamId(req);
    const updateData = req.body;

    // Convert string dates to Date objects if they exist in payload
    if (updateData.termStartDate) {
      updateData.termStartDate = new Date(updateData.termStartDate);
    } else if (updateData.termStartDate === "") {
      updateData.termStartDate = null;
    }

    if (updateData.termEndDate) {
      updateData.termEndDate = new Date(updateData.termEndDate);
    } else if (updateData.termEndDate === "") {
      updateData.termEndDate = null;
    }
    if (updateData.website === "") updateData.website = null;

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json(ApiResponse.success(updatedTenant, "Tenant updated successfully"));
  } catch (error) {
    // Check if error is due to record not found
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      next(ApiError.notFound("Tenant not found"));
    } else {
      next(error);
    }
  }
};

// --- Create Tenant User ---
export const createTenantUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getParamId(req);
    const { email, password, name, phone, role, designation, department } = req.body;

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!tenant) {
      throw ApiError.notFound("Tenant not found");
    }

    // Check user limits
    if (tenant._count.users >= tenant.maxUsers) {
      throw ApiError.forbidden(`Tenant has reached the maximum allowed users (${tenant.maxUsers})`);
    }

    // Check if email is already in use within this tenant
    const existingUser = await prisma.user.findFirst({
      where: { tenantId, email },
    });

    if (existingUser) {
      throw ApiError.conflict("Email is already registered in this tenant");
    }

    if (phone) {
      const existingPhone = await prisma.user.findFirst({
        where: { tenantId, phone },
      });

      if (existingPhone) {
        throw ApiError.conflict("Phone is already registered in this tenant");
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role,
        designation,
        department,
        status: "ACTIVE",
        tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    res.status(201).json(ApiResponse.created(newUser, "User created successfully for tenant"));
  } catch (error) {
    next(error);
  }
};

// --- List Tenant Users ---
export const listTenantUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getParamId(req);

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw ApiError.notFound("Tenant not found");
    }

    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        designation: true,
        department: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(ApiResponse.success(users));
  } catch (error) {
    next(error);
  }
};

// --- Suspend Tenant ---
export const suspendTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getParamId(req);

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: true,
      },
    });

    if (!tenant) {
      throw ApiError.notFound("Tenant not found");
    }

    const updatedTenant = await prisma.$transaction(async (tx) => {
      const nextTenant = await tx.tenant.update({
        where: { id },
        data: { status: "SUSPENDED" },
      });

      await tx.user.updateMany({
        where: {
          tenantId: id,
          status: "ACTIVE",
        },
        data: {
          status: "SUSPENDED",
        },
      });

      if (tenant.subscription) {
        await tx.tenantSubscription.update({
          where: { tenantId: id },
          data: {
            status: "SUSPENDED",
            suspendedAt: new Date(),
          },
        });
      }

      return nextTenant;
    });

    res.status(200).json(ApiResponse.success(updatedTenant, "Tenant suspended successfully"));
  } catch (error) {
    next(error);
  }
};

// --- Activate Tenant ---
export const activateTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getParamId(req);

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: true,
      },
    });

    if (!tenant) {
      throw ApiError.notFound("Tenant not found");
    }

    const updatedTenant = await prisma.$transaction(async (tx) => {
      const nextTenant = await tx.tenant.update({
        where: { id },
        data: { status: "ACTIVE" },
      });

      await tx.user.updateMany({
        where: {
          tenantId: id,
          status: "SUSPENDED",
        },
        data: {
          status: "ACTIVE",
        },
      });

      if (tenant.subscription && !["CANCELLED", "EXPIRED"].includes(tenant.subscription.status)) {
        // If trial has expired, don't reactivate — mark as expired instead
        if (
          tenant.subscription.trialEndsAt &&
          new Date() > tenant.subscription.trialEndsAt
        ) {
          await tx.tenantSubscription.update({
            where: { tenantId: id },
            data: { status: "EXPIRED" },
          });
        } else {
          await tx.tenantSubscription.update({
            where: { tenantId: id },
            data: {
              status: "ACTIVE",
              suspendedAt: null,
            },
          });
        }
      }

      return nextTenant;
    });

    res.status(200).json(ApiResponse.success(updatedTenant, "Tenant activated successfully"));
  } catch (error) {
    next(error);
  }
};

// --- Delete Tenant (Safe Deactivation) ---
export const deleteTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getParamId(req);

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: true,
      },
    });

    if (!tenant) {
      throw ApiError.notFound("Tenant not found");
    }

    const updatedTenant = await prisma.$transaction(async (tx) => {
      const nextTenant = await tx.tenant.update({
        where: { id },
        data: { status: "DEACTIVATED" },
      });

      await tx.user.updateMany({
        where: { tenantId: id },
        data: { status: "INACTIVE" },
      });

      if (tenant.subscription) {
        await tx.tenantSubscription.update({
          where: { tenantId: id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        });
      }

      return nextTenant;
    });

    res.status(200).json(
      ApiResponse.success(updatedTenant, "Tenant deactivated successfully"),
    );
  } catch (error) {
    next(error);
  }
};

// --- List Active Subscription Plans ---
export const listPlans = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    res.status(200).json(ApiResponse.success(plans));
  } catch (error) {
    next(error);
  }
};
