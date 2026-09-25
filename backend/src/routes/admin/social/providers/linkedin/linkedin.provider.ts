import axios from "axios";
import fs from "fs";
import path from "path";
import { ISocialProvider, PublishResult, PostAnalytics } from "../types.js";

function getLinkedInVersion(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
}

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

async function uploadImageToLinkedIn(
  accessToken: string,
  authorUrn: string,
  mediaUrl: string,
  version: string
): Promise<string | null> {
  try {
    let imageBuffer: Buffer;
    let contentType = "image/png";

    const localPath = resolveLocalMedia(mediaUrl);
    if (localPath) {
      imageBuffer = fs.readFileSync(localPath);
      if (localPath.endsWith(".jpg") || localPath.endsWith(".jpeg")) contentType = "image/jpeg";
      else if (localPath.endsWith(".png")) contentType = "image/png";
      else if (localPath.endsWith(".gif")) contentType = "image/gif";
      else if (localPath.endsWith(".webp")) contentType = "image/webp";
    } else {
      const res = await axios.get(mediaUrl, { responseType: "arraybuffer" });
      imageBuffer = Buffer.from(res.data);
      if (res.headers["content-type"]) {
        contentType = res.headers["content-type"];
      }
    }

    // Step 1: Initialize upload
    const initRes = await axios.post(
      "https://api.linkedin.com/rest/images?action=initializeUpload",
      {
        initializeUploadRequest: {
          owner: authorUrn,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "LinkedIn-Version": version,
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json",
        },
      }
    );

    const uploadUrl = initRes.data?.value?.uploadUrl;
    const imageUrn = initRes.data?.value?.image;

    if (!uploadUrl || !imageUrn) {
      console.warn("LinkedIn image initializeUpload did not return uploadUrl or image URN:", initRes.data);
      return null;
    }

    // Step 2: Upload binary image to uploadUrl
    await axios.put(uploadUrl, imageBuffer, {
      headers: {
        "Content-Type": contentType,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    return imageUrn;
  } catch (err: any) {
    console.error("LinkedIn image upload error:", err.response?.data || err.message);
    return null;
  }
}

export class LinkedInProvider implements ISocialProvider {
  platform = "LINKEDIN" as const;

  async validateConnection(account: any): Promise<boolean> {
    try {
      const res = await axios.get("https://api.linkedin.com/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
        },
      });
      return !!res.data?.sub;
    } catch {
      return false;
    }
  }

  async publishPost(account: any, target: any, masterPost: any): Promise<PublishResult> {
    try {
      const content = target.customContent || masterPost.content || "";
      const authorId = account.providerAccountId || account.accountId || "";
      const authorUrn = authorId.startsWith("urn:li:")
        ? authorId
        : `urn:li:person:${authorId}`;
      const version = getLinkedInVersion();
      const mediaUrls = masterPost.mediaUrls || [];

      let imageUrn: string | null = null;
      if (mediaUrls.length > 0 && masterPost.mediaType !== "VIDEO") {
        imageUrn = await uploadImageToLinkedIn(account.accessToken, authorUrn, mediaUrls[0], version);
      }

      // Modern versioned LinkedIn Posts API format
      const payload: any = {
        author: authorUrn,
        commentary: content,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      };

      if (imageUrn) {
        payload.content = {
          media: {
            id: imageUrn,
          },
        };
      }

      const res = await axios.post("https://api.linkedin.com/rest/posts", payload, {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "LinkedIn-Version": version,
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json",
        },
      });

      const postId = res.headers["x-restli-id"] || res.data?.id || `li_${Date.now()}`;
      return {
        status: "PUBLISHED",
        platformPostId: postId,
        permalink: `https://linkedin.com/feed/update/${postId}`,
        rawResponse: res.data,
      };
    } catch (error: any) {
      console.error("LinkedInProvider error:", error.response?.data || error.message);
      return {
        status: "FAILED",
        failureCode: error.response?.status?.toString() || "LI_ERROR",
        errorMessage:
          error.response?.data?.message ||
          error.response?.data?.error_description ||
          error.message ||
          "LinkedIn publish failed",
        rawResponse: error.response?.data,
      };
    }
  }

  async getPostAnalytics(account: any, platformPostId: string): Promise<PostAnalytics> {
    const version = getLinkedInVersion();
    let likes = 0;
    let comments = 0;
    let shares = 0;
    let views = 0;
    let rawData: any = null;

    if (!platformPostId) {
      return { likes: 0, comments: 0, shares: 0, views: 0 };
    }

    try {
      // 1. Try LinkedIn Social Metadata API (Single URN)
      try {
        const res = await axios.get(
          `https://api.linkedin.com/rest/socialMetadata/${encodeURIComponent(platformPostId)}`,
          {
            headers: {
              Authorization: `Bearer ${account.accessToken}`,
              "LinkedIn-Version": version,
              "X-Restli-Protocol-Version": "2.0.0",
            },
            timeout: 8000,
          }
        );

        if (res.data) {
          rawData = res.data;
          const reactions = res.data.reactionSummaries || {};
          likes = Object.values(reactions).reduce(
            (sum: number, r: any) => sum + (Number(r?.count) || 0),
            0
          );
          comments =
            Number(res.data.commentSummary?.count) ||
            Number(res.data.commentSummary?.totalCount) ||
            0;
          return {
            likes,
            comments,
            shares,
            views,
            platformSpecific: rawData,
          };
        }
      } catch (err1: any) {
        // Fallback to batch format if single fails
        if (err1.response?.status !== 403) {
          console.warn("LinkedIn single socialMetadata warning:", err1.response?.data?.message || err1.message);
        }
      }

      // 2. Try Batch Social Metadata API
      try {
        const batchRes = await axios.get(
          `https://api.linkedin.com/rest/socialMetadata?ids=List(${encodeURIComponent(platformPostId)})`,
          {
            headers: {
              Authorization: `Bearer ${account.accessToken}`,
              "LinkedIn-Version": version,
              "X-Restli-Protocol-Version": "2.0.0",
            },
            timeout: 8000,
          }
        );

        const entityData = batchRes.data?.results?.[platformPostId];
        if (entityData) {
          rawData = entityData;
          const reactions = entityData.reactionSummaries || {};
          likes = Object.values(reactions).reduce(
            (sum: number, r: any) => sum + (Number(r?.count) || 0),
            0
          );
          comments =
            Number(entityData.commentSummary?.count) ||
            Number(entityData.commentSummary?.totalCount) ||
            0;
          return {
            likes,
            comments,
            shares,
            views,
            platformSpecific: rawData,
          };
        }
      } catch (err2: any) {
        if (err2.response?.status !== 403) {
          console.warn("LinkedIn batch socialMetadata warning:", err2.response?.data?.message || err2.message);
        }
      }

      // 3. Fallback to v2 socialActions
      try {
        const v2Res = await axios.get(
          `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(platformPostId)}`,
          {
            headers: {
              Authorization: `Bearer ${account.accessToken}`,
            },
            timeout: 8000,
          }
        );

        if (v2Res.data) {
          rawData = v2Res.data;
          likes =
            Number(v2Res.data.likesSummary?.totalLikes) ||
            Number(v2Res.data.reactionsSummary?.totalReactions) ||
            0;
          comments = Number(v2Res.data.commentsSummary?.totalComments) || 0;
          return {
            likes,
            comments,
            shares,
            views,
            platformSpecific: rawData,
          };
        }
      } catch (err3: any) {
        // Ignore if unsupported or restricted
      }
    } catch (error: any) {
      console.warn("LinkedIn getPostAnalytics error:", error.response?.data || error.message);
    }

    return {
      likes,
      comments,
      shares,
      views,
      platformSpecific: rawData,
    };
  }
}
