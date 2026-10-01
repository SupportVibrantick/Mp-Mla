import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  Layers,
  Plus,
  ArrowLeft,
  Edit3,
  Copy,
  Trash2,
  Globe,
  Home,
  CheckCircle2,
  ExternalLink,
  Search,
  RefreshCw,
} from "lucide-react";
import { websiteApi, websitePagesApi } from "../../lib/api";
import { WebsiteData, WebsitePageData } from "./types";
import { MainLayout } from "../../components/layout/MainLayout";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";

export const WebsitePagesPage: React.FC = () => {
  const { websiteId } = useParams<{ websiteId: string }>();
  const [, setLocation] = useLocation();

  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [pages, setPages] = useState<WebsitePageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [newPageSeoDesc, setNewPageSeoDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPages = async () => {
    if (!websiteId) return;
    try {
      setLoading(true);
      const [siteRes, pagesRes] = await Promise.all([
        websiteApi.get(websiteId),
        websitePagesApi.list(websiteId),
      ]);
      if (siteRes.data?.success) setWebsite(siteRes.data.data);
      if (pagesRes.data?.success) setPages(pagesRes.data.data || []);
    } catch (err) {
      console.error("Failed to fetch pages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, [websiteId]);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteId || !newPageTitle || !newPageSlug) return;
    try {
      setCreating(true);
      const res = await websitePagesApi.create(websiteId, {
        title: newPageTitle,
        slug: newPageSlug,
        seoDescription: newPageSeoDesc || null,
        isHomePage: pages.length === 0,
        content: { version: 1, sections: [] },
      });
      if (res.data?.success) {
        setCreateModalOpen(false);
        setNewPageTitle("");
        setNewPageSlug("");
        setNewPageSeoDesc("");
        fetchPages();
        setLocation(`/websites/${websiteId}/builder`);
      }
    } catch (err: any) {
      console.error("Create page error:", err);
      alert(err.response?.data?.message || "Failed to create page");
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicatePage = async (pageId: string) => {
    if (!websiteId) return;
    try {
      await websitePagesApi.duplicate(websiteId, pageId);
      fetchPages();
    } catch (err) {
      console.error("Duplicate error:", err);
    }
  };

  const handleDeletePage = async (pageId: string, title: string) => {
    if (!websiteId) return;
    if (!window.confirm(`Are you sure you want to delete page "${title}"?`)) return;
    try {
      await websitePagesApi.delete(websiteId, pageId);
      fetchPages();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const filteredPages = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <MainLayout title="Website Pages">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* ─── Header ────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/40 p-6 rounded-[28px] border border-border/60 backdrop-blur-sm shadow-sm">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/websites")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2 p-0 h-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Websites
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                Pages: {website?.name || "Constituency Website"}
              </h1>
              <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold rounded-full">
                {pages.length} Pages
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs mt-1">
              Manage site navigation, SEO metadata, and open individual pages in the visual canvas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to={`/websites/${websiteId}/builder`}>
              <Button className="rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md gap-2">
                <Edit3 className="w-4 h-4" /> Open Visual Canvas
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(true)}
              className="rounded-xl border-border bg-card text-foreground font-bold text-xs hover:bg-muted gap-2"
            >
              <Plus className="w-4 h-4" /> Add Page
            </Button>
          </div>
        </div>

        {/* ─── Pages List ────────────────────────────────────────── */}
        <Card className="rounded-[24px] border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-card border border-border/80 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchPages}
              className="text-xs text-muted-foreground hover:text-foreground self-end sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-4 border-b border-border/40">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              ))}
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-bold text-foreground">
                {searchQuery ? "No matching pages found" : "No pages found"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? "Try a different search." : "Create your first page to start designing."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredPages.map((p) => (
                <div
                  key={p.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      {p.isHomePage ? <Home className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">
                          {p.title}
                        </h3>
                        {p.isHomePage && (
                          <Badge className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Home Page
                          </Badge>
                        )}
                        <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-semibold rounded-full">
                          {p.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        /{p.slug} • {p.content?.sections?.length || 0} Sections
                      </p>
                      {p.seoDescription && (
                        <p className="text-xs text-muted-foreground/80 line-clamp-1 mt-1">
                          SEO: {p.seoDescription}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicatePage(p.id)}
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                      title="Duplicate Page"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePage(p.id, p.title)}
                      className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Delete Page"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Link to={`/websites/${websiteId}/builder`}>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-xl border border-primary/20 text-primary font-bold text-xs gap-1.5 hover:bg-primary/10"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit in Builder
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ─── Create Page Modal ──────────────────────────────────── */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
            <Card className="border-border rounded-[28px] max-w-lg w-full p-6 shadow-2xl space-y-5 bg-card">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground">
                  Add New Website Page
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  ✕
                </Button>
              </div>

              <form onSubmit={handleCreatePage} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Page Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Major Infrastructure Projects"
                    value={newPageTitle}
                    onChange={(e) => {
                      setNewPageTitle(e.target.value);
                      if (!newPageSlug) {
                        setNewPageSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-|-$/g, "")
                        );
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    URL Path / Slug
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-muted border border-r-0 border-border rounded-l-xl text-xs text-muted-foreground">
                      /
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="projects"
                      value={newPageSlug}
                      onChange={(e) => setNewPageSlug(e.target.value.toLowerCase())}
                      className="flex-1 px-3.5 py-2 border border-border bg-muted/40 text-foreground text-sm font-mono rounded-r-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    SEO Meta Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Search engine summary for this page"
                    value={newPageSeoDesc}
                    onChange={(e) => setNewPageSeoDesc(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-muted/40 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
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
                    {creating ? "Creating..." : "Create & Edit"}
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
