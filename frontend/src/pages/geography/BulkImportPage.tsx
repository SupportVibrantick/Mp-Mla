import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import * as xlsx from "xlsx";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileUp,
  Loader2,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  Info,
  Calendar,
  XCircle,
  HelpCircle,
} from "lucide-react";

export default function BulkImportPage() {
  const [importType, setImportType] = useState("district");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [jobErrors, setJobErrors] = useState<any[]>([]);
  const [loadingErrors, setLoadingErrors] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setImportFile(files[0]);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setImporting(true);
    setJobStatus(null);
    setJobErrors([]);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = xlsx.read(bstr, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rows = xlsx.utils.sheet_to_json(ws);

          if (rows.length === 0) {
            toast.error("The selected sheet is empty.");
            setImporting(false);
            return;
          }

          const res = await api.post("/admin/constituency/import", {
            type: importType,
            fileName: importFile.name,
            rows: rows,
          });

          const jobId = res.data?.data?.jobId;
          setActiveJobId(jobId);
          toast.success("Validation job created. Polling progress...");
          startPollingJob(jobId);
        } catch (err: any) {
          toast.error(
            err.response?.data?.message || "Error reading Excel file content.",
          );
        }
      };
      reader.readAsBinaryString(importFile);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload import data.");
    } finally {
      setImporting(false);
    }
  };

  const startPollingJob = (jobId: string) => {
    const timer = setInterval(async () => {
      try {
        const res = await api.get(`/admin/constituency/import/${jobId}`);
        const job = res.data?.data;
        setJobStatus(job);

        // Check if terminal state reached
        if (
          job.status === "PREVIEW" ||
          job.status === "PARTIAL" ||
          job.status === "COMPLETED" ||
          job.status === "FAILED"
        ) {
          clearInterval(timer);
          if (job.status === "COMPLETED") {
            toast.success("Import completed successfully!");
          } else if (job.status === "FAILED" || job.status === "PARTIAL") {
            fetchJobErrors(jobId);
          }
        }
      } catch (err) {
        clearInterval(timer);
      }
    }, 1500);
  };

  const fetchJobErrors = async (jobId: string) => {
    setLoadingErrors(true);
    try {
      const res = await api.get(`/admin/constituency/import/${jobId}/errors`);
      setJobErrors(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingErrors(false);
    }
  };

  const handleConfirmImport = async (jobId: string) => {
    try {
      await api.post(`/admin/constituency/import/${jobId}/confirm`);
      toast.success("Import triggered. Finalizing records...");
      startPollingJob(jobId);
    } catch (err) {
      toast.error("Failed to confirm import.");
    }
  };

  // Helper to render required excel headers for user cheatsheet
  const getHeaderTemplateInfo = () => {
    switch (importType) {
      case "district":
        return {
          headers: ["name *", "state *", "code", "latitude", "longitude"],
          desc: "Upload districts first, as they are the root nodes for all other geographies.",
        };
      case "block":
        return {
          headers: [
            "name *",
            "districtName *",
            "code",
            "latitude",
            "longitude",
          ],
          desc: "Requires districtName to map blocks to their respective districts.",
        };
      case "town-village":
        return {
          headers: [
            "name *",
            "districtName *",
            "blockName",
            "constituencyName",
            "type (TOWN/VILLAGE)",
            "nature (URBAN/RURAL)",
            "code",
            "pincode",
            "latitude",
            "longitude",
          ],
          desc: "Creates a Town or Village with optional Block and Constituency relationships.",
        };
      case "ward":
        return {
          headers: [
            "name *",
            "wardNumber *",
            "townVillageName",
            "districtName *",
            "constituencyName",
            "code",
            "zone",
            "areaType (Urban)",
            "pincode",
            "latitude",
            "longitude",
          ],
          desc: "Requires ward number and district; optionally associates the ward with a Town/Village.",
        };
      case "booth":
        return {
          headers: [
            "boothName *",
            "boothNumber *",
            "constituencyName *",
            "wardName (or wardNumber)",
            "townVillageName",
            "pollingLocationName",
            "code",
            "latitude",
            "longitude",
          ],
          desc: "Requires Booth Name, Number, and Constituency Name. Can map to Ward or Town/Village.",
        };
      case "polling-location":
        return {
          headers: [
            "name *",
            "buildingName",
            "address",
            "pincode",
            "landmark",
            "isAccessible (TRUE/FALSE)",
            "latitude",
            "longitude",
          ],
          desc: "Creates stations and physical locations for voting.",
        };
      default:
        return { headers: [], desc: "" };
    }
  };

  const cheatsheet = getHeaderTemplateInfo();

  return (
    <MainLayout title="Bulk Import">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground animate-in fade-in duration-200">
            <FileUp className="h-7 w-7 text-primary" /> Bulk Import
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
            Upload administrative and electoral hierarchies to configure your
            constituency in bulk.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Import Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Import Geographic Hierarchy Data
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload Excel (.xlsx) file data to import geography models.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground">
                    Hierarchy Level Type
                  </Label>
                  <select
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus-visible:ring-primary focus-visible:outline-none"
                    value={importType}
                    onChange={(e) => setImportType(e.target.value)}
                  >
                    <option value="district">District</option>
                    <option value="block">Block</option>
                    <option value="town-village">Town / Village</option>
                    <option value="panchayat">Panchayat</option>
                    <option value="village">Village</option>
                    <option value="ward">Ward</option>
                    <option value="booth">Booth</option>
                    <option value="polling-location">Polling Location</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground">
                    Excel file (.xlsx)
                  </Label>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleImportSubmit}
                  disabled={importing || !importFile}
                  className="bg-primary text-white font-semibold h-9 text-xs px-4"
                >
                  {importing && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Upload & Validate
                </Button>
              </div>
            </Card>

            {jobStatus && (
              <Card className="border border-border/50 bg-card rounded-2xl shadow-sm p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    Import Job:{" "}
                    <Badge variant="outline" className="font-mono text-xs">
                      {jobStatus.status}
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    File:{" "}
                    <span className="font-mono text-foreground font-bold">
                      {jobStatus.fileName}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl border bg-muted/5">
                    <span className="text-xs text-muted-foreground font-semibold">
                      Total Rows
                    </span>
                    <h5 className="text-xl font-extrabold text-foreground mt-1">
                      {jobStatus.totalRows}
                    </h5>
                  </div>
                  <div className="p-4 rounded-xl border bg-muted/5">
                    <span className="text-xs font-semibold text-emerald-600">
                      Passed Validation
                    </span>
                    <h5 className="text-xl font-extrabold text-emerald-600 mt-1">
                      {jobStatus.successCount}
                    </h5>
                  </div>
                  <div className="p-4 rounded-xl border bg-muted/5">
                    <span className="text-xs font-semibold text-rose-500">
                      Failed Rows
                    </span>
                    <h5 className="text-xl font-extrabold text-rose-500 mt-1">
                      {jobStatus.failedCount}
                    </h5>
                  </div>
                </div>

                {/* Validation Passed Confirmation */}
                {(jobStatus.status === "PREVIEW" ||
                  jobStatus.status === "PARTIAL") &&
                  jobStatus.successCount > 0 && (
                    <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="text-xs text-indigo-950 font-medium">
                        <p className="font-bold flex items-center gap-1.5">
                          <Info className="h-4 w-4 text-indigo-500" />{" "}
                          Validation check complete
                        </p>
                        <p className="text-indigo-800 mt-0.5">
                          You can confirm to import the {jobStatus.successCount}{" "}
                          valid rows now.
                        </p>
                      </div>
                      <Button
                        onClick={() => handleConfirmImport(jobStatus.id)}
                        className="bg-indigo-650 hover:bg-indigo-750 text-white font-semibold text-xs h-9 px-4 shrink-0 shadow-sm"
                      >
                        <Check className="h-4 w-4 mr-1.5" /> Import Valid
                        Records
                      </Button>
                    </div>
                  )}

                {/* Error Report */}
                {jobErrors.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                      <AlertTriangle className="h-4 w-4" /> Validation Error
                      Report ({jobErrors.length} issues)
                    </div>
                    <div className="border border-border/50 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent bg-muted/20">
                            <TableHead className="w-16">Row</TableHead>
                            <TableHead className="w-28">Field</TableHead>
                            <TableHead className="w-28">Value</TableHead>
                            <TableHead>Error Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {jobErrors.map((err, idx) => (
                            <TableRow
                              key={idx}
                              className="text-xs hover:bg-muted/5"
                            >
                              <TableCell className="font-bold text-foreground">
                                Row {err.rowIndex}
                              </TableCell>
                              <TableCell className="font-mono text-rose-600">
                                {err.field || "N/A"}
                              </TableCell>
                              <TableCell className="font-mono text-muted-foreground">
                                {err.value !== null
                                  ? String(err.value)
                                  : "null"}
                              </TableCell>
                              <TableCell className="font-semibold text-rose-500">
                                {err.reason}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Template Cheatsheet Sidebar */}
          <div className="space-y-6">
            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-indigo-500" /> Excel
                Template Guide
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Choose a type in the dropdown. Your Excel sheet must match the
                header names listed below exactly:
              </p>

              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Type:{" "}
                  <span className="text-primary font-bold">{importType}</span>
                </div>
                <div className="p-3 bg-muted/30 rounded-xl border space-y-2">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                    Columns / Headers:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {cheatsheet.headers.map((h, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="font-mono text-[10px] tracking-tight bg-background border"
                      >
                        {h}
                      </Badge>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed italic bg-indigo-50/20 border border-indigo-100/30 p-3 rounded-xl">
                  {cheatsheet.desc}
                </p>
              </div>
            </Card>

            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" /> Validation Rules
              </h3>
              <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <p>
                  1. <strong>Strict Hierarchy:</strong> Parent names must exist
                  in the database. For example, a Block name must exist inside
                  the specified District.
                </p>
                <p>
                  2. <strong>Case Insensitivity:</strong> Search matching is
                  case-insensitive, but spellings must match exactly.
                </p>
                <p>
                  3. <strong>Two-Pass Architecture:</strong> Validation checks
                  all rows first without inserting anything. Only once you
                  confirm, valid rows are written.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
