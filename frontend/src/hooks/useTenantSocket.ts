import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { TokenStorage } from "../lib/auth";
import { API_BASE_URL } from "../lib/api";

const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export function useTenantSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasOnlineAdmins, setHasOnlineAdmins] = useState(false);

  useEffect(() => {
    const token = TokenStorage.getAccessToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      // Query initial presence
      socket.emit("get_presence", (res: any) => {
        if (res && typeof res.hasOnlineAdmins === "boolean") {
          setHasOnlineAdmins(res.hasOnlineAdmins);
        }
      });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("presence_change", (data: { hasOnlineAdmins: boolean }) => {
      setHasOnlineAdmins(data.hasOnlineAdmins);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Tenant Socket Error]:", err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit("join_conversation", { conversationId });
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit("leave_conversation", { conversationId });
  }, []);

  const emitTyping = useCallback((conversationId: string, isTyping: boolean) => {
    socketRef.current?.emit("typing", { conversationId, isTyping });
  }, []);

  const onNewMessage = useCallback((callback: (msg: any) => void) => {
    socketRef.current?.on("new_message", callback);
    return () => {
      socketRef.current?.off("new_message", callback);
    };
  }, []);

  const onUserTyping = useCallback((callback: (data: any) => void) => {
    socketRef.current?.on("user_typing", callback);
    return () => {
      socketRef.current?.off("user_typing", callback);
    };
  }, []);

  const onMessagesRead = useCallback((callback: (data: any) => void) => {
    socketRef.current?.on("messages_read", callback);
    return () => {
      socketRef.current?.off("messages_read", callback);
    };
  }, []);

  const onConversationStatusChanged = useCallback((callback: (data: any) => void) => {
    socketRef.current?.on("conversation_status_changed", callback);
    return () => {
      socketRef.current?.off("conversation_status_changed", callback);
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    hasOnlineAdmins,
    joinConversation,
    leaveConversation,
    emitTyping,
    onNewMessage,
    onUserTyping,
    onMessagesRead,
    onConversationStatusChanged,
  };
}
