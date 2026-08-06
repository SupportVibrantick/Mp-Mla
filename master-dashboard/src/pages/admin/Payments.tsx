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
  CreditCard,
  ShieldCheck,
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
  useAdminPaymentCheckout,
} from "@/hooks/usePayments";
import { useTenantSubscriptions } from "@/hooks/useSubscriptions";
import { API_BASE_URL } from "@/lib/api";

const getInvoiceDownloadUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = API_BASE_URL.replace(/\/api$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

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

  // Razorpay Collection States
  const [paymentMode, setPaymentMode] = useState<"MANUAL" | "RAZORPAY">("RAZORPAY");
  const [selectedSubForRzp, setSelectedSubForRzp] = useState("");
  const [rzpAmount, setRzpAmount] = useState("");
  const [rzpNotes, setRzpNotes] = useState("");

  // Queries
  const { data: paymentsData, isLoading: isPaymentsLoading, refetch: refetchPayments } = usePaymentsList({
    page: String(page),
    limit: "10",
    search,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = usePaymentStats();
  const { data: subsData } = useTenantSubscriptions({ limit: "100" });

  // Mutations & Checkout Hook
  const createPaymentMutation = useCreatePayment();
  const updateStatusMutation = useUpdatePaymentStatus();
  const { initiatePayment: initiateAdminCheckout, isLoading: isRzpLoading } = useAdminPaymentCheckout();

  const handleCollectRazorpay = () => {
    if (!selectedSubForRzp) return;
    initiateAdminCheckout({
      subscriptionId: selectedSubForRzp,
      amount: rzpAmount ? Number(rzpAmount) : undefined,
      notes: rzpNotes || "Platform Admin Payment Collection",
      onSuccess: () => {
        setIsRecordOpen(false);
        refetchPayments();
        refetchStats();
      },
    });
  };

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
      case "CREATED":
        return <Badge className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/20 border-amber-500/30 gap-1"><Clock className="w-3.5 h-3.5" /> {status}</Badge>;
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6 relative overflow-hidden bg-gradient-to-br from-emerald-500/[0.03] via-card to-card border border-border/60 rounded-[28px] transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="w-16 h-16 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Total Revenue</span>
              <span className="p-2 bg-emerald-500/10 text-emerald-600 rounded-2xl"><IndianRupee className="w-4 h-4" /></span>
            </div>
            <div className="mt-4">
              {isStatsLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <h3 className="text-3xl font-extrabold text-emerald-600 font-heading tracking-tight">{formatCurrency(totalRevenue)}</h3>
              )}
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">From successfully settled payments</p>
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden bg-gradient-to-br from-amber-500/[0.03] via-card to-card border border-border/60 rounded-[28px] transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Clock className="w-16 h-16 text-amber-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Pending Volume</span>
              <span className="p-2 bg-amber-500/10 text-amber-600 rounded-2xl"><Clock className="w-4 h-4" /></span>
            </div>
            <div className="mt-4">
              {isStatsLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <h3 className="text-3xl font-extrabold text-amber-500 font-heading tracking-tight">{formatCurrency(pendingAmount)}</h3>
              )}
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Awaiting settlement or confirmation</p>
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden bg-gradient-to-br from-indigo-500/[0.03] via-card to-card border border-border/60 rounded-[28px] transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <CheckCircle className="w-16 h-16 text-indigo-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Success Rate</span>
              <span className="p-2 bg-indigo-500/10 text-indigo-600 rounded-2xl"><CheckCircle className="w-4 h-4" /></span>
            </div>
            <div className="mt-4">
              {isStatsLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <h3 className="text-3xl font-extrabold text-indigo-600 font-heading tracking-tight">
                  {totalCount > 0 ? `${Math.round((successCount / totalCount) * 100)}%` : "0%"}
                </h3>
              )}
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{successCount} successful of {totalCount} total</p>
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden bg-gradient-to-br from-violet-500/[0.03] via-card to-card border border-border/60 rounded-[28px] transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <SlidersHorizontal className="w-16 h-16 text-violet-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Payment Methods</span>
              <span className="p-2 bg-violet-500/10 text-violet-600 rounded-2xl"><SlidersHorizontal className="w-4 h-4" /></span>
            </div>
            <div className="mt-4 space-y-1">
              {isStatsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-[48px] overflow-y-auto">
                  {stats.methodBreakdown.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No method data yet</span>
                  ) : (
                    stats.methodBreakdown.slice(0, 3).map((item: any) => (
                      <Badge key={item.method} variant="outline" className="text-[10px] py-0.5 px-2 rounded-lg border-violet-500/20 bg-violet-500/5 font-semibold">
                        {item.method}: {formatCurrency(item.totalAmount)}
                      </Badge>
                    ))
                  )}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground pt-1 leading-relaxed">Distribution of success volumes</p>
            </div>
          </Card>
        </div>

        {/* Filters and List */}
        <Card className="p-6 rounded-[28px] border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            {/* Search and filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoice, tx ID, tenant..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 h-10 rounded-xl bg-background/50 border-border/60 focus-visible:ring-primary"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl bg-background/50 border-border/60">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
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
              <Button variant="outline" size="sm" className="gap-2 h-10 rounded-xl px-4 text-xs font-semibold">
                <FileSpreadsheet className="w-4 h-4" /> Export Excel
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-border/60 rounded-2xl overflow-hidden bg-background/30 backdrop-blur-sm shadow-sm">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground text-xs font-bold uppercase tracking-wider">
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
                              <DropdownMenuItem className="gap-2" onClick={() => window.open(getInvoiceDownloadUrl(payment.invoiceUrl), "_blank")}>
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

        {/* RECORD PAYMENT DIALOG (Razorpay + Manual) */}
        <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">Collect / Record Payment</DialogTitle>
              <DialogDescription>
                Choose payment collection mode: Razorpay online gateway or manual entry.
              </DialogDescription>
            </DialogHeader>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-xl mb-2">
              <Button
                type="button"
                variant={paymentMode === "RAZORPAY" ? "default" : "ghost"}
                size="sm"
                className="rounded-lg text-xs font-bold gap-1.5"
                onClick={() => setPaymentMode("RAZORPAY")}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Razorpay Online
              </Button>
              <Button
                type="button"
                variant={paymentMode === "MANUAL" ? "default" : "ghost"}
                size="sm"
                className="rounded-lg text-xs font-bold gap-1.5"
                onClick={() => setPaymentMode("MANUAL")}
              >
                <FileText className="w-3.5 h-3.5" />
                Manual Record
              </Button>
            </div>

            {paymentMode === "RAZORPAY" ? (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Select Tenant / Subscription</Label>
                  <Select onValueChange={(val) => setSelectedSubForRzp(val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a tenant subscription..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subscriptions.map((sub: any) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.tenant?.name} ({sub.plan?.name} — ₹{sub.plan?.priceMonthly}/mo)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Custom Amount (Optional - defaults to plan price)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Leave blank for standard plan amount"
                    value={rzpAmount}
                    onChange={(e) => setRzpAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes / Reason</Label>
                  <Textarea
                    placeholder="e.g. Annual renewal collected by admin"
                    rows={2}
                    value={rzpNotes}
                    onChange={(e) => setRzpNotes(e.target.value)}
                  />
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span>Opens secure Razorpay Checkout popup to collect payment directly.</span>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRecordOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCollectRazorpay}
                    disabled={!selectedSubForRzp || isRzpLoading}
                    className="bg-blue-600 hover:bg-blue-700 font-bold"
                  >
                    {isRzpLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2" />
                    )}
                    Collect via Razorpay
                  </Button>
                </DialogFooter>
              </div>
            ) : (
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
            )}
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
                    onClick={() => window.open(getInvoiceDownloadUrl(selectedPayment.invoiceUrl), "_blank")}
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
