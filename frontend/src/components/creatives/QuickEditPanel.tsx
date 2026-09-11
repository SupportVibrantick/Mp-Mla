import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getImageUrl } from "@/lib/utils";
import { CreativeTemplateDef } from "@/types/creative";
import {
  Upload,
  UserCheck,
  Trash2,
  Calendar,
  CheckCircle2,
  Sparkles,
  Image as ImageIcon,
  Building2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Palette,
  Check,
} from "lucide-react";

const COLOR_PALETTES = [
  { id: "emerald", name: "Emerald Green", primary: "#047857" },
  { id: "blue", name: "Royal Blue", primary: "#13538A" },
  { id: "red", name: "Crimson Red", primary: "#dc2626" },
  { id: "saffron", name: "Deep Saffron", primary: "#ea580c" },
  { id: "purple", name: "Royal Purple", primary: "#7e22ce" },
  { id: "gold", name: "Festive Gold", primary: "#eab308" },
];

const PRESET_BACKGROUNDS = [
  { id: "bg-cream", name: "Cream Warm", value: "linear-gradient(135deg, #fffdfa 0%, #fef3c7 40%, #fde68a 100%)" },
  { id: "bg-emerald", name: "Emerald Soft", value: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #a7f3d0 100%)" },
  { id: "bg-dark", name: "Festive Night", value: "linear-gradient(180deg, #1e1b4b 0%, #311042 50%, #4c0519 100%)" },
  { id: "bg-blue", name: "Sky Azure", value: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)" },
];

interface QuickEditPanelProps {
  activeTemplate: CreativeTemplateDef;
  headingText: string;
  setHeadingText: (val: string) => void;
  subheadingText: string;
  setSubheadingText: (val: string) => void;
  messageText: string;
  setMessageText: (val: string) => void;
  sloganText: string;
  setSloganText: (val: string) => void;
  dateText: string;
  setDateText: (val: string) => void;
  timeText: string;
  setTimeText: (val: string) => void;
  venueText: string;
  setVenueText: (val: string) => void;
  bullet1: string;
  setBullet1: (val: string) => void;
  bullet2: string;
  setBullet2: (val: string) => void;
  bullet3: string;
  setBullet3: (val: string) => void;
  footerText: string;
  setFooterText: (val: string) => void;
  repNameText: string;
  setRepNameText: (val: string) => void;
  repDesignationText: string;
  setRepDesignationText: (val: string) => void;
  leaderPhotoUrl: string;
  setLeaderPhotoUrl: (val: string) => void;
  partyLogoUrl: string;
  setPartyLogoUrl: (val: string) => void;
  activeBg: string;
  setActiveBg: (val: string) => void;
  activeThemeColor: string;
  setActiveThemeColor: (val: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, target: "leader" | "logo") => void;
  onOpenAdvancedEdit?: () => void;
}

export const QuickEditPanel: React.FC<QuickEditPanelProps> = ({
  activeTemplate,
  headingText,
  setHeadingText,
  subheadingText,
  setSubheadingText,
  messageText,
  setMessageText,
  sloganText,
  setSloganText,
  dateText,
  setDateText,
  timeText,
  setTimeText,
  venueText,
  setVenueText,
  bullet1,
  setBullet1,
  bullet2,
  setBullet2,
  bullet3,
  setBullet3,
  footerText,
  setFooterText,
  repNameText,
  setRepNameText,
  repDesignationText,
  setRepDesignationText,
  leaderPhotoUrl,
  setLeaderPhotoUrl,
  partyLogoUrl,
  setPartyLogoUrl,
  activeBg,
  setActiveBg,
  activeThemeColor,
  setActiveThemeColor,
  onFileUpload,
  onOpenAdvancedEdit,
}) => {
  const [showBrandDetails, setShowBrandDetails] = useState(false);
  const [showStyleOptions, setShowStyleOptions] = useState(false);

  const category = activeTemplate.category;

  const isSchedule =
    category === "MEETING" ||
    category === "EVENTS" ||
    category === "JANATA_DARBAR" ||
    category === "PUBLIC_ANNOUNCEMENT";

  const isHighlights =
    category === "GOVT_SCHEME" ||
    category === "AWARENESS" ||
    category === "DEVELOPMENT_WORK";

  return (
    <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardContent className="p-4 space-y-4 text-xs">
        {/* Header Title */}
        <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 dark:text-white text-base">Quick Edit</h2>
              <Badge className="bg-emerald-50 text-[#047857] border-emerald-200 text-[10px] font-bold">
                ✓ Schema Driven
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Template: <span className="font-bold text-[#047857]">{activeTemplate.name}</span>
            </p>
          </div>

          {onOpenAdvancedEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAdvancedEdit}
              className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:text-indigo-600"
            >
              <Sliders className="w-3.5 h-3.5 mr-1 text-[#047857]" /> Advanced
            </Button>
          )}
        </div>

        {/* ── 1. COLLAPSED OFFICIAL BRANDING CARD ────────────────── */}
        <div className="p-3 bg-emerald-50/40 dark:bg-slate-800/40 rounded-2xl border border-emerald-200/60 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#047857]" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-xs">Official Branding Applied</span>
                <p className="text-[10px] text-slate-500">{repNameText || "Shri Representative"} • {repDesignationText || "MLA"}</p>
              </div>
            </div>
            <button
              onClick={() => setShowBrandDetails(!showBrandDetails)}
              className="text-[11px] font-bold text-[#047857] hover:underline flex items-center gap-0.5"
            >
              {showBrandDetails ? "Hide" : "Customize"} {showBrandDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showBrandDetails && (
            <div className="pt-2 space-y-3 border-t border-emerald-100 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-600">Leader Photo</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-12 bg-slate-100 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center">
                      {leaderPhotoUrl ? (
                        <img src={getImageUrl(leaderPhotoUrl)} alt="Leader" className="w-full h-full object-cover" />
                      ) : (
                        <UserCheck className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <label className="px-2 py-1 bg-white border rounded-lg text-[10px] font-bold cursor-pointer hover:bg-slate-50">
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, "leader")} />
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-600">Party Logo</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center p-1">
                      {partyLogoUrl ? (
                        <img src={getImageUrl(partyLogoUrl)} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <label className="px-2 py-1 bg-white border rounded-lg text-[10px] font-bold cursor-pointer hover:bg-slate-50">
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, "logo")} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Input
                  placeholder="Representative Name"
                  value={repNameText}
                  onChange={(e) => setRepNameText(e.target.value)}
                  className="h-8 text-xs font-bold rounded-xl bg-white"
                />
                <Input
                  placeholder="Title & Constituency"
                  value={repDesignationText}
                  onChange={(e) => setRepDesignationText(e.target.value)}
                  className="h-8 text-xs rounded-xl bg-white"
                />
                <Input
                  placeholder="Footer Banner Slogan"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="h-8 text-xs rounded-xl bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── 2. CATEGORY SPECIFIC FIELDS ───────────────────────── */}

        {/* Main Heading */}
        <div className="space-y-1">
          <Label className="font-bold text-slate-700 dark:text-slate-300">
            {category === "BIRTHDAY" ? "Birthday Greeting Heading" : "Main Heading"}
          </Label>
          <Input
            value={headingText}
            onChange={(e) => setHeadingText(e.target.value)}
            className="rounded-xl h-10 text-xs border-slate-200 font-bold"
          />
        </div>

        {/* Sub Heading */}
        <div className="space-y-1">
          <Label className="font-bold text-slate-700 dark:text-slate-300">Sub Heading</Label>
          <Input
            value={subheadingText}
            onChange={(e) => setSubheadingText(e.target.value)}
            className="rounded-xl h-9 text-xs border-slate-200"
          />
        </div>

        {/* Message / Description */}
        <div className="space-y-1">
          <Label className="font-bold text-slate-700 dark:text-slate-300">
            {category === "BIRTHDAY" ? "Wish Message" : "Description / Details"}
          </Label>
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="rounded-xl text-xs min-h-[70px] border-slate-200"
          />
        </div>

        {/* Top Tagline / Slogan */}
        <div className="space-y-1">
          <Label className="font-bold text-slate-700 dark:text-slate-300">Top Tagline / Slogan</Label>
          <Input
            value={sloganText}
            onChange={(e) => setSloganText(e.target.value)}
            className="rounded-xl h-9 text-xs border-slate-200"
          />
        </div>

        {/* Schedule & Venue Fields */}
        {isSchedule && (
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200">
            <span className="font-bold text-xs text-[#047857] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Event Date, Time & Venue
            </span>
            <div className="space-y-1.5">
              <Input
                placeholder="Date (e.g. 15 सितम्बर 2024)"
                value={dateText}
                onChange={(e) => setDateText(e.target.value)}
                className="rounded-xl h-8 text-xs bg-white"
              />
              <Input
                placeholder="Time (e.g. सुबह 11:00 बजे)"
                value={timeText}
                onChange={(e) => setTimeText(e.target.value)}
                className="rounded-xl h-8 text-xs bg-white"
              />
              <Input
                placeholder="Venue (e.g. कम्युनिटी हॉल, वार्ड 12)"
                value={venueText}
                onChange={(e) => setVenueText(e.target.value)}
                className="rounded-xl h-8 text-xs bg-white"
              />
            </div>
          </div>
        )}

        {/* Highlights / Badges Fields */}
        {isHighlights && (
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200">
            <span className="font-bold text-xs text-[#047857] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Key Feature Badges
            </span>
            <div className="space-y-1.5">
              <Input
                placeholder="Highlight 1 (e.g. वित्तीय सहायता)"
                value={bullet1}
                onChange={(e) => setBullet1(e.target.value)}
                className="rounded-xl h-8 text-xs bg-white"
              />
              <Input
                placeholder="Highlight 2 (e.g. पक्का मकान)"
                value={bullet2}
                onChange={(e) => setBullet2(e.target.value)}
                className="rounded-xl h-8 text-xs bg-white"
              />
              <Input
                placeholder="Highlight 3 (e.g. सुरक्षित भविष्य)"
                value={bullet3}
                onChange={(e) => setBullet3(e.target.value)}
                className="rounded-xl h-8 text-xs bg-white"
              />
            </div>
          </div>
        )}

        {/* ── 3. OPTIONAL STYLE & THEME SECTION ────────────────── */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setShowStyleOptions(!showStyleOptions)}
            className="w-full py-2 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#047857]"
          >
            <span className="flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-[#047857]" /> Theme & Background Style
            </span>
            {showStyleOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showStyleOptions && (
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-600">Background Preset</Label>
                <div className="flex items-center gap-2">
                  {PRESET_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setActiveBg(bg.value)}
                      style={{ background: bg.value }}
                      className={`w-10 h-8 rounded-lg border transition-all ${
                        activeBg === bg.value ? "ring-2 ring-[#047857] border-transparent shadow-sm" : "border-slate-200"
                      }`}
                      title={bg.name}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-600">Primary Color Theme</Label>
                <div className="flex items-center gap-3">
                  {COLOR_PALETTES.map((palette) => (
                    <button
                      key={palette.id}
                      onClick={() => setActiveThemeColor(palette.primary)}
                      style={{ backgroundColor: palette.primary }}
                      className={`w-6 h-6 rounded-full border-2 border-white shadow-sm transition-all ${
                        activeThemeColor === palette.primary ? "ring-2 ring-slate-900 scale-110" : ""
                      }`}
                      title={palette.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
