import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
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
} from "lucide-react";
import { socialApi } from "../../lib/api";
import { SocialAccountsModal } from "./SocialAccountsModal";
import { SocialComposerModal } from "./SocialComposerModal";
import { SocialPostDetailModal } from "./SocialPostDetailModal";

export const SocialDashboardPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      alert(`OAuth Authorization Error: ${decodeURIComponent(oauthError)}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchData();
  }, []);

  const openDisconnectDialog = (account: any) => {
    setAccountToDisconnect(account);
    setDisconnectModalOpen(true);
  };

  const handleConfirmDisconnect = async () => {
    if (!accountToDisconnect) return;
    try {
      await socialApi.disconnectAccount(accountToDisconnect.id);
      setDisconnectModalOpen(false);
      setAccountToDisconnect(null);
      fetchData();
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      setTestingId(id);
      const res = await socialApi.testConnection(id);
      alert(res.data?.message || "Connection verified!");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Connection test failed");
      fetchData();
    } finally {
      setTestingId(null);
    }
  };

  const handleRetryFailed = async (postId: string) => {
    try {
      setRetryingId(postId);
      const res = await socialApi.retryPost(postId);
      alert(res.data?.message || "Retry job dispatched!");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Retry failed");
    } finally {
      setRetryingId(null);
    }
  };

  const handleSyncPostMetrics = async (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setSyncingPostId(postId);
      const res = await socialApi.syncPostMetrics(postId);
      if (res.data?.data) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? res.data.data : p))
        );
        setSelectedPostForDetail((prev: any) => {
          if (prev?.id === postId) return res.data.data;
          return prev;
        });
      }
    } catch (err: any) {
      console.error("Sync post error:", err);
    } finally {
      setSyncingPostId(null);
    }
  };

  const handleSyncAllMetrics = async () => {
    try {
      setSyncingAll(true);
      const res = await socialApi.syncAllMetrics();
      if (res.data?.data) {
        setPosts(res.data.data);
        setSelectedPostForDetail((prev: any) => {
          if (!prev) return null;
          return res.data.data.find((p: any) => p.id === prev.id) || prev;
        });
        setBannerNotice("Live engagement metrics updated from all connected social platforms!");
      }
    } catch (err) {
      console.error("Sync all error:", err);
    } finally {
      setSyncingAll(false);
    }
  };

  const handleDeletePost = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this post record?")) return;
    try {
      await socialApi.deletePost(id);
      fetchData();
    } catch (err) {
      console.error("Delete post error:", err);
    }
  };

  const openPostDetail = (post: any) => {
    setSelectedPostForDetail(post);
    setDetailModalOpen(true);
  };

  const publishedPostsCount = posts.filter((p) => p.status === "PUBLISHED").length;
  const scheduledPostsCount = posts.filter((p) => p.status === "SCHEDULED").length;
  
  // Aggregate Metrics Across All Posts
  const totalLikes = posts.reduce(
    (acc, p) => acc + ((p.targets || []).reduce((tAcc: number, t: any) => tAcc + (Number(t.likesCount) || 0), 0) || 0),
    0
  );
  const totalComments = posts.reduce(
    (acc, p) => acc + ((p.targets || []).reduce((tAcc: number, t: any) => tAcc + (Number(t.commentsCount) || 0), 0) || 0),
    0
  );
  const totalShares = posts.reduce(
    (acc, p) => acc + ((p.targets || []).reduce((tAcc: number, t: any) => tAcc + (Number(t.sharesCount) || 0), 0) || 0),
    0
  );
  const totalEngagement = totalLikes + totalComments + totalShares;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-slate-700/80 transition-all mb-3 group w-fit border border-slate-200/80 dark:border-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-500 group-hover:text-orange-600 dark:group-hover:text-orange-400" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold text-xs tracking-wider uppercase">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Direct Social Publishing & Analytics Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Social Media Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Broadcast official announcements simultaneously across Facebook, Instagram, X, and YouTube with real-time engagement analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSyncAllMetrics}
            disabled={syncingAll || posts.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm shadow-sm disabled:opacity-50"
            title="Fetch latest likes, comments, and shares from all platforms"
          >
            <RefreshCw className={`w-4 h-4 ${syncingAll ? "animate-spin text-orange-600" : ""}`} />
            {syncingAll ? "Syncing Stats..." : "Sync All Analytics"}
          </button>
          <button
            type="button"
            onClick={() => {
              setInitialConnectionId(null);
              setAccountsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Connect Channels
          </button>
          <button
            type="button"
            onClick={() => setComposerModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-amber-700 transition-all hover:scale-[1.02] text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Compose Post
          </button>
        </div>
      </div>

      {bannerNotice && (
        <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-xs text-orange-800 dark:text-orange-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
            <span>{bannerNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerNotice(null)}
            className="text-orange-600 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ─── Metrics Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Connected Channels</span>
            <Globe className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {accounts.length}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" /> AES-256 Vault Active
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Total Likes & Reactions</span>
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalLikes.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Live across connected platforms</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Total Engagement</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalEngagement.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {totalComments.toLocaleString()} Comments • {totalShares.toLocaleString()} Shares
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Published Broadcasts</span>
            <Send className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {publishedPostsCount}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {scheduledPostsCount > 0 ? `${scheduledPostsCount} Scheduled` : "All broadcasts dispatched"}
          </span>
        </div>
      </div>

      {/* ─── Connected Channels Section ─────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Share2 className="w-4 h-4 text-orange-500" />
            Connected Official Channels
          </h2>
          <button
            type="button"
            onClick={() => {
              setInitialConnectionId(null);
              setAccountsModalOpen(true);
            }}
            className="text-xs text-orange-600 dark:text-orange-400 font-bold hover:underline"
          >
            + Authorize Another Channel
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-center space-y-3">
            <Globe className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No Social Channels Connected Yet
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Authorize Meta (Instagram/Facebook), Google (YouTube), or X (Twitter) with 1-Click OAuth to start broadcasting.
            </p>
            <button
              type="button"
              onClick={() => {
                setInitialConnectionId(null);
                setAccountsModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20"
            >
              Connect Channels with OAuth
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      {acc.platform === "INSTAGRAM" && <Instagram className="w-5 h-5 text-pink-500" />}
                      {acc.platform === "FACEBOOK" && <Facebook className="w-5 h-5 text-blue-600" />}
                      {acc.platform === "TWITTER" && <Twitter className="w-5 h-5 text-sky-500" />}
                      {acc.platform === "YOUTUBE" && <Youtube className="w-5 h-5 text-red-600" />}
                      {acc.platform === "LINKEDIN" && <Linkedin className="w-5 h-5 text-blue-700" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                        {acc.accountName}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                        {acc.accountUsername || acc.providerAccountType || acc.platform}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTestConnection(acc.id)}
                      disabled={testingId === acc.id}
                      title="Run API Health Check"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingId === acc.id ? "animate-spin" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDisconnectDialog(acc)}
                      title="Disconnect Channel"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Health Badge */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px]">
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      acc.status === "CONNECTED" || acc.isActive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        acc.status === "CONNECTED" || acc.isActive
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-red-500"
                      }`}
                    />
                    {acc.status === "CONNECTED" || acc.isActive
                      ? "Connected & Healthy"
                      : "Reconnect Required"}
                  </span>
                  <span className="text-slate-400">
                    {acc._count?.postTargets || 0} Broadcasts
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Recent Broadcasts & Live Stats ─────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-orange-500" />
            Recent Social Broadcasts & Engagement Details
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSyncAllMetrics}
              disabled={syncingAll || posts.length === 0}
              className="text-xs text-slate-600 dark:text-slate-400 font-bold hover:text-orange-600 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${syncingAll ? "animate-spin" : ""}`} />
              Refresh Analytics
            </button>
            <button
              type="button"
              onClick={() => setComposerModalOpen(true)}
              className="text-xs text-orange-600 dark:text-orange-400 font-bold hover:underline"
            >
              + New Broadcast
            </button>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-center text-xs text-slate-500">
            No posts published or scheduled yet. Click "Compose Post" to broadcast to your channels.
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
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
                  className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-orange-500/50 dark:hover:border-orange-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-4">
                    {post.mediaUrls && post.mediaUrls.length > 0 ? (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                        <img
                          src={post.mediaUrls[0]}
                          alt="Media"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center shrink-0">
                        <Share2 className="w-6 h-6" />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed line-clamp-2 max-w-xl group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {post.content}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span>{new Date(post.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span className="font-bold text-slate-600 dark:text-slate-300">
                          {post.targets?.length || 0} Channel(s)
                        </span>
                        {post.isAiGenerated && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-bold text-[9px]">
                            AI-Assisted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Live Metrics Badges + Channel Status + Quick Actions */}
                  <div className="flex flex-wrap items-center gap-3 justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-700/60">
                    {/* Live Engagement Counters */}
                    <div className="flex items-center gap-2">
                      <div
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold"
                        title="Likes & Reactions"
                      >
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                        <span>{postLikes.toLocaleString()}</span>
                      </div>
                      <div
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold"
                        title="Comments"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{postComments.toLocaleString()}</span>
                      </div>
                      <div
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold"
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
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            target.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : target.status === "SCHEDULED"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                              : target.status === "PROCESSING" || target.status === "PUBLISHING"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
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
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleSyncPostMetrics(post.id, e)}
                        disabled={syncingPostId === post.id}
                        className="p-2 rounded-xl text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-slate-700 transition-all text-xs"
                        title="Sync live likes & stats"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingPostId === post.id ? "animate-spin text-orange-600" : ""}`} />
                      </button>

                      {hasFailedTargets && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetryFailed(post.id);
                          }}
                          disabled={retryingId === post.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 text-orange-600 dark:text-orange-400 text-xs font-bold transition-all"
                          title="Retry only failed channels"
                        >
                          <RotateCcw className={`w-3 h-3 ${retryingId === post.id ? "animate-spin" : ""}`} />
                          Retry
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDeletePost(post.id, e)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 transition-all text-xs"
                        title="Delete post record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Disconnect Confirmation Modal ──────────────────────── */}
      {disconnectModalOpen && accountToDisconnect && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Disconnect {accountToDisconnect.accountName}?
                </h3>
                <p className="text-xs text-slate-500">
                  {accountToDisconnect.platform} channel
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <p>• Future scheduled broadcasts to this channel will stop.</p>
              <p>• Historical post logs and analytics will be preserved.</p>
              <p>• You can reconnect with 1-Click OAuth anytime.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDisconnectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisconnect}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/25 transition-all"
              >
                Confirm Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
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
  );
};
