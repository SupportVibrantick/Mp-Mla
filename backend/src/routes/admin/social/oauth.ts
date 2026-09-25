import { Router, Request, Response } from "express";
import { startOAuthFlow, handleOAuthCallback, selectDiscoveredResources } from "./services/oauth.service.js";
import { prisma } from "../../../lib/prisma.js";

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// GET /api/admin/social/oauth/:provider/start - Generate OAuth Auth URL
router.get("/:provider/start", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const provider = String(req.params.provider);

    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { authUrl, state } = await startOAuthFlow(provider, tenantId, userId);

    return res.json({
      success: true,
      data: { authUrl, state },
    });
  } catch (error: any) {
    console.error("OAuth Start error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to initiate OAuth" });
  }
});

export const publicOAuthCallbackRouter = Router();

// GET /api/admin/social/oauth/:provider/callback - Handles Provider Redirect (PUBLIC BROWSER REDIRECT)
publicOAuthCallbackRouter.get("/:provider/callback", async (req: Request, res: Response) => {
  try {
    const provider = String(req.params.provider);
    const { code, state, error, error_description } = req.query;

    if (error) {
      return res.redirect(`${FRONTEND_URL}/social?oauth_error=${encodeURIComponent(String(error_description || error))}`);
    }

    if (!code || !state) {
      return res.redirect(`${FRONTEND_URL}/social?oauth_error=missing_code_or_state`);
    }

    const { connectionId } = await handleOAuthCallback(
      provider,
      String(code),
      String(state)
    );

    // Redirect user back to frontend with the connection ID to open resource selector
    return res.redirect(
      `${FRONTEND_URL}/social?oauth_success=true&provider=${provider.toLowerCase()}&connection_id=${connectionId}`
    );
  } catch (error: any) {
    console.error("OAuth Callback error:", error);
    return res.redirect(
      `${FRONTEND_URL}/social?oauth_error=${encodeURIComponent(error.message || "OAuth exchange failed")}`
    );
  }
});

// Also mount on the main router
router.use(publicOAuthCallbackRouter);

// GET /api/admin/social/oauth/:provider/resources - Returns discovered resources
router.get("/:provider/resources", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { connectionId } = req.query;

    if (!tenantId) {
      return res.status(401).json({ success: false, message: "Tenant required" });
    }

    if (!connectionId) {
      return res.status(400).json({ success: false, message: "Connection ID required" });
    }

    const connection = await (prisma as any).socialOAuthConnection.findFirst({
      where: { id: String(connectionId), tenantId },
    });

    if (!connection) {
      return res.status(404).json({ success: false, message: "Connection not found" });
    }

    const resources = connection.metadata?.resources || [];
    return res.json({
      success: true,
      data: {
        connectionId: connection.id,
        platform: connection.platform,
        resources,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to load discovered channels" });
  }
});

// POST /api/admin/social/oauth/:provider/select - Activates selected channels
router.post("/:provider/select", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { connectionId, resourceIds } = req.body;

    if (!tenantId) {
      return res.status(401).json({ success: false, message: "Tenant required" });
    }

    if (!connectionId || !resourceIds || !Array.isArray(resourceIds) || resourceIds.length === 0) {
      return res.status(400).json({ success: false, message: "Connection ID and resourceIds are required" });
    }

    const accounts = await selectDiscoveredResources(connectionId, tenantId, resourceIds);

    return res.json({
      success: true,
      data: accounts,
      message: `${accounts.length} social channel(s) connected and ready to broadcast!`,
    });
  } catch (error: any) {
    console.error("Resource selection error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to activate channels" });
  }
});

export default router;
