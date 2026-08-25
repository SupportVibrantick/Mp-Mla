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
  useUpdateMilestone,
  useProjectAttachments,
  useAddProjectAttachment,
  useProjectTimeline,
  useUpdateProject,
  useDeleteProjectAttachment,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
  FileCheck,
  History,
  Map,
  Paperclip,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import { useTasks } from "@/hooks/useTasks";

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

  const updateMsMut = useUpdateMilestone();
  const { data: attachmentsRes, isLoading: isLoadingAttachments } = useProjectAttachments(id);
  const addAttachmentMut = useAddProjectAttachment();
  const deleteAttachmentMut = useDeleteProjectAttachment();
  const { data: timelineRes, isLoading: isLoadingTimeline } = useProjectTimeline(id);
  const { data: tasksRes, isLoading: isLoadingTasks } = useTasks({ projectId: id, limit: 100 });
  const projectTasks = tasksRes?.data || [];
  const updateProjectMut = useUpdateProject();

  const [statusDlg, setStatusDlg] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusComment, setStatusComment] = useState("");
  
  const [msDlg, setMsDlg] = useState(false);
  const [msForm, setMsForm] = useState({
    title: "",
    description: "",
    targetDate: "",
  });

  const [editMsDlg, setEditMsDlg] = useState(false);
  const [editingMs, setEditingMs] = useState<any>(null);

  const [attachmentDlg, setAttachmentDlg] = useState(false);
  const [attachmentForm, setAttachmentForm] = useState({
    fileName: "",
    classification: "OTHER",
    fileUrl: "",
    fileSize: "150",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [overrideProgressDlg, setOverrideProgressDlg] = useState(false);
  const [overrideProgressValue, setOverrideProgressValue] = useState<number>(0);

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

  // Timeline delay status calculation
  let delayStatus = "🟢 On Track";
  let delayColor = "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/30";
  if (p.status === "COMPLETED") {
    delayStatus = "✓ Completed";
    delayColor = "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/30";
  } else if (p.status === "CANCELLED") {
    delayStatus = "🔴 Cancelled";
    delayColor = "bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200/30";
  } else if (p.expectedEndDate) {
    const expected = new Date(p.expectedEndDate);
    const today = new Date();
    expected.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (today > expected) {
      const delayDays = Math.ceil((today.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
      delayStatus = `🔴 Delayed by ${delayDays} days`;
      delayColor = "bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200/30";
    } else {
      const diffDays = Math.ceil((expected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        delayStatus = `🟡 Due soon (${diffDays} days left)`;
        delayColor = "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200/30";
      }
    }
  }

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
                <Badge className={cn("text-[10px] sm:text-xs font-semibold border shadow-none", delayColor)}>{delayStatus}</Badge>
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
                {p.department && (
                  <>
                    <span>•</span>
                    <Link href={`/departments/${p.department.id}`}>
                      <span className="text-primary hover:underline cursor-pointer font-bold">
                        {p.department.name}
                      </span>
                    </Link>
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
                  setStatusComment("");
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
              <div className="text-center py-2 bg-muted/20 rounded-xl border border-border/30 relative group">
                <p className="text-4xl font-extrabold text-foreground tracking-tight">{p.completionPercent}%</p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-0.5">Completion Status</p>
                <PermissionGate module="projects" action="update">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => {
                      setOverrideProgressValue(p.completionPercent);
                      setOverrideProgressDlg(true);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </PermissionGate>
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
                      {p.contractorPhone ? (
                        <a href={`tel:${p.contractorPhone}`} className="text-primary hover:underline font-bold ml-1">
                          ({p.contractorPhone})
                        </a>
                      ) : ""}
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
          
          <div className="md:col-span-1 space-y-6">
            {p.description && (
              <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-medium">{p.description}</p>
                </CardContent>
              </Card>
            )}

            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" /> Location & Geo-Tagging
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2 text-xs font-semibold">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Address</span>
                    <span className="text-right text-foreground font-bold truncate max-w-[150px]">{p.address || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Latitude</span>
                    <span className="font-mono text-foreground font-bold">{p.latitude ? p.latitude.toFixed(5) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Longitude</span>
                    <span className="font-mono text-foreground font-bold">{p.longitude ? p.longitude.toFixed(5) : "—"}</span>
                  </div>
                </div>

                {/* Visual Mock Map */}
                <div className="relative h-28 w-full bg-muted/40 rounded-xl border border-border/50 overflow-hidden flex items-center justify-center group mt-2">
                  <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
                  <div className="absolute h-8 w-8 rounded-full bg-primary/10 border border-primary/20 animate-ping" />
                  <div className="relative z-10 p-2.5 rounded-full bg-primary text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span className="absolute bottom-2 right-2 text-[9px] font-mono font-bold text-muted-foreground bg-background/85 backdrop-blur-sm px-1.5 py-0.5 rounded border border-border/40">
                    {p.latitude && p.longitude ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}` : "No Coordinates"}
                  </span>
                </div>

                {p.latitude && p.longitude && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full mt-2 block"
                  >
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs font-bold border-border/60 hover:bg-muted h-9 shadow-sm">
                      <ExternalLink className="h-3.5 w-3.5" /> View on Google Maps
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
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
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => {
                            setEditingMs(ms);
                            setEditMsDlg(true);
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            delMsMut.mutate({ id: p.id, msId: ms.id })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

        {/* Financial Transactions History */}
        <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
              <IndianRupee className="h-4 w-4 text-emerald-500" />
              Financial Transactions History
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-3 sm:px-6">
            {p.fundTransactions && p.fundTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/30 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                      <TableHead className="py-2.5">Date</TableHead>
                      <TableHead className="py-2.5">Transaction Type</TableHead>
                      <TableHead className="py-2.5">Fund</TableHead>
                      <TableHead className="py-2.5">Amount</TableHead>
                      <TableHead className="py-2.5">Description/Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {p.fundTransactions.map((tx: any) => (
                      <TableRow key={tx.id} className="hover:bg-muted/5 border-b border-border/30 text-xs">
                        <TableCell className="font-semibold text-muted-foreground">
                          {format(new Date(tx.date || tx.createdAt), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-[9px] font-bold border shadow-none",
                              tx.type === "ALLOCATION" && "bg-blue-100/50 text-blue-700 border-blue-200/30",
                              tx.type === "RELEASE" && "bg-amber-100/50 text-amber-700 border-amber-200/30",
                              tx.type === "UTILIZATION" && "bg-emerald-100/50 text-emerald-700 border-emerald-200/30"
                            )}
                          >
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tx.fund ? (
                            <Link href={`/funds/${tx.fund.id}`}>
                              <Badge
                                variant="outline"
                                className="text-[9px] font-bold cursor-pointer hover:bg-muted"
                              >
                                {tx.fund.fundType} FY {tx.fund.financialYear}
                              </Badge>
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground">
                          {formatBudget(tx.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-medium max-w-xs truncate">
                          {tx.description || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center py-6 text-muted-foreground text-xs font-semibold border border-dashed rounded-xl my-2">
                No financial transactions recorded for this project
              </p>
            )}
          </CardContent>
        </Card>

        {/* Project Sub-Resources Tabbed Sections */}
        <Card className="border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden">
          <Tabs defaultValue="attachments" className="w-full">
            <div className="bg-muted/30 border-b border-border/30 px-6 py-2">
              <TabsList className="bg-transparent gap-2 p-0 h-auto justify-start border-none">
                <TabsTrigger
                  value="attachments"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2 pt-1 font-bold text-xs gap-1.5 shadow-none"
                >
                  <Paperclip className="h-3.5 w-3.5" /> Project Documents & Evidence
                </TabsTrigger>
                <TabsTrigger
                  value="updates"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2 pt-1 font-bold text-xs gap-1.5 shadow-none"
                >
                  <Send className="h-3.5 w-3.5" /> Progress Updates Log ({p.updates?.length || 0})
                </TabsTrigger>
                 <TabsTrigger
                  value="timeline"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2 pt-1 font-bold text-xs gap-1.5 shadow-none"
                >
                  <History className="h-3.5 w-3.5" /> Project Audit Trail
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2 pt-1 font-bold text-xs gap-1.5 shadow-none"
                >
                  <ClipboardList className="h-3.5 w-3.5" /> Project Tasks ({projectTasks.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Attachments Tab */}
            <TabsContent value="attachments" className="p-6 m-0 focus-visible:outline-none">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Project Evidence & Documents</h3>
                  <p className="text-[11px] text-muted-foreground">Upload sanction letters, estimates, contractor agreements, and progress photos</p>
                </div>
                <PermissionGate module="projects" action="update">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg h-8"
                    onClick={() => {
                      setAttachmentForm({
                        fileName: "",
                        classification: "OTHER",
                        fileUrl: "",
                        fileSize: "150",
                      });
                      setSelectedFile(null);
                      setAttachmentDlg(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Document / Photo
                  </Button>
                </PermissionGate>
              </div>

              {isLoadingAttachments ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (attachmentsRes?.data || []).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(attachmentsRes?.data || []).map((att: any) => {
                    const isPhoto = att.classification.endsWith("PHOTO");
                    return (
                      <Card key={att.id} className="border border-border/50 bg-card rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between h-full min-h-[140px]">
                        <div className="p-3.5 flex gap-3 items-start">
                          <div className={cn("p-2 rounded-lg shrink-0", isPhoto ? "bg-amber-100/50 text-amber-700" : "bg-blue-100/50 text-blue-700")}>
                            {isPhoto ? (
                              <ImageIcon className="h-5 w-5" />
                            ) : (
                              <FileText className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">{att.fileName}</p>
                            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mt-0.5">
                              {att.classification.replace("_", " ")}
                            </p>
                            {att.fileSize && (
                              <p className="text-[9px] text-muted-foreground mt-0.5 font-semibold">Size: {att.fileSize} KB</p>
                            )}
                          </div>
                        </div>
                        <div className="bg-muted/10 border-t border-border/30 px-3.5 py-2 flex items-center justify-between gap-2 shrink-0">
                          <span className="text-[9px] font-semibold text-muted-foreground">Uploaded {format(new Date(att.createdAt), "dd MMM yy")}</span>
                          <div className="flex items-center gap-1.5">
                            <a href={att.fileUrl} target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                            <PermissionGate module="projects" action="update">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() =>
                                  deleteAttachmentMut.mutate({ id: p.id, attachmentId: att.id })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </PermissionGate>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-10 text-muted-foreground text-xs font-semibold border border-dashed rounded-xl my-2">
                  No documents or photos uploaded yet. Click "Add Document / Photo" to upload.
                </p>
              )}
            </TabsContent>

            {/* Updates Tab */}
            <TabsContent value="updates" className="p-6 m-0 focus-visible:outline-none space-y-6">
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
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="p-6 m-0 focus-visible:outline-none">
              {isLoadingTimeline ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (timelineRes?.data || []).length > 0 ? (
                <div className="relative border-l border-border/60 ml-4 pl-6 space-y-6">
                  {(timelineRes?.data || []).map((t: any) => {
                    const statusColors: Record<string, string> = {
                      CREATED: "bg-blue-500",
                      STATUS_CHANGE: "bg-amber-500",
                      MILESTONE_COMPLETE: "bg-green-500",
                      MILESTONE_UPDATE: "bg-blue-400",
                      ATTACHMENT_UPLOAD: "bg-indigo-500",
                    };
                    return (
                      <div key={t.id} className="relative">
                        <div className={cn("absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-background", statusColors[t.action] || "bg-muted-foreground")} />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground leading-relaxed">{t.comment}</p>
                          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                            <span>{t.action}</span>
                            <span>•</span>
                            <span>{format(new Date(t.createdAt), "dd MMM yyyy, hh:mm a")}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-10 text-muted-foreground text-xs font-semibold border border-dashed rounded-xl my-2">
                  No audit trail records found.
                </p>
              )}
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="p-6 m-0 focus-visible:outline-none">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Project Tasks</h3>
                  <p className="text-[11px] text-muted-foreground">Manage and track implementation tasks assigned to departments and officers</p>
                </div>
                <PermissionGate module="tasks" action="create">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg h-8"
                    onClick={() => {
                      navigate("/tasks", {
                        state: {
                          openCreate: true,
                          projectId: p.id,
                          departmentId: p.departmentId || "",
                        },
                      });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Create Task
                  </Button>
                </PermissionGate>
              </div>

              {isLoadingTasks ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : projectTasks.length > 0 ? (
                <div className="overflow-x-auto border border-border/50 rounded-xl bg-card/50">
                  <Table>
                    <TableHeader className="bg-muted/15">
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="h-10 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Task Code</TableHead>
                        <TableHead className="h-10 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Title</TableHead>
                        <TableHead className="h-10 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Assignee</TableHead>
                        <TableHead className="h-10 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Priority</TableHead>
                        <TableHead className="h-10 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Status</TableHead>
                        <TableHead className="h-10 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectTasks.map((t: any) => (
                        <TableRow key={t.id} className="hover:bg-muted/10 transition-colors border-b border-border/30 last:border-none">
                          <TableCell className="font-mono text-xs font-bold py-3">{t.taskCode}</TableCell>
                          <TableCell className="font-semibold text-xs py-3 max-w-[250px] truncate">{t.title}</TableCell>
                          <TableCell className="py-3">
                            <span className="text-xs font-bold text-foreground">{t.assignedTo?.name || "Unassigned"}</span>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              t.priority === "URGENT" ? "bg-rose-100 text-rose-800 border-rose-200" :
                              t.priority === "HIGH" ? "bg-orange-100 text-orange-800 border-orange-200" :
                              t.priority === "MEDIUM" ? "bg-blue-100 text-blue-800 border-blue-200" :
                              "bg-gray-100 text-gray-800 border-gray-200"
                            }`}>
                              {t.priority}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              t.status === "COMPLETED" ? "bg-green-100 text-green-800 border-green-200" :
                              t.status === "CANCELLED" ? "bg-gray-100 text-gray-800 border-gray-200" :
                              t.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800 border-blue-200" :
                              "bg-yellow-100 text-yellow-800 border-yellow-200"
                            }`}>
                              {t.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <Link href="/tasks">
                              <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-primary hover:underline">
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center py-10 text-muted-foreground text-xs font-semibold border border-dashed rounded-xl my-2">
                  No tasks created for this project yet. Click "Create Task" to add one.
                </p>
              )}
            </TabsContent>
          </Tabs>
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
            
            {newStatus === "CANCELLED" && (
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Cancellation Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="Enter reason for cancelling this project..."
                  rows={2}
                  className="text-xs bg-muted/20 border-rose-200 dark:border-rose-900/50 focus-visible:ring-rose-500/20"
                />
              </div>
            )}
            {newStatus !== "CANCELLED" && (
              <div className="space-y-1.5 pt-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Comment / Note (Optional)
                </Label>
                <Input
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="Add a remark for the change..."
                  className="text-xs h-9 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="border-border/60 hover:bg-muted" onClick={() => setStatusDlg(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/95 text-white"
              disabled={statusMut.isPending || (newStatus === "CANCELLED" && !statusComment.trim())}
              onClick={async () => {
                await statusMut.mutateAsync({
                  id: p.id,
                  data: { 
                    status: newStatus,
                    comment: statusComment || undefined
                  },
                });
                setStatusDlg(false);
                setStatusComment("");
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

      {/* Edit Milestone Dialog */}
      <Dialog open={editMsDlg} onOpenChange={setEditMsDlg}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Milestone</DialogTitle>
          </DialogHeader>
          {editingMs && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={editingMs.title}
                  onChange={(e) =>
                    setEditingMs((prev: any) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g. Foundation Complete"
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
                <Input
                  value={editingMs.description || ""}
                  onChange={(e) =>
                    setEditingMs((prev: any) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Details..."
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Date</Label>
                <Input
                  type="date"
                  value={editingMs.targetDate ? editingMs.targetDate.split("T")[0] : ""}
                  onChange={(e) =>
                    setEditingMs((prev: any) => ({ ...prev, targetDate: e.target.value }))
                  }
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="ms-complete-checkbox"
                  checked={editingMs.isCompleted}
                  onCheckedChange={(checked) =>
                    setEditingMs((prev: any) => ({ ...prev, isCompleted: !!checked }))
                  }
                />
                <Label htmlFor="ms-complete-checkbox" className="text-xs font-bold cursor-pointer">Mark as Completed</Label>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="border-border/60 hover:bg-muted" onClick={() => setEditMsDlg(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/95 text-white"
              disabled={updateMsMut.isPending || !editingMs?.title}
              onClick={async () => {
                if (editingMs) {
                  await updateMsMut.mutateAsync({
                    id: p.id,
                    msId: editingMs.id,
                    data: {
                      title: editingMs.title,
                      description: editingMs.description || null,
                      targetDate: editingMs.targetDate ? new Date(editingMs.targetDate).toISOString() : null,
                      isCompleted: editingMs.isCompleted,
                    },
                  });
                  setEditMsDlg(false);
                }
              }}
            >
              {updateMsMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Attachment Dialog */}
      <Dialog open={attachmentDlg} onOpenChange={setAttachmentDlg}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Project Document or Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Document Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={attachmentForm.fileName}
                onChange={(e) =>
                  setAttachmentForm((prev) => ({ ...prev, fileName: e.target.value }))
                }
                placeholder="e.g. Sanction Letter / Progress Photo"
                className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Classification / Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={attachmentForm.classification}
                onValueChange={(val) =>
                  setAttachmentForm((prev) => ({ ...prev, classification: val }))
                }
              >
                <SelectTrigger className="bg-muted/20 border-border/60 focus-visible:ring-primary/20">
                  <SelectValue placeholder="Select classification" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="SANCTION_DOCUMENT">Sanction Letter</SelectItem>
                  <SelectItem value="WORK_ORDER">Work Order</SelectItem>
                  <SelectItem value="ESTIMATE">Budget Estimate</SelectItem>
                  <SelectItem value="BEFORE_PHOTO">Before Work Photo (Image)</SelectItem>
                  <SelectItem value="PROGRESS_PHOTO">Work Progress Photo (Image)</SelectItem>
                  <SelectItem value="AFTER_PHOTO">Completed Work Photo (Image)</SelectItem>
                  <SelectItem value="BILL">Invoice / Bill</SelectItem>
                  <SelectItem value="COMPLETION_CERTIFICATE">Completion Certificate</SelectItem>
                  <SelectItem value="OTHER">Other Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Upload File <span className="text-destructive">*</span>
              </Label>
              <div className="border-2 border-dashed border-border/80 hover:border-primary/50 bg-muted/15 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 relative hover:bg-muted/20">
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      setSelectedFile(file);
                      setAttachmentForm((prev) => ({
                        ...prev,
                        fileName: prev.fileName || file.name,
                        fileSize: Math.round(file.size / 1024).toString(),
                      }));
                    }
                  }}
                />
                <Paperclip className="h-7 w-7 text-muted-foreground animate-bounce mt-1" />
                <span className="text-xs font-bold text-foreground text-center max-w-[250px] truncate">
                  {selectedFile ? selectedFile.name : "Choose File or Drag & Drop"}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "Supports Images, PDFs, Docs up to 10MB"}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                File Size (KB)
              </Label>
              <Input
                type="number"
                disabled
                value={attachmentForm.fileSize}
                onChange={(e) =>
                  setAttachmentForm((prev) => ({ ...prev, fileSize: e.target.value }))
                }
                placeholder="e.g. 150"
                className="h-10 bg-muted/30 border-border/60 text-muted-foreground cursor-not-allowed"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="border-border/60 hover:bg-muted" onClick={() => setAttachmentDlg(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/95 text-white animate-pulse"
              disabled={addAttachmentMut.isPending || !attachmentForm.fileName || !selectedFile}
              onClick={async () => {
                if (!selectedFile) return;
                const formData = new FormData();
                formData.append("file", selectedFile);
                formData.append("fileName", attachmentForm.fileName);
                formData.append("classification", attachmentForm.classification);

                await addAttachmentMut.mutateAsync({
                  id: p.id,
                  data: formData,
                });
                setAttachmentDlg(false);
              }}
            >
              {addAttachmentMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Upload Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Progress Dialog */}
      <Dialog open={overrideProgressDlg} onOpenChange={setOverrideProgressDlg}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Adjust Completion Progress</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Manually override the completion percentage for this project. Note that adding or updating milestones will automatically recalculate this value.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-muted-foreground">
                <span>Progress: {overrideProgressValue}%</span>
              </div>
              <Input
                type="range"
                min="0"
                max="100"
                value={overrideProgressValue}
                onChange={(e) => setOverrideProgressValue(parseInt(e.target.value))}
                className="h-10 cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="border-border/60 hover:bg-muted" onClick={() => setOverrideProgressDlg(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/95 text-white"
              disabled={updateProjectMut.isPending}
              onClick={async () => {
                await updateProjectMut.mutateAsync({
                  id: p.id,
                  data: {
                    completionPercent: overrideProgressValue,
                  },
                });
                setOverrideProgressDlg(false);
              }}
            >
              {updateProjectMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
