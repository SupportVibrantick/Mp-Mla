import { Server as HttpServer } from "node:http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyAccessToken } from "../lib/jwt.js";
import prisma from "../lib/prisma.js";
import logger from "../utils/logger.js";

let io: SocketIOServer | null = null;

// Track online presence
// Map<tenantId, Set<socketId>>
const onlineTenants = new Map<string, Set<string>>();
// Set<socketId> for online platform admins
const onlineAdmins = new Set<string>();

export interface SocketUserPayload {
  userId: string;
  name?: string;
  role?: string;
  accountType?: string;
  tenantId?: string;
  isPlatform: boolean;
}

declare module "socket.io" {
  interface Socket {
    user?: SocketUserPayload;
  }
}

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: (origin, callback) => {
        // Allow connections from anywhere in dev, or known origins
        callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    pingTimeout: 30000,
    pingInterval: 15000,
  });

  // Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const rawToken =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization
          ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, "")
          : null) ||
        socket.handshake.query?.token;

      if (!rawToken || typeof rawToken !== "string") {
        return next(new Error("Authentication token required"));
      }

      const decoded: any = verifyAccessToken(rawToken);
      const userId = decoded?.id || decoded?.userId;
      if (!decoded || !userId) {
        return next(new Error("Invalid token payload"));
      }

      if (decoded.accountType === "platform") {
        // Fetch platform user name/role
        const platformUser = await prisma.platformUser.findUnique({
          where: { id: userId },
          select: { id: true, name: true, role: true, avatarUrl: true },
        });

        socket.user = {
          userId,
          name: platformUser?.name || "Platform Support",
          role: platformUser?.role || "SUPER_ADMIN",
          accountType: "platform",
          isPlatform: true,
        };
      } else {
        // Tenant user
        const tenantUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, role: true, avatarUrl: true, tenantId: true },
        });

        const tenantId = decoded.tenantId || tenantUser?.tenantId;
        if (!tenantId) {
          return next(new Error("Tenant ID not found in token"));
        }

        socket.user = {
          userId,
          name: tenantUser?.name || "Constituency User",
          role: tenantUser?.role || "MLA_MP",
          accountType: "tenant",
          tenantId,
          isPlatform: false,
        };
      }

      next();
    } catch (err: any) {
      logger.warn(`[Socket Auth] Failed: ${err.message}`);
      next(new Error("Authentication failed: " + err.message));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    logger.info(
      `[Socket Connected] User ${user.userId} (${user.isPlatform ? "Platform Admin" : `Tenant: ${user.tenantId}`}) socket=${socket.id}`,
    );

    // Join general user room
    socket.join(`user:${user.userId}`);

    if (user.isPlatform) {
      // Super Admin / Support Staff room
      socket.join("platform:admins");
      onlineAdmins.add(socket.id);
      // Notify tenants that support is online
      io?.emit("presence_change", {
        hasOnlineAdmins: onlineAdmins.size > 0,
      });
    } else if (user.tenantId) {
      // Tenant Room
      const tenantRoom = `tenant:${user.tenantId}`;
      socket.join(tenantRoom);

      if (!onlineTenants.has(user.tenantId)) {
        onlineTenants.set(user.tenantId, new Set());
      }
      onlineTenants.get(user.tenantId)?.add(socket.id);

      // Notify platform admins that this tenant is online
      io?.to("platform:admins").emit("tenant_presence", {
        tenantId: user.tenantId,
        isOnline: true,
      });
    }

    // Client requests presence status
    socket.on("get_presence", (callback) => {
      if (typeof callback === "function") {
        callback({
          hasOnlineAdmins: onlineAdmins.size > 0,
          onlineTenantCount: onlineTenants.size,
        });
      }
    });

    // Join specific support conversation room
    socket.on("join_conversation", async ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return;

      // Verify permission to join
      if (!user.isPlatform && user.tenantId) {
        const conv = await prisma.supportConversation.findUnique({
          where: { id: conversationId },
          select: { tenantId: true },
        });
        if (!conv || conv.tenantId !== user.tenantId) {
          socket.emit("error", { message: "Unauthorized to join this conversation" });
          return;
        }
      }

      socket.join(`conversation:${conversationId}`);
      logger.info(`[Socket Room] ${user.name} joined conversation:${conversationId}`);
    });

    // Leave conversation room
    socket.on("leave_conversation", ({ conversationId }: { conversationId: string }) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    // Typing indicator
    socket.on("typing", ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("user_typing", {
        conversationId,
        userId: user.userId,
        userName: user.name,
        role: user.role,
        isPlatform: user.isPlatform,
        isTyping,
      });
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      if (user.isPlatform) {
        onlineAdmins.delete(socket.id);
        if (onlineAdmins.size === 0) {
          io?.emit("presence_change", { hasOnlineAdmins: false });
        }
      } else if (user.tenantId) {
        const tenantSockets = onlineTenants.get(user.tenantId);
        if (tenantSockets) {
          tenantSockets.delete(socket.id);
          if (tenantSockets.size === 0) {
            onlineTenants.delete(user.tenantId);
            io?.to("platform:admins").emit("tenant_presence", {
              tenantId: user.tenantId,
              isOnline: false,
            });
          }
        }
      }
      logger.info(`[Socket Disconnected] User ${user.userId} socket=${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO server has not been initialized");
  }
  return io;
}

export function emitToConversation(conversationId: string, event: string, data: any): void {
  if (io) {
    io.to(`conversation:${conversationId}`).emit(event, data);
  }
}

export function emitToTenant(tenantId: string, event: string, data: any): void {
  if (io) {
    io.to(`tenant:${tenantId}`).emit(event, data);
  }
}

export function emitToPlatform(event: string, data: any): void {
  if (io) {
    io.to("platform:admins").emit(event, data);
  }
}

export function isTenantOnline(tenantId: string): boolean {
  return onlineTenants.has(tenantId) && (onlineTenants.get(tenantId)?.size || 0) > 0;
}

export function isAnyAdminOnline(): boolean {
  return onlineAdmins.size > 0;
}
