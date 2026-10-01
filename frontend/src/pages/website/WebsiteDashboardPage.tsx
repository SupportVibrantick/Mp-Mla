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
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Edit3,
  Search,
  Eye,
  RefreshCw,
  FolderKanban,
  Zap,
} from "lucide-react";
import { websiteApi } from "../../lib/api";
import { WebsiteData, WebsiteTemplate } from "./types";
import { MainLayout } from "../../components/layout/MainLayout";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";

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
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredWebsites = websites.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.slug.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalDomains = websites.reduce(
    (acc, curr) => acc + (curr.domains?.length ?? curr._count?.domains ?? 0),
    0,
  );
  const publishedCount = websites.filter((w) => w.status === "PUBLISHED").length;

  return (
    <MainLayout title="Websites & Portals">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* ─── Header ────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/40 p-6 rounded-[28px] border border-border/60 backdrop-blur-sm shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
              <Globe className="w-4 h-4" />
              <span>Single-Page Website Engine</span>
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              Websites & Portals
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Build, customize, and publish single-page constituent websites with live grievances, development projects, and custom domains.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={fetchWebsites}
              size="sm"
              className="rounded-xl border-border/80 hover:bg-muted/80"
              title="Refresh Websites"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-md gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Website
            </Button>
          </div>
        </div>

        {/* ─── Metrics Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card className="p-5 rounded-[24px] border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Total Websites
              </span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-foreground">
              {loading ? <Skeleton className="h-9 w-12" /> : websites.length}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-2">
              <CheckCircle2 className="w-3 h-3" /> Multi-tenant isolated
            </span>
          </Card>

          <Card className="p-5 rounded-[24px] border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Published Sites
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Rocket className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-foreground">
              {loading ? <Skeleton className="h-9 w-12" /> : publishedCount}
            </div>
            <span className="text-[11px] text-muted-foreground mt-2 block">
              Live on CDN & Subdomains
            </span>
          </Card>

          <Card className="p-5 rounded-[24px] border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Custom Domains
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-foreground">
              {loading ? <Skeleton className="h-9 w-12" /> : totalDomains}
            </div>
            <span className="text-[11px] text-muted-foreground mt-2 block">
              SSL & DNS verified
            </span>
          </Card>
        </div>

        {/* ─── Websites Listing Section ───────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-foreground tracking-tight">
              Your Single-Page Websites
            </h2>
            {websites.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search websites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-card border border-border/80 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <Card key={n} className="p-6 rounded-[24px] space-y-4">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="pt-4 flex justify-between">
                    <Skeleton className="h-8 w-24 rounded-lg" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredWebsites.length === 0 ? (
            <Card className="p-12 text-center rounded-[28px] border-dashed border-2 border-border/80">
              <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="text-lg font-bold text-foreground">
                {searchQuery ? "No matching websites found" : "No websites created yet"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? "Try adjusting your search query."
                  : "Launch your official single-page constituent website in minutes."}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="mt-5 rounded-xl bg-primary text-primary-foreground font-bold shadow-md gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Launch Website
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWebsites.map((site) => (
                <Card
                  key={site.id}
                  className="rounded-[24px] border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/40 transition-all flex flex-col justify-between group"
                >
                  {/* Card Header & Status */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={site.status === "PUBLISHED" ? "default" : "secondary"}
                        className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full ${
                          site.status === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {site.status}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">
                        v{site.deployments?.[0]?.version || 1}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {site.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 font-mono">
                        Slug:{" "}
                        <code className="bg-muted px-2 py-0.5 rounded-md text-foreground">
                          {site.slug}
                        </code>
                      </p>
                    </div>

                    {/* Live URL */}
                    <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Live URL:</span>
                      <a
                        href={`/site/${site.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        /site/{site.slug} <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 bg-muted/30 border-t border-border/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/websites/${site.id}/domains`}
                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="Custom Domains"
                      >
                        <Globe className="w-4 h-4 text-blue-500" />
                        <span>Domains</span>
                      </Link>
                      <Link
                        to={`/websites/${site.id}/deployments`}
                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="Deployment History"
                      >
                        <Rocket className="w-4 h-4 text-emerald-500" />
                        <span>History</span>
                      </Link>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteWebsite(site.id, site.name)}
                        className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Delete Website"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Link to={`/websites/${site.id}/builder`}>
                        <Button
                          size="sm"
                          className="rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Visual Builder
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ─── Create Website Modal ───────────────────────────────── */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
            <Card className="border-border rounded-[28px] max-w-2xl w-full p-6 shadow-2xl space-y-6 bg-card">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-foreground">
                    Create Single-Page Website
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select a template and set your site subdomain slug.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  ✕
                </Button>
              </div>

              <form onSubmit={handleCreateWebsite} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
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
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Subdomain Slug
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 bg-muted border border-r-0 border-border rounded-l-xl text-xs text-muted-foreground font-mono">
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
                      className="flex-1 px-3.5 py-2.5 border border-border bg-muted/40 text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="px-3 py-2.5 bg-muted border border-l-0 border-border rounded-r-xl text-xs text-muted-foreground font-mono">
                      .mpmla.in
                    </span>
                  </div>
                </div>

                {/* Template Picker */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    Choose Starting Template
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto p-1">
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          selectedTemplateId === tpl.id
                            ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                            : "border-border/80 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-foreground">
                            {tpl.name}
                          </span>
                          {selectedTemplateId === tpl.id && (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {tpl.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateModalOpen(false)}
                    className="rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md"
                  >
                    {creating ? "Creating..." : "Initialize Website"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
