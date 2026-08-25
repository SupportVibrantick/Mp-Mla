import { useState } from "react";
import { useParams, Link } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  useDepartment,
  useDepartmentUsers,
  useDepartmentGrievances,
  useDepartmentTasks,
  useDepartmentSlas,
  useUpdateDepartmentSlas,
  useSingleDepartmentStats,
} from "@/hooks/useDepartments";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Landmark,
  User,
  Phone,
  Mail,
  MessageSquare,
  FolderKanban,
  CheckCircle,
  AlertTriangle,
  Clock,
  Settings,
  Users,
  Save,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusInfo, getPriorityInfo } from "@/hooks/useGrievances";
import { format } from "date-fns";

const CATEGORY_LABELS: Record<string, string> = {
  ROAD: "Roads & Footpath",
  WATER: "Water Supply",
  ELECTRICITY: "Electricity",
  SANITATION: "Sanitation",
  ENCROACHMENT: "Encroachment",
  NOISE: "Noise & Pollution",
  HOUSING: "Housing",
  PENSION: "Pension & Welfare",
  EDUCATION: "Education",
  HEALTH: "Health",
  SAFETY: "Law & Safety",
  CERTIFICATE: "Certificates",
  OTHER: "Other",
};

const PRIORITIES_INFO = {
  LOW: { label: "Low Priority", color: "bg-green-50 text-green-700 border-green-200/50 dark:bg-green-950/20 dark:text-green-400", defaultHours: 72 },
  MEDIUM: { label: "Medium Priority", color: "bg-yellow-50 text-yellow-700 border-yellow-200/50 dark:bg-yellow-950/20 dark:text-yellow-400", defaultHours: 48 },
  HIGH: { label: "High Priority", color: "bg-orange-50 text-orange-700 border-orange-200/50 dark:bg-orange-950/20 dark:text-orange-400", defaultHours: 24 },
  URGENT: { label: "Urgent Priority", color: "bg-red-50 text-red-700 border-red-200/50 dark:bg-red-950/20 dark:text-red-400", defaultHours: 12 },
};

interface DepartmentDetailPageProps {
  id?: string;
}

export default function DepartmentDetailPage({ id: propId }: DepartmentDetailPageProps) {
  const params = useParams<{ id?: string }>();
  const id = propId || params.id;

  const { data: deptRes, isLoading: isLoadingDept } = useDepartment(id);
  const { data: usersRes, isLoading: isLoadingUsers } = useDepartmentUsers(id);
  const { data: grievancesRes, isLoading: isLoadingGrievances } = useDepartmentGrievances(id);
  const { data: tasksRes, isLoading: isLoadingTasks } = useDepartmentTasks(id);
  const { data: slasRes, isLoading: isLoadingSlas } = useDepartmentSlas(id);
  const { data: statsRes, isLoading: isLoadingStats } = useSingleDepartmentStats(id);
  
  const updateSlaMut = useUpdateDepartmentSlas();

  const [slaForm, setSlaForm] = useState<Record<string, number>>({});
  const [isEditingSlas, setIsEditingSlas] = useState(false);

  const startEditingSlas = () => {
    const initial: Record<string, number> = {};
    const currentSlas = slasRes?.data || [];
    Object.keys(PRIORITIES_INFO).forEach((prio) => {
      const match = currentSlas.find((s: any) => s.priority === prio);
      initial[prio] = match ? match.slaHours : PRIORITIES_INFO[prio as keyof typeof PRIORITIES_INFO].defaultHours;
    });
    setSlaForm(initial);
    setIsEditingSlas(true);
  };

  const saveSlas = async () => {
    if (!id) return;
    const records = Object.entries(slaForm).map(([priority, slaHours]) => ({
      priority,
      slaHours: Number(slaHours) || 24,
    }));
    await updateSlaMut.mutateAsync({ id, data: { slas: records } });
    setIsEditingSlas(false);
  };

  if (isLoadingDept || !deptRes) {
    return (
      <MainLayout title="Department Detail">
        <div className="space-y-6">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </MainLayout>
    );
  }

  const deptData = deptRes.data || deptRes;
  const usersList = usersRes?.data || [];
  const grievancesList = grievancesRes?.data || [];
  const tasksList = tasksRes?.data || [];
  const slasList = slasRes?.data || [];
  const statsData = statsRes?.data || statsRes;

  return (
    <MainLayout title={`${deptData.name} Details`}>
      <div className="space-y-6">
        {/* Back Link & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <Link href="/departments" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Departments
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
              <Landmark className="h-7 w-7 text-primary" /> {deptData.name}
              <Badge className={cn("text-xs font-semibold px-2 py-0.5 shadow-none", deptData.isActive ? "bg-emerald-100/50 text-emerald-700 border border-emerald-200/30" : "bg-muted text-muted-foreground")}>
                {deptData.isActive ? "Active" : "Inactive"}
              </Badge>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Code: <span className="font-mono font-bold text-foreground">{deptData.code}</span> • {deptData.description || "No description provided"}
            </p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Head of Department */}
          <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="p-4 border-b border-border/40 bg-muted/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Department Head
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {deptData.headName ? (
                <>
                  <p className="text-sm font-semibold text-foreground">{deptData.headName}</p>
                  {deptData.headPhone && (
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground/60" /> {deptData.headPhone}
                    </p>
                  )}
                  {deptData.headEmail && (
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground/60" /> {deptData.headEmail}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic py-2">No head officer assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Metrics */}
          <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm md:col-span-2">
            <CardHeader className="p-4 border-b border-border/40 bg-muted/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-extrabold text-foreground">{statsData?.totalGrievances || grievancesList.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">Open/Pending</p>
                <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{statsData?.openGrievances || grievancesList.filter((g: any) => ["OPEN", "IN_PROGRESS", "ESCALATED"].includes(g.status)).length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">Resolved</p>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{statsData?.resolvedGrievances || grievancesList.filter((g: any) => ["RESOLVED", "CLOSED"].includes(g.status)).length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">SLA Met Rate</p>
                <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{statsData?.slaCompliancePercent ? `${statsData.slaCompliancePercent}%` : "—"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs Section */}
        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="bg-muted/40 p-1 border rounded-xl mb-4 w-full sm:w-auto flex flex-wrap gap-1 justify-start">
            <TabsTrigger value="requests" className="gap-2 rounded-lg text-xs font-semibold px-3 py-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Public Requests ({grievancesList.length})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2 rounded-lg text-xs font-semibold px-3 py-1.5">
              <FolderKanban className="h-3.5 w-3.5" /> Tasks ({tasksList.length})
            </TabsTrigger>
            <TabsTrigger value="officers" className="gap-2 rounded-lg text-xs font-semibold px-3 py-1.5">
              <Users className="h-3.5 w-3.5" /> Staff & Officers ({usersList.length})
            </TabsTrigger>
            <TabsTrigger value="slas" className="gap-2 rounded-lg text-xs font-semibold px-3 py-1.5">
              <Settings className="h-3.5 w-3.5" /> SLA Config
            </TabsTrigger>
          </TabsList>

          {/* Grievances Tab */}
          <TabsContent value="requests" className="focus-visible:outline-none">
            <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Public Grievances & Requests</CardTitle>
                  <CardDescription className="text-xs">Incoming cases routed to this department for action</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/40">
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Ticket Number</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Subject</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Priority</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Status</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Assigned To</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Created</TableHead>
                        <TableHead className="text-right py-3 bg-muted/20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingGrievances ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell>
                          </TableRow>
                        ))
                      ) : grievancesList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground italic">
                            No grievances assigned to this department
                          </TableCell>
                        </TableRow>
                      ) : (
                        grievancesList.map((g: any) => {
                          const status = getStatusInfo(g.status);
                          const priority = getPriorityInfo(g.priority);
                          return (
                            <TableRow key={g.id} className="hover:bg-muted/5 transition-colors border-b border-border/40">
                              <TableCell className="font-mono text-xs font-bold text-foreground">{g.ticketNumber}</TableCell>
                              <TableCell className="font-medium text-xs max-w-xs truncate">{g.subject}</TableCell>
                              <TableCell>
                                <Badge className={cn("text-[9px] font-semibold shadow-none border", priority?.color || "bg-secondary text-secondary-foreground")}>
                                  {priority?.label || g.priority}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={cn("text-[9px] font-semibold shadow-none border", status?.color || "bg-secondary text-secondary-foreground")}>
                                  {status?.label || g.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-foreground font-semibold">{g.assignedTo?.name || "Unassigned"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{format(new Date(g.createdAt), "dd MMM yyyy")}</TableCell>
                              <TableCell className="text-right">
                                <Link href={`/public-requests/detail?id=${g.id}`}>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="focus-visible:outline-none">
            <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="p-4 border-b border-border/40">
                <CardTitle className="text-sm font-bold">Action Items & Tasks</CardTitle>
                <CardDescription className="text-xs">Follow-up actions or projects tasks routed to this department</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/40">
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Task Code</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Title</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Priority</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Status</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Officer</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingTasks ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
                          </TableRow>
                        ))
                      ) : tasksList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground italic">
                            No follow-up tasks currently assigned
                          </TableCell>
                        </TableRow>
                      ) : (
                        tasksList.map((t: any) => (
                          <TableRow key={t.id} className="hover:bg-muted/5 transition-colors border-b border-border/40 text-xs">
                            <TableCell className="font-mono font-bold text-foreground">{t.taskCode}</TableCell>
                            <TableCell className="font-medium max-w-xs truncate">{t.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[9px] font-bold shadow-none px-2 py-0.5 border-border/60">
                                {t.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("text-[9px] font-semibold border shadow-none",
                                t.status === "DONE" ? "bg-emerald-100/50 text-emerald-700 border-emerald-200/30" : "bg-amber-100/50 text-amber-700 border-amber-200/30"
                              )}>
                                {t.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{t.assignedTo?.name || "Unassigned"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {t.dueDate ? format(new Date(t.dueDate), "dd MMM yyyy") : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="officers" className="focus-visible:outline-none">
            <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="p-4 border-b border-border/40">
                <CardTitle className="text-sm font-bold">Assigned Staff & Officers</CardTitle>
                <CardDescription className="text-xs">Constituency personnel belonging to this department</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/40">
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Name</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Email</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Phone</TableHead>
                        <TableHead className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingUsers ? (
                        Array.from({ length: 2 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                          </TableRow>
                        ))
                      ) : usersList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-xs text-muted-foreground italic">
                            No officers or users registered in this department
                          </TableCell>
                        </TableRow>
                      ) : (
                        usersList.map((u: any) => (
                          <TableRow key={u.id} className="hover:bg-muted/5 transition-colors border-b border-border/40 text-xs">
                            <TableCell className="font-semibold text-foreground">{u.name}</TableCell>
                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                            <TableCell className="text-muted-foreground">{u.phone || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[9px] font-bold border">
                                {u.role}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SLAs Tab */}
          <TabsContent value="slas" className="focus-visible:outline-none">
            <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Service Level Agreement (SLA) Targets</CardTitle>
                  <CardDescription className="text-xs">Hours allocated to resolve requests of each category</CardDescription>
                </div>
                {!isEditingSlas ? (
                  <PermissionGate module="departments" action="update">
                    <Button onClick={startEditingSlas} size="sm" variant="outline" className="gap-2 text-xs border-border/60 hover:bg-muted font-bold h-8">
                      <Settings className="h-3.5 w-3.5" /> Configure SLAs
                    </Button>
                  </PermissionGate>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={() => setIsEditingSlas(false)} size="sm" variant="ghost" className="text-xs h-8">Cancel</Button>
                    <Button onClick={saveSlas} size="sm" className="gap-1 bg-primary text-white text-xs font-bold h-8">
                      <Save className="h-3.5 w-3.5" /> Save Changes
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {Object.entries(PRIORITIES_INFO).map(([priorityCode, info]) => {
                    const slaConfig = slasList.find((s: any) => s.priority === priorityCode);
                    const hours = isEditingSlas ? slaForm[priorityCode] : (slaConfig ? slaConfig.slaHours : info.defaultHours);

                    return (
                      <div key={priorityCode} className="space-y-2 p-4 rounded-xl border border-border/40 bg-muted/5 flex flex-col justify-between h-full min-h-[120px]">
                        <div>
                          <Badge variant="outline" className={cn("text-[9px] font-bold shadow-none uppercase border px-2 py-0.5", info.color)}>
                            {info.label}
                          </Badge>
                          <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1">{priorityCode} PRIORITY</p>
                        </div>
                        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-border/20 mt-2">
                          <span className="text-[10px] text-muted-foreground font-semibold">Target SLA</span>
                          {isEditingSlas ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={hours}
                                onChange={(e) => setSlaForm(p => ({ ...p, [priorityCode]: Math.max(1, Number(e.target.value) || 1) }))}
                                className="w-16 h-8 text-center text-xs font-bold bg-background border-border/70"
                              />
                              <span className="text-[10px] text-muted-foreground font-semibold">hrs</span>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="font-mono text-xs font-bold px-2 py-0.5 border">
                              {hours} hrs
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
