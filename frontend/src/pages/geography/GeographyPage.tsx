import { useState, useEffect } from "react";
import api from "@/lib/api";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Map,
  Globe,
  Navigation,
  Building,
  Home,
  ChevronRight,
  ChevronDown,
  Landmark,
  User,
  PlusCircle,
  Vote,
} from "lucide-react";

export default function GeographyPage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [tree, setTree] = useState<any>(null);

  // Expanded Tree Nodes
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, overviewRes, treeRes] = await Promise.all([
        api.get("/admin/constituency/stats"),
        api.get("/admin/constituency/overview"),
        api.get("/admin/constituency/tree"),
      ]);
      setStats(statsRes.data?.data);
      setOverview(overviewRes.data?.data);
      setTree(treeRes.data?.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  if (loading) {
    return (
      <MainLayout title="Geography Overview">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </MainLayout>
    );
  }

  // Group entities for tree building
  const districts = tree?.districts || [];
  const blocks = tree?.blocks || [];
  const townVillages = tree?.townVillages || [];
  const villages: any[] = [];
  const wards = tree?.wards || [];
  const booths = tree?.booths || [];

  return (
    <MainLayout title="Geography Overview">
      <div className="space-y-6">
        {/* Header Section */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
            <Map className="h-7 w-7 text-primary animate-pulse" /> Geography
            Overview
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
            Explore active constituencies, profiles, and structural hierarchies.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {[
            {
              label: "Constituencies",
              value: overview?.constituency ? 1 : 0,
              icon: Landmark,
            },
            { label: "Districts", value: stats?.districts || 0, icon: Globe },
            { label: "Blocks", value: stats?.blocks || 0, icon: Navigation },
            {
              label: "Towns/Villages",
              value: stats?.townVillages || 0,
              icon: Building,
            },
            { label: "Wards", value: stats?.wards || 0, icon: Map },
            { label: "Booths", value: stats?.booths || 0, icon: Vote },
          ].map((s, i) => (
            <Card
              key={i}
              className="border border-border/50 bg-card rounded-2xl shadow-sm hover:shadow-md transition-all"
            >
              <CardContent className="p-4 space-y-2">
                <div className="p-1.5 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider truncate">
                    {s.label}
                  </p>
                  <h3 className="text-lg font-bold mt-0.5 text-foreground">
                    {s.value}
                  </h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left / Center Details (Overview details) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Constituency Profile */}
            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Active Constituency
                </h3>
                {overview?.constituency ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-xl font-extrabold text-foreground flex items-center gap-1.5">
                      <Landmark className="h-5 w-5 text-indigo-500" />{" "}
                      {overview.constituency.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-semibold">
                      Type:{" "}
                      <span className="text-foreground uppercase">
                        {overview.constituency.type}
                      </span>
                    </p>
                    {overview.constituency.code && (
                      <p className="text-xs text-muted-foreground font-semibold">
                        Code:{" "}
                        <span className="text-foreground font-mono">
                          {overview.constituency.code}
                        </span>
                      </p>
                    )}
                    {overview.constituency.description && (
                      <p className="text-xs text-muted-foreground border-t border-border/40 pt-2 mt-2 leading-relaxed">
                        {overview.constituency.description}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    No active constituency configured.
                  </p>
                )}
              </div>
            </Card>

            {/* Representative Card */}
            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Active Representative
                </h3>
                {overview?.representative ? (
                  <div className="mt-3 flex items-center gap-4">
                    {overview.representative.photoUrl ? (
                      <img
                        src={overview.representative.photoUrl}
                        alt={overview.representative.name}
                        className="h-12 w-12 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <p className="font-extrabold text-foreground text-sm">
                        {overview.representative.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                        {overview.representative.title}
                      </p>
                      {overview.representative.partyName && (
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-1 uppercase tracking-wide">
                          {overview.representative.partyName}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    No active representative details found.
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Hierarchy Tree Visualizer */}
          <div className="lg:col-span-2">
            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm p-6 space-y-4">
              <div>
                <h2 className="text-base font-extrabold text-foreground">
                  Interactive Hierarchy Tree
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click administrative levels to expand and navigate down to
                  individual booths.
                </p>
              </div>

              {/* Roots of hierarchy (Districts) */}
              <div className="border border-border/40 rounded-xl p-4 bg-muted/5 max-h-125 overflow-y-auto space-y-2 text-sm">
                {districts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No administrative records configured.
                  </p>
                ) : (
                  districts.map((d: any) => {
                    const isExpanded = !!expandedNodes[`district-${d.id}`];
                    const districtBlocks = blocks.filter(
                      (b: any) => b.districtId === d.id,
                    );
                    const districtTownVillages = townVillages.filter(
                      (item: any) => item.districtId === d.id,
                    );

                    return (
                      <div key={d.id} className="space-y-1.5">
                        <div
                          onClick={() => toggleNode(`district-${d.id}`)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/30 cursor-pointer font-bold text-foreground transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Globe className="h-4 w-4 text-sky-500" />
                          <span>
                            {d.name}{" "}
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({d.code || "District"})
                            </span>
                          </span>
                        </div>

                        {isExpanded && (
                          <div className="pl-6 border-l border-border/60 ml-5 space-y-2 mt-1">
                            {/* Blocks Section */}
                            {districtBlocks.map((b: any) => {
                              const bExpanded =
                                !!expandedNodes[`block-${b.id}`];
                              const blockPanchayats: any[] = [];
                              const blockVillages = townVillages.filter(
                                (v: any) => v.blockId === b.id,
                              );

                              return (
                                <div key={b.id} className="space-y-1">
                                  <div
                                    onClick={() => toggleNode(`block-${b.id}`)}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted/30 cursor-pointer text-xs font-semibold text-foreground transition-colors"
                                  >
                                    {bExpanded ? (
                                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <Navigation className="h-3.5 w-3.5 text-indigo-500" />
                                    <span>{b.name} (Block)</span>
                                  </div>

                                  {bExpanded && (
                                    <div className="pl-5 border-l border-border/40 ml-4 space-y-1 mt-0.5">
                                      {/* Panchayats */}
                                      {blockPanchayats.map((p: any) => {
                                        const pExpanded =
                                          !!expandedNodes[`panchayat-${p.id}`];
                                        const panchayatVillages =
                                          villages.filter(
                                            (v: any) => v.panchayatId === p.id,
                                          );

                                        return (
                                          <div key={p.id} className="space-y-1">
                                            <div
                                              onClick={() =>
                                                toggleNode(`panchayat-${p.id}`)
                                              }
                                              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/30 cursor-pointer text-xs font-medium text-foreground transition-colors"
                                            >
                                              {pExpanded ? (
                                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                              ) : (
                                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                              )}
                                              <Home className="h-3.5 w-3.5 text-amber-500" />
                                              <span>{p.name} (GP)</span>
                                            </div>

                                            {pExpanded && (
                                              <div className="pl-4 border-l border-border/40 ml-3.5 space-y-1">
                                                {panchayatVillages.map(
                                                  (v: any) => (
                                                    <div
                                                      key={v.id}
                                                      className="flex items-center gap-2 px-2 py-0.5 text-xs text-muted-foreground"
                                                    >
                                                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                      <span>
                                                        {v.name} (Village)
                                                      </span>
                                                    </div>
                                                  ),
                                                )}
                                                {panchayatVillages.length ===
                                                  0 && (
                                                  <span className="text-[10px] text-muted-foreground pl-3">
                                                    No villages
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}

                                      {/* Unassigned Villages */}
                                      {blockVillages.map((v: any) => (
                                        <div
                                          key={v.id}
                                          className="flex items-center gap-2 px-2.5 py-1 text-xs text-muted-foreground"
                                        >
                                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                          <span>{v.name} (Village)</span>
                                        </div>
                                      ))}
                                      {blockPanchayats.length === 0 &&
                                        blockVillages.length === 0 && (
                                          <span className="text-[10px] text-muted-foreground pl-3">
                                            Empty block
                                          </span>
                                        )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Municipal Areas Section */}
                            {districtTownVillages.map((m: any) => {
                              const mExpanded = !!expandedNodes[`mun-${m.id}`];
                              const municipalWards = wards.filter(
                                (w: any) => w.townVillageId === m.id,
                              );

                              return (
                                <div key={m.id} className="space-y-1">
                                  <div
                                    onClick={() => toggleNode(`mun-${m.id}`)}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted/30 cursor-pointer text-xs font-semibold text-foreground transition-colors"
                                  >
                                    {mExpanded ? (
                                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <Building className="h-3.5 w-3.5 text-rose-500" />
                                    <span>
                                      {m.name} ({m.type || "Town/Village"})
                                    </span>
                                  </div>

                                  {mExpanded && (
                                    <div className="pl-5 border-l border-border/40 ml-4 space-y-1 mt-0.5">
                                      {municipalWards.map((w: any) => {
                                        const wExpanded =
                                          !!expandedNodes[`ward-${w.id}`];
                                        const wardBooths = booths.filter(
                                          (b: any) => b.wardId === w.id,
                                        );

                                        return (
                                          <div key={w.id} className="space-y-1">
                                            <div
                                              onClick={() =>
                                                toggleNode(`ward-${w.id}`)
                                              }
                                              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/30 cursor-pointer text-xs font-medium text-foreground transition-colors"
                                            >
                                              {wExpanded ? (
                                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                              ) : (
                                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                              )}
                                              <Map className="h-3.5 w-3.5 text-emerald-500" />
                                              <span>
                                                {w.name} (Ward {w.wardNumber})
                                              </span>
                                            </div>

                                            {wExpanded && (
                                              <div className="pl-4 border-l border-border/40 ml-3.5 space-y-1">
                                                {wardBooths.map((b: any) => (
                                                  <div
                                                    key={b.id}
                                                    className="flex items-center gap-2 px-2 py-0.5 text-xs text-muted-foreground"
                                                  >
                                                    <Vote className="h-3 w-3 text-indigo-400" />
                                                    <span>
                                                      Booth {b.boothNumber}:{" "}
                                                      {b.boothName}
                                                    </span>
                                                  </div>
                                                ))}
                                                {wardBooths.length === 0 && (
                                                  <span className="text-[10px] text-muted-foreground pl-3">
                                                    No booths assigned
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {municipalWards.length === 0 && (
                                        <span className="text-[10px] text-muted-foreground pl-3">
                                          No wards found
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
