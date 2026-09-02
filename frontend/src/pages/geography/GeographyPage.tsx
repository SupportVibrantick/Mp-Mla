import { useState, useEffect } from "react";
import api from "@/lib/api";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  Map,
  Globe,
  Navigation,
  Building,
  Landmark,
  User,
  Vote,
  MapPin,
  ArrowRight,
  Building2,
} from "lucide-react";

export default function GeographyPage() {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const overviewRes = await api.get("/admin/constituency/overview");
      setOverview(overviewRes.data?.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Geography">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </MainLayout>
    );
  }

  const tenantName = overview?.tenant?.name || "Constituency Management Office";
  const counts = overview?.counts || {};
  const constituencies = overview?.constituencies || [];

  const row1Stats = [
    {
      id: "constituency",
      label: "Constituency",
      value: counts.constituencies || 0,
      icon: Landmark,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
      borderColor: "border-t-blue-600 dark:border-t-blue-500",
      href: "/geography/constituencies",
    },
    {
      id: "districts",
      label: "Districts",
      value: counts.districts || 0,
      icon: Globe,
      color: "text-sky-600 dark:text-sky-400",
      bgColor: "bg-sky-50 dark:bg-sky-950/40",
      borderColor: "border-t-sky-600 dark:border-t-sky-500",
      href: "/geography/districts",
    },
    {
      id: "blocks",
      label: "Blocks",
      value: counts.blocks || 0,
      icon: Navigation,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/40",
      borderColor: "border-t-indigo-600 dark:border-t-indigo-500",
      href: "/geography/blocks",
    },
  ];

  const row2Stats = [
    {
      id: "townVillages",
      label: "Towns / Villages",
      value: counts.townVillages || 0,
      icon: Building,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/40",
      borderColor: "border-t-rose-600 dark:border-t-rose-500",
      href: "/geography/town-villages",
    },
    {
      id: "wards",
      label: "Wards",
      value: counts.wards || 0,
      icon: Map,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
      borderColor: "border-t-emerald-600 dark:border-t-emerald-500",
      href: "/geography/wards",
    },
    {
      id: "booths",
      label: "Booths",
      value: counts.booths || 0,
      icon: Vote,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/40",
      borderColor: "border-t-orange-600 dark:border-t-orange-500",
      href: "/geography/booths",
    },
    {
      id: "pollingLocations",
      label: "Polling Stations",
      value: counts.pollingLocations || 0,
      icon: MapPin,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
      borderColor: "border-t-amber-600 dark:border-t-amber-500",
      href: "/geography/polling-locations",
    },
  ];

  return (
    <MainLayout title="Geography">
      <div className="space-y-8">
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a365d] via-[#2b6cb0] to-[#4c51bf] text-white p-6 sm:p-8 shadow-lg border border-white/10">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 -mb-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
                <Map className="h-7 w-7 text-sky-300 animate-pulse" /> Geography
              </h1>
              <p className="text-sm text-blue-100 max-w-2xl">
                Explore administrative boundaries, active constituencies, representative configurations, and polling locations.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/geography/districts">
                <Button variant="secondary" size="sm" className="text-xs font-semibold shadow-sm bg-white/20 hover:bg-white/30 text-white border border-white/25 h-9 rounded-xl">
                  Manage Setup
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Tenant Details */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Tenant / Office
          </h2>
          <Card className="border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary shrink-0">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">{tenantName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Primary Administrative Hub</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overview Stats Layout */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {row1Stats.map((s) => {
              const Icon = s.icon;
              return (
                <Link key={s.id} href={s.href}>
                  <Card
                    className={cn(
                      "border-t-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-card/60 backdrop-blur-md border-border/45 hover:border-primary/40",
                      s.borderColor
                    )}
                  >
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          {s.label}
                        </p>
                        <h3 className="text-2xl font-extrabold text-foreground">{s.value}</h3>
                      </div>
                      <div className={cn("p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-110", s.bgColor, s.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {row2Stats.map((s) => {
              const Icon = s.icon;
              return (
                <Link key={s.id} href={s.href}>
                  <Card
                    className={cn(
                      "border-t-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-card/60 backdrop-blur-md border-border/45 hover:border-primary/40",
                      s.borderColor
                    )}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          {s.label}
                        </p>
                        <h3 className="text-xl font-extrabold text-foreground">{s.value}</h3>
                      </div>
                      <div className={cn("p-2 rounded-lg shrink-0 transition-transform group-hover:scale-110", s.bgColor, s.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Constituencies List */}
        <div className="space-y-4 border-t pt-6">
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Constituencies</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a constituency below to view details, representative info, wards, town/villages, booths, and polling locations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {constituencies.map((c: any) => (
              <Card
                key={c.id}
                className="border border-border/50 bg-card rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-extrabold text-base text-foreground leading-snug">
                        {c.name}
                      </h3>
                      <div className="flex gap-2 items-center mt-2 flex-wrap">
                        <Badge className="text-[9px] font-bold bg-primary/10 text-primary border-primary/20 capitalize">
                          {c.type?.toLowerCase()}
                        </Badge>
                        {c.district && (
                          <Badge variant="outline" className="text-[9px] font-semibold border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400">
                            District: {c.district.name}
                          </Badge>
                        )}
                        {c.code && (
                          <span className="text-[10px] text-muted-foreground font-mono font-medium">
                            Code: {c.code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t pt-3.5 text-xs text-foreground font-medium">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>
                      Representative:{" "}
                      <strong className="text-foreground">
                        {c.representative?.name || "Not assigned"}
                      </strong>
                      {c.representative?.title && ` (${c.representative.title})`}
                    </span>
                  </div>
                </div>

                <div className="bg-muted/30 border-t border-border/30 px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-bold uppercase tracking-wider text-[10px]">
                    <span>Wards: {c.counts?.wards || 0}</span>
                    <span>•</span>
                    <span>Villages: {c.counts?.townVillages || 0}</span>
                    <span>•</span>
                    <span>Booths: {c.counts?.booths || 0}</span>
                    <span>•</span>
                    <span>Stations: {c.counts?.pollingLocations || 0}</span>
                  </div>
                  <Link href={`/geography/constituencies/${c.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs h-8 text-primary hover:text-primary/90 p-0 font-extrabold flex items-center gap-1">
                      View Details <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}

            {constituencies.length === 0 && (
              <div className="md:col-span-2 p-12 text-center border border-dashed rounded-2xl bg-muted/5">
                <Landmark className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <h3 className="text-sm font-bold text-foreground mt-3">No Constituencies Configured</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a constituency in Setup to start mapping administrative data.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
