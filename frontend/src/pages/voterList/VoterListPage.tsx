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
import api, { voterListApi, wardsApi, voterFamilyApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { getImageUrl } from "@/lib/utils";
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
  KeyRound,
  Briefcase,
  HeartHandshake,
  PhoneCall,
  UserPlus,
  Calendar,
  IndianRupee,
  User,
  MapPin,
  Mail,
  ShieldAlert,
  Loader2,
  X,
  Camera,
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Reset Password Modal State
  const [resetPasswordVoter, setResetPasswordVoter] = useState<any>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);

  // Identity Verification Document Modal State
  const [docModalVoter, setDocModalVoter] = useState<any>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

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
    bloodGroup: "",
    photoUrl: "",
    isDisabled: false,
  });

  // Photo Upload States
  const [uploadingVoterPhoto, setUploadingVoterPhoto] = useState(false);
  const [uploadingMemberPhoto, setUploadingMemberPhoto] = useState(false);

  const handleVoterPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("photo", file);
    setUploadingVoterPhoto(true);
    try {
      const res = await api.post("/admin/voter-list/upload-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success) {
        setForm((p) => ({ ...p, photoUrl: res.data.data.photoUrl }));
        toast({ title: "Photo Uploaded", description: "Voter profile photo uploaded successfully." });
      }
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.response?.data?.message || "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploadingVoterPhoto(false);
    }
  };

  const handleMemberPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("photo", file);
    setUploadingMemberPhoto(true);
    try {
      const res = await api.post("/admin/voter-list/upload-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success) {
        setMemberForm((p) => ({ ...p, photoUrl: res.data.data.photoUrl }));
        toast({ title: "Photo Uploaded", description: "Family member photo uploaded successfully." });
      }
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.response?.data?.message || "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploadingMemberPhoto(false);
    }
  };

  // Bulk Upload State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkRawText, setBulkRawText] = useState("");
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResult, setBulkResult] = useState<any>(null);

  // ─── Family & Household State ──────────────────────────────
  const [selectedFamilyVoter, setSelectedFamilyVoter] = useState<any>(null);
  const [isFamilyOpen, setIsFamilyOpen] = useState(false);

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null);

  const initialMemberForm = {
    name: "",
    relationType: "SPOUSE",
    relationCustom: "",
    gender: "FEMALE",
    dateOfBirth: "",
    age: "",
    phone: "",
    email: "",
    photoUrl: "",
    voterIdNumber: "",
    isDependent: false,
    isEmergencyContact: false,
    isPrimaryContact: false,
    sameAddress: true,
    address: "",
    bloodGroup: "",
    occupationCategory: "PRIVATE_EMPLOYEE",
    occupationTitle: "",
    workingOrganization: "",
    workingDescription: "",
    incomeRange: "NOT_DISCLOSED",
    remarks: "",
  };

  const [memberForm, setMemberForm] = useState(initialMemberForm);

  const resetMemberForm = () => {
    setMemberForm(initialMemberForm);
    setEditingMember(null);
  };

  // ─── Family Queries & Mutations ───────────────────────────
  const {
    data: familyDataRes,
    isLoading: isLoadingFamily,
    refetch: refetchFamily,
  } = useQuery({
    queryKey: ["voter-family", selectedFamilyVoter?.id],
    queryFn: () => voterFamilyApi.getFamily(selectedFamilyVoter.id),
    enabled: !!selectedFamilyVoter?.id && isFamilyOpen,
  });

  const familyMembers = familyDataRes?.data?.data?.members || [];
  const familyStats = familyDataRes?.data?.data?.stats || {
    totalMembers: 0,
    earningMembers: 0,
    dependentsCount: 0,
    emergencyContactsCount: 0,
  };

  const createMemberMutation = useMutation({
    mutationFn: (data: any) =>
      voterFamilyApi.createMember(selectedFamilyVoter.id, data),
    onSuccess: () => {
      refetchFamily();
      queryClient.invalidateQueries({ queryKey: ["voters"] });
      setIsMemberModalOpen(false);
      resetMemberForm();
      toast({
        title: "Success",
        description: "Family member added successfully",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description:
          err?.response?.data?.message || "Failed to add family member",
        variant: "destructive",
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      voterFamilyApi.updateMember(id, data),
    onSuccess: () => {
      refetchFamily();
      queryClient.invalidateQueries({ queryKey: ["voters"] });
      setIsMemberModalOpen(false);
      setEditingMember(null);
      resetMemberForm();
      toast({
        title: "Success",
        description: "Family member details updated successfully",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description:
          err?.response?.data?.message || "Failed to update family member",
        variant: "destructive",
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id: string) => voterFamilyApi.deleteMember(id),
    onSuccess: () => {
      refetchFamily();
      queryClient.invalidateQueries({ queryKey: ["voters"] });
      setDeleteMemberId(null);
      toast({
        title: "Success",
        description: "Family member removed",
      });
    },
  });

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

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword?: string }) =>
      voterListApi.resetPassword(id, newPassword ? { newPassword } : {}),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["voters"] });
      toast({
        title: "Password Reset Successful",
        description:
          res?.data?.message || "Voter portal password updated successfully",
      });
      setIsResetPasswordOpen(false);
      setResetPasswordVoter(null);
      setNewPasswordInput("");
    },
    onError: (err: any) => {
      toast({
        title: "Reset Failed",
        description:
          err?.response?.data?.message || "Failed to reset voter password",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => voterListApi.bulkDelete(ids),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["voters"] });
      queryClient.invalidateQueries({ queryKey: ["voter-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["demographics"] });
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
      toast({
        title: "Bulk Delete Successful",
        description: res.data.message || "Selected voters soft-deleted",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to bulk delete voters",
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
      bloodGroup: "",
      photoUrl: "",
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
      bloodGroup: voter.bloodGroup || "",
      photoUrl: voter.photoUrl || "",
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
    <MainLayout title="Voter List">
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
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsBulkDeleteOpen(true)}
                className="gap-1.5 animate-in fade-in"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Selected ({selectedIds.length})</span>
              </Button>
            )}

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
                  <TableHead className="w-[40px] px-3">
                    <input
                      type="checkbox"
                      checked={
                        voters.length > 0 && selectedIds.length === voters.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(voters.map((v: any) => v.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="w-[140px]">Application No.</TableHead>
                  <TableHead className="w-[130px]">EPIC ID</TableHead>
                  <TableHead>Voter Name</TableHead>
                  <TableHead>Relative Name</TableHead>
                  <TableHead className="w-[90px]">Gender</TableHead>
                  <TableHead className="w-[70px]">Age</TableHead>
                  <TableHead className="w-[140px]">Verification Doc</TableHead>
                  <TableHead>Ward & Locality</TableHead>
                  <TableHead className="text-right w-[140px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
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
                      colSpan={10}
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
                      <TableCell className="w-[40px] px-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(v.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, v.id]);
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== v.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {v.applicationNumber ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-mono text-[11px]"
                          >
                            {v.applicationNumber}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs font-normal">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-xs text-primary">
                        {v.voterIdNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {v.photoUrl ? (
                            <img
                              src={getImageUrl(v.photoUrl)}
                              alt={v.name}
                              className="h-8 w-8 rounded-full object-cover border border-indigo-200 dark:border-indigo-800 shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-200/50">
                              {v.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-foreground">{v.name}</div>
                            {v.houseNo && (
                              <div className="text-[11px] text-muted-foreground">
                                H.No: {v.houseNo}
                              </div>
                            )}
                          </div>
                        </div>
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
                        {v.identityVerifications?.[0] ? (
                          <div className="flex flex-col gap-1">
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] border-emerald-300 font-bold gap-1 w-fit">
                              <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              Verified
                            </Badge>
                            {v.identityVerifications[0].documentUrl ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 gap-1 w-fit shadow-xs"
                                onClick={() => {
                                  setDocModalVoter(v);
                                  setIsDocModalOpen(true);
                                }}
                              >
                                <FileText className="h-3 w-3 text-indigo-600" />
                                View Doc
                              </Button>
                            ) : v.identityVerifications[0].aadhaarNumber ? (
                              <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                                {v.identityVerifications[0].aadhaarNumber}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 border-slate-200 text-[10px] font-normal">
                            Unverified
                          </Badge>
                        )}
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
                            size="sm"
                            className="h-7 px-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-medium gap-1"
                            title="Manage Family & Household Details (परिवार एवं घरेलू विवरण)"
                            onClick={() => {
                              setSelectedFamilyVoter(v);
                              setIsFamilyOpen(true);
                            }}
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Family</span>
                            {v._count?.familyMembers > 0 && (
                              <Badge className="ml-0.5 px-1 py-0 text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 border-none font-bold">
                                {v._count.familyMembers}
                              </Badge>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-amber-600"
                            title="Reset Voter Portal Password"
                            onClick={() => {
                              setResetPasswordVoter(v);
                              setNewPasswordInput("");
                              setIsResetPasswordOpen(true);
                            }}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          {v.identityVerifications?.[0]?.documentUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              title="View Aadhaar Verification Document"
                              onClick={() => {
                                setDocModalVoter(v);
                                setIsDocModalOpen(true);
                              }}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
            {/* Voter Photo Upload */}
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs font-semibold">Voter Profile Photo</Label>
              <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-border/60">
                <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
                  {form.photoUrl ? (
                    <img
                      src={getImageUrl(form.photoUrl)}
                      alt="Voter Photo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-muted-foreground" />
                  )}
                  {uploadingVoterPhoto && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <label
                    htmlFor="voterPhotoUploadInput"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {form.photoUrl ? "Change Photo" : "Upload Voter Photo"}
                    <input
                      id="voterPhotoUploadInput"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleVoterPhotoUpload}
                      disabled={uploadingVoterPhoto}
                    />
                  </label>
                  {form.photoUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                      onClick={() => setForm((p) => ({ ...p, photoUrl: "" }))}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

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
              <Label className="text-xs">Blood Group (Optional)</Label>
              <Select
                value={form.bloodGroup || "NONE"}
                onValueChange={(val) =>
                  setForm((p) => ({ ...p, bloodGroup: val === "NONE" ? "" : val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Blood Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not Specified</SelectItem>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
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

      {/* ─── Bulk Delete Confirmation Dialog ──────────────────────── */}
      <Dialog
        open={isBulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open) setIsBulkDeleteOpen(false);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>Confirm Bulk Soft-Delete</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to soft-delete <strong>{selectedIds.length}</strong> selected voter records? Selected voters will be marked as DELETED and ward demographics will be automatically recalculated.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={bulkDeleteMutation.isPending}
              onClick={() => {
                bulkDeleteMutation.mutate(selectedIds);
              }}
            >
              {bulkDeleteMutation.isPending && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete {selectedIds.length} Voters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reset Password Dialog ──────────────────────── */}
      <Dialog
        open={isResetPasswordOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsResetPasswordOpen(false);
            setResetPasswordVoter(null);
            setNewPasswordInput("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <KeyRound className="h-5 w-5 text-amber-600" />
              <span>Reset Voter Portal Password</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update or reset the password for this voter's portal account.
            </DialogDescription>
          </DialogHeader>

          {resetPasswordVoter && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 text-xs border border-border/50">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Voter Name:</span>
                  <span className="font-semibold text-foreground">
                    {resetPasswordVoter.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Application No:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {resetPasswordVoter.applicationNumber || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EPIC ID:</span>
                  <span className="font-mono font-semibold text-primary">
                    {resetPasswordVoter.voterIdNumber}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-xs font-semibold">
                  New Password (Optional)
                </Label>
                <Input
                  id="newPassword"
                  type="text"
                  placeholder="Leave blank to default to Application Number"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  If left blank, password will reset to:{" "}
                  <code className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    {resetPasswordVoter.applicationNumber ||
                      resetPasswordVoter.voterIdNumber}
                  </code>{" "}
                  and force password change on next voter portal login.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsResetPasswordOpen(false);
                setResetPasswordVoter(null);
                setNewPasswordInput("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={resetPasswordMutation.isPending}
              onClick={() => {
                if (resetPasswordVoter) {
                  resetPasswordMutation.mutate({
                    id: resetPasswordVoter.id,
                    newPassword: newPasswordInput.trim() || undefined,
                  });
                }
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {resetPasswordMutation.isPending && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Family & Household Main Modal ─────────────────── */}
      <Dialog
        open={isFamilyOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsFamilyOpen(false);
            setSelectedFamilyVoter(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 text-indigo-900 dark:text-indigo-300">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-indigo-600" />
                <span>Family & Household Details (परिवार एवं घरेलू विवरण)</span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manage family members, dependents, and working details for voter:{" "}
              <strong className="text-foreground">{selectedFamilyVoter?.name}</strong>{" "}
              (EPIC: <span className="font-mono">{selectedFamilyVoter?.voterIdNumber}</span>)
            </DialogDescription>
          </DialogHeader>

          {selectedFamilyVoter && (
            <div className="space-y-5 py-2">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-3 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Total Family
                    </span>
                    <span className="text-lg font-extrabold text-indigo-900 dark:text-indigo-200">
                      {familyStats.totalMembers} Members
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Earning Members
                    </span>
                    <span className="text-lg font-extrabold text-emerald-900 dark:text-emerald-200">
                      {familyStats.earningMembers} Working
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400">
                    <HeartHandshake className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Dependents
                    </span>
                    <span className="text-lg font-extrabold text-amber-900 dark:text-amber-200">
                      {familyStats.dependentsCount} Dependents
                    </span>
                  </div>
                </div>

                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-rose-500/10 rounded-lg text-rose-600 dark:text-rose-400">
                    <PhoneCall className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Emergency Contacts
                    </span>
                    <span className="text-lg font-extrabold text-rose-900 dark:text-rose-200">
                      {familyStats.emergencyContactsCount} Contacts
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <span>Household Members List</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {familyMembers.length}
                  </Badge>
                </h4>
                <Button
                  size="sm"
                  onClick={() => {
                    resetMemberForm();
                    setIsMemberModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs shadow-sm"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add Family Member</span>
                </Button>
              </div>

              {/* Family Members Grid / Cards */}
              {isLoadingFamily ? (
                <div className="space-y-3 py-4">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ) : familyMembers.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="font-semibold text-sm">No Family Members Registered</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Click <strong>"+ Add Family Member"</strong> above to register parents, spouse, children, dependents, or household workers with occupation details.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {familyMembers.map((m: any) => (
                    <Card
                      key={m.id}
                      className="border border-border/60 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Member Top Bar */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            {m.photoUrl ? (
                              <img
                                src={getImageUrl(m.photoUrl)}
                                alt={m.name}
                                className="h-10 w-10 rounded-full object-cover border border-indigo-200 shadow-sm"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-200">
                                {m.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <h5 className="font-bold text-sm text-foreground flex items-center gap-2">
                                {m.name}
                                {m.isEmergencyContact && (
                                  <Badge className="bg-rose-500 text-white text-[10px] px-1.5 py-0">
                                    Emergency
                                  </Badge>
                                )}
                              </h5>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-[10px] uppercase font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                  {m.relationType === "OTHER" && m.relationCustom ? m.relationCustom : m.relationType}
                                </Badge>
                                <span>•</span>
                                <span>{m.gender}</span>
                                {m.computedAge !== null && (
                                  <>
                                    <span>•</span>
                                    <span className="font-semibold text-foreground">{m.computedAge} yrs</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-indigo-600"
                              onClick={() => {
                                setEditingMember(m);
                                setMemberForm({
                                  name: m.name || "",
                                  relationType: m.relationType || "SPOUSE",
                                  relationCustom: m.relationCustom || "",
                                  gender: m.gender || "FEMALE",
                                  dateOfBirth: m.dateOfBirth ? m.dateOfBirth.substring(0, 10) : "",
                                  age: m.age ? String(m.age) : "",
                                  phone: m.phone || "",
                                  email: m.email || "",
                                  photoUrl: m.photoUrl || "",
                                  voterIdNumber: m.voterIdNumber || "",
                                  isDependent: Boolean(m.isDependent),
                                  isEmergencyContact: Boolean(m.isEmergencyContact),
                                  isPrimaryContact: Boolean(m.isPrimaryContact),
                                  sameAddress: m.sameAddress !== undefined ? Boolean(m.sameAddress) : true,
                                  address: m.address || "",
                                  bloodGroup: m.bloodGroup || "",
                                  occupationCategory: m.occupationCategory || "PRIVATE_EMPLOYEE",
                                  occupationTitle: m.occupationTitle || "",
                                  workingOrganization: m.workingOrganization || "",
                                  workingDescription: m.workingDescription || "",
                                  incomeRange: m.incomeRange || "NOT_DISCLOSED",
                                  remarks: m.remarks || "",
                                });
                                setIsMemberModalOpen(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                              onClick={() => setDeleteMemberId(m.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Extra Attributes & Address */}
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          {m.voterIdNumber && (
                            <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 dark:bg-slate-900 border-slate-300">
                              EPIC: {m.voterIdNumber}
                            </Badge>
                          )}
                          {m.isDependent && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] border-none">
                              Dependent
                            </Badge>
                          )}
                          {m.bloodGroup && (
                            <Badge variant="outline" className="text-rose-600 border-rose-200 text-[10px]">
                              Blood: {m.bloodGroup}
                            </Badge>
                          )}
                          {m.phone && (
                            <span className="text-muted-foreground flex items-center gap-1 font-mono">
                              <PhoneCall className="h-3 w-3" /> {m.phone}
                            </span>
                          )}
                          {m.sameAddress === false && m.address ? (
                            <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-900 border-slate-300 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-500" />
                              {m.address}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-emerald-600" />
                              Same Address as Voter
                            </Badge>
                          )}
                        </div>

                        {/* Occupation & Work Description Block */}
                        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                              {m.occupationTitle || m.occupationCategory?.replace(/_/g, " ") || "Occupation Not Specified"}
                            </span>
                            {m.occupationCategory && (
                              <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[9px] border-none font-semibold uppercase">
                                {m.occupationCategory.replace(/_/g, " ")}
                              </Badge>
                            )}
                          </div>

                          {m.workingOrganization && (
                            <p className="text-[11px] text-muted-foreground font-medium">
                              Organization: <span className="text-foreground font-semibold">{m.workingOrganization}</span>
                            </p>
                          )}

                          {m.workingDescription ? (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                              "{m.workingDescription}"
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground/60 italic">No working description added.</p>
                          )}

                          {m.incomeRange && m.incomeRange !== "NOT_DISCLOSED" && (
                            <div className="pt-1 flex items-center justify-end text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold gap-1">
                              <IndianRupee className="h-3 w-3" />
                              <span>Income: {m.incomeRange.replace("RANGE_", "").replace(/_/g, " - ")}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setIsFamilyOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add / Edit Family Member Modal ─────────────────── */}
      <Dialog
        open={isMemberModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsMemberModalOpen(false);
            resetMemberForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              <span>{editingMember ? "Edit Family Member" : "Add New Family Member"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter household details and work description for voter's family member.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingMember) {
                updateMemberMutation.mutate({
                  id: editingMember.id,
                  data: memberForm,
                });
              } else {
                createMemberMutation.mutate(memberForm);
              }
            }}
            className="space-y-4 py-2"
          >
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Full Name *</Label>
                <Input
                  required
                  placeholder="Member Name"
                  value={memberForm.name}
                  onChange={(e) =>
                    setMemberForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Relation Type *</Label>
                <Select
                  value={memberForm.relationType}
                  onValueChange={(val) =>
                    setMemberForm((p) => ({ ...p, relationType: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Relation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SPOUSE">Spouse (पति/पत्नी)</SelectItem>
                    <SelectItem value="SON">Son (पुत्र)</SelectItem>
                    <SelectItem value="DAUGHTER">Daughter (पुत्री)</SelectItem>
                    <SelectItem value="FATHER">Father (पिता)</SelectItem>
                    <SelectItem value="MOTHER">Mother (माता)</SelectItem>
                    <SelectItem value="BROTHER">Brother (भाई)</SelectItem>
                    <SelectItem value="SISTER">Sister (बहन)</SelectItem>
                    <SelectItem value="GRANDFATHER">Grandfather (दादा/नाना)</SelectItem>
                    <SelectItem value="GRANDMOTHER">Grandmother (दादी/नानी)</SelectItem>
                    <SelectItem value="GRANDSON">Grandson (पोता/नाती)</SelectItem>
                    <SelectItem value="GRANDDAUGHTER">Granddaughter (पोती/नातिन)</SelectItem>
                    <SelectItem value="UNCLE">Uncle (चाचा/ताऊ/मामा)</SelectItem>
                    <SelectItem value="AUNT">Aunt (चाची/ताई/मामी)</SelectItem>
                    <SelectItem value="NEPHEW">Nephew (भतीजा/भांजा)</SelectItem>
                    <SelectItem value="NIECE">Niece (भतीजी/भांजी)</SelectItem>
                    <SelectItem value="DEPENDENT">Dependent (अाश्रित)</SelectItem>
                    <SelectItem value="OTHER">Other (अन्य)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {memberForm.relationType === "OTHER" && (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Custom Relation Description</Label>
                  <Input
                    placeholder="e.g. Maternal Uncle, Cousin, Household Worker"
                    value={memberForm.relationCustom}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, relationCustom: e.target.value }))
                    }
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Gender *</Label>
                <Select
                  value={memberForm.gender}
                  onValueChange={(val) =>
                    setMemberForm((p) => ({ ...p, gender: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">MALE</SelectItem>
                    <SelectItem value="FEMALE">FEMALE</SelectItem>
                    <SelectItem value="TRANSGENDER">TRANSGENDER</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Date of Birth (Source of Truth)</Label>
                <Input
                  type="date"
                  value={memberForm.dateOfBirth}
                  onChange={(e) =>
                    setMemberForm((p) => ({ ...p, dateOfBirth: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Age (Snapshot Fallback)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 30"
                  value={memberForm.age}
                  onChange={(e) =>
                    setMemberForm((p) => ({ ...p, age: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">EPIC / Voter ID (Optional)</Label>
                <Input
                  placeholder="e.g. ABC1234567"
                  value={memberForm.voterIdNumber}
                  onChange={(e) =>
                    setMemberForm((p) => ({ ...p, voterIdNumber: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  placeholder="10-digit mobile"
                  value={memberForm.phone}
                  onChange={(e) =>
                    setMemberForm((p) => ({ ...p, phone: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold">Profile Photo</Label>
                <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-border/60">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
                    {memberForm.photoUrl ? (
                      <img
                        src={getImageUrl(memberForm.photoUrl)}
                        alt="Member Photo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                    {uploadingMemberPhoto && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <label
                      htmlFor="memberPhotoUploadInput"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {memberForm.photoUrl ? "Change Photo" : "Upload Photo"}
                      <input
                        id="memberPhotoUploadInput"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleMemberPhotoUpload}
                        disabled={uploadingMemberPhoto}
                      />
                    </label>
                    {memberForm.photoUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                        onClick={() => setMemberForm((p) => ({ ...p, photoUrl: "" }))}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Checkboxes & Flags */}
            <div className="flex flex-wrap items-center gap-4 bg-muted/40 p-3 rounded-xl text-xs border border-border/50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={memberForm.isDependent}
                  onChange={(e) =>
                    setMemberForm((p) => ({ ...p, isDependent: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Is Dependent (अाश्रित)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={memberForm.isEmergencyContact}
                  onChange={(e) =>
                    setMemberForm((p) => ({ ...p, isEmergencyContact: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-rose-700 dark:text-rose-400">Emergency Contact</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={memberForm.sameAddress}
                  onChange={(e) =>
                    setMemberForm((p) => ({ ...p, sameAddress: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Same Address as Voter</span>
              </label>
            </div>

            {!memberForm.sameAddress && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Custom Address</Label>
                <Input
                  placeholder="Enter custom residential address"
                  value={memberForm.address}
                  onChange={(e) =>
                    setMemberForm((p) => ({ ...p, address: e.target.value }))
                  }
                />
              </div>
            )}

            {/* Occupation & Working Details Section */}
            <div className="border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl p-3 space-y-3">
              <h5 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-indigo-600" />
                <span>Occupation & Work Description (कार्य एवं रोजगार विवरण)</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Occupation Category</Label>
                  <Select
                    value={memberForm.occupationCategory}
                    onValueChange={(val) =>
                      setMemberForm((p) => ({ ...p, occupationCategory: val }))
                    }
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOVERNMENT_EMPLOYEE">Government Employee</SelectItem>
                      <SelectItem value="PRIVATE_EMPLOYEE">Private Employee</SelectItem>
                      <SelectItem value="BUSINESS">Business / Trader</SelectItem>
                      <SelectItem value="SELF_EMPLOYED">Self Employed</SelectItem>
                      <SelectItem value="PROFESSIONAL">Professional (Doctor/CA/Lawyer)</SelectItem>
                      <SelectItem value="SKILLED_WORKER">Skilled Worker</SelectItem>
                      <SelectItem value="DAILY_WAGE">Daily Wage Worker</SelectItem>
                      <SelectItem value="LABOURER">Labourer</SelectItem>
                      <SelectItem value="FARMER">Farmer / Agriculture</SelectItem>
                      <SelectItem value="DRIVER">Driver</SelectItem>
                      <SelectItem value="SHOPKEEPER">Shopkeeper</SelectItem>
                      <SelectItem value="STUDENT">Student</SelectItem>
                      <SelectItem value="HOMEMAKER">Homemaker</SelectItem>
                      <SelectItem value="RETIRED">Retired</SelectItem>
                      <SelectItem value="PENSIONER">Pensioner</SelectItem>
                      <SelectItem value="UNEMPLOYED">Unemployed</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Job Title / Designation</Label>
                  <Input
                    className="bg-white dark:bg-slate-950"
                    placeholder="e.g. Senior Accountant, High School Student"
                    value={memberForm.occupationTitle}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, occupationTitle: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Working Organization / Business Name</Label>
                  <Input
                    className="bg-white dark:bg-slate-950"
                    placeholder="e.g. ABC Pvt Ltd, Local Retail Shop, Govt School"
                    value={memberForm.workingOrganization}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, workingOrganization: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Working Description (Detailed Duties / Business Tasks)</Label>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-input bg-white dark:bg-slate-950 px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="e.g. Handles financial audits, ledger management, GST documentation and monthly financial reporting."
                    value={memberForm.workingDescription}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, workingDescription: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Monthly Income Bracket (Restricted Privacy)</Label>
                  <Select
                    value={memberForm.incomeRange}
                    onValueChange={(val) =>
                      setMemberForm((p) => ({ ...p, incomeRange: val }))
                    }
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Select Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOT_DISCLOSED">Not Disclosed</SelectItem>
                      <SelectItem value="BELOW_10000">Below ₹10,000 / month</SelectItem>
                      <SelectItem value="RANGE_10000_25000">₹10,000 - ₹25,000 / month</SelectItem>
                      <SelectItem value="RANGE_25000_50000">₹25,000 - ₹50,000 / month</SelectItem>
                      <SelectItem value="RANGE_50000_100000">₹50,000 - ₹1,000,00 / month</SelectItem>
                      <SelectItem value="ABOVE_100000">Above ₹1,00,000 / month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsMemberModalOpen(false);
                  resetMemberForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createMemberMutation.isPending || updateMemberMutation.isPending
                }
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {(createMemberMutation.isPending ||
                  updateMemberMutation.isPending) && (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingMember ? "Save Changes" : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Family Member Confirmation Dialog ────────── */}
      <Dialog
        open={!!deleteMemberId}
        onOpenChange={(open) => {
          if (!open) setDeleteMemberId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>Confirm Delete Family Member</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove this family member from the household record?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMemberId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMemberMutation.isPending}
              onClick={() => {
                if (deleteMemberId) deleteMemberMutation.mutate(deleteMemberId);
              }}
            >
              {deleteMemberMutation.isPending && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Voter Identity Verification Document Preview Modal ──────── */}
      <Dialog open={isDocModalOpen} onOpenChange={setIsDocModalOpen}>
        <DialogContent className="max-w-xl rounded-3xl shadow-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 text-lg font-bold">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span>Aadhaar Identity Verification Document</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Submitted verification document and identity details for voter {docModalVoter?.name}.
            </DialogDescription>
          </DialogHeader>

          {docModalVoter && (
            <div className="space-y-4 py-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Voter Name</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{docModalVoter.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">EPIC ID / App No.</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                    {docModalVoter.voterIdNumber || docModalVoter.applicationNumber || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Aadhaar Number</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {docModalVoter.identityVerifications?.[0]?.aadhaarNumber || "Uploaded Document"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Verification Status</span>
                  <Badge className="bg-emerald-500 text-white text-[10px] font-bold mt-0.5">
                    {docModalVoter.identityVerifications?.[0]?.status || "VERIFIED"}
                  </Badge>
                </div>
              </div>

              {/* Document Preview */}
              <div className="space-y-2">
                <Label className="font-bold text-xs">Uploaded Verification Document File</Label>
                {docModalVoter.identityVerifications?.[0]?.documentUrl ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50 dark:bg-slate-950 text-center space-y-3">
                    {docModalVoter.identityVerifications[0].documentUrl.endsWith(".pdf") ? (
                      <div className="p-8 text-center bg-slate-100 dark:bg-slate-900 rounded-xl">
                        <FileText className="w-12 h-12 mx-auto text-indigo-600 mb-2" />
                        <p className="font-bold text-sm">PDF Document Uploaded</p>
                      </div>
                    ) : (
                      <img
                        src={getImageUrl(docModalVoter.identityVerifications[0].documentUrl)}
                        alt="Aadhaar Verification Document"
                        className="max-h-72 w-auto mx-auto rounded-xl object-contain border border-slate-300 dark:border-slate-700 shadow-md"
                      />
                    )}

                    <div className="pt-2 flex justify-center gap-2">
                      <a
                        href={getImageUrl(docModalVoter.identityVerifications[0].documentUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                      >
                        <Eye className="w-4 h-4" /> Open Full Document
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed rounded-2xl text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <p>No physical document file attached.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocModalOpen(false)} className="rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
