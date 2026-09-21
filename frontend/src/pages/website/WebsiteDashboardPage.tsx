import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Globe,
  Plus,
  Layout,
  Layers,
  Sparkles,
  ExternalLink,
  Settings,
  Rocket,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Edit3,
  Search,
  Eye,
} from "lucide-react";
import { websiteApi } from "../../lib/api";
import { WebsiteData, WebsiteTemplate } from "./types";

export const WebsiteDashboardPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [websites, setWebsites] = useState<WebsiteData[]>([]);
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteSlug, setNewSiteSlug] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchWebsites = async () => {
    try {
      setLoading(true);
      const [res, tplRes] = await Promise.all([
        websiteApi.list(),
        websiteApi.getTemplates(),
      ]);
      if (res.data?.success) {
        setWebsites(res.data.data || []);
      }
      if (tplRes.data?.success) {
        setTemplates(tplRes.data.data || []);
        if (tplRes.data.data?.length > 0) {
          setSelectedTemplateId(tplRes.data.data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load websites:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  const handleCreateWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName || !newSiteSlug) return;
    try {
      setCreating(true);
      const res = await websiteApi.create({
        name: newSiteName,
        slug: newSiteSlug,
        templateId: selectedTemplateId || null,
      });

      if (res.data?.success) {
        setCreateModalOpen(false);
        setNewSiteName("");
        setNewSiteSlug("");
        fetchWebsites();
        setLocation(`/websites/${res.data.data.id}/builder`);
      }
    } catch (error: any) {
      console.error("Create website error:", error);
      alert(error.response?.data?.message || "Failed to create website");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWebsite = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete website "${name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await websiteApi.delete(id);
      fetchWebsites();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-slate-700/80 transition-all mb-3 group w-fit border border-slate-200/80 dark:border-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-500 group-hover:text-orange-600 dark:group-hover:text-orange-400" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold text-xs tracking-wider uppercase">
            <Globe className="w-4 h-4" />
            <span>Constituency Publishing Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Websites & Portals
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Build, customize, and publish constituent websites with live
            grievances, projects, and custom domains.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-amber-700 transition-all hover:scale-[1.02] text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Website
          </button>
        </div>
      </div>

      {/* ─── Metrics Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">
              Total Websites
            </span>
            <Globe className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {websites.length}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" /> Multi-tenant isolated
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">
              Published Sites
            </span>
            <Rocket className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {websites.filter((w) => w.status === "PUBLISHED").length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Live on CDN / Subdomains
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Total Pages</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {websites.reduce(
              (acc, curr) =>
                acc + (curr._count?.pages ?? curr.pages?.length ?? 0),
              0,
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Dynamic JSON layout blocks
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">
              Custom Domains
            </span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {websites.reduce(
              (acc, curr) =>
                acc + (curr.domains?.length ?? curr._count?.domains ?? 0),
              0,
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            SSL & DNS verified
          </span>
        </div>
      </div>

      {/* ─── Websites Grid ─────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Your Constituency Websites
        </h2>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            Loading websites...
          </div>
        ) : websites.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
            <Globe className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No websites created yet
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Launch your first official constituent portal in minutes using our
              ready MP/MLA templates.
            </p>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md hover:bg-orange-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              Launch Website
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {websites.map((site) => (
              <div
                key={site.id}
                className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group"
              >
                {/* Card Header & Status */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                        site.status === "PUBLISHED"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                      }`}
                    >
                      {site.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      v{site.deployments?.[0]?.version || 1}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">
                    {site.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Slug:{" "}
                    <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded">
                      {site.slug}
                    </code>
                  </p>

                  {/* Links / Subdomain Preview */}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Live URL:</span>
                    <a
                      href={`/site/${site.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                    >
                      /site/{site.slug} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/websites/${site.id}/pages`}
                      className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1"
                      title="Manage Pages"
                    >
                      <Layers className="w-3.5 h-3.5" /> Pages (
                      {site._count?.pages ?? site.pages?.length ?? 0})
                    </Link>
                    <Link
                      to={`/websites/${site.id}/domains`}
                      className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1"
                      title="Custom Domains"
                    >
                      <Globe className="w-3.5 h-3.5" /> Domains
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteWebsite(site.id, site.name)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Delete Website"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/websites/${site.id}/builder`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:bg-orange-700 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Visual Builder
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Create Website Modal ───────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Create Constituency Website
                </h3>
                <p className="text-xs text-slate-500">
                  Select a tailored template and set your site subdomain slug.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWebsite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Website Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Official Constituency Portal - Ramesh Sharma"
                  value={newSiteName}
                  onChange={(e) => {
                    setNewSiteName(e.target.value);
                    if (!newSiteSlug) {
                      setNewSiteSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, ""),
                      );
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subdomain Slug
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-xl text-xs text-slate-500 font-mono">
                    https://
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="mla-ramesh-sharma"
                    value={newSiteSlug}
                    onChange={(e) =>
                      setNewSiteSlug(e.target.value.toLowerCase())
                    }
                    className="flex-1 px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-l-0 border-slate-200 dark:border-slate-700 rounded-r-xl text-xs text-slate-500 font-mono">
                    .mpmla.in
                  </span>
                </div>
              </div>

              {/* Template Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Choose Starting Template
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto p-1">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedTemplateId === tpl.id
                          ? "border-orange-500 bg-orange-50/60 dark:bg-orange-950/30 ring-2 ring-orange-500/20"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {tpl.name}
                        </span>
                        {selectedTemplateId === tpl.id && (
                          <CheckCircle2 className="w-4 h-4 text-orange-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {tpl.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-lg shadow-orange-500/25 transition-all"
                >
                  {creating ? "Creating..." : "Initialize Website"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
