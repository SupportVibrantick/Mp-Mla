import { useState } from "react";
import { Link } from "wouter";
import { useCompetitors, useDeleteCompetitor } from "@/hooks/useCompetitors";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Trash2,
  Edit,
  Eye,
  LineChart,
  ShieldAlert,
  Users
} from "lucide-react";
import { format } from "date-fns";

export default function CompetitorListPage() {
  const [search, setSearch] = useState("");
  const { data: res, isLoading } = useCompetitors({ search });
  const { mutateAsync: deleteCompetitor, isPending: isDeleting } = useDeleteCompetitor();

  const competitors = res?.data || [];

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this competitor?")) {
      await deleteCompetitor(id);
    }
  };

  return (
    <MainLayout title="Competitors">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="h-7 w-7 text-primary" /> Competitors
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage rival political figures and track their metrics for AI analysis.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/competitor-analysis/dashboard">
              <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5">
                <LineChart className="h-4 w-4" /> AI Analysis Dashboard
              </Button>
            </Link>
            <Link to="/competitor-analysis/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Competitor
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search competitors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competitor Name</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : competitors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No competitors found.</p>
                      </TableCell>
                    </TableRow>
                      ) : (
                        competitors.map((comp: any) => (
                          <TableRow key={comp.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                                  {comp.candidatePhoto ? (
                                    <img src={comp.candidatePhoto} alt={comp.candidateName} className="w-full h-full object-cover" />
                                  ) : (
                                    (comp.candidateName || "").substring(0, 2).toUpperCase()
                                  )}
                                </div>
                                <span className="font-medium">{comp.candidateName}</span>
                              </div>
                            </TableCell>
                            <TableCell>{comp.partyName || "—"}</TableCell>
                            <TableCell>
                              {comp.designation ? (
                                <Badge variant="outline" className="text-xs">
                                  {comp.designation}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                        <TableCell>
                          {comp.isActive ? (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(comp.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link to={`/competitor-analysis/${comp.id}`}>
                              <Button variant="ghost" size="icon" title="View & Analysis">
                                <Eye className="h-4 w-4 text-blue-500" />
                              </Button>
                            </Link>
                            <Link to={`/competitor-analysis/${comp.id}/edit`}>
                              <Button variant="ghost" size="icon" title="Edit">
                                <Edit className="h-4 w-4 text-amber-500" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Delete" 
                              disabled={isDeleting}
                              onClick={() => handleDelete(comp.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
