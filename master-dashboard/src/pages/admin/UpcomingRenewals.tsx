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

        <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm bg-card/60 backdrop-blur-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold font-heading">Scheduled Renewals</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                All upcoming subscription cycles sorted by due date.
              </p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10 h-10 rounded-xl bg-background/50 border-border/60 focus-visible:ring-primary"
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
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground bg-background/30">
                <Clock className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                <p className="font-semibold text-foreground">No renewals scheduled right now.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Active tenants with valid billing next-due checkpoints will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {renewals.map((renewal: any) => (
                  <div
                    key={renewal.id}
                    className="rounded-2xl border border-border/60 p-5 bg-card/40 backdrop-blur-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-lg font-heading">{renewal.tenantName}</p>
                        {renewal.constituencyName && (
                          <p className="text-xs text-muted-foreground -mt-0.5">
                            {renewal.constituencyName}
                          </p>
                        )}
                        <p className="text-xs font-semibold text-primary mt-2">
                          {renewal.planName} · {renewal.billingCycle}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          renewal.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 font-semibold rounded-lg"
                            : renewal.status === "TRIALING"
                              ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/10 border-blue-500/20 font-semibold rounded-lg"
                              : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 border-amber-500/20 font-semibold rounded-lg"
                        }
                      >
                        {renewal.status}
                      </Badge>
                    </div>

                    <div className="mt-5 border-t border-border/50 pt-4 flex items-center justify-between text-sm">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Renewal Date
                        </p>
                        <p className="font-semibold text-foreground mt-0.5">
                          {formatDate(renewal.nextPaymentDue)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Amount Due
                        </p>
                        <p className="font-bold text-emerald-600 mt-0.5 text-base font-heading">
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
