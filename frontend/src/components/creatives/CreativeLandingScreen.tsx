import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ArrowRight, Clock, Heart } from "lucide-react";
import { CreativeCategory, CreativeTemplateDef, SavedCreativeItem } from "@/types/creative";

interface CreativeLandingScreenProps {
  onSelectCategory: (category: CreativeCategory) => void;
  onSelectTemplate: (template: CreativeTemplateDef) => void;
  recentTemplates: CreativeTemplateDef[];
  savedCreatives: SavedCreativeItem[];
  onOpenSavedCreative: (item: SavedCreativeItem) => void;
  onStartBlank: () => void;
}

export const POPULAR_CATEGORY_CARDS = [
  {
    category: "BIRTHDAY" as CreativeCategory,
    title: "Birthday Wish / जन्मदिन",
    icon: "🎂",
    description: "Personalized greetings for leaders, citizens & workers",
    color: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
  },
  {
    category: "MEETING" as CreativeCategory,
    title: "Meeting & Samvad / बैठक",
    icon: "🤝",
    description: "Samvad, constituency consultations & review meetings",
    color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  {
    category: "GENERAL" as CreativeCategory,
    title: "General Template / जन संदेश",
    icon: "📢",
    description: "General announcements, public notices & party quotes",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  },
  {
    category: "OTHER" as CreativeCategory,
    title: "Other / बधाई एवं शुभकामनाएं",
    icon: "🎉",
    description: "Celebrations, achievements, festivals & special greetings",
    color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
];

export function CreativeLandingScreen({
  onSelectCategory,
  onSelectTemplate,
  recentTemplates,
  savedCreatives,
  onOpenSavedCreative,
  onStartBlank,
}: CreativeLandingScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = POPULAR_CATEGORY_CARDS.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* ── HERO BANNER ──────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-800 via-[#047857] to-teal-700 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <Badge className="bg-white/20 text-white border-none font-bold text-xs">
            Constituency Design Studio
          </Badge>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Create a New Creative</h1>
          <p className="text-emerald-100 text-xs md:text-sm leading-relaxed">
            Create professional constituency posters, birthday wishes, meetings and announcements in seconds with automatic branding.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <Button
              onClick={onStartBlank}
              className="rounded-2xl bg-white text-[#047857] hover:bg-emerald-50 font-bold text-xs h-10 shadow-md gap-1.5"
            >
              <Plus className="w-4 h-4" /> Start Blank Canvas
            </Button>
          </div>
        </div>
      </div>

      {/* ── SEARCH INPUT ─────────────────────────────────────────── */}
      <div className="relative max-w-xl mx-auto">
        <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
        <Input
          placeholder="Search templates (Birthday, Meeting, General, Other)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11 h-11 rounded-2xl border-slate-200 bg-white dark:bg-slate-900 shadow-xs text-xs"
        />
      </div>

      {/* ── 4 MASTER CATEGORIES GRID ───────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white text-base">Select Template Category</h2>
          <span className="text-xs text-slate-500 font-medium">4 Curated Best Templates</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {filteredCategories.map((cat) => (
            <div
              key={cat.category}
              onClick={() => onSelectCategory(cat.category)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 shadow-2xs hover:shadow-md hover:scale-[1.02] ${cat.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">{cat.icon}</span>
                <ArrowRight className="w-4 h-4 opacity-60" />
              </div>
              <div>
                <h3 className="font-bold text-sm">{cat.title}</h3>
                <p className="text-[11px] opacity-80 line-clamp-2 mt-1">{cat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MASTER TEMPLATES PREVIEW ────────────────────────────────── */}
      {recentTemplates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#047857]" /> Available Master Templates
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {recentTemplates.slice(0, 4).map((tpl) => (
              <Card
                key={tpl.id}
                onClick={() => onSelectTemplate(tpl)}
                className="rounded-2xl border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer hover:shadow-md transition-all group"
              >
                <div
                  style={{ background: tpl.bgGradient }}
                  className="w-full aspect-[4/5] p-3 flex flex-col justify-between items-center text-center relative overflow-hidden group-hover:scale-[1.02] transition-transform"
                >
                  <Badge className="bg-white/90 text-[#047857] text-[9px] font-bold self-start">
                    #{tpl.num}
                  </Badge>
                  <h4 style={{ color: tpl.primaryColor }} className="font-black text-sm line-clamp-2">
                    {tpl.headingText}
                  </h4>
                  <div className="w-full bg-[#064e3b] text-white py-0.5 rounded text-[8px] font-bold truncate">
                    {tpl.footerText}
                  </div>
                </div>
                <CardContent className="p-3 text-center">
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">{tpl.name}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{tpl.category}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── RECENT DESIGNS ───────────────────────────────────────── */}
      {savedCreatives.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm">Recent Saved Designs</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {savedCreatives.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenSavedCreative(item)}
                className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#047857] transition-all cursor-pointer flex items-center gap-3 shadow-2xs"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#047857] flex items-center justify-center font-bold text-base shrink-0">
                  {item.title[0]}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{item.title}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold">{item.category} • {item.format}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
