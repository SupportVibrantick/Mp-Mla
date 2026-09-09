import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import { useSystemSettings } from "@/contexts/SettingsContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDepartments } from "@/hooks/useDepartments";
import {
  Building2,
  Mail,
  Phone,
  User as UserIcon,
  Shield,
  Pencil,
  RefreshCw,
  Sparkles,
  Award,
  Globe,
  MapPin,
  Calendar,
  CheckCircle2,
  Briefcase,
  Layers,
  Crown,
  Flag,
  Activity,
  UserCheck,
  Camera,
  Copy,
  Check,
  Search,
  Key,
  Laptop,
  Lock,
  ExternalLink,
  ShieldCheck,
  Upload,
} from "lucide-react";

// Helper for rendering political party emblem
function getPartyEmblem(
  partyName?: string | null,
  partyLogoUrl?: string | null,
) {
  const fullPartyLogoUrl = getImageUrl(partyLogoUrl);
  if (fullPartyLogoUrl) {
    return (
      <img
        src={fullPartyLogoUrl}
        alt={partyName || "Party Symbol"}
        className="h-16 w-16 object-contain rounded-2xl bg-white p-2 border border-border shadow-md shrink-0"
      />
    );
  }

  const name = (partyName || "").toUpperCase();
  if (
    name.includes("BJP") ||
    name.includes("BHARATIYA") ||
    name.includes("JANATA")
  ) {
    return (
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 flex flex-col items-center justify-center text-white shadow-lg shrink-0 border border-amber-300/40">
        <Sparkles className="h-7 w-7 text-white" />
        <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">
          BJP
        </span>
      </div>
    );
  }

  if (name.includes("CONGRESS") || name.includes("INC")) {
    return (
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-blue-600 flex flex-col items-center justify-center text-white shadow-lg shrink-0 border border-teal-300/40">
        <Flag className="h-7 w-7 text-white" />
        <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">
          INC
        </span>
      </div>
    );
  }

  if (name.includes("AAP") || name.includes("AAM")) {
    return (
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex flex-col items-center justify-center text-white shadow-lg shrink-0 border border-cyan-300/40">
        <Award className="h-7 w-7 text-white" />
        <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">
          AAP
        </span>
      </div>
    );
  }

  return (
    <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-primary to-blue-600 flex flex-col items-center justify-center text-white shadow-lg shrink-0 border border-primary/30">
      <Flag className="h-7 w-7 text-white" />
      <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">
        PARTY
      </span>
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { settings } = useSystemSettings();
  const { data: deptRes, isLoading: deptLoading } = useDepartments();
  const departments = deptRes?.data || [];

  const [activeTab, setActiveTab] = useState("overview");
  const [deptSearchQuery, setDeptSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Form State
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    designation: user?.designation || "",
    bio: user?.bio || "",
    avatarUrl: user?.avatarUrl || "",
  });

  const activeDepartments = departments.filter((d: any) => {
    const isAct = d.isActive !== false;
    if (!isAct) return false;
    if (!deptSearchQuery.trim()) return true;
    const q = deptSearchQuery.toLowerCase();
    return (
      (d.name || "").toLowerCase().includes(q) ||
      (d.code || "").toLowerCase().includes(q) ||
      (d.description || "").toLowerCase().includes(q)
    );
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshUser();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleOpenEdit = () => {
    setFormData({
      name: user?.name || "",
      phone: user?.phone || "",
      designation: user?.designation || "",
      bio: user?.bio || "",
      avatarUrl: user?.avatarUrl || "",
    });
    setUpdateError(null);
    setEditDialogOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setUpdateError(null);
    try {
      await authApi.updateMe(formData);
      await refreshUser();
      setSuccessMsg("Profile details updated successfully!");
      setEditDialogOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setUpdateError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update profile",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const tenant = user?.tenant;
  const subscription = tenant?.subscription;
  const plan = subscription?.plan;

  // Image URLs resolved via getImageUrl helper
  const validAvatarUrl = getImageUrl(
    user?.avatarUrl || tenant?.representativePhoto,
  );
  const partyLogoSrc = getImageUrl(
    tenant?.partyLogoUrl || settings?.party_logo_url,
  );
  const repPhotoSrc = getImageUrl(tenant?.representativePhoto);

  return (
    <MainLayout title="My Profile">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Toast / Success Notice Banner */}
        {successMsg && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold text-sm animate-in fade-in slide-in-from-top-2 shadow-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Premium Cover Banner & Profile Identity Card */}
        <Card className="border border-border/60 shadow-2xl overflow-hidden rounded-[36px] bg-card relative">
          {/* Header Cover Ambient Mesh Gradient */}
          <div className="h-56 bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400/25 via-indigo-500/10 to-transparent" />
            <div className="absolute -left-12 -top-12 w-72 h-72 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-24 -bottom-12 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Top Right Cover Badge: Tenant Political Party Emblem */}
            <div className="absolute right-6 top-5 flex items-center bg-white/10 backdrop-blur-xl border border-white/20 p-2 rounded-2xl shadow-2xl hover:scale-105 transition-all duration-300">
              {partyLogoSrc ? (
                <img
                  src={partyLogoSrc}
                  alt={tenant?.partyName || "Party Emblem"}
                  className="h-11 w-11 object-contain bg-white rounded-xl p-1 shadow-md shrink-0 border border-white/40"
                />
              ) : (
                <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 border border-amber-300/50 flex items-center justify-center text-white font-extrabold shadow-md shrink-0">
                  <Flag className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Profile Card Body */}
          <div className="px-8 pb-8 pt-0 relative">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-8">
              {/* Avatar + Identity Block */}
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
                <div className="relative shrink-0 -mt-20 group cursor-pointer" onClick={handleOpenEdit}>
                  <Avatar className="w-40 h-40 border-4 border-background shadow-2xl rounded-[36px] overflow-hidden bg-muted ring-4 ring-primary/10 transition-transform duration-300 group-hover:scale-[1.02]">
                    <AvatarImage
                      src={validAvatarUrl}
                      alt={user?.name || "User Profile"}
                      className="object-cover h-full w-full"
                    />
                    <AvatarFallback className="text-4xl font-extrabold bg-primary/10 text-primary">
                      {user?.name
                        ? user.name.substring(0, 2).toUpperCase()
                        : "US"}
                    </AvatarFallback>
                  </Avatar>
                  {/* Camera overlay indicator */}
                  <div className="absolute inset-0 rounded-[36px] bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white border-4 border-background">
                    <Camera className="h-8 w-8 text-white drop-shadow-md" />
                  </div>
                  <span className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-emerald-500 border-2 border-background shadow-md ring-4 ring-emerald-500/20 animate-pulse" />
                </div>

                <div className="space-y-2 pb-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-2">
                      {user?.name || "System Administrator"}
                      <ShieldCheck className="h-6 w-6 text-primary fill-primary/10" />
                    </h1>
                    <Badge className="bg-gradient-to-r from-primary to-indigo-600 text-white font-extrabold text-[11px] px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md border border-white/10">
                      {user?.role?.replace("_", " ") || "SYSTEM ADMIN"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-xl text-xs font-bold border border-primary/20">
                      <Briefcase className="h-3.5 w-3.5 shrink-0" />
                      {user?.designation || "Constituency Official"}
                    </span>
                    <span className="flex items-center gap-1.5 bg-muted/60 text-foreground px-3 py-1 rounded-xl text-xs font-semibold border border-border/50">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {tenant?.name || "MP/MLA Constituency Platform"}
                    </span>
                    {tenant?.constituencyName && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        {tenant.constituencyName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-2.5 w-full md:w-auto pb-1 flex-wrap">
                <Button
                  onClick={handleCopyId}
                  variant="outline"
                  size="sm"
                  className="rounded-2xl border-border/70 hover:bg-muted/60 font-semibold px-3.5 shadow-sm text-xs"
                >
                  {copiedId ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                      Copied ID
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      Copy User ID
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleManualRefresh}
                  variant="outline"
                  size="sm"
                  disabled={isRefreshing}
                  className="rounded-2xl border-border/70 hover:bg-muted/60 font-semibold px-4 shadow-sm text-xs"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
                  />
                  Refresh
                </Button>
                <Button
                  onClick={handleOpenEdit}
                  className="rounded-2xl font-bold shadow-lg bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-primary-foreground px-5 text-xs"
                  size="sm"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit Profile
                </Button>
              </div>
            </div>

            {/* Quick Metrics Bar Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-border/60">
              <div className="flex items-center gap-3.5 p-4 rounded-[22px] bg-muted/20 border border-border/50 hover:border-primary/30 transition-all duration-300 group">
                <div className="bg-primary/10 p-3 rounded-2xl text-primary shrink-0 group-hover:scale-110 transition-transform">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-[10px] uppercase font-extrabold tracking-widest">
                    Email Address
                  </p>
                  <p className="font-bold text-xs sm:text-sm truncate mt-0.5">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-4 rounded-[22px] bg-muted/20 border border-border/50 hover:border-primary/30 transition-all duration-300 group">
                <div className="bg-primary/10 p-3 rounded-2xl text-primary shrink-0 group-hover:scale-110 transition-transform">
                  <Phone className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-[10px] uppercase font-extrabold tracking-widest">
                    Contact Phone
                  </p>
                  <p className="font-bold text-xs sm:text-sm truncate mt-0.5">
                    {user?.phone || "9999900001"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-4 rounded-[22px] bg-muted/20 border border-border/50 hover:border-emerald-500/30 transition-all duration-300 group">
                <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                  <Shield className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-[10px] uppercase font-extrabold tracking-widest">
                    Account Status
                  </p>
                  <p className="font-extrabold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 uppercase mt-0.5">
                    {user?.status || "ACTIVE"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-4 rounded-[22px] bg-muted/20 border border-border/50 hover:border-blue-500/30 transition-all duration-300 group">
                <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-[10px] uppercase font-extrabold tracking-widest">
                    Member Since
                  </p>
                  <p className="font-bold text-xs sm:text-sm truncate mt-0.5">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        })
                      : "Sept 2026"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabbed Navigation Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/40 p-1.5 rounded-2xl border border-border/50 h-auto grid grid-cols-2 md:grid-cols-4 gap-1 max-w-3xl">
            <TabsTrigger
              value="overview"
              className="rounded-xl py-2.5 text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md transition-all flex items-center justify-center gap-2"
            >
              <UserIcon className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="political"
              className="rounded-xl py-2.5 text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Flag className="h-4 w-4" />
              <span>Political & Leadership</span>
            </TabsTrigger>
            <TabsTrigger
              value="departments"
              className="rounded-xl py-2.5 text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Layers className="h-4 w-4" />
              <span>Departments ({activeDepartments.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="rounded-xl py-2.5 text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Activity className="h-4 w-4" />
              <span>Security & Activity</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Personal Information Card */}
              <Card className="lg:col-span-2 rounded-[28px] border border-border/60 shadow-sm p-6 space-y-6 bg-card">
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2.5 rounded-2xl text-primary">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg">Personal Record Information</h3>
                      <p className="text-xs text-muted-foreground">
                        Official personal profile and contact attributes
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-extrabold rounded-full px-3 py-1 bg-primary/5 border-primary/20 text-primary">
                    Verified User
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">
                      Full Display Name
                    </p>
                    <p className="font-extrabold text-foreground text-base">
                      {user?.name || "System Administrator"}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">
                      Role Title / Designation
                    </p>
                    <p className="font-semibold text-foreground text-base">
                      {user?.designation || "Constituency Official"}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">
                      Assigned Department
                    </p>
                    <p className="font-semibold text-foreground text-base">
                      {user?.departmentRef?.name || user?.department || "General Administration"}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">
                      System Security Role
                    </p>
                    <p className="font-extrabold text-primary uppercase text-base">
                      {user?.role?.replace("_", " ") || "SYSTEM ADMIN"}
                    </p>
                  </div>
                </div>

                {user?.bio && (
                  <div className="p-5 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
                    <p className="text-[11px] text-muted-foreground font-extrabold uppercase tracking-wider">
                      Official Biography / Remarks
                    </p>
                    <p className="text-xs text-foreground leading-relaxed font-medium">
                      {user.bio}
                    </p>
                  </div>
                )}
              </Card>

              {/* Right Column: Quick Security & Subscription Card */}
              <div className="space-y-6 lg:col-span-1">
                <Card className="rounded-[28px] border border-border/60 shadow-sm p-6 space-y-4 bg-gradient-to-b from-primary/[0.03] to-background">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <Crown className="h-5 w-5 text-amber-500" />
                      Subscription Plan
                    </h3>
                    <Badge
                      variant="secondary"
                      className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold border-amber-500/20 px-3 py-0.5 rounded-full"
                    >
                      {plan?.name || "Enterprise Plan"}
                    </Badge>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/40">
                      <span className="text-muted-foreground font-semibold">Plan Status</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">
                        {subscription?.status || "ACTIVE"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/40">
                      <span className="text-muted-foreground font-semibold">User Quota Limit</span>
                      <span className="font-bold text-foreground">
                        {plan?.maxUsers && plan.maxUsers > 0 ? `${plan.maxUsers} Users` : "Unlimited Users"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/40">
                      <span className="text-muted-foreground font-semibold">Voter Quota Limit</span>
                      <span className="font-bold text-foreground">
                        {plan?.maxVoters && plan.maxVoters > 0 ? `${plan.maxVoters.toLocaleString()} Voters` : "Unlimited Voters"}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: POLITICAL & LEADERSHIP */}
          <TabsContent value="political" className="space-y-6">
            <Card className="rounded-[28px] border border-border/60 shadow-md p-6 space-y-6 bg-card">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-500/10 p-2.5 rounded-2xl text-amber-500">
                    <Flag className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg">Political Party & Leadership</h3>
                    <p className="text-xs text-muted-foreground">
                      Public constituency leadership, political affiliation, and representative records.
                    </p>
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 font-bold px-3 py-1 text-xs rounded-full">
                  {tenant?.partyName || "Official Party Affiliation"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Party Emblem Block */}
                <div className="flex items-center gap-5 p-6 rounded-[24px] bg-gradient-to-br from-amber-500/5 via-muted/30 to-background border border-amber-500/20 shadow-sm">
                  {getPartyEmblem(
                    tenant?.partyName || settings?.org_name,
                    tenant?.partyLogoUrl || settings?.party_logo_url,
                  )}
                  <div className="space-y-1">
                    <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">
                      Political Affiliation
                    </p>
                    <p className="font-black text-xl text-foreground leading-snug">
                      {tenant?.partyName || tenant?.name || settings?.org_name || "Official Party"}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      Registered Party Emblem & Affiliation
                    </p>
                  </div>
                </div>

                {/* Elected Representative Spotlight */}
                <div className="flex items-center gap-5 p-6 rounded-[24px] bg-muted/30 border border-border/50 shadow-sm">
                  {repPhotoSrc ? (
                    <img
                      src={repPhotoSrc}
                      alt={tenant?.representativeName || "Representative"}
                      className="h-16 w-16 object-cover rounded-2xl border-2 border-primary/30 shadow-md shrink-0 bg-white"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 text-white flex flex-col items-center justify-center text-xl font-extrabold border border-primary/30 shadow-md shrink-0">
                      <UserCheck className="h-7 w-7 text-white" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      Elected Representative
                    </p>
                    <p className="font-extrabold text-lg text-foreground leading-snug">
                      {tenant?.representativeName || "Shri Mayank Goyal"}
                    </p>
                    <p className="text-xs text-primary font-bold">
                      {tenant?.representativeTitle || "Member of Parliament / Assembly"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Term: 2024 – 2029</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 3: DEPARTMENTS */}
          <TabsContent value="departments" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border/60">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search department by name or code..."
                  value={deptSearchQuery}
                  onChange={(e) => setDeptSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-xl text-xs bg-muted/30 border-border/60"
                />
              </div>
              <Badge variant="secondary" className="font-extrabold text-xs px-3.5 py-1.5 rounded-full shrink-0">
                {activeDepartments.length} Active Departments
              </Badge>
            </div>

            {deptLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-36 bg-muted animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : activeDepartments.length === 0 ? (
              <Card className="border-dashed bg-transparent shadow-none rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-2">
                  <Building2 className="h-12 w-12 opacity-20" />
                  <p className="font-semibold">No departments found matching search criteria.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeDepartments.map((dept: any) => (
                  <Card
                    key={dept.id}
                    className="hover:shadow-xl transition-all duration-300 border border-border/60 rounded-[24px] overflow-hidden hover:-translate-y-0.5 bg-card"
                  >
                    <div className="h-1.5 bg-gradient-to-r from-primary to-indigo-600" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex justify-between items-start">
                        <span className="truncate pr-2 font-bold">{dept.name}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-extrabold bg-primary/5 border-primary/20 text-primary shrink-0"
                        >
                          {dept.code}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                        {dept.description || "No description provided."}
                      </p>

                      <div className="space-y-1.5 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <UserIcon className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                          <span className="truncate font-medium">
                            {dept.headName || "No Department Head Assigned"}
                          </span>
                        </div>
                        {dept.headPhone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                            <span>{dept.headPhone}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 4: SECURITY & ACTIVITY */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Login Session Activity */}
              <Card className="rounded-[28px] border border-border/60 shadow-sm p-6 space-y-5 bg-card">
                <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                  <div className="bg-primary/10 p-2.5 rounded-2xl text-primary">
                    <Laptop className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base">Active Session & Activity</h3>
                    <p className="text-xs text-muted-foreground">Current user session details</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/40">
                    <span className="text-muted-foreground font-semibold">Last Session Login</span>
                    <span className="font-mono font-bold text-foreground">
                      {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-IN") : "Active Session Online"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/40">
                    <span className="text-muted-foreground font-semibold">Account Status Token</span>
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold border-emerald-500/20 px-3 py-0.5">
                      {user?.status || "ACTIVE"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/40">
                    <span className="text-muted-foreground font-semibold">Authentication Protocol</span>
                    <span className="font-bold text-foreground">JWT Secure Bearer</span>
                  </div>
                </div>
              </Card>

              {/* Security Status */}
              <Card className="rounded-[28px] border border-border/60 shadow-sm p-6 space-y-5 bg-card">
                <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                  <div className="bg-emerald-500/10 p-2.5 rounded-2xl text-emerald-500">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base">Security & Access Control</h3>
                    <p className="text-xs text-muted-foreground">Account security compliance status</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="font-bold text-foreground">Password Encrypted</span>
                    </div>
                    <span className="text-muted-foreground font-mono">Bcrypt Salted</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="font-bold text-foreground">Tenant Isolated Access</span>
                    </div>
                    <span className="text-muted-foreground font-mono">Enforced</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Profile Dialog Modal */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Personal Profile
            </DialogTitle>
            <DialogDescription>
              Update your personal display details and contact information.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
            {updateError && (
              <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold">
                {updateError}
              </div>
            )}

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/40 border border-border/40">
              <Avatar className="w-16 h-16 border-2 border-primary/30 rounded-2xl shrink-0">
                <AvatarImage src={getImageUrl(formData.avatarUrl)} alt="Preview" />
                <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                  {formData.name
                    ? formData.name.substring(0, 2).toUpperCase()
                    : "US"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2 flex-1 min-w-0">
                <div>
                  <Label className="text-xs font-bold block mb-0.5">Profile Photo</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Upload a JPG, PNG or WEBP image (max 5MB)
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Label
                    htmlFor="avatar-file-input"
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload Photo
                  </Label>
                  <input
                    id="avatar-file-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          setUpdateError("Image size must be less than 5MB");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData((prev) => ({
                            ...prev,
                            avatarUrl: reader.result as string,
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  {formData.avatarUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData((prev) => ({ ...prev, avatarUrl: "" }))}
                      className="text-xs h-7 px-2.5 rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-xs font-bold">
                Full Name *
              </Label>
              <Input
                id="edit-name"
                required
                placeholder="Your full name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="text-xs font-bold">
                  Phone Number
                </Label>
                <Input
                  id="edit-phone"
                  placeholder="9999900001"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-designation" className="text-xs font-bold">
                  Designation / Role Title
                </Label>
                <Input
                  id="edit-designation"
                  placeholder="Constituency Official"
                  value={formData.designation}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      designation: e.target.value,
                    }))
                  }
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bio" className="text-xs font-bold">
                Biography / Remarks
              </Label>
              <Textarea
                id="edit-bio"
                rows={3}
                placeholder="Short description or office role notes..."
                value={formData.bio}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bio: e.target.value }))
                }
                className="rounded-xl text-xs"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="rounded-2xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-primary text-primary-foreground font-bold"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

