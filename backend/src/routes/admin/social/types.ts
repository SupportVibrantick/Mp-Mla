export type SocialPlatform = "FACEBOOK" | "INSTAGRAM" | "TWITTER" | "YOUTUBE" | "LINKEDIN";

export type SocialMediaType = "TEXT_ONLY" | "IMAGE" | "CAROUSEL" | "VIDEO" | "REEL" | "STORY";

export type SocialPostStatus = "DRAFT" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "PARTIAL" | "FAILED";

export interface PublishTargetResult {
  platform: SocialPlatform;
  accountId: string;
  status: "PUBLISHED" | "FAILED";
  platformPostId?: string;
  permalink?: string;
  errorMessage?: string;
}

export interface PublishPostPayload {
  title?: string;
  content: string;
  mediaUrls?: string[];
  mediaType?: SocialMediaType;
  accountIds: string[]; // List of SocialAccount IDs to publish to
  scheduledAt?: string | null;
  customCaptions?: Record<string, string>; // accountId -> specific caption override
}
