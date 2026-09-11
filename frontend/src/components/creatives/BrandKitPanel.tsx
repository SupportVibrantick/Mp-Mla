import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useSystemSettings } from "@/contexts/SettingsContext";
import { getImageUrl } from "@/lib/utils";
import { Building2, User, ImageIcon, Check, Wand2 } from "lucide-react";

export interface BrandKitData {
  representativeName: string;
  designation: string;
  leaderPhotoUrl?: string;
  partyLogoUrl?: string;
  tenantLogoUrl?: string;
  footerText: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

interface BrandKitPanelProps {
  onApplyBrandKit: (brandData: BrandKitData) => void;
}

export function BrandKitPanel({ onApplyBrandKit }: BrandKitPanelProps) {
  const { settings } = useSystemSettings();
  const [useBrandKit, setUseBrandKit] = useState(true);

  const repName = settings?.representative_name || "Shri Representative";
  const repTitle = `${settings?.representative_title || "MLA"}, ${settings?.org_name || "Constituency"}`;
  const repPhoto = settings?.representative_photo || "";
  const brandLogo = settings?.brand_logo_url || "";
  const partyLogo = settings?.party_logo_url || brandLogo;

  const handleApply = () => {
    onApplyBrandKit({
      representativeName: repName,
      designation: repTitle,
      leaderPhotoUrl: repPhoto,
      partyLogoUrl: partyLogo,
      tenantLogoUrl: brandLogo,
      footerText: `${repName} | ${repTitle}`,
      colors: {
        primary: "#047857",
        secondary: "#1e3a8a",
        accent: "#ea580c",
      },
    });
  };

  return (
    <div className="space-y-4 text-xs">
      <Card className="border border-emerald-100 bg-emerald-50/30 dark:bg-slate-900 rounded-2xl shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#047857]" />
              <span className="font-bold text-slate-900 dark:text-white text-sm">Tenant Brand Kit</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-semibold">Auto-Sync</span>
              <Switch checked={useBrandKit} onCheckedChange={setUseBrandKit} />
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Official constituency assets dynamically loaded from tenant configuration settings.
          </p>

          {/* Representative & Logo Assets Grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-2xs">
              <div className="w-10 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border">
                {repPhoto ? (
                  <img src={getImageUrl(repPhoto)} alt="Rep" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-[11px] truncate text-slate-900 dark:text-white">{repName}</div>
                <div className="text-[10px] text-slate-500 truncate">{repTitle}</div>
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center p-1 border">
                {partyLogo ? (
                  <img src={getImageUrl(partyLogo)} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-[11px] truncate text-slate-900 dark:text-white">Party Logo</div>
                <div className="text-[10px] text-[#047857] font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Synced
                </div>
              </div>
            </div>
          </div>

          {/* Brand Palette */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Official Colors</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#047857] shadow-sm border border-white" title="Emerald Primary (#047857)" />
              <div className="w-6 h-6 rounded-full bg-[#1e3a8a] shadow-sm border border-white" title="Royal Blue (#1e3a8a)" />
              <div className="w-6 h-6 rounded-full bg-[#ea580c] shadow-sm border border-white" title="Saffron (#ea580c)" />
              <Badge variant="outline" className="text-[9px] font-mono ml-auto">Verified</Badge>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleApply}
            className="w-full h-9 bg-[#047857] hover:bg-[#064e3b] text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm mt-2"
          >
            <Wand2 className="w-3.5 h-3.5" /> Apply Brand Kit to Canvas
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
