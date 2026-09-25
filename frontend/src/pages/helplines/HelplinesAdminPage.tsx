import React, { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { helplinesApi } from "@/lib/api";
import { toast } from "sonner";
import {
  PhoneCall,
  Plus,
  Search,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Flame,
  Activity,
  HeartHandshake,
  Baby,
  Building2,
  AlertTriangle,
  Laptop,
  Users,
  Zap,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  MessageSquare,
  Edit2,
  Trash2,
  Filter,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  CheckSquare,
  Square,
  X,
  LifeBuoy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface HelplineContact {
  id: string;
  tenantId: string;
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
  iconKey?: string | null;
  colorScheme?: string | null;
  displayOrder: number;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "ALL", label: "All Categories", icon: Layers },
  { value: "EMERGENCY", label: "Emergency", icon: Flame, color: "text-red-500 bg-red-500/10 border-red-500/20" },
  { value: "HEALTHCARE", label: "Health & Ambulance", icon: Activity, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
  { value: "POLICE", label: "Police & Security", icon: ShieldAlert, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
  { value: "WOMEN_CHILD", label: "Women & Child Care", icon: HeartHandshake, color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
  { value: "CONSTITUENCY_OFFICE", label: "MLA Office & Citizen Desk", icon: Building2, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { value: "DISASTER", label: "Disaster Management", icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { value: "GOVERNMENT_SERVICES", label: "Cyber & Citizen Services", icon: Laptop, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
  { value: "SENIOR_CITIZEN", label: "Senior Citizens (Elder Line)", icon: Users, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  { value: "ELECTRICITY", label: "Electricity & Power Board", icon: Zap, color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  { value: "CIVIC_MUNICIPAL", label: "Civic & Municipal Services", icon: MapPin, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { value: "WATER_SANITATION", label: "Water & Sanitation", icon: LifeBuoy, color: "text-teal-500 bg-teal-500/10 border-teal-500/20" },
  { value: "OTHER", label: "Other Support", icon: PhoneCall, color: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
];

const getCategoryMeta = (cat: string) => {
  return CATEGORIES.find((c) => c.value === cat) || {
    label: cat.replace(/_/g, " "),
    icon: PhoneCall,
    color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
  };
};

export const HelplinesAdminPage: React.FC = () => {
  const [helplines, setHelplines] = useState<HelplineContact[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    active: number;
    emergency: number;
    tollFree: number;
    twentyFourSeven: number;
    whatsappEnabled: number;
  }>({
    total: 0,
    active: 0,
    emergency: 0,
    tollFree: 0,
    twentyFourSeven: 0,
    whatsappEnabled: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [emergencyOnly, setEmergencyOnly] = useState<boolean>(false);
  const [activeOnly, setActiveOnly] = useState<boolean>(false);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState<boolean>(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingHelpline, setEditingHelpline] = useState<HelplineContact | null>(null);
  const [formData, setFormData] = useState<{
    category: string;
    title: string;
    subtitle: string;
    phonePrimary: string;
    phoneSecondary: string;
    tollFreeNumber: string;
    whatsappNumber: string;
    email: string;
    availableHours: string;
    is24x7: boolean;
    isEmergency: boolean;
    isTollFree: boolean;
    isWhatsAppEnabled: boolean;
    areaWardCoverage: string;
    address: string;
    colorScheme: string;
    displayOrder: number;
    isActive: boolean;
    notes: string;
  }>({
    category: "EMERGENCY",
    title: "",
    subtitle: "",
    phonePrimary: "",
    phoneSecondary: "",
    tollFreeNumber: "",
    whatsappNumber: "",
    email: "",
    availableHours: "24x7 All Days",
    is24x7: true,
    isEmergency: false,
    isTollFree: false,
    isWhatsAppEnabled: false,
    areaWardCoverage: "Constituency-wide",
    address: "",
    colorScheme: "indigo",
    displayOrder: 0,
    isActive: true,
    notes: "",
  });

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        helplinesApi.list({
          category: selectedCategory !== "ALL" ? selectedCategory : undefined,
          search: searchQuery || undefined,
          isEmergency: emergencyOnly ? "true" : undefined,
          isActive: activeOnly ? "true" : undefined,
        }),
        helplinesApi.getStats(),
      ]);

      if (listRes.data?.success) {
        setHelplines(listRes.data.data || []);
      }
      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
    } catch (err: any) {
      console.error("Failed to load helplines:", err);
      toast.error(err.response?.data?.message || "Failed to load helpline numbers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory, emergencyOnly, activeOnly]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Clear selection if current filtered list no longer has those items
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => helplines.some((h) => h.id === id)));
  }, [helplines]);

  const isAllSelected = useMemo(() => {
    return helplines.length > 0 && selectedIds.length === helplines.length;
  }, [helplines, selectedIds]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(helplines.map((h) => h.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleOpenCreateModal = () => {
    setEditingHelpline(null);
    setFormData({
      category: "EMERGENCY",
      title: "",
      subtitle: "",
      phonePrimary: "",
      phoneSecondary: "",
      tollFreeNumber: "",
      whatsappNumber: "",
      email: "",
      availableHours: "24x7 All Days",
      is24x7: true,
      isEmergency: false,
      isTollFree: false,
      isWhatsAppEnabled: false,
      areaWardCoverage: "Constituency-wide",
      address: "",
      colorScheme: "indigo",
      displayOrder: helplines.length + 1,
      isActive: true,
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: HelplineContact) => {
    setEditingHelpline(item);
    setFormData({
      category: item.category,
      title: item.title,
      subtitle: item.subtitle || "",
      phonePrimary: item.phonePrimary,
      phoneSecondary: item.phoneSecondary || "",
      tollFreeNumber: item.tollFreeNumber || "",
      whatsappNumber: item.whatsappNumber || "",
      email: item.email || "",
      availableHours: item.availableHours || "",
      is24x7: item.is24x7,
      isEmergency: item.isEmergency,
      isTollFree: item.isTollFree,
      isWhatsAppEnabled: item.isWhatsAppEnabled,
      areaWardCoverage: item.areaWardCoverage || "",
      address: item.address || "",
      colorScheme: item.colorScheme || "indigo",
      displayOrder: item.displayOrder,
      isActive: item.isActive,
      notes: item.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.phonePrimary.trim()) {
      toast.error("Please enter a title and primary phone number");
      return;
    }

    try {
      setSaving(true);
      if (editingHelpline) {
        await helplinesApi.update(editingHelpline.id, formData);
        toast.success("Helpline contact updated successfully");
      } else {
        await helplinesApi.create(formData);
        toast.success("Helpline contact created successfully");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Save helpline error:", err);
      toast.error(err.response?.data?.message || "Failed to save helpline contact");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: HelplineContact) => {
    try {
      const newStatus = !item.isActive;
      // Optimistic update
      setHelplines((prev) =>
        prev.map((h) => (h.id === item.id ? { ...h, isActive: newStatus } : h))
      );
      await helplinesApi.toggleStatus(item.id, newStatus);
      toast.success(
        `Helpline "${item.title}" ${newStatus ? "activated" : "deactivated"}`
      );
      helplinesApi.getStats().then((res) => {
        if (res.data?.success) setStats(res.data.data);
      });
    } catch (err: any) {
      toast.error("Failed to update status");
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await helplinesApi.delete(deleteTargetId);
      toast.success("Helpline contact deleted");
      setDeleteTargetId(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTargetId));
      fetchData();
    } catch (err: any) {
      toast.error("Failed to delete helpline contact");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const res = await helplinesApi.bulkDelete(selectedIds);
      toast.success(res.data?.message || `Successfully deleted ${selectedIds.length} contact(s)`);
      setIsBulkDeleteModalOpen(false);
      setSelectedIds([]);
      fetchData();
    } catch (err: any) {
      console.error("Bulk delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete selected contacts");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      setSeeding(true);
      const res = await helplinesApi.seedDefaults(false);
      toast.success(res.data?.message || "Standard helplines loaded!");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to seed default numbers");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 pb-20">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card/80 to-muted/40 p-6 rounded-2xl border backdrop-blur-md shadow-sm">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                <PhoneCall className="w-6 h-6 animate-pulse" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Emergency & Constituency Helplines
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage 24x7 emergency speed-dials, citizen grievance desks, and public safety helpline contacts visible to voters.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="gap-2 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
            >
              <Sparkles className={`w-4 h-4 ${seeding ? "animate-spin" : ""}`} />
              {seeding ? "Seeding Helplines..." : "Seed Standard Numbers"}
            </Button>

            <a
              href="/helpline"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center"
            >
              <Button variant="outline" size="sm" className="gap-1.5 font-medium">
                <ExternalLink className="w-4 h-4" />
                Preview Citizen Directory
              </Button>
            </a>

            <Button onClick={handleOpenCreateModal} size="sm" className="gap-2 font-semibold">
              <Plus className="w-4 h-4" />
              Add Helpline Contact
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <Card className="border shadow-xs hover:border-primary/40 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Contacts</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <PhoneCall className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs border-red-500/20 bg-red-500/5 hover:border-red-500/40 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400">Emergency</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.emergency}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
                <Flame className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs hover:border-emerald-500/40 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">24x7 Active</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.twentyFourSeven}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs hover:border-green-500/40 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">WhatsApp Desks</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.whatsappEnabled}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                <MessageSquare className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs hover:border-blue-500/40 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Toll-Free Lines</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.tollFree}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs hover:border-indigo-500/40 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Active Online</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.active}</p>
              </div>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter, Search & View Switcher Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-4 rounded-xl border">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search helpline title, phone number, coverage, notes..."
              className="pl-9 h-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[190px] h-10">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-muted/20 h-10">
              <Switch
                id="emergency-toggle"
                checked={emergencyOnly}
                onCheckedChange={setEmergencyOnly}
              />
              <Label htmlFor="emergency-toggle" className="text-xs font-medium cursor-pointer whitespace-nowrap">
                Emergency Only
              </Label>
            </div>

            {/* View Mode Switcher (Cards vs Table) */}
            <div className="flex items-center bg-muted/50 p-1 rounded-lg border">
              <Button
                type="button"
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="h-8 px-2.5 gap-1.5 text-xs font-medium"
                title="Cards Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </Button>
              <Button
                type="button"
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8 px-2.5 gap-1.5 text-xs font-medium"
                title="Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              title="Refresh"
              className="h-10 w-10 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.value;
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all whitespace-nowrap ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Top Selection Status Header (when items selected) */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/30 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <CheckSquare className="w-4 h-4" />
              <span>
                {selectedIds.length} of {helplines.length} contact(s) selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear Selection
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="h-8 text-xs gap-1.5 font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected ({selectedIds.length})
              </Button>
            </div>
          </div>
        )}

        {/* Helplines Content: Cards or Table */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 rounded-xl border bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : helplines.length === 0 ? (
          <Card className="border-dashed py-12 text-center bg-card/50">
            <CardContent className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <PhoneCall className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">No helpline numbers found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {searchQuery || selectedCategory !== "ALL"
                    ? "Try adjusting your filters or search terms."
                    : "Click below to seed default emergency and civic helpline contacts in 1 click."}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <Button onClick={handleSeedDefaults} disabled={seeding} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Seed Standard Helplines
                </Button>
                <Button variant="outline" onClick={handleOpenCreateModal}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Custom Helpline
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "table" ? (
          /* ══════════════════════════════════════════════════════════════════ */
          /* TABLE VIEW                                                        */
          /* ══════════════════════════════════════════════════════════════════ */
          <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="min-w-[200px]">Helpline & Department</TableHead>
                    <TableHead className="min-w-[140px]">Category</TableHead>
                    <TableHead className="min-w-[160px]">Contact Numbers</TableHead>
                    <TableHead className="min-w-[120px]">Features</TableHead>
                    <TableHead className="min-w-[140px]">Coverage / Area</TableHead>
                    <TableHead className="min-w-[130px]">Working Hours</TableHead>
                    <TableHead className="w-24 text-center">Status</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {helplines.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const meta = getCategoryMeta(item.category);
                    const Icon = meta.icon;

                    return (
                      <TableRow
                        key={item.id}
                        className={`transition-colors hover:bg-muted/30 ${
                          isSelected ? "bg-primary/5 hover:bg-primary/10" : ""
                        } ${!item.isActive ? "opacity-60" : ""}`}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelect(item.id)}
                            aria-label={`Select ${item.title}`}
                          />
                        </TableCell>

                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-semibold text-sm">
                              <span>{item.title}</span>
                              {item.isEmergency && (
                                <span className="flex h-2 w-2 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                              )}
                            </div>
                            {item.subtitle && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-medium border ${meta.color} inline-flex items-center gap-1`}
                          >
                            <Icon className="w-3 h-3" />
                            {meta.label}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-sm">{item.phonePrimary}</span>
                              <a
                                href={`tel:${item.phonePrimary}`}
                                className="p-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                title="Call Primary"
                              >
                                <PhoneCall className="w-3 h-3" />
                              </a>
                            </div>
                            {item.phoneSecondary && (
                              <p className="text-xs text-muted-foreground font-mono">
                                Sec: {item.phoneSecondary}
                              </p>
                            )}
                            {item.tollFreeNumber && item.tollFreeNumber !== item.phonePrimary && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                                Toll-Free: {item.tollFreeNumber}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.is24x7 && (
                              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                24x7
                              </Badge>
                            )}
                            {item.isTollFree && (
                              <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                Toll-Free
                              </Badge>
                            )}
                            {item.isWhatsAppEnabled && (
                              <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                                WhatsApp
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {item.areaWardCoverage ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[130px]">{item.areaWardCoverage}</span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {item.availableHours ? (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[120px]">{item.availableHours}</span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          <Switch
                            checked={item.isActive}
                            onCheckedChange={() => handleToggleStatus(item)}
                            className="scale-85"
                          />
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditModal(item)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTargetId(item.id)}
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════ */
          /* CARDS GRID VIEW                                                   */
          /* ══════════════════════════════════════════════════════════════════ */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {helplines.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const meta = getCategoryMeta(item.category);
              const Icon = meta.icon;

              return (
                <Card
                  key={item.id}
                  className={`group relative overflow-hidden transition-all duration-200 border hover:shadow-md ${
                    isSelected
                      ? "ring-2 ring-primary border-primary bg-primary/[0.02]"
                      : item.isEmergency
                      ? "border-red-500/30 bg-gradient-to-br from-red-500/[0.03] to-card"
                      : "bg-card"
                  } ${!item.isActive ? "opacity-60 grayscale-[0.3]" : ""}`}
                >
                  {item.isEmergency && (
                    <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                    </div>
                  )}

                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(item.id)}
                          aria-label={`Select ${item.title}`}
                          className="mr-1"
                        />
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-medium border ${meta.color} flex items-center gap-1`}
                        >
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.is24x7 && (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                            24x7
                          </Badge>
                        )}
                        {item.isTollFree && (
                          <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                            Toll-Free
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-3">
                    {/* Primary Phone / Call CTA */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Primary Number</p>
                          <p className="text-base font-bold tracking-tight font-mono">
                            {item.phonePrimary}
                          </p>
                        </div>
                      </div>

                      <a
                        href={`tel:${item.phonePrimary}`}
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                        title="Click to Call"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </a>
                    </div>

                    {/* Secondary & WhatsApp Links */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {item.phoneSecondary && (
                        <span className="inline-flex items-center gap-1 bg-muted/60 px-2 py-1 rounded-md">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {item.phoneSecondary}
                        </span>
                      )}
                      {item.whatsappNumber && (
                        <a
                          href={`https://wa.me/${item.whatsappNumber.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 px-2 py-1 rounded-md transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          WhatsApp
                        </a>
                      )}
                      {item.areaWardCoverage && (
                        <span className="inline-flex items-center gap-1 bg-muted/60 px-2 py-1 rounded-md">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {item.areaWardCoverage}
                        </span>
                      )}
                    </div>

                    {item.availableHours && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.availableHours}
                      </p>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 border-t flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.isActive}
                          onCheckedChange={() => handleToggleStatus(item)}
                          className="scale-90"
                        />
                        <span className="text-xs font-medium text-muted-foreground">
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(item)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTargetId(item.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Floating Bulk Action Bar (when selected) */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-800 dark:border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center gap-2 text-sm font-bold">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span>{selectedIds.length} Contact(s) Selected</span>
            </div>

            <div className="h-4 w-px bg-slate-700 dark:bg-slate-300" />

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="gap-1.5 font-bold h-8 text-xs bg-red-600 hover:bg-red-700 text-white shadow-md"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedIds([])}
              className="h-8 w-8 text-slate-400 hover:text-white dark:hover:text-slate-900"
              title="Cancel Selection"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Add / Edit Helpline Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <PhoneCall className="w-5 h-5 text-primary" />
                {editingHelpline ? "Edit Helpline Contact" : "Add New Helpline Contact"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter((c) => c.value !== "ALL").map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="title">Helpline Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Police Control Room / Ambulance"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subtitle">Subtitle / Department Name</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. City Emergency Response Command & Control"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phonePrimary">Primary Phone *</Label>
                  <Input
                    id="phonePrimary"
                    value={formData.phonePrimary}
                    onChange={(e) => setFormData({ ...formData, phonePrimary: e.target.value })}
                    placeholder="e.g. 112 or +91 9876543210"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phoneSecondary">Secondary Phone</Label>
                  <Input
                    id="phoneSecondary"
                    value={formData.phoneSecondary}
                    onChange={(e) => setFormData({ ...formData, phoneSecondary: e.target.value })}
                    placeholder="e.g. 100 or landline"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tollFreeNumber">Toll-Free Number</Label>
                  <Input
                    id="tollFreeNumber"
                    value={formData.tollFreeNumber}
                    onChange={(e) => setFormData({ ...formData, tollFreeNumber: e.target.value })}
                    placeholder="e.g. 1800-XXX-XXXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                  <Input
                    id="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    placeholder="e.g. +91 9876543210"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. helpdesk@constituency.gov.in"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="availableHours">Available Hours</Label>
                  <Input
                    id="availableHours"
                    value={formData.availableHours}
                    onChange={(e) => setFormData({ ...formData, availableHours: e.target.value })}
                    placeholder="e.g. 24x7 All Days or 9:00 AM - 6:00 PM"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="areaWardCoverage">Ward / Area Coverage</Label>
                  <Input
                    id="areaWardCoverage"
                    value={formData.areaWardCoverage}
                    onChange={(e) => setFormData({ ...formData, areaWardCoverage: e.target.value })}
                    placeholder="e.g. All Wards / Ward 1-15 / District Wide"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes / Citizen Guidelines</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Instructions for citizen callers, required documents, or emergency guidelines..."
                  rows={2}
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isEmergency" className="text-xs cursor-pointer font-medium">
                    Emergency Dial
                  </Label>
                  <Switch
                    id="isEmergency"
                    checked={formData.isEmergency}
                    onCheckedChange={(v) => setFormData({ ...formData, isEmergency: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is24x7" className="text-xs cursor-pointer font-medium">
                    24x7 Active
                  </Label>
                  <Switch
                    id="is24x7"
                    checked={formData.is24x7}
                    onCheckedChange={(v) => setFormData({ ...formData, is24x7: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isWhatsAppEnabled" className="text-xs cursor-pointer font-medium">
                    WhatsApp Desk
                  </Label>
                  <Switch
                    id="isWhatsAppEnabled"
                    checked={formData.isWhatsAppEnabled}
                    onCheckedChange={(v) => setFormData({ ...formData, isWhatsAppEnabled: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive" className="text-xs cursor-pointer font-medium">
                    Active Status
                  </Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingHelpline ? "Update Contact" : "Create Contact"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Single Confirmation Dialog */}
        <AlertDialog
          open={Boolean(deleteTargetId)}
          onOpenChange={(open) => !open && setDeleteTargetId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this helpline contact?</AlertDialogTitle>
              <AlertDialogDescription>
                This contact will be permanently removed from the helpline directory and citizen portals.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog
          open={isBulkDeleteModalOpen}
          onOpenChange={setIsBulkDeleteModalOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Delete {selectedIds.length} Helpline Contact(s)?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete all <span className="font-bold text-foreground">{selectedIds.length}</span> selected helpline contacts? This action cannot be undone and will immediately remove them from the public citizen directory.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {bulkDeleting ? "Deleting..." : `Delete ${selectedIds.length} Contacts`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default HelplinesAdminPage;
