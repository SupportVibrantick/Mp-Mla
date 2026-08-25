import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  useEvents,
  useEventStats,
  useDeleteEvent,
  useChangeEventStatus,
  getEventStatusInfo
} from "@/hooks/useEvents";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  CalendarDays,
  Plus,
  Search,
  Grid,
  List,
  MoreVertical,
  Edit,
  Trash2,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

export default function EventListPage() {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: eventsData, isLoading } = useEvents({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    type: typeFilter === "all" ? undefined : typeFilter,
  });

  const { data: statsRes } = useEventStats();
  const deleteMut = useDeleteEvent();
  const statusMut = useChangeEventStatus();

  const events = eventsData?.data || [];
  const stats = statsRes?.data || { total: 0, scheduled: 0, active: 0, completed: 0, cancelled: 0 };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      await deleteMut.mutateAsync(id);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await statusMut.mutateAsync({ id, status });
  };

  return (
    <MainLayout title="Events & Rallies">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Events & Rallies</h1>
          <p className="text-muted-foreground">Manage constituency events, rallies, meetings, and public forums.</p>
        </div>
        <PermissionGate module="meeting" action="create">
          <Link href="/events/new">
            <Button className="gap-2 font-bold rounded-xl shadow-sm h-11 bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Create Event
            </Button>
          </Link>
        </PermissionGate>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/40 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Events</CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Events registered</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/40 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Scheduled events</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/40 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Successfully concluded</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/40 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Cancelled sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Views */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card border border-border/40 p-4 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events by title or location..."
              className="pl-9 rounded-xl text-xs h-10 border-border/50 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground hidden sm:inline">Status:</Label>
            <select
              className="bg-background border border-border/50 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground hidden sm:inline">Type:</Label>
            <select
              className="bg-background border border-border/50 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="PUBLIC_MEETING">Public Meeting</option>
              <option value="JANATA_DARBAR">Janata Darbar</option>
              <option value="CONSTITUENCY_VISIT">Constituency Visit</option>
              <option value="VILLAGE_VISIT">Village Visit</option>
              <option value="DEVELOPMENT_INAUGURATION">Development Inauguration</option>
              <option value="PUBLIC_HEARING">Public Hearing</option>
              <option value="OFFICIAL_MEETING">Official Meeting</option>
              <option value="COMMUNITY_EVENT">Community Event</option>
              <option value="PRESS_CONFERENCE">Press Conference</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card border border-border/40 rounded-2xl">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">No events found matching current criteria.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {events.map((event: any) => {
            const statusInfo = getEventStatusInfo(event.status);
            return (
              <Card key={event.id} className="rounded-2xl border-border/40 shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <Badge className={`${statusInfo.color} font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 border`}>
                      {statusInfo.label}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full -mr-2 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <PermissionGate module="meeting" action="update">
                          <DropdownMenuItem className="cursor-pointer text-xs font-semibold">
                            <Link href={`/events/${event.id}/edit`}>
                              <span className="flex items-center"><Edit className="h-4 w-4 mr-2 text-blue-600" /> Edit Details</span>
                            </Link>
                          </DropdownMenuItem>
                          {event.status === "SCHEDULED" && (
                            <DropdownMenuItem className="cursor-pointer text-xs font-semibold text-amber-600" onClick={() => handleStatusChange(event.id, "ACTIVE")}>
                              <Clock className="h-4 w-4 mr-2" /> Start Event
                            </DropdownMenuItem>
                          )}
                          {["SCHEDULED", "ACTIVE"].includes(event.status) && (
                            <>
                              <DropdownMenuItem className="cursor-pointer text-xs font-semibold text-green-600" onClick={() => handleStatusChange(event.id, "COMPLETED")}>
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Complete Event
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer text-xs font-semibold text-rose-600" onClick={() => handleStatusChange(event.id, "CANCELLED")}>
                                <XCircle className="h-4 w-4 mr-2" /> Cancel Event
                              </DropdownMenuItem>
                            </>
                          )}
                        </PermissionGate>
                        <PermissionGate module="meeting" action="delete">
                          <DropdownMenuItem className="cursor-pointer text-xs font-semibold text-red-600" onClick={() => handleDelete(event.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Event
                          </DropdownMenuItem>
                        </PermissionGate>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <Link href={`/events/${event.id}`}>
                      <h3 className="font-extrabold text-base text-foreground hover:text-primary cursor-pointer line-clamp-1 transition-colors">
                        {event.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 min-h-[32px]">{event.description || "No description provided."}</p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      <span>{format(new Date(event.startDate), "PPP")}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 px-5 py-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Type: <strong>{event.type}</strong></span>
                  <Link href={`/events/${event.id}`}>
                    <Button variant="link" className="p-0 h-auto text-xs font-bold text-primary gap-1">
                      Manage Details &rarr;
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow>
                <TableHead className="font-bold text-xs">Title</TableHead>
                <TableHead className="font-bold text-xs">Date</TableHead>
                <TableHead className="font-bold text-xs">Type</TableHead>
                <TableHead className="font-bold text-xs">Location</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event: any) => {
                const statusInfo = getEventStatusInfo(event.status);
                return (
                  <TableRow key={event.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                    <TableCell className="font-semibold text-xs text-foreground">
                      <Link href={`/events/${event.id}`} className="hover:underline cursor-pointer">
                        {event.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(event.startDate), "PP")}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">{event.type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{event.location || "N/A"}</TableCell>
                    <TableCell>
                      <Badge className={`${statusInfo.color} font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 border`}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <PermissionGate module="meeting" action="update">
                            <DropdownMenuItem className="cursor-pointer text-xs font-semibold">
                              <Link href={`/events/${event.id}/edit`}>
                                <span className="flex items-center"><Edit className="h-4 w-4 mr-2 text-blue-600" /> Edit Details</span>
                              </Link>
                            </DropdownMenuItem>
                          </PermissionGate>
                          <PermissionGate module="meeting" action="delete">
                            <DropdownMenuItem className="cursor-pointer text-xs font-semibold text-red-600" onClick={() => handleDelete(event.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete Event
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
