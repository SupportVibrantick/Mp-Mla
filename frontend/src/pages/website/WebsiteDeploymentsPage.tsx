import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  Rocket,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Clock,
  FileText,
  Shield,
  Layers,
  RefreshCw,
} from "lucide-react";
import { websiteApi, websiteDeploymentsApi } from "../../lib/api";
import { WebsiteData, WebsiteDeploymentData } from "./types";
import { MainLayout } from "../../components/layout/MainLayout";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";

export const WebsiteDeploymentsPage: React.FC = () => {
  const { websiteId } = useParams<{ websiteId: string }>();
  const [, setLocation] = useLocation();

  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [deployments, setDeployments] = useState<WebsiteDeploymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  const fetchDeployments = async () => {
    if (!websiteId) return;
    try {
      setLoading(true);
      const [siteRes, depRes] = await Promise.all([
        websiteApi.get(websiteId),
        websiteDeploymentsApi.list(websiteId),
      ]);
      if (siteRes.data?.success) setWebsite(siteRes.data.data);
      if (depRes.data?.success) setDeployments(depRes.data.data || []);
    } catch (err) {
      console.error("Failed to load deployments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, [websiteId]);

  const handleRollback = async (deploymentId: string, version: number) => {
    if (!websiteId) return;
    if (
      !window.confirm(
        `Are you sure you want to rollback to Snapshot v${version}? This will overwrite active draft pages with this version.`
      )
    ) {
      return;
    }

    try {
      setRollingBackId(deploymentId);
      const res = await websiteDeploymentsApi.rollback(websiteId, deploymentId);
      if (res.data?.success) {
        alert(`Successfully rolled back to Snapshot v${version}!`);
        fetchDeployments();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Rollback failed");
    } finally {
      setRollingBackId(null);
    }
  };

  return (
    <MainLayout title="Deployments & Versioning">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* ─── Header ────────────────────────────────────────────── */}
        <div className="bg-card/40 p-6 rounded-[28px] border border-border/60 backdrop-blur-sm shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/websites")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-1 p-0 h-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Websites
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                Deployment History: {website?.name || "Constituency Website"}
              </h1>
              <Badge className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Immutable Snapshots
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Every publish generates an immutable JSON snapshot. Roll back to any previous version with 1 click.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchDeployments}
            className="rounded-xl border-border/80 text-xs font-semibold gap-1.5 self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh History
          </Button>
        </div>

        {/* ─── Deployment History Timeline ────────────────────────── */}
        <Card className="rounded-[24px] border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-4 border-b border-border/40">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-28 rounded-lg" />
                </div>
              ))}
            </div>
          ) : deployments.length === 0 ? (
            <div className="p-12 text-center">
              <Rocket className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-bold text-foreground">
                No deployments recorded yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Publish your website from the visual builder to create version snapshots.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {deployments.map((dep, idx) => (
                <div
                  key={dep.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        idx === 0
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Rocket className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          Snapshot v{dep.version}
                        </span>
                        {idx === 0 && (
                          <Badge className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Current Live
                          </Badge>
                        )}
                        <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-semibold rounded-full">
                          {dep.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {dep.publishedAt ? new Date(dep.publishedAt).toLocaleString() : "Just now"}
                      </p>
                      {dep.notes && (
                        <p className="text-xs text-foreground/80 mt-1 italic">
                          "{dep.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {idx !== 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={rollingBackId === dep.id}
                      onClick={() => handleRollback(dep.id, dep.version)}
                      className="self-end sm:self-center rounded-xl text-xs font-bold gap-1.5 hover:border-primary hover:text-primary"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${rollingBackId === dep.id ? "animate-spin" : ""}`} />
                      Rollback to v{dep.version}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
};
