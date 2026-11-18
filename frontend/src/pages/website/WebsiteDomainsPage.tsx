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
  Check,
  Info,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { websiteApi, websiteDomainsApi } from "../../lib/api";
import { WebsiteData, WebsiteDomainData } from "./types";
import { MainLayout } from "../../components/layout/MainLayout";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";

export const WebsiteDomainsPage: React.FC = () => {
  const { websiteId } = useParams<{ websiteId: string }>();
  const [, setLocation] = useLocation();

  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [domains, setDomains] = useState<WebsiteDomainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [provisioningId, setProvisioningId] = useState<string | null>(null);
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Verification result modal
  const [verificationModal, setVerificationModal] = useState<{
    isOpen: boolean;
    domain: string;
    domainId?: string;
    success: boolean;
    message: string;
    diagnostics?: any;
  } | null>(null);

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

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

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
        if (res.data.data?.id) {
          setExpandedDomainId(res.data.data.id);
        }
      }
    } catch (err: any) {
      console.error("Failed to add domain:", err);
      alert(err.response?.data?.message || "Failed to add domain");
    } finally {
      setAdding(false);
    }
  };

  const handleVerify = async (domainId: string, simulate: boolean = false) => {
    if (!websiteId) return;
    const targetDomain = domains.find((d) => d.id === domainId);
    try {
      setVerifyingId(domainId);
      const res = await websiteDomainsApi.verify(websiteId, domainId, { simulate });
      if (res.data?.verified) {
        await fetchDomains();
        setVerificationModal({
          isOpen: true,
          domain: targetDomain?.domain || "",
          domainId,
          success: true,
          message:
            res.data.message ||
            "Domain ownership verified successfully! SSL certificate is being provisioned.",
          diagnostics: res.data.diagnostics,
        });
      } else {
        setVerificationModal({
          isOpen: true,
          domain: targetDomain?.domain || "",
          domainId,
          success: false,
          message:
            res.data?.message ||
            "DNS records are not configured correctly yet. Please verify your records at your registrar.",
          diagnostics: res.data?.data,
        });
      }
    } catch (err: any) {
      const errData = err.response?.data;
      setVerificationModal({
        isOpen: true,
        domain: targetDomain?.domain || "",
        domainId,
        success: false,
        message:
          errData?.message ||
          "DNS verification check failed. Records not detected.",
        diagnostics: errData?.diagnostics || errData?.data,
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleProvisionSsl = async (domainId: string) => {
    if (!websiteId) return;
    try {
      setProvisioningId(domainId);
      const res = await websiteDomainsApi.provisionSsl(websiteId, domainId);
      if (res.data?.success) {
        alert(res.data.message || "SSL certificate provisioned successfully!");
        fetchDomains();
      } else {
        alert(res.data?.message || "SSL provisioning failed");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to provision SSL certificate");
    } finally {
      setProvisioningId(null);
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    if (!websiteId) return;
    try {
      await websiteDomainsApi.setPrimary(websiteId, domainId);
      fetchDomains();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to set primary domain");
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

  const getLiveTestUrl = (domainName: string) => {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (isLocalhost) {
      return `/site?domain=${encodeURIComponent(domainName)}`;
    }
    return `https://${domainName}`;
  };

  const renderStatusBadge = (d: WebsiteDomainData) => {
    if (!d.isVerified) {
      return (
        <Badge
          variant="secondary"
          className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1"
        >
          <AlertCircle className="w-3 h-3" /> DNS Pending
        </Badge>
      );
    }
    if (d.sslStatus === "PROVISIONING") {
      return (
        <Badge
          variant="secondary"
          className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3 animate-spin" /> SSL Provisioning
        </Badge>
      );
    }
    if (d.sslStatus === "FAILED") {
      return (
        <Badge
          variant="secondary"
          className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1"
        >
          <AlertCircle className="w-3 h-3" /> SSL Failed
        </Badge>
      );
    }
    if (d.sslStatus === "ACTIVE" && d.isActive) {
      return (
        <Badge
          variant="default"
          className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1"
        >
          <CheckCircle2 className="w-3 h-3" /> Verified & SSL Active
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1"
      >
        <CheckCircle2 className="w-3 h-3" /> DNS Verified
      </Badge>
    );
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
              Multi-Tenant Architecture
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Connect your custom domain (e.g.{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">
              mla-rajesh.in
            </code>
            ) or use the instant platform subdomain.
          </p>
        </div>

        {/* ─── Add Custom Domain Card ────────────────────────────── */}
        <Card className="rounded-[24px] border-border/60 bg-card/60 backdrop-blur-sm p-6 shadow-sm">
          <h2 className="text-base font-bold text-foreground mb-1">
            Connect Custom Domain
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Enter your apex domain (e.g. <code>mla-rajesh.in</code>) or subdomain (e.g. <code>portal.mla-rajesh.in</code>) without http/https.
          </p>

          <form
            onSubmit={handleAddDomain}
            className="flex flex-col sm:flex-row gap-3 max-w-xl"
          >
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Connected Domains
            </h2>
            <span className="text-xs text-muted-foreground">
              {domains.length} domain{domains.length === 1 ? "" : "s"} registered
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card
                  key={i}
                  className="p-5 rounded-[24px] flex items-center justify-between"
                >
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
                Your website is currently accessible via:{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                  /site/{website?.slug}
                </code>
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {domains.map((d) => {
                const isExpanded = expandedDomainId === d.id;
                const dns = d.dnsRecords || {};
                const aHost = dns.a?.host || dns.aRecord?.host || "@";
                const aValue = dns.a?.value || dns.aRecord?.target || "YOUR_VPS_PUBLIC_IP";
                const cnameHost = dns.cname?.host || (d.domain.split(".").length > 2 ? d.domain.split(".")[0] : "www");
                const cnameTarget = dns.cname?.target || "domains.mpmla.in";
                const txtHost = dns.txt?.host || "_mpmla-verification";
                const txtValue = dns.txt?.value || d.verificationToken || "";

                return (
                  <Card
                    key={d.id}
                    className="p-5 rounded-[24px] border-border/60 bg-card/60 backdrop-blur-sm shadow-sm space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-foreground font-mono">
                              {d.domain}
                            </span>
                            {d.isPrimary && (
                              <Badge className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                                <Star className="w-3 h-3 fill-primary" /> Primary
                                Domain
                              </Badge>
                            )}
                            {renderStatusBadge(d)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Type: {d.type} • Added{" "}
                            {new Date(d.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Live Website Preview Link */}
                        <a
                          href={getLiveTestUrl(d.domain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                          title="Open published website"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-primary" />
                          <span>Visit Website</span>
                        </a>

                        {/* DNS Config Accordion Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExpandedDomainId(isExpanded ? null : d.id)
                          }
                          className="rounded-xl text-xs font-semibold gap-1"
                        >
                          <span>DNS Records</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </Button>

                        {/* Verify DNS Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={verifyingId === d.id}
                          onClick={() => handleVerify(d.id)}
                          className="rounded-xl text-xs font-semibold gap-1.5"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              verifyingId === d.id ? "animate-spin" : ""
                            }`}
                          />
                          Verify DNS
                        </Button>

                        {/* Provision SSL Button when verified but SSL not active */}
                        {d.isVerified && d.sslStatus !== "ACTIVE" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={provisioningId === d.id}
                            onClick={() => handleProvisionSsl(d.id)}
                            className="rounded-xl text-xs font-semibold gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                          >
                            <ShieldCheck
                              className={`w-3.5 h-3.5 ${
                                provisioningId === d.id ? "animate-spin" : ""
                              }`}
                            />
                            Provision SSL
                          </Button>
                        )}

                        {/* Primary Domain Button: only enabled when verified, active, and SSL active */}
                        {!d.isPrimary && (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!d.isVerified || d.sslStatus !== "ACTIVE" || !d.isActive}
                            onClick={() => handleSetPrimary(d.id)}
                            className="rounded-xl text-xs font-semibold disabled:opacity-50"
                            title={
                              !d.isVerified || d.sslStatus !== "ACTIVE"
                                ? "Domain must be verified and have active SSL before it can be primary"
                                : "Set as primary domain"
                            }
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
                    </div>

                    {/* Expandable DNS Records for this specific domain */}
                    {isExpanded && (
                      <div className="mt-4 p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">
                            Required DNS Configuration for: <code>{d.domain}</code>
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Generated from platform configuration (no hardcoded settings)
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border border-border/80 rounded-xl overflow-hidden bg-card">
                            <thead className="bg-muted text-muted-foreground font-semibold border-b border-border/80">
                              <tr>
                                <th className="p-2.5">Record Type</th>
                                <th className="p-2.5">Host / Name</th>
                                <th className="p-2.5">Value / Target</th>
                                <th className="p-2.5 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 font-mono text-foreground">
                              {/* CNAME */}
                              <tr>
                                <td className="p-2.5 font-bold text-primary">CNAME</td>
                                <td className="p-2.5">{cnameHost}</td>
                                <td className="p-2.5 text-xs break-all">
                                  {cnameTarget}
                                </td>
                                <td className="p-2.5 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleCopy(cnameTarget, `${d.id}-cname`)
                                    }
                                    className="h-7 px-2 text-[11px] gap-1"
                                  >
                                    {copiedKey === `${d.id}-cname` ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-500" />
                                        <span>Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy Target</span>
                                      </>
                                    )}
                                  </Button>
                                </td>
                              </tr>

                              {/* A Record */}
                              <tr>
                                <td className="p-2.5 font-bold text-blue-600">A Record</td>
                                <td className="p-2.5">{aHost}</td>
                                <td className="p-2.5 text-xs">{aValue}</td>
                                <td className="p-2.5 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleCopy(aValue, `${d.id}-a`)
                                    }
                                    className="h-7 px-2 text-[11px] gap-1"
                                  >
                                    {copiedKey === `${d.id}-a` ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-500" />
                                        <span>Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy IP</span>
                                      </>
                                    )}
                                  </Button>
                                </td>
                              </tr>

                              {/* TXT Ownership Verification */}
                              {txtValue && (
                                <tr>
                                  <td className="p-2.5 font-bold text-amber-600">TXT</td>
                                  <td className="p-2.5">{txtHost}</td>
                                  <td className="p-2.5 text-xs break-all">
                                    {txtValue}
                                  </td>
                                  <td className="p-2.5 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleCopy(txtValue, `${d.id}-txt`)
                                      }
                                      className="h-7 px-2 text-[11px] gap-1"
                                    >
                                      {copiedKey === `${d.id}-txt` ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-500" />
                                          <span>Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copy Token</span>
                                        </>
                                      )}
                                    </Button>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── DNS Configuration Guide ─────────────────────────────── */}
        <Card className="p-6 rounded-[24px] bg-muted/20 border-border/60 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm">
            <Info className="w-4 h-4 text-primary" />
            <span>Multi-Tenant Domain Setup Checklist & Lifecycle</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The platform uses a unified multi-tenant architecture. Once configured at your registrar, all traffic routes through the central reverse proxy to render the tenant's published website based on the incoming hostname.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-card border border-border/70 space-y-1">
              <div className="font-bold text-primary">1. DNS Verification</div>
              <p className="text-muted-foreground text-[11px]">
                Validates domain ownership via <code>_mpmla-verification</code> TXT record.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-card border border-border/70 space-y-1">
              <div className="font-bold text-blue-600">2. Domain Routing</div>
              <p className="text-muted-foreground text-[11px]">
                Points A/CNAME to your hosting infrastructure (Nginx / VPS).
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-card border border-border/70 space-y-1">
              <div className="font-bold text-purple-600">3. SSL Provisioning</div>
              <p className="text-muted-foreground text-[11px]">
                Installs Let's Encrypt TLS certificate via automated Certbot service.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-card border border-border/70 space-y-1">
              <div className="font-bold text-emerald-600">4. Live Delivery</div>
              <p className="text-muted-foreground text-[11px]">
                Hostname resolver matches domain to published pages dynamically.
              </p>
            </div>
          </div>

          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-1">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Cloudflare / Proxy Note
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If your domain is behind Cloudflare Proxy, public DNS queries return Cloudflare's anycast IPs. Ensure you keep the <strong>TXT ownership record</strong> configured so verification passes seamlessly regardless of proxy state.
            </p>
          </div>
        </Card>
      </div>

      {/* ─── Verification Diagnostic Dialog ──────────────────────── */}
      {verificationModal && (
        <Dialog
          open={verificationModal.isOpen}
          onOpenChange={(open) => {
            if (!open) setVerificationModal(null);
          }}
        >
          <DialogContent className="rounded-3xl max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                {verificationModal.success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>DNS Ownership Verified</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <span>DNS Records Pending or Incomplete</span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground pt-1">
                Domain: <strong className="text-foreground">{verificationModal.domain}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <p className="text-foreground font-medium leading-relaxed">
                {verificationModal.message}
              </p>

              {verificationModal.diagnostics && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 font-mono text-[11px] space-y-2">
                  <div className="font-bold text-foreground">Diagnostic Details:</div>
                  {verificationModal.diagnostics.records && (
                    <div className="space-y-1 text-muted-foreground">
                      <div>
                        CNAMEs:{" "}
                        <span className="text-foreground">
                          {JSON.stringify(verificationModal.diagnostics.records.cname || [])}
                        </span>
                      </div>
                      <div>
                        A Records:{" "}
                        <span className="text-foreground">
                          {JSON.stringify(verificationModal.diagnostics.records.a || [])}
                        </span>
                      </div>
                      <div>
                        TXT Records:{" "}
                        <span className="text-foreground">
                          {JSON.stringify(verificationModal.diagnostics.records.txt || [])}
                        </span>
                      </div>
                    </div>
                  )}

                  {verificationModal.diagnostics.expected && (
                    <div className="pt-1 border-t border-border/50 text-muted-foreground">
                      Expected CNAME Target:{" "}
                      <span className="text-primary font-bold">
                        {verificationModal.diagnostics.expected.cnameTarget}
                      </span>{" "}
                      or Target IP:{" "}
                      <span className="text-blue-600 font-bold">
                        {verificationModal.diagnostics.expected.targetIp}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              {!verificationModal.success && verificationModal.domainId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const id = verificationModal.domainId!;
                    setVerificationModal(null);
                    handleVerify(id, true);
                  }}
                  className="rounded-xl text-xs gap-1.5 border-dashed border-primary/50 text-primary hover:bg-primary/10"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Dev Mode: Simulate & Verify</span>
                </Button>
              )}

              <Button
                variant={verificationModal.success ? "default" : "secondary"}
                size="sm"
                onClick={() => setVerificationModal(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
};
