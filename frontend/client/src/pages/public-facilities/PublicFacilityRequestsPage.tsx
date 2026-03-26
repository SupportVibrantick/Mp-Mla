import { useState } from "react";
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
import { API_BASE_URL } from "@/lib/api";

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

const BACKEND_URL = API_BASE_URL.replace("/api", "");

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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary" />
              Public Facility Requests
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingCount} Pending
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review and approve public facility registration requests
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Public Facility</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                      className="text-center py-12 text-muted-foreground"
                    >
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((r: any) => {
                    const catInfo = getCategoryInfo(r.category);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.name}</div>
                          {r.subcategory && (
                            <div className="text-xs text-muted-foreground">
                              {r.subcategory}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <img
                              src={catInfo.icon}
                              alt=""
                              className="h-4 w-4 object-contain"
                            />
                            {catInfo.label}
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.ward
                            ? `#${r.ward.wardNumber} ${r.ward.name}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{r.submitterName}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.submitterPhone}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(r.createdAt)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={statusColors[r.status] || ""}
                          >
                            <span className="flex items-center gap-1">
                              {statusIcons[r.status]}
                              {r.status}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedReq(r)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {r.status === "PENDING" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => handleApprove(r.id)}
                                  disabled={approveMut.isPending}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
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
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedReq && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {selectedReq.name}
                    <Badge
                      variant="secondary"
                      className={statusColors[selectedReq.status] || ""}
                    >
                      {selectedReq.status}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Institution Info */}
                  <div>
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" /> Public Facility Details
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Category:</span>{" "}
                        {getCategoryInfo(selectedReq.category).label}
                      </div>
                      {selectedReq.subcategory && (
                        <div>
                          <span className="text-muted-foreground">
                            Subcategory:
                          </span>{" "}
                          {selectedReq.subcategory}
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Address:
                        </span>{" "}
                        {selectedReq.address}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ward:</span>{" "}
                        {selectedReq.ward
                          ? `#${selectedReq.ward.wardNumber} ${selectedReq.ward.name}`
                          : "—"}
                      </div>
                      {selectedReq.contactNo && (
                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> Phone:
                          </span>{" "}
                          {selectedReq.contactNo}
                        </div>
                      )}
                      {selectedReq.email && (
                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> Email:
                          </span>{" "}
                          {selectedReq.email}
                        </div>
                      )}
                      {selectedReq.website && (
                        <div>
                          <span className="text-muted-foreground">
                            Website:
                          </span>{" "}
                          {selectedReq.website}
                        </div>
                      )}
                      {selectedReq.capacity && (
                        <div>
                          <span className="text-muted-foreground">
                            Capacity:
                          </span>{" "}
                          {selectedReq.capacity}
                        </div>
                      )}
                      {selectedReq.establishedDate && (
                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Established:
                          </span>{" "}
                          {formatDate(selectedReq.establishedDate)}
                        </div>
                      )}
                      {selectedReq.description && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            Description:
                          </span>{" "}
                          {selectedReq.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Head Info */}
                  <div>
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                      <User className="h-4 w-4" /> Head / Incharge
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        {selectedReq.headName}
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Designation:
                        </span>{" "}
                        {selectedReq.headDesignation}
                      </div>
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Contact:
                        </span>{" "}
                        {selectedReq.headContact}
                      </div>
                      {selectedReq.headEmail && (
                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> Email:
                          </span>{" "}
                          {selectedReq.headEmail}
                        </div>
                      )}
                      {selectedReq.headDateOfBirth && (
                        <div>
                          <span className="text-muted-foreground">DOB:</span>{" "}
                          {formatDate(selectedReq.headDateOfBirth)}
                        </div>
                      )}
                      {selectedReq.headAppointedDate && (
                        <div>
                          <span className="text-muted-foreground">
                            Appointed:
                          </span>{" "}
                          {formatDate(selectedReq.headAppointedDate)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submitter Info */}
                  <div>
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                      <FileText className="h-4 w-4" /> Submitted By
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        {selectedReq.submitterName}
                      </div>
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Phone:
                        </span>{" "}
                        {selectedReq.submitterPhone}
                      </div>
                      {selectedReq.submitterEmail && (
                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> Email:
                          </span>{" "}
                          {selectedReq.submitterEmail}
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">
                          Submitted:
                        </span>{" "}
                        {formatDate(selectedReq.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* KYC Documents */}
                  {selectedReq.documents &&
                    Array.isArray(selectedReq.documents) &&
                    selectedReq.documents.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                          <FileText className="h-4 w-4" /> Uploaded Documents
                        </h3>
                        <div className="space-y-2">
                          {selectedReq.documents.map(
                            (doc: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30"
                              >
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <div>
                                    <p className="text-sm font-medium">
                                      {doc.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {doc.originalName || doc.type}
                                    </p>
                                  </div>
                                </div>
                                <a
                                  href={`${BACKEND_URL}${doc.url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
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
                      <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-900">
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">
                          Rejection Reason:
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-300">
                          {selectedReq.rejectionReason}
                        </p>
                      </div>
                    )}
                </div>

                {selectedReq.status === "PENDING" && (
                  <DialogFooter className="gap-2 mt-4">
                    <Button
                      variant="destructive"
                      onClick={() => openRejectDialog(selectedReq.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedReq.id)}
                      disabled={approveMut.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {approveMut.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                      )}
                      Approve
                    </Button>
                  </DialogFooter>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Reason Dialog */}
        <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Please provide a reason for rejecting this request:
              </p>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMut.isPending}
              >
                {rejectMut.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1" />
                )}
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
