import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  X,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Headphones,
  Sparkles,
  HelpCircle,
  FileText,
  CheckCircle2,
  Minimize2,
  Maximize2,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { tenantSupportApi } from "@/lib/api";
import { useTenantSocket } from "@/hooks/useTenantSocket";
import { getFileUrl } from "@/lib/utils";

interface SupportMessage {
  id: string;
  conversationId: string;
  senderType: "TENANT_USER" | "SUPER_ADMIN" | "SYSTEM";
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: string;
  message: string;
  attachments?: any;
  isRead: boolean;
  createdAt: string;
}

interface SupportConversation {
  id: string;
  tenantId: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  category: "TECHNICAL" | "BILLING" | "FEATURE_REQUEST" | "BUG_REPORT" | "GENERAL";
  subject: string;
  unreadCountTenant: number;
  assignedPlatformUser?: {
    id: string;
    name: string;
    role: string;
  };
  messages?: SupportMessage[];
}

const TOPIC_SUGGESTIONS = [
  "DNS & Custom Domain Setup",
  "Voter List Import / Export",
  "Billing or Subscription Query",
  "Report a Bug / Platform Issue",
];

export function TenantLiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminTyping, setAdminTyping] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const {
    isConnected,
    hasOnlineAdmins,
    joinConversation,
    leaveConversation,
    emitTyping,
    onNewMessage,
    onUserTyping,
    onMessagesRead,
    onConversationStatusChanged,
  } = useTenantSocket();

  // Play subtle sound on incoming message
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {
      // Audio not permitted without interaction
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch or create active conversation
  const fetchActiveChat = async () => {
    try {
      setLoading(true);
      const res = await tenantSupportApi.getActive();
      if (res.data?.success) {
        const conv = res.data.data;
        setConversation(conv);
        setMessages(conv.messages || []);
        setUnreadCount(conv.unreadCountTenant || 0);
      }
    } catch (err) {
      console.error("Failed to load active support chat:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveChat();
  }, []);

  // When conversation is loaded, join its socket room
  useEffect(() => {
    if (!conversation?.id) return;

    joinConversation(conversation.id);

    if (isOpen) {
      tenantSupportApi.markAsRead(conversation.id).catch(() => {});
      setUnreadCount(0);
    }

    return () => {
      leaveConversation(conversation.id);
    };
  }, [conversation?.id, isOpen, joinConversation, leaveConversation]);

  // Auto scroll
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, adminTyping]);

  // Real-time socket events
  useEffect(() => {
    const unsubMsg = onNewMessage((msg: SupportMessage) => {
      if (conversation && msg.conversationId === conversation.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        if (msg.senderType === "SUPER_ADMIN") {
          playNotificationSound();
          if (isOpen) {
            tenantSupportApi.markAsRead(conversation.id).catch(() => {});
          } else {
            setUnreadCount((c) => c + 1);
          }
        }
      }
    });

    const unsubTyping = onUserTyping((data: any) => {
      if (conversation && data.conversationId === conversation.id && data.isPlatform) {
        setAdminTyping(data.isTyping ? data.userName || "Super Admin" : null);
      }
    });

    const unsubRead = onMessagesRead((data: any) => {
      if (conversation && data.conversationId === conversation.id && data.readBy === "admin") {
        setMessages((prev) =>
          prev.map((m) => (m.senderType === "TENANT_USER" ? { ...m, isRead: true } : m)),
        );
      }
    });

    const unsubStatus = onConversationStatusChanged((data: any) => {
      if (conversation && data.conversationId === conversation.id) {
        setConversation((prev) => (prev ? { ...prev, status: data.status } : null));
      }
    });

    return () => {
      unsubMsg();
      unsubTyping();
      unsubRead();
      unsubStatus();
    };
  }, [conversation, isOpen, onNewMessage, onUserTyping, onMessagesRead, onConversationStatusChanged]);

  // Handle typing input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (!conversation?.id) return;

    emitTyping(conversation.id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(conversation.id, false);
    }, 1500);
  };

  // Send message
  const handleSendMessage = async (textToSend?: string, attachments?: any[]) => {
    const text = textToSend !== undefined ? textToSend : inputMessage;
    if ((!text || !text.trim()) && (!attachments || attachments.length === 0)) return;
    if (!conversation?.id) return;

    try {
      setSending(true);
      emitTyping(conversation.id, false);
      const res = await tenantSupportApi.sendMessage(conversation.id, {
        message: text.trim(),
        attachments: attachments || undefined,
      });

      if (res.data?.success) {
        setInputMessage("");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  // Upload file / screenshot
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversation?.id) return;

    try {
      setUploading(true);
      const res = await tenantSupportApi.uploadAttachment(file);
      if (res.data?.success) {
        const attachment = res.data.data;
        await handleSendMessage("", [attachment]);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload screenshot or file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Mark resolved
  const handleResolve = async () => {
    if (!conversation?.id) return;
    try {
      const res = await tenantSupportApi.resolveConversation(conversation.id);
      if (res.data?.success) {
        setConversation((prev) => (prev ? { ...prev, status: "RESOLVED" } : null));
      }
    } catch (err) {
      console.error("Failed to resolve:", err);
    }
  };

  return (
    <>
      {/* ─── Floating Launcher Button (Bottom Right) ───────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        {!isOpen && unreadCount > 0 && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border shadow-lg text-xs font-semibold animate-bounce">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span>Support reply received</span>
          </div>
        )}

        <Button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen && conversation?.id) {
              tenantSupportApi.markAsRead(conversation.id).catch(() => {});
              setUnreadCount(0);
            }
          }}
          className="relative h-14 w-14 rounded-full shadow-2xl p-0 bg-primary hover:bg-primary/95 text-primary-foreground border-2 border-background transition-transform active:scale-95"
          title="Constituency Live Support"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <Headphones className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white shadow-md animate-pulse">
                  {unreadCount}
                </span>
              )}
              {hasOnlineAdmins && unreadCount === 0 && (
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
              )}
            </>
          )}
        </Button>
      </div>

      {/* ─── Intercom/Crisp-Style Live Support Drawer ────────────── */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[95vw] sm:w-[420px] h-[580px] max-h-[85vh] flex flex-col bg-card border border-border/80 rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-10 h-10 rounded-2xl border-2 border-white/20 bg-white/10">
                  <AvatarFallback className="text-white font-bold text-sm bg-transparent">
                    <Headphones className="w-5 h-5 text-white" />
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-primary ${
                    hasOnlineAdmins ? "bg-emerald-400" : "bg-white/50"
                  }`}
                />
              </div>

              <div>
                <h3 className="font-bold text-sm leading-tight text-white flex items-center gap-1.5">
                  Priority Support Desk
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-white/20 text-white border-none font-semibold">
                    Super Admin
                  </Badge>
                </h3>
                <p className="text-[11px] text-white/80">
                  {hasOnlineAdmins ? "Support Lead Online • Direct Desk" : "Dedicated Support • Leave a message"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Ticket Status Bar */}
          <div className="px-4 py-2 bg-muted/40 border-b border-border/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-[11px]">Ticket Status:</span>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold px-2 py-0.5 border ${
                  conversation?.status === "OPEN"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : conversation?.status === "IN_PROGRESS"
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                }`}
              >
                {conversation?.status || "OPEN"}
              </Badge>
            </div>

            {conversation?.status !== "RESOLVED" && (
              <button
                type="button"
                onClick={handleResolve}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark Resolved
              </button>
            )}
          </div>

          {/* Messages Timeline */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10 min-h-0 text-xs">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Connecting to live desk...
              </div>
            ) : (
              messages.map((msg) => {
                if (msg.senderType === "SYSTEM") {
                  return (
                    <div key={msg.id} className="flex justify-center my-1.5">
                      <span className="text-[10px] bg-muted/80 text-muted-foreground px-2.5 py-1 rounded-full border border-border/60 text-center">
                        {msg.message}
                      </span>
                    </div>
                  );
                }

                const isMe = msg.senderType === "TENANT_USER";
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 max-w-[85%] ${
                      isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                    }`}
                  >
                    {!isMe && (
                      <Avatar className="w-6 h-6 rounded-lg border border-border flex-shrink-0 mt-0.5">
                        <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-bold">
                          SA
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className="space-y-1">
                      <div
                        className={`p-3 rounded-2xl leading-relaxed shadow-xs ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-card border border-border/80 text-foreground rounded-tl-none"
                        }`}
                      >
                        {!isMe && (
                          <div className="text-[10px] font-bold text-primary mb-1">
                            {msg.senderName} ({msg.senderRole || "Super Admin"})
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.message}</p>

                        {/* Attachments */}
                        {msg.attachments &&
                          Array.isArray(msg.attachments) &&
                          msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {msg.attachments.map((att: any, idx: number) => {
                                const isImg =
                                  att.type?.startsWith("image/") ||
                                  /\.(png|jpe?g|webp|gif)$/i.test(att.url);
                                return (
                                  <div key={idx} className="rounded-xl overflow-hidden">
                                    {isImg ? (
                                      <a
                                        href={getFileUrl(att.url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block"
                                      >
                                        <img
                                          src={getFileUrl(att.url)}
                                          alt={att.name || "Attachment"}
                                          className="max-h-40 rounded-lg object-cover hover:opacity-90 transition-opacity"
                                        />
                                      </a>
                                    ) : (
                                      <a
                                        href={getFileUrl(att.url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1.5 p-1.5 rounded-lg bg-black/10 text-xs hover:bg-black/20 transition-colors"
                                      >
                                        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="truncate">{att.name || "File"}</span>
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                      </div>

                      <div
                        className={`flex items-center gap-1 text-[9px] text-muted-foreground ${
                          isMe ? "justify-end pr-1" : "justify-start pl-1"
                        }`}
                      >
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isMe && (
                          <span>
                            {msg.isRead ? (
                              <CheckCheck className="w-3 h-3 text-primary inline" />
                            ) : (
                              <Check className="w-3 h-3 inline" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Admin typing indicator */}
            {adminTyping && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground italic pl-8">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                </span>
                {adminTyping} is typing...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Issue Prompt Chips */}
          <div className="px-3 py-1.5 border-t border-border/60 bg-muted/20 overflow-x-auto flex gap-1.5">
            {TOPIC_SUGGESTIONS.map((topic, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(`Issue with: ${topic}`)}
                className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap"
              >
                {topic}
              </button>
            ))}
          </div>

          {/* Input Controls */}
          <div className="p-3 border-t border-border/80 bg-background flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            <Button
              variant="ghost"
              size="icon"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground flex-shrink-0"
              title="Upload Screenshot / Document"
            >
              <Paperclip className={`w-4 h-4 ${uploading ? "animate-spin" : ""}`} />
            </Button>

            <Textarea
              placeholder="Describe your issue or request... (Press Enter to send)"
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={1}
              className="min-h-[38px] max-h-24 resize-none text-xs rounded-xl bg-muted/20 border-border/80 py-2"
            />

            <Button
              onClick={() => handleSendMessage()}
              disabled={sending || (!inputMessage.trim() && !uploading)}
              className="rounded-xl h-9 px-3 font-semibold gap-1 flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
