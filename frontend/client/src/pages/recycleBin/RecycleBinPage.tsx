import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, RotateCcw, Trash2 } from "lucide-react";

export default function RecycleBinPage() {
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("all");
  const [entityType, setEntityType] = useState("all");

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
        <CardHeader>
          <CardTitle>Deleted Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, id, module..."
            />

            <Select value={module} onValueChange={setModule}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by module" />
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
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
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
                          disabled={restoreMut.isPending || deleteMut.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Restore ${item.recordLabel || item.recordId}?`,
                              )
                            ) {
                              restoreMut.mutate(item.id);
                            }
                          }}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" /> Restore
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={restoreMut.isPending || deleteMut.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Permanently delete this recycle entry for ${item.recordLabel || item.recordId}?`,
                              )
                            ) {
                              deleteMut.mutate(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
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
    </MainLayout>
  );
}
