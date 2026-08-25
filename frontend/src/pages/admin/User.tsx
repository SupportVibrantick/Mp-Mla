import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@/hooks/useUsers";
import { useDepartments } from "@/hooks/useDepartments";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  UserPlus,
  MoreHorizontal,
  Shield,
  Loader2,
  KeyRound,
  UserX,
  Pencil,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { MainLayout } from "@/components/layout/MainLayout";

// ─── Schemas ────────────────────────────────────────────

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Needs uppercase letter")
    .regex(/[0-9]/, "Needs a number"),
  phone: z.string().min(10, "Minimum 10 digits").optional().or(z.literal("")),
  designation: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  role: z.enum(["SYSTEM_ADMIN", "MLA_MP", "OFFICE_STAFF"], {
    required_error: "Please select a role",
  }),
});

const editUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional().or(z.literal("")),
  designation: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  role: z.enum(["SYSTEM_ADMIN", "MLA_MP", "OFFICE_STAFF"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

type CreateForm = z.infer<typeof createUserSchema>;
type EditForm = z.infer<typeof editUserSchema>;

// ─── Role badge helpers ─────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: "System Admin",
  MLA_MP: "MLA / MP",
  OFFICE_STAFF: "Office Staff",
};

const STATUS_CONFIG: Record<
  string,
  { icon: any; color: string; label: string }
> = {
  ACTIVE: { icon: CheckCircle2, color: "text-green-600", label: "Active" },
  INACTIVE: {
    icon: XCircle,
    color: "text-muted-foreground",
    label: "Inactive",
  },
  SUSPENDED: {
    icon: AlertTriangle,
    color: "text-orange-500",
    label: "Suspended",
  },
};

// ─── Main Component ─────────────────────────────────────

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, any> = { page, limit: 15 };
    if (search) params.search = search;
    if (roleFilter !== "all") params.role = roleFilter;
    if (statusFilter !== "all") params.status = statusFilter;
    if (departmentFilter !== "all") params.departmentId = departmentFilter;
    return params;
  }, [search, roleFilter, statusFilter, departmentFilter, page]);

  const { data, isLoading } = useUsers(queryParams);
  const { data: deptRes } = useDepartments({ limit: 200 });
  const departments = deptRes?.data || [];
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const users = data?.data?.users || [];
  const pagination = data?.data?.pagination;

  // ─── Create Form ────────────────────────────────────
  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      designation: "",
      departmentId: "",
      role: undefined as any,
    },
  });

  const handleCreate = async (formData: CreateForm) => {
    await createMutation.mutateAsync({
      ...formData,
      designation: formData.designation || null,
      departmentId: formData.departmentId || null,
    });
    setCreateOpen(false);
    createForm.reset();
    setShowPassword(false);
  };

  // ─── Edit Form ──────────────────────────────────────
  const editForm = useForm<EditForm>({
    resolver: zodResolver(editUserSchema),
  });

  const openEdit = (user: any) => {
    setSelectedUser(user);
    editForm.reset({
      name: user.name,
      phone: user.phone || "",
      designation: user.designation || "",
      departmentId: user.departmentId || "",
      role: user.role,
      status: user.status,
    });
    setEditOpen(true);
  };

  const handleEdit = async (formData: EditForm) => {
    if (!selectedUser) return;
    await updateMutation.mutateAsync({
      id: selectedUser.id,
      data: {
        ...formData,
        designation: formData.designation || null,
        departmentId: formData.departmentId || null,
      },
    });
    setEditOpen(false);
    setSelectedUser(null);
  };

  // ─── Delete ─────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedUser) return;
    await deleteMutation.mutateAsync(selectedUser.id);
    setDeleteOpen(false);
    setSelectedUser(null);
  };

  return (
    <MainLayout title="User Management">
      <div className="space-y-6">
        {/* ─── Page Header ───────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5 text-foreground">
              <Users className="h-7 w-7 text-primary" /> User Directory
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Create and manage user accounts, roles, departments, and designations
            </p>
          </div>

          <PermissionGate module="users" action="create">
            <Button
              onClick={() => {
                createForm.reset();
                setShowPassword(false);
                setCreateOpen(true);
              }}
              className="gap-2 text-xs bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 font-bold rounded-xl h-9"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add User
            </Button>
          </PermissionGate>
        </div>

        {/* ─── Filters ───────────────────────────────── */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or designation..."
                  className="pl-9 bg-background/50 border-muted-foreground/20 rounded-xl h-9 text-xs"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(v) => {
                  setRoleFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[160px] bg-background/50 border-muted-foreground/20 rounded-xl text-xs h-9">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
                  <SelectItem value="MLA_MP">MLA / MP</SelectItem>
                  <SelectItem value="OFFICE_STAFF">Office Staff</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[150px] bg-background/50 border-muted-foreground/20 rounded-xl text-xs h-9">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={departmentFilter}
                onValueChange={(v) => {
                  setDepartmentFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[220px] bg-background/50 border-muted-foreground/20 rounded-xl text-xs h-9">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ─── Users Table ───────────────────────────── */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="hover:bg-transparent border-b border-border/50">
                  <th className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">User</th>
                  <th className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Role</th>
                  <th className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Department</th>
                  <th className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20 hidden md:table-cell">Status</th>
                  <th className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20 hidden lg:table-cell">Last Login</th>
                  <th className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20 hidden lg:table-cell">Created By</th>
                  <th className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-32 rounded" />
                            <Skeleton className="h-3 w-48 mt-1.5 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="px-4 py-4 hidden lg:table-cell"><Skeleton className="h-4 w-24 rounded" /></td>
                      <td className="px-4 py-4 hidden lg:table-cell"><Skeleton className="h-4 w-20 rounded" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-xs sm:text-sm font-semibold text-muted-foreground leading-relaxed">
                      No users found matching your filters.
                    </td>
                  </tr>
                ) : (
                  users.map((u: any) => {
                    const statusCfg =
                      STATUS_CONFIG[u.status] || STATUS_CONFIG.INACTIVE;
                    const StatusIcon = statusCfg.icon;
                    const isCurrentUser = u.id === currentUser?.id;

                    let roleBadgeColor = "bg-slate-500/10 text-slate-500";
                    if (u.role === "SYSTEM_ADMIN") roleBadgeColor = "bg-slate-500/10 text-slate-700 dark:text-slate-300";
                    else if (u.role === "MLA_MP") roleBadgeColor = "bg-blue-500/10 text-blue-500";
                    else if (u.role === "OFFICE_STAFF") roleBadgeColor = "bg-emerald-500/10 text-emerald-500";

                    return (
                      <tr key={u.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-extrabold text-sm shrink-0 border border-primary/20">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-foreground text-xs sm:text-sm">{u.name}</span>
                                {isCurrentUser && (
                                  <Badge className="text-[9px] font-bold px-1.5 py-0 bg-primary/10 text-primary border-none">You</Badge>
                                )}
                                {u.forcePasswordChange && (
                                  <Badge className="text-[9px] font-bold px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none">Reset Required</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 font-semibold">
                                <span className="truncate">{u.email}</span>
                                {u.phone && <span className="hidden sm:inline"> • {u.phone}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${roleBadgeColor}`}>
                            <Shield className="h-3 w-3" />
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                          {u.designation && (
                            <p className="mt-1 text-[9px] font-semibold text-muted-foreground">{u.designation}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          {u.departmentRef ? (
                            <Badge variant="outline" className="text-[9px] font-bold border-border/60">
                              <Building2 className="h-3 w-3 mr-1" />
                              {u.departmentRef.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground italic font-medium">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell align-middle">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold ${statusCfg.color}`}>
                            <StatusIcon className="h-3.5 w-3.5 opacity-80" />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell align-middle">
                          {u.lastLoginAt ? (
                            <span className="text-xs text-muted-foreground/95 flex items-center gap-1 font-semibold">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(u.lastLoginAt), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic font-medium">Never</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell align-middle">
                          <span className="text-xs text-muted-foreground font-semibold">{u.createdByAdmin?.name || "—"}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right align-middle">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <PermissionGate module="users" action="update">
                                <DropdownMenuItem onClick={() => openEdit(u)} className="cursor-pointer font-semibold text-xs">
                                  <Pencil className="mr-2 h-3.5 w-3.5 text-blue-600" /> Edit User
                                </DropdownMenuItem>
                              </PermissionGate>
                              <PermissionGate module="users" action="update">
                                <DropdownMenuItem
                                  onClick={() => setLocation(`/users/${u.id}/permissions`)}
                                  className="cursor-pointer font-semibold text-xs"
                                >
                                  <KeyRound className="mr-2 h-3.5 w-3.5 text-indigo-600" />{" "}
                                  Manage Permissions
                                </DropdownMenuItem>
                              </PermissionGate>
                              <PermissionGate module="users" action="delete">
                                {!isCurrentUser && u.status === "ACTIVE" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedUser(u);
                                        setDeleteOpen(true);
                                      }}
                                      className="cursor-pointer text-destructive focus:text-destructive font-semibold text-xs"
                                    >
                                      <UserX className="mr-2 h-3.5 w-3.5" />{" "} Deactivate
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </PermissionGate>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border/30">
              <p className="text-xs font-semibold text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl border-border/60" disabled={!pagination.hasPrevPage} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button key={pageNum} variant={pageNum === pagination.page ? "default" : "outline"} size="icon" className="h-8 w-8 rounded-xl font-bold text-xs" onClick={() => setPage(pageNum)}>
                      {pageNum}
                    </Button>
                  );
                })}
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl border-border/60" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with role-based permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-name">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="create-name"
                {...createForm.register("name")}
                placeholder="John Doe"
              />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">Email Address <span className="text-destructive">*</span></Label>
              <Input
                id="create-email"
                type="email"
                {...createForm.register("email")}
                placeholder="john.doe@example.com"
              />
              {createForm.formState.errors.email && (
                <p className="text-xs text-destructive">{createForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-password">Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="create-password"
                  type={showPassword ? "text" : "password"}
                  {...createForm.register("password")}
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
              {createForm.formState.errors.password && (
                <p className="text-xs text-destructive">{createForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-phone">Phone Number</Label>
                <Input
                  id="create-phone"
                  {...createForm.register("phone")}
                  placeholder="10-digit mobile"
                />
                {createForm.formState.errors.phone && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-designation">Designation</Label>
                <Input
                  id="create-designation"
                  {...createForm.register("designation")}
                  placeholder="e.g. Officer, Assistant"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role <span className="text-destructive">*</span></Label>
                <Select
                  onValueChange={(val) => createForm.setValue("role", val as any, { shouldValidate: true })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
                    <SelectItem value="MLA_MP">MLA / MP</SelectItem>
                    <SelectItem value="OFFICE_STAFF">Office Staff</SelectItem>
                  </SelectContent>
                </Select>
                {createForm.formState.errors.role && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.role.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  onValueChange={(val) => createForm.setValue("departmentId", val === "none" ? "" : val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">— None —</SelectItem>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
            <DialogDescription>
              Update user details, role, department, and account status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="edit-name"
                {...editForm.register("name")}
              />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  {...editForm.register("phone")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-designation">Designation</Label>
                <Input
                  id="edit-designation"
                  {...editForm.register("designation")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role <span className="text-destructive">*</span></Label>
                <Select
                  value={editForm.watch("role")}
                  onValueChange={(val) => editForm.setValue("role", val as any, { shouldValidate: true })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
                    <SelectItem value="MLA_MP">MLA / MP</SelectItem>
                    <SelectItem value="OFFICE_STAFF">Office Staff</SelectItem>
                  </SelectContent>
                </Select>
                {editForm.formState.errors.role && (
                  <p className="text-xs text-destructive">{editForm.formState.errors.role.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={editForm.watch("departmentId") || "none"}
                  onValueChange={(val) => editForm.setValue("departmentId", val === "none" ? "" : val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">— None —</SelectItem>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Account Status <span className="text-destructive">*</span></Label>
              <Select
                value={editForm.watch("status")}
                onValueChange={(val) => editForm.setValue("status", val as any, { shouldValidate: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
              {editForm.formState.errors.status && (
                <p className="text-xs text-destructive">{editForm.formState.errors.status.message}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate User Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{selectedUser?.name}</strong>'s account?
              This will block their access and change their status to INACTIVE.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}