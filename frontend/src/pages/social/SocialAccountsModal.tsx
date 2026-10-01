import React, { useState, useEffect } from "react";
import {
  X,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Linkedin,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { socialApi } from "../../lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SocialAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialConnectionId?: string | null;
  initialProvider?: string | null;
}

const PLATFORMS = [
  {
    id: "INSTAGRAM",
    name: "Instagram Professional",
    icon: Instagram,
    color: "from-purple-600 to-pink-500",
    description: "Official representative profile or business account",
    badge: "Official API",
  },
  {
    id: "FACEBOOK",
    name: "Facebook Page",
    icon: Facebook,
    color: "from-blue-600 to-blue-700",
    description: "Official public MP/MLA constituent page",
    badge: "Graph API v19",
  },
  {
    id: "LINKEDIN",
    name: "LinkedIn Organization",
    icon: Linkedin,
    color: "from-blue-700 to-cyan-800",
    description: "Professional profile or official office page",
    badge: "Community API",
  },
];

export const SocialAccountsModal: React.FC<SocialAccountsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialConnectionId,
  initialProvider,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"SELECT_PLATFORM" | "CONFIRM_REDIRECT" | "DISCOVERED_RESOURCES">("SELECT_PLATFORM");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("INSTAGRAM");
  const [redirecting, setRedirecting] = useState(false);
  const [discoveredResources, setDiscoveredResources] = useState<any[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialConnectionId && initialProvider) {
      setStep("DISCOVERED_RESOURCES");
      fetchDiscoveredResources(initialConnectionId, initialProvider);
    } else {
      setStep("SELECT_PLATFORM");
    }
  }, [initialConnectionId, initialProvider, isOpen]);

  if (!isOpen) return null;

  const currentPlatformObj = PLATFORMS.find((p) => p.id === selectedPlatform) || PLATFORMS[0];

  const fetchDiscoveredResources = async (connId: string, provider: string) => {
    try {
      const res = await socialApi.getDiscoveredResources(provider, connId);
      if (res.data?.success) {
        setDiscoveredResources(res.data.data || []);
        setSelectedResourceIds((res.data.data || []).map((r: any) => r.id));
      }
    } catch (err: any) {
      console.error("Failed to load discovered channels:", err);
      setError("Failed to load channel list from OAuth provider.");
    }
  };

  const handleStartOAuth = async () => {
    try {
      setRedirecting(true);
      setError(null);
      const res = await socialApi.startOAuth(selectedPlatform);
      if (res.data?.success && res.data.authUrl) {
        window.location.href = res.data.authUrl;
      } else {
        setError("Failed to generate OAuth redirect link.");
      }
    } catch (err: any) {
      console.error("OAuth init failed:", err);
      setError(err.response?.data?.message || "Failed to connect with provider.");
    } finally {
      setRedirecting(false);
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
    if (!initialConnectionId || !initialProvider || selectedResourceIds.length === 0) return;
    try {
      setActivating(true);
      setError(null);
      const res = await socialApi.selectResources(initialProvider, {
        connectionId: initialConnectionId,
        resourceIds: selectedResourceIds,
      });

      if (res.data?.success) {
        toast({
          title: "Channels Connected Successfully! 🎉",
          description: "Your official social media channels are ready for 1-click broadcasts.",
          className: "bg-emerald-600 text-white font-bold",
        });
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
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-[28px] w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {step === "DISCOVERED_RESOURCES"
                  ? "Choose Channels to Connect"
                  : "Connect Official Social Channels"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {step === "DISCOVERED_RESOURCES"
                  ? "Select which discovered pages and profiles to activate on your dashboard."
                  : "Secure 1-Click OAuth authorization without manual API keys or secrets."}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* STEP 1: Select Platform */}
          {step === "SELECT_PLATFORM" && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
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
                      className="p-4 rounded-2xl border border-border hover:border-primary/50 bg-card hover:bg-muted/40 transition-all cursor-pointer group flex items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white bg-gradient-to-tr ${p.color} shrink-0 shadow-md`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                              {p.name}
                            </h4>
                            <Badge variant="secondary" className="px-2 py-0.5 text-[10px] font-bold rounded-full">
                              {p.badge}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {p.description}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="rounded-xl text-xs font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0 gap-1.5"
                      >
                        Connect
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
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
                className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center text-white bg-gradient-to-tr ${currentPlatformObj.color} shadow-xl`}
              >
                <currentPlatformObj.icon className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Connect {currentPlatformObj.name}
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
                  You will be securely redirected to {currentPlatformObj.name.split(" ")[0]} to log in and authorize your official representative account.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/30 border border-border text-left space-y-2.5 max-w-md mx-auto text-xs">
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("SELECT_PLATFORM")}
                  className="rounded-xl text-xs font-semibold"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={redirecting}
                  onClick={handleStartOAuth}
                  className="rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md gap-2"
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
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Discovered Resources Selection */}
          {step === "DISCOVERED_RESOURCES" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Discovered Channels ({discoveredResources.length} Available)
                </label>
                <span className="text-xs text-primary font-bold">
                  {selectedResourceIds.length} Selected
                </span>
              </div>

              {discoveredResources.length === 0 ? (
                <div className="p-8 rounded-2xl bg-muted/30 text-center text-xs text-muted-foreground">
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
                            ? "bg-primary/10 border-primary shadow-sm"
                            : "bg-card border-border opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 accent-primary rounded cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-foreground">
                                {res.name}
                              </h4>
                              <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-bold rounded-full">
                                {res.platform}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
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
                  disabled={activating || selectedResourceIds.length === 0}
                  onClick={handleActivateResources}
                  className="rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md"
                >
                  {activating
                    ? "Activating Channels..."
                    : `Connect ${selectedResourceIds.length} Selected Channel(s)`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
