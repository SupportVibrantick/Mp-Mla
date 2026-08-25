import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useContact,
  useDeleteContact,
  useContactInteractions,
  useCreateInteraction,
  useContactFollowUps,
  useCreateFollowUp,
  useTransitionFollowUpStatus,
  useContactTimeline,
  getFollowUpStatusInfo,
  INTERACTION_CHANNELS,
} from "@/hooks/useCrm";
import { useUsers } from "@/hooks/useUsers";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  Users,
  Phone,
  Mail,
  MapPin,
  Tag,
  MessageSquare,
  CalendarClock,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  History,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: res, isLoading } = useContact(id);
  const deleteMut = useDeleteContact();
  const { data: interactionsRes } = useContactInteractions(id);
  const { data: followUpsRes } = useContactFollowUps(id);
  const { data: timelineRes } = useContactTimeline(id);
  const createInteractionMut = useCreateInteraction();
  const createFollowUpMut = useCreateFollowUp();
  const transitionFollowUpMut = useTransitionFollowUpStatus();
  const { data: usersRes } = useUsers({ limit: 100 });

  const [interactionDlg, setInteractionDlg] = useState(false);
  const [interactionForm, setInteractionForm] = useState({ channel: "CALL", summary: "", details: "" });
  const [followUpDlg, setFollowUpDlg] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({ followUpDate: "", assignedToId: "", purpose: "", notes: "" });

  const c = res?.data;
  const interactions = interactionsRes?.data || [];
  const followUps = followUpsRes?.data || [];
  const timeline = timelineRes?.data || [];
  const users = usersRes?.data?.users || usersRes?.data || [];

  if (isLoading)
    return (
      <MainLayout title="Contact">
        <div className="space-y-6 max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  if (!c)
    return (
      <MainLayout title="Contact">
        <div className="flex flex-col items-center justify-center h-64">
          <Users className="h-12 w-12 text-muted-foreground" />
          <p>Not found</p>
        </div>
      </MainLayout>
    );

  const openInteractionDlg = () => {
    setInteractionForm({ channel: "CALL", summary: "", details: "" });
    setInteractionDlg(true);
  };
  const saveInteraction = async () => {
    if (!interactionForm.summary) return;
    await createInteractionMut.mutateAsync({ contactId: c.id, data: interactionForm });
    setInteractionDlg(false);
  };

  const openFollowUpDlg = () => {
    setFollowUpForm({ followUpDate: "", assignedToId: "", purpose: "", notes: "" });
    setFollowUpDlg(true);
  };
  const saveFollowUp = async () => {
    if (!followUpForm.followUpDate || !followUpForm.purpose) return;
    await createFollowUpMut.mutateAsync({ contactId: c.id, data: followUpForm });
    setFollowUpDlg(false);
  };

  const timelineTypeColors: Record<string, string> = {
    CRM_INTERACTION: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    GRIEVANCE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    APPOINTMENT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    SCHEME_APPLICATION: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    JANATA_TOKEN: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <MainLayout title="Contact">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link to="/crm/contacts">
              <Button variant="ghost" size="icon" className="h-9 w-9 mt-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{c.name}</h1>
                <Badge variant="outline" className="text-[10px]">
                  {c.category}
                </Badge>
                {c.relationship && (
                  <Badge variant="secondary" className="text-[10px]">
                    {c.relationship}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                {c.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {c.phone}
                  </span>
                )}
                {c.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {c.email}
                  </span>
                )}
                {c.ward && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> #{c.ward.wardNumber} {c.ward.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PermissionGate module="crm" action="create">
              <Button variant="outline" size="sm" className="gap-1" onClick={openInteractionDlg}>
                <MessageSquare className="h-3.5 w-3.5" />
                Log Interaction
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={openFollowUpDlg}>
                <CalendarClock className="h-3.5 w-3.5" />
                Schedule Follow-up
              </Button>
            </PermissionGate>
            <PermissionGate module="crm" action="update">
              <Link to={`/crm/contacts/${c.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate module="crm" action="delete">
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
                    <AlertDialogTitle>Delete "{c.name}"?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive"
                      onClick={async () => {
                        await deleteMut.mutateAsync(c.id);
                        navigate("/crm/contacts");
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

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Interactions", value: interactions.length, icon: MessageSquare, color: "#6366f1" },
            { label: "Follow-ups", value: followUps.length, icon: CalendarClock, color: "#3b82f6" },
            { label: "Pending Follow-ups", value: followUps.filter((f: any) => f.status === "PENDING").length, icon: Calendar, color: "#f59e0b" },
            { label: "Timeline Events", value: timeline.length, icon: History, color: "#22c55e" },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <s.icon className="h-5 w-5 mx-auto mb-1" style={{ color: s.color }} />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Info & Follow-ups */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {c.address && (
                <div>
                  <p className="text-muted-foreground text-xs">Address</p>
                  <p className="mt-0.5">{c.address}</p>
                </div>
              )}
              {c.tags && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {c.tags.split(",").map((t: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        <Tag className="h-3 w-3 mr-1" />
                        {t.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {c.importantNotes && (
                <div>
                  <p className="text-muted-foreground text-xs">Important Notes</p>
                  <p className="mt-0.5">{c.importantNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                Follow-ups ({followUps.length})
              </CardTitle>
              <PermissionGate module="crm" action="create">
                <Button size="sm" variant="ghost" className="h-7 w-7" onClick={openFollowUpDlg}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent className="space-y-2">
              {followUps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No follow-ups scheduled.
                </p>
              ) : (
                followUps.map((f: any) => {
                  const stInfo = getFollowUpStatusInfo(f.status);
                  return (
                    <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{f.purpose}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(f.followUpDate), "dd MMM yyyy")}
                          {f.assignedTo && ` • ${f.assignedTo.name}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className={`text-[10px] ${stInfo.color}`}>{stInfo.label}</Badge>
                        {f.status === "PENDING" && (
                          <PermissionGate module="crm" action="update">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-green-600"
                              onClick={() => transitionFollowUpMut.mutate({ followUpId: f.id, data: { status: "COMPLETED" } })}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-600"
                              onClick={() => transitionFollowUpMut.mutate({ followUpId: f.id, data: { status: "CANCELLED" } })}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </PermissionGate>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Interactions */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Interactions ({interactions.length})
            </CardTitle>
            <PermissionGate module="crm" action="create">
              <Button size="sm" className="gap-1" onClick={openInteractionDlg}>
                <Plus className="h-3.5 w-3.5" />
                Log Interaction
              </Button>
            </PermissionGate>
          </CardHeader>
          <CardContent className="space-y-2">
            {interactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No interactions logged yet.
              </p>
            ) : (
              interactions.map((i: any) => (
                <div key={i.id} className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">
                      {i.channel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(i.date), "dd MMM yyyy HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-1">{i.summary}</p>
                  {i.details && (
                    <p className="text-xs text-muted-foreground mt-0.5">{i.details}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Activity Timeline ({timeline.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activity recorded for this contact.
              </p>
            ) : (
              timeline.map((t: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="mt-0.5">
                    <Badge className={`text-[10px] ${timelineTypeColors[t.type] || "bg-gray-100 text-gray-700"}`}>
                      {t.type}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.summary}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(t.date), "dd MMM yyyy HH:mm")}
                      </span>
                      {t.status && t.status !== "N/A" && (
                        <Badge variant="outline" className="text-[10px]">
                          {t.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Interaction Dialog */}
      <Dialog open={interactionDlg} onOpenChange={setInteractionDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Channel <span className="text-destructive">*</span></Label>
              <Select
                value={interactionForm.channel}
                onValueChange={(v) => setInteractionForm((p) => ({ ...p, channel: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERACTION_CHANNELS.map((ch) => (
                    <SelectItem key={ch.value} value={ch.value}>
                      {ch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Summary <span className="text-destructive">*</span></Label>
              <Input
                value={interactionForm.summary}
                onChange={(e) => setInteractionForm((p) => ({ ...p, summary: e.target.value }))}
                placeholder="Brief summary"
              />
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                value={interactionForm.details}
                onChange={(e) => setInteractionForm((p) => ({ ...p, details: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInteractionDlg(false)}>Cancel</Button>
            <Button disabled={!interactionForm.summary || createInteractionMut.isPending} onClick={saveInteraction}>
              {createInteractionMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={followUpDlg} onOpenChange={setFollowUpDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Follow-up Date <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={followUpForm.followUpDate}
                onChange={(e) => setFollowUpForm((p) => ({ ...p, followUpDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Purpose <span className="text-destructive">*</span></Label>
              <Input
                value={followUpForm.purpose}
                onChange={(e) => setFollowUpForm((p) => ({ ...p, purpose: e.target.value }))}
                placeholder="Purpose of follow-up"
              />
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={followUpForm.assignedToId}
                onValueChange={(v) => setFollowUpForm((p) => ({ ...p, assignedToId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select officer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={followUpForm.notes}
                onChange={(e) => setFollowUpForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpDlg(false)}>Cancel</Button>
            <Button disabled={!followUpForm.followUpDate || !followUpForm.purpose || createFollowUpMut.isPending} onClick={saveFollowUp}>
              {createFollowUpMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}