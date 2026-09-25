import React, { useState, useEffect } from "react";
import { publicHelplinesApi } from "@/lib/api";
import {
  PhoneCall,
  Search,
  Flame,
  Activity,
  ShieldAlert,
  HeartHandshake,
  Baby,
  Building2,
  AlertTriangle,
  Laptop,
  Users,
  Zap,
  MapPin,
  Clock,
  Phone,
  MessageSquare,
  LifeBuoy,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface HelplineContact {
  id: string;
  category: string;
  title: string;
  subtitle?: string | null;
  phonePrimary: string;
  phoneSecondary?: string | null;
  tollFreeNumber?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  availableHours?: string | null;
  is24x7: boolean;
  isEmergency: boolean;
  isTollFree: boolean;
  isWhatsAppEnabled: boolean;
  areaWardCoverage?: string | null;
  address?: string | null;
  notes?: string | null;
  colorScheme?: string | null;
}

const CATEGORIES = [
  { value: "ALL", label: "All Services", icon: Layers },
  { value: "EMERGENCY", label: "Emergency", icon: Flame, color: "text-red-500 bg-red-500/10 border-red-500/20" },
  { value: "HEALTHCARE", label: "Healthcare & Ambulance", icon: Activity, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
  { value: "POLICE", label: "Police & Security", icon: ShieldAlert, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
  { value: "WOMEN_CHILD", label: "Women & Child", icon: HeartHandshake, color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
  { value: "CONSTITUENCY_OFFICE", label: "MLA Citizen Desk", icon: Building2, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { value: "DISASTER", label: "Disaster Relief", icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { value: "GOVERNMENT_SERVICES", label: "Cyber & Govt", icon: Laptop, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
  { value: "SENIOR_CITIZEN", label: "Elderly Care", icon: Users, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  { value: "ELECTRICITY", label: "Electricity Board", icon: Zap, color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  { value: "CIVIC_MUNICIPAL", label: "Civic & Municipal", icon: MapPin, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { value: "WATER_SANITATION", label: "Water & Sanitation", icon: LifeBuoy, color: "text-teal-500 bg-teal-500/10 border-teal-500/20" },
];

const getCategoryMeta = (cat: string) => {
  return CATEGORIES.find((c) => c.value === cat) || {
    label: cat.replace(/_/g, " "),
    icon: PhoneCall,
    color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
  };
};

export const PublicHelplineDirectoryPage: React.FC = () => {
  const [helplines, setHelplines] = useState<HelplineContact[]>([]);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  useEffect(() => {
    fetchHelplines();
  }, [selectedCategory]);

  const fetchHelplines = async () => {
    try {
      setLoading(true);
      const res = await publicHelplinesApi.list({
        category: selectedCategory !== "ALL" ? selectedCategory : undefined,
        search: searchQuery || undefined,
      });

      if (res.data?.success) {
        setHelplines(res.data.data || []);
        if (res.data.tenant) {
          setTenantInfo(res.data.tenant);
        }
      }
    } catch (err: any) {
      console.error("Failed to load helplines:", err);
      toast.error("Failed to load helpline directory");
    } finally {
      setLoading(false);
    }
  };

  const emergencyContacts = helplines.filter((h) => h.isEmergency);
  const generalContacts = helplines.filter((h) => !h.isEmergency);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Emergency & Citizen Helpline Directory",
        text: `Official Emergency & Citizen Helpline Numbers for ${tenantInfo?.constituencyName || "Constituency"}: 112, 108, 100, 1091, 1098, 1930 and MLA Office Desk.`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Helpline directory link copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* ─── Top Navbar ─── */}
      <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-md shadow-red-500/20">
              <PhoneCall className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                  {tenantInfo?.constituencyName || "Constituency"} Citizen Helplines
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                  <Flame className="w-3 h-3" /> 24x7 Emergency
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Direct citizen assistance & emergency speed-dial directory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="rounded-xl text-xs gap-1.5 border-slate-300 dark:border-slate-700"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share Directory</span>
            </Button>
            <a href="/voter-portal">
              <Button
                size="sm"
                className="rounded-xl text-xs font-bold gap-1.5 bg-[#13538A] hover:bg-[#13538A]/90 text-white shadow-sm"
              >
                <span>Voter Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* ─── Hero Emergency Header Banner ─── */}
      <div className="bg-gradient-to-b from-red-500/10 via-rose-500/5 to-transparent border-b border-red-500/10 pt-8 pb-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold">
            <Flame className="w-4 h-4 animate-bounce" />
            <span>INSTANT CITIZEN EMERGENCY ASSISTANCE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-2xl mx-auto">
            Emergency & Public Helpline Directory
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            One-tap emergency dialing for ambulance, police, disaster relief, cyber crime, women & child safety, and MLA constituency grievance desk.
          </p>

          {/* Search Box */}
          <div className="max-w-xl mx-auto relative pt-2">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchHelplines()}
              placeholder="Search emergency services, departments (e.g. Police, Ambulance, Water)..."
              className="pl-12 pr-28 h-13 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-base shadow-lg shadow-slate-200/50 dark:shadow-none"
            />
            <Button
              onClick={fetchHelplines}
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold h-9 px-4"
            >
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Main Content Container ─── */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8 flex-1">
        {/* Category Pill Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.value;
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-md"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── Emergency Speed-Dial Cards Section ─── */}
        {selectedCategory === "ALL" && emergencyContacts.length > 0 && !searchQuery && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                  <Flame className="w-4 h-4" />
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Top Emergency Speed-Dial Numbers
                </h2>
              </div>
              <Badge variant="outline" className="text-xs text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/5">
                24x7 Priority Lines
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {emergencyContacts.map((contact) => {
                const meta = getCategoryMeta(contact.category);
                const Icon = meta.icon;

                return (
                  <Card
                    key={contact.id}
                    className="relative overflow-hidden border-2 border-red-500/25 bg-gradient-to-br from-red-500/[0.04] via-card to-card hover:border-red-500/50 hover:shadow-lg transition-all duration-300 rounded-2xl group"
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                              {meta.label}
                            </span>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                              {contact.title}
                            </h3>
                          </div>
                        </div>

                        {contact.is24x7 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            24x7
                          </span>
                        )}
                      </div>

                      {contact.subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {contact.subtitle}
                        </p>
                      )}

                      {/* Primary Call Action Button */}
                      <a
                        href={`tel:${contact.phonePrimary}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-md shadow-red-600/25 transition-all group-hover:scale-[1.01]"
                      >
                        <div className="flex items-center gap-2">
                          <PhoneCall className="w-5 h-5 animate-pulse" />
                          <span className="text-lg tracking-wider font-mono">
                            {contact.phonePrimary}
                          </span>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-lg">
                          Tap to Call
                        </span>
                      </a>

                      {/* Coverage & Secondary Links */}
                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 gap-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {contact.areaWardCoverage || "Constituency-wide"}
                        </span>
                        {contact.whatsappNumber && (
                          <a
                            href={`https://wa.me/${contact.whatsappNumber.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-bold hover:underline"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── All Directory Contacts ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Phone className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {selectedCategory === "ALL" ? "Constituency Services & Civic Helplines" : getCategoryMeta(selectedCategory).label}
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {helplines.length} contacts available
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-44 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse border" />
              ))}
            </div>
          ) : helplines.length === 0 ? (
            <Card className="border-dashed py-12 text-center bg-white/50 dark:bg-slate-900/50 rounded-2xl">
              <CardContent className="space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <PhoneCall className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold">No helplines found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Try searching with different keywords or switch categories.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("ALL");
                    setSearchQuery("");
                  }}
                  className="rounded-xl text-xs"
                >
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {helplines.map((contact) => {
                const meta = getCategoryMeta(contact.category);
                const Icon = meta.icon;

                return (
                  <Card
                    key={contact.id}
                    className="border border-slate-200 dark:border-slate-800 hover:border-primary/40 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all duration-200 rounded-2xl flex flex-col justify-between"
                  >
                    <CardContent className="p-5 space-y-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold border ${meta.color} flex items-center gap-1`}
                        >
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </Badge>

                        <div className="flex items-center gap-1.5">
                          {contact.is24x7 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              24x7
                            </span>
                          )}
                          {contact.isTollFree && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              Toll-Free
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                          {contact.title}
                        </h3>
                        {contact.subtitle && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {contact.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Number Bar */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Helpline Number
                          </span>
                          <p className="font-bold text-base tracking-wide font-mono text-slate-900 dark:text-white">
                            {contact.phonePrimary}
                          </p>
                        </div>
                        <a
                          href={`tel:${contact.phonePrimary}`}
                          className="p-2 rounded-xl bg-[#13538A] hover:bg-[#13538A]/90 text-white shadow-xs transition-transform active:scale-95"
                          title="Call Now"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </a>
                      </div>

                      {/* WhatsApp / Secondary Number / Details */}
                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 gap-2">
                        {contact.availableHours && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {contact.availableHours}
                          </span>
                        )}
                        {contact.whatsappNumber && (
                          <a
                            href={`https://wa.me/${contact.whatsappNumber.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-md hover:bg-green-500/20 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            WhatsApp Us
                          </a>
                        )}
                      </div>

                      {contact.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60 leading-relaxed">
                          {contact.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 px-4 sm:px-6 mt-12 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto space-y-2">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            {tenantInfo?.constituencyName || "Constituency"} Citizen Assistance & Emergency Helpline Portal
          </p>
          <p>
            Emergency numbers (112, 108, 100, 1091, 1098, 1930) are toll-free and accessible 24 hours a day across India from any mobile or landline without an area code.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicHelplineDirectoryPage;
