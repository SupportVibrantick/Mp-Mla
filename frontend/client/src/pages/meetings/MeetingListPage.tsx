import { useState } from "react";
import { Link } from "wouter";
import {
  useMeetings,
  useMeetingStats,
  useDeleteMeeting,
  getStatusInfo,
  MEETING_STATUSES
} from "@/hooks/useMeetings";
import { format } from "date-fns";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  CalendarDays,
  Plus,
  Search,
  ExternalLink,
  MapPin,
  Clock,
  Video,
  MoreVertical,
  Edit,
  Trash2,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Monitor,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function MeetingListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  const { data: mRes, isLoading } = useMeetings({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    limit: 100,
  });

  const { data: statsRes } = useMeetingStats();
  const { mutate: deleteMeeting } = useDeleteMeeting();

  const meetings = mRes?.data || [];
  const stats = statsRes?.data || { total: 0, scheduled: 0, completed: 0, cancelled: 0 };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  return (
    <MainLayout title="Meetings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
                <CalendarDays className="h-7 w-7 text-primary" />
              </div>
              Meetings & Events
            </h1>
            <p className="text-muted-foreground mt-1.5 ml-1">
              Organize, track, and manage your constituency engagements.
            </p>
          </div>
          
          <div className="flex gap-2">
            <div className="inline-flex rounded-lg border p-1 bg-muted/50">
              <Button 
                variant={viewMode === "grid" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-8 px-3 rounded-md shadow-sm transition-all"
                onClick={() => setViewMode("grid")}
              >
                Grid
              </Button>
              <Button 
                variant={viewMode === "table" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-8 px-3 rounded-md shadow-sm transition-all"
                onClick={() => setViewMode("table")}
              >
                Table
              </Button>
            </div>
            <PermissionGate module="meeting" action="create">
              <Link href="/meetings/new">
                <Button className="gap-2 shadow-xl shadow-primary/20 hover:translate-y-[-1px] transition-all">
                  <Plus className="h-4 w-4" />
                  New Meeting
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              label: "Total Meetings", 
              value: stats.total, 
              icon: Layers, 
              color: "bg-indigo-500", 
              bg: "bg-indigo-50 dark:bg-indigo-900/10" 
            },
            { 
              label: "Scheduled", 
              value: stats.scheduled, 
              icon: Calendar, 
              color: "bg-blue-500", 
              bg: "bg-blue-50 dark:bg-blue-900/10" 
            },
            { 
              label: "Completed", 
              value: stats.completed, 
              icon: CheckCircle2, 
              color: "bg-emerald-500", 
              bg: "bg-emerald-50 dark:bg-emerald-900/10" 
            },
            { 
              label: "Cancelled", 
              value: stats.cancelled, 
              icon: AlertCircle, 
              color: "bg-rose-500", 
              bg: "bg-rose-50 dark:bg-rose-900/10" 
            },
          ].map((s, i) => (
            <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
              <CardContent className="p-5 flex items-center gap-4 relative">
                <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <s.icon className={`h-6 w-6 text-foreground opacity-80`} style={{ color: s.color.replace('bg-', '') }} />
                </div>
                <div>
                  <p className="text-2xl font-black">{s.value}</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                </div>
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 rounded-full ${s.color}`}></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm border border-white/20">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search meetings by title, description, location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background/50 border-muted-foreground/20 focus:border-primary/50 transition-all rounded-xl"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-background/50 border-muted-foreground/20 rounded-xl shrink-0">
                    <Filter className="h-3.5 w-3.5 mr-2 opacity-50" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {MEETING_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px] bg-background/50 border-muted-foreground/20 rounded-xl shrink-0">
                    <Video className="h-3.5 w-3.5 mr-2 opacity-50" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="OFFLINE">Offline</SelectItem>
                  </SelectContent>
                </Select>

                {(search || statusFilter !== "all" || typeFilter !== "all") && (
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs h-9 rounded-xl hover:bg-destructive/10 hover:text-destructive">
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i} className="rounded-2xl border-none shadow-sm p-6 space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <div className="space-y-2 pt-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-none shadow-sm">
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            </Card>
          )
        ) : meetings.length === 0 ? (
          <Card className="border-dashed border-2 py-20 flex flex-col items-center justify-center bg-transparent rounded-3xl">
            <div className="h-24 w-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
              <CalendarDays className="h-12 w-12 text-primary/30" />
            </div>
            <h3 className="text-2xl font-bold mb-2 tracking-tight">No meetings found</h3>
            <p className="text-muted-foreground max-w-sm text-center mb-8 px-6">
              We couldn't find any meetings matching your current filters. Try searching with different terms.
            </p>
            <Button variant="outline" onClick={resetFilters} className="rounded-xl px-8">
              Clear All Filters
            </Button>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {meetings.map((meeting: any) => {
              const statusInfo = getStatusInfo(meeting.status);
              const isOnline = meeting.type === "ONLINE";
              
              return (
                <Card 
                  key={meeting.id} 
                  className="rounded-xl border shadow-sm hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden"
                >
                  <div className={`h-1.5 w-full ${isOnline ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                  
                  <CardContent className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <Badge className={`${statusInfo.color} font-bold text-[10px] uppercase tracking-wider border-none px-2.5 py-0.5`}>
                        {statusInfo.label}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full -mr-2">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <PermissionGate module="meeting" action="update">
                            <Link href={`/meetings/${meeting.id}/edit`}>
                              <DropdownMenuItem className="cursor-pointer">
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                            </Link>
                          </PermissionGate>
                          <PermissionGate module="meeting" action="delete">
                            <DropdownMenuItem 
                              className="text-red-600 cursor-pointer"
                              onClick={() => {
                                if (window.confirm("Delete meeting?")) deleteMeeting(meeting.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </PermissionGate>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <h3 className="font-bold text-lg mb-2 line-clamp-1">
                      {meeting.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                      {meeting.description || "No description provided."}
                    </p>

                    <div className="space-y-3 mt-auto pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-foreground/80">{format(new Date(meeting.date), "MMM d, yyyy")}</span>
                        {meeting.time && (
                          <span className="text-muted-foreground ml-auto flex items-center gap-1 font-medium">
                            <Clock className="h-3 w-3" /> {meeting.time}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs">
                        {isOnline ? (
                          <Video className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                        <span className="truncate flex-1 font-medium text-foreground/80">
                          {meeting.location || (isOnline ? "Online" : "Main Office")}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5">
                      {isOnline && meeting.meetingLink ? (
                        <Button 
                          className="w-full gap-2 rounded-lg" 
                          onClick={() => window.open(meeting.meetingLink, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                          Join Meeting
                        </Button>
                      ) : (
                        <Link href={`/meetings/${meeting.id}/edit`}>
                          <Button className="w-full rounded-lg" variant="secondary">
                            View Details
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-none shadow-sm overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold">Title</TableHead>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold">Time</TableHead>
                    <TableHead className="font-bold">Type</TableHead>
                    <TableHead className="font-bold">Location / Link</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.map((meeting: any) => {
                    const statusInfo = getStatusInfo(meeting.status);
                    const isOnline = meeting.type === "ONLINE";
                    return (
                      <TableRow key={meeting.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-bold text-sm">{meeting.title}</TableCell>
                        <TableCell className="text-sm">{format(new Date(meeting.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{meeting.time || "--:--"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-lg gap-1.5 font-medium py-1">
                            {isOnline ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                            {meeting.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {isOnline ? (
                            meeting.meetingLink ? (
                              <a href={meeting.meetingLink} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1.5 truncate max-w-[200px]">
                                <ExternalLink className="h-3 w-3" /> Link
                              </a>
                            ) : "No link"
                          ) : (
                            <span className="truncate max-w-[200px] block">{meeting.location || "---"}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusInfo.color} rounded-full border-none px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight`}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <PermissionGate module="meeting" action="update">
                              <Link href={`/meetings/${meeting.id}/edit`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </PermissionGate>
                            <PermissionGate module="meeting" action="delete">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  if (window.confirm("Are you sure?")) deleteMeeting(meeting.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </PermissionGate>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

