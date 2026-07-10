import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Plus,
  Pencil,
  Search,
  UserCheck,
  UserX,
  ShieldAlert,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { platformUsersApi } from "@/lib/api";

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["SUPER_ADMIN", "PLATFORM_ADMIN", "BILLING_MANAGER", "SUPPORT_STAFF"]),
});

const editUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  role: z.enum(["SUPER_ADMIN", "PLATFORM_ADMIN", "BILLING_MANAGER", "SUPPORT_STAFF"]),
  isActive: z.boolean(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type EditUserForm = z.infer<typeof editUserSchema>;

function getRoleBadgeStyle(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "border-rose-200 bg-rose-50 text-rose-700 font-semibold";
    case "PLATFORM_ADMIN":
      return "border-blue-200 bg-blue-50 text-blue-700 font-semibold";
    case "BILLING_MANAGER":
      return "border-amber-200 bg-amber-50 text-amber-700 font-semibold";
    case "SUPPORT_STAFF":
      return "border-slate-200 bg-slate-50 text-slate-700 font-semibold";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "PLATFORM_ADMIN":
      return "Platform Admin";
    case "BILLING_MANAGER":
      return "Billing Manager";
    case "SUPPORT_STAFF":
      return "Support Staff";
    default:
      return role;
  }
}

export default function PlatformUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [toggleStatusAlert, setToggleStatusAlert] = useState<any>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["platform-users"],
    queryFn: () => platformUsersApi.list().then((r) => r.data.data),
  });

  const createForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "SUPPORT_STAFF",
    },
  });

  const editForm = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "SUPPORT_STAFF",
      isActive: true,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: CreateUserForm) => platformUsersApi.create(data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["platform-users"] });
      setCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "User Created",
        description: res?.data?.message || "Platform user account created successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: err?.response?.data?.message || "Could not create user account.",
      });
    },
  });

  const editUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditUserForm }) =>
      platformUsersApi.update(id, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["platform-users"] });
      setEditDialogOpen(false);
      editForm.reset();
      toast({
        title: "User Updated",
        description: res?.data?.message || "Platform user account updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: err?.response?.data?.message || "Could not update user account.",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      platformUsersApi.update(id, { isActive }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["platform-users"] });
      setToggleStatusAlert(null);
      toast({
        title: "Status Updated",
        description: res?.data?.message || "User account status updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Status Toggle Failed",
        description: err?.response?.data?.message || "Could not toggle user account status.",
      });
    },
  });

  const openCreateDialog = () => {
    createForm.reset({
      name: "",
      email: "",
      password: "",
      role: "SUPPORT_STAFF",
    });
    setCreateDialogOpen(true);
  };

  const openEditDialog = (user: any) => {
    setSelectedUser(user);
    editForm.reset({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      password: "",
    });
    setEditDialogOpen(true);
  };

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const lower = search.toLowerCase();
    return users.filter(
      (u: any) =>
        u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower),
    );
  }, [users, search]);

  const total = filteredUsers.length;
  const totalPages = Math.ceil(total / limit);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredUsers.slice(start, start + limit);
  }, [filteredUsers, page, limit]);

  const handleCreateSubmit = (values: CreateUserForm) => {
    createUserMutation.mutate(values);
  };

  const handleEditSubmit = (values: EditUserForm) => {
    if (!selectedUser) return;
    editUserMutation.mutate({ id: selectedUser.id, data: values });
  };

  const handleConfirmToggleStatus = () => {
    if (!toggleStatusAlert) return;
    toggleStatusMutation.mutate({
      id: toggleStatusAlert.id,
      isActive: !toggleStatusAlert.isActive,
    });
  };

  return (
    <MainLayout title="Platform Users">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Platform Users</h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Manage master dashboard staff, control administrative access roles, and audit operations.
            </p>
          </div>
          <Button className="gap-2" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            New user
          </Button>
        </div>

        <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Staff Accounts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                All platform users who can access this admin panel.
              </p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search staff accounts..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Created At</th>
                  <th className="pb-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  Array.from({ length: limit }).map((_, index) => (
                    <tr key={index}>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3.5 w-36" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </td>
                      <td className="py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="py-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="py-4">
                        <Skeleton className="ml-auto h-8 w-8 rounded-md" />
                      </td>
                    </tr>
                  ))
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      No platform users found.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user: any) => (
                    <tr key={user.id}>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border/80">
                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
                              {user.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground leading-none">{user.name}</p>
                            <p className="text-xs text-muted-foreground mt-1.5">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge variant="outline" className={getRoleBadgeStyle(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Badge
                          variant="outline"
                          className={
                            user.isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold"
                              : "border-rose-200 bg-rose-50 text-rose-700 font-semibold"
                          }
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-4 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-4">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Account
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setToggleStatusAlert(user)}
                                className={user.isActive ? "text-destructive focus:text-destructive" : "text-emerald-700 focus:text-emerald-700"}
                              >
                                {user.isActive ? (
                                  <>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Deactivate Account
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Activate Account
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{" "}
                <span className="font-medium">{Math.min(page * limit, total)}</span> of{" "}
                <span className="font-medium">{total}</span> accounts
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Create Staff Account</DialogTitle>
              <DialogDescription>
                Assign names, email credentials, and dashboard permissions to a platform employee.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-name">Name</Label>
                <Input id="create-name" placeholder="John Doe" {...createForm.register("name")} />
                {createForm.formState.errors.name && (
                  <p className="text-xs text-destructive font-semibold">
                    {createForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-email">Email</Label>
                <Input id="create-email" type="email" placeholder="john@example.com" {...createForm.register("email")} />
                {createForm.formState.errors.email && (
                  <p className="text-xs text-destructive font-semibold">
                    {createForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-password">Password</Label>
                <Input id="create-password" type="password" placeholder="••••••••" {...createForm.register("password")} />
                {createForm.formState.errors.password && (
                  <p className="text-xs text-destructive font-semibold">
                    {createForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={createForm.watch("role")}
                  onValueChange={(val) => createForm.setValue("role", val as any, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    <SelectItem value="PLATFORM_ADMIN">Platform Admin</SelectItem>
                    <SelectItem value="BILLING_MANAGER">Billing Manager</SelectItem>
                    <SelectItem value="SUPPORT_STAFF">Support Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Edit Staff Account</DialogTitle>
              <DialogDescription>
                Modify permissions, name, or change the credentials for {selectedUser?.name}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" {...editForm.register("name")} />
                {editForm.formState.errors.name && (
                  <p className="text-xs text-destructive font-semibold">
                    {editForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" {...editForm.register("email")} />
                {editForm.formState.errors.email && (
                  <p className="text-xs text-destructive font-semibold">
                    {editForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-password">Password (Optional)</Label>
                <Input id="edit-password" type="password" placeholder="Leave blank to keep unchanged" {...editForm.register("password")} />
                {editForm.formState.errors.password && (
                  <p className="text-xs text-destructive font-semibold">
                    {editForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={editForm.watch("role")}
                  onValueChange={(val) => editForm.setValue("role", val as any, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    <SelectItem value="PLATFORM_ADMIN">Platform Admin</SelectItem>
                    <SelectItem value="BILLING_MANAGER">Billing Manager</SelectItem>
                    <SelectItem value="SUPPORT_STAFF">Support Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/70 p-3 bg-muted/10">
                <div>
                  <p className="text-sm font-semibold">Account Status</p>
                  <p className="text-xs text-muted-foreground">Toggle to enable or suspend this login.</p>
                </div>
                <Switch
                  checked={editForm.watch("isActive")}
                  onCheckedChange={(checked) => editForm.setValue("isActive", checked)}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editUserMutation.isPending}>
                  {editUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Toggle Status Dialog */}
        <AlertDialog
          open={!!toggleStatusAlert}
          onOpenChange={(open) => !open && setToggleStatusAlert(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <span>
                  {toggleStatusAlert?.isActive ? "Deactivate Account?" : "Activate Account?"}
                </span>
              </AlertDialogTitle>
              <AlertDialogDescription>
                {toggleStatusAlert?.isActive ? (
                  <>
                    Are you sure you want to deactivate <strong>{toggleStatusAlert?.name}</strong>'s account?
                    They will lose access to the platform immediately.
                  </>
                ) : (
                  <>
                    Are you sure you want to activate <strong>{toggleStatusAlert?.name}</strong>'s account?
                    They will be able to log back into the platform.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmToggleStatus();
                }}
                className={toggleStatusAlert?.isActive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              >
                {toggleStatusMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Working...
                  </>
                ) : toggleStatusAlert?.isActive ? (
                  "Deactivate Account"
                ) : (
                  "Activate Account"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
