import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  useAppointments,
  useAppointmentStats,
  useDeleteAppointment,
  useApproveAppointment,
  useRejectAppointment,
  useRescheduleAppointment,
  useCompleteAppointment,
  useCancelAppointment,
  getStatusInfo,
  APPOINTMENT_STATUSES,
} from "@/hooks/useAppointments";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  CalendarDays,
  Plus,
  Search,
  MapPin,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  Filter,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers,
  Phone,
  Mail,
  User,
  AlertTriangle,
  Loader2,
  CalendarClock,
  Notebook,
} from "lucide-react";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = {
  MLA_MP_MEETING: "MLA/MP Meeting",
  PUBLIC_GRIEVANCE: "Public Grievance",
  OFFICE_APPOINTMENT: "Office Appointment",
  DEVELOPMENT_DISCUSSION: "Development Discussion",
  OFFICIAL_MEETING: "Official Meeting",
};

export default function AppointmentListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  // Dialog States
  const [activeAppointment, setActiveAppointment] = useState<any>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // Dialog Form States
  const [approveComment, setApproveComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rescheduleForm, setRescheduleForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
  });
  const [cancelReason, setCancelReason] = useState("");

  const { data: apptRes, isLoading } = useAppointments({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    limit: 100,
  });

  const { data: statsRes } = useAppointmentStats();
  const deleteMutation = useDeleteAppointment();
  const approveMutation = useApproveAppointment();
  const rejectMutation = useRejectAppointment();
  const rescheduleMutation = useRescheduleAppointment();
  const completeMutation = useCompleteAppointment();
  const cancelMutation = useCancelAppointment();

  const appointments = apptRes?.data || [];
  const stats = statsRes?.data || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    rescheduled: 0,
    completed: 0,
    cancelled: 0,
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const handleApprove = async () => {
    if (!activeAppointment) return;
    await approveMutation.mutateAsync({
      id: activeAppointment.id,
      payload: { comment: approveComment || null },
    });
    setApproveOpen(false);
    setApproveComment("");
    setActiveAppointment(null);
  };

  const handleReject = async () => {
    if (!activeAppointment || !rejectReason) {
      toast.error("Rejection reason is required.");
      return;
    }
    await rejectMutation.mutateAsync({
      id: activeAppointment.id,
      payload: { reason: rejectReason },
    });
    setRejectOpen(false);
    setRejectReason("");
    setActiveAppointment(null);
  };

  const handleReschedule = async () => {
    if (!activeAppointment || !rescheduleForm.date || !rescheduleForm.startTime || !rescheduleForm.endTime) {
      toast.error("All date and time fields are required.");
      return;
    }
    await rescheduleMutation.mutateAsync({
      id: activeAppointment.id,
      payload: {
        date: new Date(rescheduleForm.date).toISOString(),
        startTime: rescheduleForm.startTime,
        endTime: rescheduleForm.endTime,
      },
    });
    setRescheduleOpen(false);
    setRescheduleForm({ date: "", startTime: "", endTime: "" });
    setActiveAppointment(null);
  };

  const handleComplete = async (appt: any) => {
    if (window.confirm(`Mark appointment "${appt.title}" as completed?`)) {
      await completeMutation.mutateAsync({
        id: appt.id,
        payload: { notes: null },
      });
    }
  };

  const handleCancel = async () => {
    if (!activeAppointment || !cancelReason) {
      toast.error("Cancellation reason is required.");
      return;
    }
    await cancelMutation.mutateAsync({
      id: activeAppointment.id,
      payload: { reason: cancelReason },
    });
    setCancelOpen(false);
    setCancelReason("");
    setActiveAppointment(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this appointment? This action is permanent.")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <MainLayout title="Appointments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5 text-foreground font-heading">
              <CalendarClock className="h-7 w-7 text-primary animate-pulse" /> Appointments
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Request, schedule, and coordinate public and official appointments
            </p>
          </div>

          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <div className="inline-flex rounded-xl border border-border/60 p-1 bg-muted/30">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3 rounded-lg text-xs font-bold transition-all"
                onClick={() => setViewMode("grid")}
              >
                Grid
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3 rounded-lg text-xs font-bold transition-all"
                onClick={() => setViewMode("table")}
              >
                Table
              </Button>
            </div>
            <PermissionGate module="appointments" action="create">
              <Link href="/appointments/new">
                <Button className="gap-2 text-xs bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 font-bold rounded-xl shadow-sm h-10">
                  <Plus className="h-4 w-4" />
                  Request Appointment
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Requests", value: stats.total, icon: Layers, color: "#6366f1" },
            { label: "Pending Review", value: stats.pending, icon: Clock, color: "#f59e0b" },
            { label: "Approved / Scheduled", value: stats.approved + stats.rescheduled, icon: CalendarDays, color: "#3b82f6" },
            { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "#22c55e" },
          ].map((s, i) => (
            <Card key={i} className="transition-all duration-300 hover:shadow-md border border-border/50 bg-card hover:border-primary/20 rounded-2xl">
              <CardContent className="p-4 flex items-center gap-4">
                <div
                  className="p-3 rounded-xl border flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${s.color}12`, borderColor: `${s.color}25` }}
                >
                  <s.icon className="h-5 w-5" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                    {s.label}
                  </p>
                  <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground font-mono mt-0.5">
                    {s.value}
                  </h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search appointments by title, requester name, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background/50 border-muted-foreground/20 rounded-xl h-10 text-xs focus-visible:ring-primary/20"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-background/50 border-muted-foreground/20 rounded-xl shrink-0 text-xs h-10">
                    <Filter className="h-3.5 w-3.5 mr-2 opacity-50" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Statuses</SelectItem>
                    {APPOINTMENT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px] bg-background/50 border-muted-foreground/20 rounded-xl shrink-0 text-xs h-10">
                    <Notebook className="h-3.5 w-3.5 mr-2 opacity-50" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(search || statusFilter !== "all" || typeFilter !== "all") && (
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs h-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive font-semibold px-4">
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          </Card>
        ) : appointments.length === 0 ? (
          <Card className="border-dashed border-2 py-20 flex flex-col items-center justify-center bg-transparent rounded-3xl">
            <div className="h-20 w-20 bg-primary/5 rounded-full flex items-center justify-center mb-6 border border-primary/10">
              <CalendarClock className="h-10 w-10 text-primary/45" />
            </div>
            <h3 className="text-xl font-bold mb-2 tracking-tight text-foreground font-heading">No appointments found</h3>
            <p className="text-xs text-muted-foreground max-w-sm text-center mb-6 px-6 font-medium leading-relaxed">
              We couldn't find any appointments matching your filters. Schedule a new appointment request to get started.
            </p>
            <Button variant="outline" onClick={resetFilters} className="rounded-xl px-6 text-xs font-bold border-border/60">
              Clear All Filters
            </Button>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {appointments.map((appt: any) => {
              const statusInfo = getStatusInfo(appt.status);
              return (
                <Card
                  key={appt.id}
                  className="rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full overflow-hidden bg-card"
                >
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <Badge className={`${statusInfo.color} font-bold text-[9px] uppercase tracking-wider border px-2.5 py-0.5`}>
                        {statusInfo.label}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full -mr-2 text-muted-foreground hover:text-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                            {["PENDING", "RESCHEDULED"].includes(appt.status) && (
                              <PermissionGate module="appointments" action="approve">
                                <DropdownMenuItem
                                  className="cursor-pointer font-semibold text-xs text-green-600"
                                  onClick={() => {
                                    setActiveAppointment(appt);
                                    setApproveOpen(true);
                                  }}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                                </DropdownMenuItem>
                              </PermissionGate>
                            )}
                            {["PENDING", "RESCHEDULED"].includes(appt.status) && (
                              <PermissionGate module="appointments" action="reject">
                                <DropdownMenuItem
                                  className="cursor-pointer font-semibold text-xs text-rose-600"
                                  onClick={() => {
                                    setActiveAppointment(appt);
                                    setRejectOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-2" /> Reject
                                </DropdownMenuItem>
                              </PermissionGate>
                            )}
                            {["PENDING", "APPROVED", "RESCHEDULED"].includes(appt.status) && (
                              <PermissionGate module="appointments" action="reschedule">
                                <DropdownMenuItem
                                  className="cursor-pointer font-semibold text-xs"
                                  onClick={() => {
                                    setActiveAppointment(appt);
                                    setRescheduleForm({
                                      date: appt.date ? appt.date.split("T")[0] : "",
                                      startTime: appt.startTime || "",
                                      endTime: appt.endTime || "",
                                    });
                                    setRescheduleOpen(true);
                                  }}
                                >
                                  <CalendarDays className="h-4 w-4 mr-2 text-indigo-500" /> Reschedule
                                </DropdownMenuItem>
                              </PermissionGate>
                            )}
                            {["APPROVED", "RESCHEDULED"].includes(appt.status) && (
                              <PermissionGate module="appointments" action="complete">
                                <DropdownMenuItem
                                  className="cursor-pointer font-semibold text-xs text-green-700"
                                  onClick={() => handleComplete(appt)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> Complete
                                </DropdownMenuItem>
                              </PermissionGate>
                            )}
                            {["PENDING", "APPROVED", "RESCHEDULED"].includes(appt.status) && (
                              <PermissionGate module="appointments" action="cancel">
                                <DropdownMenuItem
                                  className="cursor-pointer font-semibold text-xs text-rose-500"
                                  onClick={() => {
                                    setActiveAppointment(appt);
                                    setCancelOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-2" /> Cancel
                                </DropdownMenuItem>
                              </PermissionGate>
                            )}
                            <PermissionGate module="appointments" action="update">
                              <DropdownMenuItem className="cursor-pointer font-semibold text-xs">
                                <Link href={`/appointments/${appt.id}/edit`}>
                                  <span className="flex items-center">
                                    <Edit className="h-4 w-4 mr-2 text-blue-600" /> Edit Details
                                  </span>
                                </Link>
                              </DropdownMenuItem>
                            </PermissionGate>
                            <PermissionGate module="appointments" action="delete">
                              <DropdownMenuItem
                                className="text-red-600 cursor-pointer font-semibold text-xs"
                                onClick={() => handleDelete(appt.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete Request
                              </DropdownMenuItem>
                            </PermissionGate>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <h3 className="font-bold text-sm text-foreground line-clamp-1 mb-0.5">
                      {appt.title}
                    </h3>
                    <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase mb-3">
                      {appt.appointmentNumber}
                    </p>

                    <div className="bg-muted/10 border rounded-xl p-3 space-y-2 mb-4">
                      <div className="flex items-center gap-1.5 text-xs text-foreground font-bold">
                        <User className="h-3.5 w-3.5 text-primary/65" />
                        <span className="truncate">{appt.requesterName}</span>
                      </div>
                      {appt.requesterPhone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground/60" />
                          <span>{appt.requesterPhone}</span>
                        </div>
                      )}
                      {appt.requesterEmail && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground/60" />
                          <span className="truncate">{appt.requesterEmail}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2 min-h-[32px] font-semibold leading-relaxed">
                      {appt.purpose || "No purpose specified."}
                    </p>

                    <div className="space-y-2.5 mt-auto pt-4 border-t border-border/30 text-xs font-bold text-foreground/80">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{format(new Date(appt.date), "dd MMM yyyy")}</span>
                        <span className="ml-auto text-muted-foreground flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" /> {appt.startTime} - {appt.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-rose-500" />
                        <span className="truncate flex-1">{appt.location || "Constituency Office"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Notebook className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <span>{TYPE_LABELS[appt.type] || appt.type}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50 bg-muted/10">
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Code</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Title</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Requester</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Date</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Time</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Type</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Status</TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appt: any) => {
                    const statusInfo = getStatusInfo(appt.status);
                    return (
                      <TableRow key={appt.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                        <TableCell className="font-mono text-xs font-bold py-4 px-4">{appt.appointmentNumber}</TableCell>
                        <TableCell className="font-bold text-xs sm:text-sm py-4 px-4 max-w-[200px] truncate">{appt.title}</TableCell>
                        <TableCell className="py-4 px-4 max-w-[200px]">
                          <div>
                            <p className="font-bold text-xs text-foreground leading-none">{appt.requesterName}</p>
                            {appt.requesterPhone && <p className="text-[10px] text-muted-foreground mt-1 font-semibold">{appt.requesterPhone}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-4 px-4 font-semibold text-muted-foreground">{format(new Date(appt.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-4 px-4 font-mono font-bold text-foreground/80">{appt.startTime} - {appt.endTime}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-4 px-4 font-bold text-muted-foreground">{TYPE_LABELS[appt.type] || appt.type}</TableCell>
                        <TableCell className="py-4 px-4">
                          <Badge className={`${statusInfo.color} rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-tight`}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-4 px-4">
                          <div className="flex justify-end gap-1.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl">
                                {["PENDING", "RESCHEDULED"].includes(appt.status) && (
                                  <PermissionGate module="appointments" action="approve">
                                    <DropdownMenuItem
                                      className="cursor-pointer font-semibold text-xs text-green-600"
                                      onClick={() => {
                                        setActiveAppointment(appt);
                                        setApproveOpen(true);
                                      }}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                                    </DropdownMenuItem>
                                  </PermissionGate>
                                )}
                                {["PENDING", "RESCHEDULED"].includes(appt.status) && (
                                  <PermissionGate module="appointments" action="reject">
                                    <DropdownMenuItem
                                      className="cursor-pointer font-semibold text-xs text-rose-600"
                                      onClick={() => {
                                        setActiveAppointment(appt);
                                        setRejectOpen(true);
                                      }}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" /> Reject
                                    </DropdownMenuItem>
                                  </PermissionGate>
                                )}
                                {["PENDING", "APPROVED", "RESCHEDULED"].includes(appt.status) && (
                                  <PermissionGate module="appointments" action="reschedule">
                                    <DropdownMenuItem
                                      className="cursor-pointer font-semibold text-xs"
                                      onClick={() => {
                                        setActiveAppointment(appt);
                                        setRescheduleForm({
                                          date: appt.date ? appt.date.split("T")[0] : "",
                                          startTime: appt.startTime || "",
                                          endTime: appt.endTime || "",
                                        });
                                        setRescheduleOpen(true);
                                      }}
                                    >
                                      <CalendarDays className="h-4 w-4 mr-2 text-indigo-500" /> Reschedule
                                    </DropdownMenuItem>
                                  </PermissionGate>
                                )}
                                {["APPROVED", "RESCHEDULED"].includes(appt.status) && (
                                  <PermissionGate module="appointments" action="complete">
                                    <DropdownMenuItem
                                      className="cursor-pointer font-semibold text-xs text-green-700"
                                      onClick={() => handleComplete(appt)}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-2" /> Complete
                                    </DropdownMenuItem>
                                  </PermissionGate>
                                )}
                                {["PENDING", "APPROVED", "RESCHEDULED"].includes(appt.status) && (
                                  <PermissionGate module="appointments" action="cancel">
                                    <DropdownMenuItem
                                      className="cursor-pointer font-semibold text-xs text-rose-500"
                                      onClick={() => {
                                        setActiveAppointment(appt);
                                        setCancelOpen(true);
                                      }}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" /> Cancel
                                    </DropdownMenuItem>
                                  </PermissionGate>
                                )}
                                <PermissionGate module="appointments" action="update">
                                  <DropdownMenuItem className="cursor-pointer font-semibold text-xs">
                                    <Link href={`/appointments/${appt.id}/edit`}>
                                      <span className="flex items-center">
                                        <Edit className="h-4 w-4 mr-2 text-blue-600" /> Edit Details
                                      </span>
                                    </Link>
                                  </DropdownMenuItem>
                                </PermissionGate>
                                <PermissionGate module="appointments" action="delete">
                                  <DropdownMenuItem
                                    className="text-red-600 cursor-pointer font-semibold text-xs"
                                    onClick={() => handleDelete(appt.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete Request
                                  </DropdownMenuItem>
                                </PermissionGate>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Appointment Request</DialogTitle>
            <DialogDescription>
              Confirm approval for this appointment request. You can optionally add a comment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Internal comment / Notes</Label>
              <Textarea
                value={approveComment}
                onChange={(e) => setApproveComment(e.target.value)}
                placeholder="e.g. Approved for meeting in VIP room"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Appointment Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this request. This will notify the requester.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rejection Reason <span className="text-destructive">*</span></Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Schedule conflict / Not appropriate agenda"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button className="bg-destructive hover:bg-destructive/95" onClick={handleReject} disabled={rejectMutation.isPending || !rejectReason}>
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time slot for this appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New Date <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={rescheduleForm.date}
                onChange={(e) => setRescheduleForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time <span className="text-destructive">*</span></Label>
                <Input
                  type="time"
                  value={rescheduleForm.startTime}
                  onChange={(e) => setRescheduleForm((p) => ({ ...p, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time <span className="text-destructive">*</span></Label>
                <Input
                  type="time"
                  value={rescheduleForm.endTime}
                  onChange={(e) => setRescheduleForm((p) => ({ ...p, endTime: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
            <Button onClick={handleReschedule} disabled={rescheduleMutation.isPending || !rescheduleForm.date || !rescheduleForm.startTime || !rescheduleForm.endTime}>
              {rescheduleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Provide a reason for cancelling this scheduled appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Cancellation Reason <span className="text-destructive">*</span></Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. MLA/MP traveling out of constituency / Emergency assembly meeting"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Cancel</Button>
            <Button className="bg-destructive hover:bg-destructive/95" onClick={handleCancel} disabled={cancelMutation.isPending || !cancelReason}>
              {cancelMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Cancel Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
