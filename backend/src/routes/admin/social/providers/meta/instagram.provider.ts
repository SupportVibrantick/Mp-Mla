import axios from "axios";
import { ISocialProvider, PublishResult, PostAnalytics } from "../types.js";

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || "v19.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export class InstagramProvider implements ISocialProvider {
  platform = "INSTAGRAM" as const;

  async validateConnection(account: any): Promise<boolean> {
    try {
      const igUserId = account.providerAccountId || account.accountId || account.pageId;
      const res = await axios.get(`${GRAPH_API_BASE}/${igUserId}`, {
        params: {
          access_token: account.accessToken,
          fields: "id,username,profile_picture_url,followers_count",
        },
      });
      return !!res.data?.id;
    } catch {
      return false;
    }
  }

  async publishPost(account: any, target: any, masterPost: any): Promise<PublishResult> {
    try {
      const igUserId = account.providerAccountId || account.accountId || account.pageId;
      const token = account.accessToken;
      const content = target.customContent || masterPost.content;
      const mediaUrls = masterPost.mediaUrls || [];
      const mediaType = masterPost.mediaType;

      if (mediaUrls.length === 0) {
        throw new Error("Instagram requires at least one image or video to publish.");
      }

      // 1. Single Photo Post
      if (mediaUrls.length === 1 && mediaType !== "VIDEO" && mediaType !== "REEL") {
        const containerRes = await axios.post(`${GRAPH_API_BASE}/${igUserId}/media`, {
          image_url: mediaUrls[0],
          caption: content,
          access_token: token,
        });

        const creationId = containerRes.data.id;

        const publishRes = await axios.post(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
          creation_id: creationId,
          access_token: token,
        });

        const postId = publishRes.data.id;
        return {
          status: "PUBLISHED",
          platformPostId: postId,
          permalink: `https://instagram.com/p/${postId}`,
          rawResponse: publishRes.data,
        };
      }

      // 2. Video / Reel Post
      if (mediaType === "VIDEO" || mediaType === "REEL") {
        const containerRes = await axios.post(`${GRAPH_API_BASE}/${igUserId}/media`, {
          media_type: "REELS",
          video_url: mediaUrls[0],
          caption: content,
          share_to_feed: true,
          access_token: token,
        });

        const creationId = containerRes.data.id;

        // Poll container status
        let ready = false;
        for (let i = 0; i < 6; i++) {
          await new Promise((r) => setTimeout(r, 4000));
          const statusRes = await axios.get(`${GRAPH_API_BASE}/${creationId}`, {
            params: { fields: "status_code", access_token: token },
          });
          if (statusRes.data?.status_code === "FINISHED") {
            ready = true;
            break;
          }
        }

        if (!ready) {
          // Allow async publishing
          return {
            status: "PROCESSING",
            providerJobId: creationId,
            errorMessage: "Instagram is processing video container",
          };
        }

        const publishRes = await axios.post(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
          creation_id: creationId,
          access_token: token,
        });

        const postId = publishRes.data.id;
        return {
          status: "PUBLISHED",
          platformPostId: postId,
          permalink: `https://instagram.com/reel/${postId}`,
          rawResponse: publishRes.data,
        };
      }

      // 3. Carousel
      if (mediaUrls.length > 1) {
        const childIds: string[] = [];
        for (const url of mediaUrls) {
          const itemRes = await axios.post(`${GRAPH_API_BASE}/${igUserId}/media`, {
            image_url: url,
            is_carousel_item: true,
            access_token: token,
          });
          childIds.push(itemRes.data.id);
        }

        const carouselRes = await axios.post(`${GRAPH_API_BASE}/${igUserId}/media`, {
          media_type: "CAROUSEL",
          children: childIds.join(","),
          caption: content,
          access_token: token,
        });

        const publishRes = await axios.post(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
          creation_id: carouselRes.data.id,
          access_token: token,
        });

        const postId = publishRes.data.id;
        return {
          status: "PUBLISHED",
          platformPostId: postId,
          permalink: `https://instagram.com/p/${postId}`,
          rawResponse: publishRes.data,
        };
      }

      throw new Error("Unsupported media format for Instagram");
    } catch (error: any) {
      console.error("InstagramProvider error:", error.response?.data || error.message);
      return {
        status: "FAILED",
        failureCode: error.response?.data?.error?.code?.toString() || "IG_ERROR",
        errorMessage: error.response?.data?.error?.message || error.message || "Instagram publish failed",
        rawResponse: error.response?.data,
      };
    }
  }

  async getPostAnalytics(account: any, platformPostId: string): Promise<PostAnalytics> {
    try {
      const res = await axios.get(`${GRAPH_API_BASE}/${platformPostId}/insights`, {
        params: {
          metric: "impressions,reach,saved",
          access_token: account.accessToken,
        },
      });

      const metricsMap: Record<string, number> = {};
      res.data?.data?.forEach((m: any) => {
        metricsMap[m.name] = m.values?.[0]?.value || 0;
      });

      return {
        likes: 0,
        comments: 0,
        shares: 0,
        views: metricsMap.impressions || 0,
        platformSpecific: metricsMap,
      };
    } catch {
      return { likes: 0, comments: 0, shares: 0, views: 0 };
    }
  }
}
