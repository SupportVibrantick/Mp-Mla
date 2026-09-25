import { prisma } from "../../../../lib/prisma.js";
import { getProvider, PublishResult } from "../providers/index.js";
import { decryptToken } from "./token.service.js";

/**
 * Dispatches publishing jobs for a given SocialPostTarget
 */
export async function executePublishTarget(
  targetId: string,
  tenantId: string
): Promise<PublishResult> {
  const target = await (prisma as any).socialPostTarget.findFirst({
    where: { id: targetId },
    include: {
      socialPost: true,
      socialAccount: true,
    },
  });

  if (!target || !target.socialAccount) {
    return {
      status: "FAILED",
      errorMessage: "Target or connected account not found",
    };
  }

  // Create Job Record
  const job = await (prisma as any).socialPublishJob.create({
    data: {
      socialPostTargetId: target.id,
      status: "PUBLISHING",
      startedAt: new Date(),
    },
  });

  try {
    // Decrypt account access token
    const rawToken = decryptToken(
      target.socialAccount.accessToken,
      target.socialAccount.iv,
      target.socialAccount.authTag
    );

    const accountForProvider = {
      ...target.socialAccount,
      accountId: target.socialAccount.providerAccountId || target.socialAccount.pageId,
      accessToken: rawToken,
    };

    const provider = getProvider(target.platform);
    const result = await provider.publishPost(accountForProvider, target, target.socialPost);

    // Update target and job
    await (prisma as any).socialPostTarget.update({
      where: { id: target.id },
      data: {
        status: result.status,
        platformPostId: result.platformPostId || null,
        permalink: result.permalink || null,
        failureReason: result.errorMessage || null,
        failureCode: result.failureCode || null,
        platformResponse: result.rawResponse || null,
        publishedAt: result.status === "PUBLISHED" ? new Date() : null,
        lastAttemptAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });

    await (prisma as any).socialPublishJob.update({
      where: { id: job.id },
      data: {
        status: result.status,
        completedAt: new Date(),
        lastError: result.errorMessage || null,
        providerJobId: result.providerJobId || null,
      },
    });

    return result;
  } catch (error: any) {
    const errorMsg = error.message || "Publishing failed";
    console.error(`Publish error for target ${target.id} (${target.platform}):`, errorMsg);

    try {
      await (prisma as any).socialPostTarget.update({
        where: { id: target.id },
        data: {
          status: "FAILED",
          failureReason: errorMsg,
          lastAttemptAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });

      await (prisma as any).socialPublishJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          lastError: errorMsg,
        },
      });
    } catch (dbErr) {
      console.error("Failed to record publishing failure in DB:", dbErr);
    }

    return {
      status: "FAILED",
      errorMessage: errorMsg,
    };
  }
}

/**
 * Re-computes master post status based on targets
 */
export async function updateMasterPostStatus(postId: string) {
  const post = await (prisma as any).socialPost.findUnique({
    where: { id: postId },
    include: { targets: true },
  });

  if (!post || !post.targets || post.targets.length === 0) return;

  const allPublished = post.targets.every((t: any) => t.status === "PUBLISHED");
  const anyPublished = post.targets.some((t: any) => t.status === "PUBLISHED");
  const anyProcessing = post.targets.some((t: any) => t.status === "PROCESSING" || t.status === "PUBLISHING");

  let masterStatus = "FAILED";
  if (allPublished) masterStatus = "PUBLISHED";
  else if (anyProcessing) masterStatus = "PUBLISHING";
  else if (anyPublished) masterStatus = "PARTIAL";

  await (prisma as any).socialPost.update({
    where: { id: postId },
    data: {
      status: masterStatus,
      publishedAt: (masterStatus === "PUBLISHED" || masterStatus === "PARTIAL") ? (post.publishedAt || new Date()) : null,
    },
  });
}

/**
 * Syncs analytics (likes, comments, shares, views) for a single published target from its provider API
 */
export async function syncTargetAnalytics(targetId: string, tenantId: string) {
  const target = await (prisma as any).socialPostTarget.findFirst({
    where: { id: targetId },
    include: {
      socialAccount: true,
      socialPost: true,
    },
  });

  if (!target || !target.socialAccount || !target.platformPostId) {
    return null;
  }

  try {
    const rawToken = decryptToken(
      target.socialAccount.accessToken,
      target.socialAccount.iv,
      target.socialAccount.authTag
    );

    const accountForProvider = {
      ...target.socialAccount,
      accountId: target.socialAccount.providerAccountId || target.socialAccount.pageId,
      accessToken: rawToken,
    };

    const provider = getProvider(target.platform);
    if (!provider.getPostAnalytics) return null;

    const possibleIds = [target.platformPostId];
    if (target.platformResponse) {
      try {
        const resp = typeof target.platformResponse === "string" ? JSON.parse(target.platformResponse) : target.platformResponse;
        if (resp.id && !possibleIds.includes(resp.id)) possibleIds.push(resp.id);
        if (resp.post_id && !possibleIds.includes(resp.post_id)) possibleIds.push(resp.post_id);
      } catch {
        // ignore parse error
      }
    }

    let stats: { likes: number; comments: number; shares: number; views: number; platformSpecific: any } = {
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      platformSpecific: null,
    };
    let anySuccess = false;
    let lastError: string | undefined;

    for (const pid of possibleIds) {
      console.log(`[syncTargetAnalytics] Fetching analytics for ${target.platform} with post ID: ${pid}`);
      const s = await provider.getPostAnalytics(accountForProvider, pid);
      if (s) {
        if (s.success !== false) {
          anySuccess = true;
          stats.likes = Math.max(stats.likes, s.likes || 0);
          stats.comments = Math.max(stats.comments, s.comments || 0);
          stats.shares = Math.max(stats.shares, s.shares || 0);
          stats.views = Math.max(stats.views, s.views || 0);
          if (s.platformSpecific) stats.platformSpecific = s.platformSpecific;
        } else if (s.error) {
          lastError = s.error;
        }
      }
    }

    const updateData: any = {};
    if (anySuccess) {
      updateData.likesCount = stats.likes || 0;
      updateData.commentsCount = stats.comments || 0;
      updateData.sharesCount = stats.shares || 0;
      updateData.viewsCount = stats.views || 0;
      if (stats.platformSpecific) updateData.platformMetadata = stats.platformSpecific;
    }

    let updated = target;
    if (Object.keys(updateData).length > 0) {
      updated = await (prisma as any).socialPostTarget.update({
        where: { id: target.id },
        data: updateData,
      });

      try {
        await (prisma as any).socialPostMetric.create({
          data: {
            socialPostTargetId: target.id,
            likes: stats.likes || 0,
            comments: stats.comments || 0,
            shares: stats.shares || 0,
            views: stats.views || 0,
            platformMetrics: stats.platformSpecific || null,
          },
        });
      } catch {
        // ignore metric snapshot creation errors
      }
    }

    return {
      success: anySuccess,
      targetId: target.id,
      platform: target.platform,
      stats: anySuccess
        ? stats
        : {
            likes: target.likesCount || 0,
            comments: target.commentsCount || 0,
            shares: target.sharesCount || 0,
            views: target.viewsCount || 0,
          },
      error: anySuccess ? undefined : (lastError || "Platform API did not return engagement metrics"),
      updatedTarget: updated,
    };
  } catch (error: any) {
    console.error(`Sync analytics error for target ${targetId}:`, error.message);
    return {
      success: false,
      targetId,
      error: error.message,
    };
  }
}

/**
 * Syncs analytics for all published targets of a specific post
 */
export async function syncPostAnalytics(postId: string, tenantId: string) {
  console.log("\n====================================================");
  console.log("        🔵 SYNC POST ANALYTICS START");
  console.log("====================================================");
  console.log("POST ID:", postId);
  console.log("TENANT ID:", tenantId);
  console.log("====================================================");

  const post = await (prisma as any).socialPost.findFirst({
    where: {
      id: postId,
      tenantId,
    },
    include: {
      targets: true,
    },
  });

  console.log("\n🔍 POST RESULT:");
  console.log(
    JSON.stringify(
      {
        found: !!post,
        id: post?.id,
        tenantId: post?.tenantId,
        status: post?.status,
        content: post?.content,
        targetsCount: post?.targets?.length ?? 0,
      },
      null,
      2
    )
  );

  const directTargets = await (prisma as any).socialPostTarget.findMany({
    where: {
      socialPostId: postId,
    },
  });

  console.log("\n🔥 DIRECT socialPostTarget QUERY:");
  console.log(
    JSON.stringify(
      directTargets.map((t: any) => ({
        id: t.id,
        socialPostId: t.socialPostId,
        socialAccountId: t.socialAccountId,
        platform: t.platform,
        status: t.status,
        platformPostId: t.platformPostId,
        permalink: t.permalink,
        attemptCount: t.attemptCount,
        publishedAt: t.publishedAt,
        likesCount: t.likesCount,
        commentsCount: t.commentsCount,
        sharesCount: t.sharesCount,
        viewsCount: t.viewsCount,
      })),
      null,
      2
    )
  );

  if (!post && directTargets.length === 0) {
    console.error("❌ POST NOT FOUND");
    return {
      post: null,
      results: [],
      error: "Post not found",
    };
  }

  // Use relation targets or fallback to direct targets
  const allTargets = (post?.targets && post.targets.length > 0) ? post.targets : directTargets;

  console.log("\n🔍 ALL TARGETS EVALUATED:", allTargets.length);

  const publishedTargets = (allTargets || []).filter(
    (t: any) =>
      (t.status === "PUBLISHED" || !!t.platformPostId) &&
      !!t.platformPostId
  );

  console.log("\n🔍 PUBLISHED TARGETS:");
  console.log(
    JSON.stringify(
      publishedTargets.map((t: any) => ({
        id: t.id,
        platform: t.platform,
        status: t.status,
        platformPostId: t.platformPostId,
      })),
      null,
      2
    )
  );

  console.log("\n📊 PUBLISHED TARGET COUNT:", publishedTargets.length);

  if (publishedTargets.length === 0) {
    console.error("\n❌ NO PUBLISHED TARGETS FOUND");
    console.error("Analytics provider will NOT be called.");
  }

  const results: any[] = [];

  for (const target of publishedTargets) {
    console.log("\n----------------------------------------------------");
    console.log("🚀 CALLING syncTargetAnalytics");
    console.log("TARGET ID:", target.id);
    console.log("PLATFORM:", target.platform);
    console.log("PLATFORM POST ID:", target.platformPostId);
    console.log("----------------------------------------------------");

    const result = await syncTargetAnalytics(target.id, tenantId);

    console.log("\n📥 syncTargetAnalytics RESULT:");
    console.log(JSON.stringify(result, null, 2));

    results.push(result);
  }

  const updatedPost = await (prisma as any).socialPost.findUnique({
    where: {
      id: postId,
    },
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
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });

  console.log("\n🔵 FINAL POST:");
  console.log(
    JSON.stringify(
      {
        id: updatedPost?.id,
        status: updatedPost?.status,
        targetsCount: updatedPost?.targets?.length ?? 0,
        targets: updatedPost?.targets?.map((t: any) => ({
          id: t.id,
          platform: t.platform,
          status: t.status,
          platformPostId: t.platformPostId,
          likes: t.likesCount,
          comments: t.commentsCount,
          shares: t.sharesCount,
          views: t.viewsCount,
        })),
      },
      null,
      2
    )
  );

  console.log("====================================================");
  console.log("        🔵 SYNC POST ANALYTICS END");
  console.log("====================================================\n");

  return {
    post: updatedPost,
    results,
  };
}

/**
 * Syncs analytics for all recent published posts in the tenant
 */
export async function syncAllTenantPostsAnalytics(tenantId: string) {
  const posts = await (prisma as any).socialPost.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { targets: true },
  });

  for (const post of posts) {
    const publishedTargets = post.targets.filter(
      (t: any) => (t.status === "PUBLISHED" || t.platformPostId) && t.platformPostId
    );
    for (const target of publishedTargets) {
      await syncTargetAnalytics(target.id, tenantId);
    }
  }

  return true;
}
