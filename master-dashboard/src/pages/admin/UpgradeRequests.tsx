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
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "CANCELLED") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
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

        <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Requests Queue</h2>
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
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="ALL">All Requests</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
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

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-3 font-semibold">Tenant</th>
                  <th className="pb-3 font-semibold">Plan Change</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Requester</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {requestsQuery.isLoading ? (
                  Array.from({ length: limit }).map((_, index) => (
                    <tr key={index}>
                      {Array.from({ length: 7 }).map((__, cell) => (
                        <td key={cell} className="py-4">
                          <Skeleton className="h-4 w-28" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
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
                      <tr key={request.id}>
                        <td className="py-4">
                          <p className="font-semibold">{request.tenant?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {request.tenant?.constituencyName || "N/A"}
                          </p>
                        </td>
                        <td className="py-4">
                          <p className="font-medium">
                            {request.currentPlan?.name || "No plan"} to{" "}
                            {request.requestedPlan?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.requestedBillingCycle || "Existing cycle"}
                          </p>
                        </td>
                        <td className="py-4 font-semibold">
                          {formatCurrency(amount)}
                        </td>
                        <td className="py-4">
                          <p>{request.requesterName || "N/A"}</p>
                          <p className="text-xs text-muted-foreground">
                            {request.requesterEmail || request.requesterPhone || "No contact"}
                          </p>
                        </td>
                        <td className="py-4">
                          <Badge
                            variant="outline"
                            className={`${statusClass(request.status)} font-semibold`}
                          >
                            {request.status}
                          </Badge>
                        </td>
                        <td className="py-4 text-muted-foreground">
                          {formatDate(request.createdAt)}
                        </td>
                        <td className="py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="gap-1"
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
                              className="gap-1"
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
