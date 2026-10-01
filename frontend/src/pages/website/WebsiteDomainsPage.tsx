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
import { MainLayout } from "../../components/layout/MainLayout";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";

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
    <MainLayout title="Custom Domains">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* ─── Header ────────────────────────────────────────────── */}
        <div className="bg-card/40 p-6 rounded-[28px] border border-border/60 backdrop-blur-sm shadow-sm space-y-1">
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
              Domains & Hosting: {website?.name || "Constituency Website"}
            </h1>
            <Badge className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary border border-primary/20">
              Multi-Tenant SSL
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Connect your custom domain (e.g. <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">mla-sharma.in</code>) or use the instant platform subdomain.
          </p>
        </div>

        {/* ─── Add Custom Domain Card ────────────────────────────── */}
        <Card className="rounded-[24px] border-border/60 bg-card/60 backdrop-blur-sm p-6 shadow-sm">
          <h2 className="text-base font-bold text-foreground mb-1">
            Connect Custom Domain
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
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
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <Button
              type="submit"
              disabled={adding}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md gap-2"
            >
              <Plus className="w-4 h-4" />
              {adding ? "Adding..." : "Add Domain"}
            </Button>
          </form>
        </Card>

        {/* ─── Connected Domains List ─────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">
            Active Domains
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="p-5 rounded-[24px] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </Card>
              ))}
            </div>
          ) : domains.length === 0 ? (
            <Card className="p-8 rounded-[24px] text-center border-dashed border-2 border-border/80">
              <Globe className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">
                No custom domain connected yet
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your website is currently accessible via: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">/site/{website?.slug}</code>
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {domains.map((d) => (
                <Card
                  key={d.id}
                  className="p-5 rounded-[24px] border-border/60 bg-card/60 backdrop-blur-sm shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-foreground font-mono">
                          {d.domain}
                        </span>
                        {d.isPrimary && (
                          <Badge className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-primary" /> Primary Domain
                          </Badge>
                        )}
                        <Badge
                          variant={d.isVerified ? "default" : "secondary"}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 ${
                            d.isVerified
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
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
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Type: {d.type} • Added {new Date(d.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={verifyingId === d.id}
                      onClick={() => handleVerify(d.id)}
                      className="rounded-xl text-xs font-semibold gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${verifyingId === d.id ? "animate-spin" : ""}`} />
                      Verify DNS
                    </Button>

                    {!d.isPrimary && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSetPrimary(d.id)}
                        className="rounded-xl text-xs font-semibold"
                      >
                        Make Primary
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(d.id, d.domain)}
                      className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Remove Domain"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ─── DNS Configuration Instructions ─────────────────────── */}
        <Card className="p-6 rounded-[24px] bg-muted/20 border-border/60 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm">
            <Info className="w-4 h-4 text-primary" />
            <span>DNS Setup Instructions</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            To point your custom domain to this constituent portal, log in to your domain registrar (GoDaddy, Namecheap, Cloudflare) and add the following DNS record:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-border/80 rounded-xl overflow-hidden bg-card">
              <thead className="bg-muted text-muted-foreground font-semibold border-b border-border/80">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Name / Host</th>
                  <th className="p-3">Value / Target</th>
                  <th className="p-3">TTL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono text-foreground">
                <tr>
                  <td className="p-3 font-bold text-primary">CNAME</td>
                  <td className="p-3">www (or subdomain)</td>
                  <td className="p-3">cname.mpmla.in</td>
                  <td className="p-3 text-muted-foreground">Auto (300)</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-blue-600">A Record</td>
                  <td className="p-3">@ (Apex domain)</td>
                  <td className="p-3">76.76.21.21</td>
                  <td className="p-3 text-muted-foreground">Auto (300)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};
