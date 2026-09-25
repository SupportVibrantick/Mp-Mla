import axios from "axios";
import path from "path";
import fs from "fs";
import { ISocialProvider, PublishResult, PostAnalytics } from "../types.js";

const YOUTUBE_API_VERSION = process.env.YOUTUBE_API_VERSION || "v3";

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

export class YouTubeProvider implements ISocialProvider {
  platform = "YOUTUBE" as const;

  async validateConnection(account: any): Promise<boolean> {
    try {
      const res = await axios.get(`https://www.googleapis.com/youtube/${YOUTUBE_API_VERSION}/channels`, {
        params: {
          part: "snippet",
          mine: true,
        },
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
        },
      });
      return !!res.data?.items?.length;
    } catch {
      return false;
    }
  }

  async publishPost(account: any, target: any, masterPost: any): Promise<PublishResult> {
    try {
      const mediaUrls = masterPost.mediaUrls || [];
      if (mediaUrls.length === 0) {
        throw new Error("YouTube requires a valid video file URL to publish.");
      }

      const videoUrl = mediaUrls[0];
      const platformConfig = target.platformConfig || {};
      const title = (platformConfig.title || masterPost.title || "Constituency Official Update").slice(0, 100);
      const description = (target.customContent || masterPost.content || "").slice(0, 5000);
      const tags = Array.isArray(platformConfig.tags)
        ? platformConfig.tags
        : ["Constituency", "PublicUpdate", "Official"];
      const privacyStatus = platformConfig.privacyStatus || "public";
      const madeForKids = !!platformConfig.madeForKids;

      // 1. Initialize Resumable Upload Session with YouTube Data API v3
      const initRes = await axios.post(
        `https://www.googleapis.com/upload/youtube/${YOUTUBE_API_VERSION}/videos?uploadType=resumable&part=snippet,status`,
        {
          snippet: {
            title,
            description,
            tags,
            categoryId: "25", // 25 = News & Politics
          },
          status: {
            privacyStatus,
            selfDeclaredMadeForKids: madeForKids,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "video/*",
          },
        }
      );

      const resumableUploadUrl = initRes.headers["location"];
      if (!resumableUploadUrl) {
        throw new Error("YouTube failed to return a resumable upload location.");
      }

      // 2. Fetch video media binary stream or buffer
      let videoBuffer: Buffer;
      let videoMime = "video/mp4";

      const localPath = resolveLocalMedia(videoUrl);
      if (localPath) {
        videoBuffer = fs.readFileSync(localPath);
        const ext = path.extname(localPath).toLowerCase();
        if (ext === ".mov") videoMime = "video/quicktime";
        else if (ext === ".webm") videoMime = "video/webm";
      } else {
        const videoStreamRes = await axios.get(videoUrl, {
          responseType: "arraybuffer",
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });
        videoBuffer = Buffer.from(videoStreamRes.data);
        videoMime = (videoStreamRes.headers["content-type"] as string) || "video/mp4";
      }

      // 3. Upload video data to the resumable location
      const uploadRes = await axios.put(resumableUploadUrl, videoBuffer, {
        headers: {
          "Content-Type": videoMime,
          "Content-Length": videoBuffer.length,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const videoId = uploadRes.data?.id;
      if (!videoId) {
        throw new Error("YouTube video upload completed but no video ID was returned.");
      }

      return {
        status: "PUBLISHED",
        platformPostId: videoId,
        permalink: `https://youtube.com/watch?v=${videoId}`,
        rawResponse: uploadRes.data,
      };
    } catch (error: any) {
      console.error("YouTubeProvider error:", error.response?.data || error.message);
      return {
        status: "FAILED",
        failureCode: error.response?.data?.error?.code?.toString() || "YT_ERROR",
        errorMessage: error.response?.data?.error?.message || error.message || "YouTube upload and publish failed",
        rawResponse: error.response?.data,
      };
    }
  }

  async getPostAnalytics(account: any, platformPostId: string): Promise<PostAnalytics> {
    try {
      const res = await axios.get(`https://www.googleapis.com/youtube/${YOUTUBE_API_VERSION}/videos`, {
        params: {
          part: "statistics",
          id: platformPostId,
        },
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
        },
      });

      const stats = res.data?.items?.[0]?.statistics || {};
      return {
        likes: parseInt(stats.likeCount || "0", 10),
        comments: parseInt(stats.commentCount || "0", 10),
        shares: 0,
        views: parseInt(stats.viewCount || "0", 10),
        platformSpecific: stats,
      };
    } catch {
      return { likes: 0, comments: 0, shares: 0, views: 0 };
    }
  }
}
