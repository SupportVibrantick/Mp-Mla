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
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function MeetingListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [meetingToDelete, setMeetingToDelete] = useState<any | null>(null);

  const { data: mRes, isLoading } = useMeetings({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    limit: 100,
  });

  const { data: statsRes } = useMeetingStats();
  const deleteMut = useDeleteMeeting();

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
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5 text-foreground">
              <CalendarDays className="h-7 w-7 text-primary" /> Meetings & Events
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Organize, track, and manage your constituency engagements
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <div className="inline-flex rounded-xl border border-border/60 p-1 bg-muted/30">
              <Button 
                variant={viewMode === "grid" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-8 px-3 rounded-lg text-xs font-bold transition-all"
                onClick={() => setViewMode("grid")}
              >
                Grid
              </Button>
              <Button 
                variant={viewMode === "table" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-8 px-3 rounded-lg text-xs font-bold transition-all"
                onClick={() => setViewMode("table")}
              >
                Table
              </Button>
            </div>
            <PermissionGate module="meeting" action="create">
              <Link href="/meetings/new">
                <Button className="gap-2 text-xs bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 font-bold">
                  <Plus className="h-3.5 w-3.5" />
                  New Meeting
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              label: "Total Meetings", 
              value: stats.total, 
              icon: Layers, 
              color: "#6366f1", 
            },
            { 
              label: "Scheduled", 
              value: stats.scheduled, 
              icon: Calendar, 
              color: "#3b82f6", 
            },
            { 
              label: "Completed", 
              value: stats.completed, 
              icon: CheckCircle2, 
              color: "#22c55e", 
            },
            { 
              label: "Cancelled", 
              value: stats.cancelled, 
              icon: AlertCircle, 
              color: "#f43f5e", 
            },
          ].map((s, i) => (
            <Card key={i} className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 border border-border/50 bg-card hover:border-primary/25 rounded-2xl">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex justify-between items-center">
                  <div
                    className="p-2.5 rounded-xl border flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${s.color}15`, borderColor: `${s.color}25` }}
                  >
                    <s.icon className="h-4 w-4" style={{ color: s.color }} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                    {s.label}
                  </p>
                  <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground mt-1 font-mono">
                    {s.value}
                  </h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search meetings by title, description, location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background/50 border-muted-foreground/20 rounded-xl"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-background/50 border-muted-foreground/20 rounded-xl shrink-0 text-xs h-9">
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
                  <SelectTrigger className="w-[140px] bg-background/50 border-muted-foreground/20 rounded-xl shrink-0 text-xs h-9">
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
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs h-9 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
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
                <Card key={i} className="rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-full rounded" />
                  <Skeleton className="h-12 w-full rounded" />
                  <div className="space-y-2 pt-2">
                    <Skeleton className="h-4 w-1/2 rounded" />
                    <Skeleton className="h-4 w-2/3 rounded" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            </Card>
          )
        ) : meetings.length === 0 ? (
          <Card className="border-dashed border-2 py-20 flex flex-col items-center justify-center bg-transparent rounded-3xl">
            <div className="h-20 w-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
              <CalendarDays className="h-10 w-10 text-primary/30" />
            </div>
            <h3 className="text-xl font-bold mb-2 tracking-tight text-foreground">No meetings found</h3>
            <p className="text-xs text-muted-foreground max-w-sm text-center mb-6 px-6 font-medium leading-relaxed">
              We couldn't find any meetings matching your current filters. Try searching with different terms.
            </p>
            <Button variant="outline" onClick={resetFilters} className="rounded-xl px-6 text-xs font-bold border-border/60">
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
                  className="rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full overflow-hidden bg-card"
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
                              <DropdownMenuItem className="cursor-pointer font-semibold text-xs">
                                <Edit className="h-4 w-4 mr-2 text-blue-600" /> Edit Meeting
                              </DropdownMenuItem>
                            </Link>
                          </PermissionGate>
                          <PermissionGate module="meeting" action="delete">
                            <DropdownMenuItem 
                              className="text-red-600 cursor-pointer font-semibold text-xs"
                              onClick={() => setMeetingToDelete(meeting)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete Meeting
                            </DropdownMenuItem>
                          </PermissionGate>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-foreground mb-2 line-clamp-1">
                      {meeting.title}
                    </h3>
                    
                    <p className="text-xs sm:text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px] font-semibold leading-relaxed">
                      {meeting.description || "No description provided."}
                    </p>

                    <div className="space-y-3 mt-auto pt-4 border-t border-border/30">
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-bold text-foreground/80">{format(new Date(meeting.date), "MMM d, yyyy")}</span>
                        {meeting.time && (
                          <span className="text-muted-foreground ml-auto flex items-center gap-1 font-bold">
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
                        <span className="truncate flex-1 font-bold text-foreground/80">
                          {meeting.location || (isOnline ? "Online Meeting" : "Constituency Office")}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5">
                      {isOnline && meeting.meetingLink ? (
                        <Button 
                          className="w-full gap-2 rounded-xl text-xs font-bold" 
                          onClick={() => window.open(meeting.meetingLink, "_blank")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Join Meeting
                        </Button>
                      ) : (
                        <Link href={`/meetings/${meeting.id}/edit`}>
                          <Button className="w-full rounded-xl text-xs font-bold" variant="secondary">
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
          <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Title</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Date</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Time</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Type</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Location / Link</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Status</TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.map((meeting: any) => {
                    const statusInfo = getStatusInfo(meeting.status);
                    const isOnline = meeting.type === "ONLINE";
                    return (
                      <TableRow key={meeting.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                        <TableCell className="font-bold text-xs sm:text-sm py-4 px-4">{meeting.title}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-4 px-4 font-semibold text-muted-foreground">{format(new Date(meeting.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-4 px-4 font-mono font-bold text-foreground/80">{meeting.time || "--:--"}</TableCell>
                        <TableCell className="py-4 px-4">
                          <Badge variant="secondary" className="rounded-lg gap-1.5 font-bold py-1 text-[10px]">
                            {isOnline ? <Video className="h-3 w-3 text-blue-500" /> : <MapPin className="h-3 w-3 text-emerald-500" />}
                            {meeting.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-4 px-4 font-semibold">
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
                        <TableCell className="py-4 px-4">
                          <Badge className={`${statusInfo.color} rounded-full border-none px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight`}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-4 px-4">
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
                                onClick={() => setMeetingToDelete(meeting)}
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

        {/* Delete Confirmation Modal */}
        <AlertDialog
          open={!!meetingToDelete}
          onOpenChange={(open) => !open && setMeetingToDelete(null)}
        >
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-extrabold text-foreground flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" /> Confirm Delete
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground font-medium">
                Are you sure you want to delete <strong>{meetingToDelete?.title}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel className="border-border/60 hover:bg-muted" disabled={deleteMut.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteMut.isPending}
                onClick={async (e) => {
                  e.preventDefault();
                  if (meetingToDelete) {
                    await deleteMut.mutateAsync(meetingToDelete.id);
                    setMeetingToDelete(null);
                  }
                }}
                className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
              >
                {deleteMut.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...
                  </>
                ) : (
                  "Delete Meeting"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}


