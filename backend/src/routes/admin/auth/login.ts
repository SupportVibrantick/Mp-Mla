import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma.js";
import { generateAccessToken, generateRefreshToken } from "../../../lib/jwt.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { getSetting, getSettingNumber } from "../../../lib/settings.js";
import { isPasswordExpired } from "../../../lib/authUtils.js";

function getTenantIdFromLoginRequest(req: Request): string | null {
  const value =
    (req.body?.tenantId as string | undefined) ||
    (req.headers["x-tenant-id"] as string | undefined) ;

  return value || null;
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const meta = getRequestMeta(req);
    const tenantId = getTenantIdFromLoginRequest(req);

    // 0. Check IP Restrictions (tenant-scoped when tenantId provided)
    const ipCheckTenantId = tenantId || null;
    const allowedIps = ipCheckTenantId
      ? await getSetting("allowed_ip_ranges", ipCheckTenantId)
      : "";
    if (allowedIps && allowedIps.trim() !== "") {
      const ipList = allowedIps.split(",").map((ip) => ip.trim());
      if (meta.ipAddress && !ipList.includes(meta.ipAddress)) {
        await createAuditLog({
          action: "LOGIN_FAILED",
          module: "auth",
          description: `Login blocked by IP restriction: ${meta.ipAddress}`,
          ...meta,
        });
        throw ApiError.forbidden("Access denied from this IP address.");
      }
    }

    // 1. Find user within a tenant when provided; otherwise allow legacy
    // login only when the email maps to exactly one tenant user.
    const matches = tenantId
      ? []
      : await prisma.user.findMany({
          where: { email: normalizedEmail },
          take: 2,
          orderBy: { createdAt: "asc" },
        });

    if (!tenantId && matches.length > 1) {
      throw ApiError.badRequest(
        "Tenant ID is required for this email. Provide it in `tenantId` or the `x-tenant-id` header.",
      );
    }

    const user = tenantId
      ? await prisma.user.findFirst({
          where: { tenantId, email: normalizedEmail },
        })
      : (matches[0] ?? null);

    if (!user) {
      throw ApiError.unauthorized("Invalid email or password.");
    }

    // 2. Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await createAuditLog({
        userId: user.id,
        action: "LOGIN_FAILED",
        module: "auth",
        description: `Login attempt on locked account: ${email}`,
        ...meta,
      });
      throw ApiError.forbidden(
        `Account locked until ${user.lockedUntil.toLocaleTimeString()}.`,
      );
    }

    // 3. Check status
    if (user.status !== "ACTIVE") {
      throw ApiError.forbidden(
        "Account is deactivated. Contact administrator.",
      );
    }

    // 4. Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      const maxAttempts =
        (await getSettingNumber("max_failed_logins", user.tenantId)) || 5;
      const lockoutMins =
        (await getSettingNumber("lockout_duration_minutes", user.tenantId)) ||
        30;

      const newCount = user.failedLoginCount + 1;
      const shouldLock = newCount >= maxAttempts;
      const lockUntil = shouldLock
        ? new Date(Date.now() + lockoutMins * 60 * 1000)
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: newCount, lockedUntil: lockUntil },
      });

      await createAuditLog({
        userId: user.id,
        action: "LOGIN_FAILED",
        module: "auth",
        description: `Failed login #${newCount} for ${email}`,
        ...meta,
      });

      if (shouldLock) {
        await createAuditLog({
          userId: user.id,
          action: "ACCOUNT_LOCKED",
          module: "auth",
          description: `Account locked for ${lockoutMins} mins after ${newCount} failed attempts`,
          ...meta,
        });
      }

      throw ApiError.unauthorized("Invalid email or password.");
    }

    // 5. Success — reset failed count
    const hasExpired = await isPasswordExpired(
      user.tenantId,
      user.passwordChangedAt,
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: meta.ipAddress || undefined,
        forcePasswordChange: user.forcePasswordChange || hasExpired,
      },
    });

    // 6. Generate access token
    const sessionTimeout = await getSettingNumber(
      "session_timeout_minutes",
      user.tenantId,
    );
    // 0 = unlimited, otherwise minutes. JWT expect string like '1h' or seconds.
    const expiresIn = sessionTimeout === 0 ? "365d" : `${sessionTimeout}m`;

    const accessToken = generateAccessToken(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        accountType: "admin",
        tenantId: user.tenantId,
      },
      expiresIn,
    );

    // 7. Create refresh token record in DB, then generate JWT
    const refreshRecord = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: "placeholder",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      tokenId: refreshRecord.id,
      accountType: "admin",
      tenantId: user.tenantId,
    });

    await prisma.refreshToken.update({
      where: { id: refreshRecord.id },
      data: { token: refreshToken },
    });

    // 8. Audit log
    await createAuditLog({
      userId: user.id,
      action: "LOGIN",
      module: "auth",
      description: `${user.name} (${user.role}) logged in`,
      ...meta,
    });

    // 9. Respond
    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          forcePasswordChange: user.forcePasswordChange || hasExpired,
          lastLoginAt: user.lastLoginAt,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}
