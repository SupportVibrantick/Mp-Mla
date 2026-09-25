import React, { useState, useEffect } from "react";
import {
  X,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Lock,
  Globe,
  Loader2,
  Users,
} from "lucide-react";
import { socialApi } from "../../lib/api";

interface SocialAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialConnectionId?: string | null;
  initialProvider?: string | null;
}

const PLATFORMS = [
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    color: "from-blue-600 to-indigo-700",
    badge: "Official Pages",
    description: "Connect your official Facebook Page to publish updates, citizen news, multi-image carousels, and videos.",
    features: ["Facebook Page Posts & Albums", "Multi-Image Carousels", "Official Page Reach"],
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    color: "from-pink-500 via-purple-600 to-amber-500",
    badge: "Reels & Media",
    description: "Connect your Instagram Professional or Creator account to broadcast Reels, carousels, and high-impact media.",
    features: ["Instagram Reels & Video", "Single & Carousel Posts", "Official Creator Reach"],
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: Twitter,
    color: "from-slate-900 to-black",
    badge: "Instant Reach",
    description: "Connect your official public handle to broadcast real-time civic announcements, tweets, and photo updates.",
    features: ["280-Character Announcements", "Media Attachments", "Direct Citizen Reach"],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: Linkedin,
    color: "from-blue-700 to-indigo-800",
    badge: "Professional",
    description: "Broadcast policy achievements, development whitepapers, and administrative milestones to your network.",
    features: ["Governance & Policy Reports", "Professional Network Engagement", "Secure OAuth 2.0"],
  },
];

export const SocialAccountsModal: React.FC<SocialAccountsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialConnectionId,
  initialProvider,
}) => {
  const [step, setStep] = useState<"SELECT_PLATFORM" | "CONFIRM_REDIRECT" | "DISCOVERED_RESOURCES">(
    initialConnectionId ? "DISCOVERED_RESOURCES" : "SELECT_PLATFORM"
  );
  const [selectedPlatform, setSelectedPlatform] = useState<string>("facebook");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discovered Resources State
  const [connectionId, setConnectionId] = useState<string | null>(initialConnectionId || null);
  const [discoveredResources, setDiscoveredResources] = useState<any[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialConnectionId) {
        setConnectionId(initialConnectionId);
        const providerToUse = initialProvider || "facebook";
        setSelectedPlatform(providerToUse);
        loadDiscoveredResources(providerToUse, initialConnectionId);
      } else {
        setStep("SELECT_PLATFORM");
        setConnectionId(null);
        setDiscoveredResources([]);
        setSelectedResourceIds([]);
        setError(null);
      }
    }
  }, [isOpen, initialConnectionId, initialProvider]);

  const loadDiscoveredResources = async (provider: string, connId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await socialApi.getDiscoveredResources(provider, connId);
      if (res.data?.success) {
        const list = res.data.data?.resources || [];
        setDiscoveredResources(list);
        setSelectedResourceIds(list.map((r: any) => r.id));
        setStep("DISCOVERED_RESOURCES");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load discovered channels.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentPlatformObj = PLATFORMS.find((p) => p.id === selectedPlatform) || PLATFORMS[0];

  const handleStartOAuth = async () => {
    try {
      setRedirecting(true);
      setError(null);
      const res = await socialApi.startOAuth(selectedPlatform);
      if (res.data?.success && res.data.data?.authUrl) {
        // Redirect to provider OAuth URL
        window.location.href = res.data.data.authUrl;
      } else {
        throw new Error("Unable to retrieve authorization URL.");
      }
    } catch (err: any) {
      setRedirecting(false);
      setError(err.response?.data?.message || err.message || "Failed to initiate OAuth.");
    }
  };

  const toggleResource = (id: string) => {
    if (selectedResourceIds.includes(id)) {
      setSelectedResourceIds(selectedResourceIds.filter((r) => r !== id));
    } else {
      setSelectedResourceIds([...selectedResourceIds, id]);
    }
  };

  const handleActivateResources = async () => {
    if (!connectionId || selectedResourceIds.length === 0) {
      setError("Please select at least one channel to connect.");
      return;
    }

    try {
      setActivating(true);
      setError(null);
      const providerToUse = initialProvider || selectedPlatform;
      const res = await socialApi.selectResources(providerToUse, {
        connectionId,
        resourceIds: selectedResourceIds,
      });

      if (res.data?.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to activate channels.");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {step === "DISCOVERED_RESOURCES"
                  ? "Choose Channels to Connect"
                  : "Connect Official Social Channels"}
              </h3>
              <p className="text-xs text-slate-500">
                {step === "DISCOVERED_RESOURCES"
                  ? "Select which discovered pages and profiles to activate on your dashboard."
                  : "Secure 1-Click OAuth authorization without manual API keys or secrets."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* STEP 1: Select Platform */}
          {step === "SELECT_PLATFORM" && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Select Network
              </label>

              <div className="grid grid-cols-1 gap-3">
                {PLATFORMS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPlatform(p.id);
                        setStep("CONFIRM_REDIRECT");
                      }}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-orange-500 dark:hover:border-orange-500 bg-white dark:bg-slate-800/60 hover:bg-orange-50/30 dark:hover:bg-orange-950/20 transition-all cursor-pointer group flex items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white bg-gradient-to-tr ${p.color} shrink-0 shadow-md`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                              {p.name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                              {p.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            {p.description}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold group-hover:bg-orange-600 group-hover:text-white transition-all shrink-0 flex items-center gap-1.5"
                      >
                        Connect
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: OAuth Redirect Confirmation */}
          {step === "CONFIRM_REDIRECT" && (
            <div className="space-y-6 text-center py-2">
              <div
                className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center text-white bg-gradient-to-tr ${currentPlatformObj.color} shadow-xl shadow-orange-500/10`}
              >
                <currentPlatformObj.icon className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Connect {currentPlatformObj.name}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  You will be securely redirected to {currentPlatformObj.name.split(" ")[0]} to log in and authorize your official representative account.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-left space-y-2.5 max-w-md mx-auto text-xs">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Zero password or token sharing required</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>AES-256-GCM server-side encryption vault</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Disconnect anytime with 1-click</span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep("SELECT_PLATFORM")}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={redirecting}
                  onClick={handleStartOAuth}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {redirecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirecting to {currentPlatformObj.name.split(" ")[0]}...
                    </>
                  ) : (
                    <>
                      Continue to {currentPlatformObj.name.split(" ")[0]}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Discovered Resources Selection */}
          {step === "DISCOVERED_RESOURCES" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Discovered Channels ({discoveredResources.length} Available)
                </label>
                <span className="text-xs text-orange-600 font-bold">
                  {selectedResourceIds.length} Selected
                </span>
              </div>

              {discoveredResources.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-500">
                  No eligible pages or channels found under this authorization.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto">
                  {discoveredResources.map((res) => {
                    const isSelected = selectedResourceIds.includes(res.id);
                    return (
                      <div
                        key={res.id}
                        onClick={() => toggleResource(res.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-orange-50/60 dark:bg-orange-950/30 border-orange-500 shadow-sm"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                {res.name}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                                {res.platform}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {res.username || res.type}
                              {res.followersCount ? ` • ${res.followersCount.toLocaleString()} followers` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={activating || selectedResourceIds.length === 0}
                  onClick={handleActivateResources}
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/25 transition-all disabled:opacity-50"
                >
                  {activating
                    ? "Activating Channels..."
                    : `Connect ${selectedResourceIds.length} Selected Channel(s)`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
