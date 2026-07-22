import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  useProject,
  useChangeProjectStatus,
  useAddMilestone,
  useToggleMilestone,
  useDeleteMilestone,
  useAddProjectUpdate,
  useDeleteProject,
  getStatusInfo,
  getCategoryInfo,
  formatBudget,
  PROJECT_STATUSES,
} from "@/hooks/useProjects";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
  FolderKanban,
  MapPin,
  Phone,
  Calendar,
  IndianRupee,
  Milestone,
  Plus,
  Send,
  Loader2,
  User,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { format } from "date-fns";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: res, isLoading } = useProject(id);
  const statusMut = useChangeProjectStatus();
  const addMsMut = useAddMilestone();
  const toggleMsMut = useToggleMilestone();
  const delMsMut = useDeleteMilestone();
  const addUpdateMut = useAddProjectUpdate();
  const deleteMut = useDeleteProject();

  const [statusDlg, setStatusDlg] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [msDlg, setMsDlg] = useState(false);
  const [msForm, setMsForm] = useState({
    title: "",
    description: "",
    targetDate: "",
  });

  const [updateText, setUpdateText] = useState("");

  const p = res?.data;
  if (isLoading)
    return (
      <MainLayout title="Project">
        <div className="space-y-6 max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  if (!p)
    return (
      <MainLayout title="Project">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <FolderKanban className="h-12 w-12 text-muted-foreground" />
          <p>Not found</p>
          <Link to="/projects">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </MainLayout>
    );

  const sI = getStatusInfo(p.status);
  const cI = getCategoryInfo(p.category);
  const budgetUtil =
    p.budgetSanctioned > 0
      ? Math.round((p.budgetUsed / p.budgetSanctioned) * 100)
      : 0;
  const budgetRelease =
    p.budgetSanctioned > 0
      ? Math.round((p.budgetReleased / p.budgetSanctioned) * 100)
      : 0;

  return (
    <MainLayout title="Project">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
          <div className="flex items-start gap-4">
            <Link href="/projects">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted border-border/60 shadow-sm shrink-0">
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-3xl">{cI.icon}</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{p.name}</h1>
                <Badge className={cn("text-[10px] sm:text-xs font-semibold border shadow-none", sI.color)}>{sI.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {p.projectCode}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap font-medium">
                <span className="bg-muted px-2 py-0.5 rounded border text-[11px] font-semibold text-muted-foreground">{cI.label}</span>
                <span>•</span>
                <Link href={`/wards/${p.ward?.id}`}>
                  <span className="text-primary hover:underline cursor-pointer font-bold">
                    Ward #{p.ward?.wardNumber} - {p.ward?.name}
                  </span>
                </Link>
                {p.departmentInfo && (
                  <>
                    <span>•</span>
                    <span className="text-foreground font-semibold">{p.departmentInfo.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <PermissionGate module="projects" action="update">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs font-semibold border-border/60 hover:bg-muted shadow-sm"
                onClick={() => {
                  setNewStatus(p.status);
                  setStatusDlg(true);
                }}
              >
                Change Status
              </Button>
              <Link to={`/projects/${p.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs font-semibold border-border/60 hover:bg-muted shadow-sm">
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate module="projects" action="delete">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10 h-9 px-3 shadow-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-extrabold text-foreground">Delete Project {p.projectCode}?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2 sm:gap-0">
                    <AlertDialogCancel className="border-border/60 hover:bg-muted">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
                      onClick={async () => {
                        await deleteMut.mutateAsync(p.id);
                        navigate("/projects");
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

        {/* Progress + Budget */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-2 bg-muted/20 rounded-xl border border-border/30">
                <p className="text-4xl font-extrabold text-foreground tracking-tight">{p.completionPercent}%</p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-0.5">Completion Status</p>
              </div>
              <Progress value={p.completionPercent} className="h-2.5" />
              <div className="grid grid-cols-2 gap-4 text-sm font-semibold">
                <div className="p-3 bg-card border border-border/50 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Milestones</p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {p.completedMilestones} <span className="text-xs text-muted-foreground">of</span> {p.totalMilestones}
                  </p>
                </div>
                <div className="p-3 bg-card border border-border/50 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Updates</p>
                  <p className="text-lg font-bold text-foreground mt-1">{p.updates?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <IndianRupee className="h-4 w-4 text-emerald-500" />
                Budget Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: "Sanctioned Budget",
                  value: p.budgetSanctioned,
                  pct: 100,
                  color: "#3b82f6",
                  bgClass: "bg-blue-500",
                },
                {
                  label: "Released Funds",
                  value: p.budgetReleased,
                  pct: budgetRelease,
                  color: "#f59e0b",
                  bgClass: "bg-amber-500",
                },
                {
                  label: "Utilized Funds",
                  value: p.budgetUsed,
                  pct: budgetUtil,
                  color: "#22c55e",
                  bgClass: "bg-emerald-500",
                },
              ].map((b) => (
                <div key={b.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="font-mono text-foreground font-bold">
                      {formatBudget(b.value)} {b.label !== "Sanctioned Budget" && `(${b.pct}%)`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", b.bgClass)} style={{ width: `${b.pct}%` }} />
                  </div>
                </div>
              ))}
              <div className="text-center pt-2 border-t border-border/30">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fund Type: </span>
                <Badge variant="outline" className="text-[10px] font-semibold border-border/80">
                  {p.fundType}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border border-border/50 bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Project Specification</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30 text-xs sm:text-sm font-semibold">
                {p.contractor && (
                  <div className="flex justify-between px-6 py-3.5">
                    <span className="text-muted-foreground">Contractor</span>
                    <span className="text-foreground">
                      {p.contractor}{" "}
                      {p.contractorPhone ? `(${p.contractorPhone})` : ""}
                    </span>
                  </div>
                )}
                {p.startDate && (
                  <div className="flex justify-between px-6 py-3.5">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="text-foreground">{format(new Date(p.startDate), "dd MMM yyyy")}</span>
                  </div>
                )}
                {p.expectedEndDate && (
                  <div className="flex justify-between px-6 py-3.5">
                    <span className="text-muted-foreground">Expected End</span>
                    <span className="text-foreground">
                      {format(new Date(p.expectedEndDate), "dd MMM yyyy")}
                    </span>
                  </div>
                )}
                {p.actualEndDate && (
                  <div className="flex justify-between px-6 py-3.5">
                    <span className="text-muted-foreground">Actual End</span>
                    <span className="text-emerald-600 font-bold">
                      {format(new Date(p.actualEndDate), "dd MMM yyyy")}
                    </span>
                  </div>
                )}
                {p.address && (
                  <div className="flex justify-between px-6 py-3.5">
                    <span className="text-muted-foreground">Location</span>
                    <span className="text-right text-foreground max-w-[200px] truncate">{p.address}</span>
                  </div>
                )}
                {p.createdBy && (
                  <div className="flex justify-between px-6 py-3.5">
                    <span className="text-muted-foreground">Created By</span>
                    <span className="text-foreground">{p.createdBy.name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {p.description && (
            <Card className="md:col-span-1 border border-border/50 bg-card rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-medium">{p.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Milestones */}
        <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/30">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
              <Milestone className="h-4 w-4 text-primary animate-pulse" />
              Milestones ({p.milestones?.length || 0})
            </CardTitle>
            <PermissionGate module="projects" action="update">
              <Button
                size="sm"
                className="gap-1 bg-primary hover:bg-primary/95 text-white h-8 px-3 rounded-lg text-xs"
                onClick={() => {
                  setMsForm({ title: "", description: "", targetDate: "" });
                  setMsDlg(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Milestone
              </Button>
            </PermissionGate>
          </CardHeader>
          <CardContent className="pt-4 px-3 sm:px-6">
            {p.milestones?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {p.milestones.map((ms: any) => (
                  <div
                    key={ms.id}
                    className={cn(
                      "flex items-start justify-between gap-3 p-4 rounded-xl border transition-all duration-200 shadow-sm",
                      ms.isCompleted 
                        ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800" 
                        : "bg-card border-border/50 hover:border-primary/20 hover:shadow-md"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={ms.isCompleted}
                        onCheckedChange={() =>
                          toggleMsMut.mutate({ id: p.id, msId: ms.id })
                        }
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "font-bold text-sm text-foreground",
                            ms.isCompleted && "line-through text-muted-foreground"
                          )}
                        >
                          {ms.title}
                        </p>
                        {ms.description && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {ms.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] font-semibold text-muted-foreground">
                          {ms.targetDate && (
                            <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded border border-border/40">
                              📅 Target: {format(new Date(ms.targetDate), "dd MMM yyyy")}
                            </span>
                          )}
                          {ms.completedDate && (
                            <span className="flex items-center gap-1 bg-emerald-100/50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200/30">
                              ✅ Done: {format(new Date(ms.completedDate), "dd MMM yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <PermissionGate module="projects" action="update">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() =>
                          delMsMut.mutate({ id: p.id, msId: ms.id })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </PermissionGate>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-xs font-semibold border border-dashed rounded-xl">
                No milestones added yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Updates */}
        <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-sm sm:text-base font-bold">Progress Updates & Timeline</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-3 sm:px-6 space-y-6">
            <PermissionGate module="projects" action="update">
              <div className="flex gap-3 items-start bg-muted/15 p-4 border border-border/40 rounded-xl shadow-inner">
                <Textarea
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  placeholder="Type a progress update or notes here..."
                  rows={2}
                  className="flex-1 text-sm bg-background border-border/60 focus-visible:ring-primary/20"
                />
                <Button
                  size="sm"
                  className="self-end gap-1.5 bg-primary hover:bg-primary/95 text-white h-9 px-4 font-semibold"
                  disabled={!updateText.trim() || addUpdateMut.isPending}
                  onClick={async () => {
                    await addUpdateMut.mutateAsync({
                      id: p.id,
                      data: { updateText },
                    });
                    setUpdateText("");
                  }}
                >
                  {addUpdateMut.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Post Update
                </Button>
              </div>
            </PermissionGate>
            {p.updates?.length > 0 ? (
              <div className="relative pt-2">
                <div className="space-y-4">
                  {p.updates.map((u: any, idx: number) => (
                    <div key={u.id} className="relative flex gap-4 pl-1 group">
                      {idx !== p.updates.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border group-hover:bg-primary/20 transition-colors" />
                      )}
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center z-10 flex-shrink-0 shadow-sm">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 pb-6 border-b border-border/30 last:border-none">
                        <div className="bg-muted/30 p-3.5 rounded-xl border border-border/50 shadow-sm mt-0.5 hover:shadow-md transition-shadow">
                          <p className="text-xs sm:text-sm text-foreground leading-relaxed font-medium whitespace-pre-wrap">{u.updateText}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 font-bold px-1 flex items-center gap-1.5">
                          <span>— {u.updatedBy}</span>
                          <span>•</span>
                          <span>{format(new Date(u.createdAt), "dd MMM yyyy, hh:mm a")}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-xs font-semibold border border-dashed rounded-xl">
                No updates posted yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Dialog */}
      <Dialog open={statusDlg} onOpenChange={setStatusDlg}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Change Project Status</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2.5">
            {PROJECT_STATUSES.map((s) => (
              <div
                key={s.value}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200",
                  newStatus === s.value 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "hover:bg-muted/40 border-border/50"
                )}
                onClick={() => setNewStatus(s.value)}
              >
                <div className={cn("w-2.5 h-2.5 rounded-full", s.dot)} />
                <span className="font-semibold text-sm text-foreground">{s.label}</span>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="border-border/60 hover:bg-muted" onClick={() => setStatusDlg(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/95 text-white"
              disabled={statusMut.isPending}
              onClick={async () => {
                await statusMut.mutateAsync({
                  id: p.id,
                  data: { status: newStatus },
                });
                setStatusDlg(false);
              }}
            >
              {statusMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Milestone Dialog */}
      <Dialog open={msDlg} onOpenChange={setMsDlg}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={msForm.title}
                onChange={(e) =>
                  setMsForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="e.g. Foundation Complete"
                className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
              <Input
                value={msForm.description}
                onChange={(e) =>
                  setMsForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Details..."
                className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Date</Label>
              <Input
                type="date"
                value={msForm.targetDate}
                onChange={(e) =>
                  setMsForm((p) => ({ ...p, targetDate: e.target.value }))
                }
                className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="border-border/60 hover:bg-muted" onClick={() => setMsDlg(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/95 text-white"
              disabled={addMsMut.isPending || !msForm.title}
              onClick={async () => {
                await addMsMut.mutateAsync({
                  id: p.id,
                  data: {
                    ...msForm,
                    targetDate: msForm.targetDate
                      ? new Date(msForm.targetDate).toISOString()
                      : undefined,
                  },
                });
                setMsDlg(false);
              }}
            >
              {addMsMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
