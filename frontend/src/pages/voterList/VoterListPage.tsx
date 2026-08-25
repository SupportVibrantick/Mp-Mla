import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { voterListApi, wardsApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import {
  Users,
  UserCheck,
  UserX,
  Upload,
  Download,
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  FileText,
  Building2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ══════════════════════════════════════════════════════════
// MAIN VOTER LIST PAGE
// ══════════════════════════════════════════════════════════

export default function VoterListPage() {
  const { toast } = useToast();

  // Filters & Pagination State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedWard, setSelectedWard] = useState<string>("ALL");
  const [selectedGender, setSelectedGender] = useState<string>("ALL");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedVoter, setSelectedVoter] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Single Voter Form State
  const [form, setForm] = useState({
    wardId: "",
    wardAreaId: "",
    voterIdNumber: "",
    slNo: "",
    sectionNo: "",
    boothNo: "",
    name: "",
    relativeName: "",
    relationType: "F",
    gender: "MALE",
    age: "",
    houseNo: "",
    address: "",
    locality: "",
    phone: "",
    isDisabled: false,
  });

  // Bulk Upload State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkRawText, setBulkRawText] = useState("");
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResult, setBulkResult] = useState<any>(null);

  // ─── Queries ─────────────────────────────────────────────
  const { data: wardsRes } = useQuery({
    queryKey: ["wards"],
    queryFn: () => wardsApi.list({ limit: 100 }),
  });
  const wards = wardsRes?.data?.data?.wards || wardsRes?.data?.data || [];

  const queryParams = useMemo(() => {
    const p: any = { page, limit: 20 };
    if (search.trim()) p.search = search.trim();
    if (selectedWard !== "ALL") p.wardId = selectedWard;
    if (selectedGender !== "ALL") p.gender = selectedGender;
    return p;
  }, [page, search, selectedWard, selectedGender]);

  const {
    data: votersRes,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["voters", queryParams],
    queryFn: () => voterListApi.list(queryParams),
  });

  const { data: statsRes } = useQuery({
    queryKey: ["voter-stats", selectedWard],
    queryFn: () =>
      voterListApi.stats(
        selectedWard !== "ALL" ? { wardId: selectedWard } : {},
      ),
  });

  const voters = votersRes?.data?.data?.voters || [];
  const pagination = votersRes?.data?.data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  };
  const stats = statsRes?.data?.data || {
    totalVoters: 0,
    disabledCount: 0,
    gender: { MALE: 0, FEMALE: 0, TRANSGENDER: 0 },
    ageBands: {},
  };

  // ─── Mutations ───────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => voterListApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voters"] });
      queryClient.invalidateQueries({ queryKey: ["voter-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["demographics"] });
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Voter record added successfully",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to create voter",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      voterListApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voters"] });
      queryClient.invalidateQueries({ queryKey: ["voter-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["demographics"] });
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      setIsEditOpen(false);
      setSelectedVoter(null);
      resetForm();
      toast({
        title: "Success",
        description: "Voter updated successfully",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to update voter",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => voterListApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voters"] });
      queryClient.invalidateQueries({ queryKey: ["voter-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["demographics"] });
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      setDeleteConfirmId(null);
      toast({
        title: "Deleted",
        description: "Voter record soft-deleted",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to delete voter",
        variant: "destructive",
      });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (payload: any) => voterListApi.bulkUpload(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["voters"] });
      queryClient.invalidateQueries({ queryKey: ["voter-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["demographics"] });
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      setBulkResult(res.data.data);
      setBulkProgress(100);
      toast({
        title: "Bulk Upload Complete",
        description: res.data.message,
      });
    },
    onError: (err: any) => {
      setBulkProgress(0);
      toast({
        title: "Bulk Upload Failed",
        description:
          err?.response?.data?.message || "Bulk upload process failed",
        variant: "destructive",
      });
    },
  });

  // ─── Handlers ────────────────────────────────────────────
  function resetForm() {
    setForm({
      wardId: "",
      wardAreaId: "",
      voterIdNumber: "",
      slNo: "",
      sectionNo: "",
      boothNo: "",
      name: "",
      relativeName: "",
      relationType: "F",
      gender: "MALE",
      age: "",
      houseNo: "",
      address: "",
      locality: "",
      phone: "",
      isDisabled: false,
    });
  }

  function handleOpenCreate() {
    resetForm();
    if (wards.length > 0) setForm((p) => ({ ...p, wardId: wards[0].id }));
    setIsCreateOpen(true);
  }

  function handleOpenEdit(voter: any) {
    setSelectedVoter(voter);
    setForm({
      wardId: voter.wardId || "",
      wardAreaId: voter.wardAreaId || "",
      voterIdNumber: voter.voterIdNumber || "",
      slNo: voter.slNo ? String(voter.slNo) : "",
      sectionNo: voter.sectionNo ? String(voter.sectionNo) : "",
      boothNo: voter.boothNo ? String(voter.boothNo) : "",
      name: voter.name || "",
      relativeName: voter.relativeName || "",
      relationType: voter.relationType || "F",
      gender: voter.gender || "MALE",
      age: voter.age ? String(voter.age) : "",
      houseNo: voter.houseNo || "",
      address: voter.address || "",
      locality: voter.locality || "",
      phone: voter.phone || "",
      isDisabled: voter.isDisabled || false,
    });
    setIsEditOpen(true);
  }

  function handleSaveCreate() {
    if (!form.voterIdNumber.trim() || !form.name.trim() || !form.wardId) {
      toast({
        title: "Validation Error",
        description: "Voter ID, Name, and Ward are required fields",
        variant: "destructive",
      });
      return;
    }
    const payload = {
      ...form,
      slNo: form.slNo ? parseInt(form.slNo) : null,
      sectionNo: form.sectionNo ? parseInt(form.sectionNo) : null,
      boothNo: form.boothNo ? parseInt(form.boothNo) : null,
      age: form.age ? parseInt(form.age) : null,
    };
    createMutation.mutate(payload);
  }

  function handleSaveEdit() {
    if (!selectedVoter) return;
    const payload = {
      ...form,
      slNo: form.slNo ? parseInt(form.slNo) : null,
      sectionNo: form.sectionNo ? parseInt(form.sectionNo) : null,
      boothNo: form.boothNo ? parseInt(form.boothNo) : null,
      age: form.age ? parseInt(form.age) : null,
    };
    updateMutation.mutate({ id: selectedVoter.id, data: payload });
  }

  // Parse CSV text locally into JSON objects for bulk payload
  function parseCSVToRows(csvText: string): any[] {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length <= 1) return [];

    // Header row
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine.trim()) continue;
      // Handle quoted fields
      const values: string[] = [];
      let insideQuote = false;
      let curVal = "";

      for (let char of currentLine) {
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === "," && !insideQuote) {
          values.push(curVal.trim());
          curVal = "";
        } else {
          curVal += char;
        }
      }
      values.push(curVal.trim());

      const obj: any = {};
      headers.forEach((h, idx) => {
        if (values[idx] !== undefined) {
          obj[h] = values[idx];
        }
      });
      rows.push(obj);
    }
    return rows;
  }

  async function handleProcessBulkUpload() {
    if (!bulkFile && !bulkRawText.trim()) {
      toast({
        title: "No Data",
        description: "Please choose a CSV file or paste CSV content",
        variant: "destructive",
      });
      return;
    }

    setBulkProgress(25);
    setBulkResult(null);

    let rows: any[] = [];
    let fileName = bulkFile ? bulkFile.name : "manual_paste.csv";

    if (bulkFile) {
      const nameLower = bulkFile.name.toLowerCase();
      if (nameLower.endsWith(".xlsx") || nameLower.endsWith(".xls")) {
        const arrayBuffer = await bulkFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      } else {
        const text = await bulkFile.text();
        rows = parseCSVToRows(text);
      }
    } else if (bulkRawText.trim()) {
      rows = parseCSVToRows(bulkRawText);
    }

    if (rows.length === 0) {
      setBulkProgress(0);
      toast({
        title: "Parsing Error",
        description: "Could not parse any valid data rows from the CSV file",
        variant: "destructive",
      });
      return;
    }

    setBulkProgress(50);
    bulkMutation.mutate({ fileName, rows });
  }

  async function handleDownloadSampleTemplate() {
    try {
      const res = await voterListApi.downloadSampleCSV();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "voter_list_sample_template.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast({
        title: "Download Failed",
        description: "Failed to download sample CSV template",
        variant: "destructive",
      });
    }
  }

  async function handleDownloadSampleExcel() {
    try {
      const res = await voterListApi.downloadSampleExcel();
      const url = window.URL.createObjectURL(
        new Blob([res.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "voter_list_excel_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({
        title: "Excel Template Downloaded",
        description: "Template with interactive dropdown validation ready!",
      });
    } catch {
      toast({
        title: "Download Failed",
        description: "Failed to download sample Excel template",
        variant: "destructive",
      });
    }
  }

  async function handleExportCSV() {
    try {
      const res = await voterListApi.exportCSV(queryParams);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute("download", `voter_list_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({
        title: "Export Started",
        description: "CSV file downloaded successfully",
      });
    } catch {
      toast({
        title: "Export Failed",
        description: "Failed to export voter list CSV",
        variant: "destructive",
      });
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6 pb-12">
        {/* ─── Header ───────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Voter List & Demographics
              </h1>
              <Badge
                variant="outline"
                className="border-primary/30 text-primary font-semibold"
              >
                Electoral Roll
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Constituent Voter Identity Records & Electoral Roll Ingestion
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSampleExcel}
              className="gap-1.5 border-dashed bg-emerald-50/50 border-emerald-300 hover:bg-emerald-100"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Excel Template (Dropdowns)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-1.5"
            >
              <Download className="h-4 w-4 text-blue-600" />
              <span>Export CSV</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setBulkFile(null);
                setBulkRawText("");
                setBulkProgress(0);
                setBulkResult(null);
                setIsBulkOpen(true);
              }}
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90"
            >
              <Upload className="h-4 w-4" />
              <span>Bulk Upload</span>
            </Button>

            <Button size="sm" onClick={handleOpenCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Add Voter</span>
            </Button>
          </div>
        </div>

        {/* ─── Metric Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border border-border/50 bg-card rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                Total Voters
              </span>
              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-foreground">
                {stats.totalVoters.toLocaleString()}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Constituency Total
              </p>
            </div>
          </Card>

          <Card className="border border-border/50 bg-card rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                Male Voters
              </span>
              <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-foreground">
                {(stats.gender.MALE || 0).toLocaleString()}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.totalVoters > 0
                  ? `${(((stats.gender.MALE || 0) / stats.totalVoters) * 100).toFixed(1)}% of total`
                  : "Male Voters"}
              </p>
            </div>
          </Card>

          <Card className="border border-border/50 bg-card rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                Female Voters
              </span>
              <div className="p-2 bg-pink-500/10 text-pink-600 rounded-xl">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-foreground">
                {(stats.gender.FEMALE || 0).toLocaleString()}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.totalVoters > 0
                  ? `${(((stats.gender.FEMALE || 0) / stats.totalVoters) * 100).toFixed(1)}% of total`
                  : "Female Voters"}
              </p>
            </div>
          </Card>

          <Card className="border border-border/50 bg-card rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                Disabled Voters
              </span>
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-foreground">
                {(stats.disabledCount || 0).toLocaleString()}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Special assistance voters
              </p>
            </div>
          </Card>
        </div>

        {/* ─── Filter Bar ────────────────────────────────────────── */}
        <Card className="border border-border/50 bg-card rounded-2xl p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Name, EPIC ID, Phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={selectedWard}
              onValueChange={(val) => {
                setSelectedWard(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="All Wards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Wards</SelectItem>
                {wards.map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>
                    Ward {w.wardNumber} - {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedGender}
              onValueChange={(val) => {
                setSelectedGender(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="All Genders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Genders</SelectItem>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="TRANSGENDER">Transgender</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* ─── Voter Table ────────────────────────────────────────── */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[140px]">EPIC ID</TableHead>
                  <TableHead>Voter Name</TableHead>
                  <TableHead>Relative Name</TableHead>
                  <TableHead className="w-[90px]">Gender</TableHead>
                  <TableHead className="w-[70px]">Age</TableHead>
                  <TableHead>Ward & Locality</TableHead>
                  <TableHead className="text-right w-[100px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-10" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : voters.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="font-semibold text-base">No Voters Found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try adjusting your search filters or bulk upload a new
                        voter list CSV
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  voters.map((v: any) => (
                    <TableRow key={v.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono font-semibold text-xs text-primary">
                        {v.voterIdNumber}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {v.name}
                        </div>
                        {v.houseNo && (
                          <div className="text-[11px] text-muted-foreground">
                            H.No: {v.houseNo}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {v.relativeName ? (
                          <span>
                            {v.relativeName}{" "}
                            {v.relationType && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                ({v.relationType})
                              </span>
                            )}
                          </span>
                        ) : (
                          " - "
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            v.gender === "MALE"
                              ? "bg-blue-500/10 text-blue-600 border-blue-200"
                              : v.gender === "FEMALE"
                                ? "bg-pink-500/10 text-pink-600 border-pink-200"
                                : "bg-purple-500/10 text-purple-600 border-purple-200"
                          }
                        >
                          {v.gender}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {v.age ?? " - "}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium text-foreground">
                          {v.ward?.name
                            ? `Ward ${v.ward.wardNumber} - ${v.ward.name}`
                            : " - "}
                        </div>
                        {v.locality && (
                          <div className="text-[11px] text-muted-foreground">
                            {v.locality}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => handleOpenEdit(v)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteConfirmId(v.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/50 text-xs">
              <span className="text-muted-foreground">
                Showing page {pagination.page} of {pagination.totalPages} (
                {pagination.total} total)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-8 gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 gap-1"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ─── Single Voter Create/Edit Dialog ──────────────────── */}
      <Dialog
        open={isCreateOpen || isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setIsEditOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span>{isEditOpen ? "Edit Voter Record" : "Add New Voter"}</span>
            </DialogTitle>
            <DialogDescription>
              {isEditOpen
                ? "Update constituent voter identity and ward assignment."
                : "Add an individual voter record to the ward electoral roll."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3">
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs font-semibold">Ward *</Label>
              <Select
                value={form.wardId}
                onValueChange={(val) => setForm((p) => ({ ...p, wardId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Ward" />
                </SelectTrigger>
                <SelectContent>
                  {wards.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      Ward {w.wardNumber} - {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">EPIC Voter ID *</Label>
              <Input
                placeholder="e.g. ABC1234567"
                value={form.voterIdNumber}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    voterIdNumber: e.target.value.toUpperCase(),
                  }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Full Name *</Label>
              <Input
                placeholder="Constituent Name"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Gender *</Label>
              <Select
                value={form.gender}
                onValueChange={(val) => setForm((p) => ({ ...p, gender: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="TRANSGENDER">Transgender</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Age</Label>
              <Input
                type="number"
                placeholder="Age in years"
                value={form.age}
                onChange={(e) =>
                  setForm((p) => ({ ...p, age: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Relative Name</Label>
              <Input
                placeholder="Father/Husband Name"
                value={form.relativeName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, relativeName: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Relation Type</Label>
              <Select
                value={form.relationType}
                onValueChange={(val) =>
                  setForm((p) => ({ ...p, relationType: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="F">Father (F)</SelectItem>
                  <SelectItem value="H">Husband (H)</SelectItem>
                  <SelectItem value="M">Mother (M)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Polling Booth No</Label>
              <Input
                type="number"
                placeholder="e.g. 12"
                value={form.boothNo}
                onChange={(e) =>
                  setForm((p) => ({ ...p, boothNo: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Section / Part No</Label>
              <Input
                type="number"
                placeholder="e.g. 1"
                value={form.sectionNo}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sectionNo: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Serial No in List</Label>
              <Input
                type="number"
                placeholder="e.g. 101"
                value={form.slNo}
                onChange={(e) =>
                  setForm((p) => ({ ...p, slNo: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">House No</Label>
              <Input
                placeholder="House/Flat number"
                value={form.houseNo}
                onChange={(e) =>
                  setForm((p) => ({ ...p, houseNo: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Locality / Colony</Label>
              <Input
                placeholder="Colony / Sector Name"
                value={form.locality}
                onChange={(e) =>
                  setForm((p) => ({ ...p, locality: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Full Address</Label>
              <Input
                placeholder="Full residential address"
                value={form.address}
                onChange={(e) =>
                  setForm((p) => ({ ...p, address: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Phone Number</Label>
              <Input
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <input
                type="checkbox"
                id="isDisabled"
                checked={form.isDisabled}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isDisabled: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label
                htmlFor="isDisabled"
                className="text-xs cursor-pointer font-medium"
              >
                Disabled / Special Assistance Voter
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditOpen ? handleSaveEdit : handleSaveCreate}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              {isEditOpen ? "Save Changes" : "Create Voter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Bulk Upload Modal ────────────────────────────────── */}
      <Dialog
        open={isBulkOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsBulkOpen(false);
            setBulkResult(null);
            setBulkProgress(0);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-600" />
              <span>Scalable Bulk Ingestion (1M+ Records)</span>
            </DialogTitle>
            <DialogDescription>
              Upload voter electoral rolls in Excel (.xlsx) or CSV format.
              Batches are processed in high-throughput chunks of 5,000 records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Download Sample Callout */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs gap-2">
              <div className="flex items-center gap-2 text-emerald-800">
                <FileSpreadsheet className="h-4 w-4 flex-shrink-0" />
                <span>
                  Download sample templates pre-configured with interactive
                  dropdown validation lists for Wards, Gender, & Relations.
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSampleExcel}
                  className="bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-xs h-7 gap-1"
                >
                  <FileSpreadsheet className="h-3 w-3" /> Download Excel (.xlsx)
                  Template
                </Button>
              </div>
            </div>

            {/* File Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Select Excel or CSV File (.xlsx, .xls, .csv)
              </Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setBulkFile(file);
                }}
              />
              {bulkFile && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Selected file:{" "}
                  <span className="font-mono font-semibold">
                    {bulkFile.name}
                  </span>{" "}
                  ({(bulkFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Or Paste CSV Raw Text */}
            {!bulkFile && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Or Paste CSV Text directly
                </Label>
                <textarea
                  rows={4}
                  placeholder={`voterIdNumber,wardNumber,name,gender,relativeName\nABC1234567,1,Rajesh Kumar,MALE,Suresh Kumar`}
                  value={bulkRawText}
                  onChange={(e) => setBulkRawText(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            )}

            {/* Progress Bar */}
            {bulkMutation.isPending && (
              <div className="space-y-1.5 py-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Processing & Ingesting Batches...</span>
                  <span>{bulkProgress}%</span>
                </div>
                <Progress value={bulkProgress} className="h-2" />
              </div>
            )}

            {/* Ingestion Results & Detailed Per-Row Error Log */}
            {bulkResult && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                      Total
                    </span>
                    <span className="text-base font-bold">
                      {bulkResult.totalRows}
                    </span>
                  </div>
                  <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl">
                    <span className="block text-[10px] uppercase font-semibold">
                      Success
                    </span>
                    <span className="text-base font-bold">
                      {bulkResult.successCount}
                    </span>
                  </div>
                  <div className="bg-amber-50 text-amber-800 p-2 rounded-xl">
                    <span className="block text-[10px] uppercase font-semibold">
                      Duplicates
                    </span>
                    <span className="text-base font-bold">
                      {bulkResult.duplicateCount}
                    </span>
                  </div>
                  <div className="bg-rose-50 text-rose-800 p-2 rounded-xl">
                    <span className="block text-[10px] uppercase font-semibold">
                      Failed
                    </span>
                    <span className="text-base font-bold">
                      {bulkResult.failedCount}
                    </span>
                  </div>
                </div>

                {/* Per-row Error Table */}
                {bulkResult.errors && bulkResult.errors.length > 0 && (
                  <div className="border border-rose-200 rounded-xl overflow-hidden">
                    <div className="bg-rose-50 px-3 py-2 border-b border-rose-200 flex items-center justify-between">
                      <span className="text-xs font-semibold text-rose-800 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                        Row Error Details ({bulkResult.errors.length} errors)
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-rose-50/50 text-[11px]">
                            <TableHead className="w-[60px]">Row #</TableHead>
                            <TableHead className="w-[120px]">EPIC ID</TableHead>
                            <TableHead>Field / Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {bulkResult.errors.map((err: any, idx: number) => (
                            <TableRow key={idx} className="hover:bg-rose-50/30">
                              <TableCell className="font-mono text-muted-foreground">
                                #{err.rowIndex}
                              </TableCell>
                              <TableCell className="font-mono font-medium text-foreground">
                                {err.voterIdNumber || " - "}
                              </TableCell>
                              <TableCell className="text-rose-700">
                                {err.field && (
                                  <span className="font-semibold mr-1">
                                    [{err.field}]:
                                  </span>
                                )}
                                {err.error}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handleProcessBulkUpload}
              disabled={
                bulkMutation.isPending || (!bulkFile && !bulkRawText.trim())
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {bulkMutation.isPending && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              Start Batch Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ──────────────────────── */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>Confirm Soft-Delete</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to soft-delete this voter record? The voter
              will be marked as DELETED and ward demographics will be
              automatically recalculated.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId);
              }}
            >
              {deleteMutation.isPending && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete Voter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
