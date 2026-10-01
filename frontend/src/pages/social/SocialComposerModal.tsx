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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const hasIgSelected = selectedAccounts.some((a) => a.platform === "INSTAGRAM");

  // Pre-flight compatibility warnings
  const warnings: string[] = [];
  if (hasIgSelected && mediaUrls.length === 0) {
    warnings.push("Instagram requires at least one image or video attachment to publish.");
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
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-[28px] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]">
        {/* Left: Composer Form */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Universal Social Media Composer
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                1-Click simultaneous broadcast with independent platform adapters.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground md:hidden"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Target Network Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Target Networks ({selectedAccountIds.length} Selected)
            </label>
            {accounts.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
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
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        isSelected
                          ? "bg-primary/10 border-primary text-primary shadow-sm"
                          : "bg-muted/40 border-border text-muted-foreground opacity-60 hover:opacity-100"
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
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("MASTER")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "MASTER"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Master Content
            </button>
            {hasIgSelected && (
              <button
                type="button"
                onClick={() => setActiveTab("INSTAGRAM")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "INSTAGRAM"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Instagram Config
              </button>
            )}
          </div>

          {activeTab === "MASTER" && (
            <>
              {/* Post Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Master Caption & Message
                  </label>
                </div>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write official announcement, development report, or public greeting..."
                  className="w-full p-3.5 rounded-2xl bg-muted/40 border border-border text-xs text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Media Attachments */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
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
                          className="relative group w-16 h-16 rounded-xl overflow-hidden border border-border bg-muted"
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
            <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border border-border">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-pink-500" />
                Instagram Specific Hashtags & First Comment
              </h4>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Hashtags (Appended to Caption)
                </label>
                <input
                  type="text"
                  value={igHashtags}
                  onChange={(e) => setIgHashtags(e.target.value)}
                  placeholder="#ConstituencyName #MLAName #DevelopmentWorks"
                  className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs focus:ring-2 focus:ring-primary/50 focus:outline-none text-foreground"
                />
              </div>
            </div>
          )}

          {activeTab === "YOUTUBE" && (
            <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border border-border">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-red-600" />
                YouTube Video Metadata
              </h4>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Video Title
                </label>
                <input
                  type="text"
                  value={ytTitle}
                  onChange={(e) => setYtTitle(e.target.value)}
                  placeholder="Official Speech / Project Inauguration Video"
                  className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs focus:ring-2 focus:ring-primary/50 focus:outline-none text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={ytTags}
                    onChange={(e) => setYtTags(e.target.value)}
                    placeholder="mla, speech, development"
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs focus:ring-2 focus:ring-primary/50 focus:outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Visibility
                  </label>
                  <select
                    value={ytPrivacy}
                    onChange={(e) => setYtPrivacy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs focus:ring-2 focus:ring-primary/50 focus:outline-none text-foreground"
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
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Compatibility Notices:</span>
              </div>
              {warnings.map((w, i) => (
                <p key={i} className="text-[11px] pl-5">• {w}</p>
              ))}
            </div>
          )}

          {/* Schedule & Compliance Section */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Schedule Broadcast (Asia/Kolkata)
                </span>
              </div>
              <input
                type="checkbox"
                checked={isScheduledMode}
                onChange={(e) => setIsScheduledMode(e.target.checked)}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
            </div>

            {isScheduledMode && (
              <div>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-xs text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                />
              </div>
            )}

            {/* Political & AI Compliance */}
            <div className="pt-2 border-t border-border flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={isAiGenerated}
                  onChange={(e) => setIsAiGenerated(e.target.checked)}
                  className="w-3.5 h-3.5 accent-purple-600 rounded"
                />
                <span className="text-[11px]">Mark as AI-Assisted / Altered</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
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
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePublish}
              disabled={publishing || accounts.length === 0}
              className="rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md gap-2"
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
            </Button>
          </div>
        </div>

        {/* Right: Interactive Live Smartphone Mockup */}
        <div className="w-full md:w-96 bg-muted/30 p-6 border-t md:border-t-0 md:border-l border-border flex flex-col items-center justify-between shrink-0">
          <div className="w-full flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Smartphone className="w-4 h-4 text-primary" />
              <span>Live Post Mockup</span>
            </div>
            {/* Toggle Preview Platform */}
            <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-border shadow-sm">
              <button
                type="button"
                onClick={() => setPreviewPlatform("INSTAGRAM")}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  previewPlatform === "INSTAGRAM"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Instagram Preview"
              >
                <Instagram className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewPlatform("FACEBOOK")}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  previewPlatform === "FACEBOOK"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Facebook Preview"
              >
                <Facebook className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Smartphone Frame */}
          <div className="w-full max-w-[280px] bg-card rounded-[32px] border-[6px] border-border/80 shadow-2xl overflow-hidden flex flex-col my-auto">
            {/* Mockup Top Notch */}
            <div className="h-4 bg-border flex items-center justify-center">
              <div className="w-12 h-1.5 bg-muted rounded-full" />
            </div>

            {/* Mockup Header */}
            <div className="p-3 border-b border-border/60 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-black text-[10px] flex items-center justify-center">
                M
              </div>
              <div className="leading-tight">
                <p className="text-[11px] font-bold text-foreground">
                  MLA Official
                </p>
                <p className="text-[9px] text-muted-foreground">
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
              <div className="w-full aspect-square bg-muted overflow-hidden relative">
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
              <div className="w-full aspect-[4/3] bg-muted/40 border-y border-border flex flex-col items-center justify-center text-muted-foreground text-[10px] p-4 text-center">
                <ImageIcon className="w-6 h-6 mb-1 opacity-40" />
                Text-Only Announcement
              </div>
            )}

            {/* Mockup Caption */}
            <div className="p-3 text-[11px] text-foreground leading-snug break-words max-h-32 overflow-y-auto">
              <span className="font-bold mr-1">mlaofficial</span>
              {content || (
                <span className="text-muted-foreground italic">
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

          <p className="text-[10px] text-muted-foreground mt-3 text-center">
            Decoupled provider queue ready.
          </p>
        </div>
      </div>
    </div>
  );
};
