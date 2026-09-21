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
} from "lucide-react";
import { websiteApi, websitePagesApi } from "../../lib/api";
import { WebsiteData, WebsitePageData } from "./types";

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              Pages: {website?.name || "Constituency Website"}
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {pages.length} Pages
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
            Manage site navigation, SEO metadata, and open individual pages in the visual canvas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/websites/${websiteId}/builder`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/25 transition-all"
          >
            <Edit3 className="w-4 h-4" /> Open Visual Canvas
          </Link>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Page
          </button>
        </div>
      </div>

      {/* ─── Pages Table ────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading pages...</div>
        ) : pages.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No pages found</p>
            <p className="text-xs text-slate-500 mt-1">Create your first page to start designing.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {pages.map((p) => (
              <div
                key={p.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    {p.isHomePage ? <Home className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {p.title}
                      </h3>
                      {p.isHomePage && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          Home Page
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      /{p.slug} • {p.content?.sections?.length || 0} Sections
                    </p>
                    {p.seoDescription && (
                      <p className="text-xs text-slate-400 line-clamp-1 mt-1">
                        SEO: {p.seoDescription}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleDuplicatePage(p.id)}
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Duplicate Page"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePage(p.id, p.title)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Delete Page"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Link
                    to={`/websites/${websiteId}/builder`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-xs font-bold border border-orange-200 dark:border-orange-900/60 hover:bg-orange-100 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit in Builder
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Create Page Modal ──────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add New Website Page
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL Path / Slug
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-xl text-xs text-slate-500">
                    /
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="projects"
                    value={newPageSlug}
                    onChange={(e) => setNewPageSlug(e.target.value.toLowerCase())}
                    className="flex-1 px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm rounded-r-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  SEO Meta Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Search engine summary for this page"
                  value={newPageSeoDesc}
                  onChange={(e) => setNewPageSeoDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md hover:bg-orange-700"
                >
                  {creating ? "Creating..." : "Create & Edit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
