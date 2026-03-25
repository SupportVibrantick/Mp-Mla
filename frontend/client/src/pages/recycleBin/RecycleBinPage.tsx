import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  useDeleteRecycleItem,
  useRecycleBin,
  useRestoreRecycleItem,
} from "@/hooks/useRecycleBin";
import { Loader2, RotateCcw, Trash2, Search, Filter, History, Trash, Database } from "lucide-react";
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

export default function RecycleBinPage() {
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("all");
  const [entityType, setEntityType] = useState("all");
  const [confirmDlg, setConfirmDlg] = useState<{
    open: boolean;
    item: any | null;
    type: "restore" | "delete";
  }>({
    open: false,
    item: null,
    type: "restore",
  });

  const params = useMemo(
    () => ({
      search: search || undefined,
      module,
      entityType,
      limit: 100,
      page: 1,
    }),
    [search, module, entityType],
  );

  const { data, isLoading } = useRecycleBin(params);
  const restoreMut = useRestoreRecycleItem();
  const deleteMut = useDeleteRecycleItem();

  const rows = data?.data || [];
  const modules = data?.filters?.modules || [];
  const entityTypes = data?.filters?.entityTypes || [];

  return (
    <MainLayout title="Recycle Bin">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <History className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold font-mono tracking-tight">RECYCLE BIN</CardTitle>
              <CardDescription>Restore or permanently remove deleted system records</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search records..."
                className="pl-9 h-10"
              />
            </div>

            <Select value={module} onValueChange={setModule}>
              <SelectTrigger className="h-10">
                <div className="flex items-center">
                  <Database className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Module" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {modules.map((m: string) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="h-10">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Entity Type" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entity types</SelectItem>
                {entityTypes.map((e: string) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading recycle bin...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Deleted At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Recycle bin is empty.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.recordLabel || "Untitled"}</div>
                        <div className="text-xs text-muted-foreground">{item.recordId}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.module}</Badge>
                      </TableCell>
                      <TableCell>{item.entityType}</TableCell>
                      <TableCell>
                        {new Date(item.deletedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800"
                          disabled={restoreMut.isPending || deleteMut.isPending}
                          onClick={() => {
                            setConfirmDlg({
                              open: true,
                              item,
                              type: "restore",
                            });
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 text-xs"
                          disabled={restoreMut.isPending || deleteMut.isPending}
                          onClick={() => {
                            setConfirmDlg({
                              open: true,
                              item,
                              type: "delete",
                            });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog 
        open={confirmDlg.open} 
        onOpenChange={(open) => setConfirmDlg(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "p-2 rounded-full",
                confirmDlg.type === "restore" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
              )}>
                {confirmDlg.type === "restore" ? <RotateCcw className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
              </div>
              <AlertDialogTitle>
                {confirmDlg.type === "restore" ? "Restore Record?" : "Permanently Delete?"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {confirmDlg.type === "restore" 
                ? `Are you sure you want to restore "${confirmDlg.item?.recordLabel || confirmDlg.item?.recordId}"? This will bring the record back to its original module.`
                : `This action cannot be undone. "${confirmDlg.item?.recordLabel || confirmDlg.item?.recordId}" will be permanently removed from the database and cannot be recovered.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                confirmDlg.type === "restore" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
              )}
              onClick={() => {
                if (confirmDlg.item) {
                  if (confirmDlg.type === "restore") {
                    restoreMut.mutate(confirmDlg.item.id);
                  } else {
                    deleteMut.mutate(confirmDlg.item.id);
                  }
                }
                setConfirmDlg({ open: false, item: null, type: "restore" });
              }}
            >
              {confirmDlg.type === "restore" ? "Restore Now" : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
