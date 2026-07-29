import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  Download,
  Search,
} from "lucide-react";
import { useInvoices } from "@/hooks/useSubscriptions";
import { SubscriptionsNav } from "@/components/layout/SubscriptionsNav";

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
    year: "numeric",
  });
}

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const limit = 10;

  const invoicesQuery = useInvoices(
    useMemo(
      () => ({
        search: search || undefined,
        status: status === "ALL" ? undefined : status,
        page,
        limit,
      }),
      [search, status, page, limit],
    ),
  );

  const invoices = invoicesQuery.data?.data?.data?.invoices || [];
  const total = invoicesQuery.data?.data?.data?.pagination?.total || 0;
  const totalPages = invoicesQuery.data?.data?.data?.pagination?.totalPages || 1;

  const exportInvoices = () => {
    const rows = invoices.map((invoice: any) => ({
      invoice: invoice.invoiceNumber,
      tenant: invoice.tenant?.name || invoice.tenantName,
      plan: invoice.plan?.name || invoice.planName,
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
    link.download = `invoices-page-${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout title="Invoices">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">
              Invoices & Payments
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Review and audit all billing logs, transactional receipts, and auto-generated tenant invoices.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={exportInvoices}
              disabled={invoices.length === 0}
            >
              <Download className="h-4 w-4" />
              Download page CSV
            </Button>
          </div>
        </div>

        <SubscriptionsNav />

        <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm bg-card/60 backdrop-blur-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold font-heading">Payment History</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Search, filter, and track payments across all registered platforms.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1); // reset page on filter change
                }}
              >
                <SelectTrigger className="w-[150px] h-10 rounded-xl bg-background/50 border-border/60">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="SUCCESS">Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10 h-10 rounded-xl bg-background/50 border-border/60 focus-visible:ring-primary"
                  placeholder="Search invoice/tenant..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1); // reset page on search
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto border border-border/60 rounded-2xl bg-background/30 shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 font-semibold">Invoice</th>
                  <th className="p-4 font-semibold">Tenant</th>
                  <th className="p-4 font-semibold">Plan</th>
                  <th className="p-4 font-semibold">Amount</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {invoicesQuery.isLoading ? (
                  Array.from({ length: limit }).map((_, index) => (
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
                ) : invoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground"
                    >
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice: any) => (
                    <tr key={invoice.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4 font-semibold font-heading">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="p-4">
                        {invoice.tenant?.name || invoice.tenantName}
                      </td>
                      <td className="p-4">
                        {invoice.plan?.name || invoice.planName}
                      </td>
                      <td className="p-4 font-bold">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={
                            invoice.status === "SUCCESS"
                              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 font-semibold rounded-lg"
                              : invoice.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 border-amber-500/20 font-semibold rounded-lg"
                                : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/10 border-rose-500/20 font-semibold rounded-lg"
                          }
                        >
                          {invoice.status === "SUCCESS"
                            ? "Paid"
                            : invoice.status === "FAILED"
                              ? "Failed"
                              : invoice.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {formatShortDate(invoice.paidAt || invoice.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!invoicesQuery.isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(page * limit, total)}
                </span>{" "}
                of <span className="font-medium">{total}</span> invoices
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
