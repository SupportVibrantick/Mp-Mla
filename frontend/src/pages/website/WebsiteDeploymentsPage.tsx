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
} from "lucide-react";
import { websiteApi, websiteDeploymentsApi } from "../../lib/api";
import { WebsiteData, WebsiteDeploymentData } from "./types";

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
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => setLocation("/websites")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Websites
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Deployment History: {website?.name}
          </h1>
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            Immutable Snapshots
          </span>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
          Every publish generates an immutable JSON snapshot. Roll back to any previous version with 1 click.
        </p>
      </div>

      {/* ─── Deployment History Timeline ────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading version history...</div>
        ) : deployments.length === 0 ? (
          <div className="p-12 text-center">
            <Rocket className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No deployments recorded yet
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Publish your website from the visual builder to create version snapshots.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {deployments.map((dep, idx) => (
              <div
                key={dep.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      idx === 0
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        Snapshot v{dep.version}
                      </span>
                      {idx === 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          Current Live
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                        {dep.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      {dep.publishedAt ? new Date(dep.publishedAt).toLocaleString() : "Just now"}
                    </p>
                    {dep.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">
                        "{dep.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {idx !== 0 && (
                  <button
                    type="button"
                    disabled={rollingBackId === dep.id}
                    onClick={() => handleRollback(dep.id, dep.version)}
                    className="self-end sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-orange-50 hover:text-orange-600 transition-colors"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${rollingBackId === dep.id ? "animate-spin" : ""}`} />
                    Rollback to v{dep.version}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
