import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
} from "lucide-react";
import { useUpcomingRenewals } from "@/hooks/useSubscriptions";
import { SubscriptionsNav } from "@/components/layout/SubscriptionsNav";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string | Date | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function UpcomingRenewalsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const renewalsQuery = useUpcomingRenewals(
    useMemo(
      () => ({
        search: search || undefined,
        page,
        limit,
      }),
      [search, page, limit],
    ),
  );

  const renewals = renewalsQuery.data?.data?.data?.renewals || [];
  const total = renewalsQuery.data?.data?.data?.pagination?.total || 0;
  const totalPages = renewalsQuery.data?.data?.data?.pagination?.totalPages || 1;

  return (
    <MainLayout title="Upcoming Renewals">
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            Upcoming Renewals
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Track subscription end-dates and renewal windows for active customer accounts.
          </p>
        </div>

        <SubscriptionsNav />

        <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Scheduled Renewals</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                All upcoming subscription cycles sorted by due date.
              </p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search tenant name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1); // reset page on search
                }}
              />
            </div>
          </div>

          <div className="mt-6">
            {renewalsQuery.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 w-full rounded-2xl" />
                ))}
              </div>
            ) : renewals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                <Clock className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                <p className="font-medium">No renewals scheduled right now.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Active tenants with valid billing next-due checkpoints will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {renewals.map((renewal: any) => (
                  <div
                    key={renewal.id}
                    className="rounded-2xl border border-border/70 p-5 bg-card flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-lg">{renewal.tenantName}</p>
                        {renewal.constituencyName && (
                          <p className="text-xs text-muted-foreground -mt-0.5">
                            {renewal.constituencyName}
                          </p>
                        )}
                        <p className="text-xs font-medium text-primary mt-2">
                          {renewal.planName} · {renewal.billingCycle}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          renewal.status === "ACTIVE"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold"
                            : renewal.status === "TRIALING"
                              ? "border-blue-200 bg-blue-50 text-blue-700 font-semibold"
                              : "border-amber-200 bg-amber-50 text-amber-700 font-semibold"
                        }
                      >
                        {renewal.status}
                      </Badge>
                    </div>

                    <div className="mt-5 border-t border-border/40 pt-4 flex items-center justify-between text-sm">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Renewal Date
                        </p>
                        <p className="font-medium text-foreground mt-0.5">
                          {formatDate(renewal.nextPaymentDue)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Amount Due
                        </p>
                        <p className="font-bold text-foreground mt-0.5 text-base text-emerald-700">
                          {formatCurrency(renewal.amountDue || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!renewalsQuery.isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-6">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(page * limit, total)}
                </span>{" "}
                of <span className="font-medium">{total}</span> renewals
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
      </div>
    </MainLayout>
  );
}
