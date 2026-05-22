import { useMemo } from "react";
import { useCompetitorDashboard } from "@/hooks/useCompetitors";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts";
import { ShieldAlert, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function CompetitorDashboard() {
  const { data: res, isLoading } = useCompetitorDashboard();

  const data = res?.data;
  const recentAnalysis = data?.recentAnalyses?.[0]; // Get the most recent overall analysis

  const comparisonData = useMemo(() => {
    if (!data) return [];
    
    return (data.competitors || []).map((comp: any) => ({
      name: comp.candidateName || "Unknown",
      score: comp.latestAnalysis?.overallScore ?? 0,
      type: comp.threatLevel,
    }));
  }, [data]);

  return (
    <MainLayout title="Competitor Analysis Dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-primary" /> Competitor Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-driven insights comparing our performance against regional competitors.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
        ) : !data ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No data available to display.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top Level Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Competitors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.overview?.totalCompetitors || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active tracked rivals</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Recent Analyses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.overview?.totalAnalyzed || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Competitors with AI reports</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Own Metrics Snapshot</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {data.overview?.totalOwnMetrics || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Auto-collected own metrics</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: AI Insights */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-primary/20 shadow-sm">
                  <CardHeader className="bg-primary/5 pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" /> AI Executive Summary
                    </CardTitle>
                    <CardDescription>
                      Latest holistic analysis from our AI engine based on all available data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {recentAnalysis ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{recentAnalysis.summary}</ReactMarkdown>
                        
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                           {/* Vulnerabilities */}
                           {recentAnalysis.vulnerabilities && recentAnalysis.vulnerabilities.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-100 dark:border-red-900/50">
                              <h4 className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold mb-2">
                                <AlertTriangle className="h-4 w-4" /> Vulnerabilities
                              </h4>
                              <ul className="text-sm space-y-1 text-red-900/80 dark:text-red-300">
                                {recentAnalysis.vulnerabilities.map((v: string, i: number) => (
                                  <li key={i}>• {v}</li>
                                ))}
                              </ul>
                            </div>
                           )}

                           {/* Opportunities */}
                           {recentAnalysis.opportunities && recentAnalysis.opportunities.length > 0 && (
                            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-100 dark:border-green-900/50">
                              <h4 className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold mb-2">
                                <Lightbulb className="h-4 w-4" /> Opportunities
                              </h4>
                              <ul className="text-sm space-y-1 text-green-900/80 dark:text-green-300">
                                {recentAnalysis.opportunities.map((o: string, i: number) => (
                                  <li key={i}>• {o}</li>
                                ))}
                              </ul>
                            </div>
                           )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No recent AI analysis available.</p>
                        <p className="text-sm mt-2">Trigger an analysis from a competitor's page.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Strength Comparison Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Competitive Score Comparison</CardTitle>
                    <CardDescription>Latest AI score for our position against each competitor.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ChartContainer config={{ score: { color: "hsl(var(--primary))", label: "Estimated Strength" }}}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={comparisonData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar 
                              dataKey="score" 
                              radius={[4, 4, 0, 0]}
                              fill="var(--color-score)"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Tracked Competitors */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tracked Competitors</CardTitle>
                    <CardDescription>Key figures in the constituency</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.competitors?.map((comp: any) => (
                        <div key={comp.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs">
                               {(comp.candidateName || comp.name || "??").substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{comp.candidateName || comp.name}</p>
                              <p className="text-xs text-muted-foreground">{comp.partyName || comp.party || "Independent"}</p>
                            </div>
                          </div>
                          <Badge variant={comp.threatLevel === "HIGH" ? "destructive" : comp.threatLevel === "LOW" ? "default" : "outline"} className="text-[10px]">
                            {comp.threatLevel}
                          </Badge>
                        </div>
                      ))}
                      {(!data.competitors || data.competitors.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">No competitors added yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
