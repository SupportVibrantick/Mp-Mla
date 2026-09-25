import { ISocialProvider } from "./types.js";
import { FacebookProvider } from "./meta/facebook.provider.js";
import { InstagramProvider } from "./meta/instagram.provider.js";
import { XProvider } from "./x/x.provider.js";
import { YouTubeProvider } from "./youtube/youtube.provider.js";
import { LinkedInProvider } from "./linkedin/linkedin.provider.js";

const providers: Record<string, ISocialProvider> = {
  FACEBOOK: new FacebookProvider(),
  INSTAGRAM: new InstagramProvider(),
  TWITTER: new XProvider(),
  YOUTUBE: new YouTubeProvider(),
  LINKEDIN: new LinkedInProvider(),
};

export function getProvider(platform: string): ISocialProvider {
  const provider = providers[platform];
  if (!provider) {
    throw new Error(`No social provider adapter registered for platform: ${platform}`);
  }
  return provider;
}

export * from "./types.js";
