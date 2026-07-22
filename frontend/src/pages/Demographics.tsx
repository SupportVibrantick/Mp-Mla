import { useState, useMemo } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useDemographicsSummary } from "@/hooks/useDemographics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
import { MainLayout } from "@/components/layout/MainLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Users,
  UserCheck,
  Home,
  GraduationCap,
  Vote,
  MapPin,
  Search,
  BarChart3,
  TrendingUp,
  Baby,
  Heart,
} from "lucide-react";

const COLORS = [
  "#3b82f6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
];

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 bg-card hover:border-primary/20 rounded-2xl">
      <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
        <div className="flex justify-between items-center">
          <div
            className="p-2 rounded-xl border flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}15`, borderColor: `${color}25` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
        </div>
        <div>
          <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
            {label}
          </p>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
            {value}
          </h3>
          {sub && (
            <p className="text-[10px] text-muted-foreground mt-1 font-medium truncate">
              {sub}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden", className)}>
      <CardHeader className="pb-3 px-4 sm:px-6 border-b border-border/30">
        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pt-4">{children}</CardContent>
    </Card>
  );
}

function DistributionBars({
  data,
  total,
}: {
  data: { label: string; value: number; color: string }[];
  total: number;
}) {
  return (
    <div className="space-y-3 font-semibold text-xs sm:text-sm">
      {data.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-foreground">{item.label}</span>
            <span className="font-mono text-muted-foreground">
              {item.value.toLocaleString()}{" "}
              <span className="text-[10px] font-bold">
                ({((item.value / (total || 1)) * 100).toFixed(1)}%)
              </span>
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / (total || 1)) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DemographicsPage() {
  const { data: res, isLoading } = useDemographicsSummary();
  const [wardSearch, setWardSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [tableTab, setTableTab] = useState("population");

  const report = res?.data;
  const totals = report?.totals;
  const charts = report?.charts;
  const wardData = report?.wardComparison || [];
  const byZone = report?.byZone || [];

  const zones = useMemo(
    () => [...new Set(wardData.map((w: any) => w.zone).filter(Boolean))],
    [wardData],
  );

  const filteredWards = useMemo(() => {
    return wardData.filter((w: any) => {
      const matchSearch = w.wardName
        .toLowerCase()
        .includes(wardSearch.toLowerCase());
      const matchZone = zoneFilter === "all" || w.zone === zoneFilter;
      return matchSearch && matchZone;
    });
  }, [wardData, wardSearch, zoneFilter]);

  if (isLoading) {
    return (
      <MainLayout title="Demographics">
        <div className="space-y-4 sm:space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 sm:h-20" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <Skeleton className="h-60 sm:h-80" />
            <Skeleton className="h-60 sm:h-80" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!totals) {
    return (
      <MainLayout title="Demographics">
        <div className="flex flex-col items-center justify-center h-64 gap-4 px-4">
          <BarChart3 className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center text-sm">
            No demographic data available. Add wards with demographics first.
          </p>
          <Link to="/wards/new">
            <Badge variant="outline" className="cursor-pointer">
              Go to Wards →
            </Badge>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const pop = totals.totalPopulation || 1;

  return (
    <MainLayout title="Demographics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <BarChart3 className="h-7 w-7 text-primary" /> Demographics Report
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Constituency-wide population analysis across {report?.totalWards || 0} wards
            </p>
          </div>
        </div>

        {/* ═══ Summary Cards Row 1 ═══════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Population"
            value={totals.totalPopulation.toLocaleString()}
            color="#3b82f6"
          />
          <StatCard
            icon={Home}
            label="Total Households"
            value={totals.totalHouseholds.toLocaleString()}
            sub={`BPL: ${totals.bplHouseholds.toLocaleString()} (${((totals.bplHouseholds / (totals.totalHouseholds || 1)) * 100).toFixed(1)}%)`}
            color="#f59e0b"
          />
          <StatCard
            icon={Vote}
            label="Total Voters"
            value={totals.totalVoters.toLocaleString()}
            sub={`${((totals.totalVoters / pop) * 100).toFixed(1)}% of total pop`}
            color="#10b981"
          />
          <StatCard
            icon={GraduationCap}
            label="Literacy Rate"
            value={
              totals.literacyRate ? `${totals.literacyRate.toFixed(1)}%` : "N/A"
            }
            sub={
              totals.maleLiteracyRate
                ? `M: ${totals.maleLiteracyRate.toFixed(1)}% | F: ${totals.femaleLiteracyRate?.toFixed(1)}%`
                : undefined
            }
            color="#8b5cf6"
          />
        </div>

        {/* ═══ Vital Stats Summary Row ═══════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={Baby}
            label="Total Births"
            value={(totals.totalBirths || 0).toLocaleString()}
            color="#22c55e"
          />
          <StatCard
            icon={Heart}
            label="Total Deaths"
            value={(totals.totalDeaths || 0).toLocaleString()}
            color="#ef4444"
          />
          <StatCard
            icon={UserCheck}
            label="New Eligible Voters"
            value={(totals.newVotersCount || 0).toLocaleString()}
            color="#3b82f6"
          />
        </div>

        {/* ═══ Summary Cards Row 2 ═══════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Male count"
            value={totals.maleCount.toLocaleString()}
            sub={`${((totals.maleCount / pop) * 100).toFixed(1)}%`}
            color="#3b82f6"
          />
          <StatCard
            icon={Heart}
            label="Female count"
            value={totals.femaleCount.toLocaleString()}
            sub={`${((totals.femaleCount / pop) * 100).toFixed(1)}%`}
            color="#ec4899"
          />
          <StatCard
            icon={Baby}
            label="Children (0-6)"
            value={totals.age0to6.toLocaleString()}
            sub={`${((totals.age0to6 / pop) * 100).toFixed(1)}%`}
            color="#f97316"
          />
          <StatCard
            icon={UserCheck}
            label="Senior (60+)"
            value={totals.age60plus.toLocaleString()}
            sub={`${((totals.age60plus / pop) * 100).toFixed(1)}%`}
            color="#8b5cf6"
          />
        </div>

        {/* ═══ Charts Row 1: Gender + Age ════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Gender Distribution">
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.gender}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="label"
                  >
                    {charts.gender.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => val.toLocaleString()}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      fontSize: "11px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Age Distribution">
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts.age}
                  margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="label" fontSize={10} tickLine={false} />
                  <YAxis
                    fontSize={10}
                    tickLine={false}
                    width={35}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(val: number) => val.toLocaleString()}
                    contentStyle={{ fontSize: "11px", borderRadius: "12px" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Population">
                    {charts.age.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* ═══ Charts Row 2: Religion + Caste ════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Religion Distribution">
            {charts.religion.length > 0 ? (
              <div className="h-56 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.religion}
                      cx="50%"
                      cy="45%"
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="label"
                      label={({ label, percent }) =>
                        percent > 0.03
                          ? `${label} ${(percent * 100).toFixed(0)}%`
                          : ""
                      }
                      labelLine={false}
                      fontSize={10}
                    >
                      {charts.religion.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => val.toLocaleString()}
                      contentStyle={{ fontSize: "11px", borderRadius: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px" }} iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-xs font-semibold">
                No religion data available.
              </p>
            )}
          </ChartCard>

          <ChartCard title="Social Category (Caste)">
            <DistributionBars data={charts.caste} total={pop} />
          </ChartCard>

          <ChartCard title="Vital Statistics (Comparative)">
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { label: "Births", value: totals.totalBirths, fill: "#22c55e" },
                    { label: "Deaths", value: totals.totalDeaths, fill: "#ef4444" },
                    { label: "New Voters", value: totals.newVotersCount, fill: "#3b82f6" },
                  ]}
                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-center gap-4 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#22c55e]" /> Births</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#ef4444]" /> Deaths</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#3b82f6]" /> New Voters</span>
            </div>
          </ChartCard>
        </div>

        {/* ═══ Charts Row 3: Economic + Voters + Literacy ═ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartCard title="Economic Status (Households)">
            <DistributionBars
              data={charts.economic}
              total={totals.totalHouseholds}
            />
            <div className="mt-4 flex gap-2.5">
              <div className="flex-1 text-center p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100/30">
                <p className="text-sm sm:text-lg font-bold text-rose-600">
                  {(
                    (totals.bplHouseholds / (totals.totalHouseholds || 1)) *
                    100
                  ).toFixed(1)}
                  %
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">
                  Below Poverty
                </p>
              </div>
              <div className="flex-1 text-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/30">
                <p className="text-sm sm:text-lg font-bold text-emerald-600">
                  {(
                    (totals.aplHouseholds / (totals.totalHouseholds || 1)) *
                    100
                  ).toFixed(1)}
                  %
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">
                  Above Poverty
                </p>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Voter Statistics">
            <DistributionBars data={charts.voter} total={totals.totalVoters} />
            <div className="mt-4 p-3 rounded-xl bg-muted/30 text-center border">
              <p className="text-lg sm:text-2xl font-bold font-mono">
                {totals.totalVoters.toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase mt-0.5">
                {((totals.totalVoters / pop) * 100).toFixed(1)}% of total population
              </p>
            </div>
          </ChartCard>

          <ChartCard
            title="Literacy Rate"
            className="sm:col-span-2 lg:col-span-1"
          >
            <div className="space-y-4">
              {[
                {
                  label: "Overall",
                  value: totals.literacyRate,
                  color: "#8b5cf6",
                },
                {
                  label: "Male",
                  value: totals.maleLiteracyRate,
                  color: "#3b82f6",
                },
                {
                  label: "Female",
                  value: totals.femaleLiteracyRate,
                  color: "#ec4899",
                },
              ].map((l) => (
                <div key={l.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs sm:text-sm font-semibold">
                    <span className="text-foreground">{l.label}</span>
                    <span className="font-mono">
                      {l.value ? `${l.value.toFixed(1)}%` : "N/A"}
                    </span>
                  </div>
                  {l.value && (
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${l.value}%`,
                          backgroundColor: l.color,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
              {totals.literacyRate &&
                totals.maleLiteracyRate &&
                totals.femaleLiteracyRate && (
                  <div className="text-center p-2 rounded-xl bg-muted/30 border">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold">
                      Gender Gap:{" "}
                      <span className="font-mono text-foreground font-extrabold ml-1">
                        {(
                          totals.maleLiteracyRate - totals.femaleLiteracyRate
                        ).toFixed(1)}
                        %
                      </span>
                    </p>
                  </div>
                )}
            </div>
          </ChartCard>
        </div>

        {/* ═══ Zone Summary ══════════════════════════════ */}
        {byZone.length > 1 && (
          <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="pb-3 px-4 sm:px-6 border-b border-border/30">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Zone-wise Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {byZone.map((z: any) => (
                  <div
                    key={z.zone}
                    className="p-4 rounded-2xl border border-border/50 bg-card/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">
                        {z.zone}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] sm:text-[10px] font-bold border-border/80 px-2 py-0.5"
                      >
                        {z.wardCount} wards
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Population</p>
                        <p className="font-mono font-bold text-foreground">
                          {z.totalPopulation.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Voters</p>
                        <p className="font-mono font-bold text-foreground">
                          {z.totalVoters.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Male</p>
                        <p className="font-mono font-bold text-foreground">
                          {z.maleCount.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">BPL</p>
                        <p className="font-mono font-bold text-foreground">
                          {z.bplHouseholds.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Progress
                      value={(z.totalPopulation / pop) * 100}
                      className="h-1.5"
                    />
                    <p className="text-[10px] text-muted-foreground text-right font-medium">
                      {((z.totalPopulation / pop) * 100).toFixed(1)}% of constituency
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Ward Comparison Table ═════════════════════ */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardHeader className="pb-3 px-4 sm:px-6 border-b border-border/30">
            <div className="flex flex-col gap-3">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Ward-wise Comparison Directory
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search ward..."
                    value={wardSearch}
                    onChange={(e) => setWardSearch(e.target.value)}
                    className="pl-8 h-9 w-full sm:w-48 text-xs bg-muted/20 border-border/60"
                  />
                </div>
                <Select value={zoneFilter} onValueChange={setZoneFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-36 text-xs border-border/60 bg-muted/10">
                    <SelectValue placeholder="Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Zones</SelectItem>
                    {zones.map((z: string) => (
                      <SelectItem key={z} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={tableTab} onValueChange={setTableTab} className="space-y-0">
              <div className="px-4 py-3 bg-muted/25 border-b border-border/40 overflow-x-auto">
                <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-5 h-9 bg-muted/40 border p-1 rounded-xl max-w-lg">
                  <TabsTrigger
                    value="population"
                    className="text-[10px] sm:text-xs px-2.5 sm:px-3 whitespace-nowrap font-semibold rounded-lg"
                  >
                    Population
                  </TabsTrigger>
                  <TabsTrigger
                    value="age"
                    className="text-[10px] sm:text-xs px-2.5 sm:px-3 whitespace-nowrap font-semibold rounded-lg"
                  >
                    Age Groups
                  </TabsTrigger>
                  <TabsTrigger
                    value="religion"
                    className="text-[10px] sm:text-xs px-2.5 sm:px-3 whitespace-nowrap font-semibold rounded-lg"
                  >
                    Religion
                  </TabsTrigger>
                  <TabsTrigger
                    value="caste"
                    className="text-[10px] sm:text-xs px-2.5 sm:px-3 whitespace-nowrap font-semibold rounded-lg"
                  >
                    Caste Category
                  </TabsTrigger>
                  <TabsTrigger
                    value="economic"
                    className="text-[10px] sm:text-xs px-2.5 sm:px-3 whitespace-nowrap font-semibold rounded-lg"
                  >
                    Economic & Voters
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Population Tab */}
              <TabsContent value="population" className="mt-0 outline-none">
                <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="w-14 h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">#</TableHead>
                        <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Ward</TableHead>
                        <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Zone</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Population</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Male</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Female</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Households</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Voters</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Literacy</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">% of Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWards.map((w: any) => (
                        <TableRow key={w.wardId} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                          <TableCell className="font-mono text-muted-foreground py-4 px-4 font-semibold text-xs">
                            {w.wardNumber}
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <Link to={`/wards/${w.wardId}`}>
                              <span className="font-semibold text-primary hover:underline cursor-pointer text-xs sm:text-sm">
                                {w.wardName}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            {w.zone && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-bold border-border/80 px-2 py-0.5"
                              >
                                {w.zone}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                            {w.totalPopulation.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-blue-600">
                            {w.maleCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-pink-600">
                            {w.femaleCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                            {w.totalHouseholds.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                            {w.totalVoters.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                            {w.literacyRate
                              ? `${w.literacyRate.toFixed(1)}%`
                              : "—"}
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <Progress
                                value={(w.totalPopulation / pop) * 100}
                                className="h-1.5 w-16"
                              />
                              <span className="font-mono text-xs font-bold w-10 text-right text-muted-foreground">
                                {((w.totalPopulation / pop) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredWards.length === 0 && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell
                            colSpan={10}
                            className="text-center py-16 text-muted-foreground text-xs font-semibold"
                          >
                            No wards found.
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredWards.length > 0 && (
                        <TableRow className="font-bold bg-muted/20 border-t hover:bg-muted/25">
                          <TableCell className="py-4 px-4" />
                          <TableCell className="py-4 px-4 text-sm">Total</TableCell>
                          <TableCell className="py-4 px-4" />
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-extrabold text-foreground">
                            {totals.totalPopulation.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-extrabold text-blue-600">
                            {totals.maleCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-extrabold text-pink-600">
                            {totals.femaleCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-extrabold text-foreground">
                            {totals.totalHouseholds.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-extrabold text-foreground">
                            {totals.totalVoters.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-extrabold text-foreground">
                            {totals.literacyRate
                              ? `${totals.literacyRate.toFixed(1)}%`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-extrabold text-foreground">
                            100%
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Age Tab */}
              <TabsContent value="age" className="mt-0 outline-none">
                <div className="overflow-x-auto">
                  <Table className="min-w-[650px]">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="w-14 h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">#</TableHead>
                        <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Ward</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">0-6</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">7-18</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">19-35</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">36-60</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">60+</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Youth %</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Senior %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWards.map((w: any) => {
                        const wPop = w.totalPopulation || 1;
                        return (
                          <TableRow key={w.wardId} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                            <TableCell className="font-mono text-[10px] sm:text-xs text-muted-foreground py-4 px-4 font-semibold">
                              {w.wardNumber}
                            </TableCell>
                            <TableCell className="font-semibold text-xs sm:text-sm py-4 px-4 text-foreground">
                              {w.wardName}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.age0to6.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.age7to18.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.age19to35.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.age36to60.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.age60plus.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-emerald-600">
                              {((w.age19to35 / wPop) * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-purple-600">
                              {((w.age60plus / wPop) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Religion Tab */}
              <TabsContent value="religion" className="mt-0 outline-none">
                <div className="overflow-x-auto">
                  <Table className="min-w-[750px]">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="w-14 h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">#</TableHead>
                        <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Ward</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Hindu</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Muslim</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Sikh</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Christian</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Buddhist</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Jain</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Other</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Majority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWards.map((w: any) => {
                        const religions = [
                          { name: "Hindu", val: w.hinduCount },
                          { name: "Muslim", val: w.muslimCount },
                          { name: "Sikh", val: w.sikhCount },
                          { name: "Christian", val: w.christianCount },
                          { name: "Buddhist", val: w.buddhistCount },
                          { name: "Jain", val: w.jainCount },
                        ];
                        const majority = religions.reduce((a, b) =>
                          a.val > b.val ? a : b,
                        );
                        const wPop = w.totalPopulation || 1;
                        return (
                          <TableRow key={w.wardId} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                            <TableCell className="font-mono text-[10px] sm:text-xs text-muted-foreground py-4 px-4 font-semibold">
                              {w.wardNumber}
                            </TableCell>
                            <TableCell className="font-semibold text-xs sm:text-sm py-4 px-4 text-foreground">
                              {w.wardName}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.hinduCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.muslimCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.sikhCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.christianCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.buddhistCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.jainCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.otherReligionCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="py-4 px-4 align-middle text-right">
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-bold border px-2 py-0.5"
                              >
                                {majority.name}{" "}
                                {((majority.val / wPop) * 100).toFixed(0)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Caste Tab */}
              <TabsContent value="caste" className="mt-0 outline-none">
                <div className="overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="w-14 h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">#</TableHead>
                        <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Ward</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">General</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">OBC</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">SC</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">ST</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Minority</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">SC/ST %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWards.map((w: any) => {
                        const wPop = w.totalPopulation || 1;
                        return (
                          <TableRow key={w.wardId} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                            <TableCell className="font-mono text-[10px] sm:text-xs text-muted-foreground py-4 px-4 font-semibold">
                              {w.wardNumber}
                            </TableCell>
                            <TableCell className="font-semibold text-xs sm:text-sm py-4 px-4 text-foreground">
                              {w.wardName}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.generalCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.obcCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.scCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.stCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.minorityCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="py-4 px-4 align-middle text-right">
                              <Badge
                                variant={
                                  ((w.scCount + w.stCount) / wPop) * 100 > 30
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-[10px] font-bold border px-2 py-0.5"
                              >
                                {(
                                  ((w.scCount + w.stCount) / wPop) *
                                  100
                                ).toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Economic Tab */}
              <TabsContent value="economic" className="mt-0 outline-none">
                <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="w-14 h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">#</TableHead>
                        <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Ward</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Households</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">BPL</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">APL</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">BPL %</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Literacy</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">M Voters</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">F Voters</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Voter %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWards.map((w: any) => {
                        const hh = w.totalHouseholds || 1;
                        const wPop = w.totalPopulation || 1;
                        const bplPct = (w.bplHouseholds / hh) * 100;
                        return (
                          <TableRow key={w.wardId} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                            <TableCell className="font-mono text-[10px] sm:text-xs text-muted-foreground py-4 px-4 font-semibold">
                              {w.wardNumber}
                            </TableCell>
                            <TableCell className="font-semibold text-xs sm:text-sm py-4 px-4 text-foreground">
                              {w.wardName}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.totalHouseholds.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-rose-600">
                              {w.bplHouseholds.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-emerald-600">
                              {w.aplHouseholds.toLocaleString()}
                            </TableCell>
                            <TableCell className="py-4 px-4 align-middle text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                <Progress
                                  value={bplPct}
                                  className="h-1.5 w-12"
                                />
                                <span
                                  className={`font-mono text-xs font-bold w-12 text-right ${bplPct > 20 ? "text-rose-600 font-extrabold" : "text-muted-foreground"}`}
                                >
                                  {bplPct.toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {w.literacyRate
                                ? `${w.literacyRate.toFixed(1)}%`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-blue-600">
                              {w.maleVoters.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-pink-600">
                              {w.femaleVoters.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {((w.totalVoters / wPop) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
