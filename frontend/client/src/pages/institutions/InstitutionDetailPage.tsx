import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useInstitution,
  useDeleteInstitution,
  useCreateIncharge,
  useUpdateIncharge,
  useDeleteIncharge,
  useToggleInchargeActive,
  getCategoryInfo,
  getStatusInfo,
} from "@/hooks/useInstitutions";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertDialogDescription,
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
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  Users,
  Plus,
  User,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { format } from "date-fns";

const emptyIncharge = {
  name: "",
  designation: "",
  contactNo: "",
  email: "",
  dateOfBirth: "",
  appointedDate: "",
  isActive: true,
};

export default function InstitutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: res, isLoading } = useInstitution(id);
  const deleteMut = useDeleteInstitution();
  const createInchargeMut = useCreateIncharge();
  const updateInchargeMut = useUpdateIncharge();
  const deleteInchargeMut = useDeleteIncharge();
  const toggleInchargeMut = useToggleInchargeActive();

  const [inchargeDialog, setInchargeDialog] = useState(false);
  const [editingIncharge, setEditingIncharge] = useState<any>(null);
  const [inchargeForm, setInchargeForm] = useState({ ...emptyIncharge });

  const inst = res?.data;

  if (isLoading) {
    return (
      <MainLayout title="Institution">
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  if (!inst) {
    return (
      <MainLayout title="Institution">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Institution not found</p>
          <Link to="/institutions">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const catInfo = getCategoryInfo(inst.category);
  const statusInfo = getStatusInfo(inst.status);

  const handleDelete = async () => {
    await deleteMut.mutateAsync(inst.id);
    navigate("/institutions");
  };

  const openAddIncharge = () => {
    setEditingIncharge(null);
    setInchargeForm({ ...emptyIncharge });
    setInchargeDialog(true);
  };

  const openEditIncharge = (ic: any) => {
    setEditingIncharge(ic);
    setInchargeForm({
      name: ic.name,
      designation: ic.designation,
      contactNo: ic.contactNo,
      email: ic.email || "",
      dateOfBirth: ic.dateOfBirth ? ic.dateOfBirth.split("T")[0] : "",
      appointedDate: ic.appointedDate ? ic.appointedDate.split("T")[0] : "",
      isActive: ic.isActive,
    });
    setInchargeDialog(true);
  };

  const saveIncharge = async () => {
    if (
      !inchargeForm.name ||
      !inchargeForm.designation ||
      !inchargeForm.contactNo
    )
      return;
    const payload: any = {
      ...inchargeForm,
      email: inchargeForm.email || undefined,
      dateOfBirth: inchargeForm.dateOfBirth
        ? new Date(inchargeForm.dateOfBirth).toISOString()
        : undefined,
      appointedDate: inchargeForm.appointedDate
        ? new Date(inchargeForm.appointedDate).toISOString()
        : undefined,
    };

    if (editingIncharge) {
      await updateInchargeMut.mutateAsync({
        institutionId: inst.id,
        inchargeId: editingIncharge.id,
        data: payload,
      });
    } else {
      await createInchargeMut.mutateAsync({
        institutionId: inst.id,
        data: payload,
      });
    }
    setInchargeDialog(false);
  };

  const activeIncharges = (inst.incharges || []).filter(
    (ic: any) => ic.isActive,
  );
  const inactiveIncharges = (inst.incharges || []).filter(
    (ic: any) => !ic.isActive,
  );

  return (
    <MainLayout title="Institution">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link to="/institutions">
              <Button variant="ghost" size="icon" className="h-9 w-9 mt-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-3xl">{catInfo.icon}</span>
                <h1 className="text-2xl font-bold">{inst.name}</h1>
                <Badge className={`text-[10px] ${statusInfo.color}`}>
                  {statusInfo.label}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {catInfo.label}
                </Badge>
                {inst.subcategory && (
                  <span className="text-xs">{inst.subcategory}</span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <Link to={`/wards/${inst.ward.id}`}>
                    <span className="text-primary hover:underline cursor-pointer">
                      #{inst.ward.wardNumber} {inst.ward.name}
                    </span>
                  </Link>
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <PermissionGate module="institutions" action="update">
              <Link to={`/institutions/${inst.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate module="institutions" action="delete">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive border-destructive/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{inst.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the institution and all its incharges
                      permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </PermissionGate>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Contact & Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <span>{inst.address}</span>
              </div>
              {inst.contactNo && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{inst.contactNo}</span>
                </div>
              )}
              {inst.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{inst.email}</span>
                </div>
              )}
              {inst.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={inst.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {inst.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {inst.capacity && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-mono font-medium">
                    {inst.capacity.toLocaleString()}
                  </span>
                </div>
              )}
              {inst.establishedDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Established</span>
                  <span>
                    {format(new Date(inst.establishedDate), "dd MMM yyyy")}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ward</span>
                <span>
                  #{inst.ward.wardNumber} {inst.ward.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span>
                  {catInfo.icon} {catInfo.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(inst.createdAt), "dd MMM yyyy")}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {inst.description && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {inst.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Incharges */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Incharges ({(inst.incharges || []).length})
            </CardTitle>
            <PermissionGate module="institutions" action="create">
              <Button size="sm" className="gap-1.5" onClick={openAddIncharge}>
                <Plus className="h-3.5 w-3.5" /> Add Incharge
              </Button>
            </PermissionGate>
          </CardHeader>
          <CardContent className="p-0">
            {(inst.incharges || []).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Appointed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...activeIncharges, ...inactiveIncharges].map((ic: any) => (
                    <TableRow
                      key={ic.id}
                      className={!ic.isActive ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold">
                            {ic.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{ic.name}</p>
                            {ic.email && (
                              <p className="text-[10px] text-muted-foreground">
                                {ic.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ic.designation}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {ic.contactNo}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ic.appointedDate
                          ? format(new Date(ic.appointedDate), "dd MMM yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] ${
                            ic.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {ic.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <PermissionGate module="institutions" action="update">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={toggleInchargeMut.isPending}
                              onClick={() =>
                                toggleInchargeMut.mutate({
                                  institutionId: inst.id,
                                  inchargeId: ic.id,
                                })
                              }
                            >
                              {ic.isActive ? (
                                <ToggleRight className="h-3.5 w-3.5" />
                              ) : (
                                <ToggleLeft className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditIncharge(ic)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </PermissionGate>
                          <PermissionGate module="institutions" action="delete">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Remove "{ic.name}"?
                                  </AlertDialogTitle>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={() =>
                                      deleteInchargeMut.mutate({
                                        institutionId: inst.id,
                                        inchargeId: ic.id,
                                      })
                                    }
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </PermissionGate>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No incharges assigned.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Related Institutions */}
        {inst.relatedInstitutions?.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Other Institutions in {inst.ward.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {inst.relatedInstitutions.map((ri: any) => {
                  const riInfo = getCategoryInfo(ri.category);
                  return (
                    <Link key={ri.id} to={`/institutions/${ri.id}`}>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-muted gap-1 py-1.5"
                      >
                        <span>{riInfo.icon}</span>
                        {ri.name}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Incharge Dialog */}
      <Dialog open={inchargeDialog} onOpenChange={setInchargeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingIncharge ? "Edit Incharge" : "Add New Incharge"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={inchargeForm.name}
                  onChange={(e) =>
                    setInchargeForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Designation <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={inchargeForm.designation}
                  onChange={(e) =>
                    setInchargeForm((p) => ({
                      ...p,
                      designation: e.target.value,
                    }))
                  }
                  placeholder="e.g. Principal, SHO"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Contact No <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={inchargeForm.contactNo}
                  onChange={(e) =>
                    setInchargeForm((p) => ({
                      ...p,
                      contactNo: e.target.value,
                    }))
                  }
                  placeholder="9876543210"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={inchargeForm.email}
                  onChange={(e) =>
                    setInchargeForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="email@domain.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={inchargeForm.dateOfBirth}
                  onChange={(e) =>
                    setInchargeForm((p) => ({
                      ...p,
                      dateOfBirth: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Appointed Date</Label>
                <Input
                  type="date"
                  value={inchargeForm.appointedDate}
                  onChange={(e) =>
                    setInchargeForm((p) => ({
                      ...p,
                      appointedDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            {editingIncharge && (
              <div className="flex items-center gap-3">
                <Switch
                  checked={inchargeForm.isActive}
                  onCheckedChange={(v) =>
                    setInchargeForm((p) => ({ ...p, isActive: v }))
                  }
                />
                <Label>Active</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInchargeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveIncharge}
              disabled={
                createInchargeMut.isPending || updateInchargeMut.isPending
              }
            >
              {createInchargeMut.isPending || updateInchargeMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingIncharge ? "Update" : "Add"} Incharge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
