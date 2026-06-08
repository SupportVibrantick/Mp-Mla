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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  useCreatePayment,
  usePaymentsList,
  usePaymentStats,
  useUpdatePaymentStatus,
} from "@/hooks/usePayments";
import { useTenantSubscriptions } from "@/hooks/useSubscriptions";

const paymentFormSchema = z.object({
  subscriptionId: z.string().min(1, "Subscription/Tenant is required"),
  amount: z.preprocess((v) => Number(v), z.number().min(0.01, "Amount must be greater than 0")),
  currency: z.string().default("INR"),
  method: z.string().min(1, "Payment method is required"),
  transactionId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceUrl: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]),
  paidAt: z.string().optional(),
});

const statusUpdateSchema = z.object({
  status: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]),
  paidAt: z.string().optional(),
  transactionId: z.string().optional(),
  method: z.string().optional(),
  invoiceUrl: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentFormSchema>;
type StatusUpdateForm = z.infer<typeof statusUpdateSchema>;

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
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  // Queries
  const { data: paymentsData, isLoading: isPaymentsLoading, refetch: refetchPayments } = usePaymentsList({
    page: String(page),
    limit: "10",
    search,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = usePaymentStats();
  const { data: subsData } = useTenantSubscriptions({ limit: "100" });

  // Mutations
  const createPaymentMutation = useCreatePayment();
  const updateStatusMutation = useUpdatePaymentStatus();

  // Forms
  const recordForm = useForm<PaymentForm>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      currency: "INR",
      status: "PENDING",
      method: "BANK_TRANSFER",
    },
  });

  const statusForm = useForm<StatusUpdateForm>({
    resolver: zodResolver(statusUpdateSchema),
  });

  const payments = paymentsData?.data?.data?.payments || [];
  const pagination = paymentsData?.data?.data?.pagination || { totalPages: 1 };
  const stats = statsData?.data?.data || { aggregates: [], methodBreakdown: [], monthlyHistory: [] };
  const subscriptions = subsData?.data?.data?.subscriptions || [];

  // Derived stats
  const totalRevenue = useMemo(() => {
    const successAgg = stats.aggregates.find((agg: any) => agg.status === "SUCCESS");
    return successAgg ? successAgg.totalAmount : 0;
  }, [stats]);

  const pendingAmount = useMemo(() => {
    const pendingAgg = stats.aggregates.find((agg: any) => agg.status === "PENDING");
    return pendingAgg ? pendingAgg.totalAmount : 0;
  }, [stats]);

  const successCount = useMemo(() => {
    const successAgg = stats.aggregates.find((agg: any) => agg.status === "SUCCESS");
    return successAgg ? successAgg.count : 0;
  }, [stats]);

  const totalCount = useMemo(() => {
    return stats.aggregates.reduce((sum: number, agg: any) => sum + agg.count, 0);
  }, [stats]);

  const handleRecordPayment = async (data: PaymentForm) => {
    try {
      await createPaymentMutation.mutateAsync(data);
      setIsRecordOpen(false);
      recordForm.reset();
      refetchPayments();
      refetchStats();
    } catch (e) {
      // handled by mutation
    }
  };

  const handleUpdateStatus = async (data: StatusUpdateForm) => {
    if (!selectedPayment) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: selectedPayment.id,
        data,
      });
      setIsStatusOpen(false);
      statusForm.reset();
      setSelectedPayment(null);
      refetchPayments();
      refetchStats();
    } catch (e) {
      // handled by mutation
    }
  };

  const openStatusDialog = (payment: any) => {
    setSelectedPayment(payment);
    statusForm.reset({
      status: payment.status,
      paidAt: payment.paidAt ? new Date(payment.paidAt).toISOString().split("T")[0] : undefined,
      transactionId: payment.transactionId || "",
      method: payment.method || "BANK_TRANSFER",
      invoiceUrl: payment.invoiceUrl || "",
      notes: payment.notes || "",
    });
    setIsStatusOpen(true);
  };

  const openDetailsDialog = (payment: any) => {
    setSelectedPayment(payment);
    setIsDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30 gap-1"><CheckCircle className="w-3.5 h-3.5" /> Success</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/20 border-amber-500/30 gap-1"><Clock className="w-3.5 h-3.5" /> Pending</Badge>;
      case "FAILED":
        return <Badge className="bg-rose-500/20 text-rose-500 hover:bg-rose-500/20 border-rose-500/30 gap-1"><XCircle className="w-3.5 h-3.5" /> Failed</Badge>;
      case "REFUNDED":
        return <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/20 border-blue-500/30 gap-1"><RefreshCw className="w-3.5 h-3.5" /> Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-heading">Payments & Invoicing</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track subscriptions transaction history, record manual payments, and monitor overall revenue analytics.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                refetchPayments();
                refetchStats();
              }}
              variant="outline"
              size="icon"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={() => setIsRecordOpen(true)} className="gap-2 shadow-lg hover:shadow-primary/20">
              <Plus className="w-4 h-4" /> Record Payment
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6 relative overflow-hidden bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent border-emerald-500/10">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="w-16 h-16 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Revenue Collected</span>
              <span className="p-1 bg-emerald-500/10 text-emerald-500 rounded-lg"><IndianRupee className="w-4 h-4" /></span>
            </div>
            <div className="mt-4">
              {isStatsLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <h3 className="text-2xl font-bold text-emerald-500 font-heading">{formatCurrency(totalRevenue)}</h3>
              )}
              <p className="text-xs text-muted-foreground mt-1">From successfully processed invoice payments</p>
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden bg-gradient-to-br from-amber-500/5 via-transparent to-transparent border-amber-500/10">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Clock className="w-16 h-16 text-amber-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Pending Amount</span>
              <span className="p-1 bg-amber-500/10 text-amber-500 rounded-lg"><Clock className="w-4 h-4" /></span>
            </div>
            <div className="mt-4">
              {isStatsLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <h3 className="text-2xl font-bold text-amber-500 font-heading">{formatCurrency(pendingAmount)}</h3>
              )}
              <p className="text-xs text-muted-foreground mt-1">Awaiting confirmation or settlement</p>
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent border-indigo-500/10">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <CheckCircle className="w-16 h-16 text-indigo-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Success Rate</span>
              <span className="p-1 bg-indigo-500/10 text-indigo-500 rounded-lg"><CheckCircle className="w-4 h-4" /></span>
            </div>
            <div className="mt-4">
              {isStatsLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <h3 className="text-2xl font-bold text-indigo-500 font-heading">
                  {totalCount > 0 ? `${Math.round((successCount / totalCount) * 100)}%` : "0%"}
                </h3>
              )}
              <p className="text-xs text-muted-foreground mt-1">{successCount} successful of {totalCount} total</p>
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden bg-gradient-to-br from-violet-500/5 via-transparent to-transparent border-violet-500/10">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <SlidersHorizontal className="w-16 h-16 text-violet-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Active Payment Methods</span>
              <span className="p-1 bg-violet-500/10 text-violet-500 rounded-lg"><SlidersHorizontal className="w-4 h-4" /></span>
            </div>
            <div className="mt-4 space-y-1">
              {isStatsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex flex-wrap gap-1 max-h-[48px] overflow-y-auto">
                  {stats.methodBreakdown.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No method data yet</span>
                  ) : (
                    stats.methodBreakdown.slice(0, 3).map((item: any) => (
                      <Badge key={item.method} variant="outline" className="text-[10px] py-0 px-1.5 border-violet-500/20 bg-violet-500/5">
                        {item.method}: {formatCurrency(item.totalAmount)}
                      </Badge>
                    ))
                  )}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground pt-1">Distribution of success payment volume</p>
            </div>
          </Card>
        </div>

        {/* Filters and List */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            {/* Search and filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoice, tx ID, tenant..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 bg-background/50 border-muted-foreground/20 focus:border-primary"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-44 bg-background/50 border-muted-foreground/20">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export and action button */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="border rounded-lg overflow-hidden bg-background/30 backdrop-blur-sm">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Invoice Number</th>
                  <th className="p-4 font-semibold">Tenant & Subscription</th>
                  <th className="p-4 font-semibold">Amount</th>
                  <th className="p-4 font-semibold">Method & Tx ID</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Paid At / Created</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isPaymentsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-28" /></td>
                      <td className="p-4"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></td>
                    </tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No payment records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4 font-medium font-heading">
                        {payment.invoiceNumber || `INV-${payment.id.slice(-6).toUpperCase()}`}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold">{payment.subscription?.tenant?.name || "N/A"}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            Plan: {payment.subscription?.plan?.name || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-bold">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">{payment.method || "N/A"}</span>
                          <span className="text-xs text-muted-foreground font-mono max-w-[140px] truncate">
                            {payment.transactionId || "No Transaction ID"}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{payment.paidAt ? `Paid: ${formatDate(payment.paidAt)}` : "Not Paid"}</span>
                          <span>Created: {formatDate(payment.createdAt)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem className="gap-2" onClick={() => openDetailsDialog(payment)}>
                              <Eye className="w-4 h-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-indigo-500 focus:text-indigo-500" onClick={() => openStatusDialog(payment)}>
                              <SlidersHorizontal className="w-4 h-4" /> Update Status
                            </DropdownMenuItem>
                            {payment.invoiceUrl && (
                              <DropdownMenuItem className="gap-2" onClick={() => window.open(payment.invoiceUrl, "_blank")}>
                                <Download className="w-4 h-4" /> Download Invoice
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isPaymentsLoading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 mt-6">
              <span className="text-xs text-muted-foreground">
                Showing Page {page} of {pagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* RECORD PAYMENT DIALOG */}
        <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Record Payment</DialogTitle>
              <DialogDescription>
                Manually record a payment against a tenant subscription.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={recordForm.handleSubmit(handleRecordPayment)} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="subscriptionId">Select Tenant / Subscription</Label>
                <Select
                  onValueChange={(val) => recordForm.setValue("subscriptionId", val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a tenant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptions.map((sub: any) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.tenant?.name} ({sub.plan?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {recordForm.formState.errors.subscriptionId && (
                  <p className="text-xs text-rose-500">{recordForm.formState.errors.subscriptionId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (INR)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...recordForm.register("amount")}
                  />
                  {recordForm.formState.errors.amount && (
                    <p className="text-xs text-rose-500">{recordForm.formState.errors.amount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method</Label>
                  <Select
                    defaultValue="BANK_TRANSFER"
                    onValueChange={(val) => recordForm.setValue("method", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="CARD">Credit/Debit Card</SelectItem>
                      <SelectItem value="NET_BANKING">Net Banking</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transactionId">Transaction ID</Label>
                  <Input
                    id="transactionId"
                    placeholder="Tx-12345..."
                    {...recordForm.register("transactionId")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Initial Status</Label>
                  <Select
                    defaultValue="PENDING"
                    onValueChange={(val) => recordForm.setValue("status", val as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="SUCCESS">Success</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number (Optional)</Label>
                  <Input
                    id="invoiceNumber"
                    placeholder="e.g. INV-1002"
                    {...recordForm.register("invoiceNumber")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paidAt">Paid At (Optional)</Label>
                  <Input
                    id="paidAt"
                    type="date"
                    {...recordForm.register("paidAt")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceUrl">Invoice Doc URL (Optional)</Label>
                <Input
                  id="invoiceUrl"
                  placeholder="https://..."
                  {...recordForm.register("invoiceUrl")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Enter comments or notes about this payment..."
                  rows={2}
                  {...recordForm.register("notes")}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsRecordOpen(false);
                    recordForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createPaymentMutation.isPending}>
                  {createPaymentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Record
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* UPDATE STATUS DIALOG */}
        <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Update Payment Status</DialogTitle>
              <DialogDescription>
                Change the status of payment and provide execution details.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={statusForm.handleSubmit(handleUpdateStatus)} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="statusSelect">Payment Status</Label>
                <Select
                  value={statusForm.watch("status")}
                  onValueChange={(val) => statusForm.setValue("status", val as any)}
                >
                  <SelectTrigger id="statusSelect">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="SUCCESS">Success</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="statusMethod">Method</Label>
                  <Select
                    value={statusForm.watch("method") || "BANK_TRANSFER"}
                    onValueChange={(val) => statusForm.setValue("method", val)}
                  >
                    <SelectTrigger id="statusMethod">
                      <SelectValue placeholder="Select Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="CARD">Credit/Debit Card</SelectItem>
                      <SelectItem value="NET_BANKING">Net Banking</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="statusTransactionId">Transaction ID</Label>
                  <Input
                    id="statusTransactionId"
                    placeholder="Tx-12345..."
                    {...statusForm.register("transactionId")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="statusPaidAt">Paid At Date</Label>
                  <Input
                    id="statusPaidAt"
                    type="date"
                    {...statusForm.register("paidAt")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="statusInvoiceUrl">Invoice URL</Label>
                  <Input
                    id="statusInvoiceUrl"
                    placeholder="https://..."
                    {...statusForm.register("invoiceUrl")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="statusNotes">Notes</Label>
                <Textarea
                  id="statusNotes"
                  placeholder="Notes about this change..."
                  rows={2}
                  {...statusForm.register("notes")}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsStatusOpen(false);
                    statusForm.reset();
                    setSelectedPayment(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateStatusMutation.isPending}>
                  {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Payment
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DETAILS DIALOG */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                Payment & Invoice Details
              </DialogTitle>
            </DialogHeader>

            {selectedPayment && (
              <div className="space-y-6 py-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h4 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Invoice Number</h4>
                    <p className="text-lg font-bold font-heading">{selectedPayment.invoiceNumber || `INV-${selectedPayment.id.slice(-6).toUpperCase()}`}</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Amount</h4>
                    <p className="text-lg font-bold text-indigo-500 font-heading">{formatCurrency(selectedPayment.amount)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                  <div>
                    <h4 className="text-xs text-muted-foreground font-semibold">Tenant Name</h4>
                    <p className="font-medium mt-0.5">{selectedPayment.subscription?.tenant?.name || "N/A"}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-muted-foreground font-semibold">Subscription Plan</h4>
                    <p className="font-medium mt-0.5">{selectedPayment.subscription?.plan?.name || "N/A"}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-muted-foreground font-semibold">Payment Status</h4>
                    <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                  </div>
                  <div>
                    <h4 className="text-xs text-muted-foreground font-semibold">Payment Method</h4>
                    <p className="font-medium mt-0.5">{selectedPayment.method || "N/A"}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-muted-foreground font-semibold">Transaction ID</h4>
                    <p className="font-mono text-xs mt-0.5 break-all bg-muted/30 p-1 rounded border">
                      {selectedPayment.transactionId || "None"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs text-muted-foreground font-semibold">Paid Date</h4>
                    <p className="font-medium mt-0.5">{formatDate(selectedPayment.paidAt)}</p>
                  </div>
                </div>

                {selectedPayment.notes && (
                  <div className="bg-muted/20 p-3 rounded-lg border">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">Notes & Comments</h4>
                    <p className="text-xs text-foreground/80 whitespace-pre-wrap">{selectedPayment.notes}</p>
                  </div>
                )}

                {selectedPayment.invoiceUrl && (
                  <Button
                    onClick={() => window.open(selectedPayment.invoiceUrl, "_blank")}
                    variant="outline"
                    className="w-full gap-2 text-xs"
                  >
                    <Download className="w-4 h-4" /> Download PDF Invoice
                  </Button>
                )}

                <DialogFooter className="border-t pt-4">
                  <Button onClick={() => setIsDetailsOpen(false)} className="w-full sm:w-auto">
                    Close Details
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
