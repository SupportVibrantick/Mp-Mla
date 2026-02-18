import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, LayoutGrid, List, Calendar, IndianRupee } from "lucide-react";
import { MOCK_DATA } from "@/lib/mock-data";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Projects() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <MainLayout title="Projects">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
           <h2 className="text-2xl font-bold font-heading hidden md:block">Development Works</h2>
           <p className="text-muted-foreground text-sm hidden md:block">Track infrastructure progress across the constituency</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto justify-end">
           <div className="flex bg-muted p-1 rounded-lg border border-border">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("p-1.5 rounded transition-all", viewMode === 'grid' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-1.5 rounded transition-all", viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <List className="h-4 w-4" />
              </button>
           </div>
           <Button className="gap-2 bg-primary hover:bg-primary/90">
             <Plus className="h-4 w-4" />
             New Project
           </Button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_DATA.projects.map((project, i) => (
             <Card key={i} className="glass-card hover:shadow-md transition-all group overflow-hidden border-t-4" style={{ borderTopColor: 
                project.status === 'Completed' ? '#10B981' : 
                project.status === 'Running' ? '#3B82F6' : 
                project.status === 'On Hold' ? '#EF4444' : '#F59E0B'
             }}>
                <CardHeader className="pb-3">
                   <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline">{project.ward}</Badge>
                      <Badge className={
                         project.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100' :
                         project.status === 'Running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100' :
                         project.status === 'On Hold' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100' :
                         'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100'
                      }>{project.status}</Badge>
                   </div>
                   <CardTitle className="text-lg leading-tight">{project.name}</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="space-y-4">
                      <div className="flex justify-between text-sm text-muted-foreground">
                         <div className="flex items-center gap-1">
                            <IndianRupee className="h-3.5 w-3.5" />
                            <span>{project.budget}</span>
                         </div>
                         <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Due: Mar 2024</span>
                         </div>
                      </div>
                      
                      <div className="space-y-1.5">
                         <div className="flex justify-between text-xs font-medium">
                            <span>Progress</span>
                            <span>{project.progress}%</span>
                         </div>
                         <Progress value={project.progress} className="h-2" />
                      </div>
                      
                      <div className="pt-2 flex justify-between items-center border-t border-border/50 mt-4">
                         <div className="text-xs text-muted-foreground">Contractor: <span className="text-foreground font-medium">R.K. Builders</span></div>
                         <Button variant="link" size="sm" className="h-auto p-0 text-primary">Details</Button>
                      </div>
                   </div>
                </CardContent>
             </Card>
          ))}
          {/* Add Placeholder Card for "New" */}
          <button className="border-2 border-dashed border-muted-foreground/20 rounded-xl flex flex-col items-center justify-center p-6 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[200px]">
             <Plus className="h-8 w-8 mb-2" />
             <span className="font-medium">Add New Project</span>
          </button>
        </div>
      ) : (
        <Card className="glass-card">
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                 <tr>
                   <th className="px-6 py-4 rounded-tl-lg">Project Name</th>
                   <th className="px-6 py-4">Ward</th>
                   <th className="px-6 py-4">Budget</th>
                   <th className="px-6 py-4">Progress</th>
                   <th className="px-6 py-4">Status</th>
                   <th className="px-6 py-4 rounded-tr-lg text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border/50">
                 {MOCK_DATA.projects.map((item, i) => (
                   <tr key={i} className="hover:bg-muted/30 transition-colors">
                     <td className="px-6 py-4 font-medium">{item.name}</td>
                     <td className="px-6 py-4 text-muted-foreground">{item.ward}</td>
                     <td className="px-6 py-4">{item.budget}</td>
                     <td className="px-6 py-4 w-48">
                        <div className="flex items-center gap-3">
                           <Progress value={item.progress} className="h-2 w-24" />
                           <span className="text-xs">{item.progress}%</span>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <Badge variant="outline">{item.status}</Badge>
                     </td>
                     <td className="px-6 py-4 text-right">
                       <Button variant="ghost" size="sm">View</Button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </Card>
      )}
    </MainLayout>
  );
}
