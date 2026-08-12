import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWards } from "@/hooks/useWards";
import { useDownloadPdfReport } from "@/hooks/useReports";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/contexts/SettingsContext";
import {
  FileText,
  Download,
  Filter,
  Building2,
  ClipboardList,
  Map,
  MessageSquare,
  Landmark,
  IndianRupeeIcon,
  Users,
  Layers,
  Sparkles,
  Loader2,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

const MODULE_OPTIONS = [
  {
    id: "consolidated",
    title: "All-Module Consolidated Executive Report",
    desc: "Includes Executive Overview + Grievances, Projects, Wards, Departments, Public Facilities & Funds.",
    icon: Layers,
    badge: "Recommended",
  },
  {
    id: "grievance",
    title: "Public Requests / Grievances Report",
    desc: "Complete list of citizen grievances, category breakdowns, ward distribution & resolution status.",
    icon: MessageSquare,
  },
  {
    id: "project",
    title: "Development Projects Report",
    desc: "Project budgets, sanctioned amounts, progress status and ward allocation details.",
    icon: ClipboardList,
  },
  {
    id: "ward",
    title: "Ward Performance & Demographics",
    desc: "Ward-by-ward breakdown of population, households, active projects and grievance stats.",
    icon: Map,
  },
  {
    id: "department",
    title: "Department Performance Report",
    desc: "Department listing, assigned heads, contact information & grievance resolution performance.",
    icon: Landmark,
  },
  {
    id: "institution",
    title: "Public Facilities & Institutions Report",
    desc: "Detailed inventory of schools, hospitals, temples, clinics, and government facilities.",
    icon: Building2,
  },
  {
    id: "fund",
    title: "Funds & Budget Allocation Report",
    desc: "Financial year allocation, released amounts, utilized budgets & balance tracking.",
    icon: IndianRupeeIcon,
  },
  {
    id: "leader",
    title: "Local Representatives & Leaders Report",
    desc: "List of community leaders, ward representatives, roles & contact directories.",
    icon: Users,
  },
];

export default function PdfReportsPage() {
  const auth = useAuth();
  const user = auth?.user;
  const settingsCtx = useSystemSettings();
  const settings = settingsCtx?.settings;
  const { data: wardsRes } = useWards({ limit: 100 });
  const downloadPdf = useDownloadPdfReport();

  const [selectedModule, setSelectedModule] = useState("consolidated");
  const [wardFilter, setWardFilter] = useState("all");
  const [dateRange, setDateRange] = useState("this_month");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);

  const repName = settings?.representative_name || user?.name || "Shri Representative";
  const constituencyName = settings?.constituency_name || settings?.org_name || "Constituency Administration Portal";

  const rawWards = wardsRes?.data?.wards || wardsRes?.data || wardsRes;
  const wards = Array.isArray(rawWards) ? rawWards : [];

  const handleDownload = async (moduleType = selectedModule) => {
    setIsGenerating(true);
    setActiveDownloadId(moduleType);
    try {
      await downloadPdf(moduleType, {
        wardId: wardFilter !== "all" ? wardFilter : undefined,
        dateRange,
      });
    } finally {
      setIsGenerating(false);
      setActiveDownloadId(null);
    }
  };

  const selectedInfo = MODULE_OPTIONS.find((m) => m.id === selectedModule);

  return (
    <MainLayout title="PDF Reports & Export">
      <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8">
        {/* Top Header Card — Styled with primary brand colors (#13538A & #5D28A8) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#13538A] via-[#1d6ba7] to-[#5D28A8] text-white p-6 sm:p-8 shadow-xl border border-[#5D28A8]/20">
          {/* Subtle decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md border border-white/20">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-yellow-300" />
                Uncapped Executive Standard PDF Engine
              </div> */}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                PDF Governance & Executive Reports
              </h1>
              <p className="text-white/80 text-sm max-w-2xl">
                Generate and download official, multi-page vector PDF reports for all constituency modules or individual single modules with dynamic representative headers and generation timestamps.
              </p>
            </div>

            <Button
              onClick={() => handleDownload("consolidated")}
              disabled={isGenerating}
              size="lg"
              className="bg-white hover:bg-white/90 text-[#13538A] font-bold shadow-lg shadow-black/10 transition-all cursor-pointer whitespace-nowrap px-6 py-6 rounded-xl border border-transparent hover:scale-[1.02] active:scale-[0.98]"
            >
              {isGenerating && activeDownloadId === "consolidated" ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin text-[#13538A]" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2 text-[#13538A]" />
                  Instant Consolidated PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Representative Metadata Banner — Aligned with the sidebar identity */}
        <Card className="border-[#13538A]/10 dark:border-slate-800 bg-[#13538A]/5 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[#13538A]/10 dark:bg-[#13538A]/20 text-[#13538A] dark:text-[#38bdf8]">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Representative Name</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {repName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[#13538A]/10 dark:bg-[#13538A]/20 text-[#13538A] dark:text-[#38bdf8]">
                  <Map className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Constituency Office</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {constituencyName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[#13538A]/10 dark:bg-[#13538A]/20 text-[#13538A] dark:text-[#38bdf8]">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Report Timestamp</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {format(new Date(), "dd MMM yyyy, hh:mm a")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controls & Filter Section */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-4">
            <CardTitle className="text-lg flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Filter className="h-5 w-5 text-[#13538A]" />
              Report Scope & Filter Settings
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Select whether you want a full all-module report or a single module report.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Module Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Report Scope / Module
                </label>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger className="w-full h-11 border-slate-200 dark:border-slate-800 focus:ring-[#13538A]">
                    <SelectValue placeholder="Select Module" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ward Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Filter by Ward
                </label>
                <Select value={wardFilter} onValueChange={setWardFilter}>
                  <SelectTrigger className="w-full h-11 border-slate-200 dark:border-slate-800 focus:ring-[#13538A]">
                    <SelectValue placeholder="All Wards" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Wards</SelectItem>
                    {wards.map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>
                        Ward {w.wardNumber} - {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Time Horizon
                </label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-full h-11 border-slate-200 dark:border-slate-800 focus:ring-[#13538A]">
                    <SelectValue placeholder="This Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="all_time">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 gap-4 transition-all">
              <div className="flex items-center gap-3">
                {selectedInfo && (
                  <div className="p-2.5 rounded-lg bg-[#13538A]/10 text-[#13538A] dark:text-[#38bdf8] shrink-0">
                    <selectedInfo.icon className="h-6 w-6 shrink-0" />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedInfo?.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedInfo?.desc}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => handleDownload(selectedModule)}
                disabled={isGenerating}
                className="w-full sm:w-auto bg-[#13538A] hover:bg-[#13538A]/90 text-white font-bold h-11 cursor-pointer shrink-0 px-6 rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {isGenerating && activeDownloadId === selectedModule ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate & Download PDF
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access Module Cards */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#13538A]" />
            Quick Export Options
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULE_OPTIONS.map((m) => {
              const Icon = m.icon;
              const isSelected = selectedModule === m.id;
              return (
                <Card
                  key={m.id}
                  className={`relative overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer border group ${
                    isSelected
                      ? "border-[#13538A] ring-2 ring-[#13538A]/20 bg-[#13538A]/5 dark:bg-[#13538A]/10"
                      : "hover:border-[#13538A]/30 dark:hover:border-slate-700 dark:border-slate-800"
                  }`}
                  onClick={() => {
                    setSelectedModule(m.id);
                  }}
                >
                  {m.badge && (
                    <Badge className="absolute top-3 right-3 bg-[#5D28A8] hover:bg-[#5D28A8] text-[10px] text-white font-semibold">
                      {m.badge}
                    </Badge>
                  )}
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg text-[#13538A] dark:text-[#38bdf8] transition-colors ${
                        isSelected 
                          ? "bg-[#13538A]/15 dark:bg-[#13538A]/30" 
                          : "bg-slate-100 dark:bg-slate-800 group-hover:bg-[#13538A]/10"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-sm font-bold leading-tight text-slate-800 dark:text-slate-200">
                        {m.title.replace(" Report", "")}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3 flex flex-col justify-between h-[110px]">
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {m.desc}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isGenerating}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(m.id);
                      }}
                      className={`w-full text-xs font-bold cursor-pointer h-9 rounded-lg border-slate-200 dark:border-slate-800 hover:bg-[#13538A]/5 dark:hover:bg-[#13538A]/10 hover:text-[#13538A] transition-all flex items-center justify-center gap-1.5 ${
                        isGenerating && activeDownloadId === m.id ? "text-slate-400" : ""
                      }`}
                    >
                      {isGenerating && activeDownloadId === m.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5 text-[#13538A] group-hover:scale-110 transition-transform" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
