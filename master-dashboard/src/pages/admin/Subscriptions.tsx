import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowUpRight,
  ArrowUpCircle,
  Calendar,
  Check,
  ChevronLeft,
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useModules } from "@/hooks/useModules";
import {
  useCreateSubscriptionPlan,
  useSubscriptionOverview,
  useSubscriptionPlans,
  useUpdateSubscriptionPlan,
} from "@/hooks/useSubscriptions";
import { SubscriptionsNav } from "@/components/layout/SubscriptionsNav";

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
  moduleIds: z.array(z.string()).default([]),
});

type PlanForm = z.infer<typeof planFormSchema>;

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
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const overviewQuery = useSubscriptionOverview();
  const plansQuery = useSubscriptionPlans();
  const createPlanMutation = useCreateSubscriptionPlan();
  const updatePlanMutation = useUpdateSubscriptionPlan();

  const overview = overviewQuery.data?.data?.data;
  const metrics = overview?.metrics;
  const overviewPlans = overview?.planDistribution || [];
  const plans = plansQuery.data?.data?.data?.plans || [];

  const modulesQuery = useModules({ limit: 100, isActive: "true" });
  const allModules = modulesQuery.data?.data?.data?.modules || [];

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
      moduleIds: [],
    },
  });

  const selectedModuleIds = planForm.watch("moduleIds") || [];

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
      moduleIds: [],
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
      moduleIds: plan.planModules?.map((pm: any) => pm.moduleId) || [],
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

            {/* System Modules Card */}
            <Card className="rounded-[24px] border border-border/60 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-3">
                  Included Modules & Addons
                </h3>
                <p className="text-xs text-muted-foreground mt-2">
                  Select which system modules and features are enabled for tenants subscribed to this plan.
                </p>
              </div>

              {modulesQuery.isLoading ? (
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {allModules.map((mod: any) => {
                    const isChecked = selectedModuleIds.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-border/80 hover:bg-muted/30"
                        }`}
                        onClick={() => {
                          if (isChecked) {
                            planForm.setValue(
                              "moduleIds",
                              selectedModuleIds.filter((id) => id !== mod.id)
                            );
                          } else {
                            planForm.setValue("moduleIds", [...selectedModuleIds, mod.id]);
                          }
                        }}
                      >
                        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isChecked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        }`}>
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-sm">{mod.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{mod.description || "No description"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

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
            <Button type="button" className="gap-2" onClick={openCreatePlan}>
              <Plus className="h-4 w-4" />
              New plan
            </Button>
          </div>
        </div>

        <SubscriptionsNav />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Active Subscriptions",
              value: metrics?.activeSubscriptions ?? 0,
              icon: CreditCard,
            },
            {
              label: "Total Revenue",
              value: formatCurrency(metrics?.totalRevenue ?? 0),
              icon: Wallet,
            },
            {
              label: "Pending Upgrades",
              value: metrics?.pendingUpgrades ?? 0,
              icon: ArrowUpCircle,
            },
            {
              label: "Upcoming Renewals",
              value: metrics?.upcomingRenewals ?? 0,
              icon: Calendar,
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

        <div className="flex justify-center mb-8">
          <div className="relative flex p-1.5 bg-muted/50 backdrop-blur-md rounded-2xl border border-border/60 shadow-inner max-w-xs w-full">
            <button
              type="button"
              onClick={() => setBillingView("MONTHLY")}
              className={`flex-1 relative z-10 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                billingView === "MONTHLY"
                  ? "bg-background text-primary shadow-[0_2px_8px_rgba(59,130,246,0.08)] border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingView("YEARLY")}
              className={`flex-1 relative z-10 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                billingView === "YEARLY"
                  ? "bg-background text-primary shadow-[0_2px_8px_rgba(59,130,246,0.08)] border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                -20%
              </span>
            </button>
          </div>
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
                    className={`relative rounded-[28px] border p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                      isFeatured
                        ? "border-primary/60 shadow-[0_12px_40px_rgba(59,130,246,0.08)] bg-gradient-to-b from-primary/[0.03] via-background to-background overflow-visible scale-[1.02]"
                        : "border-border/60 hover:border-border/80 overflow-hidden"
                    }`}
                  >
                    {isFeatured && (
                      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary to-blue-600 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-md">
                        Most Popular
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-bold font-heading">{plan.name}</h3>
                        <p className="mt-2 min-h-12 text-sm text-muted-foreground leading-relaxed">
                          {plan.description ||
                            "Built for teams that need reliable tenant scaling and billing control."}
                        </p>
                      </div>
                      {isFeatured && <Sparkles className="h-5 w-5 text-primary animate-pulse shrink-0 mt-1" />}
                    </div>
                    <div className="mt-6 flex items-baseline gap-1.5">
                      <span className="text-5xl font-bold tracking-tight font-heading">
                        {formatCurrency(price)}
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground">/mo</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      billed {billingView === "YEARLY" ? "yearly" : "monthly"}
                    </p>
                    <div className="mt-6 flex gap-3">
                      <Button
                        className="flex-1 rounded-2xl font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                        variant={isFeatured ? "default" : "outline"}
                        onClick={() => openEditPlan(plan)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Plan
                      </Button>
                    </div>
                    <div className="mt-8 space-y-4">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                        <span className="text-muted-foreground font-medium"><strong className="text-foreground">{plan.maxUsers}</strong> users included</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                        <span className="text-muted-foreground font-medium"><strong className="text-foreground">{plan.maxWards || 10}</strong> wards included</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                        <span className="text-muted-foreground font-medium"><strong className="text-foreground">{formatStorage(plan.storageMB)}</strong> storage</span>
                      </div>
                      {features.slice(0, 3).map((feature: string) => (
                        <div
                          key={feature}
                          className="flex items-center gap-3 text-sm"
                        >
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                          <span className="text-muted-foreground font-medium">{feature}</span>
                        </div>
                      ))}
                      {plan.planModules && plan.planModules.length > 0 && (
                        <div className="pt-5 border-t border-border/50 mt-5">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            Included Modules
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {plan.planModules.map((pm: any) => (
                              <Badge
                                key={pm.moduleId}
                                variant="secondary"
                                className="text-[10px] px-2 py-0.5 h-5 font-medium rounded-lg border border-border/40"
                              >
                                {pm.module?.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          );
        })()}
      </div>
    </MainLayout>
  );
}
