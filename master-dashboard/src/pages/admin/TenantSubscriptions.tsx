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
import { Switch } from "@/components/ui/switch";
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
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  PauseCircle,
  RotateCcw,
  Search,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  useActivateTenantSubscription,
  useCancelTenantSubscription,
  useSubscriptionPlans,
  useSuspendTenantSubscription,
  useTenantSubscriptions,
  useUpgradeTenantSubscription,
} from "@/hooks/useSubscriptions";
import { SubscriptionsNav } from "@/components/layout/SubscriptionsNav";

const upgradeSchema = z.object({
  planId: z.string().min(1, "Plan is required"),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]),
  prorateImmediately: z.boolean().default(false),
});

type UpgradeForm = z.infer<typeof upgradeSchema>;
type SubscriptionActionType = "suspend" | "activate" | "cancel";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(value?: string | Date | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });
}

export default function TenantSubscriptionsPage() {
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: SubscriptionActionType;
    subscription: any;
  } | null>(null);

  const plansQuery = useSubscriptionPlans();
  const subscriptionsQuery = useTenantSubscriptions(
    useMemo(
      () => ({
        search: subscriptionSearch || undefined,
        page,
        limit,
      }),
      [subscriptionSearch, page, limit],
    ),
  );

  const upgradeMutation = useUpgradeTenantSubscription();
  const suspendMutation = useSuspendTenantSubscription();
  const activateMutation = useActivateTenantSubscription();
  const cancelMutation = useCancelTenantSubscription();

  const plans = plansQuery.data?.data?.data?.plans || [];
  const tenantSubscriptions = subscriptionsQuery.data?.data?.data?.subscriptions || [];
  const total = subscriptionsQuery.data?.data?.data?.pagination?.total || 0;
  const totalPages = subscriptionsQuery.data?.data?.data?.pagination?.totalPages || 1;

  const upgradeForm = useForm<UpgradeForm>({
    resolver: zodResolver(upgradeSchema),
    defaultValues: {
      planId: "",
      billingCycle: "MONTHLY",
      prorateImmediately: false,
    },
  });

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
          title: pendingAction.subscription.status === "CANCELLED"
            ? `Reactivate ${pendingAction.subscription.tenant.name}'s Subscription?`
            : `Activate ${pendingAction.subscription.tenant.name}?`,
          description:
            "This will restore access and mark the tenant subscription as active.",
          action: pendingAction.subscription.status === "CANCELLED"
            ? "Reactivate subscription"
            : "Activate subscription",
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

  return (
    <MainLayout title="Tenant Subscriptions">
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            Tenant Subscriptions
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Manage plans, pause/resume billing, and control the subscription lifecycle of all your tenants.
          </p>
        </div>

        <SubscriptionsNav />

        <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-bold font-heading">All Tenant Subscriptions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Search, upgrade, pause, or cancel subscriptions.
              </p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10 h-10 rounded-xl bg-background/50 border-border/60 focus-visible:ring-primary"
                placeholder="Search tenants..."
                value={subscriptionSearch}
                onChange={(e) => {
                  setSubscriptionSearch(e.target.value);
                  setPage(1); // reset page on search
                }}
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto border border-border/60 rounded-2xl bg-background/30 shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 font-semibold">Tenant</th>
                  <th className="p-4 font-semibold">Plan</th>
                  <th className="p-4 font-semibold">MRR</th>
                  <th className="p-4 font-semibold">Renewal</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {subscriptionsQuery.isLoading ? (
                  Array.from({ length: limit }).map((_, index) => (
                    <tr key={index}>
                      <td className="p-4">
                        <Skeleton className="h-4 w-36" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="ml-auto h-8 w-24" />
                      </td>
                    </tr>
                  ))
                ) : tenantSubscriptions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No tenant subscriptions found.
                    </td>
                  </tr>
                ) : (
                  tenantSubscriptions.map((subscription: any) => (
                    <tr key={subscription.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-semibold">
                            {subscription.tenant.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {subscription.tenant.constituencyName}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">
                            {subscription.plan.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {subscription.billingCycle}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 font-bold">
                        {formatCurrency(
                          subscription.monthlyRecurringRevenue || 0,
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {formatShortDate(subscription.nextPaymentDue)}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={
                            subscription.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 font-semibold rounded-lg"
                              : subscription.status === "TRIALING"
                                ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/10 border-blue-500/20 font-semibold rounded-lg"
                                : subscription.status === "SUSPENDED"
                                  ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 border-amber-500/20 font-semibold rounded-lg"
                                  : subscription.status === "CANCELLED" || subscription.status === "EXPIRED"
                                    ? "bg-rose-500/10 text-rose-600 hover:bg-rose-500/10 border-rose-500/20 font-semibold rounded-lg"
                                    : "bg-slate-500/10 text-slate-600 hover:bg-slate-500/10 border-slate-500/20 font-semibold rounded-lg"
                          }
                        >
                          {subscription.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-lg"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                              <DropdownMenuItem
                                onClick={() =>
                                  openUpgradeDialog(subscription)
                                }
                                className="rounded-lg"
                              >
                                <TrendingUp className="mr-2 h-4 w-4" />
                                Upgrade Plan
                              </DropdownMenuItem>
                              {subscription.status === "ACTIVE" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openActionDialog("suspend", subscription)
                                  }
                                  className="rounded-lg"
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
                                  className="rounded-lg"
                                >
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Resume Subscription
                                </DropdownMenuItem>
                              )}
                              {subscription.status === "CANCELLED" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openActionDialog("activate", subscription)
                                  }
                                  className="rounded-lg"
                                >
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Reactivate Subscription
                                </DropdownMenuItem>
                              )}
                              {subscription.status !== "CANCELLED" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openActionDialog("cancel", subscription)
                                  }
                                  className="text-destructive focus:text-destructive rounded-lg"
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

          {/* Pagination */}
          {!subscriptionsQuery.isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(page * limit, total)}
                </span>{" "}
                of <span className="font-medium">{total}</span> subscriptions
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Upgrade Dialog */}
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

        {/* Action Dialog */}
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
