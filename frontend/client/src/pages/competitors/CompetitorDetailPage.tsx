import { type FormEvent, useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useAnalyses,
  useChatHistory,
  useCompetitor,
  useCompetitorMetrics,
  useDeleteCompetitorMetric,
  useSendChatMessage,
  useSubmitCompetitorMetrics,
  useTriggerAnalysis,
} from "@/hooks/useCompetitors";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

const CATEGORY_OPTIONS = [
  { value: "VOTER_OUTREACH", label: "Voter Outreach" },
  { value: "GROUND_NETWORK", label: "Ground Network" },
  { value: "ISSUE_RESOLUTION", label: "Issue Resolution" },
  { value: "PUBLIC_SENTIMENT", label: "Public Sentiment" },
  { value: "DIGITAL_PRESENCE", label: "Digital Presence" },
  { value: "EVENTS_ACTIVITIES", label: "Events & Activities" },
  { value: "FINANCIAL_DEVELOPMENT", label: "Development Work" },
];

const METRIC_TEMPLATES = [
  { category: "VOTER_OUTREACH", metricKey: "door_to_door_visits", metricLabel: "Door-to-door Visits", unit: "count" },
  { category: "GROUND_NETWORK", metricKey: "booth_workers", metricLabel: "Booth Workers", unit: "count" },
  { category: "ISSUE_RESOLUTION", metricKey: "public_complaints_resolved", metricLabel: "Public Complaints Resolved", unit: "count" },
  { category: "PUBLIC_SENTIMENT", metricKey: "positive_sentiment_rate", metricLabel: "Positive Sentiment Rate", unit: "percentage" },
  { category: "DIGITAL_PRESENCE", metricKey: "social_media_followers", metricLabel: "Social Media Followers", unit: "count" },
  { category: "EVENTS_ACTIVITIES", metricKey: "rallies_held", metricLabel: "Rallies / Sabhas Held", unit: "count" },
  { category: "FINANCIAL_DEVELOPMENT", metricKey: "development_promises_announced", metricLabel: "Development Promises Announced", unit: "count" },
];

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const metricSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM format"),
  category: z.string().min(1, "Category is required"),
  metricKey: z.string().min(1, "Metric key is required"),
  metricLabel: z.string().min(1, "Metric label is required"),
  value: z.coerce.number().min(0, "Value cannot be negative"),
  unit: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export default function CompetitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;

  const { data: compRes, isLoading: isLoadingComp } = useCompetitor(id);
  const { data: metricsRes, isLoading: isLoadingMetrics } = useCompetitorMetrics(id);
  const { data: analysesRes, isLoading: isLoadingAnalyses } = useAnalyses(id);
  const { mutateAsync: addMetric, isPending: isAddingMetric } = useSubmitCompetitorMetrics(id);
  const { mutateAsync: deleteMetric, isPending: isDeletingMetric } = useDeleteCompetitorMetric(id);
  const { mutateAsync: triggerAnalysis, isPending: isTriggering } = useTriggerAnalysis(id);

  const comp = compRes?.data;
  const metrics = metricsRes?.data?.metrics || [];
  const periods = metricsRes?.data?.periods || [];
  const analyses = analysesRes?.data || [];
  const latestCompletedAnalysis = analyses.find((analysis: any) => analysis.status === "COMPLETED");

  const metricForm = useForm<z.infer<typeof metricSchema>>({
    resolver: zodResolver(metricSchema),
    defaultValues: {
      period: currentPeriod(),
      category: "VOTER_OUTREACH",
      metricKey: "",
      metricLabel: "",
      value: 0,
      unit: "count",
      source: "",
      notes: "",
    },
  });

  const metricSummary = useMemo(() => {
    const grouped = new Map<string, number>();
    metrics.forEach((metric: any) => grouped.set(metric.category, (grouped.get(metric.category) || 0) + 1));
    return CATEGORY_OPTIONS.map((category) => ({
      ...category,
      count: grouped.get(category.value) || 0,
    }));
  }, [metrics]);

  const applyMetricTemplate = (metricKey: string) => {
    const template = METRIC_TEMPLATES.find((item) => item.metricKey === metricKey);
    if (!template) return;
    metricForm.setValue("category", template.category);
    metricForm.setValue("metricKey", template.metricKey);
    metricForm.setValue("metricLabel", template.metricLabel);
    metricForm.setValue("unit", template.unit);
  };

  const onAddMetric = async (values: z.infer<typeof metricSchema>) => {
    await addMetric({
      period: values.period,
      metrics: [{
        category: values.category,
        metricKey: values.metricKey.trim(),
        metricLabel: values.metricLabel.trim(),
        value: values.value,
        unit: values.unit || undefined,
        source: values.source || undefined,
        notes: values.notes || undefined,
      }],
    });
    metricForm.reset({
      period: values.period,
      category: values.category,
      metricKey: "",
      metricLabel: "",
      value: 0,
      unit: "count",
      source: "",
      notes: "",
    });
  };

  const handleTriggerAnalysis = async () => {
    await triggerAnalysis({ period: metricForm.getValues("period") || currentPeriod() });
  };

  return (
    <MainLayout title="Competitor Details">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <Link href="/competitor-analysis">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            {isLoadingComp ? (
              <Skeleton className="h-10 w-60" />
            ) : (
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                  {comp?.candidateName}
                  <Badge variant={comp?.isActive ? "default" : "secondary"}>
                    {comp?.isActive ? "Active" : "Inactive"}
                  </Badge>
                </h1>
                <p className="text-sm text-muted-foreground">
                  {[comp?.partyName, comp?.designation, comp?.constituency].filter(Boolean).join(" - ")}
                </p>
              </div>
            )}
          </div>
          <Button onClick={handleTriggerAnalysis} disabled={isTriggering} className="gap-2 lg:ml-auto">
            {isTriggering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate AI Analysis
          </Button>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-5 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Overview
            </TabsTrigger>
            <TabsTrigger value="metrics" className="rounded-none border-b-2 border-transparent px-5 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Metrics
            </TabsTrigger>
            <TabsTrigger value="analysis" className="rounded-none border-b-2 border-transparent px-5 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent">
              AI Analysis
            </TabsTrigger>
            {latestCompletedAnalysis && (
              <TabsTrigger value="chat" className="rounded-none border-b-2 border-transparent px-5 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent">
                Chat
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6 pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard title="Metrics Recorded" value={metrics.length} description={`${periods.length || 1} period(s) tracked`} />
              <StatCard title="AI Analyses" value={analyses.length} description="Completed and failed runs" />
              <StatCard title="Latest Score" value={latestCompletedAnalysis?.overallScore ?? "N/A"} description="Our competitive strength" />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Context</CardTitle>
                  <CardDescription>Used by the AI along with metric snapshots.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-bold text-primary">
                      {comp?.candidatePhoto ? (
                        <img src={comp.candidatePhoto} alt={comp.candidateName} className="h-full w-full object-cover" />
                      ) : (
                        (comp?.candidateName || "NA").substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{comp?.candidateName}</p>
                      <p className="text-sm text-muted-foreground">{comp?.partyName || "Independent"}</p>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {comp?.notes || "No additional political context has been saved yet."}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Metric Coverage</CardTitle>
                  <CardDescription>Balanced data makes the analysis more useful.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {metricSummary.map((item) => (
                    <div key={item.value} className="flex items-center justify-between rounded-md border p-3">
                      <span className="text-sm font-medium">{item.label}</span>
                      <Badge variant={item.count > 0 ? "default" : "outline"}>{item.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6 pt-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Competitor Metrics</CardTitle>
                  <CardDescription>Store sourced competitor data by month for comparison with your own metrics.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingMetrics ? (
                        <TableRow><TableCell colSpan={6} className="py-6 text-center">Loading metrics...</TableCell></TableRow>
                      ) : metrics.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No competitor metrics recorded yet.</TableCell></TableRow>
                      ) : (
                        metrics.map((metric: any) => (
                          <TableRow key={metric.id}>
                            <TableCell>
                              <p className="font-medium">{metric.metricLabel}</p>
                              <p className="text-xs text-muted-foreground">{metric.metricKey}</p>
                            </TableCell>
                            <TableCell>{CATEGORY_OPTIONS.find((item) => item.value === metric.category)?.label || metric.category}</TableCell>
                            <TableCell>{metric.value} {metric.unit || ""}</TableCell>
                            <TableCell>{metric.period}</TableCell>
                            <TableCell>{metric.source || "Manual"}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => deleteMetric(metric.id)} disabled={isDeletingMetric}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Add Metric</CardTitle>
                  <CardDescription>Use a preset or enter a custom metric.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...metricForm}>
                    <form onSubmit={metricForm.handleSubmit(onAddMetric)} className="space-y-4">
                      <Select onValueChange={applyMetricTemplate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose metric preset" />
                        </SelectTrigger>
                        <SelectContent>
                          {METRIC_TEMPLATES.map((metric) => (
                            <SelectItem key={metric.metricKey} value={metric.metricKey}>
                              {metric.metricLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormField control={metricForm.control} name="period" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Period</FormLabel>
                          <FormControl><Input placeholder="2026-05" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={metricForm.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map((category) => (
                                <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={metricForm.control} name="metricKey" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Metric Key</FormLabel>
                          <FormControl><Input placeholder="social_media_followers" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={metricForm.control} name="metricLabel" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Metric Label</FormLabel>
                          <FormControl><Input placeholder="Social Media Followers" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={metricForm.control} name="value" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Value</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={metricForm.control} name="unit" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <FormControl><Input placeholder="count" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={metricForm.control} name="source" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source</FormLabel>
                          <FormControl><Input placeholder="field report, news, social media" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={metricForm.control} name="notes" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl><Textarea rows={3} placeholder="Context, evidence, confidence level" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full gap-2" disabled={isAddingMetric}>
                        {isAddingMetric ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Save Metric
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6 pt-6">
            {isLoadingAnalyses ? (
              <Skeleton className="h-48 w-full" />
            ) : analyses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <ShieldAlert className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium">No AI analysis yet</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Add competitor metrics, then generate an analysis for the selected period.
                  </p>
                  <Button onClick={handleTriggerAnalysis} disabled={isTriggering} className="mt-4 gap-2">
                    {isTriggering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Generate First Analysis
                  </Button>
                </CardContent>
              </Card>
            ) : (
              analyses.map((analysis: any) => (
                <AnalysisReport key={analysis.id} analysis={analysis} />
              ))
            )}
          </TabsContent>

          {latestCompletedAnalysis && (
            <TabsContent value="chat" className="pt-6">
              <AnalysisChat competitorId={id} analysisId={latestCompletedAnalysis.id} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}

function StatCard({ title, value, description }: { title: string; value: string | number; description: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function AnalysisReport({ analysis }: { analysis: any }) {
  const comparisons = Array.isArray(analysis.metricComparisons) ? analysis.metricComparisons : [];
  const recommendations = Array.isArray(analysis.recommendations) ? analysis.recommendations : [];

  return (
    <Card className="overflow-hidden border-primary/20">
      <div className="flex flex-col gap-3 border-b bg-primary/5 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium">AI Analysis Report</span>
          <Badge variant={analysis.status === "COMPLETED" ? "default" : analysis.status === "FAILED" ? "destructive" : "secondary"}>
            {analysis.status}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">{format(new Date(analysis.createdAt), "PPp")}</span>
      </div>
      <CardContent className="space-y-6 p-6">
        {analysis.errorMessage ? (
          <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            {analysis.errorMessage}
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <AnalysisMetric title="Overall Score" value={analysis.overallScore ?? "N/A"} description="Out of 100" />
          <AnalysisMetric title="Leading" value={analysis.areasLeading ?? 0} description="Categories ahead" />
          <AnalysisMetric title="Trailing" value={analysis.areasTrailing ?? 0} description="Categories behind" />
          <AnalysisMetric title="Tied" value={analysis.areasTied ?? 0} description="Close categories" />
        </div>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{analysis.executiveSummary || "No executive summary was returned."}</ReactMarkdown>
        </div>
        {comparisons.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold"><BarChart3 className="h-4 w-4" /> Category Comparison</h3>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {comparisons.map((item: any) => (
                <div key={item.category} className="rounded-md border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.categoryLabel || item.category}</p>
                    <Badge variant={item.advantage === "ours" ? "default" : item.advantage === "theirs" ? "destructive" : "secondary"}>
                      {item.advantage}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.insight}</p>
                  <p className="mt-3 text-sm"><span className="font-medium">Action:</span> {item.recommendation}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Ours {item.ours} / Theirs {item.theirs} / Gap {item.gap}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <InsightList title="Strengths" items={analysis.strengths} />
          <InsightList title="Weaknesses" items={analysis.weaknesses} />
          <InsightList title="Opportunities" items={analysis.opportunities} />
          <InsightList title="Threats" items={analysis.threats} />
        </div>
        {recommendations.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Recommended Actions</h3>
            {recommendations.map((rec: any, index: number) => (
              <div key={`${rec.action}-${index}`} className="rounded-md border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{rec.priority}</Badge>
                  <p className="font-medium">{rec.action}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{rec.expectedImpact}</p>
                <p className="mt-2 text-xs text-muted-foreground">Timeline: {rec.timeline}{rec.category ? ` - ${rec.category}` : ""}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightList({ title, items }: { title: string; items?: unknown }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="rounded-md border p-4">
      <h3 className="font-semibold">{title}</h3>
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No items returned.</p>
      ) : (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {list.map((item, index) => <li key={index}>{String(item)}</li>)}
        </ul>
      )}
    </div>
  );
}

function AnalysisMetric({ title, value, description }: { title: string; value: string | number; description: string }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function AnalysisChat({ competitorId, analysisId }: { competitorId: string; analysisId: string }) {
  const { data: chatRes, isLoading } = useChatHistory(competitorId, analysisId);
  const { mutateAsync: sendMessage, isPending } = useSendChatMessage(competitorId, analysisId);
  const [input, setInput] = useState("");
  const history = chatRes?.data || [];

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;
    setInput("");
    await sendMessage({ message });
  };

  return (
    <Card className="flex h-[620px] flex-col">
      <CardHeader className="border-b py-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" /> Ask AI About This Analysis
        </CardTitle>
        <CardDescription>Ask strategic follow-up questions based on the saved analysis data.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : history.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Ask about weak areas, booth strategy, digital gaps, outreach planning, or what to do this week.
          </div>
        ) : (
          history.map((msg: any) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] rounded-lg p-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {msg.role === "user" ? msg.message : <ReactMarkdown>{msg.message}</ReactMarkdown>}
              </div>
            </div>
          ))
        )}
      </CardContent>
      <form onSubmit={handleSend} className="flex gap-2 border-t p-4">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask: Which category should we improve first?"
          disabled={isPending}
        />
        <Button type="submit" disabled={isPending || !input.trim()} size="icon">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </Card>
  );
}
