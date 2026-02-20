import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link to="/projects">
              <Button variant="ghost" size="icon" className="h-9 w-9 mt-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl">{cI.icon}</span>
                <h1 className="text-xl font-bold">{p.name}</h1>
                <Badge className={`text-[10px] ${sI.color}`}>{sI.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">
                {p.projectCode}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                <span>{cI.label}</span>
                <span>
                  •{" "}
                  <Link to={`/wards/${p.ward?.id}`}>
                    <span className="text-primary hover:underline cursor-pointer">
                      #{p.ward?.wardNumber} {p.ward?.name}
                    </span>
                  </Link>
                </span>
                {p.departmentInfo && <span>• {p.departmentInfo.name}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PermissionGate module="projects" action="update">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewStatus(p.status);
                  setStatusDlg(true);
                }}
              >
                Change Status
              </Button>
              <Link to={`/projects/${p.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1">
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
                    className="text-destructive border-destructive/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {p.projectCode}?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive"
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
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-3">
                <p className="text-4xl font-bold">{p.completionPercent}%</p>
                <p className="text-xs text-muted-foreground">Completion</p>
              </div>
              <Progress value={p.completionPercent} className="h-3" />
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Milestones</p>
                  <p className="font-bold">
                    {p.completedMilestones}/{p.totalMilestones}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Updates</p>
                  <p className="font-bold">{p.updates?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <IndianRupee className="h-4 w-4" />
                Budget
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  label: "Sanctioned",
                  value: p.budgetSanctioned,
                  pct: 100,
                  color: "#3b82f6",
                },
                {
                  label: "Released",
                  value: p.budgetReleased,
                  pct: budgetRelease,
                  color: "#f59e0b",
                },
                {
                  label: "Utilized",
                  value: p.budgetUsed,
                  pct: budgetUtil,
                  color: "#22c55e",
                },
              ].map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="font-mono font-medium">
                      {formatBudget(b.value)}
                    </span>
                  </div>
                  <Progress value={b.pct} className="h-1.5" />
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center pt-1">
                Fund:{" "}
                <Badge variant="outline" className="text-[10px]">
                  {p.fundType}
                </Badge>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {p.contractor && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contractor</span>
                  <span>
                    {p.contractor}{" "}
                    {p.contractorPhone ? `(${p.contractorPhone})` : ""}
                  </span>
                </div>
              )}
              {p.startDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date</span>
                  <span>{format(new Date(p.startDate), "dd MMM yyyy")}</span>
                </div>
              )}
              {p.expectedEndDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected End</span>
                  <span>
                    {format(new Date(p.expectedEndDate), "dd MMM yyyy")}
                  </span>
                </div>
              )}
              {p.actualEndDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actual End</span>
                  <span className="text-green-600">
                    {format(new Date(p.actualEndDate), "dd MMM yyyy")}
                  </span>
                </div>
              )}
              {p.address && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="text-right max-w-[180px]">{p.address}</span>
                </div>
              )}
              {p.createdBy && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created By</span>
                  <span>{p.createdBy.name}</span>
                </div>
              )}
            </CardContent>
          </Card>
          {p.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{p.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Milestones */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Milestone className="h-4 w-4 text-primary" />
              Milestones ({p.milestones?.length || 0})
            </CardTitle>
            <PermissionGate module="projects" action="update">
              <Button
                size="sm"
                className="gap-1"
                onClick={() => {
                  setMsForm({ title: "", description: "", targetDate: "" });
                  setMsDlg(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </PermissionGate>
          </CardHeader>
          <CardContent>
            {p.milestones?.length > 0 ? (
              <div className="space-y-3">
                {p.milestones.map((ms: any) => (
                  <div
                    key={ms.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${ms.isCompleted ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800" : "bg-card"}`}
                  >
                    <Checkbox
                      checked={ms.isCompleted}
                      onCheckedChange={() =>
                        toggleMsMut.mutate({ id: p.id, msId: ms.id })
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium text-sm ${ms.isCompleted ? "line-through text-muted-foreground" : ""}`}
                      >
                        {ms.title}
                      </p>
                      {ms.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ms.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        {ms.targetDate && (
                          <span>
                            📅 Target:{" "}
                            {format(new Date(ms.targetDate), "dd MMM yyyy")}
                          </span>
                        )}
                        {ms.completedDate && (
                          <span className="text-green-600">
                            ✅ Done:{" "}
                            {format(new Date(ms.completedDate), "dd MMM yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <PermissionGate module="projects" action="update">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() =>
                          delMsMut.mutate({ id: p.id, msId: ms.id })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </PermissionGate>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-muted-foreground text-sm">
                No milestones yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Updates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Progress Updates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PermissionGate module="projects" action="update">
              <div className="flex gap-2">
                <Textarea
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  placeholder="Add progress update..."
                  rows={2}
                  className="flex-1 text-sm"
                />
                <Button
                  size="sm"
                  className="self-end gap-1"
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
                  Send
                </Button>
              </div>
            </PermissionGate>
            {p.updates?.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-4">
                  {p.updates.map((u: any) => (
                    <div key={u.id} className="relative flex gap-4 pl-1">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center z-10 flex-shrink-0">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-sm">{u.updateText}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          — {u.updatedBy} •{" "}
                          {format(
                            new Date(u.createdAt),
                            "dd MMM yyyy, hh:mm a",
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground text-sm">
                No updates yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Dialog */}
      <Dialog open={statusDlg} onOpenChange={setStatusDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Project Status</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {PROJECT_STATUSES.map((s) => (
              <div
                key={s.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${newStatus === s.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                onClick={() => setNewStatus(s.value)}
              >
                <div className={`w-3 h-3 rounded-full ${s.dot}`} />
                <span className="font-medium text-sm">{s.label}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDlg(false)}>
              Cancel
            </Button>
            <Button
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={msForm.title}
                onChange={(e) =>
                  setMsForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="e.g. Foundation Complete"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={msForm.description}
                onChange={(e) =>
                  setMsForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Details..."
              />
            </div>
            <div className="space-y-2">
              <Label>Target Date</Label>
              <Input
                type="date"
                value={msForm.targetDate}
                onChange={(e) =>
                  setMsForm((p) => ({ ...p, targetDate: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMsDlg(false)}>
              Cancel
            </Button>
            <Button
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
