export type SocialPlatform = "FACEBOOK" | "INSTAGRAM" | "TWITTER" | "YOUTUBE" | "LINKEDIN";

export interface UploadedMediaAsset {
  providerMediaId: string;
  url?: string;
  status: "READY" | "PROCESSING" | "FAILED";
}

export interface PublishResult {
  status: "PUBLISHED" | "PROCESSING" | "FAILED";
  platformPostId?: string;
  permalink?: string;
  errorMessage?: string;
  failureCode?: string;
  providerJobId?: string;
  rawResponse?: any;
}

export interface PostAnalytics {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  platformSpecific?: Record<string, any> | null;
  success?: boolean;
  error?: string;
}

export interface ISocialProvider {
  platform: SocialPlatform;
  validateConnection(account: any): Promise<boolean>;
  refreshToken?(account: any): Promise<{ accessToken: string; expiresAt?: Date }>;
  uploadMedia?(account: any, mediaUrl: string, mediaType: string): Promise<UploadedMediaAsset>;
  publishPost(account: any, target: any, masterPost: any): Promise<PublishResult>;
  checkProcessingStatus?(account: any, providerJobId: string): Promise<PublishResult>;
  deletePost?(account: any, platformPostId: string): Promise<void>;
  getPostAnalytics?(account: any, platformPostId: string): Promise<PostAnalytics>;
}
