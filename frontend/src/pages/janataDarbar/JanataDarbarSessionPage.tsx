import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { format } from "date-fns";
import {
  useJanataSession,
  useJanataQueue,
  useJanataSessionStats,
  useRegisterVisitorToken,
  useCallVisitorToken,
  useStartVisitorToken,
  useResolveVisitorToken,
  useReferVisitorToken,
  useMarkVisitorAbsent,
  useCreateGrievanceFromToken,
  useCreateTaskFromToken,
  getTokenStatusInfo,
  getDarbarStatusInfo,
} from "@/hooks/useJanataDarbar";
import { useDepartments } from "@/hooks/useDepartments";
import { useUsers } from "@/hooks/useUsers";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Loader2,
  Users,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  Volume2,
  Forward,
  CornerDownRight,
  ClipboardList,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function JanataDarbarSessionPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  // Queries
  const { data: sessionRes, isLoading: isSessionLoading } =
    useJanataSession(id);
  const { data: queueRes, refetch: refetchQueue } = useJanataQueue(id);
  const { data: statsRes, refetch: refetchStats } = useJanataSessionStats(id);
  const { data: deptsRes } = useDepartments();
  const { data: usersRes } = useUsers({ limit: 100 });

  const session = sessionRes?.data;
  // The /queue endpoint returns { currentToken, nextToken, waitingCount, completedCount } — NOT an array
  const queueData = queueRes?.data || {};
  // Use the tokens array from the session detail (getSession includes tokens via relation)
  const queue: any[] = session?.tokens || [];
  const stats = statsRes?.data || {
    total: 0,
    waiting: 0,
    called: 0,
    inProgress: 0,
    resolved: 0,
    referred: 0,
    absent: 0,
  };
  const departments = deptsRes?.data || [];
  const officers = usersRes?.data?.users || [];

  // Mutations
  const registerTokenMut = useRegisterVisitorToken();
  const callTokenMut = useCallVisitorToken();
  const startTokenMut = useStartVisitorToken();
  const resolveTokenMut = useResolveVisitorToken();
  const referTokenMut = useReferVisitorToken();
  const absentTokenMut = useMarkVisitorAbsent();
  const createGrievanceMut = useCreateGrievanceFromToken();
  const createTaskMut = useCreateTaskFromToken();

  // Dialog States
  const [tokenDlg, setTokenDlg] = useState(false);
  const [tokenErrors, setTokenErrors] = useState<Record<string, string>>({});
  const [tokenForm, setTokenForm] = useState({
    visitorName: "",
    visitorPhone: "",
    visitorEmail: "",
    visitorAddress: "",
    departmentId: "none",
    issueSummary: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  });

  const [referDlg, setReferDlg] = useState(false);
  const [activeToken, setActiveToken] = useState<any>(null);
  const [referForm, setReferForm] = useState({ departmentId: "", notes: "" });

  if (isSessionLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h2 className="text-xl font-bold">Session Not Found</h2>
        <Link href="/janata-darbar" className="mt-4 inline-block">
          <Button>Back to List</Button>
        </Link>
      </div>
    );
  }

  const darbarStatus = getDarbarStatusInfo(session.status);

  // Active / Current Token in action (Called or In Progress)
  const currentToken = queue.find((t: any) =>
    ["CALLED", "IN_PROGRESS"].includes(t.status),
  );
  // Waiting queue list
  const waitingQueue = queue.filter((t: any) => t.status === "WAITING");

  const validateTokenForm = () => {
    const errs: Record<string, string> = {};
    if (!tokenForm.visitorName || !tokenForm.visitorName.trim()) {
      errs.visitorName = "Visitor name is required";
    } else if (tokenForm.visitorName.trim().length < 2) {
      errs.visitorName = "Visitor name must be at least 2 characters";
    }

    if (tokenForm.visitorPhone && tokenForm.visitorPhone.trim()) {
      const cleanPhone = tokenForm.visitorPhone.replace(/\D/g, "");
      if (cleanPhone.length !== 10) {
        errs.visitorPhone = "Must be a valid 10-digit mobile number";
      }
    }

    if (tokenForm.visitorEmail && tokenForm.visitorEmail.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tokenForm.visitorEmail.trim())) {
        errs.visitorEmail = "Invalid email address format";
      }
    }

    if (!tokenForm.issueSummary || !tokenForm.issueSummary.trim()) {
      errs.issueSummary = "Issue summary is required";
    } else if (tokenForm.issueSummary.trim().length < 3) {
      errs.issueSummary = "Issue summary must be at least 3 characters";
    }

    setTokenErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegisterToken = async () => {
    if (!validateTokenForm()) {
      return;
    }
    await registerTokenMut.mutateAsync({
      id,
      payload: {
        visitorName: tokenForm.visitorName.trim(),
        phone: tokenForm.visitorPhone ? tokenForm.visitorPhone.replace(/\D/g, "") : null,
        address: tokenForm.visitorAddress || null,
        purpose: tokenForm.issueSummary.trim() || null,
        departmentId:
          tokenForm.departmentId === "none" ? null : tokenForm.departmentId,
      },
    });
    setTokenDlg(false);
    setTokenErrors({});
    setTokenForm({
      visitorName: "",
      visitorPhone: "",
      visitorEmail: "",
      visitorAddress: "",
      departmentId: "none",
      issueSummary: "",
      priority: "MEDIUM",
    });
    refetchQueue();
    refetchStats();
  };

  const handleCallToken = async (tokenId: string) => {
    await callTokenMut.mutateAsync({ id, tokenId });
    refetchQueue();
  };

  const handleStartToken = async (tokenId: string) => {
    await startTokenMut.mutateAsync({ id, tokenId });
    refetchQueue();
  };

  const handleResolveToken = async (tokenId: string) => {
    await resolveTokenMut.mutateAsync({ id, tokenId });
    refetchQueue();
    refetchStats();
  };

  const handleMarkAbsent = async (tokenId: string) => {
    await absentTokenMut.mutateAsync({ id, tokenId });
    refetchQueue();
    refetchStats();
  };

  const openReferDlg = (token: any) => {
    setActiveToken(token);
    setReferForm({ departmentId: token.departmentId || "", notes: "" });
    setReferDlg(true);
  };

  const handleReferToken = async () => {
    if (!referForm.departmentId) {
      toast.error("Please select a target Department.");
      return;
    }
    await referTokenMut.mutateAsync({
      id,
      tokenId: activeToken.id,
      payload: {
        departmentId: referForm.departmentId,
        notes: referForm.notes || undefined,
      },
    });
    setReferDlg(false);
    refetchQueue();
    refetchStats();
  };

  // Shortcut integrations
  const handleCreateGrievance = async (token: any) => {
    // We can either call backend helper or navigate prefilled to Grievance creation page!
    // Perfect: let's navigate to Grievance Creation Form Page pre-filling the state!
    navigate("/public-requests", {
      state: {
        openCreate: true,
        citizenName: token.visitorName,
        citizenPhone: token.phone,
        issue: token.purpose,
        departmentId: token.departmentId || "",
        janataSessionId: id,
        janataTokenId: token.id,
      },
    });
  };

  const handleCreateTask = async (token: any) => {
    navigate("/tasks", {
      state: {
        openCreate: true,
        title: `Janata Darbar action - ${token.visitorName}`,
        description: token.purpose,
        departmentId: token.departmentId || "",
        janataSessionId: id,
        janataTokenId: token.id,
      },
    });
  };

  return (
    <MainLayout title="Janata Darbar Queue Dashboard">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/janata-darbar">
              <Button variant="outline" size="icon" className="rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-foreground">
                {session.title}
              </h1>
              <p className="text-xs text-muted-foreground">
                Venue: <strong>{session.location}</strong> &bull; Date:{" "}
                {format(new Date(session.date), "PPP")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              className={`${darbarStatus.color} font-bold text-xs uppercase px-3 py-1 border rounded-lg mr-2`}
            >
              {darbarStatus.label}
            </Badge>
            {session.status === "ONGOING" && (
              <Button
                onClick={() => setTokenDlg(true)}
                className="gap-1 font-bold text-xs rounded-xl h-10 bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary"
              >
                <Plus className="h-4 w-4" /> Add Visitor
              </Button>
            )}
          </div>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/30 p-3 rounded-xl text-center">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              Queue Total
            </p>
            <p className="text-lg font-black mt-0.5">{stats.total}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/30 p-3 rounded-xl text-center">
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
              Waiting
            </p>
            <p className="text-lg font-black mt-0.5 text-amber-600">
              {stats.waiting}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/30 p-3 rounded-xl text-center">
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
              Called
            </p>
            <p className="text-lg font-black mt-0.5 text-blue-600">
              {stats.called}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/30 p-3 rounded-xl text-center">
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
              Resolved
            </p>
            <p className="text-lg font-black mt-0.5 text-emerald-600">
              {stats.resolved}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/30 p-3 rounded-xl text-center">
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
              Referred
            </p>
            <p className="text-lg font-black mt-0.5 text-indigo-600">
              {stats.referred}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/30 p-3 rounded-xl text-center">
            <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">
              Absent
            </p>
            <p className="text-lg font-black mt-0.5 text-rose-600">
              {stats.absent}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active session queue monitor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Currently Called / In-Progress Card */}
            <Card className="rounded-2xl border-border/40 overflow-hidden shadow-md">
              <CardHeader className="bg-gradient-to-br from-indigo-50/50 to-blue-50/30 border-b border-border/40 dark:from-slate-900 dark:to-slate-900">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Volume2 className="h-4 w-4 animate-bounce" /> Current Visitor
                  Desk
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {currentToken ? (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl font-black text-foreground">
                            Token #{currentToken.tokenNumber}
                          </span>
                          <Badge
                            className={`${getTokenStatusInfo(currentToken.status).color} font-bold text-[10px] uppercase border`}
                          >
                            {currentToken.status}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-extrabold">
                          {currentToken.visitorName}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {currentToken.phone ||
                            "No contact info provided"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {currentToken.status === "CALLED" && (
                          <Button
                            size="sm"
                            onClick={() => handleStartToken(currentToken.id)}
                            className="h-9 px-3 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl gap-1"
                          >
                            <Play className="h-3.5 w-3.5" /> Start Interview
                          </Button>
                        )}
                        {currentToken.status === "IN_PROGRESS" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                handleResolveToken(currentToken.id)
                              }
                              className="h-9 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                              Spot
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openReferDlg(currentToken)}
                              className="h-9 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1"
                            >
                              <Forward className="h-3.5 w-3.5" /> Refer
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAbsent(currentToken.id)}
                          className="h-9 px-3 text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl gap-1"
                        >
                          <UserX className="h-3.5 w-3.5" /> Absent
                        </Button>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-border/40 text-xs">
                      <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        Issue Summary
                      </Label>
                      <p className="text-foreground leading-relaxed mt-1 font-medium">
                        {currentToken.purpose}
                      </p>
                    </div>

                    {/* Integration shortcut actions */}
                    {currentToken.status === "IN_PROGRESS" && (
                      <div className="border-t border-border/40 pt-4 flex flex-col sm:flex-row gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateGrievance(currentToken)}
                          className="h-9 text-xs font-bold rounded-xl gap-1.5 flex-1 justify-center border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50"
                        >
                          <ClipboardList className="h-4 w-4" /> Convert to
                          Grievance
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateTask(currentToken)}
                          className="h-9 text-xs font-bold rounded-xl gap-1.5 flex-1 justify-center border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-50"
                        >
                          <Plus className="h-4 w-4" /> Convert to Task
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-muted-foreground">
                    <UserCheck className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                    <p>No active token currently being interviewed.</p>
                    {waitingQueue.length > 0 &&
                      session.status === "ONGOING" && (
                        <Button
                          size="sm"
                          onClick={() => handleCallToken(waitingQueue[0].id)}
                          className="mt-3 font-bold rounded-lg h-9"
                        >
                          Call Token #{waitingQueue[0].tokenNumber}
                        </Button>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Waiting Queue List */}
            <Card className="rounded-2xl border-border/40 overflow-hidden shadow-sm">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Waiting Queue ({waitingQueue.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {waitingQueue.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    No visitors in the waiting queue.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold text-xs pl-6">
                          Token
                        </TableHead>
                        <TableHead className="font-bold text-xs">
                          Visitor
                        </TableHead>
                        <TableHead className="font-bold text-xs">
                          Issue
                        </TableHead>
                        <TableHead className="font-bold text-xs">
                          Concern Department
                        </TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waitingQueue.map((t: any) => (
                        <TableRow
                          key={t.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20"
                        >
                          <TableCell className="font-black text-xs text-foreground pl-6">
                            #{t.tokenNumber}
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-foreground">
                            {t.visitorName}
                            <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                              {t.phone || ""}
                            </p>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {t.purpose}
                          </TableCell>
                          <TableCell>
                            <Badge className="font-bold text-[9px] border bg-slate-50 text-slate-800 dark:bg-slate-900/50 dark:text-slate-200">
                              {t.department?.name || "General"}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-6">
                            {session.status === "ONGOING" && !currentToken && (
                              <Button
                                size="sm"
                                onClick={() => handleCallToken(t.id)}
                                className="h-8 text-[10px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                Call Next
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Queue Side History Log */}
          <div className="space-y-6">
            <Card className="rounded-2xl border-border/40 shadow-sm">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Handled / History (
                  {
                    queue.filter(
                      (t: any) =>
                        !["WAITING", "CALLED", "IN_PROGRESS"].includes(
                          t.status,
                        ),
                    ).length
                  }
                  )
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {queue.filter(
                  (t: any) =>
                    !["WAITING", "CALLED", "IN_PROGRESS"].includes(t.status),
                ).length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground">
                    No visitors handled in this session yet.
                  </div>
                ) : (
                  queue
                    .filter(
                      (t: any) =>
                        !["WAITING", "CALLED", "IN_PROGRESS"].includes(
                          t.status,
                        ),
                    )
                    .map((t: any) => {
                      const statInfo = getTokenStatusInfo(t.status);
                      return (
                        <div
                          key={t.id}
                          className="border border-border/40 p-3 rounded-xl flex items-start justify-between text-xs hover:shadow-sm transition-shadow"
                        >
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-black text-foreground">
                                Token #{t.tokenNumber}
                              </span>
                              <Badge
                                className={`${statInfo.color} font-bold text-[9px] uppercase border`}
                              >
                                {statInfo.label}
                              </Badge>
                            </div>
                            <h4 className="font-bold text-foreground">
                              {t.visitorName}
                            </h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                              {t.purpose}
                            </p>
                          </div>
                        </div>
                      );
                    })
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* DIALOG: Register Token */}
        <Dialog
          open={tokenDlg}
          onOpenChange={(open) => {
            setTokenDlg(open);
            if (!open) setTokenErrors({});
          }}
        >
          <DialogContent className="rounded-2xl max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-foreground">
                Register Queue Visitor
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Visitor Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Ramesh Kumar"
                  className={`rounded-xl text-xs h-10 border-border/50 focus-visible:ring-primary/20 ${tokenErrors.visitorName ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
                  value={tokenForm.visitorName}
                  onChange={(e) => {
                    setTokenForm((p) => ({ ...p, visitorName: e.target.value }));
                    if (tokenErrors.visitorName) setTokenErrors((p) => ({ ...p, visitorName: "" }));
                  }}
                />
                {tokenErrors.visitorName && (
                  <p className="text-[11px] text-destructive font-medium">{tokenErrors.visitorName}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Visitor Phone (Optional)</Label>
                  <Input
                    placeholder="10-digit number"
                    maxLength={10}
                    className={`rounded-xl text-xs h-10 border-border/50 focus-visible:ring-primary/20 ${tokenErrors.visitorPhone ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
                    value={tokenForm.visitorPhone}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setTokenForm((p) => ({ ...p, visitorPhone: clean }));
                      if (tokenErrors.visitorPhone) setTokenErrors((p) => ({ ...p, visitorPhone: "" }));
                    }}
                  />
                  {tokenErrors.visitorPhone && (
                    <p className="text-[11px] text-destructive font-medium">{tokenErrors.visitorPhone}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Visitor Email (Optional)
                  </Label>
                  <Input
                    placeholder="Email"
                    type="email"
                    className={`rounded-xl text-xs h-10 border-border/50 focus-visible:ring-primary/20 ${tokenErrors.visitorEmail ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
                    value={tokenForm.visitorEmail}
                    onChange={(e) => {
                      setTokenForm((p) => ({ ...p, visitorEmail: e.target.value }));
                      if (tokenErrors.visitorEmail) setTokenErrors((p) => ({ ...p, visitorEmail: "" }));
                    }}
                  />
                  {tokenErrors.visitorEmail && (
                    <p className="text-[11px] text-destructive font-medium">{tokenErrors.visitorEmail}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Department Concerns (Optional)
                </Label>
                <select
                  className="w-full bg-background border border-border/50 rounded-xl px-3 h-10 text-xs font-medium focus:outline-none"
                  value={tokenForm.departmentId}
                  onChange={(e) =>
                    setTokenForm((p) => ({ ...p, departmentId: e.target.value }))
                  }
                >
                  <option value="none">-- General / No Department --</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Issue Summary <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  placeholder="Briefly summarize the visitor's issue or grievance..."
                  className={`rounded-xl text-xs min-h-[70px] border-border/50 focus-visible:ring-primary/20 ${tokenErrors.issueSummary ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
                  value={tokenForm.issueSummary}
                  onChange={(e) => {
                    setTokenForm((p) => ({ ...p, issueSummary: e.target.value }));
                    if (tokenErrors.issueSummary) setTokenErrors((p) => ({ ...p, issueSummary: "" }));
                  }}
                />
                {tokenErrors.issueSummary && (
                  <p className="text-[11px] text-destructive font-medium">{tokenErrors.issueSummary}</p>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-9 text-xs font-bold"
                onClick={() => setTokenDlg(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={registerTokenMut.isPending}
                className="rounded-xl h-9 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
                onClick={handleRegisterToken}
              >
                {registerTokenMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Register Token
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG: Refer Token */}
        <Dialog open={referDlg} onOpenChange={setReferDlg}>
          <DialogContent className="rounded-2xl max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-foreground">
                Refer Visitor to Department
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Select Target Department <span className="text-destructive">*</span>
                </Label>
                <select
                  className="w-full bg-background border border-border/50 rounded-xl px-3 h-10 text-xs font-medium focus:outline-none"
                  value={referForm.departmentId}
                  onChange={(e) =>
                    setReferForm({ ...referForm, departmentId: e.target.value })
                  }
                >
                  <option value="">-- Choose Department --</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Referral Notes</Label>
                <Textarea
                  placeholder="Write instructions or remarks for the department officer..."
                  className="rounded-xl border-border/50 text-xs min-h-[75px]"
                  value={referForm.notes}
                  onChange={(e) =>
                    setReferForm({ ...referForm, notes: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-9 text-xs font-bold"
                onClick={() => setReferDlg(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={referTokenMut.isPending || !referForm.departmentId}
                className="rounded-xl h-9 text-xs font-bold bg-slate-900 text-white"
                onClick={handleReferToken}
              >
                {referTokenMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Submit Referral
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
