import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { SubscriptionsNav } from "@/components/layout/SubscriptionsNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useApprovePlanUpgradeRequest,
  usePlanUpgradeRequests,
  useRejectPlanUpgradeRequest,
} from "@/hooks/useSubscriptions";
import { Check, ChevronLeft, ChevronRight, Search, X } from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | Date | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function statusClass(status: string) {
  if (status === "APPROVED") return "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20";
  if (status === "REJECTED") return "bg-rose-500/10 text-rose-600 hover:bg-rose-500/10 border-rose-500/20";
  if (status === "CANCELLED") return "bg-slate-500/10 text-slate-600 hover:bg-slate-500/10 border-slate-500/20";
  return "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 border-amber-500/20";
}

export default function UpgradeRequestsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const limit = 10;

  const requestsQuery = usePlanUpgradeRequests(
    useMemo(
      () => ({
        search: search || undefined,
        status: status === "ALL" ? undefined : status,
        page,
        limit,
      }),
      [search, status, page],
    ),
  );
  const approveRequest = useApprovePlanUpgradeRequest();
  const rejectRequest = useRejectPlanUpgradeRequest();

  const data = requestsQuery.data?.data?.data;
  const requests = data?.requests || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;
  const isReviewing = approveRequest.isPending || rejectRequest.isPending;

  return (
    <MainLayout title="Upgrade Requests">
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            Upgrade Requests
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Review tenant plan upgrade requests and activate approved packages.
          </p>
        </div>

        <SubscriptionsNav />

        <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm bg-card/60 backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold font-heading">Requests Queue</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pending approvals appear first by default.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[170px] h-10 rounded-xl bg-background/50 border-border/60">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="ALL">All Requests</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10 h-10 rounded-xl bg-background/50 border-border/60 focus-visible:ring-primary"
                  placeholder="Search tenant/requester..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto border border-border/60 rounded-2xl bg-background/30 shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 font-semibold">Tenant</th>
                  <th className="p-4 font-semibold">Plan Change</th>
                  <th className="p-4 font-semibold">Amount</th>
                  <th className="p-4 font-semibold">Requester</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {requestsQuery.isLoading ? (
                   Array.from({ length: limit }).map((_, index) => (
                    <tr key={index}>
                      {Array.from({ length: 7 }).map((__, cell) => (
                        <td key={cell} className="p-4">
                          <Skeleton className="h-4 w-28" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No upgrade requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((request: any) => {
                    const yearly = request.requestedBillingCycle === "YEARLY";
                    const amount = yearly
                      ? request.requestedPlan?.priceYearly
                      : request.requestedPlan?.priceMonthly;

                    return (
                      <tr key={request.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4">
                          <p className="font-semibold">{request.tenant?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {request.tenant?.constituencyName || "N/A"}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium">
                            {request.currentPlan?.name || "No plan"} to{" "}
                            {request.requestedPlan?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.requestedBillingCycle || "Existing cycle"}
                          </p>
                        </td>
                        <td className="p-4 font-bold">
                          {formatCurrency(amount)}
                        </td>
                        <td className="p-4">
                          <p>{request.requesterName || "N/A"}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {request.requesterEmail || request.requesterPhone || "No contact"}
                          </p>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant="outline"
                            className={`${statusClass(request.status)} font-semibold rounded-lg`}
                          >
                            {request.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {formatDate(request.createdAt)}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="gap-1 rounded-xl shadow-sm font-semibold"
                              disabled={request.status !== "PENDING" || isReviewing}
                              onClick={() =>
                                approveRequest.mutate({
                                  id: request.id,
                                  data: { prorateImmediately: true },
                                })
                              }
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1 rounded-xl font-semibold"
                              disabled={request.status !== "PENDING" || isReviewing}
                              onClick={() => rejectRequest.mutate({ id: request.id })}
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!requestsQuery.isLoading && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{" "}
                <span className="font-medium">{Math.min(page * limit, total)}</span>{" "}
                of <span className="font-medium">{total}</span> requests
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
