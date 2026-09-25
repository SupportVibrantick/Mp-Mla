import React, { useState } from "react";
import {
  X,
  Share2,
  Heart,
  MessageCircle,
  Repeat2,
  Eye,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Linkedin,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { socialApi } from "../../lib/api";

interface SocialPostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: any | null;
  onUpdate: () => void;
}

export const SocialPostDetailModal: React.FC<SocialPostDetailModalProps> = ({
  isOpen,
  onClose,
  post,
  onUpdate,
}) => {
  const [currentPost, setCurrentPost] = useState<any | null>(post);
  const [syncing, setSyncing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Sync state with post prop
  React.useEffect(() => {
    if (post) {
      setCurrentPost(post);
    }
  }, [post]);

  // When modal opens or post ID changes, fetch full fresh post details from API
  React.useEffect(() => {
    if (isOpen && post?.id) {
      socialApi
        .getPost(post.id)
        .then((res) => {
          if (res.data?.success && res.data.data) {
            setCurrentPost(res.data.data);
          }
        })
        .catch((err) => {
          console.warn("Failed to fetch fresh post detail:", err);
        });
    }
  }, [isOpen, post?.id]);

  if (!isOpen || !post) return null;

  const displayPost = currentPost || post;

  const totalLikes =
    (displayPost.targets || []).reduce(
      (acc: number, t: any) => acc + (Number(t.likesCount) || 0),
      0
    );
  const totalComments =
    (displayPost.targets || []).reduce(
      (acc: number, t: any) => acc + (Number(t.commentsCount) || 0),
      0
    );
  const totalShares =
    (displayPost.targets || []).reduce(
      (acc: number, t: any) => acc + (Number(t.sharesCount) || 0),
      0
    );
  const totalViews =
    (displayPost.targets || []).reduce(
      (acc: number, t: any) => acc + (Number(t.viewsCount) || 0),
      0
    );
  const totalEngagement = totalLikes + totalComments + totalShares;

  const handleSyncMetrics = async () => {
    try {
      setSyncing(true);
      setMessage(null);
      const res = await socialApi.syncPostMetrics(displayPost.id);
      if (res.data?.data) {
        setCurrentPost(res.data.data);
      }
      if (res.data?.success) {
        setMessage(res.data.message || "Live analytics updated from social networks!");
      } else {
        setMessage(res.data?.message || "Could not refresh analytics.");
      }
      onUpdate();
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Failed to sync metrics from platforms.");
    } finally {
      setSyncing(false);
    }
  };

  const handleRetry = async () => {
    try {
      setRetryingId(displayPost.id);
      setMessage(null);
      await socialApi.retryPost(displayPost.id);
      setMessage("Publishing retry job dispatched!");
      onUpdate();
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Retry failed");
    } finally {
      setRetryingId(null);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "FACEBOOK":
        return <Facebook className="w-5 h-5 text-blue-600" />;
      case "INSTAGRAM":
        return <Instagram className="w-5 h-5 text-pink-500" />;
      case "TWITTER":
        return <Twitter className="w-5 h-5 text-sky-500" />;
      case "YOUTUBE":
        return <Youtube className="w-5 h-5 text-red-600" />;
      case "LINKEDIN":
        return <Linkedin className="w-5 h-5 text-blue-700" />;
      default:
        return <Share2 className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Broadcast Analytics & Channel Details
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    displayPost.status === "PUBLISHED"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : displayPost.status === "SCHEDULED"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      : displayPost.status === "PARTIAL"
                      ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400"
                      : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                  }`}
                >
                  {displayPost.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Created: {new Date(displayPost.createdAt).toLocaleString()} • Timezone: {displayPost.timezone || "Asia/Kolkata"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncMetrics}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-orange-600" : ""}`} />
              {syncing ? "Fetching Live Stats..." : "Sync Live Stats"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {message && (
            <div className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-xs text-orange-800 dark:text-orange-200 flex items-center justify-between">
              <span>{message}</span>
              <button
                type="button"
                onClick={() => setMessage(null)}
                className="font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ─── Metric Highlights ─────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
              <div className="flex items-center justify-between text-rose-600 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Likes</span>
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {totalLikes.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">Reactions & Favorites</span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
              <div className="flex items-center justify-between text-blue-600 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Comments</span>
                <MessageCircle className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {totalComments.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">Citizen Discussions</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-center justify-between text-emerald-600 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Shares</span>
                <Repeat2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {totalShares.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">Amplifications / Reposts</span>
            </div>

            <div className="p-4 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40">
              <div className="flex items-center justify-between text-orange-600 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Engagement</span>
                <Sparkles className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {totalEngagement.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">Across All Channels</span>
            </div>
          </div>

          {/* ─── Post Content Preview ──────────────────────────────── */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Broadcast Content
              </span>
              <div className="flex items-center gap-1.5">
                {displayPost.isAiGenerated && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI-Generated
                  </span>
                )}
                {displayPost.complianceLabels?.map((label: string) => (
                  <span
                    key={label}
                    className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3 h-3" /> {label}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {displayPost.content}
            </p>

            {displayPost.mediaUrls && displayPost.mediaUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                {displayPost.mediaUrls.map((url: string, idx: number) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-700 relative group shadow-sm"
                  >
                    <img
                      src={url}
                      alt={`Media ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── Per-Target Platform Breakdown ─────────────────────── */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Connected Channels Performance ({displayPost.targets?.length || 0})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayPost.targets?.map((target: any) => {
                const acc = target.socialAccount || {};
                return (
                  <div
                    key={target.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 shadow-inner">
                          {getPlatformIcon(target.platform)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                              {acc.accountName || target.platform}
                            </h5>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-bold">
                              {target.platform}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {acc.accountUsername || acc.providerAccountType || "Connected Channel"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                          target.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : target.status === "SCHEDULED"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        }`}
                      >
                        {target.status === "PUBLISHED" ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Live
                          </>
                        ) : target.status === "SCHEDULED" ? (
                          <>
                            <Clock className="w-3 h-3" /> Scheduled
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" /> Failed
                          </>
                        )}
                      </span>
                    </div>

                    {/* Stats for this channel */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-center">
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1">
                          <Heart className="w-2.5 h-2.5 text-rose-500" /> Likes
                        </div>
                        <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                          {(Number(target.likesCount) || 0).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1">
                          <MessageCircle className="w-2.5 h-2.5 text-blue-500" /> Comments
                        </div>
                        <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                          {(Number(target.commentsCount) || 0).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1">
                          <Repeat2 className="w-2.5 h-2.5 text-emerald-500" /> Shares
                        </div>
                        <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                          {(Number(target.sharesCount) || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Error Message if failed */}
                    {target.failureReason && (
                      <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-[11px] text-red-600 dark:text-red-400">
                        {target.failureReason}
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                      <span className="text-slate-400 text-[10px]">
                        {target.publishedAt ? `Published ${new Date(target.publishedAt).toLocaleTimeString()}` : "Pending"}
                      </span>

                      <div className="flex items-center gap-2">
                        {target.permalink && (
                          <a
                            href={target.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold hover:underline"
                          >
                            View Live Post
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {target.status === "FAILED" && (
                          <button
                            type="button"
                            onClick={handleRetry}
                            disabled={retryingId === displayPost.id}
                            className="inline-flex items-center gap-1 text-orange-600 font-bold hover:underline text-xs"
                          >
                            <RotateCcw className="w-3 h-3" /> Retry
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
