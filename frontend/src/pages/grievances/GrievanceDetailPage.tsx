import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useGrievance,
  useChangeGrievanceStatus,
  useAssignGrievance,
  useAddGrievanceTimeline,
  useDeleteGrievance,
  getStatusInfo,
  getPriorityInfo,
  getCategoryInfo,
  STATUS_TRANSITIONS,
  TIMELINE_ACTIONS,
} from "@/hooks/useGrievances";
import { useUsers } from "@/hooks/useUsers";
import { useDepartments } from "@/hooks/useDepartments";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  User,
  Clock,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Send,
  UserPlus,
  Loader2,
  Star,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const TL_ICONS: Record<string, any> = {
  CREATED: MessageSquare,
  STATUS_CHANGE: ArrowRight,
  ASSIGNMENT: UserPlus,
  COMMENT: MessageSquare,
  INTERNAL_NOTE: MessageSquare,
  FOLLOW_UP: Phone,
  FIELD_VISIT: MapPin,
  UPDATED: Edit,
};
const TL_COLORS: Record<string, string> = {
  CREATED: "bg-blue-500",
  STATUS_CHANGE: "bg-amber-500",
  ASSIGNMENT: "bg-purple-500",
  COMMENT: "bg-gray-500",
  INTERNAL_NOTE: "bg-indigo-500",
  FOLLOW_UP: "bg-green-500",
  FIELD_VISIT: "bg-teal-500",
  UPDATED: "bg-orange-500",
};

export default function GrievanceDetailPage() {
  const [, navigate] = useLocation();
  // Get ID from state instead of params
  const id = (window.history.state as any)?.id;
  const { data: res, isLoading } = useGrievance(id);
  const statusMut = useChangeGrievanceStatus();
  const assignMut = useAssignGrievance();
  const tlMut = useAddGrievanceTimeline();
  const deleteMut = useDeleteGrievance();
  const { data: usersRes } = useUsers({ limit: 100 });
  const { data: deptsRes } = useDepartments({ isActive: "true" });
  const users = usersRes?.data?.users || [];
  const departments = deptsRes?.data || [];

  const [statusDlg, setStatusDlg] = useState(false);
  const [sf, setSf] = useState({
    status: "",
    comment: "",
    resolutionNotes: "",
    rejectionReason: "",
    escalationReason: "",
    satisfactionRating: undefined as number | undefined,
  });
  const [assignDlg, setAssignDlg] = useState(false);
  const [af, setAf] = useState({
    assignedToId: "none",
    assignedDept: "none",
    comment: "",
  });
  const [cmtText, setCmtText] = useState("");
  const [cmtType, setCmtType] = useState("COMMENT");

  const g = res?.data;

  if (isLoading)
    return (
      <MainLayout title="Grievance">
        <div className="space-y-6 max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  if (!g)
    return (
      <MainLayout title="Grievance">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <MessageSquare className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Not found</p>
          <Link to="/public-requests">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </MainLayout>
    );

  const sI = getStatusInfo(g.status);
  const pI = getPriorityInfo(g.priority);
  const cI = getCategoryInfo(g.category);
  const nextStatuses = STATUS_TRANSITIONS[g.status] || [];

  const openStatus = (status: string) => {
    setSf({
      status,
      comment: "",
      resolutionNotes: "",
      rejectionReason: "",
      escalationReason: "",
      satisfactionRating: undefined,
    });
    setStatusDlg(true);
  };
  const submitStatus = async () => {
    if (!id) return;
    try {
      await statusMut.mutateAsync({ id, data: sf });
      setStatusDlg(false);
      // Reset form after success
      setSf({
        status: "",
        comment: "",
        resolutionNotes: "",
        rejectionReason: "",
        escalationReason: "",
        satisfactionRating: undefined,
      });
    } catch (error) {
      // Error handled by hook's toast
    }
  };
  const submitAssign = async () => {
    if (!id) return;
    await assignMut.mutateAsync({
      id,
      data: {
        ...af,
        assignedToId: af.assignedToId || null,
        assignedDept: af.assignedDept || null,
      },
    });
    setAssignDlg(false);
  };
  const submitComment = async () => {
    if (!cmtText.trim() || !id) return;
    await tlMut.mutateAsync({
      id,
      data: { action: cmtType, comment: cmtText },
    });
    setCmtText("");
  };

  return (
    <MainLayout title="Request Details">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link href="/public-requests">
              <Button variant="outline" size="icon" className="h-9 w-9 mt-1 border-border/60 bg-card rounded-lg flex-shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-mono text-foreground">
                  {g.ticketNumber}
                </h1>
                <Badge className={`text-[10px] font-bold border-none ${pI.color}`}>
                  {pI.icon} {pI.label}
                </Badge>
                <Badge className={`text-[10px] font-bold border-none ${sI.color}`}>{sI.label}</Badge>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground mt-1.5">{g.subject}</h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap font-medium">
                <span className="flex items-center gap-1">
                  <span>{cI.icon}</span>
                  {cI.label}
                  {g.subcategory ? ` / ${g.subcategory}` : ""}
                </span>
                <span>
                  • {format(new Date(g.createdAt), "dd MMM yyyy, hh:mm a")}
                </span>
                <span>• {g.daysSinceCreated} days old</span>
                <span>• via {(g.source || "OFFICE").replace("_", " ")}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <PermissionGate module="grievances" action="update">
              {nextStatuses.map((ns) => {
                const nsI = getStatusInfo(ns);
                return (
                  <Button
                    key={ns}
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs border-border/60 bg-card font-bold"
                    onClick={() => openStatus(ns)}
                  >
                    <div className={`w-2 h-2 rounded-full ${nsI.dot}`} />
                    {nsI.label}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs border-border/60 bg-card font-bold"
                onClick={() => {
                  setAf({
                    assignedToId: g.assignedToId || "",
                    assignedDept: g.assignedDept || "",
                    comment: "",
                  });
                  setAssignDlg(true);
                }}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Assign
              </Button>
              <Link href="/public-requests/edit" state={{ id: g.id }}>
                <Button variant="outline" size="sm" className="gap-1 border-border/60 bg-card font-bold">
                  <Edit className="h-3.5 w-3.5 text-blue-600" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate module="grievances" action="delete">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 font-bold"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete {g.ticketNumber}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes this request.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={async () => {
                        await deleteMut.mutateAsync(g.id);
                        navigate("/public-requests");
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </PermissionGate>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Description + Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="pb-3 px-5 border-b border-border/30">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Request Description</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed font-medium">{g.description}</p>
              </CardContent>
            </Card>

            {g.resolutionNotes && (
              <Card className="border-green-500/30 bg-green-500/5 dark:bg-green-950/10 rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="pb-3 px-5 border-b border-green-500/20">
                  <CardTitle className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Resolution Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <p className="text-xs sm:text-sm text-green-800 dark:text-green-300 font-medium leading-relaxed">{g.resolutionNotes}</p>
                </CardContent>
              </Card>
            )}
            {g.rejectionReason && (
              <Card className="border-destructive/30 bg-destructive/5 dark:bg-destructive/10 rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="pb-3 px-5 border-b border-destructive/20">
                  <CardTitle className="text-xs font-bold text-destructive uppercase tracking-wider flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Rejection Reason
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <p className="text-xs sm:text-sm text-destructive dark:text-red-400 font-medium leading-relaxed">{g.rejectionReason}</p>
                </CardContent>
              </Card>
            )}
            {g.escalationReason && (
              <Card className="border-orange-500/30 bg-orange-500/5 dark:bg-orange-950/10 rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="pb-3 px-5 border-b border-orange-500/20">
                  <CardTitle className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Escalation Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <p className="text-xs sm:text-sm text-orange-800 dark:text-orange-300 font-medium leading-relaxed">{g.escalationReason}</p>
                </CardContent>
              </Card>
            )}

            {/* Add Comment */}
            <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="pb-3 px-5 border-b border-border/30">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add Update / Comment</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div className="flex gap-2">
                  <Select value={cmtType} onValueChange={setCmtType}>
                    <SelectTrigger className="w-44 h-9 text-xs rounded-xl bg-background/50 border-muted-foreground/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMELINE_ACTIONS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Textarea
                    value={cmtText}
                    onChange={(e) => setCmtText(e.target.value)}
                    placeholder="Provide detailed description of the latest update..."
                    rows={2}
                    className="flex-1 text-xs sm:text-sm bg-background/50 border-muted-foreground/20 rounded-xl"
                  />
                  <Button
                    size="sm"
                    disabled={!cmtText.trim() || tlMut.isPending}
                    onClick={submitComment}
                    className="sm:self-end gap-1.5 text-xs font-bold h-9 sm:h-auto rounded-xl px-4"
                  >
                    {tlMut.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="pb-3 px-5 border-b border-border/30">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Timeline Log ({g.timeline?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 sm:p-6">
                <div className="relative">
                  <div className="absolute left-4 top-1 bottom-1 w-px bg-border" />
                  <div className="space-y-6">
                    {(g.timeline || []).map((e: any) => {
                      const Icon = TL_ICONS[e.action] || MessageSquare;
                      const dotCol = TL_COLORS[e.action] || "bg-gray-500";
                      return (
                        <div key={e.id} className="relative flex gap-4 pl-1">
                          <div
                            className={`w-7 h-7 rounded-full ${dotCol} flex items-center justify-center z-10 flex-shrink-0 shadow-sm border border-card`}
                          >
                            <Icon className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[9px] font-bold py-0 h-5">
                                {e.action.replace("_", " ")}
                              </Badge>
                              {e.fromStatus && e.toStatus && (
                                <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                  <Badge
                                    className={`text-[8px] font-bold border-none ${getStatusInfo(e.fromStatus).color}`}
                                  >
                                    {e.fromStatus}
                                  </Badge>
                                  <span>→</span>
                                  <Badge
                                    className={`text-[8px] font-bold border-none ${getStatusInfo(e.toStatus).color}`}
                                  >
                                    {e.toStatus}
                                  </Badge>
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground font-semibold ml-auto">
                                {format(
                                  new Date(e.createdAt),
                                  "dd MMM yyyy, hh:mm a",
                                )}
                              </span>
                            </div>
                            {e.comment && (
                              <p className="text-xs sm:text-sm mt-1.5 text-foreground/80 font-medium leading-relaxed">
                                {e.comment}
                              </p>
                            )}
                            {e.changedBy && (
                              <p className="text-[10px] text-muted-foreground font-bold mt-1.5">
                                — {e.changedBy}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="pb-3 px-5 border-b border-border/30">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Complainant / Citizen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 px-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-extrabold border border-primary/20">
                    {(g.complainantName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {g.complainantName || "Unknown Citizen"}
                    </p>
                    {g.complainantPhone && (
                      <a href={`tel:${g.complainantPhone}`} className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />
                        {g.complainantPhone}
                      </a>
                    )}
                  </div>
                </div>
                {g.complainantEmail && (
                  <div className="flex items-start gap-2.5 text-xs font-semibold text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <a href={`mailto:${g.complainantEmail}`} className="text-primary hover:underline">{g.complainantEmail}</a>
                  </div>
                )}
                {g.complainantAddress && (
                  <div className="flex items-start gap-2.5 text-xs font-semibold text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-foreground/90">{g.complainantAddress}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="pb-3 px-5 border-b border-border/30">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assignment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 px-5 text-xs font-bold">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Department</span>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {g.departmentName || g.assignedDept || "Unassigned"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-0.5 border-t border-border/30 pt-2.5">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Assigned To</span>
                  <span className="text-foreground">
                    {g.assignedTo?.name || "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-t border-border/30 pt-2.5">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Created By</span>
                  <span className="text-foreground">{g.createdBy?.name || "—"}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-t border-border/30 pt-2.5">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Source Channel</span>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase">
                    {(g.source || "OFFICE").replace("_", " ")}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="pb-3 px-5 border-b border-border/30">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Timestamps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 px-5 text-xs font-bold">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Registered</span>
                  <span className="text-foreground">{format(new Date(g.createdAt), "dd MMM yyyy")}</span>
                </div>
                {g.resolvedAt && (
                  <div className="flex justify-between items-center py-0.5 border-t border-border/30 pt-2.5">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Resolved Date</span>
                    <span className="text-green-500">
                      {format(new Date(g.resolvedAt), "dd MMM yyyy")}
                    </span>
                  </div>
                )}
                {g.closedAt && (
                  <div className="flex justify-between items-center py-0.5 border-t border-border/30 pt-2.5">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Closed Date</span>
                    <span className="text-foreground">{format(new Date(g.closedAt), "dd MMM yyyy")}</span>
                  </div>
                )}
                {g.resolutionDays !== null &&
                  g.resolutionDays !== undefined && (
                    <div className="flex justify-between items-center py-0.5 border-t border-border/30 pt-2.5">
                      <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Resolution Period</span>
                      <span className="font-mono">{g.resolutionDays} days</span>
                    </div>
                  )}
                {g.satisfactionRating && (
                  <div className="flex justify-between items-center py-0.5 border-t border-border/30 pt-2.5">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Satisfaction Rating</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i <= g.satisfactionRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="pb-3 px-5 border-b border-border/30">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 px-5 text-xs font-bold">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Constituency Ward</span>
                  <Link href={`/wards/${g.ward?.id}`}>
                    <span className="text-primary hover:underline cursor-pointer font-bold">
                      #{g.ward?.wardNumber} {g.ward?.name}
                    </span>
                  </Link>
                </div>
                {g.locationAddress && (
                  <div className="flex flex-col gap-1 py-0.5 border-t border-border/30 pt-2.5">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Incident Address</span>
                    <span className="text-foreground leading-relaxed mt-0.5">
                      {g.locationAddress}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Status Dialog */}
      <Dialog open={statusDlg} onOpenChange={setStatusDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change → {getStatusInfo(sf.status).label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {sf.status === "RESOLVED" && (
              <div className="space-y-2">
                <Label>
                  Resolution Notes <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={sf.resolutionNotes}
                  onChange={(e) =>
                    setSf((p) => ({ ...p, resolutionNotes: e.target.value }))
                  }
                  placeholder="How was this resolved?"
                  rows={3}
                />
              </div>
            )}
            {sf.status === "REJECTED" && (
              <div className="space-y-2">
                <Label>
                  Rejection Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={sf.rejectionReason}
                  onChange={(e) =>
                    setSf((p) => ({ ...p, rejectionReason: e.target.value }))
                  }
                  placeholder="Why rejected?"
                  rows={3}
                />
              </div>
            )}
            {sf.status === "ESCALATED" && (
              <div className="space-y-2">
                <Label>Escalation Reason</Label>
                <Textarea
                  value={sf.escalationReason}
                  onChange={(e) =>
                    setSf((p) => ({ ...p, escalationReason: e.target.value }))
                  }
                  placeholder="Why escalating?"
                  rows={3}
                />
              </div>
            )}
            {sf.status === "CLOSED" && (
              <div className="space-y-2">
                <Label>Satisfaction Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <Button
                      key={r}
                      type="button"
                      variant="outline"
                      size="icon"
                      className={`h-9 w-9 ${(sf.satisfactionRating ?? 0) >= r ? "bg-yellow-100 border-yellow-400" : ""}`}
                      onClick={() =>
                        setSf((p) => ({ ...p, satisfactionRating: r }))
                      }
                    >
                      <Star
                        className={`h-4 w-4 ${(sf.satisfactionRating ?? 0) >= r ? "fill-yellow-400 text-yellow-400" : ""}`}
                      />
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Comment</Label>
              <Textarea
                value={sf.comment}
                onChange={(e) =>
                  setSf((p) => ({ ...p, comment: e.target.value }))
                }
                placeholder="Optional..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDlg(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitStatus}
              disabled={statusMut.isPending}
              className={sf.status === "REJECTED" ? "bg-destructive" : ""}
            >
              {statusMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDlg} onOpenChange={setAssignDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={af.assignedDept || "none"}
                onValueChange={(v) =>
                  setAf((p) => ({
                    ...p,
                    assignedDept: v === "none" ? "" : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={af.assignedToId || "none"}
                onValueChange={(v) =>
                  setAf((p) => ({
                    ...p,
                    assignedToId: v === "none" ? "" : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Unassigned —</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Input
                value={af.comment}
                onChange={(e) =>
                  setAf((p) => ({ ...p, comment: e.target.value }))
                }
                placeholder="Assignment note..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDlg(false)}>
              Cancel
            </Button>
            <Button onClick={submitAssign} disabled={assignMut.isPending}>
              {assignMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
