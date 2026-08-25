import { useState, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import * as xlsx from "xlsx";
import {
  useTasks,
  useTaskStats,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useChangeTaskStatus,
  useAssignTask,
  useBulkAssignTasks,
  useBulkStatusTasks,
} from "@/hooks/useTasks";
import { useDepartments } from "@/hooks/useDepartments";
import { useUsers } from "@/hooks/useUsers";
import { useProjects } from "@/hooks/useProjects";
import { useGrievances } from "@/hooks/useGrievances";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import { MainLayout } from "@/components/layout/MainLayout";
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  Edit,
  UserPlus,
  Loader2,
  Calendar,
  XCircle,
  MoreVertical,
  CheckSquare,
  Building,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

export default function TasksPage() {
  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 20;

  // Selected Tasks for Bulk Action
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Modals state
  const [addDlg, setAddDlg] = useState(false);
  const [editDlg, setEditDlg] = useState(false);
  const [assignDlg, setAssignDlg] = useState(false);
  const [bulkAssignDlg, setBulkAssignDlg] = useState(false);
  const [bulkStatusDlg, setBulkStatusDlg] = useState(false);

  // Focus entity
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Forms state
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    status: "TODO",
    dueDate: "",
    assignedToId: "",
    departmentId: "",
    projectId: "",
    grievanceId: "",
  });

  const [assignForm, setAssignForm] = useState({
    assignedToId: "",
    departmentId: "",
  });

  const [bulkAssignForm, setBulkAssignForm] = useState({
    assignedToId: "",
    departmentId: "",
  });

  const [bulkStatusValue, setBulkStatusValue] = useState("TODO");

  // Fetch list & stats
  const params: any = {
    page,
    limit,
  };
  if (search) params.search = search;
  if (statusFilter !== "ALL") params.status = statusFilter;
  if (priorityFilter !== "ALL") params.priority = priorityFilter;
  if (deptFilter !== "ALL") params.departmentId = deptFilter;
  if (assigneeFilter !== "ALL") params.assignedToId = assigneeFilter;

  const { data: listRes, isLoading: listLoading } = useTasks(params);
  const { data: statsRes } = useTaskStats();
  const { data: deptsRes } = useDepartments();
  const { data: usersRes } = useUsers({ limit: 100 });
  const { data: projRes } = useProjects({ limit: 100 });
  const { data: grievancesRes } = useGrievances({ limit: 100 });

  // Mutations
  const createMut = useCreateTask();
  const updateMut = useUpdateTask();
  const deleteMut = useDeleteTask();
  const statusMut = useChangeTaskStatus();
  const assignMut = useAssignTask();
  const bulkAssignMut = useBulkAssignTasks();
  const bulkStatusMut = useBulkStatusTasks();

  const tasks = listRes?.data || [];
  const pagination = listRes?.pagination;
  const stats = statsRes?.data || { total: 0, todo: 0, inProgress: 0, completed: 0, overdue: 0 };
  const departments = deptsRes?.data || [];
  const officers = usersRes?.data?.users || [];
  const projects = projRes?.data || [];
  const grievances = grievancesRes?.data?.grievances || [];

  const taskFormFilteredOfficers = taskForm.departmentId
    ? officers.filter((o: any) => o.departmentId === taskForm.departmentId)
    : officers;

  const assignFormFilteredOfficers = assignForm.departmentId
    ? officers.filter((o: any) => o.departmentId === assignForm.departmentId)
    : officers;

  const bulkAssignFormFilteredOfficers = bulkAssignForm.departmentId
    ? officers.filter((o: any) => o.departmentId === bulkAssignForm.departmentId)
    : officers;

  const handleTaskFormDeptChange = (deptId: string) => {
    const nextDeptId = deptId === "none" ? "" : deptId;
    const filtered = nextDeptId
      ? officers.filter((o: any) => o.departmentId === nextDeptId)
      : officers;
    const stillValid = filtered.some((o: any) => o.id === taskForm.assignedToId);
    setTaskForm((p) => ({
      ...p,
      departmentId: nextDeptId,
      assignedToId: stillValid ? p.assignedToId : (filtered[0]?.id || ""),
    }));
  };

  const handleTaskFormOfficerChange = (officerId: string) => {
    const officer = officers.find((o: any) => o.id === officerId);
    setTaskForm((p) => ({
      ...p,
      assignedToId: officerId,
      departmentId: (!p.departmentId && officer?.departmentId) ? officer.departmentId : p.departmentId,
    }));
  };

  const handleAssignFormDeptChange = (deptId: string) => {
    const nextDeptId = deptId === "none" ? "" : deptId;
    const filtered = nextDeptId
      ? officers.filter((o: any) => o.departmentId === nextDeptId)
      : officers;
    const stillValid = filtered.some((o: any) => o.id === assignForm.assignedToId);
    setAssignForm((p) => ({
      ...p,
      departmentId: nextDeptId,
      assignedToId: stillValid ? p.assignedToId : (filtered[0]?.id || ""),
    }));
  };

  const handleAssignFormOfficerChange = (officerId: string) => {
    const officer = officers.find((o: any) => o.id === officerId);
    setAssignForm((p) => ({
      ...p,
      assignedToId: officerId,
      departmentId: (!p.departmentId && officer?.departmentId) ? officer.departmentId : p.departmentId,
    }));
  };

  const handleBulkAssignFormDeptChange = (deptId: string) => {
    const nextDeptId = deptId === "none" ? "" : deptId;
    const filtered = nextDeptId
      ? officers.filter((o: any) => o.departmentId === nextDeptId)
      : officers;
    const stillValid = filtered.some((o: any) => o.id === bulkAssignForm.assignedToId);
    setBulkAssignForm((p) => ({
      ...p,
      departmentId: nextDeptId,
      assignedToId: stillValid ? p.assignedToId : (filtered[0]?.id || ""),
    }));
  };

  const handleBulkAssignFormOfficerChange = (officerId: string) => {
    const officer = officers.find((o: any) => o.id === officerId);
    setBulkAssignForm((p) => ({
      ...p,
      assignedToId: officerId,
      departmentId: (!p.departmentId && officer?.departmentId) ? officer.departmentId : p.departmentId,
    }));
  };

  const handleSelectTask = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedTaskIds((prev) => [...prev, id]);
    } else {
      setSelectedTaskIds((prev) => prev.filter((tid) => tid !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTaskIds(tasks.map((t: any) => t.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  useEffect(() => {
    const state = window.history.state as any;
    if (state?.openCreate) {
      // Clear state so it doesn't open on reload/back
      window.history.replaceState({ ...state, openCreate: false }, "");

      setTaskForm((p) => ({
        ...p,
        title: state.title || "",
        description: state.description || "",
        grievanceId: state.grievanceId || "",
        projectId: state.projectId || "",
        departmentId: state.departmentId || "",
        assignedToId: "", // will be filtered
      }));
      setAddDlg(true);

      // If department is provided, set the default officer of that department if any
      if (state.departmentId) {
        const filtered = officers.filter((o: any) => o.departmentId === state.departmentId);
        if (filtered.length > 0) {
          setTaskForm((p) => ({
            ...p,
            departmentId: state.departmentId,
            assignedToId: filtered[0].id,
          }));
        }
      }
    }
  }, [officers]);

  const handleCreateTask = async () => {
    if (!taskForm.title || !taskForm.assignedToId) {
      toast.error("Title and Assignee are required.");
      return;
    }
    await createMut.mutateAsync({
      title: taskForm.title,
      description: taskForm.description || null,
      priority: taskForm.priority,
      status: taskForm.status,
      dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
      assignedToId: taskForm.assignedToId,
      departmentId: taskForm.departmentId || null,
      projectId: taskForm.projectId || null,
      grievanceId: taskForm.grievanceId || null,
    });
    setAddDlg(false);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask || !taskForm.title) return;
    await updateMut.mutateAsync({
      id: selectedTask.id,
      data: {
        title: taskForm.title,
        description: taskForm.description || null,
        priority: taskForm.priority,
        status: taskForm.status,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
        assignedToId: taskForm.assignedToId,
        departmentId: taskForm.departmentId || null,
        projectId: taskForm.projectId || null,
        grievanceId: taskForm.grievanceId || null,
      },
    });
    setEditDlg(false);
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      await deleteMut.mutateAsync(id);
    }
  };

  const handleAssignTask = async () => {
    if (!selectedTask || !assignForm.assignedToId) return;
    await assignMut.mutateAsync({
      id: selectedTask.id,
      data: {
        assignedToId: assignForm.assignedToId,
        departmentId: assignForm.departmentId || undefined,
      },
    });
    setAssignDlg(false);
  };

  const handleBulkAssign = async () => {
    if (selectedTaskIds.length === 0 || !bulkAssignForm.assignedToId) return;
    await bulkAssignMut.mutateAsync({
      taskIds: selectedTaskIds,
      assignedToId: bulkAssignForm.assignedToId,
      departmentId: bulkAssignForm.departmentId || undefined,
    });
    setBulkAssignDlg(false);
    setSelectedTaskIds([]);
  };

  const handleBulkStatus = async () => {
    if (selectedTaskIds.length === 0) return;
    await bulkStatusMut.mutateAsync({
      taskIds: selectedTaskIds,
      status: bulkStatusValue,
    });
    setBulkStatusDlg(false);
    setSelectedTaskIds([]);
  };

  const handleExport = () => {
    if (tasks.length === 0) {
      toast.error("No tasks available to export.");
      return;
    }
    const exportData = tasks.map((t: any) => ({
      "Task Code": t.taskCode,
      Title: t.title,
      Description: t.description || "",
      Priority: t.priority,
      Status: t.status,
      "Assigned To": t.assignedTo?.name || "Unassigned",
      Department: t.department?.name || "",
      "Due Date": t.dueDate ? format(new Date(t.dueDate), "yyyy-MM-dd") : "",
      Created: format(new Date(t.createdAt), "yyyy-MM-dd"),
    }));
    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Tasks");
    xlsx.writeFile(wb, `tasks_export_${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast.success("Tasks exported successfully.");
  };

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case "URGENT":
        return "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40";
      case "HIGH":
        return "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/40";
      case "MEDIUM":
        return "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40";
      default:
        return "text-slate-700 bg-slate-50 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/40";
    }
  };

  const getStatusStyle = (s: string) => {
    switch (s) {
      case "COMPLETED":
        return "text-green-700 bg-green-50 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/40";
      case "IN_PROGRESS":
        return "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40";
      case "OVERDUE":
        return "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40";
      case "CANCELLED":
        return "text-gray-500 bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800/40";
      default:
        return "text-slate-700 bg-slate-50 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/40";
    }
  };

  return (
    <MainLayout title="Task Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <CheckSquare className="h-7 w-7 text-primary" />
              Task & Action Items
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Create, track, and delegate follow-up actions and constituency duties
            </p>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <PermissionGate module="tasks" action="read">
              <Button
                variant="outline"
                className="gap-2 text-xs border-border/60 bg-card rounded-xl shadow-sm"
                onClick={handleExport}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export Excel
              </Button>
            </PermissionGate>
            <PermissionGate module="tasks" action="create">
              <Button
                className="gap-2 text-xs bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-sm"
                onClick={() => {
                  setTaskForm({
                    title: "",
                    description: "",
                    priority: "MEDIUM",
                    status: "TODO",
                    dueDate: "",
                    assignedToId: officers[0]?.id || "",
                    departmentId: officers[0]?.departmentId || "",
                    projectId: "",
                    grievanceId: "",
                  });
                  setAddDlg(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Action Item
              </Button>
            </PermissionGate>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Tasks", value: stats.total, color: "#3b82f6", Icon: CheckSquare },
            { label: "Pending", value: stats.todo, color: "#64748b", Icon: Clock },
            { label: "In Progress", value: stats.inProgress, color: "#f59e0b", Icon: Clock },
            { label: "Completed", value: stats.completed, color: "#22c55e", Icon: CheckCircle2 },
            { label: "Overdue", value: stats.overdue, color: "#ef4444", Icon: AlertTriangle },
          ].map((s, i) => (
            <Card key={i} className="border border-border/50 bg-card shadow-sm rounded-2xl overflow-hidden hover:border-primary/20 transition-all duration-300">
              <CardContent className="p-4 flex items-center gap-4">
                <div
                  className="p-3 rounded-xl border flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${s.color}12`, borderColor: `${s.color}25` }}
                >
                  <s.Icon className="h-5 w-5" style={{ color: s.color }} />
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

        {/* Filters & Bulk Operations Card */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search & Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-3 w-full">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search task title/code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20 text-xs rounded-xl"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-36 bg-muted/20 border-border/60 text-xs rounded-xl h-10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full sm:w-36 bg-muted/20 border-border/60 text-xs rounded-xl h-10">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Priorities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-full sm:w-44 bg-muted/20 border-border/60 text-xs rounded-xl h-10">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Departments</SelectItem>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="w-full sm:w-44 bg-muted/20 border-border/60 text-xs rounded-xl h-10">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Assignees</SelectItem>
                    {officers.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk operations display */}
              {selectedTaskIds.length > 0 && (
                <div className="flex items-center gap-2 flex-shrink-0 animate-fade-in bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-xl">
                  <span className="text-[11px] font-bold text-primary font-mono whitespace-nowrap">
                    {selectedTaskIds.length} Selected
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="h-8 text-xs gap-1">
                        Bulk Action <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-xl">
                      <DropdownMenuItem
                        onClick={() => {
                          const defaultOfficer = officers[0];
                          setBulkAssignForm({
                            assignedToId: defaultOfficer?.id || "",
                            departmentId: defaultOfficer?.departmentId || "",
                          });
                          setBulkAssignDlg(true);
                        }}
                      >
                        <Users className="h-4.5 w-4.5 mr-2 text-muted-foreground" />
                        Assign Officer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setBulkStatusValue("TODO");
                          setBulkStatusDlg(true);
                        }}
                      >
                        <CheckCircle2 className="h-4.5 w-4.5 mr-2 text-muted-foreground" />
                        Update Status
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Tasks Table */}
            <div className="border border-border/40 rounded-xl overflow-hidden shadow-inner">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/40 bg-muted/10">
                    <TableHead className="w-12 text-center py-3 bg-muted/10">
                      <Checkbox
                        checked={tasks.length > 0 && selectedTaskIds.length === tasks.length}
                        onCheckedChange={(val) => handleSelectAll(!!val)}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/10">Code</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/10">Title</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/10 text-center">Priority</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/10 text-center">Status</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/10">Assignee</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/10">Department</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/10">Due Date</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/10 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listLoading ? (
                    [1, 2, 3, 4].map((i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={9} className="py-4">
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : tasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-xs text-muted-foreground font-semibold">
                        No tasks found matching criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tasks.map((t: any) => (
                      <TableRow key={t.id} className="hover:bg-muted/10 border-b border-border/30">
                        <TableCell className="text-center py-3">
                          <Checkbox
                            checked={selectedTaskIds.includes(t.id)}
                            onCheckedChange={(val) => handleSelectTask(t.id, !!val)}
                            aria-label={`Select task ${t.taskCode}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-foreground whitespace-nowrap">
                          {t.taskCode}
                        </TableCell>
                        <TableCell className="py-3 max-w-[220px]">
                          <div>
                            <p className="font-bold text-xs sm:text-sm text-foreground leading-snug">{t.title}</p>
                            {t.description && (
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                                {t.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <Badge variant="outline" className={`font-mono text-[9px] font-bold border ${getPriorityStyle(t.priority)}`}>
                            {t.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Badge variant="outline" className={`font-mono text-[9px] font-bold border cursor-pointer hover:opacity-85 ${getStatusStyle(t.status)}`}>
                                {t.status}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="rounded-xl">
                              {["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((st) => (
                                <DropdownMenuItem
                                  key={st}
                                  onClick={async () => {
                                    await statusMut.mutateAsync({ id: t.id, status: st });
                                  }}
                                >
                                  {st}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="py-3 text-xs font-semibold text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                              {t.assignedTo?.name?.[0]}
                            </div>
                            {t.assignedTo?.name || "Unassigned"}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                          {t.department ? (
                            <Link to={`/departments/${t.department.id}`}>
                              <span className="text-primary hover:underline font-bold cursor-pointer">
                                {t.department.name}
                              </span>
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-xs font-semibold text-muted-foreground font-mono whitespace-nowrap">
                          {t.dueDate ? (
                            <span className={new Date(t.dueDate) < new Date() && t.status !== "COMPLETED" ? "text-destructive font-bold" : ""}>
                              {format(new Date(t.dueDate), "dd MMM yyyy")}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right py-3 pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setSelectedTask(t);
                                setAssignForm({
                                  assignedToId: t.assignedToId,
                                  departmentId: t.departmentId || "",
                                });
                                setAssignDlg(true);
                              }}
                              title="Assign Officer"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setSelectedTask(t);
                                setTaskForm({
                                  title: t.title,
                                  description: t.description || "",
                                  priority: t.priority,
                                  status: t.status,
                                  dueDate: t.dueDate ? t.dueDate.split("T")[0] : "",
                                  assignedToId: t.assignedToId,
                                  departmentId: t.departmentId || "",
                                  projectId: t.projectId || "",
                                  grievanceId: t.grievanceId || "",
                                });
                                setEditDlg(true);
                              }}
                              title="Edit Details"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteTask(t.id)}
                              title="Delete Task"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] font-semibold text-muted-foreground font-mono">
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} items)
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={!pagination.hasPrev}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={!pagination.hasNext}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={addDlg} onOpenChange={setAddDlg}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Action Item Task</DialogTitle>
            <DialogDescription>Create a new task assigned to an officer or department.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Task Title <span className="text-destructive">*</span></Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Inspect road work / Follow-up file"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Details of the task assignment..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(v) => setTaskForm((p) => ({ ...p, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign Officer <span className="text-destructive">*</span></Label>
              <Select
                value={taskForm.assignedToId}
                onValueChange={handleTaskFormOfficerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Assignee" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {taskFormFilteredOfficers.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name} ({o.designation || o.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={taskForm.departmentId || "none"}
                  onValueChange={handleTaskFormDeptChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
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
                <Label>Link Project</Label>
                <Select
                  value={taskForm.projectId || "none"}
                  onValueChange={(v) => setTaskForm((p) => ({ ...p, projectId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">— None —</SelectItem>
                    {projects.map((pr: any) => (
                      <SelectItem key={pr.id} value={pr.id}>
                        {pr.projectCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDlg(false)}>Cancel</Button>
            <Button disabled={createMut.isPending || !taskForm.title || !taskForm.assignedToId} onClick={handleCreateTask}>
              {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editDlg} onOpenChange={setEditDlg}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Task Title <span className="text-destructive">*</span></Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(v) => setTaskForm((p) => ({ ...p, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign Officer <span className="text-destructive">*</span></Label>
              <Select
                value={taskForm.assignedToId}
                onValueChange={handleTaskFormOfficerChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {taskFormFilteredOfficers.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name} ({o.designation || o.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={taskForm.departmentId || "none"}
                  onValueChange={handleTaskFormDeptChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
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
                <Label>Link Project</Label>
                <Select
                  value={taskForm.projectId || "none"}
                  onValueChange={(v) => setTaskForm((p) => ({ ...p, projectId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">— None —</SelectItem>
                    {projects.map((pr: any) => (
                      <SelectItem key={pr.id} value={pr.id}>
                        {pr.projectCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDlg(false)}>Cancel</Button>
            <Button disabled={updateMut.isPending || !taskForm.title} onClick={handleUpdateTask}>
              {updateMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Task Dialog */}
      <Dialog open={assignDlg} onOpenChange={setAssignDlg}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Officer / Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Officer <span className="text-destructive">*</span></Label>
              <Select
                value={assignForm.assignedToId}
                onValueChange={handleAssignFormOfficerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Assignee" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {assignFormFilteredOfficers.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name} ({o.designation || o.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={assignForm.departmentId || "none"}
                onValueChange={handleAssignFormDeptChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">— None —</SelectItem>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDlg(false)}>Cancel</Button>
            <Button disabled={assignMut.isPending || !assignForm.assignedToId} onClick={handleAssignTask}>
              {assignMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Assign Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignDlg} onOpenChange={setBulkAssignDlg}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Assign {selectedTaskIds.length} Tasks</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Assign Officer <span className="text-destructive">*</span></Label>
              <Select
                value={bulkAssignForm.assignedToId}
                onValueChange={handleBulkAssignFormOfficerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Assignee" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {bulkAssignFormFilteredOfficers.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={bulkAssignForm.departmentId || "none"}
                onValueChange={handleBulkAssignFormDeptChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">— None —</SelectItem>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAssignDlg(false)}>Cancel</Button>
            <Button disabled={bulkAssignMut.isPending || !bulkAssignForm.assignedToId} onClick={handleBulkAssign}>
              {bulkAssignMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Assign All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Dialog */}
      <Dialog open={bulkStatusDlg} onOpenChange={setBulkStatusDlg}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Transition Status</DialogTitle>
            <DialogDescription>Change status of {selectedTaskIds.length} selected tasks.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Task Status</Label>
              <Select value={bulkStatusValue} onValueChange={setBulkStatusValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDlg(false)}>Cancel</Button>
            <Button disabled={bulkStatusMut.isPending} onClick={handleBulkStatus}>
              {bulkStatusMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update Statuses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
