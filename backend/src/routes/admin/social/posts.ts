import { Router, Request, Response } from "express";
import { prisma } from "../../../lib/prisma.js";
import {
  executePublishTarget,
  updateMasterPostStatus,
  syncPostAnalytics,
  syncAllTenantPostsAnalytics,
} from "./services/publish.service.js";

const router = Router();

// GET /api/admin/social/posts - List posts
router.get("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: "Tenant required" });
    }

    const posts = await (prisma as any).socialPost.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        targets: {
          include: {
            socialAccount: {
              select: {
                id: true,
                platform: true,
                accountName: true,
                accountUsername: true,
                avatarUrl: true,
              },
            },
            publishJobs: {
              take: 3,
              orderBy: { createdAt: "desc" },
            },
            metrics: {
              take: 5,
              orderBy: { capturedAt: "desc" },
            },
          },
        },
      },
    });

    return res.json({ success: true, data: posts });
  } catch (error: any) {
    console.error("List social posts error:", error);
    return res.status(500).json({ success: false, message: "Failed to load posts" });
  }
});

// GET /api/admin/social/posts/:id - Single post with full analytics
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const post = await (prisma as any).socialPost.findFirst({
      where: { id, tenantId },
      include: {
        targets: {
          include: {
            socialAccount: {
              select: {
                id: true,
                platform: true,
                accountName: true,
                accountUsername: true,
                avatarUrl: true,
              },
            },
            publishJobs: {
              take: 5,
              orderBy: { createdAt: "desc" },
            },
            metrics: {
              take: 10,
              orderBy: { capturedAt: "desc" },
            },
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    return res.json({ success: true, data: post });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to load post details" });
  }
});

// POST /api/admin/social/posts/sync-all-metrics - Refresh analytics for all recent posts
router.post("/sync-all-metrics", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: "Tenant required" });
    }

    await syncAllTenantPostsAnalytics(tenantId);

    const updatedPosts = await (prisma as any).socialPost.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        targets: {
          include: {
            socialAccount: {
              select: {
                id: true,
                platform: true,
                accountName: true,
                accountUsername: true,
                avatarUrl: true,
              },
            },
            publishJobs: {
              take: 3,
              orderBy: { createdAt: "desc" },
            },
            metrics: {
              take: 5,
              orderBy: { capturedAt: "desc" },
            },
          },
        },
      },
    });

    return res.json({
      success: true,
      data: updatedPosts,
      message: "Live analytics synchronized across all connected platforms!",
    });
  } catch (error: any) {
    console.error("Sync all metrics error:", error);
    return res.status(500).json({ success: false, message: "Failed to sync analytics" });
  }
});

// POST /api/admin/social/posts/:id/sync-metrics - Refresh analytics for a single post
router.post("/:id/sync-metrics", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ success: false, message: "Tenant required" });
    }

    console.log("\n==========================================");
    console.log("🔥 SYNC METRICS API CALLED");
    console.log("POST ID:", id);
    console.log("TENANT ID:", tenantId);
    console.log("==========================================\n");

    const syncResult = await syncPostAnalytics(id as string, tenantId);

    console.log("\n🔥 SYNC RESULT FROM SERVICE:");
    console.log(
      JSON.stringify(
        {
          hasPost: !!syncResult?.post,
          resultsCount: syncResult?.results?.length ?? 0,
          results: syncResult?.results,
        },
        null,
        2
      )
    );

    if (!syncResult || !syncResult.post) {
      return res.status(404).json({
        success: false,
        message: "Post not found or has no published targets",
      });
    }

    const post = syncResult.post;
    const results = syncResult.results || [];
    const successfulResults = results.filter((r: any) => r?.success === true);
    const failedResults = results.filter((r: any) => r?.success === false);
    const hasResults = results.length > 0;

    const totalLikes = post.targets?.reduce((sum: number, t: any) => sum + (t.likesCount || 0), 0) || 0;
    const totalComments = post.targets?.reduce((sum: number, t: any) => sum + (t.commentsCount || 0), 0) || 0;
    const totalShares = post.targets?.reduce((sum: number, t: any) => sum + (t.sharesCount || 0), 0) || 0;

    return res.json({
      success: hasResults && failedResults.length === 0,
      data: post,
      results,
      message: !hasResults
        ? "No published social targets were found for this post."
        : failedResults.length > 0
        ? `Analytics synchronization failed for ${failedResults.length} platform(s): ${failedResults.map((f: any) => f.error).join(", ")}`
        : `Live post metrics updated! (Likes: ${totalLikes}, Comments: ${totalComments}, Shares: ${totalShares})`,
    });
  } catch (error: any) {
    console.error("Sync post metrics error:", error);
    return res.status(500).json({ success: false, message: "Failed to update post metrics" });
  }
});

// POST /api/admin/social/posts - Create and dispatch/schedule post
router.post("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: "Tenant required" });
    }

    const {
      title,
      content,
      mediaUrls = [],
      mediaType = "TEXT_ONLY",
      accountIds = [],
      scheduledAt,
      customCaptions = {},
      platformConfigs = {},
      isAiGenerated = false,
      complianceLabels = [],
    } = req.body;

    if (!content || !accountIds || accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Post content and at least one target social account are required",
      });
    }

    const accounts = await (prisma as any).socialAccount.findMany({
      where: {
        id: { in: accountIds },
        tenantId,
        isActive: true,
      },
    });

    if (accounts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No active social accounts found for selected targets",
      });
    }

    const isScheduled = !!scheduledAt && new Date(scheduledAt) > new Date();

    // 1. Create master SocialPost
    const post = await (prisma as any).socialPost.create({
      data: {
        tenantId,
        title: title || null,
        content,
        mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
        mediaType: mediaType || "TEXT_ONLY",
        status: isScheduled ? "SCHEDULED" : "PUBLISHING",
        scheduledAt: isScheduled ? new Date(scheduledAt) : null,
        publishedAt: null,
        isAiGenerated: !!isAiGenerated,
        complianceLabels: Array.isArray(complianceLabels) ? complianceLabels : [],
        createdById: userId || null,
        targets: {
          create: accounts.map((acc: any) => ({
            socialAccountId: acc.id,
            platform: acc.platform,
            customContent: customCaptions[acc.id] || null,
            platformConfig: platformConfigs[acc.id] || null,
            status: isScheduled ? "SCHEDULED" : "PUBLISHING",
          })),
        },
      },
      include: {
        targets: true,
      },
    });

    // Record audit log
    await (prisma as any).socialAuditLog.create({
      data: {
        tenantId,
        userId,
        action: isScheduled ? "POST_SCHEDULED" : "POST_CREATED",
        entityType: "SocialPost",
        entityId: post.id,
        details: { targetsCount: post.targets.length, isScheduled },
      },
    });

    if (isScheduled) {
      return res.json({
        success: true,
        data: post,
        message: `Post scheduled for ${new Date(scheduledAt).toLocaleString()}!`,
      });
    }

    // 2. Dispatch publishing for each target independently
    for (const target of post.targets) {
      await executePublishTarget(target.id, tenantId);
    }

    // 3. Update master post overall status
    await updateMasterPostStatus(post.id);

    const updatedPost = await (prisma as any).socialPost.findUnique({
      where: { id: post.id },
      include: {
        targets: {
          include: {
            socialAccount: {
              select: {
                id: true,
                platform: true,
                accountName: true,
                accountUsername: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    const finalPost = updatedPost || post;
    return res.json({
      success: true,
      data: finalPost,
      message:
        finalPost.status === "PUBLISHED"
          ? "Post published to all social platforms successfully!"
          : finalPost.status === "PARTIAL"
          ? "Post published with some errors on specific networks."
          : "Publishing failed. Please check account credentials.",
    });
  } catch (error: any) {
    console.error("Create social post error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to process post" });
  }
});

// POST /api/admin/social/posts/:id/retry - Retry ONLY failed targets
router.post("/:id/retry", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ success: false, message: "Tenant required" });
    }

    const post = await (prisma as any).socialPost.findFirst({
      where: { id, tenantId },
      include: { targets: true },
    });

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const failedTargets = post.targets.filter((t: any) => t.status === "FAILED" || t.status === "PARTIAL");

    if (failedTargets.length === 0) {
      return res.json({ success: true, message: "No failed platforms to retry." });
    }

    for (const target of failedTargets) {
      await executePublishTarget(target.id, tenantId);
    }

    await updateMasterPostStatus(post.id);

    return res.json({
      success: true,
      message: `Retried ${failedTargets.length} platform(s).`,
    });
  } catch (error: any) {
    console.error("Retry error:", error);
    return res.status(500).json({ success: false, message: "Failed to retry publishing" });
  }
});

// DELETE /api/admin/social/posts/:id - Delete post
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const post = await (prisma as any).socialPost.findFirst({
      where: { id, tenantId },
    });

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    await (prisma as any).socialPost.delete({
      where: { id },
    });

    return res.json({ success: true, message: "Post record deleted successfully" });
  } catch (error: any) {
    console.error("Delete social post error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete post" });
  }
});

export default router;

