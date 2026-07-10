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

        <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">All Tenant Subscriptions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Search, upgrade, pause, or cancel subscriptions.
              </p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search tenants..."
                value={subscriptionSearch}
                onChange={(e) => {
                  setSubscriptionSearch(e.target.value);
                  setPage(1); // reset page on search
                }}
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
                  Array.from({ length: limit }).map((_, index) => (
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
                              {subscription.status === "CANCELLED" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openActionDialog("activate", subscription)
                                  }
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
