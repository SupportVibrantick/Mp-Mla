import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  Globe,
  Plus,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Star,
  ExternalLink,
  Copy,
  Info,
} from "lucide-react";
import { websiteApi, websiteDomainsApi } from "../../lib/api";
import { WebsiteData, WebsiteDomainData } from "./types";

export const WebsiteDomainsPage: React.FC = () => {
  const { websiteId } = useParams<{ websiteId: string }>();
  const [, setLocation] = useLocation();

  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [domains, setDomains] = useState<WebsiteDomainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchDomains = async () => {
    if (!websiteId) return;
    try {
      setLoading(true);
      const [siteRes, domRes] = await Promise.all([
        websiteApi.get(websiteId),
        websiteDomainsApi.list(websiteId),
      ]);
      if (siteRes.data?.success) setWebsite(siteRes.data.data);
      if (domRes.data?.success) setDomains(domRes.data.data || []);
    } catch (err) {
      console.error("Failed to load domains:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [websiteId]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteId || !newDomain) return;
    try {
      setAdding(true);
      const res = await websiteDomainsApi.add(websiteId, {
        domain: newDomain.trim().toLowerCase(),
        isPrimary: domains.length === 0,
      });
      if (res.data?.success) {
        setNewDomain("");
        fetchDomains();
      }
    } catch (err: any) {
      console.error("Failed to add domain:", err);
      alert(err.response?.data?.message || "Failed to add domain");
    } finally {
      setAdding(false);
    }
  };

  const handleVerify = async (domainId: string) => {
    if (!websiteId) return;
    try {
      setVerifyingId(domainId);
      const res = await websiteDomainsApi.verify(websiteId, domainId);
      if (res.data?.success) {
        fetchDomains();
        alert(res.data.isVerified ? "Domain verified and SSL active!" : "DNS verification in progress. Please check DNS propagation.");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Verification check failed");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    if (!websiteId) return;
    try {
      await websiteDomainsApi.setPrimary(websiteId, domainId);
      fetchDomains();
    } catch (err) {
      console.error("Failed to set primary:", err);
    }
  };

  const handleDelete = async (domainId: string, domain: string) => {
    if (!websiteId) return;
    if (!window.confirm(`Are you sure you want to remove domain "${domain}"?`)) return;
    try {
      await websiteDomainsApi.delete(websiteId, domainId);
      fetchDomains();
    } catch (err) {
      console.error("Failed to delete domain:", err);
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
            Domains & Hosting: {website?.name}
          </h1>
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400">
            Multi-Tenant SSL
          </span>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
          Connect your custom domain (e.g. <code>mla-sharma.in</code>) or use the instant platform subdomain.
        </p>
      </div>

      {/* ─── Add Custom Domain Card ────────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Connect Custom Domain
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Enter your apex domain or subdomain without http/https.
        </p>

        <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <div className="flex-1 relative">
            <input
              type="text"
              required
              placeholder="e.g. www.rameshsharma-mla.in"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {adding ? "Adding..." : "Add Domain"}
          </button>
        </form>
      </div>

      {/* ─── Connected Domains List ─────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Active Domains
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading domains...</div>
        ) : domains.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
            <Globe className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No custom domain connected yet
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Your website is currently accessible via: <code>/site/{website?.slug}</code>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {domains.map((d) => (
              <div
                key={d.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                        {d.domain}
                      </span>
                      {d.isPrimary && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-orange-500" /> Primary Domain
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 ${
                          d.isVerified
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                        }`}
                      >
                        {d.isVerified ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Verified & SSL Active
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" /> DNS Pending
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Type: {d.type} • Added {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={verifyingId === d.id}
                    onClick={() => handleVerify(d.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verifyingId === d.id ? "animate-spin" : ""}`} />
                    Verify DNS
                  </button>

                  {!d.isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(d.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200"
                    >
                      Make Primary
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(d.id, d.domain)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Remove Domain"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── DNS Configuration Instructions ─────────────────────── */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
          <Info className="w-4 h-4 text-orange-500" />
          <span>DNS Setup Instructions</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          To point your custom domain to this constituent portal, log in to your domain registrar (GoDaddy, Namecheap, Cloudflare) and add the following DNS record:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Name / Host</th>
                <th className="p-3">Value / Target</th>
                <th className="p-3">TTL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              <tr>
                <td className="p-3 font-bold text-orange-600">CNAME</td>
                <td className="p-3">www (or subdomain)</td>
                <td className="p-3 text-slate-800 dark:text-slate-200">cname.mpmla.in</td>
                <td className="p-3 text-slate-500">Auto (300)</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-blue-600">A Record</td>
                <td className="p-3">@ (Apex domain)</td>
                <td className="p-3 text-slate-800 dark:text-slate-200">76.76.21.21</td>
                <td className="p-3 text-slate-500">Auto (300)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
