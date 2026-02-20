import { useState, useMemo } from "react";
import { Link } from "wouter";
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
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
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
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
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
    <div className="space-y-2.5">
      {data.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">{item.label}</span>
            <span className="font-mono text-muted-foreground">
              {item.value.toLocaleString()}{" "}
              <span className="text-[10px]">
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
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!totals) {
    return (
      <MainLayout title="Demographics">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <BarChart3 className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
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
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Demographics Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Constituency-wide population analysis across{" "}
            {report?.totalWards || 0} wards
          </p>
        </div>

        {/* ═══ Summary Cards ═════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Population"
            value={totals.totalPopulation.toLocaleString()}
            color="#3b82f6"
          />
          <StatCard
            icon={Home}
            label="Households"
            value={totals.totalHouseholds.toLocaleString()}
            sub={`BPL: ${totals.bplHouseholds.toLocaleString()} (${((totals.bplHouseholds / (totals.totalHouseholds || 1)) * 100).toFixed(1)}%)`}
            color="#f59e0b"
          />
          <StatCard
            icon={Vote}
            label="Total Voters"
            value={totals.totalVoters.toLocaleString()}
            sub={`${((totals.totalVoters / pop) * 100).toFixed(1)}% of pop`}
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Male"
            value={totals.maleCount.toLocaleString()}
            sub={`${((totals.maleCount / pop) * 100).toFixed(1)}%`}
            color="#3b82f6"
          />
          <StatCard
            icon={Heart}
            label="Female"
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
        <div className="grid md:grid-cols-2 gap-4">
          <ChartCard title="Gender Distribution">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.gender}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
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
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Age Distribution">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.age}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip formatter={(val: number) => val.toLocaleString()} />
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
        <div className="grid md:grid-cols-2 gap-4">
          <ChartCard title="Religion Distribution">
            {charts.religion.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.religion}
                      cx="50%"
                      cy="45%"
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="label"
                      label={({ label, percent }) =>
                        `${label} ${(percent * 100).toFixed(1)}%`
                      }
                      labelLine={false}
                    >
                      {charts.religion.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => val.toLocaleString()}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">
                No religion data available.
              </p>
            )}
          </ChartCard>

          <ChartCard title="Social Category (Caste)">
            <DistributionBars data={charts.caste} total={pop} />
          </ChartCard>
        </div>

        {/* ═══ Charts Row 3: Economic + Voters ═══════════ */}
        <div className="grid md:grid-cols-3 gap-4">
          <ChartCard title="Economic Status (Households)">
            <DistributionBars
              data={charts.economic}
              total={totals.totalHouseholds}
            />
            <div className="mt-4 flex gap-2">
              <div className="flex-1 text-center p-2 rounded bg-red-50 dark:bg-red-900/20">
                <p className="text-lg font-bold text-red-600">
                  {(
                    (totals.bplHouseholds / (totals.totalHouseholds || 1)) *
                    100
                  ).toFixed(1)}
                  %
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Below Poverty
                </p>
              </div>
              <div className="flex-1 text-center p-2 rounded bg-green-50 dark:bg-green-900/20">
                <p className="text-lg font-bold text-green-600">
                  {(
                    (totals.aplHouseholds / (totals.totalHouseholds || 1)) *
                    100
                  ).toFixed(1)}
                  %
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Above Poverty
                </p>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Voter Statistics">
            <DistributionBars data={charts.voter} total={totals.totalVoters} />
            <div className="mt-4 p-3 rounded bg-muted/50 text-center">
              <p className="text-2xl font-bold">
                {totals.totalVoters.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {((totals.totalVoters / pop) * 100).toFixed(1)}% of total
                population
              </p>
            </div>
          </ChartCard>

          <ChartCard title="Literacy Rate">
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
                <div key={l.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{l.label}</span>
                    <span className="font-mono">
                      {l.value ? `${l.value.toFixed(1)}%` : "N/A"}
                    </span>
                  </div>
                  {l.value && (
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
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
                  <div className="text-center p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">
                      Gender Gap:{" "}
                      <span className="font-mono font-medium">
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Zone-wise Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {byZone.map((z: any) => (
                  <div key={z.zone} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{z.zone}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {z.wardCount} wards
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Population</p>
                        <p className="font-mono font-medium">
                          {z.totalPopulation.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Voters</p>
                        <p className="font-mono font-medium">
                          {z.totalVoters.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Male</p>
                        <p className="font-mono font-medium">
                          {z.maleCount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">BPL</p>
                        <p className="font-mono font-medium">
                          {z.bplHouseholds.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Progress
                      value={(z.totalPopulation / pop) * 100}
                      className="h-1.5"
                    />
                    <p className="text-[10px] text-muted-foreground text-right">
                      {((z.totalPopulation / pop) * 100).toFixed(1)}% of
                      constituency
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Ward Comparison Table ═════════════════════ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Ward-wise Comparison
              </CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search ward..."
                    value={wardSearch}
                    onChange={(e) => setWardSearch(e.target.value)}
                    className="pl-8 h-8 w-40 text-xs"
                  />
                </div>
                <Select value={zoneFilter} onValueChange={setZoneFilter}>
                  <SelectTrigger className="h-8 w-28 text-xs">
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
            <Tabs value={tableTab} onValueChange={setTableTab}>
              <div className="px-4">
                <TabsList className="grid w-full grid-cols-5 h-8">
                  <TabsTrigger value="population" className="text-xs">
                    Population
                  </TabsTrigger>
                  <TabsTrigger value="age" className="text-xs">
                    Age
                  </TabsTrigger>
                  <TabsTrigger value="religion" className="text-xs">
                    Religion
                  </TabsTrigger>
                  <TabsTrigger value="caste" className="text-xs">
                    Caste
                  </TabsTrigger>
                  <TabsTrigger value="economic" className="text-xs">
                    Economic
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Population Tab */}
              <TabsContent value="population" className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead>Zone</TableHead>
                        <TableHead className="text-right">Population</TableHead>
                        <TableHead className="text-right">Male</TableHead>
                        <TableHead className="text-right">Female</TableHead>
                        <TableHead className="text-right">Households</TableHead>
                        <TableHead className="text-right">Voters</TableHead>
                        <TableHead className="text-right">Literacy</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWards.map((w: any) => (
                        <TableRow key={w.wardId} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-muted-foreground text-xs">
                            {w.wardNumber}
                          </TableCell>
                          <TableCell>
                            <Link to={`/wards/${w.wardId}`}>
                              <span className="font-medium text-primary hover:underline cursor-pointer text-sm">
                                {w.wardName}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell>
                            {w.zone && (
                              <Badge variant="outline" className="text-[10px]">
                                {w.zone}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {w.totalPopulation.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-blue-600">
                            {w.maleCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-pink-600">
                            {w.femaleCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {w.totalHouseholds.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {w.totalVoters.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {w.literacyRate
                              ? `${w.literacyRate.toFixed(1)}%`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress
                                value={(w.totalPopulation / pop) * 100}
                                className="h-1.5 w-16"
                              />
                              <span className="font-mono text-xs w-10 text-right">
                                {((w.totalPopulation / pop) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredWards.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No wards found.
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredWards.length > 0 && (
                        <TableRow className="font-semibold bg-muted/50">
                          <TableCell />
                          <TableCell>Total</TableCell>
                          <TableCell />
                          <TableCell className="text-right font-mono">
                            {totals.totalPopulation.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-blue-600">
                            {totals.maleCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-pink-600">
                            {totals.femaleCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {totals.totalHouseholds.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {totals.totalVoters.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {totals.literacyRate
                              ? `${totals.literacyRate.toFixed(1)}%`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            100%
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Age Tab */}
              <TabsContent value="age" className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead className="text-right">0-6</TableHead>
                        <TableHead className="text-right">7-18</TableHead>
                        <TableHead className="text-right">19-35</TableHead>
                        <TableHead className="text-right">36-60</TableHead>
                        <TableHead className="text-right">60+</TableHead>
                        <TableHead className="text-right">Youth %</TableHead>
                        <TableHead className="text-right">Senior %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWards.map((w: any) => {
                        const wPop = w.totalPopulation || 1;
                        return (
                          <TableRow key={w.wardId}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {w.wardNumber}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {w.wardName}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.age0to6.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.age7to18.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.age19to35.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.age36to60.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.age60plus.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-green-600">
                              {((w.age19to35 / wPop) * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-purple-600">
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
              <TabsContent value="religion" className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead className="text-right">Hindu</TableHead>
                        <TableHead className="text-right">Muslim</TableHead>
                        <TableHead className="text-right">Sikh</TableHead>
                        <TableHead className="text-right">Christian</TableHead>
                        <TableHead className="text-right">Buddhist</TableHead>
                        <TableHead className="text-right">Jain</TableHead>
                        <TableHead className="text-right">Other</TableHead>
                        <TableHead className="text-right">Majority</TableHead>
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
                          <TableRow key={w.wardId}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {w.wardNumber}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {w.wardName}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.hinduCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.muslimCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.sikhCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.christianCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.buddhistCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.jainCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.otherReligionCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
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
              <TabsContent value="caste" className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead className="text-right">General</TableHead>
                        <TableHead className="text-right">OBC</TableHead>
                        <TableHead className="text-right">SC</TableHead>
                        <TableHead className="text-right">ST</TableHead>
                        <TableHead className="text-right">Minority</TableHead>
                        <TableHead className="text-right">SC/ST %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWards.map((w: any) => {
                        const wPop = w.totalPopulation || 1;
                        return (
                          <TableRow key={w.wardId}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {w.wardNumber}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {w.wardName}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.generalCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.obcCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.scCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.stCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.minorityCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={
                                  ((w.scCount + w.stCount) / wPop) * 100 > 30
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-[10px]"
                              >
                                {(
                                  ((w.scCount + w.stCount) / wPop) *
                                  100
                                ).toFixed(1)}
                                %
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
              <TabsContent value="economic" className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead className="text-right">Households</TableHead>
                        <TableHead className="text-right">BPL</TableHead>
                        <TableHead className="text-right">APL</TableHead>
                        <TableHead className="text-right">BPL %</TableHead>
                        <TableHead className="text-right">Literacy</TableHead>
                        <TableHead className="text-right">M Voters</TableHead>
                        <TableHead className="text-right">F Voters</TableHead>
                        <TableHead className="text-right">Voter %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWards.map((w: any) => {
                        const hh = w.totalHouseholds || 1;
                        const wPop = w.totalPopulation || 1;
                        const bplPct = (w.bplHouseholds / hh) * 100;
                        return (
                          <TableRow key={w.wardId}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {w.wardNumber}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {w.wardName}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.totalHouseholds.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-red-600">
                              {w.bplHouseholds.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-green-600">
                              {w.aplHouseholds.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Progress
                                  value={bplPct}
                                  className="h-1.5 w-12 [&>div]:bg-red-500"
                                />
                                <span
                                  className={`font-mono text-xs ${bplPct > 20 ? "text-red-600 font-bold" : ""}`}
                                >
                                  {bplPct.toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {w.literacyRate
                                ? `${w.literacyRate.toFixed(1)}%`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-blue-600">
                              {w.maleVoters.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-pink-600">
                              {w.femaleVoters.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
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
