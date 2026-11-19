import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  CheckCheck,
  Check,
  Clock,
  Sparkles,
  RefreshCw,
  Phone,
  Mail,
  Building2,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  User,
  ShieldCheck,
  FileText,
  Image as ImageIcon,
  Zap,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { platformSupportApi } from "@/lib/api";
import { usePlatformSocket } from "@/hooks/usePlatformSocket";
import { getFileUrl } from "@/lib/utils";

interface TenantInfo {
  id: string;
  name: string;
  constituencyName: string;
  state?: string;
  district?: string;
  logoUrl?: string;
  status: string;
  primaryColor?: string;
  representativeName?: string;
  representativeTitle?: string;
  representativePhoto?: string;
  partyName?: string;
  phone?: string;
  email?: string;
  storageUsedMB?: number;
}

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
  tenant: TenantInfo;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  category: "TECHNICAL" | "BILLING" | "FEATURE_REQUEST" | "BUG_REPORT" | "GENERAL";
  subject: string;
  lastMessageAt: string;
  lastMessageText?: string;
  unreadCountAdmin: number;
  unreadCountTenant: number;
  isTenantOnline?: boolean;
  assignedPlatformUser?: {
    id: string;
    name: string;
    role: string;
  };
  messages?: SupportMessage[];
}

const QUICK_REPLIES = [
  "Hello! We are looking into this issue right away for your constituency office.",
  "Could you please share a screenshot or error details so we can investigate faster?",
  "The configuration fix has been applied. Please refresh your dashboard and test again.",
  "Thank you for reaching out! This issue has been verified and marked as Resolved.",
];

export default function SupportCenterPage() {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0, totalUnread: 0 });
  const [showTenantDrawer, setShowTenantDrawer] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const {
    isConnected,
    joinConversation,
    leaveConversation,
    emitTyping,
    onNewMessage,
    onUserTyping,
    onConversationUpdated,
    onNewConversation,
    onTenantPresence,
    onMessagesRead,
  } = usePlatformSocket();

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch Stats & Conversations
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        platformSupportApi.listConversations({
          status: statusFilter,
          search: searchQuery,
        }),
        platformSupportApi.getStats(),
      ]);

      if (listRes.data?.success) {
        setConversations(listRes.data.data);
        if (!selectedConvId && listRes.data.data.length > 0) {
          setSelectedConvId(listRes.data.data[0].id);
        }
      }

      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load support conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [statusFilter, searchQuery]);

  // Load active conversation details when selection changes
  useEffect(() => {
    if (!selectedConvId) return;

    let mounted = true;
    joinConversation(selectedConvId);

    const loadDetail = async () => {
      try {
        const res = await platformSupportApi.getConversation(selectedConvId);
        if (res.data?.success && mounted) {
          setActiveConversation(res.data.data);
          setMessages(res.data.data.messages || []);
          // Mark admin read
          platformSupportApi.markAsRead(selectedConvId).catch(() => {});
          // Decrement locally
          setConversations((prev) =>
            prev.map((c) => (c.id === selectedConvId ? { ...c, unreadCountAdmin: 0 } : c)),
          );
        }
      } catch (err) {
        console.error("Failed to fetch conversation details:", err);
      }
    };

    loadDetail();

    return () => {
      mounted = false;
      leaveConversation(selectedConvId);
    };
  }, [selectedConvId, joinConversation, leaveConversation]);

  // Auto scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Real-time Socket Subscriptions
  useEffect(() => {
    const unsubMsg = onNewMessage((msg: SupportMessage) => {
      if (msg.conversationId === selectedConvId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.senderType === "TENANT_USER") {
          platformSupportApi.markAsRead(selectedConvId).catch(() => {});
        }
      }

      // Update conversation in list
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === msg.conversationId) {
            return {
              ...c,
              lastMessageText: msg.message,
              lastMessageAt: msg.createdAt,
              unreadCountAdmin:
                msg.conversationId === selectedConvId
                  ? 0
                  : msg.senderType === "TENANT_USER"
                  ? c.unreadCountAdmin + 1
                  : c.unreadCountAdmin,
            };
          }
          return c;
        }),
      );
    });

    const unsubTyping = onUserTyping((data: any) => {
      if (data.conversationId === selectedConvId && !data.isPlatform) {
        setIsTyping(data.isTyping ? data.userName || "Tenant" : null);
      }
    });

    const unsubUpdate = onConversationUpdated((data: any) => {
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === data.conversationId);
        if (exists) {
          return prev.map((c) =>
            c.id === data.conversationId
              ? {
                  ...c,
                  status: data.status || c.status,
                  lastMessageText: data.lastMessage?.message || c.lastMessageText,
                  lastMessageAt: data.lastMessage?.createdAt || c.lastMessageAt,
                  unreadCountAdmin: data.unreadCountAdmin ?? c.unreadCountAdmin,
                }
              : c,
          );
        }
        return prev;
      });
    });

    const unsubNewConv = onNewConversation(() => {
      fetchConversations();
    });

    const unsubPresence = onTenantPresence((data: { tenantId: string; isOnline: boolean }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.tenantId === data.tenantId ? { ...c, isTenantOnline: data.isOnline } : c,
        ),
      );
      if (activeConversation?.tenantId === data.tenantId) {
        setActiveConversation((prev) => (prev ? { ...prev, isTenantOnline: data.isOnline } : null));
      }
    });

    const unsubRead = onMessagesRead((data: any) => {
      if (data.conversationId === selectedConvId && data.readBy === "tenant") {
        setMessages((prev) =>
          prev.map((m) => (m.senderType === "SUPER_ADMIN" ? { ...m, isRead: true } : m)),
        );
      }
    });

    return () => {
      unsubMsg();
      unsubTyping();
      unsubUpdate();
      unsubNewConv();
      unsubPresence();
      unsubRead();
    };
  }, [
    selectedConvId,
    activeConversation,
    onNewMessage,
    onUserTyping,
    onConversationUpdated,
    onNewConversation,
    onTenantPresence,
    onMessagesRead,
  ]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (!selectedConvId) return;

    emitTyping(selectedConvId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(selectedConvId, false);
    }, 1500);
  };

  // Send Admin message
  const handleSendMessage = async (textToSend?: string, attachments?: any[]) => {
    const text = textToSend !== undefined ? textToSend : inputMessage;
    if ((!text || !text.trim()) && (!attachments || attachments.length === 0)) return;
    if (!selectedConvId) return;

    try {
      setSending(true);
      emitTyping(selectedConvId, false);
      const res = await platformSupportApi.sendMessage(selectedConvId, {
        message: text.trim(),
        attachments: attachments || undefined,
      });

      if (res.data?.success) {
        setInputMessage("");
      }
    } catch (err) {
      console.error("Failed to send admin message:", err);
    } finally {
      setSending(false);
    }
  };

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConvId) return;

    try {
      setUploading(true);
      const res = await platformSupportApi.uploadAttachment(file);
      if (res.data?.success) {
        const attachment = res.data.data;
        await handleSendMessage("", [attachment]);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload attachment");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Change status
  const handleStatusChange = async (newStatus: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED") => {
    if (!selectedConvId) return;
    try {
      const res = await platformSupportApi.updateConversation(selectedConvId, { status: newStatus });
      if (res.data?.success) {
        setActiveConversation((prev) => (prev ? { ...prev, status: newStatus } : null));
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConvId ? { ...c, status: newStatus } : c)),
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Change priority
  const handlePriorityChange = async (newPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT") => {
    if (!selectedConvId) return;
    try {
      const res = await platformSupportApi.updateConversation(selectedConvId, { priority: newPriority });
      if (res.data?.success) {
        setActiveConversation((prev) => (prev ? { ...prev, priority: newPriority } : null));
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConvId ? { ...c, priority: newPriority } : c)),
        );
      }
    } catch (err) {
      console.error("Failed to update priority:", err);
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 space-y-4">
        {/* Header Stats */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Tenant Live Support Center
            </h1>
            <p className="text-xs text-muted-foreground">
              Direct real-time communication desk with constituency offices and tenant admins
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {stats.open} Open Issues
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              {stats.inProgress} In Progress
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {stats.resolved} Resolved
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted border border-border text-foreground font-semibold">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-500" : "bg-muted-foreground"
                }`}
              />
              {isConnected ? "Socket Live" : "Reconnecting..."}
            </div>
          </div>
        </div>

        {/* Main 3-Column Desk */}
        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
          {/* Left Column: Conversations List (3 or 4 cols) */}
          <Card className="col-span-12 lg:col-span-4 flex flex-col h-full rounded-2xl border-border/80 overflow-hidden bg-card shadow-sm">
            {/* Search & Filter Bar */}
            <div className="p-3.5 border-b border-border/70 space-y-2.5 bg-muted/20">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search tenant or constituency..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl bg-background border-border/80"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-semibold">
                {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                      statusFilter === st
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {st === "ALL" ? "All Chats" : st === "IN_PROGRESS" ? "In Progress" : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {loading && conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-primary" />
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No support conversations found
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = conv.id === selectedConvId;
                  const tenant = conv.tenant;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 relative ${
                        isSelected
                          ? "bg-primary/10 border-l-4 border-l-primary"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      {/* Avatar with online dot */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-10 h-10 rounded-xl border border-border">
                          <AvatarImage src={getFileUrl(tenant.logoUrl)} />
                          <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                            {tenant.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {conv.isTenantOnline && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background ring-1 ring-emerald-500/50"
                            title="Tenant Online"
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-bold text-xs text-foreground truncate">
                            {tenant.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div className="text-[11px] text-muted-foreground truncate mb-1">
                          {tenant.constituencyName} • {conv.subject}
                        </div>

                        <p className="text-xs text-foreground/80 line-clamp-1">
                          {conv.lastMessageText || "New conversation started"}
                        </p>

                        <div className="flex items-center gap-1.5 mt-2">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 h-4 border font-bold uppercase ${
                              conv.status === "OPEN"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                : conv.status === "IN_PROGRESS"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            }`}
                          >
                            {conv.status}
                          </Badge>

                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 h-4 uppercase"
                          >
                            {conv.priority}
                          </Badge>

                          {conv.unreadCountAdmin > 0 && (
                            <span className="ml-auto px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                              {conv.unreadCountAdmin}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Center Column: Live Conversation Window (5 to 8 cols) */}
          <Card
            className={`col-span-12 ${
              showTenantDrawer ? "lg:col-span-5 xl:col-span-5" : "lg:col-span-8"
            } flex flex-col h-full rounded-2xl border-border/80 overflow-hidden bg-card shadow-sm`}
          >
            {activeConversation ? (
              <>
                {/* Chat Top Bar */}
                <div className="p-3.5 border-b border-border/80 bg-muted/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-9 h-9 rounded-xl border border-border flex-shrink-0">
                      <AvatarImage src={getFileUrl(activeConversation.tenant.logoUrl)} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                        {activeConversation.tenant.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate">
                          {activeConversation.tenant.name}
                        </span>
                        {activeConversation.isTenantOnline ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Offline</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {activeConversation.tenant.constituencyName} • {activeConversation.subject}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Status Dropdowns */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status Changer */}
                    <select
                      value={activeConversation.status}
                      onChange={(e) => handleStatusChange(e.target.value as any)}
                      className="text-xs font-semibold bg-background border border-border/80 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>

                    {/* Priority Selector */}
                    <select
                      value={activeConversation.priority}
                      onChange={(e) => handlePriorityChange(e.target.value as any)}
                      className="text-xs font-semibold bg-background border border-border/80 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowTenantDrawer(!showTenantDrawer)}
                      className="rounded-xl h-8 w-8"
                      title="Toggle Tenant Info"
                    >
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                {/* Messages Timeline */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-muted/5 min-h-0">
                  {messages.map((msg) => {
                    if (msg.senderType === "SYSTEM") {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <span className="text-[11px] font-medium bg-muted/60 text-muted-foreground px-3 py-1 rounded-full border border-border/60">
                            {msg.message}
                          </span>
                        </div>
                      );
                    }

                    const isAdmin = msg.senderType === "SUPER_ADMIN";
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2.5 max-w-[85%] ${
                          isAdmin ? "ml-auto flex-row-reverse" : "mr-auto"
                        }`}
                      >
                        <Avatar className="w-7 h-7 rounded-lg border border-border flex-shrink-0 mt-0.5">
                          <AvatarImage src={getFileUrl(msg.senderAvatar)} />
                          <AvatarFallback
                            className={`text-[10px] font-bold ${
                              isAdmin
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {msg.senderName.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="space-y-1">
                          <div
                            className={`flex items-center gap-1.5 text-[10px] text-muted-foreground ${
                              isAdmin ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span className="font-semibold text-foreground/80">
                              {msg.senderName} ({msg.senderRole || (isAdmin ? "Support" : "Staff")})
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                              isAdmin
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-card border border-border/80 text-foreground rounded-tl-none"
                            }`}
                          >
                            {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}

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
                                              className="max-h-48 rounded-lg object-cover hover:opacity-90 transition-opacity"
                                            />
                                          </a>
                                        ) : (
                                          <a
                                            href={getFileUrl(att.url)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-2 p-2 rounded-lg bg-black/10 text-xs hover:bg-black/20 transition-colors"
                                          >
                                            <FileText className="w-4 h-4 flex-shrink-0" />
                                            <span className="truncate">{att.name || "Download File"}</span>
                                          </a>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                          </div>

                          {isAdmin && (
                            <div className="flex justify-end pr-1 text-[10px] text-muted-foreground">
                              {msg.isRead ? (
                                <span className="inline-flex items-center gap-0.5 text-primary">
                                  <CheckCheck className="w-3 h-3" /> Seen
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5">
                                  <Check className="w-3 h-3" /> Sent
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground italic pl-9">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                      </span>
                      {isTyping} is typing...
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Canned Replies */}
                <div className="px-3 pt-2 pb-1 border-t border-border/60 bg-muted/10 overflow-x-auto flex gap-1.5">
                  {QUICK_REPLIES.map((qr, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(qr)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap"
                    >
                      {qr.slice(0, 32)}...
                    </button>
                  ))}
                </div>

                {/* Chat Input Bar */}
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
                    className="rounded-xl h-10 w-10 text-muted-foreground hover:text-foreground"
                    title="Upload screenshot or document"
                  >
                    <Paperclip className={`w-4 h-4 ${uploading ? "animate-spin" : ""}`} />
                  </Button>

                  <Textarea
                    placeholder="Type your response to the constituent office... (Press Ctrl+Enter to send)"
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={1}
                    className="min-h-[40px] max-h-32 resize-none text-xs rounded-xl bg-muted/20 border-border/80"
                  />

                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={sending || (!inputMessage.trim() && !uploading)}
                    className="rounded-xl h-10 px-4 font-semibold gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-3 text-muted-foreground/40" />
                <h3 className="font-bold text-sm text-foreground">Select a Conversation</h3>
                <p className="text-xs max-w-xs mt-1">
                  Choose any tenant support session from the list on the left to start real-time troubleshooting.
                </p>
              </div>
            )}
          </Card>

          {/* Right Column: Tenant Dossier / Context (3 cols) */}
          {showTenantDrawer && activeConversation && (
            <Card className="col-span-12 lg:col-span-3 xl:col-span-3 flex flex-col h-full rounded-2xl border-border/80 overflow-y-auto bg-card shadow-sm p-4 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Tenant Profile
                </h3>

                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 rounded-xl border border-border">
                    <AvatarImage src={getFileUrl(activeConversation.tenant.representativePhoto)} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                      {activeConversation.tenant.representativeName?.slice(0, 2).toUpperCase() ||
                        "MP"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      {activeConversation.tenant.representativeName || activeConversation.tenant.name}
                    </h4>
                    <p className="text-xs text-primary font-semibold">
                      {activeConversation.tenant.representativeTitle || "Elected Representative"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {activeConversation.tenant.partyName || "Independent"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Constituency</span>
                  <span className="font-semibold text-foreground">
                    {activeConversation.tenant.constituencyName} ({activeConversation.tenant.district || activeConversation.tenant.state || "India"})
                  </span>
                </div>

                {activeConversation.tenant.phone && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Contact Phone</span>
                    <a
                      href={`tel:${activeConversation.tenant.phone}`}
                      className="font-semibold text-primary flex items-center gap-1 hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      {activeConversation.tenant.phone}
                    </a>
                  </div>
                )}

                {activeConversation.tenant.email && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Official Email</span>
                    <a
                      href={`mailto:${activeConversation.tenant.email}`}
                      className="font-semibold text-primary flex items-center gap-1 hover:underline break-all"
                    >
                      <Mail className="w-3 h-3" />
                      {activeConversation.tenant.email}
                    </a>
                  </div>
                )}

                <div>
                  <span className="text-muted-foreground block text-[11px]">Account Status</span>
                  <Badge
                    variant="outline"
                    className="mt-1 font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/30 uppercase text-[10px]"
                  >
                    {activeConversation.tenant.status}
                  </Badge>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <h4 className="text-xs font-bold text-foreground">Resolution Actions</h4>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("RESOLVED")}
                  className="w-full text-xs font-semibold justify-start gap-2 rounded-xl text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark Issue Resolved
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full text-xs font-semibold justify-start gap-2 rounded-xl"
                >
                  <a href={`/tenants`}>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    Open in Tenants Directory
                  </a>
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
