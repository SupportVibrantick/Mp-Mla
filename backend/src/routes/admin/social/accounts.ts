import { Router, Request, Response } from "express";
import { prisma } from "../../../lib/prisma.js";
import { encryptToken, decryptToken } from "./services/token.service.js";
import { getProvider } from "./providers/index.js";

const router = Router();

// GET /api/admin/social/accounts - List connected accounts for tenant
router.get("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: "Tenant required" });
    }

    const accounts = await (prisma as any).socialAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        platform: true,
        accountName: true,
        accountUsername: true,
        providerAccountId: true,
        providerAccountType: true,
        avatarUrl: true,
        status: true,
        isActive: true,
        tokenExpiresAt: true,
        lastHealthCheckAt: true,
        lastSuccessfulPublish: true,
        lastErrorMessage: true,
        metadata: true,
        createdAt: true,
        _count: {
          select: { postTargets: true },
        },
      },
    });

    return res.json({ success: true, data: accounts });
  } catch (error: any) {
    console.error("List social accounts error:", error);
    return res.status(500).json({ success: false, message: "Failed to load social accounts" });
  }
});

// POST /api/admin/social/accounts - Connect / Add a social account
router.post("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: "Tenant required" });
    }

    const {
      platform,
      accountName,
      accountUsername,
      accountId,
      accessToken,
      refreshToken,
      avatarUrl,
      metadata,
    } = req.body;

    if (!platform || !accountName || !accessToken) {
      return res.status(400).json({
        success: false,
        message: "Platform, account name, and access token are required",
      });
    }

    // Encrypt token via AES-256-GCM Vault
    const encrypted = encryptToken(accessToken);

    const account = await (prisma as any).socialAccount.create({
      data: {
        tenantId,
        platform,
        accountName,
        accountUsername: accountUsername || accountName,
        providerAccountId: accountId || `acc_${Date.now()}`,
        providerAccountType: "USER",
        accessToken: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        refreshToken: refreshToken ? encryptToken(refreshToken).ciphertext : null,
        avatarUrl: avatarUrl || null,
        metadata: metadata || {},
        status: "CONNECTED",
        isActive: true,
        lastHealthCheckAt: new Date(),
      },
    });

    // Record audit log
    await (prisma as any).socialAuditLog.create({
      data: {
        tenantId,
        userId,
        action: "ACCOUNT_CONNECTED",
        entityType: "SocialAccount",
        entityId: account.id,
        details: { platform, accountName },
      },
    });

    return res.json({
      success: true,
      data: {
        id: account.id,
        platform: account.platform,
        accountName: account.accountName,
        accountUsername: account.accountUsername,
        isActive: account.isActive,
      },
      message: `${platform} account connected and encrypted in security vault!`,
    });
  } catch (error: any) {
    console.error("Connect social account error:", error);
    return res.status(500).json({ success: false, message: "Failed to connect social account" });
  }
});

// DELETE /api/admin/social/accounts/:id - Disconnect account
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const { id } = req.params;

    const account = await (prisma as any).socialAccount.findFirst({
      where: { id, tenantId },
    });

    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    // Soft-disconnect to preserve historical post metrics and targets
    await (prisma as any).socialAccount.update({
      where: { id },
      data: {
        isActive: false,
        status: "DISCONNECTED",
      },
    });

    // Record audit log
    await (prisma as any).socialAuditLog.create({
      data: {
        tenantId,
        userId,
        action: "ACCOUNT_DISCONNECTED",
        entityType: "SocialAccount",
        entityId: id,
        details: { platform: account.platform, accountName: account.accountName },
      },
    });

    return res.json({ success: true, message: "Account disconnected successfully" });
  } catch (error: any) {
    console.error("Delete social account error:", error);
    return res.status(500).json({ success: false, message: "Failed to disconnect account" });
  }
});

// POST /api/admin/social/accounts/:id/test - Test connection
router.post("/:id/test", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const account = await (prisma as any).socialAccount.findFirst({
      where: { id, tenantId },
    });

    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    const rawToken = decryptToken(account.accessToken, account.iv, account.authTag);
    const provider = getProvider(account.platform);
    const isValid = await provider.validateConnection({
      ...account,
      accessToken: rawToken,
    });

    await (prisma as any).socialAccount.update({
      where: { id },
      data: {
        lastHealthCheckAt: new Date(),
        isActive: isValid,
        lastErrorMessage: isValid ? null : "Token validation failed or expired",
      },
    });

    return res.json({
      success: isValid,
      message: isValid
        ? `Connection to ${account.platform} (${account.accountName}) is active and verified!`
        : `Connection check failed for ${account.platform}. Token may be expired.`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Connection test failed" });
  }
});

export default router;
