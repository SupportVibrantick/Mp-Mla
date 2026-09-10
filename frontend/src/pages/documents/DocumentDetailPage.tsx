import { useState, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import ReactSelect from "react-select";
import {
  useDocument,
  useDeleteDocument,
  useDownloadDocument,
  useUploadDocumentVersion,
  useLinkDocument,
  useUnlinkDocument,
  DOCUMENT_LINK_MODULES,
} from "@/hooks/useDocuments";
import { useGrievances } from "@/hooks/useGrievances";
import { useProjects } from "@/hooks/useProjects";
import { useSchemeApplications } from "@/hooks/useSchemes";
import { useEvents } from "@/hooks/useEvents";
import { useAppointments } from "@/hooks/useAppointments";
import { useTasks } from "@/hooks/useTasks";
import { getFileUrl } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Trash2,
  FileText,
  File,
  Download,
  Upload,
  Link2,
  Unlink,
  Loader2,
  HardDrive,
  User,
  Calendar,
  Layers,
  Globe,
} from "lucide-react";
import { format } from "date-fns";

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: res, isLoading } = useDocument(id);
  const deleteMut = useDeleteDocument();
  const downloadMut = useDownloadDocument();
  const uploadVersionMut = useUploadDocumentVersion();
  const linkMut = useLinkDocument();
  const unlinkMut = useUnlinkDocument();

  const [versionDlg, setVersionDlg] = useState(false);
  const [selectedVersionFile, setSelectedVersionFile] = useState<File | null>(null);
  const [versionForm, setVersionForm] = useState({ fileName: "", fileType: "", fileSize: "" });
  const [linkDlg, setLinkDlg] = useState(false);
  const [linkForm, setLinkForm] = useState({ module: "GRIEVANCE", recordId: "" });

  // Module record queries for searchable linking
  const { data: grievancesRes, isLoading: loadingGrievances } = useGrievances(
    linkDlg && linkForm.module === "GRIEVANCE" ? { limit: 100 } : undefined
  );
  const { data: projectsRes, isLoading: loadingProjects } = useProjects(
    linkDlg && linkForm.module === "PROJECT" ? { limit: 100 } : undefined
  );
  const { data: schemeAppsRes, isLoading: loadingSchemeApps } = useSchemeApplications(
    linkDlg && linkForm.module === "SCHEME_APPLICATION" ? { limit: 100 } : undefined
  );
  const { data: eventsRes, isLoading: loadingEvents } = useEvents(
    linkDlg && linkForm.module === "EVENT" ? { limit: 100 } : undefined
  );
  const { data: appointmentsRes, isLoading: loadingAppointments } = useAppointments(
    linkDlg && linkForm.module === "APPOINTMENT" ? { limit: 100 } : undefined
  );
  const { data: tasksRes, isLoading: loadingTasks } = useTasks(
    linkDlg && linkForm.module === "TASK" ? { limit: 100 } : undefined
  );

  const isRecordsLoading =
    (linkForm.module === "GRIEVANCE" && loadingGrievances) ||
    (linkForm.module === "PROJECT" && loadingProjects) ||
    (linkForm.module === "SCHEME_APPLICATION" && loadingSchemeApps) ||
    (linkForm.module === "EVENT" && loadingEvents) ||
    (linkForm.module === "APPOINTMENT" && loadingAppointments) ||
    (linkForm.module === "TASK" && loadingTasks);

  const recordOptions = useMemo(() => {
    if (linkForm.module === "GRIEVANCE") {
      const list = grievancesRes?.data || (Array.isArray(grievancesRes) ? grievancesRes : []);
      return (Array.isArray(list) ? list : []).map((g: any) => ({
        value: g.id,
        label: `${g.ticketNumber ? `[${g.ticketNumber}] ` : ""}${g.subject || g.description?.slice(0, 35) || "Grievance"}${g.complainantName ? ` • ${g.complainantName}` : ""}`,
      }));
    }
    if (linkForm.module === "PROJECT") {
      const list = projectsRes?.data || (Array.isArray(projectsRes) ? projectsRes : []);
      return (Array.isArray(list) ? list : []).map((p: any) => ({
        value: p.id,
        label: `${p.name}${p.code ? ` (${p.code})` : ""}${p.category ? ` • ${p.category}` : ""}`,
      }));
    }
    if (linkForm.module === "SCHEME_APPLICATION") {
      const list = schemeAppsRes?.data || (Array.isArray(schemeAppsRes) ? schemeAppsRes : []);
      return (Array.isArray(list) ? list : []).map((a: any) => ({
        value: a.id,
        label: `${a.applicationNumber ? `[${a.applicationNumber}] ` : ""}${a.applicantName || "Applicant"} • ${a.scheme?.name || a.schemeName || "Scheme"}`,
      }));
    }
    if (linkForm.module === "EVENT") {
      const list = eventsRes?.data || (Array.isArray(eventsRes) ? eventsRes : []);
      return (Array.isArray(list) ? list : []).map((e: any) => ({
        value: e.id,
        label: `${e.title}${e.location ? ` • ${e.location}` : ""}`,
      }));
    }
    if (linkForm.module === "APPOINTMENT") {
      const list = appointmentsRes?.data || (Array.isArray(appointmentsRes) ? appointmentsRes : []);
      return (Array.isArray(list) ? list : []).map((ap: any) => ({
        value: ap.id,
        label: `${ap.visitorName || "Visitor"} • ${ap.purpose || "Appointment"}`,
      }));
    }
    if (linkForm.module === "TASK") {
      const list = tasksRes?.data || (Array.isArray(tasksRes) ? tasksRes : []);
      return (Array.isArray(list) ? list : []).map((t: any) => ({
        value: t.id,
        label: `${t.title}${t.priority ? ` • ${t.priority}` : ""}`,
      }));
    }
    return [];
  }, [
    linkForm.module,
    grievancesRes,
    projectsRes,
    schemeAppsRes,
    eventsRes,
    appointmentsRes,
    tasksRes,
  ]);

  const d = res?.data;

  if (isLoading)
    return (
      <MainLayout title="Document">
        <div className="space-y-6 max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  if (!d)
    return (
      <MainLayout title="Document">
        <div className="flex flex-col items-center justify-center h-64">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p>Not found</p>
        </div>
      </MainLayout>
    );

  const formatBytes = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openVersionDlg = () => {
    setSelectedVersionFile(null);
    setVersionForm({ fileName: "", fileType: "", fileSize: "" });
    setVersionDlg(true);
  };
  const saveVersion = async () => {
    if (!selectedVersionFile) return;
    const formData = new FormData();
    formData.append("file", selectedVersionFile);
    if (versionForm.fileName) formData.append("fileName", versionForm.fileName);
    if (versionForm.fileType) formData.append("fileType", versionForm.fileType);
    if (versionForm.fileSize) formData.append("fileSize", versionForm.fileSize);

    try {
      await uploadVersionMut.mutateAsync({ id: d.id, data: formData });
      setVersionDlg(false);
    } catch {
      // toast is already handled in mutation onError
    }
  };

  const openLinkDlg = () => {
    setLinkForm({ module: "GRIEVANCE", recordId: "" });
    setLinkDlg(true);
  };
  const saveLink = async () => {
    if (!linkForm.recordId) return;
    await linkMut.mutateAsync({ id: d.id, data: linkForm });
    setLinkDlg(false);
  };

  const handleDownload = async () => {
    const res = await downloadMut.mutateAsync(d.id);
    if (res?.downloadUrl) {
      window.open(getFileUrl(res.downloadUrl), "_blank");
    }
  };

  return (
    <MainLayout title="Document">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link to="/documents">
              <Button variant="ghost" size="icon" className="h-9 w-9 mt-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{d.name}</h1>
                <Badge variant="outline" className="text-[10px]">
                  {d.category}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  v{d.version}
                </Badge>
              </div>
              {d.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {d.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PermissionGate module="documents" action="download">
              <Button variant="outline" size="sm" className="gap-1" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            </PermissionGate>
            <PermissionGate module="documents" action="create">
              <Button variant="outline" size="sm" className="gap-1" onClick={openVersionDlg}>
                <Upload className="h-3.5 w-3.5" />
                New Version
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={openLinkDlg}>
                <Link2 className="h-3.5 w-3.5" />
                Link
              </Button>
            </PermissionGate>
            <PermissionGate module="documents" action="update">
              <Link to={`/documents/${d.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate module="documents" action="delete">
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
                    <AlertDialogTitle>Delete "{d.name}"?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive"
                      onClick={async () => {
                        await deleteMut.mutateAsync(d.id);
                        navigate("/documents");
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
            { label: "Version", value: `v${d.version}`, icon: Layers, color: "#6366f1" },
            { label: "File Size", value: formatBytes(d.fileSize), icon: HardDrive, color: "#3b82f6" },
            { label: "Uploaded By", value: d.uploadedBy?.name || "—", icon: User, color: "#f59e0b" },
            { label: "Uploaded", value: format(new Date(d.createdAt), "dd MMM yyyy"), icon: Calendar, color: "#22c55e" },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <s.icon className="h-5 w-5 mx-auto mb-1" style={{ color: s.color }} />
                <p className="text-sm font-bold truncate">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* File Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <File className="h-4 w-4 text-primary" />
              File Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Name</span>
              <span className="font-mono">{d.fileName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Type</span>
              <span>{d.fileType || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Size</span>
              <span>{formatBytes(d.fileSize)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <Badge variant="outline" className="text-[10px]">{d.category}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Version</span>
              <Badge variant="secondary" className="text-[10px]">v{d.version}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File URL</span>
              <a
                href={getFileUrl(d.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <Globe className="h-3.5 w-3.5" />
                Open File
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Versions */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Version History ({d.versions?.length || 0})
            </CardTitle>
            <PermissionGate module="documents" action="create">
              <Button size="sm" className="gap-1" onClick={openVersionDlg}>
                <Upload className="h-3.5 w-3.5" />
                New Version
              </Button>
            </PermissionGate>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(d.versions || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No version history.
                    </TableCell>
                  </TableRow>
                ) : (
                  d.versions.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          v{v.version}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <a href={getFileUrl(v.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {v.fileName}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm">{formatBytes(v.fileSize)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(v.createdAt), "dd MMM yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Links */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Linked Records ({d.links?.length || 0})
            </CardTitle>
            <PermissionGate module="documents" action="create">
              <Button size="sm" className="gap-1" onClick={openLinkDlg}>
                <Link2 className="h-3.5 w-3.5" />
                Link Record
              </Button>
            </PermissionGate>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Record ID</TableHead>
                  <TableHead>Linked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(d.links || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No linked records.
                    </TableCell>
                  </TableRow>
                ) : (
                  d.links.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {l.module}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{l.recordId}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(l.createdAt), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <PermissionGate module="documents" action="delete">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => unlinkMut.mutate({ id: d.id, linkId: l.id })}
                          >
                            <Unlink className="h-3.5 w-3.5" />
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
      </div>

      {/* Version Dialog */}
      <Dialog open={versionDlg} onOpenChange={setVersionDlg}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select New Version File <span className="text-destructive">*</span>
              </Label>
              <div className="border-2 border-dashed border-border/80 hover:border-primary/50 bg-muted/15 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 relative hover:bg-muted/20">
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      setSelectedVersionFile(file);
                      setVersionForm({
                        fileName: file.name,
                        fileType: file.type || file.name.split(".").pop() || "",
                        fileSize: String(file.size),
                      });
                    }
                  }}
                />
                <Upload className="h-7 w-7 text-muted-foreground animate-bounce mt-1" />
                <span className="text-sm font-semibold text-foreground text-center max-w-[280px] truncate">
                  {selectedVersionFile ? selectedVersionFile.name : "Choose File or Drag & Drop"}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {selectedVersionFile
                    ? formatBytes(selectedVersionFile.size)
                    : "Supports PDF, DOC, DOCX, XLS, Images up to 50MB"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>File Name</Label>
              <Input
                value={versionForm.fileName}
                onChange={(e) => setVersionForm((p) => ({ ...p, fileName: e.target.value }))}
                placeholder="e.g. report-v2.pdf"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">File Type</Label>
                <Input
                  value={versionForm.fileType}
                  onChange={(e) => setVersionForm((p) => ({ ...p, fileType: e.target.value }))}
                  placeholder="e.g. pdf"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">File Size</Label>
                <Input
                  disabled
                  value={versionForm.fileSize ? formatBytes(Number(versionForm.fileSize)) : "—"}
                  className="bg-muted/30"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionDlg(false)}>Cancel</Button>
            <Button disabled={!selectedVersionFile || uploadVersionMut.isPending} onClick={saveVersion}>
              {uploadVersionMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Upload Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={linkDlg} onOpenChange={setLinkDlg}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Module <span className="text-destructive">*</span></Label>
              <Select
                value={linkForm.module}
                onValueChange={(v) => setLinkForm({ module: v, recordId: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_LINK_MODULES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Record <span className="text-destructive">*</span></Label>
                {isRecordsLoading && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    Fetching records...
                  </span>
                )}
              </div>
              <ReactSelect
                isSearchable
                isClearable
                isLoading={isRecordsLoading}
                placeholder={
                  isRecordsLoading
                    ? "Loading records..."
                    : `Search & select ${linkForm.module.toLowerCase().replace("_", " ")}...`
                }
                noOptionsMessage={() => (isRecordsLoading ? "Loading..." : "No records found")}
                options={recordOptions}
                value={recordOptions.find((opt) => opt.value === linkForm.recordId) || null}
                onChange={(val) =>
                  setLinkForm((p) => ({ ...p, recordId: val ? val.value : "" }))
                }
                className="react-select-container text-sm"
                classNamePrefix="react-select"
                styles={{
                  control: (base, state) => ({
                    ...base,
                    backgroundColor: "hsl(var(--background))",
                    borderColor: state.isFocused ? "hsl(var(--primary))" : "hsl(var(--input))",
                    boxShadow: state.isFocused ? "0 0 0 1px hsl(var(--primary))" : "none",
                    borderRadius: "calc(var(--radius) - 2px)",
                    minHeight: "40px",
                    "&:hover": {
                      borderColor: "hsl(var(--primary))",
                    },
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "calc(var(--radius) - 2px)",
                    boxShadow:
                      "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    zIndex: 9999,
                  }),
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected
                      ? "hsl(var(--primary))"
                      : state.isFocused
                      ? "hsl(var(--accent))"
                      : "transparent",
                    color: state.isSelected
                      ? "hsl(var(--primary-foreground))"
                      : state.isFocused
                      ? "hsl(var(--accent-foreground))"
                      : "inherit",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    padding: "8px 12px",
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: "hsl(var(--foreground))",
                  }),
                  input: (base) => ({
                    ...base,
                    color: "hsl(var(--foreground))",
                  }),
                  placeholder: (base) => ({
                    ...base,
                    color: "hsl(var(--muted-foreground))",
                  }),
                }}
                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
              />
              {linkForm.recordId && (
                <p className="text-[11px] text-muted-foreground font-mono truncate">
                  Selected ID: {linkForm.recordId}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDlg(false)}>Cancel</Button>
            <Button disabled={!linkForm.recordId || linkMut.isPending} onClick={saveLink}>
              {linkMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Link Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}