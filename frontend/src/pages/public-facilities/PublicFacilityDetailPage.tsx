import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  usePublicFacility,
  useDeletePublicFacility,
  useCreateIncharge,
  useUpdateIncharge,
  useDeleteIncharge,
  useToggleInchargeActive,
  getCategoryInfo,
  getStatusInfo,
} from "@/hooks/usePublicFacilities";
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
  adharNumber: "",
  isActive: true,
};

export default function PublicFacilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: res, isLoading } = usePublicFacility(id);
  const deleteMut = useDeletePublicFacility();
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
      <MainLayout title="Public Facility">
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
      <MainLayout title="Public Facility">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Public facility not found</p>
          <Link to="/public-facilities">
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
    navigate("/public-facilities");
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
      adharNumber: ic.adharNumber || "",
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
      adharNumber: inchargeForm.adharNumber || undefined,
      dateOfBirth: inchargeForm.dateOfBirth
        ? new Date(inchargeForm.dateOfBirth).toISOString()
        : undefined,
      appointedDate: inchargeForm.appointedDate
        ? new Date(inchargeForm.appointedDate).toISOString()
        : undefined,
    };

    if (editingIncharge) {
      await updateInchargeMut.mutateAsync({
        publicFacilityId: inst.id,
        inchargeId: editingIncharge.id,
        data: payload,
      });
    } else {
      await createInchargeMut.mutateAsync({
        publicFacilityId: inst.id,
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
    <MainLayout title="Public Facility">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
          <div className="flex items-start gap-4">
            <Link href="/public-facilities">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted border-border/60 shadow-sm shrink-0">
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center p-1.5 border border-primary/20 shrink-0">
                  <img
                    src={catInfo.icon}
                    alt={catInfo.label}
                    className="h-7 w-7 object-contain animate-pulse"
                  />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">{inst.name}</h1>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{inst.subcategory || catInfo.label}</p>
                </div>
                <Badge className={cn("text-[10px] sm:text-xs font-semibold border shadow-none", statusInfo.color)}>
                  {statusInfo.label}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap font-medium">
                <Badge variant="secondary" className="text-[10px] font-semibold gap-1.5 px-2 py-0.5 border">
                  <img
                    src={catInfo.icon}
                    alt={catInfo.label}
                    className="h-3.5 w-3.5 object-contain"
                  />
                  {catInfo.label}
                </Badge>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <Link to={`/wards/${inst.ward.id}`}>
                    <span>Ward #{inst.ward.wardNumber} - {inst.ward.name}</span>
                  </Link>
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <PermissionGate module="institutions" action="update">
              <Link to={`/public-facilities/${inst.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs font-semibold border-border/60 hover:bg-muted shadow-sm">
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
                    className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 h-9 px-3 shadow-sm"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-extrabold text-foreground">Delete "{inst.name}"?</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground">
                      This removes the public facility and all its incharges permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2 sm:gap-0">
                    <AlertDialogCancel className="border-border/60 hover:bg-muted">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
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
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Contact & Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs sm:text-sm pt-4 font-semibold">
              <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl border border-border/40">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-foreground leading-relaxed font-semibold">{inst.address}</span>
              </div>
              {inst.contactNo && (
                <div className="flex items-center gap-3 px-1">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground font-semibold">{inst.contactNo}</span>
                </div>
              )}
              {inst.email && (
                <div className="flex items-center gap-3 px-1">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground font-semibold">{inst.email}</span>
                </div>
              )} 
              {inst.website && (
                <div className="flex items-center gap-3 px-1">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={inst.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-bold"
                  >
                    {inst.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Facility Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30 text-xs sm:text-sm font-semibold">
                {inst.capacity && (
                  <div className="flex justify-between px-6 py-3.5">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-mono font-bold text-foreground">
                      {inst.capacity.toLocaleString()}
                    </span>
                  </div>
                )}
                {inst.establishedDate && (
                  <div className="flex justify-between px-6 py-3.5">
                    <span className="text-muted-foreground">Established</span>
                    <span className="text-foreground">
                      {format(new Date(inst.establishedDate), "dd MMM yyyy")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between px-6 py-3.5">
                  <span className="text-muted-foreground">Ward Location</span>
                  <span className="text-foreground">
                    #{inst.ward.wardNumber} - {inst.ward.name}
                  </span>
                </div>
                <div className="flex justify-between px-6 py-3.5">
                  <span className="text-muted-foreground">Category</span>
                  <span className="flex items-center gap-1.5 text-foreground font-bold">
                    <img
                      src={catInfo.icon}
                      alt={catInfo.label}
                      className="h-4 w-4 object-contain"
                    />
                    {catInfo.label}
                  </span>
                </div>
                <div className="flex justify-between px-6 py-3.5">
                  <span className="text-muted-foreground">Record Created</span>
                  <span className="text-foreground">{format(new Date(inst.createdAt), "dd MMM yyyy")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {inst.description && (
          <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap font-medium">
                {inst.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Incharges */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/30">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4 text-primary animate-pulse" />
              Incharges ({(inst.incharges || []).length})
            </CardTitle>
            <PermissionGate module="institutions" action="create">
              <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/95 text-white h-8 px-3 rounded-lg text-xs" onClick={openAddIncharge}>
                <Plus className="h-3.5 w-3.5" /> Add Incharge
              </Button>
            </PermissionGate>
          </CardHeader>
          <CardContent className="p-0">
            {(inst.incharges || []).length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/50">
                      <TableHead className="h-11 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Name</TableHead>
                      <TableHead className="h-11 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Designation</TableHead>
                      <TableHead className="h-11 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Contact</TableHead>
                      <TableHead className="h-11 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Appointed</TableHead>
                      <TableHead className="h-11 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Status</TableHead>
                      <TableHead className="h-11 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-3 bg-muted/20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...activeIncharges, ...inactiveIncharges].map((ic: any) => (
                      <TableRow
                        key={ic.id}
                        className={cn(
                          "hover:bg-muted/10 transition-colors border-b border-border/40",
                          !ic.isActive && "opacity-50"
                        )}
                      >
                        <TableCell className="py-3 px-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shadow-sm shrink-0">
                              {ic.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">{ic.name}</p>
                              {ic.email && (
                                <p className="text-[10px] text-muted-foreground font-semibold truncate">
                                  {ic.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 align-middle text-xs sm:text-sm font-semibold text-muted-foreground">
                          {ic.designation}
                        </TableCell>
                        <TableCell className="py-3 px-4 align-middle">
                          <div className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-foreground">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {ic.contactNo}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 align-middle text-xs sm:text-sm font-semibold text-foreground">
                          {ic.appointedDate
                            ? format(new Date(ic.appointedDate), "dd MMM yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="py-3 px-4 align-middle">
                          <Badge
                            className={cn(
                              "text-[10px] font-semibold border shadow-none",
                              ic.isActive
                                ? "bg-emerald-100/50 text-emerald-700 border-emerald-200/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground border-border/50"
                            )}
                          >
                            {ic.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            <PermissionGate module="institutions" action="update">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted"
                                disabled={toggleInchargeMut.isPending}
                                onClick={() =>
                                  toggleInchargeMut.mutate({
                                    publicFacilityId: inst.id,
                                    inchargeId: ic.id,
                                  })
                                }
                              >
                                {ic.isActive ? (
                                  <ToggleRight className="h-4 w-4 text-emerald-650" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted"
                                onClick={() => openEditIncharge(ic)}
                              >
                                <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                            </PermissionGate>
                            <PermissionGate module="institutions" action="delete">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="font-extrabold text-foreground text-sm">
                                      Remove Incharge "{ic.name}"?
                                    </AlertDialogTitle>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="gap-2 sm:gap-0">
                                    <AlertDialogCancel className="border-border/60 hover:bg-muted">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
                                      onClick={() =>
                                        deleteInchargeMut.mutate({
                                          publicFacilityId: inst.id,
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
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-10 w-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
                <p className="font-semibold text-sm">No incharges assigned.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Related Public Facilities */}
        {inst.relatedInstitutions?.length > 0 && (
          <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Other Public Facilities in {inst.ward.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {inst.relatedInstitutions.map((ri: any) => {
                  const riInfo = getCategoryInfo(ri.category);
                  return (
                    <Link key={ri.id} to={`/public-facilities/${ri.id}`}>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-muted gap-1.5 py-1.5 px-3 border-border/70 hover:border-primary/25 rounded-lg shadow-sm"
                      >
                        <img
                          src={riInfo.icon}
                          alt={riInfo.label}
                          className="h-4 w-4 object-contain"
                        />
                        <span className="font-semibold text-xs text-foreground">{ri.name}</span>
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
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editingIncharge ? "Edit Incharge Details" : "Add New Incharge"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={inchargeForm.name}
                  onChange={(e) =>
                    setInchargeForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Full name"
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aadhaar Number</Label>
                <Input
                  value={inchargeForm.adharNumber || ""}
                  onChange={(e) =>
                    setInchargeForm((p) => ({
                      ...p,
                      adharNumber: e.target.value,
                    }))
                  }
                  placeholder="1234 5678 9012"
                  maxLength={12}
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
                <Input
                  type="email"
                  value={inchargeForm.email}
                  onChange={(e) =>
                    setInchargeForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="email@domain.com"
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date of Birth</Label>
                <Input
                  type="date"
                  value={inchargeForm.dateOfBirth}
                  onChange={(e) =>
                    setInchargeForm((p) => ({
                      ...p,
                      dateOfBirth: e.target.value,
                    }))
                  }
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Appointed Date</Label>
                <Input
                  type="date"
                  value={inchargeForm.appointedDate}
                  onChange={(e) =>
                    setInchargeForm((p) => ({
                      ...p,
                      appointedDate: e.target.value,
                    }))
                  }
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
            </div>
            {editingIncharge && (
              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={inchargeForm.isActive}
                  onCheckedChange={(v) =>
                    setInchargeForm((p) => ({ ...p, isActive: v }))
                  }
                />
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Status</Label>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="border-border/60 hover:bg-muted"
              onClick={() => setInchargeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary hover:bg-primary/95 text-white"
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
