import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MOCK_DATA } from "@/lib/mock-data";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, AlertTriangle, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const dataGrievances = [
  { name: 'Road', value: 400 },
  { name: 'Water', value: 300 },
  { name: 'Power', value: 300 },
  { name: 'Health', value: 200 },
  { name: 'School', value: 100 },
];

const dataProjects = [
  { name: 'Completed', value: 42, color: '#10B981' },
  { name: 'Running', value: 14, color: '#3B82F6' },
  { name: 'Pending', value: 8, color: '#F59E0B' },
  { name: 'On Hold', value: 3, color: '#EF4444' },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Dashboard() {
  return (
    <MainLayout title="Overview">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {MOCK_DATA.stats.map((stat, i) => (
          <Card key={i} className="glass-card hover:-translate-y-1 transition-transform duration-300">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <div className="mt-2">
                <h3 className="text-2xl font-bold font-heading text-foreground">{stat.value}</h3>
                <div className="flex items-center gap-1 mt-1">
                  {stat.status === "success" && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
                  {stat.status === "warning" && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                  <span className={`text-xs font-medium ${
                    stat.status === "success" ? "text-emerald-500" : 
                    stat.status === "warning" ? "text-amber-500" : "text-muted-foreground"
                  }`}>
                    {stat.trend}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="glass-card border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Grievances by Category</CardTitle>
            <CardDescription>Breakdown of citizen complaints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataGrievances} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {dataGrievances.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Project Status</CardTitle>
            <CardDescription>Current development works distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataProjects}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dataProjects.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Grievances & Top Projects */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Grievances Table */}
        <Card className="xl:col-span-2 glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Grievances</CardTitle>
              <CardDescription>Latest complaints from citizens</CardDescription>
            </div>
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">ID</th>
                    <th className="px-4 py-3">Citizen</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 rounded-r-lg text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {MOCK_DATA.recentGrievances.map((item, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{item.id}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.citizen}</td>
                      <td className="px-4 py-3">{item.category}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={
                          item.priority === 'High' || item.priority === 'Critical' ? 'border-red-200 text-red-600 bg-red-50 dark:bg-red-900/20' : 
                          item.priority === 'Medium' ? 'border-amber-200 text-amber-600 bg-amber-50 dark:bg-amber-900/20' : 
                          'border-slate-200 text-slate-600 bg-slate-50 dark:bg-slate-800/50'
                        }>{item.priority}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                           item.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                           item.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                           'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                             item.status === 'Resolved' ? 'bg-emerald-500' :
                             item.status === 'In Progress' ? 'bg-blue-500' :
                             'bg-slate-500'
                          }`}></span>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Active Projects List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Project Highlights</CardTitle>
            <CardDescription>Top active infrastructure works</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {MOCK_DATA.projects.slice(0, 4).map((project, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-sm text-foreground">{project.name}</h4>
                    <span className="text-xs text-muted-foreground">{project.ward} • {project.budget}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5">{project.status}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        project.status === 'Completed' ? 'bg-emerald-500' : 
                        project.status === 'Running' ? 'bg-blue-500' : 
                        project.status === 'On Hold' ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{project.progress}%</span>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full text-xs">View All Projects</Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
