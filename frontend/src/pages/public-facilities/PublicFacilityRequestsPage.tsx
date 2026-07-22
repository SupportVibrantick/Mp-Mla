import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import {
  usePublicFacilityRequests,
  useApproveRequest,
  useRejectRequest,
} from "@/hooks/usePublicFacilityRequests";
import { getCategoryInfo } from "@/hooks/usePublicFacilities";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Loader2,
} from "lucide-react";

const statusColors: Record<string, string> = {
  PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3.5 w-3.5" />,
  APPROVED: <CheckCircle2 className="h-3.5 w-3.5" />,
  REJECTED: <XCircle className="h-3.5 w-3.5" />,
};
export default function PublicFacilityRequestsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { data: res, isLoading } = usePublicFacilityRequests({
    status: statusFilter,
    search: search || undefined,
    limit: 50,
  });
  const approveMut = useApproveRequest();
  const rejectMut = useRejectRequest();

  const requests = res?.data?.requests || [];
  const pendingCount = res?.data?.pendingCount || 0;

  const handleApprove = async (id: string) => {
    await approveMut.mutateAsync(id);
    setSelectedReq(null);
  };

  const openRejectDialog = (id: string) => {
    setRejectingId(id);
    setRejectReason("");
    setRejectDialog(true);
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    await rejectMut.mutateAsync({ id: rejectingId, reason: rejectReason });
    setRejectDialog(false);
    setSelectedReq(null);
    setRejectingId(null);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <MainLayout title="Public Facility Requests">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link href="/public-facilities">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 mb-2 text-xs font-bold text-muted-foreground hover:text-foreground pl-0 rounded-lg"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Public Facilities
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5 text-foreground">
              <Building2 className="h-7 w-7 text-primary" />
              Public Facility Requests
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2 font-bold px-2 py-0.5 text-[10px] rounded-lg">
                  {pendingCount} Pending
                </Badge>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Review, verify, and approve public facility registration requests submitted by constituency residents
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-muted-foreground/20 rounded-xl h-9 text-xs"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-background/50 border-muted-foreground/20 rounded-xl text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="all">All Statuses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Public Facility</TableHead>
                  <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Category</TableHead>
                  <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Ward</TableHead>
                  <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Submitter</TableHead>
                  <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Date</TableHead>
                  <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Status</TableHead>
                  <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-xs sm:text-sm font-semibold text-muted-foreground leading-relaxed"
                    >
                      No requests found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((r: any) => {
                    const catInfo = getCategoryInfo(r.category);
                    
                    let badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
                    if (r.status === "APPROVED") badgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                    else if (r.status === "REJECTED") badgeColor = "bg-rose-500/10 text-rose-600 dark:text-rose-400";

                    return (
                      <TableRow key={r.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                        <TableCell className="py-4 px-4 align-middle">
                          <div className="font-bold text-foreground text-xs sm:text-sm">{r.name}</div>
                          {r.subcategory && (
                            <div className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                              {r.subcategory}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/80">
                            <img
                              src={catInfo.icon}
                              alt=""
                              className="h-4 w-4 object-contain opacity-80"
                            />
                            {catInfo.label}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle text-xs sm:text-sm font-semibold text-foreground">
                          {r.ward
                            ? `#${r.ward.wardNumber} ${r.ward.name}`
                            : "—"}
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle">
                          <div className="text-xs sm:text-sm font-bold text-foreground">{r.submitterName}</div>
                          <div className="text-xs font-semibold text-muted-foreground mt-0.5">
                            {r.submitterPhone}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle text-xs sm:text-sm font-semibold text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                        <TableCell className="py-4 px-4 align-middle">
                          <Badge
                            className={`rounded-full border-none px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight ${badgeColor}`}
                          >
                            <span className="flex items-center gap-1">
                              {statusIcons[r.status]}
                              {r.status}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-4 px-4 align-middle">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => setSelectedReq(r)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {r.status === "PENDING" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-emerald-600 hover:bg-emerald-500/10"
                                  onClick={() => handleApprove(r.id)}
                                  disabled={approveMut.isPending}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-rose-600 hover:bg-rose-500/10"
                                  onClick={() => openRejectDialog(r.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog
          open={!!selectedReq}
          onOpenChange={(v) => !v && setSelectedReq(null)}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
            {selectedReq && (
              <>
                <DialogHeader className="border-b border-border/30 pb-3">
                  <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-foreground">
                    <Building2 className="h-5 w-5 text-primary" />
                    {selectedReq.name}
                    <Badge
                      className={cn(
                        "ml-2 rounded-full border-none px-2 py-0.5 text-[9px] font-bold uppercase tracking-tight",
                        selectedReq.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : selectedReq.status === "REJECTED"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {selectedReq.status}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Institution Info */}
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-border/30 pb-1.5">
                      <Building2 className="h-4 w-4 text-primary" /> Public Facility Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm font-semibold">
                      <div>
                        <span className="text-muted-foreground">Category:</span>{" "}
                        <span className="text-foreground">{getCategoryInfo(selectedReq.category).label}</span>
                      </div>
                      {selectedReq.subcategory && (
                        <div>
                          <span className="text-muted-foreground">
                            Subcategory:
                          </span>{" "}
                          <span className="text-foreground">{selectedReq.subcategory}</span>
                        </div>
                      )}
                      <div className="col-span-1 sm:col-span-2">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground/80" /> Address:
                        </span>{" "}
                        <span className="text-foreground">{selectedReq.address}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ward:</span>{" "}
                        <span className="text-foreground">
                          {selectedReq.ward
                            ? `#${selectedReq.ward.wardNumber} ${selectedReq.ward.name}`
                            : "—"}
                        </span>
                      </div>
                      {selectedReq.contactNo && (
                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground/80" /> Phone:
                          </span>{" "}
                          <span className="text-foreground font-mono">{selectedReq.contactNo}</span>
                        </div>
                      )}
                      {selectedReq.email && (
                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground/80" /> Email:
                          </span>{" "}
                          <span className="text-foreground font-mono">{selectedReq.email}</span>
                        </div>
                      )}
                      {selectedReq.website && (
                        <div>
                          <span className="text-muted-foreground">
                            Website:
                          </span>{" "}
                          <span className="text-foreground">{selectedReq.website}</span>
                        </div>
                      )}
                      {selectedReq.capacity && (
                        <div>
                          <span className="text-muted-foreground">
                            Capacity:
                          </span>{" "}
                          <span className="text-foreground font-mono">{selectedReq.capacity}</span>
                        </div>
                      )}
                      {selectedReq.establishedDate && (
                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground/80" /> Established:
                          </span>{" "}
                          <span className="text-foreground">{formatDate(selectedReq.establishedDate)}</span>
                        </div>
                      )}
                      {selectedReq.description && (
                        <div className="col-span-1 sm:col-span-2 mt-1">
                          <span className="text-muted-foreground">
                            Description:
                          </span>{" "}
                          <p className="text-xs text-foreground mt-1 p-3 rounded-xl border border-border/50 bg-muted/20 font-medium leading-relaxed">
                            {selectedReq.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Head Info */}
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-border/30 pb-1.5">
                      <User className="h-4 w-4 text-primary" /> Head / Incharge
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm font-semibold">
                      <div>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        <span className="text-foreground">{selectedReq.headName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Designation:
                        </span>{" "}
                        <span className="text-foreground">{selectedReq.headDesignation}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground/80" /> Contact:
                        </span>{" "}
                        <span className="text-foreground font-mono">{selectedReq.headContact}</span>
                      </div>
                      {selectedReq.headEmail && (
                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground/80" /> Email:
                          </span>{" "}
                          <span className="text-foreground font-mono">{selectedReq.headEmail}</span>
                        </div>
                      )}
                      {selectedReq.headDateOfBirth && (
                        <div>
                          <span className="text-muted-foreground">DOB:</span>{" "}
                          <span className="text-foreground">{formatDate(selectedReq.headDateOfBirth)}</span>
                        </div>
                      )}
                      {selectedReq.headAdharNumber && (
                        <div>
                          <span className="text-muted-foreground">Aadhaar:</span>{" "}
                          <span className="text-foreground font-mono">{selectedReq.headAdharNumber}</span>
                        </div>
                      )}
                      {selectedReq.headAppointedDate && (
                        <div>
                          <span className="text-muted-foreground">
                            Appointed:
                          </span>{" "}
                          <span className="text-foreground">{formatDate(selectedReq.headAppointedDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submitter Info */}
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-border/30 pb-1.5">
                      <FileText className="h-4 w-4 text-primary" /> Submitted By
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm font-semibold">
                      <div>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        <span className="text-foreground">{selectedReq.submitterName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground/80" /> Phone:
                        </span>{" "}
                        <span className="text-foreground font-mono">{selectedReq.submitterPhone}</span>
                      </div>
                      {selectedReq.submitterEmail && (
                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground/80" /> Email:
                          </span>{" "}
                          <span className="text-foreground font-mono">{selectedReq.submitterEmail}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">
                          Submitted:
                        </span>{" "}
                        <span className="text-foreground">{formatDate(selectedReq.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* KYC Documents */}
                  {selectedReq.documents &&
                    Array.isArray(selectedReq.documents) &&
                    selectedReq.documents.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-border/30 pb-1.5">
                          <FileText className="h-4 w-4 text-primary" /> Uploaded Documents
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {selectedReq.documents.map(
                            (doc: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 rounded-2xl border border-border/50 bg-muted/20"
                              >
                                <div className="flex items-center gap-2 min-w-0 mr-4">
                                  <FileText className="h-5 w-5 text-primary shrink-0 opacity-80" />
                                  <div className="min-w-0">
                                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                                      {doc.name}
                                    </p>
                                    <p className="text-[10px] font-semibold text-muted-foreground truncate">
                                      {doc.originalName || doc.type}
                                    </p>
                                  </div>
                                </div>
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
                                >
                                  View / Download
                                </a>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {/* Rejection reason if rejected */}
                  {selectedReq.status === "REJECTED" &&
                    selectedReq.rejectionReason && (
                      <div className="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
                        <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                          Rejection Reason:
                        </p>
                        <p className="text-xs sm:text-sm text-rose-600 dark:text-rose-300 font-semibold">
                          {selectedReq.rejectionReason}
                        </p>
                      </div>
                    )}
                </div>

                {selectedReq.status === "PENDING" && (
                  <DialogFooter className="gap-2 mt-6 border-t border-border/30 pt-3">
                    <Button
                      variant="destructive"
                      onClick={() => openRejectDialog(selectedReq.id)}
                      className="rounded-xl text-xs font-bold h-9"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject Request
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedReq.id)}
                      disabled={approveMut.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9"
                    >
                      {approveMut.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      )}
                      Approve Request
                    </Button>
                  </DialogFooter>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Reason Dialog */}
        <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg font-bold">Reject Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground font-semibold">
                Please provide a reason for rejecting this public facility request:
              </p>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Type the rejection reason here..."
                rows={4}
                className="rounded-xl border-border/60 text-xs sm:text-sm"
              />
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => setRejectDialog(false)} className="rounded-xl text-xs font-bold">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMut.isPending}
                className="rounded-xl text-xs font-bold"
              >
                {rejectMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                )}
                Confirm Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
