import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  useJanataSessions,
  useDeleteJanataSession,
  useTransitionJanataSession,
  getDarbarStatusInfo,
} from "@/hooks/useJanataDarbar";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  Users,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

export default function JanataDarbarListPage() {
  const { data: sessionsRes, isLoading } = useJanataSessions();
  const deleteMut = useDeleteJanataSession();
  const transitionMut = useTransitionJanataSession();

  const sessions = sessionsRes?.data || [];

  const handleDelete = async (id: string) => {
    if (
      confirm("Are you sure you want to delete this Janata Darbar session?")
    ) {
      await deleteMut.mutateAsync(id);
    }
  };

  const handleStartSession = async (id: string) => {
    await transitionMut.mutateAsync({ id, status: "ONGOING" });
  };

  const handleCloseSession = async (id: string) => {
    await transitionMut.mutateAsync({ id, status: "COMPLETED" });
  };

  // Compute local stats from listing data
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(
    (s: any) => s.status === "ONGOING",
  ).length;
  const scheduledSessions = sessions.filter(
    (s: any) => s.status === "SCHEDULED",
  ).length;
  const completedSessions = sessions.filter(
    (s: any) => s.status === "COMPLETED",
  ).length;

  return (
    <MainLayout title="Janata Darbar Hearings">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Janata Darbar
            </h1>
            <p className="text-muted-foreground">
              Manage public hearing sessions, citizen visitor tokens, and
              grievances queue.
            </p>
          </div>
          <PermissionGate module="meeting" action="create">
            <Link href="/janata-darbar/new">
              <Button className="gap-2 font-bold rounded-xl shadow-sm h-11 bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90">
                <Plus className="h-4 w-4" /> Start New Session
              </Button>
            </Link>
          </PermissionGate>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-border/40 shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Sessions
              </CardTitle>
              <Play className="h-4 w-4 text-amber-500 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-amber-600">
                {activeSessions}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Currently in progress
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/40 shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Scheduled
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-blue-600">
                {scheduledSessions}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Planned sessions
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/40 shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Completed
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-emerald-600">
                {completedSessions}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Closed hearings
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/40 shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Sessions
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{totalSessions}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Registered hearings
              </p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <Card className="rounded-2xl border-border/40 p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </Card>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card border border-border/40 rounded-2xl shadow-sm">
            <HelpCircle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">
              No Janata Darbar sessions created yet.
            </p>
            <PermissionGate module="meeting" action="create">
              <Link href="/janata-darbar/new">
                <Button size="sm" className="mt-4 font-bold rounded-xl">
                  Create First Session
                </Button>
              </Link>
            </PermissionGate>
          </div>
        ) : (
          <Card className="rounded-2xl border-border/40 overflow-hidden shadow-sm bg-card">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="font-bold text-xs">
                    Session Title
                  </TableHead>
                  <TableHead className="font-bold text-xs">Date</TableHead>
                  <TableHead className="font-bold text-xs">Location</TableHead>
                  <TableHead className="font-bold text-xs">Status</TableHead>
                  <TableHead className="font-bold text-xs w-[120px]">
                    Actions
                  </TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s: any) => {
                  const statusInfo = getDarbarStatusInfo(s.status);
                  return (
                    <TableRow
                      key={s.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20"
                    >
                      <TableCell className="font-semibold text-xs text-foreground">
                        <Link
                          href={`/janata-darbar/${s.id}`}
                          className="hover:underline cursor-pointer"
                        >
                          {s.title}
                        </Link>
                        {s.description && (
                          <p className="text-[10px] text-muted-foreground font-normal mt-0.5 line-clamp-1">
                            {s.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(s.date), "PP")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.location || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${statusInfo.color} font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 border`}
                        >
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.status === "SCHEDULED" && (
                          <Button
                            size="sm"
                            onClick={() => handleStartSession(s.id)}
                            className="h-8 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg gap-1"
                          >
                            <Play className="h-3 w-3 fill-current" /> Start
                          </Button>
                        )}
                        {s.status === "ONGOING" && (
                          <Link href={`/janata-darbar/${s.id}`}>
                            <Button
                              size="sm"
                              className="h-8 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg gap-1"
                            >
                              <Users className="h-3 w-3" /> Queue
                            </Button>
                          </Link>
                        )}
                        {s.status === "COMPLETED" && (
                          <Link href={`/janata-darbar/${s.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-[10px] font-bold rounded-lg"
                            >
                              View Stats
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full text-muted-foreground"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-xl"
                          >
                            <PermissionGate module="meeting" action="update">
                              <DropdownMenuItem className="cursor-pointer text-xs font-semibold">
                                <Link href={`/janata-darbar/${s.id}/edit`}>
                                  <span className="flex items-center">
                                    <Edit className="h-4 w-4 mr-2 text-blue-600" />{" "}
                                    Edit Details
                                  </span>
                                </Link>
                              </DropdownMenuItem>
                              {s.status === "ONGOING" && (
                                <DropdownMenuItem
                                  className="cursor-pointer text-xs font-semibold text-green-600"
                                  onClick={() => handleCloseSession(s.id)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />{" "}
                                  Complete Session
                                </DropdownMenuItem>
                              )}
                            </PermissionGate>
                            <PermissionGate module="meeting" action="delete">
                              <DropdownMenuItem
                                className="cursor-pointer text-xs font-semibold text-red-600"
                                onClick={() => handleDelete(s.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                                Session
                              </DropdownMenuItem>
                            </PermissionGate>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
