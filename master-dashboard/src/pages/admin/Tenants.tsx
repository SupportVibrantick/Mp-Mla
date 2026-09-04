import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useTenants,
  useCreateTenant,
  useUpdateTenant,
  useSuspendTenant,
  useActivateTenant,
  useDeleteTenant,
  usePlans,
  useTenantUsers,
  useCreateTenantUser,
} from "@/hooks/useTenants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Building2,
  MoreHorizontal,
  Loader2,
  Pencil,
  Plus,
  UserPlus,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  Download,
  PauseCircle,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";

// ─── Schemas ────────────────────────────────────────────

const phoneValidation = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine(
    (val) => !val || /^\+?[0-9\s-]{10,15}$/.test(val),
    "Invalid phone number. Must contain 10-15 digits"
  );

const createTenantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  constituencyName: z.string().min(2, "Constituency name is required"),
  state: z.string().min(2, "State is required"),
  district: z.string().min(2, "District is required"),
  address: z.string().optional(),
  phone: phoneValidation,
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  primaryColor: z.string().optional().default("#1e40af"),
  secondaryColor: z.string().optional().default("#3b82f6"),

  representativeName: z.string().min(2, "Representative name is required"),
  representativeTitle: z.string().min(2, "Representative title is required"),
  representativePhoto: z.string().optional(),
  partyName: z.string().optional(),
  partyLogoUrl: z.string().optional(),
  termStartDate: z.string().optional(),
  termEndDate: z.string().optional(),

  // Admin user
  adminEmail: z.string().email("Admin email is required"),
  adminPassword: z.string().min(6, "Admin password must be at least 6 characters"),
  adminName: z.string().min(2, "Admin name is required"),
  adminPhone: phoneValidation,

  // Plan
  planId: z.string().optional(),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]).optional().default("MONTHLY"),
  trialDays: z.preprocess((val) => (val === "" || val === undefined ? undefined : Number(val)), z.number().int().min(1).max(90).optional()),
});

const updateTenantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  constituencyName: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  district: z.string().min(2).optional(),
  address: z.string().optional(),
  phone: phoneValidation,
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),

  representativeName: z.string().min(2).optional(),
  representativeTitle: z.string().min(2).optional(),
  representativePhoto: z.string().optional(),
  partyName: z.string().optional(),
  partyLogoUrl: z.string().optional(),
  termStartDate: z.string().optional(),
  termEndDate: z.string().optional(),

  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]),
  planId: z.string().optional(),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]).optional(),
});

const createTenantUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: phoneValidation,
  role: z.enum(["SYSTEM_ADMIN", "MLA_MP", "OFFICE_STAFF"]),
  designation: z.string().optional(),
  department: z.string().optional(),
});

type CreateForm = z.infer<typeof createTenantSchema>;
type EditForm = z.infer<typeof updateTenantSchema>;
type CreateUserForm = z.infer<typeof createTenantUserSchema>;
type TenantActionType = "suspend" | "activate" | "delete";

// ─── Status Configs ─────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { icon: any; color: string; bg: string; label: string }
> = {
  ACTIVE: { icon: CheckCircle2, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", label: "Active" },
  SUSPENDED: { icon: AlertTriangle, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30", label: "Suspended" },
  DEACTIVATED: { icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", label: "Deactivated" },
};

function getTenantMrr(tenant: any) {
  const subscription = tenant.subscription;
  if (!subscription?.plan) return 0;

  if (subscription.billingCycle === "YEARLY") {
    return subscription.plan.priceYearly / 12;
  }

  if (subscription.billingCycle === "HALF_YEARLY") {
    return (subscription.plan.priceYearly / 2) / 6;
  }

  if (subscription.billingCycle === "QUARTERLY") {
    return (subscription.plan.priceMonthly * 3) / 3;
  }

  return subscription.plan.priceMonthly;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatStorage(value: number) {
  if (value >= 1024) {
    return `${(value / 1024).toFixed(value % 1024 === 0 ? 0 : 1)} GB`;
  }

  return `${value} MB`;
}

function getTenantSlug(tenant: any) {
  if (!tenant) return "tenant";

  if (tenant.website) {
    try {
      const hostname = new URL(tenant.website).hostname;
      return hostname.split(".")[0];
    } catch {
      return tenant.website;
    }
  }

  return tenant.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tenant";
}

export default function TenantsPage() {
  const createSteps = ["general", "billing", "admin"] as const;
  const generalFields: Array<keyof CreateForm> = [
    "name",
    "constituencyName",
    "state",
    "district",
    "representativeName",
    "representativeTitle",
    "email",
    "website",
  ];
  const billingFields: Array<keyof CreateForm> = [
    "planId",
    "billingCycle",
    "trialDays",
    "primaryColor",
    "secondaryColor",
  ];
  
  // Filters
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: TenantActionType;
    tenant: any;
  } | null>(null);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const validateStep = async (step: string) => {
    if (step === "general") {
      const isValid = await createForm.trigger(generalFields);
      if (isValid) {
        setActiveTab("billing");
      }
    } else if (step === "billing") {
      const isValid = await createForm.trigger(billingFields);
      if (isValid) {
        setActiveTab("admin");
      }
    }
  };

  const handleValidationError = (errors: any) => {
    const hasGeneralError = Object.keys(errors).some((field) =>
      generalFields.includes(field as keyof CreateForm),
    );
    const hasBillingError = Object.keys(errors).some((field) =>
      billingFields.includes(field as keyof CreateForm),
    );
    
    if (hasGeneralError) {
      setActiveTab("general");
    } else if (hasBillingError) {
      setActiveTab("billing");
    } else {
      setActiveTab("admin");
    }
  };

  // Fetching data
  const queryParams = useMemo(() => {
    const params: Record<string, any> = { page, limit: 10 };
    if (search) params.search = search;
    if (planFilter !== "all") params.planId = planFilter;
    if (statusFilter !== "all") params.status = statusFilter;
    return params;
  }, [search, planFilter, statusFilter, page]);

  const { data, isLoading } = useTenants(queryParams);
  const { data: plansData } = usePlans();
  const createMutation = useCreateTenant();
  const updateMutation = useUpdateTenant();
  const suspendMutation = useSuspendTenant();
  const activateMutation = useActivateTenant();
  const deleteMutation = useDeleteTenant();

  const tenants = data?.data?.data?.tenants || [];
  const pagination = data?.data?.data?.pagination;
  const stats = data?.data?.data?.stats;
  const plans = plansData?.data?.data || [];

  // Form Initializations
  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: "",
      constituencyName: "",
      state: "",
      district: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      primaryColor: "#1e40af",
      secondaryColor: "#3b82f6",
      representativeName: "",
      representativeTitle: "",
      adminEmail: "",
      adminPassword: "",
      adminName: "",
      adminPhone: "",
      planId: "",
      billingCycle: "MONTHLY",
      trialDays: undefined,
    },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(updateTenantSchema),
  });

  const handleCreate = async (formData: CreateForm) => {
    // Clear empty values so backend schemas pass
    if (formData.email === "") delete formData.email;
    if (formData.website === "") delete formData.website;
    if (!formData.planId) delete formData.planId;
    if (formData.trialDays === undefined || isNaN(Number(formData.trialDays)) || formData.trialDays === null) {
      delete formData.trialDays;
    }

    await createMutation.mutateAsync(formData);
    setCreateOpen(false);
    createForm.reset();
    setActiveTab("general");
  };

  const goToPreviousStep = () => {
    const currentStepIndex = createSteps.indexOf(activeTab as (typeof createSteps)[number]);
    if (currentStepIndex > 0) {
      setActiveTab(createSteps[currentStepIndex - 1]);
    }
  };

  const handleCreateTabChange = async (nextTab: string) => {
    if (nextTab === activeTab) return;

    const currentStepIndex = createSteps.indexOf(activeTab as (typeof createSteps)[number]);
    const nextStepIndex = createSteps.indexOf(nextTab as (typeof createSteps)[number]);

    if (nextStepIndex === -1) return;

    if (nextStepIndex < currentStepIndex) {
      setActiveTab(nextTab);
      return;
    }

    if (nextTab === "billing") {
      const isValid = await createForm.trigger(generalFields);
      if (isValid) {
        setActiveTab("billing");
      }
      return;
    }

    if (nextTab === "admin") {
      const isGeneralValid = await createForm.trigger(generalFields);
      if (!isGeneralValid) {
        setActiveTab("general");
        return;
      }

      const isBillingValid = await createForm.trigger(billingFields);
      if (isBillingValid) {
        setActiveTab("admin");
      } else {
        setActiveTab("billing");
      }
    }
  };

  const openEdit = (tenant: any) => {
    setSelectedTenant(tenant);
    editForm.reset({
      name: tenant.name,
      constituencyName: tenant.constituencyName,
      state: tenant.state,
      district: tenant.district,
      address: tenant.address || "",
      phone: tenant.phone || "",
      email: tenant.email || "",
      website: tenant.website || "",
      primaryColor: tenant.primaryColor || "#1e40af",
      secondaryColor: tenant.secondaryColor || "#3b82f6",
      representativeName: tenant.representativeName,
      representativeTitle: tenant.representativeTitle,
      representativePhoto: tenant.representativePhoto || "",
      partyName: tenant.partyName || "",
      partyLogoUrl: tenant.partyLogoUrl || "",
      termStartDate: tenant.termStartDate ? new Date(tenant.termStartDate).toISOString().split("T")[0] : "",
      termEndDate: tenant.termEndDate ? new Date(tenant.termEndDate).toISOString().split("T")[0] : "",
      status: tenant.status,
      planId: tenant.subscription?.planId || tenant.subscription?.plan?.id || "",
      billingCycle: tenant.subscription?.billingCycle || "MONTHLY",
    });
    setEditOpen(true);
  };

  const handleEdit = async (formData: EditForm) => {
    if (!selectedTenant) return;
    if (formData.email === "") formData.email = "";
    if (formData.website === "") formData.website = "";

    await updateMutation.mutateAsync({ id: selectedTenant.id, data: formData });
    setEditOpen(false);
    setSelectedTenant(null);
  };

  const openDetails = (tenant: any) => {
    setSelectedTenant(tenant);
    setDetailsOpen(true);
  };

  const openEditFromDetails = () => {
    if (!selectedTenant) return;
    setDetailsOpen(false);
    openEdit(selectedTenant);
  };

  const handleStatusAction = (tenant: any) => {
    if (tenant.status === "ACTIVE") {
      setPendingAction({ type: "suspend", tenant });
      return;
    }

    if (tenant.status === "SUSPENDED") {
      setPendingAction({ type: "activate", tenant });
    }
  };

  const handleDeleteTenant = (tenant: any) => {
    setPendingAction({ type: "delete", tenant });
  };

  const handleConfirmTenantAction = async () => {
    if (!pendingAction) return;

    if (pendingAction.type === "suspend") {
      await suspendMutation.mutateAsync(pendingAction.tenant.id);
    } else if (pendingAction.type === "activate") {
      await activateMutation.mutateAsync(pendingAction.tenant.id);
    } else {
      await deleteMutation.mutateAsync(pendingAction.tenant.id);
    }

    setPendingAction(null);
  };

  const isActionPending =
    suspendMutation.isPending || activateMutation.isPending || deleteMutation.isPending;

  const actionDialogCopy = pendingAction
    ? {
        suspend: {
          title: `Suspend ${pendingAction.tenant.name}?`,
          description:
            "All users in this workspace will immediately lose access. Billing will pause. You can reactivate the tenant at any time.",
          actionLabel: "Suspend tenant",
          actionClassName: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        },
        activate: {
          title: `Activate ${pendingAction.tenant.name}?`,
          description:
            "Suspended users will regain access and the tenant subscription will become active again.",
          actionLabel: "Activate tenant",
          actionClassName: "",
        },
        delete: {
          title: `Delete ${pendingAction.tenant.name}?`,
          description:
            "This will deactivate the tenant, mark all tenant users inactive, and cancel the current subscription. This action is intended as a safe delete.",
          actionLabel: "Delete tenant",
          actionClassName: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        },
      }[pendingAction.type]
    : null;

  const exportTenants = () => {
    const rows = tenants.map((tenant: any) => ({
      name: tenant.name,
      constituency: tenant.constituencyName,
      plan: tenant.subscription?.plan?.name || "No Plan",
      status: tenant.status,
      users: tenant._count?.users || 0,
      mrr: getTenantMrr(tenant),
      createdAt: new Date(tenant.createdAt).toLocaleDateString("en-IN"),
    }));

    const header = ["Tenant", "Constituency", "Plan", "Status", "Users", "MRR", "Created"];
    const csv = [
      header.join(","),
      ...rows.map((row: any) =>
        [
          row.name,
          row.constituency,
          row.plan,
          row.status,
          row.users,
          row.mrr,
          row.createdAt,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tenants.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout title="Tenants">
      <div className="space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
            <p className="text-muted-foreground text-base mt-2 max-w-2xl">
              Manage every workspace, plan, and lifecycle event across the platform.
            </p>
          </div>

          <div className="flex w-full sm:w-auto items-center gap-3">
            <Button type="button" variant="outline" className="gap-2" onClick={exportTenants}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={() => {
                createForm.reset();
                setShowAdminPassword(false);
                setActiveTab("general");
                setCreateOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Tenant
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-3xl border border-border/60 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Total Tenants</p>
            <p className="mt-4 text-4xl font-semibold text-foreground">{stats?.totalTenants ?? 0}</p>
          </Card>
          <Card className="rounded-3xl border border-border/60 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Active</p>
            <p className="mt-4 text-4xl font-semibold text-foreground">{stats?.activeTenants ?? 0}</p>
          </Card>
          <Card className="rounded-3xl border border-border/60 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Filtered MRR</p>
            <p className="mt-4 text-4xl font-semibold text-foreground">{formatCurrency(stats?.filteredMrr ?? 0)}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="overflow-hidden rounded-3xl border border-border/50 shadow-sm">
          <div className="flex flex-col gap-3 p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants by name or representative..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={planFilter}
              onValueChange={(v) => {
                setPlanFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                {plans.map((plan: any) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Tenants Table */}
        <Card className="overflow-hidden rounded-3xl border border-border/50 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground">Tenant</th>
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground">Plan</th>
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground">Users</th>
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground">MRR</th>
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground">Created</th>
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-4 w-14" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded" /></td>
                    </tr>
                  ))
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                      No tenants found matching your query.
                    </td>
                  </tr>
                ) : (
                  tenants.map((t: any) => {
                    const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.DEACTIVATED;
                    const StatusIcon = statusCfg.icon;

                    return (
                      <tr key={t.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground">
                              {t.name?.charAt(0)?.toUpperCase() || "T"}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground text-base">{t.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {t.constituencyName}, {t.district}, {t.state}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {t.subscription?.plan?.name || "No Plan"}
                              {t.subscription?.status === "TRIALING" && (
                                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[10px] py-0 px-1.5 h-4">
                                  Trial
                                </Badge>
                              )}
                              {t.subscription?.status === "EXPIRED" && (
                                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 text-[10px] py-0 px-1.5 h-4">
                                  Expired
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {t.subscription?.status === "TRIALING" && t.subscription?.trialEndsAt
                                ? `Ends ${new Date(t.subscription.trialEndsAt).toLocaleDateString("en-IN")}`
                                : t.subscription?.billingCycle || "No billing cycle"}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.color} ${statusCfg.bg}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-medium">{t._count?.users || 0}</td>
                        <td className="px-4 py-4 font-semibold">{formatCurrency(getTenantMrr(t))}</td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {new Date(t.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => openDetails(t)} className="cursor-pointer">
                                <Eye className="mr-2 h-3.5 w-3.5" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(t)} className="cursor-pointer">
                                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Tenant
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTenant(t);
                                  setUsersOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <Users className="mr-2 h-3.5 w-3.5" /> Manage Users
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {t.status !== "DEACTIVATED" && (
                                <DropdownMenuItem onClick={() => void handleStatusAction(t)} className="cursor-pointer">
                                  {t.status === "ACTIVE" ? (
                                    <>
                                      <PauseCircle className="mr-2 h-3.5 w-3.5" /> Suspend
                                    </>
                                  ) : (
                                    <>
                                      <PlayCircle className="mr-2 h-3.5 w-3.5" /> Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                              {t.status !== "DEACTIVATED" && (
                                <DropdownMenuItem
                                  onClick={() => void handleDeleteTenant(t)}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Tenant
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs px-2 font-medium">
                  {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-[860px] rounded-[28px] p-0 overflow-hidden">
            <div className="p-10">
              <DialogHeader className="space-y-0 text-left">
                <div className="flex items-start gap-5">
                  <div className="flex h-15 w-15 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
                    {selectedTenant?.name?.charAt(0)?.toUpperCase() || "T"}
                  </div>
                  <div className="space-y-2">
                    <DialogTitle className="text-4xl font-semibold tracking-tight">
                      {selectedTenant?.name}
                    </DialogTitle>
                    <DialogDescription className="text-xl text-muted-foreground">
                      {selectedTenant?.website
                        ? (() => {
                            try {
                              return new URL(selectedTenant.website).hostname;
                            } catch {
                              return selectedTenant.website;
                            }
                          })()
                        : `${getTenantSlug(selectedTenant)}.controlhub.io`}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {selectedTenant && (
                <div className="mt-10 grid gap-6 sm:grid-cols-2">
                  {[
                    { label: "Plan", value: selectedTenant.subscription?.plan?.name || "No Plan" },
                    { label: "Status", value: STATUS_CONFIG[selectedTenant.status]?.label || selectedTenant.status },
                    { label: "Users", value: String(selectedTenant._count?.users || 0) },
                    { label: "MRR", value: formatCurrency(getTenantMrr(selectedTenant)) },
                    { label: "Created", value: new Date(selectedTenant.createdAt).toLocaleDateString("en-CA") },
                    { label: "Slug", value: getTenantSlug(selectedTenant) },
                    { label: "Tenant ID", value: selectedTenant.id },
                    { label: "Constituency", value: `${selectedTenant.constituencyName} (${selectedTenant.constituencyType || "ASSEMBLY"})` },
                    { label: "Constituency Code", value: selectedTenant.constituencyCode || "N/A" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-border/80 bg-background px-5 py-5 shadow-sm"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-foreground">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <DialogFooter className="mt-6 pt-8">
                <Button type="button" variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
                <Button type="button" onClick={openEditFromDetails}>
                  Edit tenant
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!pendingAction}
          onOpenChange={(open) => {
            if (!open && !isActionPending) {
              setPendingAction(null);
            }
          }}
        >
          <AlertDialogContent className="sm:max-w-[560px]">
            <AlertDialogHeader>
              <AlertDialogTitle>{actionDialogCopy?.title}</AlertDialogTitle>
              <AlertDialogDescription className="text-base leading-7">
                {actionDialogCopy?.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel disabled={isActionPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isActionPending}
                onClick={(event) => {
                  event.preventDefault();
                  void handleConfirmTenantAction();
                }}
                className={actionDialogCopy?.actionClassName}
              >
                {isActionPending ? "Please wait..." : actionDialogCopy?.actionLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ═══════════════════════════════════════════════ */}
        {/* CREATE TENANT DIALOG                            */}
        {/* ═══════════════════════════════════════════════ */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Add New SaaS Tenant
              </DialogTitle>
              <DialogDescription>
                Create a tenant workspace, configure subscription limits, and create the first administrator user.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={createForm.handleSubmit(handleCreate, handleValidationError)} className="space-y-6 mt-4">
              <Tabs value={activeTab} onValueChange={handleCreateTabChange} className="w-full">
                <TabsList className="grid grid-cols-3 w-full bg-muted/60 mb-4">
                  <TabsTrigger value="general">1. Workspace & Rep</TabsTrigger>
                  <TabsTrigger value="billing">2. Limits & Billing</TabsTrigger>
                  <TabsTrigger value="admin">3. Admin Settings</TabsTrigger>
                </TabsList>

                {/* Tab 1: General Info */}
                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="t-name">Tenant Name *</Label>
                      <Input id="t-name" placeholder="E.g., Central Delhi Constituency office" {...createForm.register("name")} />
                      {createForm.formState.errors.name && (
                        <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="t-const">Constituency Name *</Label>
                      <Input id="t-const" placeholder="E.g., Chandni Chowk" {...createForm.register("constituencyName")} />
                      {createForm.formState.errors.constituencyName && (
                        <p className="text-xs text-destructive">{createForm.formState.errors.constituencyName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="t-state">State *</Label>
                      <Input id="t-state" placeholder="E.g., Delhi" {...createForm.register("state")} />
                      {createForm.formState.errors.state && (
                        <p className="text-xs text-destructive">{createForm.formState.errors.state.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="t-district">District *</Label>
                      <Input id="t-district" placeholder="E.g., Central Delhi" {...createForm.register("district")} />
                      {createForm.formState.errors.district && (
                        <p className="text-xs text-destructive">{createForm.formState.errors.district.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="t-repname">Representative Name *</Label>
                      <Input id="t-repname" placeholder="E.g., Shri Rajesh Kumar" {...createForm.register("representativeName")} />
                      {createForm.formState.errors.representativeName && (
                        <p className="text-xs text-destructive">{createForm.formState.errors.representativeName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="t-reptitle">Representative Title *</Label>
                      <Input id="t-reptitle" placeholder="E.g., Member of Parliament" {...createForm.register("representativeTitle")} />
                      {createForm.formState.errors.representativeTitle && (
                        <p className="text-xs text-destructive">{createForm.formState.errors.representativeTitle.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="t-email">Tenant Email</Label>
                      <Input id="t-email" placeholder="office@constituency.org" {...createForm.register("email")} />
                      {createForm.formState.errors.email && (
                        <p className="text-xs text-destructive">{createForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="t-website">Website URL</Label>
                      <Input id="t-website" placeholder="https://constituency.org" {...createForm.register("website")} />
                      {createForm.formState.errors.website && (
                        <p className="text-xs text-destructive">{createForm.formState.errors.website.message}</p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Subscription & Limits */}
                <TabsContent value="billing" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Subscription Plan</Label>
                      <Select
                        value={createForm.watch("planId")}
                        onValueChange={(val) =>
                          createForm.setValue("planId", val, { shouldDirty: true, shouldValidate: true })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} (₹{p.priceMonthly}/mo)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Billing Cycle</Label>
                      <Select
                        value={createForm.watch("billingCycle")}
                        onValueChange={(val) =>
                          createForm.setValue("billingCycle", val as any, { shouldDirty: true, shouldValidate: true })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                          <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                          <SelectItem value="YEARLY">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="t-trial">Trial Days (Optional)</Label>
                      <Input
                        id="t-trial"
                        type="number"
                        placeholder="e.g., 14"
                        {...createForm.register("trialDays")}
                      />
                      {createForm.formState.errors.trialDays && (
                        <p className="text-xs text-destructive">{createForm.formState.errors.trialDays.message}</p>
                      )}
                    </div>
                  </div>



                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="t-primary">Primary Branding Color</Label>
                      <div className="flex gap-2">
                        <Input id="t-primary" type="color" className="w-12 h-10 p-1 cursor-pointer shrink-0" {...createForm.register("primaryColor")} />
                        <Input type="text" {...createForm.register("primaryColor")} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="t-secondary">Secondary Branding Color</Label>
                      <div className="flex gap-2">
                        <Input id="t-secondary" type="color" className="w-12 h-10 p-1 cursor-pointer shrink-0" {...createForm.register("secondaryColor")} />
                        <Input type="text" {...createForm.register("secondaryColor")} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 3: Tenant Super Admin */}
                <TabsContent value="admin" className="space-y-4">
                  <div className="bg-primary/5 p-4 rounded-lg mb-2">
                    <p className="text-xs text-primary font-semibold flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      SYSTEM SUPER ADMIN ACCOUNT
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      This user will have full workspace administration controls within the tenant dashboard.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="a-name">Admin User Full Name *</Label>
                    <Input id="a-name" placeholder="John Doe" {...createForm.register("adminName")} />
                    {createForm.formState.errors.adminName && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.adminName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="a-email">Admin Login Email *</Label>
                    <Input id="a-email" type="email" placeholder="admin@workspace.com" {...createForm.register("adminEmail")} />
                    {createForm.formState.errors.adminEmail && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.adminEmail.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="a-pwd">Admin Password *</Label>
                    <div className="relative">
                      <Input
                        id="a-pwd"
                        type={showAdminPassword ? "text" : "password"}
                        placeholder="Must be at least 6 characters"
                        {...createForm.register("adminPassword")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground"
                      >
                        {showAdminPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                    {createForm.formState.errors.adminPassword && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.adminPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="a-phone">Admin Contact Phone</Label>
                    <Input id="a-phone" placeholder="9876543210" {...createForm.register("adminPhone")} />
                    {createForm.formState.errors.adminPhone && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.adminPhone.message}</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="pt-4 border-t gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                {activeTab !== "general" && (
                  <Button type="button" variant="outline" onClick={goToPreviousStep}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                )}
                {activeTab === "general" && (
                  <Button type="button" onClick={() => void validateStep("general")}>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                {activeTab === "billing" && (
                  <Button type="button" onClick={() => void validateStep("billing")}>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                {activeTab === "admin" && (
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Tenant"
                    )}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════ */}
        {/* EDIT TENANT DIALOG                              */}
        {/* ═══════════════════════════════════════════════ */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                Edit Tenant Profile
              </DialogTitle>
              <DialogDescription>
                Modify profile information, tenant limits, and subscription status for {selectedTenant?.name}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Workspace Name</Label>
                  <Input {...editForm.register("name")} />
                </div>
                <div className="space-y-2">
                  <Label>Constituency Name</Label>
                  <Input {...editForm.register("constituencyName")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input {...editForm.register("state")} />
                </div>
                <div className="space-y-2">
                  <Label>District</Label>
                  <Input {...editForm.register("district")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Representative Name</Label>
                  <Input {...editForm.register("representativeName")} />
                </div>
                <div className="space-y-2">
                  <Label>Representative Title</Label>
                  <Input {...editForm.register("representativeTitle")} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Representative Photo URL</Label>
                  <Input {...editForm.register("representativePhoto")} />
                </div>
                <div className="space-y-2">
                  <Label>Party Name</Label>
                  <Input {...editForm.register("partyName")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Term Start Date</Label>
                  <Input type="date" {...editForm.register("termStartDate")} />
                </div>
                <div className="space-y-2">
                  <Label>Term End Date</Label>
                  <Input type="date" {...editForm.register("termEndDate")} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editForm.watch("status")}
                    onValueChange={(val) => editForm.setValue("status", val as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subscription Plan</Label>
                  <Select
                    value={editForm.watch("planId") || "none"}
                    onValueChange={(val) => editForm.setValue("planId", val === "none" ? "" : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Plan</SelectItem>
                      {plans.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} (₹{p.priceMonthly}/mo)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Billing Cycle</Label>
                  <Select
                    value={editForm.watch("billingCycle") || "MONTHLY"}
                    onValueChange={(val) => editForm.setValue("billingCycle", val as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════ */}
        {/* TENANT USERS DIALOG                             */}
        {/* ═══════════════════════════════════════════════ */}
        {selectedTenant && (
          <TenantUsersDialog
            open={usersOpen}
            onOpenChange={setUsersOpen}
            tenant={selectedTenant}
          />
        )}

      </div>
    </MainLayout>
  );
}

// ─── Tenant Users Management Sub-Component ───────────────

interface UsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: any;
}

function TenantUsersDialog({ open, onOpenChange, tenant }: UsersDialogProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const { data: usersData, isLoading } = useTenantUsers(tenant.id);
  const createUserMutation = useCreateTenantUser(tenant.id);

  const users = usersData?.data?.data || [];

  const userForm = useForm<CreateUserForm>({
    resolver: zodResolver(createTenantUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "OFFICE_STAFF",
      designation: "",
      department: "",
    },
  });

  const handleAddUser = async (formData: CreateUserForm) => {
    if (formData.phone === "") delete formData.phone;
    await createUserMutation.mutateAsync(formData);
    setShowAddForm(false);
    userForm.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Manage Users - {tenant.name}
          </DialogTitle>
          <DialogDescription>
            View current tenant accounts and invite new staff members to this workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm text-foreground">Workspace Users ({users.length})</h3>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setShowAddForm(!showAddForm);
                userForm.reset();
              }}
            >
              <UserPlus className="h-4 w-4" />
              {showAddForm ? "Hide Form" : "Add User"}
            </Button>
          </div>

          {/* Add User Form */}
          {showAddForm && (
            <Card className="p-4 border border-primary/20 bg-primary/5 space-y-4">
              <h4 className="font-semibold text-xs text-primary uppercase tracking-wider">New User Details</h4>
              <form onSubmit={userForm.handleSubmit(handleAddUser)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="u-name" className="text-xs">Full Name *</Label>
                    <Input id="u-name" size={2} className="h-8 text-xs" {...userForm.register("name")} />
                    {userForm.formState.errors.name && (
                      <p className="text-[10px] text-destructive">{userForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="u-email" className="text-xs">Email Address *</Label>
                    <Input id="u-email" type="email" className="h-8 text-xs" {...userForm.register("email")} />
                    {userForm.formState.errors.email && (
                      <p className="text-[10px] text-destructive">{userForm.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="u-pwd" className="text-xs">Password *</Label>
                    <div className="relative">
                      <Input
                        id="u-pwd"
                        type={showPwd ? "text" : "password"}
                        className="h-8 text-xs pr-8"
                        {...userForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-2 top-2 text-muted-foreground"
                      >
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {userForm.formState.errors.password && (
                      <p className="text-[10px] text-destructive">{userForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="u-phone" className="text-xs">Phone Number</Label>
                    <Input id="u-phone" className="h-8 text-xs" {...userForm.register("phone")} />
                    {userForm.formState.errors.phone && (
                      <p className="text-[10px] text-destructive">{userForm.formState.errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">System Role</Label>
                    <Select
                      value={userForm.watch("role")}
                      onValueChange={(val) => userForm.setValue("role", val as any)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SYSTEM_ADMIN">Tenant Admin</SelectItem>
                        <SelectItem value="MLA_MP">MLA/MP</SelectItem>
                        <SelectItem value="OFFICE_STAFF">Office Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="u-desig" className="text-xs">Designation</Label>
                    <Input id="u-desig" className="h-8 text-xs" placeholder="E.g., Secretary" {...userForm.register("designation")} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="u-dept" className="text-xs">Department</Label>
                    <Input id="u-dept" className="h-8 text-xs" placeholder="E.g., IT" {...userForm.register("department")} />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? "Adding..." : "Add User"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Users List */}
          <Card className="border border-border/40 overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground">User</th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground">Role</th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground">Department</th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-3 py-3"><Skeleton className="h-3 w-32" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-3.5 w-16 rounded" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-3 w-20" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-3.5 w-12 rounded" /></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground italic">
                      No users registered in this tenant workspace.
                    </td>
                  </tr>
                ) : (
                  users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-muted/5">
                      <td className="px-3 py-3">
                        <div>
                          <span className="font-semibold text-foreground">{u.name}</span>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{u.email}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className="text-[10px] font-semibold tracking-wider">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {u.designation || u.department ? `${u.designation || ""} (${u.department || "N/A"})` : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          u.status === "ACTIVE" ? "bg-green-50 text-green-600 dark:bg-green-950/30" : "bg-red-50 text-red-600 dark:bg-red-950/30"
                        }`}>
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
