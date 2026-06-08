import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  CreditCard,
  Download,
  Loader2,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  useActivateTenantSubscription,
  useCancelTenantSubscription,
  useCreateSubscriptionPlan,
  useInvoices,
  useSubscriptionOverview,
  useSubscriptionPlans,
  useSuspendTenantSubscription,
  useTenantSubscriptions,
  useUpdateSubscriptionPlan,
  useUpgradeTenantSubscription,
} from "@/hooks/useSubscriptions";

const planFormSchema = z.object({
  name: z.string().min(2, "Plan name is required"),
  code: z.string().min(2, "Plan code is required"),
  description: z.string().optional(),
  priceMonthly: z.preprocess((v) => Number(v), z.number().min(0)),
  priceYearly: z.preprocess((v) => Number(v), z.number().min(0)),
  maxUsers: z.preprocess((v) => Number(v), z.number().int().min(1)),
  maxWards: z.preprocess((v) => Number(v), z.number().int().min(1)),
  storageMB: z.preprocess((v) => Number(v), z.number().int().min(100)),
  features: z.string().optional(),
  isPopular: z.boolean().default(false),
  sortOrder: z.preprocess((v) => Number(v), z.number().int().min(0)),
});

const upgradeSchema = z.object({
  planId: z.string().min(1, "Plan is required"),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]),
  prorateImmediately: z.boolean().default(false),
});

type PlanForm = z.infer<typeof planFormSchema>;
type UpgradeForm = z.infer<typeof upgradeSchema>;
type SubscriptionActionType = "suspend" | "activate" | "cancel";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatStorage(storageMB: number) {
  if (storageMB >= 1024) {
    return `${(storageMB / 1024).toFixed(storageMB % 1024 === 0 ? 0 : 1)} GB`;
  }
  return `${storageMB} MB`;
}

function formatShortDate(value?: string | Date | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });
}

function parseFeatures(features: any, description?: string | null) {
  if (Array.isArray(features)) {
    return features.map((item) => String(item));
  }

  if (typeof features === "string") {
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return features
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  if (description) {
    return description
      .split(".")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export default function SubscriptionsPage() {
  const [billingView, setBillingView] = useState<"MONTHLY" | "YEARLY">(
    "YEARLY",
  );
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: SubscriptionActionType;
    subscription: any;
  } | null>(null);

  const overviewQuery = useSubscriptionOverview();
  const plansQuery = useSubscriptionPlans();
  const subscriptionsQuery = useTenantSubscriptions(
    useMemo(
      () => ({
        search: subscriptionSearch || undefined,
        limit: 20,
      }),
      [subscriptionSearch],
    ),
  );
  const invoicesQuery = useInvoices(
    useMemo(
      () => ({
        search: invoiceSearch || undefined,
        limit: 10,
      }),
      [invoiceSearch],
    ),
  );

  const createPlanMutation = useCreateSubscriptionPlan();
  const updatePlanMutation = useUpdateSubscriptionPlan();
  const upgradeMutation = useUpgradeTenantSubscription();
  const suspendMutation = useSuspendTenantSubscription();
  const activateMutation = useActivateTenantSubscription();
  const cancelMutation = useCancelTenantSubscription();

  const overview = overviewQuery.data?.data?.data;
  const metrics = overview?.metrics;
  const overviewPlans = overview?.planDistribution || [];
  const recentInvoices =
    overview?.recentInvoices || invoicesQuery.data?.data?.data?.invoices || [];
  const upcomingRenewals = overview?.upcomingRenewals || [];
  const plans = plansQuery.data?.data?.data?.plans || [];
  const tenantSubscriptions =
    subscriptionsQuery.data?.data?.data?.subscriptions || [];

  const featuredPlanId = overviewPlans.reduce(
    (best: string | null, plan: any, index: number, array: any[]) => {
      if (!array.length) return null;
      if (!best) return plan.id;
      const current = array.find((item: any) => item.id === best);
      return plan.totalSubscriptions > (current?.totalSubscriptions || 0)
        ? plan.id
        : best;
    },
    null,
  );

  const planForm = useForm<PlanForm>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      priceMonthly: 0,
      priceYearly: 0,
      maxUsers: 5,
      maxWards: 10,
      storageMB: 1024,
      features: "",
      sortOrder: 0,
    },
  });

  const upgradeForm = useForm<UpgradeForm>({
    resolver: zodResolver(upgradeSchema),
    defaultValues: {
      planId: "",
      billingCycle: "MONTHLY",
      prorateImmediately: false,
    },
  });

  const openCreatePlan = () => {
    setSelectedPlan(null);
    planForm.reset({
      name: "",
      code: "",
      description: "",
      priceMonthly: 0,
      priceYearly: 0,
      maxUsers: 5,
      maxWards: 10,
      storageMB: 1024,
      features: "",
      isPopular: false,
      sortOrder: 0,
    });
    setShowPlanForm(true);
  };

  const openEditPlan = (plan: any) => {
    setSelectedPlan(plan);
    planForm.reset({
      name: plan.name,
      code: plan.code,
      description: plan.description || "",
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      maxUsers: plan.maxUsers,
      maxWards: plan.maxWards || 10,
      storageMB: plan.storageMB,
      features: parseFeatures(plan.features).join("\n"),
      isPopular: !!plan.isPopular,
      sortOrder: plan.sortOrder || 0,
    });
    setShowPlanForm(true);
  };

  const handleSavePlan = async (values: PlanForm) => {
    const payload = {
      ...values,
      features: values.features
        ? values.features
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
    };

    if (selectedPlan) {
      await updatePlanMutation.mutateAsync({
        id: selectedPlan.id,
        data: payload,
      });
    } else {
      await createPlanMutation.mutateAsync(payload);
    }

    setShowPlanForm(false);
  };

  const openUpgradeDialog = (subscription: any) => {
    setSelectedSubscription(subscription);
    upgradeForm.reset({
      planId: "",
      billingCycle: subscription.billingCycle || "MONTHLY",
      prorateImmediately: false,
    });
    setUpgradeDialogOpen(true);
  };

  const handleUpgrade = async (values: UpgradeForm) => {
    if (!selectedSubscription) return;
    await upgradeMutation.mutateAsync({
      tenantId: selectedSubscription.tenant.id,
      data: values,
    });
    setUpgradeDialogOpen(false);
  };

  const openActionDialog = (
    type: SubscriptionActionType,
    subscription: any,
  ) => {
    setPendingAction({ type, subscription });
  };

  const confirmAction = async () => {
    if (!pendingAction) return;

    const tenantId = pendingAction.subscription.tenant.id;
    if (pendingAction.type === "suspend") {
      await suspendMutation.mutateAsync(tenantId);
    } else if (pendingAction.type === "activate") {
      await activateMutation.mutateAsync(tenantId);
    } else {
      await cancelMutation.mutateAsync(tenantId);
    }

    setPendingAction(null);
  };

  const actionCopy = pendingAction
    ? {
        suspend: {
          title: `Suspend ${pendingAction.subscription.tenant.name}?`,
          description:
            "Billing and access will be paused until this subscription is activated again.",
          action: "Suspend subscription",
          destructive: false,
        },
        activate: {
          title: `Activate ${pendingAction.subscription.tenant.name}?`,
          description:
            "This will restore access and mark the tenant subscription as active.",
          action: "Activate subscription",
          destructive: false,
        },
        cancel: {
          title: `Cancel ${pendingAction.subscription.tenant.name}?`,
          description:
            "This will cancel the current subscription for the tenant. Use this only when the workspace should stop billing.",
          action: "Cancel subscription",
          destructive: true,
        },
      }[pendingAction.type]
    : null;

  const exportInvoices = () => {
    const rows = recentInvoices.map((invoice: any) => ({
      invoice: invoice.invoiceNumber,
      tenant: invoice.tenantName || invoice.tenant?.name,
      plan: invoice.planName || invoice.plan?.name,
      amount: invoice.amount,
      status: invoice.status,
      date: invoice.paidAt || invoice.createdAt,
    }));

    const csv = [
      ["Invoice", "Tenant", "Plan", "Amount", "Status", "Date"].join(","),
      ...rows.map((row: any) =>
        [
          row.invoice,
          row.tenant,
          row.plan,
          row.amount,
          row.status,
          new Date(row.date).toLocaleDateString("en-CA"),
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "subscription-invoices.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (showPlanForm) {
    return (
      <MainLayout title={selectedPlan ? "Edit Plan" : "Create Plan"}>
        <div className="space-y-6 max-w-4xl mx-auto py-4">
          {/* Header with Back Button */}
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full border border-border/40 hover:bg-muted"
              onClick={() => setShowPlanForm(false)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {selectedPlan ? `Edit Plan: ${selectedPlan.name}` : "Create Subscription Plan"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {selectedPlan ? "Modify pricing plans, feature access, and system limitations." : "Add a brand new subscription tier to your SaaS model."}
              </p>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={planForm.handleSubmit(handleSavePlan)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* General Section */}
              <Card className="rounded-[24px] border border-border/60 p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-3">
                  General Information
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="plan-name">Plan Name</Label>
                  <Input id="plan-name" placeholder="e.g. Starter, Enterprise" {...planForm.register("name")} />
                  {planForm.formState.errors.name && (
                    <p className="text-sm text-destructive font-medium">{planForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan-code">Plan Code</Label>
                  <Input id="plan-code" placeholder="e.g. starter-tier" {...planForm.register("code")} />
                  {planForm.formState.errors.code && (
                    <p className="text-sm text-destructive font-medium">{planForm.formState.errors.code.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan-description">Description</Label>
                  <Textarea
                    id="plan-description"
                    rows={4}
                    placeholder="Describe the plan benefits and target audience..."
                    {...planForm.register("description")}
                  />
                </div>
              </Card>

              {/* Pricing & Visibility */}
              <Card className="rounded-[24px] border border-border/60 p-6 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-3">
                    Pricing & Visibility
                  </h3>

                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="price-monthly">Monthly Price (₹)</Label>
                      <Input
                        id="price-monthly"
                        type="number"
                        step="0.01"
                        placeholder="0"
                        {...planForm.register("priceMonthly")}
                      />
                      {planForm.formState.errors.priceMonthly && (
                        <p className="text-sm text-destructive font-medium">{planForm.formState.errors.priceMonthly.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price-yearly">Yearly Price (₹)</Label>
                      <Input
                        id="price-yearly"
                        type="number"
                        step="0.01"
                        placeholder="0"
                        {...planForm.register("priceYearly")}
                      />
                      {planForm.formState.errors.priceYearly && (
                        <p className="text-sm text-destructive font-medium">{planForm.formState.errors.priceYearly.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between rounded-2xl border border-border/70 p-4 bg-muted/30">
                      <div>
                        <p className="font-semibold text-sm">Mark as Popular</p>
                        <p className="text-xs text-muted-foreground max-w-[240px]">
                          Highlights the plan with custom styling in catalogs.
                        </p>
                      </div>
                      <Switch
                        checked={planForm.watch("isPopular")}
                        onCheckedChange={(checked) =>
                          planForm.setValue("isPopular", checked)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort-order">Sort Order</Label>
                  <Input
                    id="sort-order"
                    type="number"
                    placeholder="0"
                    {...planForm.register("sortOrder")}
                  />
                  <p className="text-xs text-muted-foreground">Order of appearance in lists (lowest first).</p>
                </div>
              </Card>
            </div>

            {/* Limits & Customization */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="rounded-[24px] border border-border/60 p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-3">
                  Usage Limits
                </h3>

                <div className="grid gap-4 grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="max-users">Max Users</Label>
                    <Input type="number" id="max-users" placeholder="5" {...planForm.register("maxUsers")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-wards">Max Wards</Label>
                    <Input type="number" id="max-wards" placeholder="10" {...planForm.register("maxWards")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storage-mb">Storage (MB)</Label>
                    <Input type="number" id="storage-mb" placeholder="1024" {...planForm.register("storageMB")} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Control resources allocations for workspaces under this tier. (e.g. 1024 MB is 1 GB).
                </p>
              </Card>

              {/* Features List */}
              <Card className="rounded-[24px] border border-border/60 p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-3">
                  Key Features
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="features-list">Features List</Label>
                  <Textarea
                    id="features-list"
                    rows={4}
                    placeholder="Enter each feature on a new line&#10;e.g. Advanced analytics&#10;e.g. Custom domain integration"
                    {...planForm.register("features")}
                  />
                  <p className="text-xs text-muted-foreground">Specify standard offerings for marketing purposes.</p>
                </div>
              </Card>
            </div>

            {/* Form Footer Action Buttons */}
            <div className="flex items-center justify-end gap-3 border-t pt-6">
              <Button
                type="button"
                variant="outline"
                className="px-6 rounded-xl"
                onClick={() => setShowPlanForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-6 rounded-xl"
                disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
              >
                {createPlanMutation.isPending || updatePlanMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving changes...
                  </>
                ) : (
                  "Save Plan Tier"
                )}
              </Button>
            </div>
          </form>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Subscriptions & Billing">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">
              Subscriptions & Billing
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Plans, invoices, billing health, and tenant subscription lifecycle
              in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={exportInvoices}
            >
              <Download className="h-4 w-4" />
              Download invoices
            </Button>
            <Button type="button" className="gap-2" onClick={openCreatePlan}>
              <Plus className="h-4 w-4" />
              New plan
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Active Subscriptions",
              value: metrics?.activeSubscriptions ?? 0,
              icon: CreditCard,
            },
            {
              label: "MRR",
              value: formatCurrency(metrics?.mrr ?? 0),
              icon: Wallet,
            },
            {
              label: "ARR",
              value: formatCurrency(metrics?.arr ?? 0),
              icon: TrendingUp,
            },
            {
              label: "Churn (30D)",
              value: `${(metrics?.churnRate30d ?? 0).toFixed(1)}%`,
              icon: ArrowUpRight,
            },
          ].map((metric) => (
            <Card
              key={metric.label}
              className="rounded-[28px] border border-border/60 p-8 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    {metric.label}
                  </p>
                  {overviewQuery.isLoading ? (
                    <Skeleton className="mt-5 h-12 w-36" />
                  ) : (
                    <p className="mt-5 text-5xl font-semibold tracking-tight">
                      {metric.value}
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3 text-primary">
                  <metric.icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4">
          <span
            className={
              billingView === "MONTHLY"
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            }
          >
            Monthly
          </span>
          <Switch
            checked={billingView === "YEARLY"}
            onCheckedChange={(checked) =>
              setBillingView(checked ? "YEARLY" : "MONTHLY")
            }
          />
          <span
            className={
              billingView === "YEARLY"
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            }
          >
            Yearly
          </span>
          <span className="font-semibold text-emerald-600">-20%</span>
        </div>

        {(() => {
          const displayPlans = plans.length ? plans : overviewPlans;
          const plansCount = displayPlans.length;
          const gridLayoutClass =
            plansCount === 1
              ? "max-w-md mx-auto grid-cols-1"
              : plansCount === 2
                ? "max-w-3xl mx-auto grid-cols-1 md:grid-cols-2"
                : plansCount === 3
                  ? "max-w-6xl mx-auto grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

          return (
            <div className={`grid gap-6 ${gridLayoutClass}`}>
              {displayPlans.map((plan: any) => {
                const isFeatured = !!plan.isPopular;
                const price =
                  billingView === "YEARLY"
                    ? plan.priceYearly
                      ? plan.priceYearly / 12
                      : plan.priceMonthly
                    : plan.priceMonthly;
                const features = parseFeatures(plan.features, plan.description);

                return (
                  <Card
                    key={plan.id}
                    className={`relative rounded-[28px] border p-8 shadow-sm transition-all duration-300 hover:shadow-md ${
                      isFeatured
                        ? "border-primary shadow-[0_0_0_1px_rgba(59,130,246,0.22)] bg-gradient-to-b from-primary/5 via-background to-background overflow-visible"
                        : "border-border/60 hover:border-border overflow-hidden"
                    }`}
                  >
                    {isFeatured && (
                      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary to-blue-500 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm">
                        Most Popular
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-semibold">{plan.name}</h3>
                        <p className="mt-2 min-h-12 text-sm text-muted-foreground">
                          {plan.description ||
                            "Built for teams that need reliable tenant scaling and billing control."}
                        </p>
                      </div>
                      {isFeatured && <Sparkles className="h-5 w-5 text-primary animate-pulse" />}
                    </div>
                    <div className="mt-6">
                      <p className="text-5xl font-semibold tracking-tight">
                        {formatCurrency(price)}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        /mo billed {billingView === "YEARLY" ? "yearly" : "monthly"}
                      </p>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <Button
                        className="flex-1 rounded-2xl"
                        variant={isFeatured ? "default" : "outline"}
                        onClick={() => openEditPlan(plan)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit plan
                      </Button>
                    </div>
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>{plan.maxUsers} users included</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>{plan.maxWards || 10} wards included</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>{formatStorage(plan.storageMB)} storage</span>
                      </div>
                      {features.slice(0, 3).map((feature: string) => (
                        <div
                          key={feature}
                          className="flex items-center gap-3 text-sm"
                        >
                          <Check className="h-4 w-4 text-emerald-600" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          );
        })()}

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Tenant subscriptions</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upgrade plans, pause billing, and keep subscription health
                  under control.
                </p>
              </div>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search tenants..."
                  value={subscriptionSearch}
                  onChange={(e) => setSubscriptionSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-3 font-semibold">Tenant</th>
                    <th className="pb-3 font-semibold">Plan</th>
                    <th className="pb-3 font-semibold">MRR</th>
                    <th className="pb-3 font-semibold">Renewal</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {subscriptionsQuery.isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        <td className="py-4">
                          <Skeleton className="h-4 w-36" />
                        </td>
                        <td className="py-4">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="py-4">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="py-4">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="py-4">
                          <Skeleton className="h-6 w-24 rounded-full" />
                        </td>
                        <td className="py-4">
                          <Skeleton className="ml-auto h-8 w-24" />
                        </td>
                      </tr>
                    ))
                  ) : tenantSubscriptions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-muted-foreground"
                      >
                        No tenant subscriptions found.
                      </td>
                    </tr>
                  ) : (
                    tenantSubscriptions.map((subscription: any) => (
                      <tr key={subscription.id}>
                        <td className="py-4">
                          <div>
                            <p className="font-semibold">
                              {subscription.tenant.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {subscription.tenant.constituencyName}
                            </p>
                          </div>
                        </td>
                        <td className="py-4">
                          <div>
                            <p className="font-medium">
                              {subscription.plan.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {subscription.billingCycle}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 font-semibold">
                          {formatCurrency(
                            subscription.monthlyRecurringRevenue || 0,
                          )}
                        </td>
                        <td className="py-4 text-muted-foreground">
                          {formatShortDate(subscription.nextPaymentDue)}
                        </td>
                        <td className="py-4">
                          <Badge
                            variant="outline"
                            className={
                              subscription.status === "ACTIVE"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : subscription.status === "TRIALING"
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : subscription.status === "SUSPENDED"
                                    ? "border-orange-200 bg-orange-50 text-orange-700"
                                    : subscription.status === "CANCELLED" || subscription.status === "EXPIRED"
                                      ? "border-rose-200 bg-rose-50 text-rose-700"
                                      : "border-slate-200 bg-slate-50 text-slate-700"
                            }
                          >
                            {subscription.status}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() =>
                                    openUpgradeDialog(subscription)
                                  }
                                >
                                  <TrendingUp className="mr-2 h-4 w-4" />
                                  Upgrade Plan
                                </DropdownMenuItem>
                                {subscription.status === "ACTIVE" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openActionDialog("suspend", subscription)
                                    }
                                  >
                                    <PauseCircle className="mr-2 h-4 w-4" />
                                    Pause Subscription
                                  </DropdownMenuItem>
                                )}
                                {subscription.status === "SUSPENDED" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openActionDialog("activate", subscription)
                                    }
                                  >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Resume Subscription
                                  </DropdownMenuItem>
                                )}
                                {subscription.status !== "CANCELLED" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openActionDialog("cancel", subscription)
                                    }
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel Subscription
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Upcoming renewals</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep an eye on the next billing checkpoints.
                </p>
              </div>
              <Receipt className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-6 space-y-3">
              {overviewQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-2xl" />
                ))
              ) : upcomingRenewals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No renewals scheduled right now.
                </div>
              ) : (
                upcomingRenewals.map((renewal: any) => (
                  <div
                    key={renewal.id}
                    className="rounded-2xl border border-border/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{renewal.tenantName}</p>
                        <p className="text-xs text-muted-foreground">
                          {renewal.planName} · {renewal.billingCycle}
                        </p>
                      </div>
                      <Badge variant="outline">{renewal.status}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatShortDate(renewal.nextPaymentDue)}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(renewal.amountDue || 0)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Recent invoices</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Latest payment activity across all tenants.
              </p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search invoice or tenant..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-3 font-semibold">Invoice</th>
                  <th className="pb-3 font-semibold">Tenant</th>
                  <th className="pb-3 font-semibold">Plan</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {invoicesQuery.isLoading && !recentInvoices.length ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td className="py-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="py-4">
                        <Skeleton className="h-4 w-36" />
                      </td>
                      <td className="py-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="py-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="py-4">
                        <Skeleton className="h-4 w-16" />
                      </td>
                    </tr>
                  ))
                ) : recentInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground"
                    >
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map((invoice: any) => (
                    <tr key={invoice.id}>
                      <td className="py-4 font-semibold">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-4">
                        {invoice.tenantName || invoice.tenant?.name}
                      </td>
                      <td className="py-4">
                        {invoice.planName || invoice.plan?.name}
                      </td>
                      <td className="py-4 font-medium">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="py-4">
                        <Badge
                          variant="outline"
                          className={
                            invoice.status === "SUCCESS"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : invoice.status === "PENDING"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-rose-200 bg-rose-50 text-rose-700"
                          }
                        >
                          {invoice.status === "SUCCESS"
                            ? "Paid"
                            : invoice.status === "FAILED"
                              ? "Failed"
                              : invoice.status}
                        </Badge>
                      </td>
                      <td className="py-4 text-muted-foreground">
                        {formatShortDate(invoice.paidAt || invoice.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>


        <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Upgrade Tenant Subscription</DialogTitle>
              <DialogDescription>
                Move {selectedSubscription?.tenant?.name} to a stronger plan
                with optional proration.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={upgradeForm.handleSubmit(handleUpgrade)}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label>Target Plan</Label>
                <Select
                  value={upgradeForm.watch("planId")}
                  onValueChange={(value) =>
                    upgradeForm.setValue("planId", value, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose upgraded plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans
                      .filter(
                        (plan: any) =>
                          plan.id !== selectedSubscription?.plan?.id,
                      )
                      .map((plan: any) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} · {formatCurrency(plan.priceMonthly)}/mo
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select
                  value={upgradeForm.watch("billingCycle")}
                  onValueChange={(value) =>
                    upgradeForm.setValue("billingCycle", value as any, {
                      shouldValidate: true,
                    })
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

              <div className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3">
                <div>
                  <p className="font-medium">Prorate immediately</p>
                  <p className="text-sm text-muted-foreground">
                    Charge the new plan amount right away and reset the billing
                    period.
                  </p>
                </div>
                <Switch
                  checked={upgradeForm.watch("prorateImmediately")}
                  onCheckedChange={(checked) =>
                    upgradeForm.setValue("prorateImmediately", checked)
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUpgradeDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={upgradeMutation.isPending}>
                  {upgradeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Upgrading...
                    </>
                  ) : (
                    "Upgrade plan"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!pendingAction}
          onOpenChange={(open) => !open && setPendingAction(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{actionCopy?.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {actionCopy?.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void confirmAction();
                }}
                className={
                  actionCopy?.destructive
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : ""
                }
              >
                {suspendMutation.isPending ||
                activateMutation.isPending ||
                cancelMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Working...
                  </>
                ) : (
                  actionCopy?.action
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
