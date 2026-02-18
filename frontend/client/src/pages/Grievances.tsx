import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter, Search, MoreHorizontal, FileDown } from "lucide-react";
import { MOCK_DATA } from "@/lib/mock-data";

export default function Grievances() {
  // Use mock data but replicate it to show a fuller list
  const allGrievances = [...MOCK_DATA.recentGrievances, ...MOCK_DATA.recentGrievances, ...MOCK_DATA.recentGrievances].map((item, idx) => ({
    ...item,
    id: `GRV-2024-${String(idx + 1).padStart(3, '0')}`
  }));

  return (
    <MainLayout title="Grievances">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, name..."
              className="pl-9 bg-background/50"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </Button>
        </div>
        <div className="flex gap-2 w-full md:w-auto justify-end">
           <Button variant="outline" className="gap-2">
             <FileDown className="h-4 w-4" />
             Export
           </Button>
           <Button className="gap-2 bg-primary hover:bg-primary/90">
             <Plus className="h-4 w-4" />
             New Grievance
           </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
         <Card className="bg-card/50 border-none shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
               <span className="text-2xl font-bold font-heading">1,248</span>
               <span className="text-xs text-muted-foreground uppercase tracking-wider">Total</span>
            </CardContent>
         </Card>
         <Card className="bg-amber-500/10 border-amber-500/20 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
               <span className="text-2xl font-bold font-heading text-amber-600 dark:text-amber-400">412</span>
               <span className="text-xs text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wider">Pending</span>
            </CardContent>
         </Card>
         <Card className="bg-blue-500/10 border-blue-500/20 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
               <span className="text-2xl font-bold font-heading text-blue-600 dark:text-blue-400">215</span>
               <span className="text-xs text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider">In Progress</span>
            </CardContent>
         </Card>
         <Card className="bg-emerald-500/10 border-emerald-500/20 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
               <span className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">621</span>
               <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider">Resolved</span>
            </CardContent>
         </Card>
      </div>

      <Card className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
              <tr>
                <th className="px-6 py-4 rounded-tl-lg">ID</th>
                <th className="px-6 py-4">Citizen</th>
                <th className="px-6 py-4">Ward</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 rounded-tr-lg text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {allGrievances.map((item, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4 font-medium font-mono text-primary">{item.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                       <span className="font-medium">{item.citizen}</span>
                       <span className="text-xs text-muted-foreground">+91 98765 43210</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{item.ward}</td>
                  <td className="px-6 py-4">
                     <Badge variant="secondary" className="font-normal">{item.category}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${
                          item.priority === 'High' || item.priority === 'Critical' ? 'bg-red-500' : 
                          item.priority === 'Medium' ? 'bg-amber-500' : 'bg-slate-300'
                       }`} />
                       <span>{item.priority}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <Badge variant="outline" className={
                        item.status === 'Resolved' ? 'border-emerald-200 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' :
                        item.status === 'In Progress' ? 'border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-900/20' :
                        'border-slate-200 text-slate-600 bg-slate-50 dark:bg-slate-800/50'
                     }>{item.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{item.date}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </MainLayout>
  );
}
