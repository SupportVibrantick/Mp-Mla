import axios from "axios";
import path from "path";
import fs from "fs";
import { ISocialProvider, PublishResult, PostAnalytics } from "../types.js";

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || "v19.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Resolves a media URL to a local absolute file path if it exists on disk
 */
function resolveLocalMedia(mediaUrl: string): string | null {
  if (!mediaUrl) return null;
  if (
    (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) &&
    !mediaUrl.includes("localhost") &&
    !mediaUrl.includes("127.0.0.1")
  ) {
    return null;
  }

  let cleaned = mediaUrl;
  if (cleaned.includes("/uploads/")) {
    cleaned = cleaned.substring(cleaned.indexOf("/uploads/"));
  }

  const candidates = [
    path.join(process.cwd(), "public", cleaned.replace(/^\/+/, "")),
    path.join(process.cwd(), cleaned.replace(/^\/+/, "")),
    path.join(process.cwd(), "public", "uploads", cleaned.replace(/^\/?(uploads\/)?/, "")),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

export class FacebookProvider implements ISocialProvider {
  platform = "FACEBOOK" as const;

  async validateConnection(account: any): Promise<boolean> {
    try {
      const pageId = account.pageId || account.providerAccountId || account.accountId;
      const res = await axios.get(`${GRAPH_API_BASE}/${pageId}`, {
        params: {
          access_token: account.accessToken,
          fields: "id,name,category,link",
        },
      });
      return !!res.data?.id;
    } catch {
      return false;
    }
  }

  async publishPost(account: any, target: any, masterPost: any): Promise<PublishResult> {
    try {
      const pageId = account.pageId || account.providerAccountId || account.accountId;
      const pageToken = account.accessToken;
      const content = target.customContent || masterPost.content || "";
      const mediaUrls = masterPost.mediaUrls || [];
      const mediaType = masterPost.mediaType;

      // 1. Text-Only Post
      if (mediaUrls.length === 0) {
        const res = await axios.post(`${GRAPH_API_BASE}/${pageId}/feed`, {
          message: content,
          access_token: pageToken,
        });

        const postId = res.data.id;
        return {
          status: "PUBLISHED",
          platformPostId: postId,
          permalink: `https://facebook.com/${postId}`,
          rawResponse: res.data,
        };
      }

      // 2. Single Image Post (Supports direct local file upload & external URL)
      if (mediaUrls.length === 1 && mediaType !== "VIDEO" && mediaType !== "REEL") {
        const localPath = resolveLocalMedia(mediaUrls[0]);
        let res: any;

        if (localPath) {
          const fileBuffer = fs.readFileSync(localPath);
          const formData = new FormData();
          formData.append("source", new Blob([fileBuffer]), path.basename(localPath));
          formData.append("caption", content);
          formData.append("access_token", pageToken);

          res = await axios.post(`${GRAPH_API_BASE}/${pageId}/photos`, formData);
        } else {
          res = await axios.post(`${GRAPH_API_BASE}/${pageId}/photos`, {
            url: mediaUrls[0],
            caption: content,
            access_token: pageToken,
          });
        }

        const postId = res.data.post_id || res.data.id;
        return {
          status: "PUBLISHED",
          platformPostId: postId,
          permalink: `https://facebook.com/${postId}`,
          rawResponse: res.data,
        };
      }

      // 3. Multi-Image Carousel / Album
      if (mediaUrls.length > 1 && mediaType !== "VIDEO") {
        const attachedMediaIds: string[] = [];
        for (const url of mediaUrls) {
          const localPath = resolveLocalMedia(url);
          let uploadRes: any;

          if (localPath) {
            const fileBuffer = fs.readFileSync(localPath);
            const formData = new FormData();
            formData.append("source", new Blob([fileBuffer]), path.basename(localPath));
            formData.append("published", "false");
            formData.append("access_token", pageToken);

            uploadRes = await axios.post(`${GRAPH_API_BASE}/${pageId}/photos`, formData);
          } else {
            uploadRes = await axios.post(`${GRAPH_API_BASE}/${pageId}/photos`, {
              url: url,
              published: false,
              access_token: pageToken,
            });
          }

          if (uploadRes.data?.id) {
            attachedMediaIds.push(uploadRes.data.id);
          }
        }

        const res = await axios.post(`${GRAPH_API_BASE}/${pageId}/feed`, {
          message: content,
          attached_media: attachedMediaIds.map((id) => ({ media_fbid: id })),
          access_token: pageToken,
        });

        const postId = res.data.id;
        return {
          status: "PUBLISHED",
          platformPostId: postId,
          permalink: `https://facebook.com/${postId}`,
          rawResponse: res.data,
        };
      }

      // 4. Video / Reel Post
      if (mediaType === "VIDEO" || mediaType === "REEL") {
        const localPath = resolveLocalMedia(mediaUrls[0]);
        let res: any;

        if (localPath) {
          const fileBuffer = fs.readFileSync(localPath);
          const formData = new FormData();
          formData.append("source", new Blob([fileBuffer]), path.basename(localPath));
          formData.append("description", content);
          formData.append("access_token", pageToken);

          res = await axios.post(`${GRAPH_API_BASE}/${pageId}/videos`, formData);
        } else {
          res = await axios.post(`${GRAPH_API_BASE}/${pageId}/videos`, {
            file_url: mediaUrls[0],
            description: content,
            access_token: pageToken,
          });
        }

        const postId = res.data.id;
        return {
          status: "PUBLISHED",
          platformPostId: postId,
          permalink: `https://facebook.com/${postId}`,
          rawResponse: res.data,
        };
      }

      throw new Error("Unsupported media format for Facebook");
    } catch (error: any) {
      console.error("FacebookProvider error:", error.response?.data || error.message);
      return {
        status: "FAILED",
        failureCode: error.response?.data?.error?.code?.toString() || "FB_ERROR",
        errorMessage: error.response?.data?.error?.message || error.message || "Facebook publish failed",
        rawResponse: error.response?.data,
      };
    }
  }

  async getPostAnalytics(account: any, platformPostId: string): Promise<PostAnalytics> {
    const pageToken = account.accessToken;
    const candidateIds: string[] = [
      platformPostId,
      ...(platformPostId.includes("_") ? [platformPostId.split("_")[1]] : []),
    ].filter(Boolean);

    console.log("\n========== FACEBOOK ANALYTICS ==========");
    console.log("Platform Post ID:", platformPostId);
    console.log("Candidate IDs:", candidateIds);

    let maxLikes = 0;
    let maxComments = 0;
    let maxShares = 0;
    let rawData: any = null;
    let anySuccess = false;
    let lastError: string | undefined;

    for (const id of candidateIds) {
      try {
        console.log(`\n----- FACEBOOK OBJECT ${id} -----`);

        let res: any = null;
        try {
          res = await axios.get(`${GRAPH_API_BASE}/${id}`, {
            params: {
              fields: "id,reactions.limit(0).summary(true),comments.limit(0).summary(true),shares",
              access_token: pageToken,
            },
          });
        } catch (initialErr: any) {
          const errMsg = initialErr.response?.data?.error?.message || initialErr.message;
          console.warn(`Query with shares failed for ${id}:`, errMsg);

          // Retry without shares field for Photo nodes
          res = await axios.get(`${GRAPH_API_BASE}/${id}`, {
            params: {
              fields: "id,reactions.limit(0).summary(true),comments.limit(0).summary(true)",
              access_token: pageToken,
            },
          });
        }

        console.log("Facebook analytics response:", JSON.stringify(res.data, null, 2));

        const likes =
          res.data?.reactions?.summary?.total_count ??
          res.data?.reactions?.data?.length ??
          0;

        const comments =
          res.data?.comments?.summary?.total_count ??
          res.data?.comments?.data?.length ??
          0;

        const shares = res.data?.shares?.count ?? 0;

        console.log("Parsed metrics:", {
          id,
          likes,
          comments,
          shares,
        });

        maxLikes = Math.max(maxLikes, likes);
        maxComments = Math.max(maxComments, comments);
        maxShares = Math.max(maxShares, shares);

        if (!rawData) {
          rawData = res.data;
        }
        anySuccess = true;
      } catch (error: any) {
        lastError = error.response?.data?.error?.message || error.message;
        console.error(`Facebook analytics FAILED for ${id}`);
        console.error("HTTP:", error.response?.status);
        console.error(
          "Facebook error:",
          JSON.stringify(error.response?.data || { message: error.message }, null, 2)
        );
      }
    }

    console.log("\n========== FACEBOOK ANALYTICS RESULT ==========");
    console.log({
      likes: maxLikes,
      comments: maxComments,
      shares: maxShares,
      success: anySuccess,
      error: lastError,
    });

    return {
      likes: maxLikes,
      comments: maxComments,
      shares: maxShares,
      views: 0,
      platformSpecific: rawData,
      success: anySuccess,
      error: lastError,
    };
  }
}
