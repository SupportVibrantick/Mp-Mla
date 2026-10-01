import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Share2,
  Plus,
  ArrowLeft,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Linkedin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
  Send,
  Calendar,
  Sparkles,
  Layers,
  BarChart3,
  Globe,
  Radio,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Heart,
  MessageCircle,
  Repeat2,
  Eye,
  ChevronRight,
  TrendingUp,
  Search,
  Filter,
} from "lucide-react";
import { socialApi } from "../../lib/api";
import { useToast } from "@/hooks/use-toast";
import { SocialAccountsModal } from "./SocialAccountsModal";
import { SocialComposerModal } from "./SocialComposerModal";
import { SocialPostDetailModal } from "./SocialPostDetailModal";

export const SocialDashboardPage: React.FC = () => {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [postSearchQuery, setPostSearchQuery] = useState("");
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  // Modals state
  const [accountsModalOpen, setAccountsModalOpen] = useState(false);
  const [composerModalOpen, setComposerModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPostForDetail, setSelectedPostForDetail] = useState<any | null>(null);

  const [initialConnectionId, setInitialConnectionId] = useState<string | null>(null);
  const [initialProvider, setInitialProvider] = useState<string | null>(null);

  // Disconnect Confirmation Modal
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [accountToDisconnect, setAccountToDisconnect] = useState<any | null>(null);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [syncingPostId, setSyncingPostId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accRes, postRes] = await Promise.all([
        socialApi.getAccounts(),
        socialApi.getPosts(),
      ]);
      if (accRes.data?.success) setAccounts(accRes.data.data || []);
      if (postRes.data?.success) {
        const fetched = postRes.data.data || [];
        setPosts(fetched);
        setSelectedPostForDetail((prev: any) => {
          if (!prev) return null;
          return fetched.find((p: any) => p.id === prev.id) || prev;
        });
      }
    } catch (err) {
      console.error("Failed to load social media data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Detect OAuth Callback params in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const oauthSuccess = searchParams.get("oauth_success");
    const connectionId = searchParams.get("connection_id");
    const provider = searchParams.get("provider");
    const oauthError = searchParams.get("oauth_error");

    if (oauthSuccess && connectionId) {
      setInitialConnectionId(connectionId);
      setInitialProvider(provider || "meta");
      setAccountsModalOpen(true);
      setBannerNotice("OAuth authorization granted! Please select which discovered channels to activate.");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthError) {
      toast({
        title: "OAuth Authorization Error",
        description: decodeURIComponent(oauthError),
        variant: "destructive",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchData();
  }, []);

  const handleTestConnection = async (id: string) => {
    try {
      setTestingId(id);
      const res = await socialApi.testConnection(id);
      if (res.data?.success) {
        toast({
          title: "Connection Healthy ✓",
          description: res.data.message || "Social channel API token is active and valid.",
          className: "bg-emerald-600 text-white font-bold",
        });
        fetchData();
      }
    } catch (err: any) {
      toast({
        title: "Health Check Failed",
        description: err.response?.data?.message || "Token expired or revoked.",
        variant: "destructive",
      });
    } finally {
      setTestingId(null);
    }
  };

  const openDisconnectDialog = (account: any) => {
    setAccountToDisconnect(account);
    setDisconnectModalOpen(true);
  };

  const handleConfirmDisconnect = async () => {
    if (!accountToDisconnect) return;
    try {
      await socialApi.disconnectAccount(accountToDisconnect.id);
      toast({
        title: "Channel Disconnected",
        description: `Successfully unlinked ${accountToDisconnect.accountName}.`,
      });
      setDisconnectModalOpen(false);
      setAccountToDisconnect(null);
      fetchData();
    } catch (err) {
      toast({
        title: "Failed to disconnect channel",
        variant: "destructive",
      });
    }
  };

  const handleRetryFailed = async (postId: string) => {
    try {
      setRetryingId(postId);
      const res = await socialApi.retryPost(postId);
      if (res.data?.success) {
        toast({
          title: "Broadcast Retried",
          description: "Queued retry for failed targets.",
          className: "bg-emerald-600 text-white font-bold",
        });
        fetchData();
      }
    } catch (err: any) {
      toast({
        title: "Retry Error",
        description: err.response?.data?.message || "Failed to retry broadcast.",
        variant: "destructive",
      });
    } finally {
      setRetryingId(null);
    }
  };

  const handleSyncPostMetrics = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setSyncingPostId(postId);
      const res = await socialApi.syncPostMetrics(postId);
      if (res.data?.success) {
        toast({
          title: "Metrics Synced ✓",
          description: "Fetched live likes, comments, and share metrics.",
          className: "bg-emerald-600 text-white font-bold",
        });
        fetchData();
      }
    } catch (err) {
      console.error("Sync post error:", err);
    } finally {
      setSyncingPostId(null);
    }
  };

  const handleSyncAllMetrics = async () => {
    try {
      setSyncingAll(true);
      const res = await socialApi.syncAllMetrics();
      if (res.data?.success) {
        toast({
          title: "All Metrics Updated! 📊",
          description: `Synced live engagement stats for ${res.data.syncedPostsCount || posts.length} broadcasts.`,
          className: "bg-emerald-600 text-white font-bold",
        });
        fetchData();
      }
    } catch (err) {
      console.error("Sync all error:", err);
    } finally {
      setSyncingAll(false);
    }
  };

  const openPostDetail = (post: any) => {
    setSelectedPostForDetail(post);
    setDetailModalOpen(true);
  };

  const handleDeletePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this broadcast log?")) return;
    try {
      await socialApi.deletePost(postId);
      toast({ title: "Broadcast log removed" });
      fetchData();
    } catch (err) {
      toast({ title: "Failed to delete post", variant: "destructive" });
    }
  };

  // Filtered Posts Calculation
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      !postSearchQuery ||
      post.content.toLowerCase().includes(postSearchQuery.toLowerCase());

    const matchesPlatform =
      selectedPlatformFilter === "ALL" ||
      post.targets?.some((t: any) => t.platform === selectedPlatformFilter);

    const matchesStatus =
      selectedStatusFilter === "ALL" ||
      (selectedStatusFilter === "PUBLISHED" &&
        post.targets?.some((t: any) => t.status === "PUBLISHED")) ||
      (selectedStatusFilter === "SCHEDULED" &&
        post.targets?.some((t: any) => t.status === "SCHEDULED")) ||
      (selectedStatusFilter === "FAILED" &&
        post.targets?.some(
          (t: any) => t.status === "FAILED" || t.status === "PARTIAL",
        ));

    return matchesSearch && matchesPlatform && matchesStatus;
  });

  // Calculate live aggregate engagement counters
  const totalLikes = posts.reduce((acc, p) => {
    const pLikes = (p.targets || []).reduce(
      (tAcc: number, t: any) => tAcc + (Number(t.likesCount) || 0),
      0,
    );
    return acc + pLikes;
  }, 0);

  const totalComments = posts.reduce((acc, p) => {
    const pComments = (p.targets || []).reduce(
      (tAcc: number, t: any) => tAcc + (Number(t.commentsCount) || 0),
      0,
    );
    return acc + pComments;
  }, 0);

  const totalShares = posts.reduce((acc, p) => {
    const pShares = (p.targets || []).reduce(
      (tAcc: number, t: any) => tAcc + (Number(t.sharesCount) || 0),
      0,
    );
    return acc + pShares;
  }, 0);

  const totalEngagement = totalLikes + totalComments + totalShares;
  const publishedPostsCount = posts.filter((p) =>
    p.targets?.some((t: any) => t.status === "PUBLISHED"),
  ).length;
  const scheduledPostsCount = posts.filter((p) =>
    p.targets?.some((t: any) => t.status === "SCHEDULED"),
  ).length;

  return (
    <MainLayout title="Social Media Management">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* ─── Header ────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/40 p-6 rounded-[28px] border border-border/60 backdrop-blur-sm shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
              <Share2 className="w-4 h-4" />
              <span>Multi-Channel Social Broadcast Hub</span>
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              Social Media Management
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Broadcast official announcements simultaneously across Meta (Facebook & Instagram) and LinkedIn with real-time engagement analytics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={fetchData}
              size="sm"
              className="rounded-xl border-border/80 hover:bg-muted/80"
              title="Refresh Social Hub"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              type="button"
              onClick={() => setComposerModalOpen(true)}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-md gap-2"
            >
              <Plus className="w-4 h-4" />
              Compose Post
            </Button>
          </div>
        </div>

        {bannerNotice && (
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold flex items-center justify-between">
            <span>{bannerNotice}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBannerNotice(null)}
              className="h-7 text-xs"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* ─── Metrics Cards ─────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-6 rounded-[28px] space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-24" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm bg-card/60 backdrop-blur-sm space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Connected Channels</span>
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <div className="text-3xl font-bold font-heading">
                {accounts.length}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> AES-256 Vault Active
              </span>
            </Card>

            <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm bg-card/60 backdrop-blur-sm space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Likes & Reactions</span>
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
              </div>
              <div className="text-3xl font-bold font-heading">
                {totalLikes.toLocaleString()}
              </div>
              <span className="text-[11px] text-muted-foreground">Live across connected platforms</span>
            </Card>

            <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm bg-card/60 backdrop-blur-sm space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Engagement</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-bold font-heading">
                {totalEngagement.toLocaleString()}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {totalComments.toLocaleString()} Comments • {totalShares.toLocaleString()} Shares
              </span>
            </Card>

            <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm bg-card/60 backdrop-blur-sm space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Published Broadcasts</span>
                <Send className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-3xl font-bold font-heading">
                {publishedPostsCount}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {scheduledPostsCount > 0 ? `${scheduledPostsCount} Scheduled` : "All broadcasts dispatched"}
              </span>
            </Card>
          </div>
        )}

        {/* ─── Connected Channels Section ─────────────────────────── */}
        <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm bg-card/60 backdrop-blur-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold font-heading flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Connected Official Channels
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Authorized accounts and live API connection status
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setInitialConnectionId(null);
                setAccountsModalOpen(true);
              }}
              className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 self-start sm:self-auto"
            >
              + Authorize Another Channel
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-border/80 bg-background/50 text-center space-y-3">
              <Globe className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-bold text-foreground">
                No Social Channels Connected Yet
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Authorize Meta (Facebook/Instagram), LinkedIn, Twitter or YouTube with 1-Click OAuth to start broadcasting.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setInitialConnectionId(null);
                  setAccountsModalOpen(true);
                }}
                className="mt-2 font-semibold"
              >
                Connect Channels with OAuth
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-4 rounded-2xl bg-background/60 border border-border/60 hover:border-primary/40 transition-colors shadow-sm flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 border border-border/40">
                        {acc.platform === "INSTAGRAM" && <Instagram className="w-5 h-5 text-pink-500" />}
                        {acc.platform === "FACEBOOK" && <Facebook className="w-5 h-5 text-blue-600" />}
                        {acc.platform === "TWITTER" && <Twitter className="w-5 h-5 text-sky-500" />}
                        {acc.platform === "YOUTUBE" && <Youtube className="w-5 h-5 text-red-600" />}
                        {acc.platform === "LINKEDIN" && <Linkedin className="w-5 h-5 text-blue-700" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground truncate max-w-[140px]">
                          {acc.accountName}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                          {acc.accountUsername || acc.providerAccountType || acc.platform}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTestConnection(acc.id)}
                        disabled={testingId === acc.id}
                        title="Run API Health Check"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingId === acc.id ? "animate-spin" : ""}`} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openDisconnectDialog(acc)}
                        title="Disconnect Channel"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Health Badge */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px]">
                    <span
                      className={`inline-flex items-center gap-1.5 font-semibold ${
                        acc.status === "CONNECTED" || acc.isActive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          acc.status === "CONNECTED" || acc.isActive
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-rose-500"
                        }`}
                      />
                      {acc.status === "CONNECTED" || acc.isActive
                        ? "Connected & Healthy"
                        : "Reconnect Required"}
                    </span>
                    <span className="text-muted-foreground">
                      {acc._count?.postTargets || 0} Broadcasts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ─── Recent Broadcasts & Live Stats ─────────────────────── */}
        <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm bg-card/60 backdrop-blur-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold font-heading flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Recent Social Broadcasts & Engagement Details
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Audit past posts, live interaction counts, and status per target channel
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSyncAllMetrics}
                disabled={syncingAll || posts.length === 0}
                className="text-xs font-semibold gap-1.5 h-8"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? "animate-spin text-primary" : ""}`} />
                Refresh Analytics
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setComposerModalOpen(true)}
                className="text-xs font-semibold gap-1 h-8"
              >
                + New Broadcast
              </Button>
            </div>
          </div>

          {/* ─── Search & Filters Bar ─────────────────────────────── */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border/50">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search broadcast content or message..."
                value={postSearchQuery}
                onChange={(e) => setPostSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-card border border-border/80 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Platform Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1 bg-card p-1 rounded-xl border border-border/80">
                {[
                  { id: "ALL", label: "All Networks" },
                  { id: "FACEBOOK", label: "Facebook" },
                  { id: "INSTAGRAM", label: "Instagram" },
                  { id: "LINKEDIN", label: "LinkedIn" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedPlatformFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedPlatformFilter === tab.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Status Select */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="h-8 px-3 rounded-xl bg-card border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="FAILED">Failed / Action Needed</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-border/80 bg-background/50 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-bold text-foreground">No broadcasts found</p>
              <p>
                {postSearchQuery || selectedPlatformFilter !== "ALL" || selectedStatusFilter !== "ALL"
                  ? "Try adjusting your search query or filters."
                  : 'Click "+ New Broadcast" to create your first post.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((post) => {
                const hasFailedTargets = post.targets?.some(
                  (t: any) => t.status === "FAILED" || t.status === "PARTIAL"
                );

                const postLikes = (post.targets || []).reduce((acc: number, t: any) => acc + (Number(t.likesCount) || 0), 0);
                const postComments = (post.targets || []).reduce((acc: number, t: any) => acc + (Number(t.commentsCount) || 0), 0);
                const postShares = (post.targets || []).reduce((acc: number, t: any) => acc + (Number(t.sharesCount) || 0), 0);

                return (
                  <div
                    key={post.id}
                    onClick={() => openPostDetail(post)}
                    className="p-4 sm:p-5 rounded-2xl bg-background/60 border border-border/60 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-4">
                      {post.mediaUrls && post.mediaUrls.length > 0 ? (
                        <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/60">
                          <img
                            src={post.mediaUrls[0]}
                            alt="Media"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                          <Share2 className="w-6 h-6" />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-foreground leading-relaxed line-clamp-2 max-w-xl group-hover:text-primary transition-colors">
                          {post.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{new Date(post.createdAt).toLocaleString()}</span>
                          <span>•</span>
                          <span className="font-semibold text-foreground">
                            {post.targets?.length || 0} Channel(s)
                          </span>
                          {post.isAiGenerated && (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[9px] font-bold px-1.5 py-0">
                              AI-Assisted
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Live Metrics Badges + Channel Status + Actions */}
                    <div className="flex flex-wrap items-center gap-3 justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-border/40">
                      {/* Live Engagement Counters */}
                      <div className="flex items-center gap-2">
                        <div
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold"
                          title="Likes & Reactions"
                        >
                          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                          <span>{postLikes.toLocaleString()}</span>
                        </div>
                        <div
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold"
                          title="Comments"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{postComments.toLocaleString()}</span>
                        </div>
                        <div
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold"
                          title="Shares / Reposts"
                        >
                          <Repeat2 className="w-3.5 h-3.5" />
                          <span>{postShares.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Channels Pills */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {post.targets?.map((target: any) => (
                          <span
                            key={target.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              target.status === "PUBLISHED"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : target.status === "SCHEDULED"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : target.status === "PROCESSING" || target.status === "PUBLISHING"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            }`}
                          >
                            {target.platform}
                            {target.status === "PUBLISHED" ? "✓" : target.status === "FAILED" ? "✗" : "⏳"}
                            {target.permalink && (
                              <a
                                href={target.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="hover:underline ml-0.5"
                                title="Open live post"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </span>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleSyncPostMetrics(post.id, e)}
                          disabled={syncingPostId === post.id}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Sync live likes & stats"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingPostId === post.id ? "animate-spin text-primary" : ""}`} />
                        </Button>

                        {hasFailedTargets && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetryFailed(post.id);
                            }}
                            disabled={retryingId === post.id}
                            className="h-8 px-2.5 text-xs font-bold gap-1 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                            title="Retry only failed channels"
                          >
                            <RotateCcw className={`w-3 h-3 ${retryingId === post.id ? "animate-spin" : ""}`} />
                            Retry
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeletePost(post.id, e)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete post record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>

                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ─── Disconnect Confirmation Modal ──────────────────────── */}
        {disconnectModalOpen && accountToDisconnect && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 text-destructive">
                <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Disconnect {accountToDisconnect.accountName}?
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {accountToDisconnect.platform} channel
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-2">
                <p>• Future scheduled broadcasts to this channel will stop.</p>
                <p>• Historical post logs and analytics will be preserved.</p>
                <p>• You can reconnect with 1-Click OAuth anytime.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDisconnectModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmDisconnect}
                >
                  Confirm Disconnect
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Child Modals */}
        <SocialAccountsModal
          isOpen={accountsModalOpen}
          onClose={() => {
            setAccountsModalOpen(false);
            setInitialConnectionId(null);
            setInitialProvider(null);
          }}
          onSuccess={() => {
            setAccountsModalOpen(false);
            setInitialConnectionId(null);
            setInitialProvider(null);
            fetchData();
          }}
          initialConnectionId={initialConnectionId}
          initialProvider={initialProvider}
        />

        <SocialComposerModal
          isOpen={composerModalOpen}
          onClose={() => setComposerModalOpen(false)}
          onSuccess={fetchData}
          accounts={accounts}
        />

        <SocialPostDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedPostForDetail(null);
          }}
          post={selectedPostForDetail}
          onUpdate={fetchData}
        />
      </div>
    </MainLayout>
  );
};
