import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { API_BASE_URL } from "@/lib/api";

const getFileUrl = (url: string) => {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const backendBase = API_BASE_URL.replace("/api", "");
  return `${backendBase}${url}`;
};
import {
  useSchemeApplication,
  useUpdateSchemeApplicationStatus,
  useAssignSchemeApplication,
  useUpdateSchemeApplicationFollowUp,
  useCreateTaskFromApplication,
  useCreateGrievanceFromApplication,
  useUploadApplicationDocument,
  useListApplicationDocuments,
  useDeleteApplicationDocument,
  getSchemeApplicationStatusInfo,
  SCHEME_APPLICATION_STATUSES,
} from "@/hooks/useSchemes";
import { useWards } from "@/hooks/useWards";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  ArrowLeft,
  Edit,
  FileText,
  User,
  MapPin,
  Calendar,
  Globe,
  Phone,
  Mail,
  ClipboardList,
  MessageSquareWarning,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  UserCheck,
  FileCheck,
} from "lucide-react";
import { format } from "date-fns";

export default function SchemeApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: res, isLoading } = useSchemeApplication(id);
  const { data: wardsRes } = useWards({ limit: 100 });
  const { data: usersRes } = useUsers({ limit: 100 });

  const statusMut = useUpdateSchemeApplicationStatus();
  const assignMut = useAssignSchemeApplication();
  const followUpMut = useUpdateSchemeApplicationFollowUp();
  const taskMut = useCreateTaskFromApplication();
  const grievanceMut = useCreateGrievanceFromApplication();
  const uploadDocMut = useUploadApplicationDocument();
  const deleteDocMut = useDeleteApplicationDocument();
  const { data: docsRes } = useListApplicationDocuments(id);

  const [statusDlg, setStatusDlg] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: "", notes: "", rejectionReason: "" });
  const [assignDlg, setAssignDlg] = useState(false);
  const [assignForm, setAssignForm] = useState({ assignedToId: "" });
  const [followUpDlg, setFollowUpDlg] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({ followUpDate: "", notes: "" });
  const [taskDlg, setTaskDlg] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "MEDIUM", dueDate: "" });
  const [grievanceDlg, setGrievanceDlg] = useState(false);
  const [grievanceForm, setGrievanceForm] = useState({ subject: "", description: "", category: "GENERAL", priority: "MEDIUM" });
  const [docDlg, setDocDlg] = useState(false);
  const [docForm, setDocForm] = useState({ fileName: "", fileUrl: "", fileType: "", fileSize: "", documentType: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const s = res?.data;
  const wards = wardsRes?.data?.wards || wardsRes?.data || [];
  const users = usersRes?.data?.users || usersRes?.data || [];
  const documents = docsRes?.data || [];

  if (isLoading)
    return (
      <MainLayout title="Application">
        <div className="space-y-6 max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  if (!s)
    return (
      <MainLayout title="Application">
        <div className="flex flex-col items-center justify-center h-64">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p>Not found</p>
        </div>
      </MainLayout>
    );

  const stInfo = getSchemeApplicationStatusInfo(s.status);

  const openStatusDlg = () => {
    setStatusForm({ status: "", notes: "", rejectionReason: "" });
    setStatusDlg(true);
  };
  const saveStatus = async () => {
    if (!statusForm.status) return;
    await statusMut.mutateAsync({ id: s.id, data: statusForm });
    setStatusDlg(false);
  };

  const openAssignDlg = () => {
    setAssignForm({ assignedToId: s.assignedToId || "" });
    setAssignDlg(true);
  };
  const saveAssign = async () => {
    if (!assignForm.assignedToId) return;
    await assignMut.mutateAsync({ id: s.id, data: assignForm });
    setAssignDlg(false);
  };

  const openFollowUpDlg = () => {
    setFollowUpForm({
      followUpDate: s.followUpDate ? s.followUpDate.split("T")[0] : "",
      notes: s.notes || "",
    });
    setFollowUpDlg(true);
  };
  const saveFollowUp = async () => {
    await followUpMut.mutateAsync({ id: s.id, data: followUpForm });
    setFollowUpDlg(false);
  };

  const openTaskDlg = () => {
    setTaskForm({ title: "", description: "", priority: "MEDIUM", dueDate: "" });
    setTaskDlg(true);
  };
  const saveTask = async () => {
    await taskMut.mutateAsync({ id: s.id, data: taskForm });
    setTaskDlg(false);
  };

  const openGrievanceDlg = () => {
    setGrievanceForm({ subject: "", description: "", category: "GENERAL", priority: "MEDIUM" });
    setGrievanceDlg(true);
  };
  const saveGrievance = async () => {
    await grievanceMut.mutateAsync({ id: s.id, data: grievanceForm });
    setGrievanceDlg(false);
  };

  const openDocDlg = () => {
    setSelectedFile(null);
    setDocForm({ fileName: "", fileUrl: "", fileType: "", fileSize: "", documentType: "" });
    setDocDlg(true);
  };
  const saveDoc = async () => {
    if (!docForm.fileName || !selectedFile) return;
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("fileName", docForm.fileName);
    formData.append("documentType", docForm.documentType);
    formData.append("fileType", docForm.fileType);
    formData.append("fileSize", docForm.fileSize);
    
    await uploadDocMut.mutateAsync({ id: s.id, data: formData });
    setDocDlg(false);
  };

  return (
    <MainLayout title="Application">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link to="/schemes/applications">
              <Button variant="ghost" size="icon" className="h-9 w-9 mt-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold font-mono">{s.applicationNumber}</h1>
                <Badge className={`text-[10px] ${stInfo.color}`}>
                  {stInfo.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {s.scheme?.name} • {s.scheme?.department}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PermissionGate module="scheme_applications" action="manage">
              <Button variant="outline" size="sm" className="gap-1" onClick={openStatusDlg}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Update Status
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={openAssignDlg}>
                <UserCheck className="h-3.5 w-3.5" />
                Assign
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={openFollowUpDlg}>
                <Calendar className="h-3.5 w-3.5" />
                Follow-up
              </Button>
            </PermissionGate>
            <PermissionGate module="scheme_applications" action="update">
              <Link to={`/schemes/applications/${s.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Scheme", value: s.scheme?.name || "—", icon: FileText, color: "#6366f1" },
            { label: "Ward", value: s.ward ? `#${s.ward.wardNumber} ${s.ward.name}` : "—", icon: MapPin, color: "#3b82f6" },
            { label: "Assigned To", value: s.assignedTo?.name || "Unassigned", icon: UserCheck, color: "#f59e0b" },
            { label: "Created", value: format(new Date(s.createdAt), "dd MMM yyyy"), icon: Calendar, color: "#22c55e" },
          ].map((c, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <c.icon className="h-5 w-5 mx-auto mb-1" style={{ color: c.color }} />
                <p className="text-sm font-bold truncate">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Beneficiary Info */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Beneficiary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold">{s.beneficiaryName}</p>
              {s.beneficiaryPhone && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> {s.beneficiaryPhone}
                </p>
              )}
              {s.beneficiaryEmail && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> {s.beneficiaryEmail}
                </p>
              )}
              {s.address && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {s.address}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" />
                Application Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={`text-[10px] ${stInfo.color}`}>{stInfo.label}</Badge>
              </div>
              {s.followUpDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Follow-up</span>
                  <span>{format(new Date(s.followUpDate), "dd MMM yyyy")}</span>
                </div>
              )}
              {s.completedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{format(new Date(s.completedAt), "dd MMM yyyy")}</span>
                </div>
              )}
              {s.rejectionReason && (
                <div>
                  <p className="text-muted-foreground text-xs">Rejection Reason</p>
                  <p className="mt-0.5 text-destructive">{s.rejectionReason}</p>
                </div>
              )}
              {s.notes && (
                <div>
                  <p className="text-muted-foreground text-xs">Notes</p>
                  <p className="mt-0.5">{s.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PermissionGate module="scheme_applications" action="manage">
            <Button variant="outline" className="gap-2" onClick={openTaskDlg}>
              <ClipboardList className="h-4 w-4" />
              Create Task
            </Button>
            <Button variant="outline" className="gap-2" onClick={openGrievanceDlg}>
              <MessageSquareWarning className="h-4 w-4" />
              Create Grievance
            </Button>
            <Button variant="outline" className="gap-2" onClick={openDocDlg}>
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </PermissionGate>
        </div>

        {/* Documents */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Documents ({documents.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No documents uploaded.
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <a href={getFileUrl(d.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {d.fileName}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm">{d.documentType || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {d.fileSize ? `${(d.fileSize / 1024).toFixed(1)} KB` : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(d.createdAt), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <PermissionGate module="scheme_applications" action="delete">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteDocMut.mutate(d.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </PermissionGate>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Related Tasks & Grievances */}
        {(s.tasks?.length > 0 || s.grievances?.length > 0) && (
          <div className="grid md:grid-cols-2 gap-4">
            {s.tasks?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    Related Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {s.tasks.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">{t.taskCode}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {s.grievances?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquareWarning className="h-4 w-4 text-primary" />
                    Related Grievances
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {s.grievances.map((g: any) => (
                    <div key={g.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{g.subject}</p>
                        <p className="text-xs text-muted-foreground font-mono">{g.ticketNumber}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{g.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Status Dialog */}
      <Dialog open={statusDlg} onOpenChange={setStatusDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Application Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Status <span className="text-destructive">*</span></Label>
              <Select
                value={statusForm.status}
                onValueChange={(v) => setStatusForm((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {SCHEME_APPLICATION_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {statusForm.status === "REJECTED" && (
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Textarea
                  value={statusForm.rejectionReason}
                  onChange={(e) => setStatusForm((p) => ({ ...p, rejectionReason: e.target.value }))}
                  rows={2}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={statusForm.notes}
                onChange={(e) => setStatusForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDlg(false)}>Cancel</Button>
            <Button disabled={!statusForm.status || statusMut.isPending} onClick={saveStatus}>
              {statusMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDlg} onOpenChange={setAssignDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Officer <span className="text-destructive">*</span></Label>
              <Select
                value={assignForm.assignedToId}
                onValueChange={(v) => setAssignForm((p) => ({ ...p, assignedToId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select officer" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDlg(false)}>Cancel</Button>
            <Button disabled={!assignForm.assignedToId || assignMut.isPending} onClick={saveAssign}>
              {assignMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={followUpDlg} onOpenChange={setFollowUpDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <Input
                type="date"
                value={followUpForm.followUpDate}
                onChange={(e) => setFollowUpForm((p) => ({ ...p, followUpDate: e.target.value }))}
              />
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
            <Button disabled={followUpMut.isPending} onClick={saveFollowUp}>
              {followUpMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={taskDlg} onOpenChange={setTaskDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Task title"
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
                  <SelectContent>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDlg(false)}>Cancel</Button>
            <Button disabled={taskMut.isPending} onClick={saveTask}>
              {taskMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grievance Dialog */}
      <Dialog open={grievanceDlg} onOpenChange={setGrievanceDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Grievance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={grievanceForm.subject}
                onChange={(e) => setGrievanceForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Grievance subject"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={grievanceForm.description}
                onChange={(e) => setGrievanceForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={grievanceForm.category}
                  onValueChange={(v) => setGrievanceForm((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="SCHEME">Scheme</SelectItem>
                    <SelectItem value="SERVICE">Service</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={grievanceForm.priority}
                  onValueChange={(v) => setGrievanceForm((p) => ({ ...p, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrievanceDlg(false)}>Cancel</Button>
            <Button disabled={grievanceMut.isPending} onClick={saveGrievance}>
              {grievanceMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Dialog */}
      <Dialog open={docDlg} onOpenChange={setDocDlg}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-foreground">Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select Document File <span className="text-destructive">*</span>
              </Label>
              <div className="border-2 border-dashed border-border/80 hover:border-primary/50 bg-muted/15 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 relative hover:bg-muted/20">
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      setSelectedFile(file);
                      setDocForm((prev) => ({
                        ...prev,
                        fileName: prev.fileName || file.name,
                        fileType: file.type,
                        fileSize: String(file.size),
                        documentType: prev.documentType || "OTHER",
                      }));
                    }
                  }}
                />
                <Upload className="h-7 w-7 text-muted-foreground animate-bounce mt-1" />
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
                Document Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={docForm.fileName}
                onChange={(e) => setDocForm((p) => ({ ...p, fileName: e.target.value }))}
                placeholder="Aadhaar Card.pdf"
                className="h-10 rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Document Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={docForm.documentType || "OTHER"}
                onValueChange={(val) => setDocForm((p) => ({ ...p, documentType: val }))}
              >
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder="Select Document Type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="AADHAAR">Aadhaar Card</SelectItem>
                  <SelectItem value="PAN">PAN Card</SelectItem>
                  <SelectItem value="INCOME">Income Certificate</SelectItem>
                  <SelectItem value="CASTE">Caste Certificate</SelectItem>
                  <SelectItem value="RESIDENCE">Residence / Address Proof</SelectItem>
                  <SelectItem value="OTHER">Other Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">File Type</Label>
                <Input
                  disabled
                  value={docForm.fileType}
                  placeholder="e.g. application/pdf"
                  className="h-10 rounded-lg bg-muted/50 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Size (bytes)</Label>
                <Input
                  disabled
                  value={docForm.fileSize}
                  placeholder="e.g. 1024"
                  className="h-10 rounded-lg bg-muted/50 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="border-border/60 hover:bg-muted" onClick={() => setDocDlg(false)}>Cancel</Button>
            <Button disabled={!docForm.fileName || !selectedFile || uploadDocMut.isPending} onClick={saveDoc}>
              {uploadDocMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}