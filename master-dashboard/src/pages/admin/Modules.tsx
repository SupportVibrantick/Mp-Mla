import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronLeft,
  Plus,
  Search,
  Sparkles,
  Pencil,
  Trash2,
  Puzzle,
  Info,
  Check,
  X,
  Lock,
  Unlock,
  Calendar,
  IndianRupeeIcon,
  AlertCircle,
  Loader2,
  Building2,
  ArrowRight,
} from "lucide-react";
import {
  useModules,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useTenantModules,
  useGrantModuleAccess,
  useBulkGrantModules,
  useUpdateModuleAccess,
  useRevokeModuleAccess,
} from "@/hooks/useModules";
import { useTenants } from "@/hooks/useTenants";

// ─── Validation Schemas ─────────────────────────────────

const moduleFormSchema = z.object({
  code: z.string().min(2, "Module code must be at least 2 characters"),
  name: z.string().min(2, "Module name must be at least 2 characters"),
  description: z.string().optional(),
  category: z.string().min(2, "Category is required").default("core"),
  isAddon: z.boolean().default(false),
  addonPrice: z.preprocess((v) => Number(v) || 0, z.number().min(0)),
  isActive: z.boolean().default(true),
  sortOrder: z.preprocess((v) => Number(v) || 0, z.number().int().min(0)),
});

type ModuleFormValues = z.infer<typeof moduleFormSchema>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ModulesPage() {
  const [activeMainTab, setActiveMainTab] = useState<"global" | "tenant">("global");
  
  // Search / Filter states
  const [moduleSearch, setModuleSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addonFilter, setAddonFilter] = useState("all");
  
  // Module Form States
  const [showForm, setShowForm] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);

  // Tenant Access States
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [tenantModuleSearch, setTenantModuleSearch] = useState("");
  const [pendingRevocation, setPendingRevocation] = useState<{
    tenantId: string;
    moduleId: string;
    moduleName: string;
  } | null>(null);

  // Expiry configuration states
  const [grantModuleId, setGrantModuleId] = useState<string>("");
  const [grantExpiresAt, setGrantExpiresAt] = useState<string>("");
  const [bulkGrantExpiresAt, setBulkGrantExpiresAt] = useState<string>("");
  const [selectedBulkModules, setSelectedBulkModules] = useState<string[]>([]);

  // ─── Queries & Mutations ─────────────────────────────────

  const { data: modulesData, isLoading: isModulesLoading } = useModules();
  const { data: tenantsData, isLoading: isTenantsLoading } = useTenants({ limit: 100 });
  const { data: tenantModulesData, isLoading: isTenantModulesLoading } = useTenantModules(selectedTenantId);

  const createModuleMutation = useCreateModule();
  const updateModuleMutation = useUpdateModule();
  const deleteModuleMutation = useDeleteModule();

  const grantAccessMutation = useGrantModuleAccess();
  const bulkGrantMutation = useBulkGrantModules();
  const updateAccessMutation = useUpdateModuleAccess();
  const revokeAccessMutation = useRevokeModuleAccess();

  const globalModules = modulesData?.data?.data?.modules || [];
  const tenants = tenantsData?.data?.data?.tenants || [];
  const tenantAccess = tenantModulesData?.data?.data?.modules || [];
  const currentTenant = tenantModulesData?.data?.data?.tenant || null;

  // React Hook Form for Global Modules
  const moduleForm = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      category: "core",
      isAddon: false,
      addonPrice: 0,
      isActive: true,
      sortOrder: 0,
    },
  });

  // ─── Handlers ───────────────────────────────────────────

  const openCreateForm = () => {
    setSelectedModule(null);
    moduleForm.reset({
      code: "",
      name: "",
      description: "",
      category: "core",
      isAddon: false,
      addonPrice: 0,
      isActive: true,
      sortOrder: 0,
    });
    setShowForm(true);
  };

  const openEditForm = (mod: any) => {
    setSelectedModule(mod);
    moduleForm.reset({
      code: mod.code,
      name: mod.name,
      description: mod.description || "",
      category: mod.category || "core",
      isAddon: !!mod.isAddon,
      addonPrice: mod.addonPrice || 0,
      isActive: !!mod.isActive,
      sortOrder: mod.sortOrder || 0,
    });
    setShowForm(true);
  };

  const handleSaveModule = async (values: ModuleFormValues) => {
    if (selectedModule) {
      await updateModuleMutation.mutateAsync({
        id: selectedModule.id,
        data: values,
      });
    } else {
      await createModuleMutation.mutateAsync(values);
    }
    setShowForm(false);
  };

  const handleDeleteModule = async (id: string) => {
    if (confirm("Are you sure you want to delete/deactivate this module?")) {
      await deleteModuleMutation.mutateAsync(id);
    }
  };

  const handleToggleAccessEnabled = async (accessRecord: any) => {
    await updateAccessMutation.mutateAsync({
      tenantId: selectedTenantId,
      moduleId: accessRecord.module.id,
      data: {
        isEnabled: !accessRecord.isEnabled,
      },
    });
  };

  const handleUpdateExpiry = async (moduleId: string, expiryDate: string) => {
    await updateAccessMutation.mutateAsync({
      tenantId: selectedTenantId,
      moduleId,
      data: {
        expiresAt: expiryDate ? new Date(expiryDate).toISOString() : null,
      },
    });
  };

  const handleGrantAccess = async (moduleId: string) => {
    await grantAccessMutation.mutateAsync({
      tenantId: selectedTenantId,
      data: {
        moduleId,
        expiresAt: grantExpiresAt ? new Date(grantExpiresAt).toISOString() : undefined,
      },
    });
    setGrantModuleId("");
    setGrantExpiresAt("");
  };

  const handleBulkGrant = async () => {
    if (selectedBulkModules.length === 0) return;
    await bulkGrantMutation.mutateAsync({
      tenantId: selectedTenantId,
      data: {
        moduleIds: selectedBulkModules,
        expiresAt: bulkGrantExpiresAt ? new Date(bulkGrantExpiresAt).toISOString() : undefined,
      },
    });
    setSelectedBulkModules([]);
    setBulkGrantExpiresAt("");
  };

  const handleConfirmRevocation = async () => {
    if (!pendingRevocation) return;
    await revokeAccessMutation.mutateAsync({
      tenantId: pendingRevocation.tenantId,
      moduleId: pendingRevocation.moduleId,
    });
    setPendingRevocation(null);
  };

  const toggleBulkModuleSelection = (moduleId: string) => {
    setSelectedBulkModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  // ─── Filtered Data ──────────────────────────────────────

  const filteredModules = useMemo(() => {
    return globalModules.filter((mod: any) => {
      const matchesSearch =
        mod.name.toLowerCase().includes(moduleSearch.toLowerCase()) ||
        mod.code.toLowerCase().includes(moduleSearch.toLowerCase()) ||
        (mod.description && mod.description.toLowerCase().includes(moduleSearch.toLowerCase()));

      const matchesCategory =
        categoryFilter === "all" || mod.category?.toLowerCase() === categoryFilter.toLowerCase();

      const matchesAddon =
        addonFilter === "all" ||
        (addonFilter === "addon" && mod.isAddon) ||
        (addonFilter === "core" && !mod.isAddon);

      return matchesSearch && matchesCategory && matchesAddon;
    });
  }, [globalModules, moduleSearch, categoryFilter, addonFilter]);

  const unassignedModules = useMemo(() => {
    const assignedIds = new Set(tenantAccess.map((a: any) => a.moduleId));
    return globalModules.filter(
      (mod: any) => mod.isActive && !assignedIds.has(mod.id)
    );
  }, [globalModules, tenantAccess]);

  const filteredUnassignedModules = useMemo(() => {
    return unassignedModules.filter((mod: any) =>
      mod.name.toLowerCase().includes(tenantModuleSearch.toLowerCase()) ||
      mod.code.toLowerCase().includes(tenantModuleSearch.toLowerCase())
    );
  }, [unassignedModules, tenantModuleSearch]);

  const categories = useMemo(() => {
    const cats = new Set(globalModules.map((m: any) => m.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [globalModules]);

  // ─── UI Render: Dedicated Form View ──────────────────────

  if (showForm) {
    return (
      <MainLayout title={selectedModule ? "Edit Module" : "Create Module"}>
        <div className="space-y-6 max-w-4xl mx-auto py-4">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full border border-border/40 hover:bg-muted"
              onClick={() => setShowForm(false)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {selectedModule ? `Edit Module: ${selectedModule.name}` : "Create System Module"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {selectedModule ? "Update functional boundaries, pricing terms, and configurations." : "Establish a brand new code package or client addon."}
              </p>
            </div>
          </div>

          <form onSubmit={moduleForm.handleSubmit(handleSaveModule)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* General Config */}
              <Card className="rounded-[24px] border border-border/60 p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-3">
                  Module Configuration
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="module-name">Module Name</Label>
                  <Input id="module-name" placeholder="e.g. Budget Planning, GIS Maps" {...moduleForm.register("name")} />
                  {moduleForm.formState.errors.name && (
                    <p className="text-xs text-destructive font-medium">{moduleForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="module-code">Unique Module Code</Label>
                  <Input
                    id="module-code"
                    placeholder="e.g. budget_planning"
                    disabled={!!selectedModule}
                    {...moduleForm.register("code")}
                  />
                  {moduleForm.formState.errors.code && (
                    <p className="text-xs text-destructive font-medium">{moduleForm.formState.errors.code.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="module-category">Category</Label>
                  <Input id="module-category" placeholder="e.g. core, advanced, integration" {...moduleForm.register("category")} />
                  {moduleForm.formState.errors.category && (
                    <p className="text-xs text-destructive font-medium">{moduleForm.formState.errors.category.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="module-description">Description</Label>
                  <Textarea
                    id="module-description"
                    rows={4}
                    placeholder="Provide a detailed description of what features this module includes..."
                    {...moduleForm.register("description")}
                  />
                </div>
              </Card>

              {/* Status & Pricing */}
              <Card className="rounded-[24px] border border-border/60 p-6 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-3">
                    Billing & Availability
                  </h3>

                  <div className="flex items-center justify-between rounded-2xl border border-border/70 p-4 bg-muted/20">
                    <div>
                      <p className="font-semibold text-sm">Add-on Module</p>
                      <p className="text-xs text-muted-foreground max-w-[240px]">
                        Addons are sold separately from the core tiers.
                      </p>
                    </div>
                    <Switch
                      checked={moduleForm.watch("isAddon")}
                      onCheckedChange={(checked) => {
                        moduleForm.setValue("isAddon", checked);
                        if (!checked) moduleForm.setValue("addonPrice", 0);
                      }}
                    />
                  </div>

                  {moduleForm.watch("isAddon") && (
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="addon-price">Monthly Add-on Price (₹)</Label>
                      <div className="relative">
                        <IndianRupeeIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="addon-price"
                          type="number"
                          step="0.01"
                          className="pl-9"
                          placeholder="0"
                          {...moduleForm.register("addonPrice")}
                        />
                      </div>
                      {moduleForm.formState.errors.addonPrice && (
                        <p className="text-xs text-destructive font-medium">{moduleForm.formState.errors.addonPrice.message}</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-2xl border border-border/70 p-4 bg-muted/20 mt-4">
                    <div>
                      <p className="font-semibold text-sm">Module Active</p>
                      <p className="text-xs text-muted-foreground max-w-[240px]">
                        Inactive modules cannot be granted to new tenants.
                      </p>
                    </div>
                    <Switch
                      checked={moduleForm.watch("isActive")}
                      onCheckedChange={(checked) => moduleForm.setValue("isActive", checked)}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Label htmlFor="sort-order">Sort Order</Label>
                  <Input id="sort-order" type="number" {...moduleForm.register("sortOrder")} />
                  <p className="text-xs text-muted-foreground mt-1">Controls appearance order in marketing catalogs.</p>
                </div>
              </Card>
            </div>

            <div className="flex items-center justify-end gap-3 border-t pt-6">
              <Button type="button" variant="outline" className="px-6 rounded-xl" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-6 rounded-xl"
                disabled={createModuleMutation.isPending || updateModuleMutation.isPending}
              >
                {createModuleMutation.isPending || updateModuleMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  "Save Module Config"
                )}
              </Button>
            </div>
          </form>
        </div>
      </MainLayout>
    );
  }

  // ─── UI Render: Dashboard Tabs View ──────────────────────

  return (
    <MainLayout title="Modules & Addons">
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Modules & Addons</h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Define SaaS module capabilities and manage tenant addon access terms.
            </p>
          </div>
          {activeMainTab === "global" && (
            <Button type="button" className="gap-2" onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              New Module
            </Button>
          )}
        </div>

        {/* Outer Tabs switcher */}
        <Tabs
          value={activeMainTab}
          onValueChange={(val) => setActiveMainTab(val as any)}
          className="space-y-6"
        >
          <TabsList className="bg-muted/60 p-1 rounded-2xl border w-full max-w-md grid grid-cols-2">
            <TabsTrigger value="global" className="rounded-xl py-2.5 font-medium transition-all duration-200">
              Global Modules
            </TabsTrigger>
            <TabsTrigger value="tenant" className="rounded-xl py-2.5 font-medium transition-all duration-200">
              Tenant Module Access
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: GLOBAL MODULES LIST */}
          <TabsContent value="global" className="space-y-6 focus-visible:outline-none">
            {/* Filters */}
            <Card className="rounded-[24px] border border-border/50 shadow-sm p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search modules by code, name, or description..."
                    className="pl-9"
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={addonFilter} onValueChange={setAddonFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Billing Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Core + Addons</SelectItem>
                      <SelectItem value="core">Core Only</SelectItem>
                      <SelectItem value="addon">Addons Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Grid Modules */}
            {isModulesLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="rounded-[24px] border border-border/60 p-6 shadow-sm space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-24" />
                  </Card>
                ))}
              </div>
            ) : filteredModules.length === 0 ? (
              <Card className="rounded-[24px] border border-dashed p-12 text-center text-muted-foreground">
                <Puzzle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="font-semibold text-lg">No modules found</p>
                <p className="text-sm mt-1">Try relaxing filters or create a new functional module.</p>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredModules.map((mod: any) => {
                  return (
                    <Card
                      key={mod.id}
                      className={`relative overflow-hidden rounded-[24px] border p-6 shadow-sm transition-all duration-300 hover:shadow-md ${
                        mod.isActive
                          ? "border-border/60 hover:border-primary/40 bg-gradient-to-b from-card to-card"
                          : "border-border/40 bg-muted/20 opacity-70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold flex items-center gap-2">
                            {mod.name}
                            {!mod.isActive && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                          </h3>
                          <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono mt-1 inline-block">
                            {mod.code}
                          </code>
                        </div>
                        <Badge variant={mod.isAddon ? "default" : "outline"} className="capitalize">
                          {mod.isAddon ? "Add-on" : "Core Module"}
                        </Badge>
                      </div>

                      <p className="mt-4 min-h-[48px] text-sm text-muted-foreground line-clamp-2">
                        {mod.description || "Provides seamless system operations and database-level RBAC restrictions."}
                      </p>

                      <div className="mt-6 flex items-center justify-between border-t pt-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Category</p>
                          <p className="text-sm font-semibold capitalize mt-0.5">{mod.category}</p>
                        </div>
                        {mod.isAddon ? (
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Addon Price</p>
                            <p className="text-lg font-bold text-foreground mt-0.5">
                              {formatCurrency(mod.addonPrice)}<span className="text-xs font-normal">/mo</span>
                            </p>
                          </div>
                        ) : (
                          <div className="text-right text-emerald-600 dark:text-emerald-400">
                            <Check className="h-5 w-5 inline mr-1" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Free in tier</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 flex items-center justify-end gap-2 border-t pt-4">
                        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openEditForm(mod)}>
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5"
                          onClick={() => handleDeleteModule(mod.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: TENANT ACCESS MANAGER */}
          <TabsContent value="tenant" className="space-y-6 focus-visible:outline-none">
            <Card className="rounded-[24px] border border-border/50 shadow-sm p-6">
              <div className="max-w-md space-y-2">
                <Label className="text-base font-semibold">Select Customer Workspace</Label>
                <div className="flex gap-3">
                  <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                    <SelectTrigger className="flex-1 rounded-xl h-11">
                      <SelectValue placeholder="Choose a tenant workspace to view details" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.constituencyName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTenantId && (
                    <div className="h-11 w-11 flex items-center justify-center border rounded-xl bg-muted/40">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {selectedTenantId ? (
              <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                
                {/* Current Tenant Module Access List */}
                <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm h-fit">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                    <div>
                      <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <span>Current Active Access</span>
                        {currentTenant && (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 font-medium">
                            {currentTenant.name}
                          </Badge>
                        )}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Configure expiry rules, toggle state, or safely revoke addon access.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 overflow-x-auto">
                    {isTenantModulesLoading ? (
                      <div className="space-y-3 py-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                        ))}
                      </div>
                    ) : tenantAccess.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground border border-dashed rounded-2xl">
                        <Puzzle className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
                        <p className="font-medium">No custom modules granted yet.</p>
                        <p className="text-xs mt-0.5">Use the grant pane on the right to toggle active packages.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="pb-3 font-semibold">Module</th>
                            <th className="pb-3 font-semibold">Pricing</th>
                            <th className="pb-3 font-semibold">Enabled</th>
                            <th className="pb-3 font-semibold">Expiration Rule</th>
                            <th className="pb-3 text-right font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {tenantAccess.map((access: any) => {
                            const isExpiryPast =
                              access.expiresAt && new Date(access.expiresAt) < new Date();

                            return (
                              <tr key={access.id} className="hover:bg-muted/5 transition-colors">
                                <td className="py-4">
                                  <div>
                                    <p className="font-semibold text-foreground">{access.module.name}</p>
                                    <code className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded font-mono mt-1 inline-block">
                                      {access.module.code}
                                    </code>
                                  </div>
                                </td>
                                <td className="py-4 font-medium">
                                  {access.module.isAddon ? (
                                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">
                                      Addon ({formatCurrency(access.module.addonPrice)})
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="border-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/5">
                                      Included
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-4">
                                  <Switch
                                    checked={access.isEnabled}
                                    disabled={updateAccessMutation.isPending}
                                    onCheckedChange={() => handleToggleAccessEnabled(access)}
                                  />
                                </td>
                                <td className="py-4">
                                  <div className="flex items-center gap-2 max-w-[180px]">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <Input
                                      type="date"
                                      className={`h-8 py-1 px-2 rounded-lg text-xs ${
                                        isExpiryPast ? "border-destructive text-destructive font-medium" : ""
                                      }`}
                                      value={
                                        access.expiresAt
                                          ? new Date(access.expiresAt).toISOString().split("T")[0]
                                          : ""
                                      }
                                      onChange={(e) =>
                                        handleUpdateExpiry(access.module.id, e.target.value)
                                      }
                                    />
                                  </div>
                                  {isExpiryPast && (
                                    <p className="text-[10px] text-destructive font-medium mt-1">Expired</p>
                                  )}
                                </td>
                                <td className="py-4 text-right">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/5 rounded-lg"
                                    onClick={() =>
                                      setPendingRevocation({
                                        tenantId: selectedTenantId,
                                        moduleId: access.module.id,
                                        moduleName: access.module.name,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Card>

                {/* Right Panel: Grant Access Pane */}
                <div className="space-y-6">
                  {/* Individual Grant */}
                  <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm">
                    <h3 className="text-xl font-semibold flex items-center gap-2 border-b pb-3 mb-4">
                      Grant Specific Module
                    </h3>

                    {unassignedModules.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        All active modules have already been granted to this tenant workspace.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Select Active Module</Label>
                          <Select value={grantModuleId} onValueChange={setGrantModuleId}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Choose module..." />
                            </SelectTrigger>
                            <SelectContent>
                              {unassignedModules.map((mod: any) => (
                                <SelectItem key={mod.id} value={mod.id}>
                                  {mod.name} ({mod.isAddon ? `Addon · ${formatCurrency(mod.addonPrice)}` : "Core"})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Set Custom Expiration (Optional)</Label>
                          <Input
                            type="date"
                            className="rounded-xl"
                            value={grantExpiresAt}
                            onChange={(e) => setGrantExpiresAt(e.target.value)}
                          />
                        </div>

                        <Button
                          type="button"
                          className="w-full rounded-xl mt-2"
                          disabled={!grantModuleId || grantAccessMutation.isPending}
                          onClick={() => handleGrantAccess(grantModuleId)}
                        >
                          {grantAccessMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="mr-2 h-4 w-4" />
                          )}
                          Grant Capability
                        </Button>
                      </div>
                    )}
                  </Card>

                  {/* Bulk Configuration */}
                  {unassignedModules.length > 0 && (
                    <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm">
                      <h3 className="text-xl font-semibold flex items-center gap-2 border-b pb-3 mb-4">
                        Bulk Packages
                      </h3>

                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Filter bulk modules list..."
                            className="pl-9 h-9 text-xs rounded-xl"
                            value={tenantModuleSearch}
                            onChange={(e) => setTenantModuleSearch(e.target.value)}
                          />
                        </div>

                        <div className="max-h-[200px] overflow-y-auto border rounded-2xl p-2 space-y-1">
                          {filteredUnassignedModules.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">No matching modules.</p>
                          ) : (
                            filteredUnassignedModules.map((mod: any) => {
                              const isChecked = selectedBulkModules.includes(mod.id);
                              return (
                                <div
                                  key={mod.id}
                                  className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-xl cursor-pointer"
                                  onClick={() => toggleBulkModuleSelection(mod.id)}
                                >
                                  <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                                    isChecked ? "bg-primary border-primary" : "border-muted-foreground/30"
                                  }`}>
                                    {isChecked && <Check className="h-3 w-3 text-white stroke-[3px]" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{mod.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">{mod.code}</p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="space-y-2 pt-2">
                          <Label className="text-xs">Set Expiration for Bulk Selection</Label>
                          <Input
                            type="date"
                            className="rounded-xl h-9 text-xs"
                            value={bulkGrantExpiresAt}
                            onChange={(e) => setBulkGrantExpiresAt(e.target.value)}
                          />
                        </div>

                        <Button
                          type="button"
                          className="w-full rounded-xl"
                          variant="outline"
                          disabled={selectedBulkModules.length === 0 || bulkGrantMutation.isPending}
                          onClick={handleBulkGrant}
                        >
                          {bulkGrantMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="mr-2 h-4 w-4" />
                          )}
                          Enable Selected ({selectedBulkModules.length})
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              <Card className="rounded-[28px] border border-dashed p-16 text-center text-muted-foreground">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="font-semibold text-lg">No Workspace Selected</p>
                <p className="text-sm mt-1">Please select an enterprise customer tenant above to manage active feature capability scopes.</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Revoke confirmation Dialog */}
        <AlertDialog
          open={!!pendingRevocation}
          onOpenChange={(open) => !open && setPendingRevocation(null)}
        >
          <AlertDialogContent className="rounded-[24px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-bold flex items-center gap-2 text-destructive">
                <AlertCircle className="h-6 w-6 shrink-0" />
                Revoke Custom Module Access?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm mt-2">
                This will immediately revoke access to the module <strong className="text-foreground">{pendingRevocation?.moduleName}</strong> for this tenant workspace. Any users attempting to access features inside this module will instantly receive authorization blocks.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 mt-4">
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                onClick={(e) => {
                  e.preventDefault();
                  void handleConfirmRevocation();
                }}
              >
                {revokeAccessMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Revoke Access"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </MainLayout>
  );
}
