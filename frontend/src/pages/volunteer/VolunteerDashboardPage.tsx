import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { volunteerApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import {
  Users,
  UserCheck,
  UserPlus,
  MapPin,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Clock,
  Sparkles,
  Layers,
  FileText,
  Calendar,
  Building,
  ArrowRight,
  ShieldCheck,
  Phone,
  Hash,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Users2,
} from "lucide-react";

interface FamilyMemberEntry {
  id: string;
  name: string;
  relationType: string;
  gender: "MALE" | "FEMALE" | "TRANSGENDER";
  age: string;
  phone: string;
  voterIdNumber: string;
  isDependent: boolean;
}

interface AssignedWard {
  assignmentId: string;
  wardId: string;
  wardNumber: number;
  name: string;
  zone?: string | null;
  totalWardVoters: number;
  areas: Array<{ id: string; name: string }>;
  booths?: Array<{ id: string; boothNumber: number; boothName: string }>;
}

export default function VolunteerDashboardPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Voter registration form state
  const [formData, setFormData] = useState({
    wardId: "",
    wardAreaId: "",
    voterIdNumber: "",
    slNo: "",
    sectionNo: "",
    boothNo: "",
    name: "",
    relativeName: "",
    relationType: "FATHER",
    gender: "MALE" as "MALE" | "FEMALE" | "TRANSGENDER" | "OTHER",
    age: "",
    houseNo: "",
    address: "",
    locality: "",
    phone: "",
    bloodGroup: "",
    isDisabled: false,
    isOurVoter: false,
    voterLeaning: "UNKNOWN",
    voterCadreNotes: "",
    submissionNotes: "",
  });

  const [familyMembers, setFamilyMembers] = useState<FamilyMemberEntry[]>([]);

  const addFamilyMember = () => {
    setFamilyMembers((prev) => [
      ...prev,
      {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `fm-${Date.now()}-${Math.random()}`,
        name: "",
        relationType: "SPOUSE",
        gender: "FEMALE",
        age: "",
        phone: "",
        voterIdNumber: "",
        isDependent: false,
      },
    ]);
  };

  const removeFamilyMember = (id: string) => {
    setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const updateFamilyMember = (id: string, field: keyof FamilyMemberEntry, value: any) => {
    setFamilyMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const [lastRegisteredVoter, setLastRegisteredVoter] = useState<any | null>(null);

  // Submissions search & filter
  const [submissionsSearch, setSubmissionsSearch] = useState("");
  const [submissionsWardFilter, setSubmissionsWardFilter] = useState("ALL");
  const [submissionsPage, setSubmissionsPage] = useState(1);

  // 1. Fetch Dashboard Overview
  const { data: dashboardRes, isLoading: dashboardLoading } = useQuery({
    queryKey: ["volunteer-me-dashboard"],
    queryFn: async () => {
      const res = await volunteerApi.getMyDashboard();
      return res.data?.data;
    },
  });

  // 2. Fetch Assigned Wards
  const { data: wardsRes, isLoading: wardsLoading } = useQuery({
    queryKey: ["volunteer-me-wards"],
    queryFn: async () => {
      const res = await volunteerApi.getMyWards();
      return res.data?.data;
    },
  });

  const assignedWards: AssignedWard[] = useMemo(() => {
    return wardsRes || dashboardRes?.assignedWards || [];
  }, [wardsRes, dashboardRes]);

  // Selected ward details (for area selection in the form)
  const currentSelectedWard = useMemo(() => {
    return assignedWards.find((w) => w.wardId === formData.wardId);
  }, [assignedWards, formData.wardId]);

  // 3. Fetch Activity Chart
  const { data: activityRes } = useQuery({
    queryKey: ["volunteer-me-activity"],
    queryFn: async () => {
      const res = await volunteerApi.getMyActivity();
      return res.data?.data;
    },
  });

  // 4. Fetch Volunteer's Registered Voters
  const {
    data: myVotersRes,
    isLoading: myVotersLoading,
    refetch: refetchMyVoters,
  } = useQuery({
    queryKey: ["volunteer-me-voters", submissionsPage, submissionsSearch, submissionsWardFilter],
    queryFn: async () => {
      const params: any = { page: submissionsPage, limit: 15 };
      if (submissionsSearch.trim()) params.search = submissionsSearch.trim();
      if (submissionsWardFilter !== "ALL") params.wardId = submissionsWardFilter;
      const res = await volunteerApi.getMyVoters(params);
      return res.data?.data;
    },
  });

  // Voter registration mutation
  const registerMutation = useMutation({
    mutationFn: (data: any) => volunteerApi.registerVoter(data),
    onSuccess: (res) => {
      const newVoter = res.data?.data;
      setLastRegisteredVoter(newVoter);
      toast({
        title: "Voter Registered Successfully!",
        description: `Application Number: ${newVoter?.applicationNumber || "Generated"}`,
      });

      // Reset form but keep the selected ward for convenient batch entry
      setFormData((prev) => ({
        ...prev,
        voterIdNumber: "",
        slNo: "",
        sectionNo: "",
        boothNo: "",
        name: "",
        relativeName: "",
        age: "",
        houseNo: "",
        address: "",
        locality: "",
        phone: "",
        bloodGroup: "",
        isDisabled: false,
        isOurVoter: false,
        voterLeaning: "UNKNOWN",
        voterCadreNotes: "",
        submissionNotes: "",
      }));
      setFamilyMembers([]);

      queryClient.invalidateQueries({ queryKey: ["volunteer-me-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["volunteer-me-voters"] });
      queryClient.invalidateQueries({ queryKey: ["volunteer-me-activity"] });
    },
    onError: (err: any) => {
      toast({
        title: "Registration Failed",
        description: err.response?.data?.message || err.message || "Failed to register voter.",
        variant: "destructive",
      });
    },
  });

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.wardId) {
      toast({
        title: "Ward Required",
        description: "Please select an authorized ward for registration.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.voterIdNumber.trim() || !formData.name.trim()) {
      toast({
        title: "Missing Fields",
        description: "Voter EPIC ID and Full Name are required.",
        variant: "destructive",
      });
      return;
    }

    const payload: any = {
      ...formData,
      voterIdNumber: formData.voterIdNumber.trim().toUpperCase(),
      name: formData.name.trim(),
      age: formData.age ? parseInt(formData.age, 10) : undefined,
      slNo: formData.slNo ? parseInt(formData.slNo, 10) : undefined,
      sectionNo: formData.sectionNo ? parseInt(formData.sectionNo, 10) : undefined,
      boothNo: formData.boothNo ? parseInt(formData.boothNo, 10) : undefined,
      wardAreaId: formData.wardAreaId || undefined,
      familyMembers: familyMembers
        .filter((m) => m.name.trim().length > 0)
        .map((m) => ({
          name: m.name.trim(),
          relationType: m.relationType,
          gender: m.gender,
          age: m.age ? parseInt(m.age, 10) : undefined,
          phone: m.phone.trim() || undefined,
          voterIdNumber: m.voterIdNumber.trim().toUpperCase() || undefined,
          isDependent: m.isDependent,
        })),
    };

    registerMutation.mutate(payload);
  };

  const startRegistrationForWard = (wardId: string) => {
    setFormData((prev) => ({ ...prev, wardId, wardAreaId: "" }));
    setActiveTab("register");
  };

  const stats = dashboardRes?.stats || {
    assignedWardsCount: assignedWards.length,
    totalVotersRegistered: 0,
    todayVotersRegistered: 0,
    weekVotersRegistered: 0,
  };

  const profile = dashboardRes?.profile;
  const myVoters = myVotersRes?.voters || [];
  const submissionsPagination = myVotersRes?.pagination || { total: 0, totalPages: 1 };

  return (
    <MainLayout title="Volunteer Field Portal">
      <div className="space-y-6 pb-12">
        {/* Volunteer Greeting Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary text-primary-foreground shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Volunteer Field Portal
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back, <span className="font-semibold text-foreground">{profile?.name || "Volunteer"}</span>.
              You are authorized to register and manage voter records in your assigned wards.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setActiveTab("register")}
              className="gap-2 shadow-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <UserPlus className="w-4 h-4" />
              Add New Voter
            </Button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl shadow-sm border border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned Wards
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-black text-foreground">
                  {stats.assignedWardsCount}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    authorized area(s)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Registered Today
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-black text-foreground">
                  {stats.todayVotersRegistered}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    voters added
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Last 7 Days
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-black text-foreground">
                  {stats.weekVotersRegistered}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    field entries
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Voters Added
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-black text-foreground">
                  {(stats.totalVotersRegistered ?? 0).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border p-1 rounded-2xl shadow-sm">
            <TabsTrigger value="overview" className="rounded-xl px-5 gap-2">
              <Layers className="w-4 h-4" />
              My Wards & Activity
            </TabsTrigger>
            <TabsTrigger value="register" className="rounded-xl px-5 gap-2">
              <UserPlus className="w-4 h-4" />
              Register Voter
            </TabsTrigger>
            <TabsTrigger value="submissions" className="rounded-xl px-5 gap-2">
              <FileText className="w-4 h-4" />
              My Submissions ({stats.totalVotersRegistered})
            </TabsTrigger>
          </TabsList>

          {/* ════════════════ TAB 1: OVERVIEW & WARDS ════════════════ */}
          <TabsContent value="overview" className="space-y-6">
            {/* Assigned Wards Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">My Permitted Wards</h3>
                  <p className="text-xs text-muted-foreground">
                    You can only enroll and update voters residing in these authorized wards.
                  </p>
                </div>
              </div>

              {wardsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-2xl" />
                  ))}
                </div>
              ) : assignedWards.length === 0 ? (
                <Card className="rounded-2xl border-dashed p-8 text-center">
                  <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                  <p className="font-semibold text-foreground">No Ward Assignments Found</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    Your volunteer account has not been assigned to any wards yet. Please contact your
                    constituency administrator to allocate your wards.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignedWards.map((w) => (
                    <Card
                      key={w.wardId}
                      className="rounded-2xl border border-border/70 hover:border-primary/50 transition-all hover:shadow-md overflow-hidden bg-card"
                    >
                      <CardHeader className="bg-muted/20 pb-3">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 font-bold px-2.5 py-0.5">
                            Ward {w.wardNumber}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium">
                            {w.zone ? `Zone ${w.zone}` : "Constituency Ward"}
                          </span>
                        </div>
                        <CardTitle className="text-base font-bold mt-1 text-foreground">
                          {w.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        <div className="flex items-center justify-between text-xs border-b pb-2">
                          <span className="text-muted-foreground">Registered in Ward:</span>
                          <span className="font-bold text-foreground">
                            {(w.totalWardVoters ?? (w as any).totalVoters ?? 0).toLocaleString()} voters
                          </span>
                        </div>

                        {w.areas && w.areas.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                              Recognized Areas:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {w.areas.slice(0, 4).map((a) => (
                                <span
                                  key={a.id}
                                  className="text-[10px] bg-muted px-2 py-0.5 rounded-md text-foreground font-medium"
                                >
                                  {a.name}
                                </span>
                              ))}
                              {w.areas.length > 4 && (
                                <span className="text-[10px] text-muted-foreground self-center">
                                  +{w.areas.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={() => startRegistrationForWard(w.wardId)}
                          className="w-full rounded-xl gap-2 font-medium bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20"
                        >
                          <UserPlus className="w-4 h-4" />
                          Register Voter in Ward {w.wardNumber}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* 14-Day Activity Chart */}
            <Card className="rounded-2xl shadow-sm border border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Your 14-Day Registration Progress
                </CardTitle>
                <CardDescription>
                  Daily count of voter registrations submitted under your volunteer attribution.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-56 w-full">
                  {activityRes?.timeline && activityRes.timeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={activityRes.timeline}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="volColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => v.slice(5)}
                          tick={{ fontSize: 11 }}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderRadius: "12px",
                            border: "1px solid hsl(var(--border))",
                            fontSize: "12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#volColor)"
                          name="Voters Registered"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                      No recent activity recorded.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════ TAB 2: REGISTER VOTER FORM ════════════════ */}
          <TabsContent value="register">
            <Card className="rounded-2xl shadow-sm border border-border/60 max-w-4xl mx-auto">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" />
                      Field Voter Registration
                    </CardTitle>
                    <CardDescription>
                      Direct entry into the voter database. Duplicate EPIC check and ward validation
                      are automatically enforced.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {/* Success Banner if recently registered */}
                {lastRegisteredVoter && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-bold text-emerald-800 dark:text-emerald-300">
                        Voter Successfully Registered!
                      </p>
                      <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                        <span className="font-semibold">{lastRegisteredVoter.name}</span> (EPIC:{" "}
                        <span className="font-mono font-bold">
                          {lastRegisteredVoter.voterIdNumber}
                        </span>
                        ) has been registered.
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        Application No:{" "}
                        <span className="font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded">
                          {lastRegisteredVoter.applicationNumber}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-6">
                  {/* Section 1: Permitted Ward & Area */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> 1. Authorized Location
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Select Ward *</Label>
                        <Select
                          value={formData.wardId}
                          onValueChange={(val) =>
                            setFormData({ ...formData, wardId: val, wardAreaId: "" })
                          }
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Choose an assigned ward..." />
                          </SelectTrigger>
                          <SelectContent>
                            {assignedWards.map((w) => (
                              <SelectItem key={w.wardId} value={w.wardId}>
                                Ward {w.wardNumber} - {w.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Ward Area / Locality (Optional)</Label>
                        <Select
                          value={formData.wardAreaId}
                          disabled={!formData.wardId || !currentSelectedWard?.areas?.length}
                          onValueChange={(val) =>
                            setFormData({ ...formData, wardAreaId: val })
                          }
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select specific area..." />
                          </SelectTrigger>
                          <SelectContent>
                            {currentSelectedWard?.areas?.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Electoral Roll Identity */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Hash className="w-4 h-4" /> 2. Electoral Identity
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label>EPIC / Voter ID Number *</Label>
                        <Input
                          required
                          placeholder="e.g. ABC1234567"
                          value={formData.voterIdNumber}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              voterIdNumber: e.target.value.toUpperCase(),
                            })
                          }
                          className="rounded-xl uppercase font-mono tracking-wider font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Part / Section No</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 12"
                          value={formData.sectionNo}
                          onChange={(e) =>
                            setFormData({ ...formData, sectionNo: e.target.value })
                          }
                          className="rounded-xl"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Booth Number</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 45"
                          value={formData.boothNo}
                          onChange={(e) =>
                            setFormData({ ...formData, boothNo: e.target.value })
                          }
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Personal Details */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Users className="w-4 h-4" /> 3. Personal Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label>Voter Full Name *</Label>
                        <Input
                          required
                          placeholder="e.g. Anand Sharma"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="rounded-xl font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Gender *</Label>
                        <Select
                          value={formData.gender}
                          onValueChange={(val: any) =>
                            setFormData({ ...formData, gender: val })
                          }
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                            <SelectItem value="TRANSGENDER">Transgender</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Relative's Name</Label>
                        <Input
                          placeholder="Father or Husband name"
                          value={formData.relativeName}
                          onChange={(e) =>
                            setFormData({ ...formData, relativeName: e.target.value })
                          }
                          className="rounded-xl"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Relation Type</Label>
                        <Select
                          value={formData.relationType}
                          onValueChange={(val) =>
                            setFormData({ ...formData, relationType: val })
                          }
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FATHER">Father</SelectItem>
                            <SelectItem value="HUSBAND">Husband</SelectItem>
                            <SelectItem value="MOTHER">Mother</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Age</Label>
                        <Input
                          type="number"
                          placeholder="Age (18-120)"
                          min={18}
                          max={120}
                          value={formData.age}
                          onChange={(e) =>
                            setFormData({ ...formData, age: e.target.value })
                          }
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Contact & Address */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Building className="w-4 h-4" /> 4. Contact & Address
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>Mobile Number</Label>
                        <Input
                          placeholder="10 digit mobile"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="rounded-xl"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>House No / Flat</Label>
                        <Input
                          placeholder="e.g. 12-B / Block 3"
                          value={formData.houseNo}
                          onChange={(e) =>
                            setFormData({ ...formData, houseNo: e.target.value })
                          }
                          className="rounded-xl"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Locality / Mohalla</Label>
                        <Input
                          placeholder="e.g. Main Market"
                          value={formData.locality}
                          onChange={(e) =>
                            setFormData({ ...formData, locality: e.target.value })
                          }
                          className="rounded-xl"
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1.5">
                        <Label>Full Address</Label>
                        <Input
                          placeholder="Full residential street address..."
                          value={formData.address}
                          onChange={(e) =>
                            setFormData({ ...formData, address: e.target.value })
                          }
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Family Members */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                          <Users2 className="w-4 h-4" /> 5. Family Members (Optional)
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Add household members living with or related to this voter
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addFamilyMember}
                        className="rounded-xl border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:text-primary gap-1.5 font-medium self-start sm:self-auto"
                      >
                        <Plus className="w-4 h-4" />
                        Add Family Member
                      </Button>
                    </div>

                    {familyMembers.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-border/70 bg-muted/10 text-center text-xs text-muted-foreground">
                        No family members added yet. Click{" "}
                        <strong className="text-foreground">"+ Add Family Member"</strong> to register household members together.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {familyMembers.map((member, idx) => (
                          <div
                            key={member.id}
                            className="p-4 rounded-xl border border-border/80 bg-muted/10 shadow-sm space-y-3 relative"
                          >
                            <div className="flex items-center justify-between border-b pb-2">
                              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs px-2 py-0">
                                  #{idx + 1}
                                </Badge>
                                Family Member Details
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFamilyMember(member.id)}
                                className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg gap-1 text-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Remove
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div className="space-y-1 sm:col-span-2">
                                <Label className="text-xs">Member Full Name *</Label>
                                <Input
                                  required
                                  placeholder="e.g. Sunita Sharma"
                                  value={member.name}
                                  onChange={(e) => updateFamilyMember(member.id, "name", e.target.value)}
                                  className="rounded-lg h-9 text-sm"
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">Relation to Voter *</Label>
                                <Select
                                  value={member.relationType}
                                  onValueChange={(val) => updateFamilyMember(member.id, "relationType", val)}
                                >
                                  <SelectTrigger className="rounded-lg h-9 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="SPOUSE">Spouse / Wife / Husband</SelectItem>
                                    <SelectItem value="SON">Son</SelectItem>
                                    <SelectItem value="DAUGHTER">Daughter</SelectItem>
                                    <SelectItem value="FATHER">Father</SelectItem>
                                    <SelectItem value="MOTHER">Mother</SelectItem>
                                    <SelectItem value="BROTHER">Brother</SelectItem>
                                    <SelectItem value="SISTER">Sister</SelectItem>
                                    <SelectItem value="GRANDFATHER">Grandfather</SelectItem>
                                    <SelectItem value="GRANDMOTHER">Grandmother</SelectItem>
                                    <SelectItem value="GRANDSON">Grandson</SelectItem>
                                    <SelectItem value="GRANDDAUGHTER">Granddaughter</SelectItem>
                                    <SelectItem value="UNCLE">Uncle</SelectItem>
                                    <SelectItem value="AUNT">Aunt</SelectItem>
                                    <SelectItem value="NEPHEW">Nephew</SelectItem>
                                    <SelectItem value="NIECE">Niece</SelectItem>
                                    <SelectItem value="DEPENDENT">Dependent</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">Gender *</Label>
                                <Select
                                  value={member.gender}
                                  onValueChange={(val: any) => updateFamilyMember(member.id, "gender", val)}
                                >
                                  <SelectTrigger className="rounded-lg h-9 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="FEMALE">Female</SelectItem>
                                    <SelectItem value="MALE">Male</SelectItem>
                                    <SelectItem value="TRANSGENDER">Transgender</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">Age</Label>
                                <Input
                                  type="number"
                                  placeholder="Age"
                                  min={1}
                                  max={120}
                                  value={member.age}
                                  onChange={(e) => updateFamilyMember(member.id, "age", e.target.value)}
                                  className="rounded-lg h-9 text-sm"
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">Phone (Optional)</Label>
                                <Input
                                  placeholder="Mobile number"
                                  value={member.phone}
                                  onChange={(e) => updateFamilyMember(member.id, "phone", e.target.value)}
                                  className="rounded-lg h-9 text-sm"
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">EPIC / Voter ID (Optional)</Label>
                                <Input
                                  placeholder="e.g. XYZ9876543"
                                  value={member.voterIdNumber}
                                  onChange={(e) =>
                                    updateFamilyMember(member.id, "voterIdNumber", e.target.value.toUpperCase())
                                  }
                                  className="rounded-lg h-9 text-sm uppercase font-mono"
                                />
                              </div>

                              <div className="flex items-center justify-between p-2 rounded-lg bg-card border mt-auto h-9">
                                <span className="text-xs font-medium">Dependent?</span>
                                <Switch
                                  checked={member.isDependent}
                                  onCheckedChange={(checked) => updateFamilyMember(member.id, "isDependent", checked)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 6: Field Notes & Political Leaning */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> 6. Canvassing & Notes
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/20">
                        <div>
                          <p className="text-sm font-semibold">Our Supporter / Voter</p>
                          <p className="text-xs text-muted-foreground">
                            Tag as confirmed supporter
                          </p>
                        </div>
                        <Switch
                          checked={formData.isOurVoter}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              isOurVoter: checked,
                              voterLeaning: checked ? "OUR_VOTER" : "UNKNOWN",
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/20">
                        <div>
                          <p className="text-sm font-semibold">Person with Disability (PwD)</p>
                          <p className="text-xs text-muted-foreground">
                            Requires assistance during elections
                          </p>
                        </div>
                        <Switch
                          checked={formData.isDisabled}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, isDisabled: checked })
                          }
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1.5">
                        <Label>Volunteer Field Notes (Optional)</Label>
                        <Input
                          placeholder="Any specific requests, family remarks, or local issues noted..."
                          value={formData.voterCadreNotes}
                          onChange={(e) =>
                            setFormData({ ...formData, voterCadreNotes: e.target.value })
                          }
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3">
                    <Button
                      type="submit"
                      disabled={registerMutation.isPending}
                      className="px-8 font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                    >
                      {registerMutation.isPending ? "Submitting..." : "Submit Voter Record"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════ TAB 3: MY SUBMISSIONS ════════════════ */}
          <TabsContent value="submissions" className="space-y-4">
            <Card className="rounded-2xl shadow-sm border border-border/60">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search registered voters..."
                      value={submissionsSearch}
                      onChange={(e) => {
                        setSubmissionsSearch(e.target.value);
                        setSubmissionsPage(1);
                      }}
                      className="pl-9 rounded-xl"
                    />
                  </div>

                  <div className="w-full sm:w-56">
                    <Select
                      value={submissionsWardFilter}
                      onValueChange={(val) => {
                        setSubmissionsWardFilter(val);
                        setSubmissionsPage(1);
                      }}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="All My Wards" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All My Wards</SelectItem>
                        {assignedWards.map((w) => (
                          <SelectItem key={w.wardId} value={w.wardId}>
                            Ward {w.wardNumber} - {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm border border-border/60 overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-xs uppercase font-semibold">Voter Name</TableHead>
                      <TableHead className="text-xs uppercase font-semibold">EPIC / Voter ID</TableHead>
                      <TableHead className="text-xs uppercase font-semibold">Application No</TableHead>
                      <TableHead className="text-xs uppercase font-semibold">Ward</TableHead>
                      <TableHead className="text-xs uppercase font-semibold">Phone</TableHead>
                      <TableHead className="text-xs uppercase font-semibold">Registered At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myVotersLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        </TableRow>
                      ))
                    ) : myVoters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          No voters registered yet under this filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      myVoters.map((v: any) => (
                        <TableRow key={v.id} className="hover:bg-muted/20">
                          <TableCell className="font-semibold text-foreground text-sm">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span>{v.name}</span>
                              {v.isOurVoter && (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] px-1.5 py-0">
                                  Supporter
                                </Badge>
                              )}
                              {Boolean(v._count?.familyMembers > 0 || (v.familyMembers && v.familyMembers.length > 0)) && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-primary/5 text-primary border-primary/20 gap-1 px-1.5 py-0"
                                  title={v.familyMembers?.map((m: any) => `${m.name} (${m.relationType})`).join(", ")}
                                >
                                  <Users2 className="w-2.5 h-2.5" />
                                  {v._count?.familyMembers || v.familyMembers?.length} Family
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-xs">
                            {v.voterIdNumber}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {v.applicationNumber || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            Ward {v.ward?.wardNumber} ({v.ward?.name})
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {v.phone || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(v.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Submissions Pagination */}
                {submissionsPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t text-sm text-muted-foreground">
                    <p>
                      Showing page {submissionsPage} of {submissionsPagination.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={submissionsPage <= 1}
                        onClick={() => setSubmissionsPage((p) => p - 1)}
                        className="rounded-lg"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={submissionsPage >= submissionsPagination.totalPages}
                        onClick={() => setSubmissionsPage((p) => p + 1)}
                        className="rounded-lg"
                      >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
