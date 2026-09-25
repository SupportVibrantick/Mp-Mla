import React, { useState } from "react";
import {
  X,
  Send,
  Calendar,
  Image as ImageIcon,
  Video,
  Layers,
  Sparkles,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Linkedin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Smartphone,
  Upload,
  AlertTriangle,
  FileCheck,
  Tag,
  Sliders,
} from "lucide-react";
import { socialApi } from "../../lib/api";
import { useToast } from "@/hooks/use-toast";
import { ImageUploadField } from "../../components/common/ImageUploadField";

interface SocialComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: any[];
}

export const SocialComposerModal: React.FC<SocialComposerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
}) => {
  const { toast } = useToast();
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    accounts.map((a) => a.id)
  );
  const [activeTab, setActiveTab] = useState<"MASTER" | "INSTAGRAM" | "YOUTUBE" | "TWITTER">("MASTER");
  
  // Master Content
  const [content, setContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<string>("IMAGE");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [isScheduledMode, setIsScheduledMode] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<string>("INSTAGRAM");
  
  // Platform-Specific Configs
  const [igHashtags, setIgHashtags] = useState("");
  const [ytTitle, setYtTitle] = useState("");
  const [ytTags, setYtTags] = useState("");
  const [ytPrivacy, setYtPrivacy] = useState("public");
  const [ytMadeForKids, setYtMadeForKids] = useState(false);
  
  // Compliance & AI
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [complianceConfirmed, setComplianceConfirmed] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleAccount = (id: string) => {
    if (selectedAccountIds.includes(id)) {
      setSelectedAccountIds(selectedAccountIds.filter((a) => a !== id));
    } else {
      setSelectedAccountIds([...selectedAccountIds, id]);
    }
  };

  const handleAddMedia = (url: string) => {
    if (url && !mediaUrls.includes(url)) {
      setMediaUrls([...mediaUrls, url]);
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const selectedAccounts = accounts.filter((a) => selectedAccountIds.includes(a.id));
  const hasTwitterSelected = selectedAccounts.some((a) => a.platform === "TWITTER");
  const hasIgSelected = selectedAccounts.some((a) => a.platform === "INSTAGRAM");
  const hasYtSelected = selectedAccounts.some((a) => a.platform === "YOUTUBE");
  const twitterCharsRemaining = 280 - content.length;

  // Pre-flight compatibility warnings
  const warnings: string[] = [];
  if (hasIgSelected && mediaUrls.length === 0) {
    warnings.push("Instagram requires at least one image or video attachment to publish.");
  }
  if (hasTwitterSelected && twitterCharsRemaining < 0) {
    warnings.push(`Post exceeds X (Twitter) character limit by ${Math.abs(twitterCharsRemaining)} characters.`);
  }
  if (hasYtSelected && mediaUrls.length === 0) {
    warnings.push("YouTube requires a video file attachment.");
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Post content cannot be empty.");
      return;
    }
    if (selectedAccountIds.length === 0) {
      setError("Please select at least one social media channel to publish.");
      return;
    }
    if (hasTwitterSelected && twitterCharsRemaining < 0) {
      setError("Please shorten post to under 280 characters for X (Twitter).");
      return;
    }

    try {
      setPublishing(true);
      setError(null);

      // Assemble platform custom configs
      const customCaptions: Record<string, string> = {};
      const platformConfigs: Record<string, any> = {};

      selectedAccounts.forEach((acc) => {
        if (acc.platform === "INSTAGRAM" && igHashtags.trim()) {
          customCaptions[acc.id] = `${content}\n\n${igHashtags}`;
        }
        if (acc.platform === "YOUTUBE") {
          platformConfigs[acc.id] = {
            title: ytTitle || content.slice(0, 60),
            tags: ytTags ? ytTags.split(",").map((t) => t.trim()) : [],
            privacyStatus: ytPrivacy,
            madeForKids: ytMadeForKids,
          };
        }
      });

      const res = await socialApi.createPost({
        content,
        mediaUrls,
        mediaType: mediaUrls.length > 1 ? "CAROUSEL" : mediaType,
        accountIds: selectedAccountIds,
        scheduledAt: isScheduledMode && scheduledAt ? scheduledAt : null,
        customCaptions,
        platformConfigs,
        isAiGenerated,
        complianceLabels: complianceConfirmed ? ["ECI_APPROVED", "OFFICIAL_COMMUNICATION"] : [],
      });

      if (res.data?.success) {
        toast({
          title: isScheduledMode ? "Broadcast Scheduled 📅" : "Broadcast Dispatched 🚀",
          description: isScheduledMode
            ? "Your broadcast has been scheduled successfully."
            : "Your post has been submitted and queued for publishing.",
          className: "bg-emerald-600 text-white font-bold",
        });
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error("Publish error:", err);
      setError(err.response?.data?.message || "Failed to publish post.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]">
        {/* Left: Composer Form */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                Universal Social Media Composer
              </h2>
              <p className="text-xs text-slate-500">
                1-Click simultaneous broadcast with independent platform adapters.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Target Network Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Target Networks ({selectedAccountIds.length} Selected)
            </label>
            {accounts.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl">
                No social channels connected yet. Please connect an account first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accounts.map((acc) => {
                  const isSelected = selectedAccountIds.includes(acc.id);
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => toggleAccount(acc.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        isSelected
                          ? "bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-600 dark:text-orange-400 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 opacity-60"
                      }`}
                    >
                      {acc.platform === "INSTAGRAM" && <Instagram className="w-3.5 h-3.5 text-pink-500" />}
                      {acc.platform === "FACEBOOK" && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                      {acc.platform === "TWITTER" && <Twitter className="w-3.5 h-3.5 text-sky-500" />}
                      {acc.platform === "YOUTUBE" && <Youtube className="w-3.5 h-3.5 text-red-600" />}
                      {acc.platform === "LINKEDIN" && <Linkedin className="w-3.5 h-3.5 text-blue-700" />}
                      <span>{acc.accountName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sub-Tabs for Master Content vs Platform Specifics */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("MASTER")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "MASTER"
                  ? "bg-orange-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Master Content
            </button>
            {hasIgSelected && (
              <button
                type="button"
                onClick={() => setActiveTab("INSTAGRAM")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "INSTAGRAM"
                    ? "bg-orange-600 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                Instagram Config
              </button>
            )}
            {hasYtSelected && (
              <button
                type="button"
                onClick={() => setActiveTab("YOUTUBE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "YOUTUBE"
                    ? "bg-orange-600 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                YouTube Video Config
              </button>
            )}
          </div>

          {activeTab === "MASTER" && (
            <>
              {/* Post Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Master Caption & Message
                  </label>
                  {hasTwitterSelected && (
                    <span
                      className={`text-xs font-mono font-bold ${
                        twitterCharsRemaining < 0
                          ? "text-red-600 dark:text-red-400"
                          : twitterCharsRemaining < 20
                          ? "text-amber-500"
                          : "text-slate-400"
                      }`}
                    >
                      X limit: {twitterCharsRemaining} chars
                    </span>
                  )}
                </div>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write official announcement, development report, or public greeting..."
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Media Attachments */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Attach Images / Videos
                </label>
                <div className="space-y-3">
                  <ImageUploadField
                    label="Add Media Asset"
                    value=""
                    onChange={(url) => handleAddMedia(url)}
                  />

                  {mediaUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {mediaUrls.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative group w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                        >
                          <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(idx)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "INSTAGRAM" && (
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-pink-500" />
                Instagram Specific Hashtags & First Comment
              </h4>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hashtags (Appended to Caption)
                </label>
                <input
                  type="text"
                  value={igHashtags}
                  onChange={(e) => setIgHashtags(e.target.value)}
                  placeholder="#ConstituencyName #MLAName #DevelopmentWorks"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === "YOUTUBE" && (
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-red-600" />
                YouTube Video Metadata
              </h4>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Video Title
                </label>
                <input
                  type="text"
                  value={ytTitle}
                  onChange={(e) => setYtTitle(e.target.value)}
                  placeholder="Official Speech / Project Inauguration Video"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={ytTags}
                    onChange={(e) => setYtTags(e.target.value)}
                    placeholder="mla, speech, development"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Visibility
                  </label>
                  <select
                    value={ytPrivacy}
                    onChange={(e) => setYtPrivacy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Pre-flight Warnings */}
          {warnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Compatibility Notices:</span>
              </div>
              {warnings.map((w, i) => (
                <p key={i} className="text-[11px] pl-5">• {w}</p>
              ))}
            </div>
          )}

          {/* Schedule & Compliance Section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Schedule Broadcast (Asia/Kolkata)
                </span>
              </div>
              <input
                type="checkbox"
                checked={isScheduledMode}
                onChange={(e) => setIsScheduledMode(e.target.checked)}
                className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
              />
            </div>

            {isScheduledMode && (
              <div>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            )}

            {/* Political & AI Compliance */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isAiGenerated}
                  onChange={(e) => setIsAiGenerated(e.target.checked)}
                  className="w-3.5 h-3.5 accent-purple-600 rounded"
                />
                <span className="text-[11px]">Mark as AI-Assisted / Altered</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={complianceConfirmed}
                  onChange={(e) => setComplianceConfirmed(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-600 rounded"
                />
                <span className="text-[11px]">Official Representative Approved</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || accounts.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50 hover:scale-[1.02]"
            >
              {publishing ? (
                "Processing Queue..."
              ) : isScheduledMode ? (
                <>
                  <Calendar className="w-4 h-4" />
                  Schedule Broadcast
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publish via Adapters
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Interactive Live Smartphone Mockup */}
        <div className="w-full md:w-96 bg-slate-100 dark:bg-slate-950 p-6 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col items-center justify-between shrink-0">
          <div className="w-full flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Smartphone className="w-4 h-4 text-orange-500" />
              <span>Live Post Mockup</span>
            </div>
            {/* Toggle Preview Platform */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                type="button"
                onClick={() => setPreviewPlatform("INSTAGRAM")}
                className={`p-1.5 rounded-lg text-xs ${
                  previewPlatform === "INSTAGRAM"
                    ? "bg-orange-500 text-white"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Instagram Preview"
              >
                <Instagram className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewPlatform("FACEBOOK")}
                className={`p-1.5 rounded-lg text-xs ${
                  previewPlatform === "FACEBOOK"
                    ? "bg-orange-500 text-white"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Facebook Preview"
              >
                <Facebook className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewPlatform("TWITTER")}
                className={`p-1.5 rounded-lg text-xs ${
                  previewPlatform === "TWITTER"
                    ? "bg-orange-500 text-white"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Twitter Preview"
              >
                <Twitter className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Smartphone Frame */}
          <div className="w-full max-w-[280px] bg-white dark:bg-slate-900 rounded-[32px] border-[6px] border-slate-800 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col my-auto">
            {/* Mockup Top Notch */}
            <div className="h-4 bg-slate-800 dark:bg-slate-700 flex items-center justify-center">
              <div className="w-12 h-1.5 bg-slate-900 rounded-full" />
            </div>

            {/* Mockup Header */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-black text-[10px] flex items-center justify-center">
                M
              </div>
              <div className="leading-tight">
                <p className="text-[11px] font-bold text-slate-900 dark:text-white">
                  MLA Official
                </p>
                <p className="text-[9px] text-slate-400">
                  {previewPlatform === "INSTAGRAM"
                    ? "Instagram Feed"
                    : previewPlatform === "FACEBOOK"
                    ? "Facebook Official Page"
                    : "X (Twitter)"}
                </p>
              </div>
            </div>

            {/* Mockup Media */}
            {mediaUrls.length > 0 ? (
              <div className="w-full aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                <img
                  src={mediaUrls[0]}
                  alt="Mockup"
                  className="w-full h-full object-cover"
                />
                {mediaUrls.length > 1 && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-bold">
                    1/{mediaUrls.length}
                  </span>
                )}
              </div>
            ) : (
              <div className="w-full aspect-[4/3] bg-slate-50 dark:bg-slate-800/40 border-y border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 text-[10px] p-4 text-center">
                <ImageIcon className="w-6 h-6 mb-1 opacity-40" />
                Text-Only Announcement
              </div>
            )}

            {/* Mockup Caption */}
            <div className="p-3 text-[11px] text-slate-800 dark:text-slate-200 leading-snug break-words max-h-32 overflow-y-auto">
              <span className="font-bold mr-1">mlaofficial</span>
              {content || (
                <span className="text-slate-400 italic">
                  Post preview text will appear here as you type...
                </span>
              )}
              {previewPlatform === "INSTAGRAM" && igHashtags && (
                <p className="text-pink-600 dark:text-pink-400 text-[10px] mt-1 font-semibold">
                  {igHashtags}
                </p>
              )}
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mt-3 text-center">
            Decoupled provider queue ready.
          </p>
        </div>
      </div>
    </div>
  );
};
