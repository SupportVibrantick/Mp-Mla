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
          <Link to="/grievances">
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
    <MainLayout title="Grievance">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link to="/grievances">
              <Button variant="ghost" size="icon" className="h-9 w-9 mt-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold font-mono">
                  {g.ticketNumber}
                </h1>
                <Badge className={`text-[10px] ${pI.color}`}>
                  {pI.icon} {pI.label}
                </Badge>
                <Badge className={`text-[10px] ${sI.color}`}>{sI.label}</Badge>
              </div>
              <h2 className="text-lg font-semibold mt-1">{g.subject}</h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                <span>
                  {cI.icon} {cI.label}
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
          <div className="flex gap-2 flex-wrap">
            <PermissionGate module="grievances" action="update">
              {nextStatuses.map((ns) => {
                const nsI = getStatusInfo(ns);
                return (
                  <Button
                    key={ns}
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
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
                className="gap-1 text-xs"
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
              <Link to="/grievances/edit" state={{ id: g.id }}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Edit className="h-3.5 w-3.5" />
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
                    className="gap-1 text-destructive border-destructive/30"
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
                      This permanently removes this grievance.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive"
                      onClick={async () => {
                        await deleteMut.mutateAsync(g.id);
                        navigate("/grievances");
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
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{g.description}</p>
              </CardContent>
            </Card>

            {g.resolutionNotes && (
              <Card className="border-green-200 dark:border-green-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Resolution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{g.resolutionNotes}</p>
                </CardContent>
              </Card>
            )}
            {g.rejectionReason && (
              <Card className="border-red-200 dark:border-red-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
                    <XCircle className="h-4 w-4" />
                    Rejection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{g.rejectionReason}</p>
                </CardContent>
              </Card>
            )}
            {g.escalationReason && (
              <Card className="border-orange-200 dark:border-orange-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <AlertTriangle className="h-4 w-4" />
                    Escalation Reason
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{g.escalationReason}</p>
                </CardContent>
              </Card>
            )}

            {/* Add Comment */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Add Comment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-2">
                  <Select value={cmtType} onValueChange={setCmtType}>
                    <SelectTrigger className="w-44 h-8 text-xs">
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
                <div className="flex gap-2">
                  <Textarea
                    value={cmtText}
                    onChange={(e) => setCmtText(e.target.value)}
                    placeholder="Type comment..."
                    rows={2}
                    className="flex-1 text-sm"
                  />
                  <Button
                    size="sm"
                    disabled={!cmtText.trim() || tlMut.isPending}
                    onClick={submitComment}
                    className="self-end gap-1"
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Timeline ({g.timeline?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {(g.timeline || []).map((e: any) => {
                      const Icon = TL_ICONS[e.action] || MessageSquare;
                      const dotCol = TL_COLORS[e.action] || "bg-gray-500";
                      return (
                        <div key={e.id} className="relative flex gap-4 pl-1">
                          <div
                            className={`w-8 h-8 rounded-full ${dotCol} flex items-center justify-center z-10 flex-shrink-0`}
                          >
                            <Icon className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0 pb-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[9px]">
                                {e.action.replace("_", " ")}
                              </Badge>
                              {e.fromStatus && e.toStatus && (
                                <span className="text-[10px]">
                                  <Badge
                                    className={`text-[8px] ${getStatusInfo(e.fromStatus).color}`}
                                  >
                                    {e.fromStatus}
                                  </Badge>
                                  <span className="mx-1">→</span>
                                  <Badge
                                    className={`text-[8px] ${getStatusInfo(e.toStatus).color}`}
                                  >
                                    {e.toStatus}
                                  </Badge>
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {format(
                                  new Date(e.createdAt),
                                  "dd MMM, hh:mm a",
                                )}
                              </span>
                            </div>
                            {e.comment && (
                              <p className="text-sm mt-1 text-foreground/80">
                                {e.comment}
                              </p>
                            )}
                            {e.changedBy && (
                              <p className="text-[10px] text-muted-foreground mt-1">
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
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Complainant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">
                    {(g.complainantName || "?").charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">
                      {g.complainantName || "Unknown"}
                    </p>
                    {g.complainantPhone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {g.complainantPhone}
                      </p>
                    )}
                  </div>
                </div>
                {g.complainantEmail && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {g.complainantEmail}
                  </p>
                )}
                {g.complainantAddress && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {g.complainantAddress}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">
                    {g.departmentName || g.assignedDept || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned To</span>
                  <span className="font-medium">
                    {g.assignedTo?.name || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created By</span>
                  <span>{g.createdBy?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span>{(g.source || "OFFICE").replace("_", " ")}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(new Date(g.createdAt), "dd MMM yyyy")}</span>
                </div>
                {g.resolvedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolved</span>
                    <span className="text-green-600">
                      {format(new Date(g.resolvedAt), "dd MMM yyyy")}
                    </span>
                  </div>
                )}
                {g.closedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Closed</span>
                    <span>{format(new Date(g.closedAt), "dd MMM yyyy")}</span>
                  </div>
                )}
                {g.resolutionDays !== null &&
                  g.resolutionDays !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Resolution Time
                      </span>
                      <span className="font-mono">{g.resolutionDays} days</span>
                    </div>
                  )}
                {g.satisfactionRating && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Rating</span>
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

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ward</span>
                  <Link to={`/wards/${g.ward?.id}`}>
                    <span className="text-primary hover:underline cursor-pointer">
                      #{g.ward?.wardNumber} {g.ward?.name}
                    </span>
                  </Link>
                </div>
                {g.locationAddress && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address</span>
                    <span className="text-right max-w-[140px]">
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
            <DialogTitle>Assign Grievance</DialogTitle>
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
