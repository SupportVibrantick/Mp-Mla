import React, { useState, useEffect } from "react";
import { useParams } from "wouter";
import {
  Globe,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Send,
  HeartHandshake,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { publicWebsiteApi } from "../../lib/api";
import { getImageUrl } from "@/lib/utils";
import { SectionRenderer } from "../website/builder/sectionRenderers";
import { SectionBlock } from "../website/types";

export const PublicWebsiteRuntime: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const searchParams = new URLSearchParams(window.location.search);
  const websiteIdParam = searchParams.get("websiteId") || undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteData, setSiteData] = useState<any>(null);
  const [activePageSlug, setActivePageSlug] = useState<string>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchSite = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await publicWebsiteApi.resolve({
          slug: slug || undefined,
          websiteId: websiteIdParam,
        });

        if (res.data?.success) {
          setSiteData(res.data.data);
          const pages = res.data.data.pages || [];
          const homePage = pages.find((p: any) => p.isHomePage) || pages[0];
          if (homePage) {
            setActivePageSlug(homePage.slug);
          }
        } else {
          setError("Website not found or not yet published.");
        }
      } catch (err: any) {
        console.error("Public website fetch error:", err);
        setError(err.response?.data?.message || "Failed to load website.");
      } finally {
        setLoading(false);
      }
    };

    fetchSite();
  }, [slug, websiteIdParam]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Loading Constituency Portal...
          </p>
        </div>
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full text-center p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <Globe className="w-16 h-16 text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Constituency Website Not Found
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || "The requested website does not exist or has not been published yet."}
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-xs shadow-md"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  const { website, tenant, pages = [], liveData = {} } = siteData;
  const activePage =
    pages.find((p: any) => p.slug === activePageSlug) ||
    pages.find((p: any) => p.isHomePage) ||
    pages[0];
  const sections: SectionBlock[] = activePage?.content?.sections || [];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-orange-500 selection:text-white">
      {/* ─── Main Header Navigation (Shown if no custom navbar block) ─── */}
      {!sections.some((s) => s.type === "navbar") && (
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto h-20 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            {tenant?.logoUrl ? (
              <img
                src={getImageUrl(tenant.logoUrl)}
                alt={tenant.name}
                className="w-12 h-12 rounded-xl object-contain shadow-sm border border-slate-100 dark:border-slate-800"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-orange-500/20">
                {tenant?.representativeName?.charAt(0) || "M"}
              </div>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {tenant?.representativeName || website.name}
              </h2>
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                {tenant?.representativeTitle || "MLA"} • {tenant?.constituencyName}
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {pages.map((p: any) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePageSlug(p.slug)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activePage?.slug === p.slug
                    ? "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {p.title}
              </button>
            ))}

            <a
              href="/voter-portal"
              className="ml-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:scale-[1.02] transition-all"
            >
              Lodge Grievance
            </a>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            {pages.map((p: any) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActivePageSlug(p.slug);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2 rounded-lg text-xs font-bold ${
                  activePage?.slug === p.slug
                    ? "bg-orange-50 text-orange-600"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {p.title}
              </button>
            ))}
            <a
              href="/voter-portal"
              className="block text-center px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold"
            >
              Lodge Grievance
            </a>
          </div>
        )}
      </header>
      )}

      {/* ─── Page Sections Dynamic Engine ────────────────────────── */}
      <main className="flex-1">
        {sections.length === 0 ? (
          <div className="py-24 text-center text-slate-500">
            <p>This page has no content blocks yet.</p>
          </div>
        ) : (
          sections.map((section) => (
            <SectionRenderer
              key={section.id}
              section={section}
              isEditing={false}
              pages={pages}
              activePageId={activePage?.id || activePageSlug}
              onSwitchPage={(pageId) => {
                const target = pages.find((p: any) => p.id === pageId || p.slug === pageId);
                if (target) setActivePageSlug(target.slug);
              }}
              liveData={liveData}
            />
          ))
        )}
      </main>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-16 pb-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-800">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-black text-lg flex items-center justify-center">
                {tenant?.representativeName?.charAt(0) || "M"}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {tenant?.representativeName || website.name}
                </h3>
                <p className="text-xs text-orange-400">
                  {tenant?.representativeTitle} • {tenant?.constituencyName}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Official public outreach and constituent services platform. Empowering citizens with transparent governance and 24/7 assistance.
            </p>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Quick Links</h4>
            <ul className="space-y-2 text-xs">
              {pages.map((p: any) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setActivePageSlug(p.slug)}
                    className="hover:text-orange-400 transition-colors"
                  >
                    {p.title}
                  </button>
                </li>
              ))}
              <li>
                <a href="/voter-portal" className="hover:text-orange-400">
                  Citizen Grievance Portal
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Office Location</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                {tenant?.address || "MLA Secretariat, Central Constituency Camp Office"}
              </p>
              {tenant?.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                  {tenant.phone}
                </p>
              )}
              {tenant?.email && (
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-400 shrink-0" />
                  {tenant.email}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} {tenant?.name || website.name}. All Rights Reserved.</p>
          <div className="flex items-center gap-4">
            <span>Powered by MP/MLA Constituency Suite</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
