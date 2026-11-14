import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { volunteerApi, wardsApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import {
  Users,
  UserCheck,
  UserPlus,
  MapPin,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreVertical,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  TrendingUp,
  Clock,
  Sparkles,
  Users2,
  Phone,
  Mail,
  FileText,
  Building,
} from "lucide-react";

interface VolunteerItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  designation: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  activeWardsCount: number;
  assignedWards: Array<{
    id: string;
    wardNumber: number;
    name: string;
    assignmentId: string;
    assignedAt: string;
  }>;
  totalVotersRegistered: number;
  totalSubmissions: number;
}

export default function AdminVolunteersPage() {
  const { toast } = useToast();

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [selectedWardId, setSelectedWardId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assignWardsModalOpen, setAssignWardsModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activeVolunteer, setActiveVolunteer] = useState<VolunteerItem | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    designation: "Ward Volunteer",
    wardIds: [] as string[],
    notes: "",
  });

  const [selectedWardsForAssignment, setSelectedWardsForAssignment] = useState<string[]>([]);

  // 1. Fetch Stats
  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ["volunteers-stats"],
    queryFn: async () => {
      const res = await volunteerApi.getStats();
      return res.data?.data;
    },
  });

  // 2. Fetch Volunteers
  const { data: volunteersRes, isLoading: listLoading, refetch } = useQuery({
    queryKey: ["volunteers-list", page, limit, search, selectedWardId, selectedStatus],
    queryFn: async () => {
      const params: any = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (selectedWardId !== "ALL") params.wardId = selectedWardId;
      if (selectedStatus !== "ALL") params.status = selectedStatus;
      const res = await volunteerApi.list(params);
      return res.data?.data;
    },
  });

  // 3. Fetch All Wards for dropdowns & assignment
  const { data: wardsRes } = useQuery({
    queryKey: ["all-wards-for-volunteers"],
    queryFn: async () => {
      const res = await wardsApi.list({ limit: 200 });
      return res.data?.data?.wards || res.data?.data || [];
    },
  });

  const allWards: Array<{ id: string; wardNumber: number; name: string }> = useMemo(() => {
    if (!wardsRes) return [];
    const list = Array.isArray(wardsRes) ? wardsRes : wardsRes.wards || [];
    return [...list].sort((a, b) => a.wardNumber - b.wardNumber);
  }, [wardsRes]);

  // Details Modal: Voters registered by active volunteer
  const [volunteerVotersSearch, setVolunteerVotersSearch] = useState("");
  const [volunteerVotersWardFilter, setVolunteerVotersWardFilter] = useState("ALL");
  const [volunteerVotersPage, setVolunteerVotersPage] = useState(1);

  const {
    data: volunteerVotersRes,
    isLoading: volunteerVotersLoading,
  } = useQuery({
    queryKey: [
      "admin-volunteer-voters",
      activeVolunteer?.id,
      volunteerVotersPage,
      volunteerVotersSearch,
      volunteerVotersWardFilter,
    ],
    queryFn: async () => {
      if (!activeVolunteer?.id) return null;
      const params: any = { page: volunteerVotersPage, limit: 10 };
      if (volunteerVotersSearch.trim()) params.search = volunteerVotersSearch.trim();
      if (volunteerVotersWardFilter !== "ALL") params.wardId = volunteerVotersWardFilter;
      const res = await volunteerApi.getVolunteerVoters(activeVolunteer.id, params);
      return res.data?.data;
    },
    enabled: detailsModalOpen && Boolean(activeVolunteer?.id),
  });

  const volunteerVoters = volunteerVotersRes?.voters || [];
  const volunteerVotersPagination = volunteerVotersRes?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  // Create Volunteer Mutation
  const createVolunteerMutation = useMutation({
    mutationFn: (data: any) => volunteerApi.create(data),
    onSuccess: () => {
      toast({
        title: "Volunteer Created",
        description: "Volunteer account and ward assignments created successfully.",
      });
      setCreateModalOpen(false);
      setCreateForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        designation: "Ward Volunteer",
        wardIds: [],
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["volunteers-list"] });
      queryClient.invalidateQueries({ queryKey: ["volunteers-stats"] });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Create Volunteer",
        description: err.response?.data?.message || err.message || "An error occurred.",
        variant: "destructive",
      });
    },
  });

  // Assign Wards Mutation
  const assignWardsMutation = useMutation({
    mutationFn: ({ id, wardIds }: { id: string; wardIds: string[] }) =>
      volunteerApi.assignWards(id, { wardIds }),
    onSuccess: () => {
      toast({
        title: "Ward Access Updated",
        description: "Volunteer ward assignments updated successfully.",
      });
      setAssignWardsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["volunteers-list"] });
      queryClient.invalidateQueries({ queryKey: ["volunteers-stats"] });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Update Assignments",
        description: err.response?.data?.message || err.message || "An error occurred.",
        variant: "destructive",
      });
    },
  });

  // Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      volunteerApi.update(id, { status }),
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Volunteer account status updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["volunteers-list"] });
      queryClient.invalidateQueries({ queryKey: ["volunteers-stats"] });
    },
    onError: (err: any) => {
      toast({
        title: "Status Update Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    },
  });

  const openAssignModal = (vol: VolunteerItem) => {
    setActiveVolunteer(vol);
    setSelectedWardsForAssignment(vol.assignedWards.map((w) => w.id));
    setAssignWardsModalOpen(true);
  };

  const openDetailsModal = (vol: VolunteerItem) => {
    setActiveVolunteer(vol);
    setDetailsModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast({
        title: "Missing fields",
        description: "Name, email, and password are required.",
        variant: "destructive",
      });
      return;
    }
    createVolunteerMutation.mutate(createForm);
  };

  const handleSaveAssignments = () => {
    if (!activeVolunteer) return;
    assignWardsMutation.mutate({
      id: activeVolunteer.id,
      wardIds: selectedWardsForAssignment,
    });
  };

  const toggleWardSelection = (wardId: string) => {
    setSelectedWardsForAssignment((prev) =>
      prev.includes(wardId) ? prev.filter((id) => id !== wardId) : [...prev, wardId]
    );
  };

  const volunteers: VolunteerItem[] = volunteersRes?.volunteers || [];
  const pagination = volunteersRes?.pagination || { total: 0, totalPages: 1 };

  return (
    <MainLayout title="Ward Volunteer Management">
      <div className="space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card border rounded-2xl p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Ward Volunteer Management
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Authorize ward-level volunteer agents, monitor voter registrations, and allocate ward coverage.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="gap-2 shadow-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <UserPlus className="w-4 h-4" />
              Add Volunteer
            </Button>
          </div>
        </div>

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Volunteers */}
          <Card className="rounded-2xl shadow-sm border border-border/60 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Volunteers
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-black text-foreground">
                    {statsRes?.activeVolunteers ?? 0}
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      / {statsRes?.totalVolunteers ?? 0} total
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Authorized for field registration
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Ward Coverage */}
          <Card className="rounded-2xl shadow-sm border border-border/60 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ward Coverage
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-black text-foreground">
                    {statsRes?.assignedWardsCount ?? 0}
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      / {statsRes?.totalWards ?? 0} wards ({statsRes?.wardCoveragePct ?? 0}%)
                    </span>
                  </div>
                  <Progress value={statsRes?.wardCoveragePct ?? 0} className="h-1.5 mt-2" />
                </>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Today's Registrations */}
          <Card className="rounded-2xl shadow-sm border border-border/60 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Registered Today
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-black text-foreground">
                    {statsRes?.todayVotersRegistered ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {statsRes?.weekVotersRegistered ?? 0} in the last 7 days
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card 4: Total Voters Added */}
          <Card className="rounded-2xl shadow-sm border border-border/60 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Volunteer Voters
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-black text-foreground">
                    {(statsRes?.totalVotersRegistered ?? 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Direct entry with full voter roll attribution
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search Bar */}
        <Card className="rounded-2xl shadow-sm border border-border/60">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 rounded-xl bg-background border-border/60"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Ward Filter */}
                <div className="w-full sm:w-48">
                  <Select
                    value={selectedWardId}
                    onValueChange={(val) => {
                      setSelectedWardId(val);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="rounded-xl border-border/60">
                      <SelectValue placeholder="Filter by Ward" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Wards</SelectItem>
                      {allWards.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          Ward {w.wardNumber} - {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="w-full sm:w-36">
                  <Select
                    value={selectedStatus}
                    onValueChange={(val) => {
                      setSelectedStatus(val);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="rounded-xl border-border/60">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Volunteers Table */}
        <Card className="rounded-2xl shadow-sm border border-border/60 overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider py-3.5">
                    Volunteer
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Contact
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Assigned Wards
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">
                    Voters Added
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-44" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : volunteers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="font-semibold text-foreground">No volunteers found</p>
                      <p className="text-sm mt-1">
                        {search || selectedWardId !== "ALL" || selectedStatus !== "ALL"
                          ? "Try clearing filters or search terms."
                          : "Get started by adding your first ward volunteer."}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setCreateModalOpen(true)}
                        className="mt-4 rounded-xl"
                      >
                        <UserPlus className="w-4 h-4 mr-2" /> Add Volunteer
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  volunteers.map((vol) => (
                    <TableRow key={vol.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="py-4">
                        <div
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => openDetailsModal(vol)}
                          title="Click to view volunteer details & registered voters"
                        >
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            {vol.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                              {vol.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {vol.designation || "Ward Volunteer"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs">
                          <p className="text-foreground">{vol.email}</p>
                          <p className="text-muted-foreground">{vol.phone || "—"}</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            vol.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : vol.status === "INACTIVE"
                              ? "bg-slate-500/10 text-slate-600 border-slate-500/30"
                              : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                          }
                        >
                          {vol.status}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {vol.assignedWards.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">
                              No wards assigned
                            </span>
                          ) : (
                            vol.assignedWards.slice(0, 3).map((w) => (
                              <Badge
                                key={w.id}
                                variant="secondary"
                                className="text-[11px] font-medium bg-primary/5 text-primary border border-primary/15"
                              >
                                Ward {w.wardNumber}
                              </Badge>
                            ))
                          )}
                          {vol.assignedWards.length > 3 && (
                            <Badge variant="outline" className="text-[11px]">
                              +{vol.assignedWards.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => openDetailsModal(vol)}
                          className="inline-flex focus:outline-none"
                          title="Click to view voters added by this volunteer"
                        >
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold cursor-pointer transition-colors px-2.5 py-1">
                            {vol.totalVotersRegistered} Voters
                          </Badge>
                        </button>
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
                            <DropdownMenuLabel className="text-xs">Manage Volunteer</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openDetailsModal(vol)}>
                              <Eye className="w-4 h-4 mr-2 text-muted-foreground" />
                              View Activity & Records
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAssignModal(vol)}>
                              <Layers className="w-4 h-4 mr-2 text-primary" />
                              Manage Assigned Wards
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {vol.status === "ACTIVE" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleStatusMutation.mutate({ id: vol.id, status: "INACTIVE" })
                                }
                                className="text-amber-600"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Deactivate Account
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleStatusMutation.mutate({ id: vol.id, status: "ACTIVE" })
                                }
                                className="text-emerald-600"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Activate Account
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t text-sm text-muted-foreground">
                <p>
                  Showing page {page} of {pagination.totalPages} ({pagination.total} volunteers)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg"
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── MODAL: CREATE VOLUNTEER ─────────────────────── */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Add Ward Volunteer Account
              </DialogTitle>
              <DialogDescription>
                Create a volunteer credential with authorized ward assignments for registering voters.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    required
                    placeholder="volunteer@constituency.in"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Mobile Number</Label>
                  <Input
                    placeholder="9876543210"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Designation / Role</Label>
                  <Input
                    placeholder="e.g. Ward 3 Incharge"
                    value={createForm.designation}
                    onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Ward Multi-select */}
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>Assign Initial Wards</span>
                  <span className="text-xs text-muted-foreground">
                    {createForm.wardIds.length} ward(s) selected
                  </span>
                </Label>
                <div className="max-h-36 overflow-y-auto border rounded-xl p-2.5 space-y-1.5 bg-muted/10">
                  {allWards.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      No wards found in this organization.
                    </p>
                  ) : (
                    allWards.map((w) => {
                      const isSelected = createForm.wardIds.includes(w.id);
                      return (
                        <div
                          key={w.id}
                          onClick={() => {
                            setCreateForm((prev) => ({
                              ...prev,
                              wardIds: isSelected
                                ? prev.wardIds.filter((id) => id !== w.id)
                                : [...prev.wardIds, w.id],
                            }));
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          <span>
                            Ward {w.wardNumber} - {w.name}
                          </span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Assignment Notes (Optional)</Label>
                <Input
                  placeholder="Notes about duties, area scope, etc."
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createVolunteerMutation.isPending}
                  className="rounded-xl"
                >
                  {createVolunteerMutation.isPending ? "Creating..." : "Create Volunteer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── MODAL: MANAGE WARD ASSIGNMENTS ─────────────── */}
        <Dialog open={assignWardsModalOpen} onOpenChange={setAssignWardsModalOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Manage Ward Access
              </DialogTitle>
              <DialogDescription>
                Assign or revoke permitted wards for{" "}
                <span className="font-semibold text-foreground">{activeVolunteer?.name}</span>.
                The volunteer will only be allowed to register voters in authorized wards.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Select active wards</span>
                <span>{selectedWardsForAssignment.length} of {allWards.length} selected</span>
              </div>

              <div className="max-h-60 overflow-y-auto border rounded-xl p-2 space-y-1.5 bg-muted/10">
                {allWards.map((w) => {
                  const isChecked = selectedWardsForAssignment.includes(w.id);
                  return (
                    <div
                      key={w.id}
                      onClick={() => toggleWardSelection(w.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-xs transition-colors ${
                        isChecked
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 opacity-80" />
                        <span>
                          Ward {w.wardNumber} - {w.name}
                        </span>
                      </div>
                      {isChecked && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAssignWardsModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAssignments}
                disabled={assignWardsMutation.isPending}
                className="rounded-xl"
              >
                {assignWardsMutation.isPending ? "Saving..." : "Save Ward Access"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── MODAL: VOLUNTEER DETAILS & RECENT ACTIVITY ──── */}
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
            <DialogHeader className="border-b pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-bold text-xl flex items-center justify-center shrink-0 border border-primary/20">
                    {activeVolunteer?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <span>{activeVolunteer?.name}</span>
                      <Badge
                        variant="outline"
                        className={
                          activeVolunteer?.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs"
                            : "bg-slate-500/10 text-slate-600 border-slate-500/30 text-xs"
                        }
                      >
                        {activeVolunteer?.status}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {activeVolunteer?.designation || "Ward Volunteer"} • {activeVolunteer?.email}
                      {activeVolunteer?.phone ? ` • ${activeVolunteer.phone}` : ""}
                    </DialogDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold text-sm px-3 py-1">
                    {activeVolunteer?.totalVotersRegistered || 0} Registered Voters
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            {activeVolunteer && (
              <div className="space-y-6 pt-4">
                {/* Authorized Wards & Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-muted/20 border rounded-xl space-y-1">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Authorized Wards ({activeVolunteer.assignedWards.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeVolunteer.assignedWards.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No wards assigned</span>
                      ) : (
                        activeVolunteer.assignedWards.map((w) => (
                          <Badge
                            key={w.id}
                            variant="secondary"
                            className="text-xs bg-primary/10 text-primary border-primary/20"
                          >
                            Ward {w.wardNumber}: {w.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 bg-muted/20 border rounded-xl space-y-1">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Account Dates
                    </p>
                    <p className="text-xs text-foreground">
                      <span className="text-muted-foreground">Registered:</span>{" "}
                      {new Date(activeVolunteer.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-foreground">
                      <span className="text-muted-foreground">Last Login:</span>{" "}
                      {activeVolunteer.lastLoginAt
                        ? new Date(activeVolunteer.lastLoginAt).toLocaleString()
                        : "Never"}
                    </p>
                  </div>

                  <div className="p-3.5 bg-muted/20 border rounded-xl space-y-1">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Performance Summary
                    </p>
                    <p className="text-xs text-foreground font-semibold">
                      Total Voters: <span className="text-primary font-bold">{activeVolunteer.totalVotersRegistered}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submissions Tracked: {activeVolunteer.totalSubmissions || activeVolunteer.totalVotersRegistered}
                    </p>
                  </div>
                </div>

                {/* ─── REGISTERED VOTERS LIST TABLE ─── */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Users2 className="w-4 h-4 text-primary" />
                        Voters Registered by this Volunteer
                        <Badge variant="outline" className="text-xs font-mono ml-1">
                          {volunteerVotersPagination.total}
                        </Badge>
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Browse all citizens registered into the constituency database by {activeVolunteer.name}.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search voter, EPIC, phone..."
                          value={volunteerVotersSearch}
                          onChange={(e) => {
                            setVolunteerVotersSearch(e.target.value);
                            setVolunteerVotersPage(1);
                          }}
                          className="h-8 pl-8 text-xs rounded-xl"
                        />
                      </div>

                      {activeVolunteer.assignedWards.length > 1 && (
                        <Select
                          value={volunteerVotersWardFilter}
                          onValueChange={(val) => {
                            setVolunteerVotersWardFilter(val);
                            setVolunteerVotersPage(1);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs rounded-xl w-36">
                            <SelectValue placeholder="All Wards" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All Wards</SelectItem>
                            {activeVolunteer.assignedWards.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                Ward {w.wardNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Voters Table */}
                  <div className="border rounded-xl overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-xs font-semibold uppercase">Voter Full Name</TableHead>
                          <TableHead className="text-xs font-semibold uppercase">EPIC / Voter ID</TableHead>
                          <TableHead className="text-xs font-semibold uppercase">Application No</TableHead>
                          <TableHead className="text-xs font-semibold uppercase">Ward</TableHead>
                          <TableHead className="text-xs font-semibold uppercase">Phone</TableHead>
                          <TableHead className="text-xs font-semibold uppercase">Family Members</TableHead>
                          <TableHead className="text-xs font-semibold uppercase">Added On</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {volunteerVotersLoading ? (
                          Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            </TableRow>
                          ))
                        ) : volunteerVoters.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                              <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                              No voters found registered by this volunteer.
                            </TableCell>
                          </TableRow>
                        ) : (
                          volunteerVoters.map((v: any) => (
                            <TableRow key={v.id} className="hover:bg-muted/20 text-xs">
                              <TableCell className="font-semibold text-foreground">
                                <div className="flex items-center gap-1.5">
                                  <span>{v.name}</span>
                                  {v.isOurVoter && (
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] px-1 py-0">
                                      Supporter
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono font-bold text-foreground">
                                {v.voterIdNumber}
                              </TableCell>
                              <TableCell className="font-mono text-muted-foreground">
                                {v.applicationNumber || "—"}
                              </TableCell>
                              <TableCell>
                                Ward {v.ward?.wardNumber}
                                {v.locality ? ` (${v.locality})` : ""}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {v.phone || "—"}
                              </TableCell>
                              <TableCell>
                                {Boolean(v._count?.familyMembers > 0 || (v.familyMembers && v.familyMembers.length > 0)) ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-primary/5 text-primary border-primary/20 gap-1 px-1.5 py-0"
                                    title={v.familyMembers?.map((m: any) => `${m.name} (${m.relationType})`).join(", ")}
                                  >
                                    <Users2 className="w-2.5 h-2.5" />
                                    {v._count?.familyMembers || v.familyMembers?.length} Family
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground/60">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {new Date(v.createdAt).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {volunteerVotersPagination.totalPages > 1 && (
                      <div className="flex items-center justify-between p-3 border-t text-xs text-muted-foreground bg-muted/10">
                        <span>
                          Showing page {volunteerVotersPage} of {volunteerVotersPagination.totalPages} ({volunteerVotersPagination.total} total)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={volunteerVotersPage <= 1}
                            onClick={() => setVolunteerVotersPage((p) => p - 1)}
                            className="h-7 text-xs rounded-lg px-2"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={volunteerVotersPage >= volunteerVotersPagination.totalPages}
                            onClick={() => setVolunteerVotersPage((p) => p + 1)}
                            className="h-7 text-xs rounded-lg px-2"
                          >
                            Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="border-t pt-4">
              <Button onClick={() => setDetailsModalOpen(false)} className="rounded-xl">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
