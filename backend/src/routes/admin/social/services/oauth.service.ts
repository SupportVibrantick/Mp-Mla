import crypto from "crypto";
import axios from "axios";
import { prisma } from "../../../../lib/prisma.js";
import { encryptToken, decryptToken } from "./token.service.js";

// Global Developer App Configuration
const META_APP_ID = process.env.META_CLIENT_ID || process.env.META_APP_ID;
const META_APP_SECRET =
  process.env.META_CLIENT_SECRET || process.env.META_APP_SECRET;
const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || "v19.0";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const X_CLIENT_ID = process.env.X_CLIENT_ID;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET;

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export interface DiscoveredResource {
  id: string; // provider specific ID
  name: string;
  username?: string;
  avatarUrl?: string;
  type: "PAGE" | "INSTAGRAM_ACCOUNT" | "CHANNEL" | "USER" | "ORGANIZATION";
  platform: "FACEBOOK" | "INSTAGRAM" | "TWITTER" | "YOUTUBE" | "LINKEDIN";
  followersCount?: number;
  accessToken?: string; // e.g. Page specific token
}

/**
 * 1. Generates OAuth authorization redirect URL and stores CSRF state hash
 */
export async function startOAuthFlow(
  provider: string,
  tenantId: string,
  userId: string,
  customRedirectUri?: string,
): Promise<{ authUrl: string; state: string }> {
  const normalizedPlatform =
    provider.toUpperCase() === "META" ? "FACEBOOK" : provider.toUpperCase();
  const rawState = crypto.randomBytes(32).toString("hex");
  const stateHash = crypto.createHash("sha256").update(rawState).digest("hex");

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity
  const callbackUrl = `${API_BASE_URL}/api/admin/social/oauth/${provider.toLowerCase()}/callback`;

  // PKCE Code Verifier & Challenge for Twitter/X
  let codeVerifier: string | undefined = undefined;
  let codeChallenge: string | undefined = undefined;

  if (normalizedPlatform === "TWITTER") {
    codeVerifier = crypto.randomBytes(64).toString("base64url");
    codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
  }

  // Store in DB for state validation
  await (prisma as any).socialOAuthState.create({
    data: {
      tenantId,
      userId,
      platform: normalizedPlatform,
      stateHash,
      codeVerifier,
      redirectUri: customRedirectUri || callbackUrl,
      expiresAt,
    },
  });

  let authUrl = "";

  switch (normalizedPlatform) {
    case "FACEBOOK": {
      if (!META_APP_ID) {
        throw new Error(
          "Facebook/Meta App ID is not configured. Please add META_CLIENT_ID and META_CLIENT_SECRET in backend/.env from your Meta for Developers App (https://developers.facebook.com/).",
        );
      }

      const fbConfigId =
        process.env.META_FACEBOOK_CONFIG_ID || process.env.META_CONFIG_ID;

      if (fbConfigId) {
        // Facebook Login for Business with Configuration ID (Permissions attached to configuration)
        const params = new URLSearchParams({
          client_id: META_APP_ID,
          redirect_uri: callbackUrl,
          state: rawState,
          config_id: fbConfigId,
          response_type: "code",
        });
        authUrl = `https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
      } else {
        // Standard Scope-based OAuth
        const defaultFbScopes = [
          "public_profile",
          "pages_show_list",
          "pages_read_engagement",
          "pages_read_user_content",
          "pages_manage_posts",
        ];

        const scopes = (
          process.env.FACEBOOK_SCOPES || defaultFbScopes.join(",")
        )
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .join(",");

        authUrl = `https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(
          callbackUrl,
        )}&state=${rawState}&scope=${encodeURIComponent(scopes)}&response_type=code`;
      }
      break;
    }

    case "INSTAGRAM": {
      if (!META_APP_ID) {
        throw new Error(
          "Instagram/Meta App ID is not configured. Please add META_CLIENT_ID and META_CLIENT_SECRET in backend/.env from your Meta for Developers App (https://developers.facebook.com/).",
        );
      }

      const igConfigId =
        process.env.META_INSTAGRAM_CONFIG_ID ||
        process.env.META_FACEBOOK_CONFIG_ID ||
        process.env.META_CONFIG_ID;

      if (igConfigId) {
        // Facebook Login for Business with Configuration ID (Permissions attached to configuration)
        const params = new URLSearchParams({
          client_id: META_APP_ID,
          redirect_uri: callbackUrl,
          state: rawState,
          config_id: igConfigId,
          response_type: "code",
        });
        authUrl = `https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
      } else {
        // Standard Scope-based OAuth
        const defaultIgScopes = [
          "pages_show_list",
          "pages_read_engagement",
          "pages_read_user_content",
          "instagram_basic",
          "instagram_content_publish",
          "instagram_manage_comments",
        ];

        const scopes = (
          process.env.INSTAGRAM_SCOPES || defaultIgScopes.join(",")
        )
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .join(",");

        authUrl = `https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(
          callbackUrl,
        )}&state=${rawState}&scope=${encodeURIComponent(scopes)}&response_type=code`;
      }
      break;
    }

    case "YOUTUBE": {
      if (!GOOGLE_CLIENT_ID) {
        throw new Error(
          "Google Client ID is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env from Google Cloud Console (https://console.cloud.google.com/).",
        );
      }

      // Google OAuth: YouTube Upload & Analytics
      const scopes = [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/userinfo.profile",
      ].join(" ");

      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        callbackUrl,
      )}&state=${rawState}&scope=${encodeURIComponent(
        scopes,
      )}&response_type=code&access_type=offline&prompt=consent`;
      break;
    }

    case "TWITTER": {
      if (!X_CLIENT_ID) {
        throw new Error(
          "X Client ID is not configured. Please add X_CLIENT_ID and X_CLIENT_SECRET in backend/.env from X Developer Portal (https://developer.x.com/).",
        );
      }

      // X OAuth 2.0 PKCE with tweet.read, tweet.write, users.read, offline.access, media.write
      const scopes = [
        "tweet.read",
        "tweet.write",
        "users.read",
        "offline.access",
        "media.write",
      ].join(" ");

      const params = new URLSearchParams({
        response_type: "code",
        client_id: X_CLIENT_ID,
        redirect_uri: callbackUrl,
        scope: scopes,
        state: rawState,
        code_challenge: codeChallenge || "",
        code_challenge_method: "S256",
      });

      authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
      break;
    }

    case "LINKEDIN": {
      if (!LINKEDIN_CLIENT_ID) {
        throw new Error(
          "LinkedIn Client ID is not configured. Please add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in backend/.env from LinkedIn Developer Portal (https://www.linkedin.com/developers/).",
        );
      }
      // LinkedIn 3-Legged OAuth (OpenID Connect + Social Posting)
      const scopes = [
        "openid",
        "profile",
        "email",
        "w_member_social",
      ].join(" ");
      authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        callbackUrl,
      )}&state=${rawState}&scope=${encodeURIComponent(scopes)}`;
      break;
    }

    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  return { authUrl, state: rawState };
}

/**
 * 2. Validates CSRF state and exchanges code for long-lived credentials & discovers accounts
 */
export async function handleOAuthCallback(
  provider: string,
  code: string,
  state: string,
): Promise<{ connectionId: string; resources: DiscoveredResource[] }> {
  const stateHash = crypto.createHash("sha256").update(state).digest("hex");

  // Validate state
  const oauthState = await (prisma as any).socialOAuthState.findFirst({
    where: { stateHash },
  });

  if (!oauthState) {
    throw new Error(
      "Invalid or expired OAuth state token (Possible CSRF attack blocked)",
    );
  }

  if (oauthState.usedAt) {
    throw new Error(
      "OAuth state has already been consumed (Replay attack blocked)",
    );
  }

  if (new Date() > oauthState.expiresAt) {
    throw new Error("OAuth authorization session expired. Please start again.");
  }

  // Mark state as consumed
  await (prisma as any).socialOAuthState.update({
    where: { id: oauthState.id },
    data: { usedAt: new Date() },
  });

  const {
    tenantId,
    userId,
    platform: normalizedPlatform,
    redirectUri,
  } = oauthState;
  const callbackUrl =
    redirectUri ||
    `${API_BASE_URL}/api/admin/social/oauth/${provider.toLowerCase()}/callback`;

  let accessToken = "";
  let refreshToken: string | null = null;
  let tokenExpiresAt: Date | null = null;
  let providerUserId = "";
  let providerUserName = "";
  let discoveredResources: DiscoveredResource[] = [];

  // Exchange Code based on Provider
  if (normalizedPlatform === "FACEBOOK" || normalizedPlatform === "INSTAGRAM") {
    if (!META_APP_ID || !META_APP_SECRET) {
      throw new Error(
        "Meta OAuth credentials (META_CLIENT_ID & META_CLIENT_SECRET) are not configured.",
      );
    }

    // 1. Exchange code for User Access Token (NO MOCK FALLBACK)
    let shortLivedToken = "";
    try {
      const tokenRes = await axios.get(
        `https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token`,
        {
          params: {
            client_id: META_APP_ID,
            client_secret: META_APP_SECRET,
            redirect_uri: callbackUrl,
            code,
          },
        },
      );
      shortLivedToken = tokenRes.data.access_token;
    } catch (tokenErr: any) {
      console.error(
        "Meta token exchange error:",
        tokenErr.response?.data || tokenErr.message,
      );
      throw new Error(
        `Meta authorization exchange failed: ${tokenErr.response?.data?.error?.message || tokenErr.message}`,
      );
    }

    // 2. Exchange for 60-day Long-Lived Token
    let longLivedToken = shortLivedToken;
    try {
      const longRes = await axios.get(
        `https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token`,
        {
          params: {
            grant_type: "fb_exchange_token",
            client_id: META_APP_ID,
            client_secret: META_APP_SECRET,
            fb_exchange_token: shortLivedToken,
          },
        },
      );
      if (longRes.data?.access_token) {
        longLivedToken = longRes.data.access_token;
      }
    } catch (longErr: any) {
      console.warn(
        "Could not upgrade to long-lived token, using standard token:",
        longErr.message,
      );
    }

    accessToken = longLivedToken;
    tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

    // 3. Discover Real Accounts according to specific provider requested (NO FAKE DISCOVERY)
    try {
      // ============================================================
      // META DEBUG: CURRENT AUTHENTICATED USER
      // ============================================================
      const meRes = await axios.get(
        `https://graph.facebook.com/${META_GRAPH_API_VERSION}/me`,
        {
          params: {
            fields: "id,name",
            access_token: accessToken,
          },
        },
      );

      console.log("\n========== META /me ==========");
      console.log(JSON.stringify(meRes.data, null, 2));
      console.log("================================\n");

      providerUserId = meRes.data.id;
      providerUserName = meRes.data.name;

      // ============================================================
      // META DEBUG: GRANTED PERMISSIONS
      // ============================================================
      const permissionsRes = await axios.get(
        `https://graph.facebook.com/${META_GRAPH_API_VERSION}/me/permissions`,
        {
          params: {
            access_token: accessToken,
          },
        },
      );

      console.log("\n====== META /me/permissions ======");
      console.log(JSON.stringify(permissionsRes.data, null, 2));
      console.log("===================================\n");

      // ============================================================
      // META: DISCOVER FACEBOOK PAGES
      // ============================================================
      const pagesRes = await axios.get(
        `https://graph.facebook.com/${META_GRAPH_API_VERSION}/me/accounts`,
        {
          params: {
            fields: "id,name,category,access_token,tasks",
            access_token: accessToken,
          },
        },
      );

      console.log("\n========= META /me/accounts =========");
      console.log(JSON.stringify(pagesRes.data, null, 2));
      console.log("======================================\n");

      const pages = pagesRes.data?.data || [];

      console.log("META PAGE COUNT:", pages.length);
      for (const page of pages) {
        // If connecting Facebook: include Facebook Page
        if (normalizedPlatform === "FACEBOOK") {
          discoveredResources.push({
            id: page.id,
            name: page.name,
            type: "PAGE",
            platform: "FACEBOOK",
            followersCount: page.followers_count,
            accessToken: page.access_token, // Page-scoped token
          });
        }

        // If connecting Instagram: include linked Instagram Professional account
        if (normalizedPlatform === "INSTAGRAM") {
          if (page.instagram_business_account) {
            const ig = page.instagram_business_account;
            discoveredResources.push({
              id: ig.id,
              name: ig.username
                ? `@${ig.username}`
                : `${page.name} (Instagram)`,
              username: ig.username ? `@${ig.username}` : undefined,
              avatarUrl: ig.profile_picture_url,
              type: "INSTAGRAM_ACCOUNT",
              platform: "INSTAGRAM",
              followersCount: ig.followers_count,
              accessToken: page.access_token, // Uses page-level token for IG Graph API
            });
          }
        }
      }

      if (discoveredResources.length === 0) {
        if (normalizedPlatform === "FACEBOOK") {
          throw new Error(
            "No Facebook Pages found. Please ensure your Meta user manages at least one Facebook Page and granted permission.",
          );
        } else {
          throw new Error(
            "No linked Instagram Professional accounts found. Please ensure your Instagram account is Professional/Creator and linked to a Facebook Page.",
          );
        }
      }
    } catch (discErr: any) {
      console.error(
        "Meta resource discovery failed:",
        discErr.response?.data || discErr.message,
      );
      throw new Error(
        discErr.message || "Failed to retrieve social accounts from Meta.",
      );
    }
  } else if (normalizedPlatform === "YOUTUBE") {
    // Google Token Exchange (NO MOCK FALLBACK)
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error("Google OAuth credentials are not configured.");
    }

    try {
      const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl,
      });
      accessToken = tokenRes.data.access_token;
      refreshToken = tokenRes.data.refresh_token || null;
      if (tokenRes.data.expires_in) {
        tokenExpiresAt = new Date(Date.now() + tokenRes.data.expires_in * 1000);
      }

      const channelRes = await axios.get(
        "https://www.googleapis.com/youtube/v3/channels",
        {
          params: { part: "snippet,statistics", mine: true },
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      const channel = channelRes.data?.items?.[0];
      if (!channel) {
        throw new Error("No YouTube channel found for this Google account.");
      }

      providerUserId = channel.id;
      providerUserName = channel.snippet?.title || "Official YouTube Channel";
      discoveredResources.push({
        id: channel.id,
        name: channel.snippet?.title || "Official Channel",
        avatarUrl: channel.snippet?.thumbnails?.default?.url,
        type: "CHANNEL",
        platform: "YOUTUBE",
        followersCount: parseInt(
          channel.statistics?.subscriberCount || "0",
          10,
        ),
      });
    } catch (ytErr: any) {
      console.error(
        "YouTube OAuth error:",
        ytErr.response?.data || ytErr.message,
      );
      throw new Error(
        ytErr.response?.data?.error_description ||
          ytErr.message ||
          "Failed to exchange Google OAuth code.",
      );
    }
  } else if (normalizedPlatform === "TWITTER") {
    // X (Twitter) OAuth 2.0 PKCE Token Exchange
    if (!X_CLIENT_ID) {
      throw new Error("X Client ID is not configured.");
    }

    try {
      const tokenParams = new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: X_CLIENT_ID,
        redirect_uri: callbackUrl,
        code_verifier: oauthState.codeVerifier || "",
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };

      if (X_CLIENT_SECRET) {
        const credentials = Buffer.from(
          `${X_CLIENT_ID}:${X_CLIENT_SECRET}`
        ).toString("base64");
        headers["Authorization"] = `Basic ${credentials}`;
      }

      const tokenRes = await axios.post(
        "https://api.twitter.com/2/oauth2/token",
        tokenParams.toString(),
        { headers }
      );

      accessToken = tokenRes.data.access_token;
      refreshToken = tokenRes.data.refresh_token || null;
      if (tokenRes.data.expires_in) {
        tokenExpiresAt = new Date(Date.now() + tokenRes.data.expires_in * 1000);
      }

      // Fetch user profile from X API v2
      const userRes = await axios.get("https://api.twitter.com/2/users/me", {
        params: {
          "user.fields": "profile_image_url,name,username",
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const user = userRes.data?.data;
      if (!user) {
        throw new Error("Failed to retrieve Twitter/X user profile.");
      }

      providerUserId = user.id;
      providerUserName = user.name || `@${user.username}`;

      discoveredResources.push({
        id: user.id,
        name: user.name || `@${user.username}`,
        username: user.username ? `@${user.username}` : undefined,
        avatarUrl: user.profile_image_url,
        type: "PROFILE",
        platform: "TWITTER",
        accessToken,
      });
    } catch (xErr: any) {
      console.error(
        "Twitter/X OAuth error:",
        xErr.response?.data || xErr.message
      );
      throw new Error(
        xErr.response?.data?.error_description ||
          xErr.response?.data?.detail ||
          xErr.message ||
          "Failed to exchange Twitter/X OAuth code."
      );
    }
  } else if (normalizedPlatform === "LINKEDIN") {
    // LinkedIn Token Exchange
    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      throw new Error("LinkedIn OAuth credentials are not configured.");
    }

    try {
      const tokenParams = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      });

      const tokenRes = await axios.post(
        "https://www.linkedin.com/oauth/v2/accessToken",
        tokenParams.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      accessToken = tokenRes.data.access_token;
      if (tokenRes.data.refresh_token) {
        refreshToken = tokenRes.data.refresh_token;
      }
      if (tokenRes.data.expires_in) {
        tokenExpiresAt = new Date(Date.now() + tokenRes.data.expires_in * 1000);
      }

      // Fetch user profile using OpenID /userinfo endpoint
      const userRes = await axios.get("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const profile = userRes.data;
      providerUserId = profile.sub;
      providerUserName =
        profile.name ||
        `${profile.given_name || ""} ${profile.family_name || ""}`.trim() ||
        "LinkedIn Member";

      discoveredResources.push({
        id: profile.sub,
        name: providerUserName,
        username: profile.email || undefined,
        avatarUrl: profile.picture,
        type: "PROFILE",
        platform: "LINKEDIN",
        accessToken,
      });
    } catch (liErr: any) {
      console.error(
        "LinkedIn OAuth error:",
        liErr.response?.data || liErr.message
      );
      throw new Error(
        liErr.response?.data?.error_description ||
          liErr.message ||
          "Failed to exchange LinkedIn OAuth code."
      );
    }
  }

  // Encrypt tokens via AES-256-GCM Vault
  const encAccess = encryptToken(accessToken);
  const encRefresh = refreshToken ? encryptToken(refreshToken) : null;

  // Create or Update SocialOAuthConnection
  const connection = await (prisma as any).socialOAuthConnection.create({
    data: {
      tenantId,
      platform: normalizedPlatform,
      providerUserId: providerUserId || `user_${Date.now()}`,
      providerUserName: providerUserName || provider,
      encryptedAccessToken: encAccess.ciphertext,
      accessTokenIv: encAccess.iv,
      accessTokenAuthTag: encAccess.authTag,
      encryptedRefreshToken: encRefresh ? encRefresh.ciphertext : null,
      refreshTokenIv: encRefresh ? encRefresh.iv : null,
      refreshTokenAuthTag: encRefresh ? encRefresh.authTag : null,
      tokenExpiresAt,
      status: "CONNECTED",
      lastHealthCheckAt: new Date(),
      createdById: userId,
      metadata: {
        discoveredCount: discoveredResources.length,
        resources: discoveredResources,
      },
    },
  });

  // Record audit log
  await (prisma as any).socialAuditLog.create({
    data: {
      tenantId,
      userId,
      action: "ACCOUNT_CONNECTED_OAUTH",
      entityType: "SocialOAuthConnection",
      entityId: connection.id,
      details: {
        platform: normalizedPlatform,
        discoveredCount: discoveredResources.length,
      },
    },
  });

  return {
    connectionId: connection.id,
    resources: discoveredResources,
  };
}

/**
 * 3. Saves selected discovered resources into SocialAccount
 */
export async function selectDiscoveredResources(
  connectionId: string,
  tenantId: string,
  selectedResourceIds: string[],
) {
  const connection = await (prisma as any).socialOAuthConnection.findFirst({
    where: { id: connectionId, tenantId },
  });

  if (!connection) {
    throw new Error("OAuth connection not found");
  }

  const allResources: DiscoveredResource[] =
    connection.metadata?.resources || [];
  const chosen = allResources.filter((r) => selectedResourceIds.includes(r.id));

  if (chosen.length === 0) {
    throw new Error("No matching discovered resources found");
  }

  const createdAccounts = [];

  for (const item of chosen) {
    // Determine token to use: Page token (if present) or connection master token
    const tokenToStore = item.accessToken
      ? encryptToken(item.accessToken)
      : {
          ciphertext: connection.encryptedAccessToken,
          iv: connection.accessTokenIv,
          authTag: connection.accessTokenAuthTag,
          keyVersion: "v1",
        };

    const account = await (prisma as any).socialAccount.upsert({
      where: {
        tenantId_platform_providerAccountId: {
          tenantId,
          platform: item.platform,
          providerAccountId: item.id,
        },
      },
      update: {
        accountName: item.name,
        accountUsername: item.username || item.name,
        avatarUrl: item.avatarUrl || null,
        accessToken: tokenToStore.ciphertext,
        iv: tokenToStore.iv,
        authTag: tokenToStore.authTag,
        pageId: item.type === "PAGE" ? item.id : null,
        oauthConnectionId: connection.id,
        status: "CONNECTED",
        isActive: true,
        lastHealthCheckAt: new Date(),
        metadata: {
          followersCount: item.followersCount ?? null,
          type: item.type,
        },
      },
      create: {
        tenantId,
        platform: item.platform,
        providerAccountId: item.id,
        providerAccountType: item.type,
        pageId: item.type === "PAGE" ? item.id : null,
        accountName: item.name,
        accountUsername: item.username || item.name,
        avatarUrl: item.avatarUrl || null,
        accessToken: tokenToStore.ciphertext,
        iv: tokenToStore.iv,
        authTag: tokenToStore.authTag,
        oauthConnectionId: connection.id,
        status: "CONNECTED",
        isActive: true,
        lastHealthCheckAt: new Date(),
        metadata: {
          followersCount: item.followersCount ?? null,
          type: item.type,
        },
      },
    });

    createdAccounts.push(account);
  }

  return createdAccounts;
}
