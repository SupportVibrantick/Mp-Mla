import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  FileDown,
  Filter,
  Calendar as CalendarIcon,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const monthlyData = [
  { month: "Jan", grievances: 120, resolved: 95, projects: 2 },
  { month: "Feb", grievances: 150, resolved: 110, projects: 3 },
  { month: "Mar", grievances: 180, resolved: 140, projects: 5 },
  { month: "Apr", grievances: 140, resolved: 130, projects: 4 },
  { month: "May", grievances: 160, resolved: 145, projects: 6 },
  { month: "Jun", grievances: 200, resolved: 170, projects: 8 },
];

const categoryData = [
  { name: "Roads", value: 35, color: "#3B82F6" },
  { name: "Water", value: 25, color: "#10B981" },
  { name: "Power", value: 20, color: "#F59E0B" },
  { name: "Health", value: 15, color: "#EF4444" },
  { name: "Others", value: 5, color: "#8B5CF6" },
];

const wardPerformance = [
  { ward: "Ward 01", efficiency: 92, cases: 45 },
  { ward: "Ward 02", efficiency: 78, cases: 32 },
  { ward: "Ward 03", efficiency: 85, cases: 58 },
  { ward: "Ward 04", efficiency: 95, cases: 20 },
  { ward: "Ward 05", efficiency: 65, cases: 85 },
];

export default function Reports() {
  return (
    <MainLayout title="Analytics & Reports">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold font-heading tracking-tight">
            Performance Insights
          </h2>
          <p className="text-muted-foreground">
            Comprehensive reporting for constituency development
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            className="gap-2 border-primary/20 hover:bg-primary/5"
          >
            <CalendarIcon className="h-4 w-4" />
            Last 6 Months
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <FileDown className="h-4 w-4" />
            Export Full Report
          </Button>
        </div>
      </div>

      {/* High Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          {
            label: "Overall Efficiency",
            value: "84.2%",
            trend: "+2.4%",
            icon: TrendingUp,
            color: "text-emerald-500",
          },
          {
            label: "Active Citizens",
            value: "12,450",
            trend: "+156",
            icon: Users,
            color: "text-blue-500",
          },
          {
            label: "Critical Issues",
            value: "24",
            trend: "-5",
            icon: AlertCircle,
            color: "text-rose-500",
          },
          {
            label: "Success Rate",
            value: "91%",
            trend: "+1.2%",
            icon: CheckCircle2,
            color: "text-emerald-500",
          },
        ].map((stat, i) => (
          <Card
            key={i}
            className="glass-card border-none overflow-hidden group"
          >
            <CardContent className="p-6 relative">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.label}
                  </p>
                  <h3 className="text-3xl font-bold font-heading">
                    {stat.value}
                  </h3>
                </div>
                <div
                  className={`p-3 rounded-xl bg-muted/50 group-hover:bg-primary/10 transition-colors`}
                >
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none font-medium"
                >
                  {stat.trend}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  vs last period
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-auto w-fit border border-border/50">
          <TabsTrigger
            value="overview"
            className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="grievances"
            className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg"
          >
            Grievances
          </TabsTrigger>
          <TabsTrigger
            value="projects"
            className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg"
          >
            Projects
          </TabsTrigger>
          <TabsTrigger
            value="wards"
            className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg"
          >
            Ward Comparison
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="glass-card border-none p-2">
              <CardHeader>
                <CardTitle>Grievance vs Resolution Trend</CardTitle>
                <CardDescription>
                  Monthly growth and closure tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorG" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#3B82F6"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3B82F6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#10B981"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10B981"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        opacity={0.1}
                      />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        fontSize={12}
                        dy={10}
                      />
                      <YAxis axisLine={false} tickLine={false} fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "16px",
                          border: "none",
                          boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="grievances"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorG)"
                        name="New Cases"
                      />
                      <Area
                        type="monotone"
                        dataKey="resolved"
                        stroke="#10B981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorR)"
                        name="Resolved"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-none p-2">
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>Sector-wise issue breakdown</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        verticalAlign="bottom"
                        align="center"
                        iconType="circle"
                        wrapperStyle={{ paddingTop: "20px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card border-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ward Performance Leaderboard</CardTitle>
                <CardDescription>
                  Efficiency and case load by administrative ward
                </CardDescription>
              </div>
              <Button variant="ghost" className="gap-2 text-primary">
                View All Wards <ArrowUpRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {wardPerformance
                  .sort((a, b) => b.efficiency - a.efficiency)
                  .map((ward, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-muted-foreground w-6">
                            0{i + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-foreground">
                              {ward.ward}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ward.cases} Total Cases
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-sm font-bold ${ward.efficiency > 80 ? "text-emerald-500" : "text-amber-500"}`}
                          >
                            {ward.efficiency}% Efficiency
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${ward.efficiency > 80 ? "bg-emerald-500" : ward.efficiency > 70 ? "bg-amber-500" : "bg-rose-500"}`}
                          style={{ width: `${ward.efficiency}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grievances">
          <Card className="glass-card p-12 text-center flex flex-col items-center justify-center border-dashed">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold font-heading">
              Grievance Deep Dive
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-2">
              Detailed breakdowns by resolution time, department responsiveness,
              and recurring issue patterns.
            </p>
            <Button className="mt-6" variant="outline">
              Generate Detailed View
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
