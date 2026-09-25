import axios from "axios";
import { ISocialProvider, PublishResult, PostAnalytics } from "../types.js";

export class XProvider implements ISocialProvider {
  platform = "TWITTER" as const;

  async validateConnection(account: any): Promise<boolean> {
    try {
      const res = await axios.get("https://api.twitter.com/2/users/me", {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
        },
      });
      return !!res.data?.data?.id;
    } catch {
      return false;
    }
  }

  async publishPost(account: any, target: any, masterPost: any): Promise<PublishResult> {
    try {
      const content = target.customContent || masterPost.content;
      if (content.length > 280) {
        throw new Error(`X/Twitter character limit exceeded (${content.length}/280 chars). Please shorten your post or customize the X caption.`);
      }

      const payload: any = {
        text: content,
      };

      const res = await axios.post("https://api.twitter.com/2/tweets", payload, {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const tweetId = res.data?.data?.id;
      return {
        status: "PUBLISHED",
        platformPostId: tweetId,
        permalink: `https://twitter.com/i/web/status/${tweetId}`,
        rawResponse: res.data,
      };
    } catch (error: any) {
      console.error("XProvider error:", error.response?.data || error.message);
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      const title = error.response?.data?.title;
      
      let message = detail || error.message || "X/Twitter publish failed";
      if (status === 402 || detail === "credits depleted" || title === "Payment Required") {
        message = "X/Twitter API Credits Depleted (402 Payment Required). Your X Developer App free tier write credits have been exhausted or billing is required on the X Developer Portal (https://developer.x.com).";
      } else if (status === 403) {
        message = "X/Twitter 403 Forbidden: Insufficient app permissions. Ensure your X Developer App has 'Read and Write' permissions enabled in User authentication settings.";
      } else if (status === 429) {
        message = "X/Twitter Rate Limit Exceeded (429). Please wait before posting again.";
      }

      return {
        status: "FAILED",
        failureCode: status?.toString() || "X_ERROR",
        errorMessage: message,
        rawResponse: error.response?.data,
      };
    }
  }

  async getPostAnalytics(account: any, platformPostId: string): Promise<PostAnalytics> {
    try {
      const res = await axios.get(`https://api.twitter.com/2/tweets/${platformPostId}`, {
        params: {
          "tweet.fields": "public_metrics",
        },
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
        },
      });

      const metrics = res.data?.data?.public_metrics || {};
      return {
        likes: metrics.like_count || 0,
        comments: metrics.reply_count || 0,
        shares: metrics.retweet_count || 0,
        views: metrics.impression_count || 0,
        platformSpecific: metrics,
      };
    } catch {
      return { likes: 0, comments: 0, shares: 0, views: 0 };
    }
  }
}
