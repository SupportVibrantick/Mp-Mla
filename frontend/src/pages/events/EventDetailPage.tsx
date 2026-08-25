import { useState } from "react";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import {
  useEvent,
  useChangeEventStatus,
  useEventTeam,
  useAddEventTeamMember,
  useRemoveEventTeamMember,
  useEventAgenda,
  useCreateEventAgendaItem,
  useUpdateEventAgendaItem,
  useDeleteEventAgendaItem,
  useEventGuests,
  useCreateEventGuest,
  useUpdateEventGuest,
  useDeleteEventGuest,
  useEventAttendance,
  useCheckInEventAttendee,
  useCheckOutEventAttendee,
  useEventMedia,
  useAddEventMedia,
  useDeleteEventMedia,
  useEventReport,
  useUpsertEventReport,
  getEventStatusInfo
} from "@/hooks/useEvents";
import { useUsers } from "@/hooks/useUsers";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit,
  Loader2,
  FileText,
  Video,
  Image as ImageIcon,
  UserPlus,
  UserX,
  ExternalLink,
  ShieldCheck,
  CheckSquare
} from "lucide-react";
import { toast } from "sonner";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("overview");

  // Main Event Query
  const { data: eventRes, isLoading: isEventLoading } = useEvent(id);
  const event = eventRes?.data;
  const statusMut = useChangeEventStatus();

  // Sub-queries
  const { data: teamRes } = useEventTeam(id);
  const { data: agendaRes } = useEventAgenda(id);
  const { data: guestsRes } = useEventGuests(id);
  const { data: attendanceRes } = useEventAttendance(id);
  const { data: mediaRes } = useEventMedia(id);
  const { data: reportRes } = useEventReport(id);
  const { data: usersRes } = useUsers({ limit: 100 });

  const officers = usersRes?.data?.users || [];
  const team = teamRes?.data || [];
  const agenda = agendaRes?.data || [];
  const guests = guestsRes?.data || [];
  const attendanceList = attendanceRes?.data || [];
  const mediaList = mediaRes?.data || [];
  const report = reportRes?.data || null;

  // Mutations
  const addTeamMemberMut = useAddEventTeamMember();
  const removeTeamMemberMut = useRemoveEventTeamMember();
  const createAgendaItemMut = useCreateEventAgendaItem();
  const updateAgendaItemMut = useUpdateEventAgendaItem();
  const deleteAgendaItemMut = useDeleteEventAgendaItem();
  const createGuestMut = useCreateEventGuest();
  const updateGuestMut = useUpdateEventGuest();
  const deleteGuestMut = useDeleteEventGuest();
  const checkInMut = useCheckInEventAttendee();
  const checkOutMut = useCheckOutEventAttendee();
  const addMediaMut = useAddEventMedia();
  const deleteMediaMut = useDeleteEventMedia();
  const upsertReportMut = useUpsertEventReport();

  // Modal / Dialog States
  const [agendaDlg, setAgendaDlg] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<any>(null);
  const [agendaForm, setAgendaForm] = useState({ title: "", description: "", timeSlot: "" });

  const [guestDlg, setGuestDlg] = useState(false);
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const [guestForm, setGuestForm] = useState({ name: "", phone: "", email: "", isVip: false, designation: "" });

  const [teamDlg, setTeamDlg] = useState(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const [teamRole, setTeamRole] = useState("COORDINATOR");

  const [mediaDlg, setMediaDlg] = useState(false);
  const [mediaForm, setMediaForm] = useState({ title: "", url: "", type: "IMAGE" as "IMAGE" | "VIDEO" });

  const [reportForm, setReportForm] = useState({ summary: "", keyDecisions: "", actionPoints: "", outcomes: "" });
  const [isEditingReport, setIsEditingReport] = useState(false);

  if (isEventLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center">
        <ArrowLeft className="h-10 w-10 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold">Event Not Found</h2>
        <Link href="/events" className="mt-4">
          <Button>Back to Events</Button>
        </Link>
      </div>
    );
  }

  const statusInfo = getEventStatusInfo(event.status);

  const handleStatusChange = async (status: string) => {
    await statusMut.mutateAsync({ id, status });
  };

  // Agenda handlers
  const openAgendaDlg = (item?: any) => {
    if (item) {
      setEditingAgenda(item);
      setAgendaForm({ title: item.title, description: item.description || "", timeSlot: item.timeSlot || "" });
    } else {
      setEditingAgenda(null);
      setAgendaForm({ title: "", description: "", timeSlot: "" });
    }
    setAgendaDlg(true);
  };

  const handleSaveAgenda = async () => {
    if (!agendaForm.title || !agendaForm.timeSlot) {
      toast.error("Title and Time Slot are required.");
      return;
    }
    if (editingAgenda) {
      await updateAgendaItemMut.mutateAsync({ id, agendaId: editingAgenda.id, payload: agendaForm });
    } else {
      await createAgendaItemMut.mutateAsync({ id, payload: agendaForm });
    }
    setAgendaDlg(false);
  };

  const handleDeleteAgenda = async (agendaId: string) => {
    if (confirm("Delete this agenda item?")) {
      await deleteAgendaItemMut.mutateAsync({ id, agendaId });
    }
  };

  // Guest handlers
  const openGuestDlg = (item?: any) => {
    if (item) {
      setEditingGuest(item);
      setGuestForm({
        name: item.name,
        phone: item.phone || "",
        email: item.email || "",
        isVip: !!item.isVip,
        designation: item.designation || ""
      });
    } else {
      setEditingGuest(null);
      setGuestForm({ name: "", phone: "", email: "", isVip: false, designation: "" });
    }
    setGuestDlg(true);
  };

  const handleSaveGuest = async () => {
    if (!guestForm.name) {
      toast.error("Guest Name is required.");
      return;
    }
    if (editingGuest) {
      await updateGuestMut.mutateAsync({ id, guestId: editingGuest.id, payload: guestForm });
    } else {
      await createGuestMut.mutateAsync({ id, payload: guestForm });
    }
    setGuestDlg(false);
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (confirm("Remove this guest?")) {
      await deleteGuestMut.mutateAsync({ id, guestId });
    }
  };

  // Team handlers
  const handleAddTeamMember = async () => {
    if (!selectedOfficerId) return;
    await addTeamMemberMut.mutateAsync({
      id,
      payload: { userId: selectedOfficerId, role: teamRole }
    });
    setTeamDlg(false);
  };

  const handleRemoveTeamMember = async (userId: string) => {
    if (confirm("Remove this staff member?")) {
      await removeTeamMemberMut.mutateAsync({ id, userId });
    }
  };

  // Media handlers
  const handleAddMedia = async () => {
    if (!mediaForm.title || !mediaForm.url) return;
    await addMediaMut.mutateAsync({ id, payload: mediaForm });
    setMediaDlg(false);
    setMediaForm({ title: "", url: "", type: "IMAGE" });
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (confirm("Remove this media link?")) {
      await deleteMediaMut.mutateAsync({ id, mediaId });
    }
  };

  // Report handlers
  const handleSaveReport = async () => {
    await upsertReportMut.mutateAsync({ id, payload: reportForm });
    setIsEditingReport(false);
  };

  const handleStartEditReport = () => {
    if (report) {
      setReportForm({
        summary: report.summary || "",
        keyDecisions: report.keyDecisions || "",
        actionPoints: report.actionPoints || "",
        outcomes: report.outcomes || ""
      });
    } else {
      setReportForm({ summary: "", keyDecisions: "", actionPoints: "", outcomes: "" });
    }
    setIsEditingReport(true);
  };

  return (
    <MainLayout title="Event Details">
      <div className="space-y-6">
      {/* Back button and title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/events">
            <Button variant="outline" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-foreground">{event.title}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
              {format(new Date(event.startDate), "PPP")} &bull; Venue: <strong>{event.location}</strong>
            </p>
          </div>
        </div>

        {/* Status management controls */}
        <div className="flex items-center gap-2">
          <Badge className={`${statusInfo.color} font-bold text-xs uppercase px-3 py-1 border rounded-lg mr-2`}>
            {statusInfo.label}
          </Badge>
          <PermissionGate module="meeting" action="update">
            {event.status === "SCHEDULED" && (
              <Button onClick={() => handleStatusChange("ACTIVE")} className="bg-amber-600 hover:bg-amber-700 font-bold text-xs rounded-xl h-10">
                Start Event
              </Button>
            )}
            {["SCHEDULED", "ACTIVE"].includes(event.status) && (
              <>
                <Button onClick={() => handleStatusChange("COMPLETED")} className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs rounded-xl h-10">
                  Complete Event
                </Button>
                <Button onClick={() => handleStatusChange("CANCELLED")} variant="destructive" className="font-bold text-xs rounded-xl h-10">
                  Cancel Event
                </Button>
              </>
            )}
          </PermissionGate>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details block */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-6 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
              <TabsTrigger value="overview" className="rounded-lg text-xs font-bold py-2">Overview</TabsTrigger>
              <TabsTrigger value="agenda" className="rounded-lg text-xs font-bold py-2">Agenda</TabsTrigger>
              <TabsTrigger value="guests" className="rounded-lg text-xs font-bold py-2">Guests</TabsTrigger>
              <TabsTrigger value="attendance" className="rounded-lg text-xs font-bold py-2">Attendance</TabsTrigger>
              <TabsTrigger value="team" className="rounded-lg text-xs font-bold py-2">Staff</TabsTrigger>
              <TabsTrigger value="media" className="rounded-lg text-xs font-bold py-2">Media</TabsTrigger>
            </TabsList>

            {/* TAB: Overview */}
            <TabsContent value="overview" className="mt-4">
              <Card className="rounded-2xl border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">About the Event</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">{event.description || "No description provided."}</p>
                  <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4 text-xs">
                    <div>
                      <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Start Date/Time</Label>
                      <p className="font-semibold text-foreground mt-0.5">{format(new Date(event.startDate), "PPpp")}</p>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">End Date/Time</Label>
                      <p className="font-semibold text-foreground mt-0.5">{format(new Date(event.endDate), "PPpp")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Agenda */}
            <TabsContent value="agenda" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Event Agenda</h3>
                <PermissionGate module="meeting" action="update">
                  <Button size="sm" onClick={() => openAgendaDlg()} className="gap-1 text-xs font-bold rounded-lg h-9">
                    <Plus className="h-3.5 w-3.5" /> Add Slot
                  </Button>
                </PermissionGate>
              </div>

              {agenda.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-border/30">
                  <p className="text-xs text-muted-foreground">No agenda items scheduled yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agenda.map((item: any) => (
                    <Card key={item.id} className="rounded-xl border-border/40 shadow-sm p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge className="bg-indigo-50 border-indigo-200 text-indigo-700 font-bold text-[10px] mb-1.5 border dark:bg-indigo-950/20 dark:text-indigo-400">
                            {item.timeSlot}
                          </Badge>
                          <h4 className="font-bold text-sm text-foreground">{item.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        </div>
                        <PermissionGate module="meeting" action="update">
                          <div className="flex items-center gap-1.5">
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-blue-600" onClick={() => openAgendaDlg(item)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-red-600" onClick={() => handleDeleteAgenda(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </PermissionGate>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB: Guests */}
            <TabsContent value="guests" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Guest Registry</h3>
                <PermissionGate module="meeting" action="update">
                  <Button size="sm" onClick={() => openGuestDlg()} className="gap-1 text-xs font-bold rounded-lg h-9">
                    <Plus className="h-3.5 w-3.5" /> Add Guest
                  </Button>
                </PermissionGate>
              </div>

              {guests.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-border/30">
                  <p className="text-xs text-muted-foreground">No guests registered for this event.</p>
                </div>
              ) : (
                <Card className="rounded-xl border-border/40 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                      <TableRow>
                        <TableHead className="font-bold text-xs">Name</TableHead>
                        <TableHead className="font-bold text-xs">VIP Status</TableHead>
                        <TableHead className="font-bold text-xs">Designation</TableHead>
                        <TableHead className="font-bold text-xs">RSVP Status</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {guests.map((g: any) => (
                        <TableRow key={g.id}>
                          <TableCell className="font-semibold text-xs text-foreground">
                            {g.name}
                            <p className="text-[10px] text-muted-foreground mt-0.5">{g.phone || g.email || ""}</p>
                          </TableCell>
                          <TableCell>
                            {g.isVip ? (
                              <Badge className="bg-amber-100 border-amber-200 text-amber-800 font-bold text-[9px] border dark:bg-amber-950/20 dark:text-amber-400">VIP</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Regular</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{g.designation || "N/A"}</TableCell>
                          <TableCell>
                            <Badge className="font-bold text-[9px] border">
                              {g.rsvpStatus || "PENDING"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <PermissionGate module="meeting" action="update">
                              <div className="flex items-center gap-1.5">
                                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-blue-600" onClick={() => openGuestDlg(g)}>
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-red-600" onClick={() => handleDeleteGuest(g.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </PermissionGate>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            {/* TAB: Attendance */}
            <TabsContent value="attendance" className="mt-4 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Guest Attendance log</h3>

              {attendanceList.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-border/30">
                  <p className="text-xs text-muted-foreground">No attendance sheet generated or marked.</p>
                </div>
              ) : (
                <Card className="rounded-xl border-border/40 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                      <TableRow>
                        <TableHead className="font-bold text-xs">Guest / Invitee</TableHead>
                        <TableHead className="font-bold text-xs">Attended Status</TableHead>
                        <TableHead className="font-bold text-xs">Check In</TableHead>
                        <TableHead className="font-bold text-xs">Check Out</TableHead>
                        <TableHead className="w-[120px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceList.map((att: any) => (
                        <TableRow key={att.id}>
                          <TableCell className="font-semibold text-xs text-foreground">
                            {att.guestName || "Invited Guest"}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${att.attended ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-700 border-slate-200"} font-bold text-[9px] border`}>
                              {att.attended ? "PRESENT" : "ABSENT"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {att.checkInTime ? format(new Date(att.checkInTime), "p") : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {att.checkOutTime ? format(new Date(att.checkOutTime), "p") : "-"}
                          </TableCell>
                          <TableCell>
                            <PermissionGate module="meeting" action="update">
                              <div className="flex gap-1.5">
                                {!att.checkInTime ? (
                                  <Button size="sm" onClick={() => checkInMut.mutateAsync({ id, attendanceId: att.id })} className="text-[10px] h-7 px-2 font-bold bg-green-600 hover:bg-green-700 text-white">
                                    Check In
                                  </Button>
                                ) : !att.checkOutTime ? (
                                  <Button size="sm" onClick={() => checkOutMut.mutateAsync({ id, attendanceId: att.id })} className="text-[10px] h-7 px-2 font-bold bg-rose-600 hover:bg-rose-700 text-white">
                                    Check Out
                                  </Button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-semibold">Logged</span>
                                )}
                              </div>
                            </PermissionGate>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            {/* TAB: Staff / Team */}
            <TabsContent value="team" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Staff Assignment</h3>
                <PermissionGate module="meeting" action="update">
                  <Button size="sm" onClick={() => setTeamDlg(true)} className="gap-1 text-xs font-bold rounded-lg h-9">
                    <UserPlus className="h-3.5 w-3.5" /> Assign Staff
                  </Button>
                </PermissionGate>
              </div>

              {team.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-border/30">
                  <p className="text-xs text-muted-foreground">No staff members assigned to this event.</p>
                </div>
              ) : (
                <Card className="rounded-xl border-border/40 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                      <TableRow>
                        <TableHead className="font-bold text-xs">Officer / User</TableHead>
                        <TableHead className="font-bold text-xs">Role</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {team.map((m: any) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-semibold text-xs text-foreground">
                            {m.user?.name || "Assigned Officer"}
                            <p className="text-[10px] text-muted-foreground mt-0.5">{m.user?.email || ""}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className="font-bold text-[9px] border bg-slate-100 border-slate-200 text-slate-800">
                              {m.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <PermissionGate module="meeting" action="update">
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-red-600" onClick={() => handleRemoveTeamMember(m.userId)}>
                                <UserX className="h-3.5 w-3.5" />
                              </Button>
                            </PermissionGate>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            {/* TAB: Media */}
            <TabsContent value="media" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Media & Attachments</h3>
                <PermissionGate module="meeting" action="update">
                  <Button size="sm" onClick={() => setMediaDlg(true)} className="gap-1 text-xs font-bold rounded-lg h-9">
                    <Plus className="h-3.5 w-3.5" /> Add Media
                  </Button>
                </PermissionGate>
              </div>

              {mediaList.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-border/30">
                  <p className="text-xs text-muted-foreground">No media attachments found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mediaList.map((m: any) => (
                    <Card key={m.id} className="rounded-xl border-border/40 p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400">
                          {m.type === "VIDEO" ? <Video className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-foreground line-clamp-1">{m.title}</h4>
                          <a href={m.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                            Open Link <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </div>
                      <PermissionGate module="meeting" action="update">
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-red-600" onClick={() => handleDeleteMedia(m.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </PermissionGate>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Info/Report Panel */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-border/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40 bg-slate-50/50 dark:bg-slate-900/30">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">Post-Event Report</CardTitle>
                <CardDescription className="text-xs">Outcomes, decisions, and outcomes.</CardDescription>
              </div>
              <PermissionGate module="meeting" action="update">
                {!isEditingReport && (
                  <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-bold" onClick={handleStartEditReport}>
                    Edit Report
                  </Button>
                )}
              </PermissionGate>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {isEditingReport ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Summary / Outcome Details</Label>
                    <Textarea
                      placeholder="Write brief summary of event execution..."
                      className="rounded-xl border-border/50 text-xs min-h-[90px]"
                      value={reportForm.summary}
                      onChange={(e) => setReportForm({ ...reportForm, summary: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Key Decisions Made</Label>
                    <Textarea
                      placeholder="What was decided? list decisions..."
                      className="rounded-xl border-border/50 text-xs min-h-[70px]"
                      value={reportForm.keyDecisions}
                      onChange={(e) => setReportForm({ ...reportForm, keyDecisions: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Action Points</Label>
                    <Textarea
                      placeholder="Who is responsible for what..."
                      className="rounded-xl border-border/50 text-xs min-h-[70px]"
                      value={reportForm.actionPoints}
                      onChange={(e) => setReportForm({ ...reportForm, actionPoints: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                    <Button size="sm" variant="outline" className="rounded-lg h-8 text-[10px] font-bold" onClick={() => setIsEditingReport(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" className="rounded-lg h-8 text-[10px] font-bold bg-slate-900 text-white" onClick={handleSaveReport}>
                      Save Report
                    </Button>
                  </div>
                </div>
              ) : report ? (
                <div className="space-y-4 text-xs">
                  {report.summary && (
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Summary</Label>
                      <p className="mt-1 text-foreground leading-relaxed bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-border/40">{report.summary}</p>
                    </div>
                  )}
                  {report.keyDecisions && (
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> Decisions
                      </Label>
                      <p className="mt-1 text-foreground leading-relaxed bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-border/40">{report.keyDecisions}</p>
                    </div>
                  )}
                  {report.actionPoints && (
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <CheckSquare className="h-3.5 w-3.5 text-indigo-500" /> Action Items
                      </Label>
                      <p className="mt-1 text-foreground leading-relaxed bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-border/40">{report.actionPoints}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-dashed border-border/60">
                  <FileText className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p>No report submitted for this event yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DIALOG: Agenda slot */}
      <Dialog open={agendaDlg} onOpenChange={setAgendaDlg}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">
              {editingAgenda ? "Edit Agenda Slot" : "Add Agenda Slot"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Time Slot</Label>
              <Input
                placeholder="e.g. 10:00 AM - 11:30 AM"
                className="rounded-xl border-border/50 text-xs h-10"
                value={agendaForm.timeSlot}
                onChange={(e) => setAgendaForm({ ...agendaForm, timeSlot: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Slot Title</Label>
              <Input
                placeholder="e.g. Speech by local Councillor"
                className="rounded-xl border-border/50 text-xs h-10"
                value={agendaForm.title}
                onChange={(e) => setAgendaForm({ ...agendaForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Details / Notes</Label>
              <Textarea
                placeholder="Optional details about this session..."
                className="rounded-xl border-border/50 text-xs min-h-[70px]"
                value={agendaForm.description}
                onChange={(e) => setAgendaForm({ ...agendaForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" className="rounded-xl h-9 text-xs font-bold" onClick={() => setAgendaDlg(false)}>
              Cancel
            </Button>
            <Button size="sm" className="rounded-xl h-9 text-xs font-bold bg-slate-900 text-white" onClick={handleSaveAgenda}>
              Save Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Guest form */}
      <Dialog open={guestDlg} onOpenChange={setGuestDlg}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">
              {editingGuest ? "Edit Guest Invite" : "Add Guest Invite"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Guest Name</Label>
              <Input
                placeholder="e.g. MLA Shri Mayank Goyal"
                className="rounded-xl border-border/50 text-xs h-10"
                value={guestForm.name}
                onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Designation</Label>
              <Input
                placeholder="e.g. Chief Guest, Social Activist"
                className="rounded-xl border-border/50 text-xs h-10"
                value={guestForm.designation}
                onChange={(e) => setGuestForm({ ...guestForm, designation: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone</Label>
                <Input
                  placeholder="Phone"
                  className="rounded-xl border-border/50 text-xs h-10"
                  value={guestForm.phone}
                  onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email</Label>
                <Input
                  placeholder="Email"
                  className="rounded-xl border-border/50 text-xs h-10"
                  value={guestForm.email}
                  onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1.5">
              <input
                type="checkbox"
                id="isVipCheck"
                className="rounded-lg h-4 w-4"
                checked={guestForm.isVip}
                onChange={(e) => setGuestForm({ ...guestForm, isVip: e.target.checked })}
              />
              <Label htmlFor="isVipCheck" className="text-xs font-bold text-amber-600 cursor-pointer">Mark as VIP Invitee</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" className="rounded-xl h-9 text-xs font-bold" onClick={() => setGuestDlg(false)}>
              Cancel
            </Button>
            <Button size="sm" className="rounded-xl h-9 text-xs font-bold bg-slate-900 text-white" onClick={handleSaveGuest}>
              Save Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Team Assignment */}
      <Dialog open={teamDlg} onOpenChange={setTeamDlg}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">Assign Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Staff / Officer</Label>
              <select
                className="w-full bg-background border border-border/50 rounded-xl px-3 h-10 text-xs font-medium focus:outline-none"
                value={selectedOfficerId}
                onChange={(e) => setSelectedOfficerId(e.target.value)}
              >
                <option value="">-- Choose Staff member --</option>
                {officers.map((o: any) => (
                  <option key={o.id} value={o.id}>{o.name} ({o.email})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Event Role</Label>
              <select
                className="w-full bg-background border border-border/50 rounded-xl px-3 h-10 text-xs font-medium focus:outline-none"
                value={teamRole}
                onChange={(e) => setTeamRole(e.target.value)}
              >
                <option value="COORDINATOR">Coordinator</option>
                <option value="MANAGER">Manager</option>
                <option value="SECURITY">Security Lead</option>
                <option value="SUPPORT">Support Staff</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" className="rounded-xl h-9 text-xs font-bold" onClick={() => setTeamDlg(false)}>
              Cancel
            </Button>
            <Button size="sm" className="rounded-xl h-9 text-xs font-bold bg-slate-900 text-white" onClick={handleAddTeamMember}>
              Assign Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Media form */}
      <Dialog open={mediaDlg} onOpenChange={setMediaDlg}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">Add Event Media / Photo URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Media Title</Label>
              <Input
                placeholder="e.g. Inauguration photo, News clipping"
                className="rounded-xl border-border/50 text-xs h-10"
                value={mediaForm.title}
                onChange={(e) => setMediaForm({ ...mediaForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Attachment / URL</Label>
              <Input
                placeholder="https://..."
                className="rounded-xl border-border/50 text-xs h-10"
                value={mediaForm.url}
                onChange={(e) => setMediaForm({ ...mediaForm, url: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Media Type</Label>
              <select
                className="w-full bg-background border border-border/50 rounded-xl px-3 h-10 text-xs font-medium focus:outline-none"
                value={mediaForm.type}
                onChange={(e) => setMediaForm({ ...mediaForm, type: e.target.value as any })}
              >
                <option value="IMAGE">Image / Photo</option>
                <option value="VIDEO">Video Link</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" className="rounded-xl h-9 text-xs font-bold" onClick={() => setMediaDlg(false)}>
              Cancel
            </Button>
            <Button size="sm" className="rounded-xl h-9 text-xs font-bold bg-slate-900 text-white" onClick={handleAddMedia}>
              Add Media Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </MainLayout>
  );
}
