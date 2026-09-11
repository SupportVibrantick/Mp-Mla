import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Plus, ArrowRight, Clock, Heart } from "lucide-react";
import { CreativeCategory, CreativeTemplateDef, SavedCreativeItem } from "@/types/creative";
import { getImageUrl } from "@/lib/utils";

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
    title: "Birthday Wish",
    icon: "🎂",
    description: "Greetings for leaders, citizens & supporters",
    color: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
  },
  {
    category: "MEETING" as CreativeCategory,
    title: "Meeting Invite",
    icon: "📅",
    description: "Samvad, consultations & briefings",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  },
  {
    category: "JANATA_DARBAR" as CreativeCategory,
    title: "Janata Darbar",
    icon: "🏛",
    description: "Grievance camp hearings & notices",
    color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
  {
    category: "PUBLIC_ANNOUNCEMENT" as CreativeCategory,
    title: "Public Notice",
    icon: "📢",
    description: "Power, water & emergency alerts",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
  },
  {
    category: "DEVELOPMENT_WORK" as CreativeCategory,
    title: "Development Work",
    icon: "🏗",
    description: "Roads, hospitals & project milestones",
    color: "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100",
  },
  {
    category: "ACHIEVEMENT" as CreativeCategory,
    title: "Achievement",
    icon: "🏆",
    description: "Report cards & statistical achievements",
    color: "bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
  },
  {
    category: "GOVT_SCHEME" as CreativeCategory,
    title: "Government Scheme",
    icon: "📜",
    description: "Housing, health & student benefits",
    color: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100",
  },
  {
    category: "FESTIVAL" as CreativeCategory,
    title: "Festival Wishes",
    icon: "🎉",
    description: "Diwali, Holi, Eid & festival wishes",
    color: "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100",
  },
  {
    category: "NATIONAL_DAYS" as CreativeCategory,
    title: "National Days",
    icon: "🇮🇳",
    description: "Republic Day & Independence Day",
    color: "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100",
  },
  {
    category: "AWARENESS" as CreativeCategory,
    title: "Awareness Campaign",
    icon: "🌿",
    description: "Green environment & cleanliness drives",
    color: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
  },
  {
    category: "EVENTS" as CreativeCategory,
    title: "Community Event",
    icon: "⚽",
    description: "Marathon, health camps & fests",
    color: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
  },
  {
    category: "GENERAL" as CreativeCategory,
    title: "General Quote",
    icon: "💬",
    description: "Daily quotes & vision messages",
    color: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
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
      {/* ── HERO CREATIVE LANDING BANNER ──────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-800 via-[#047857] to-teal-700 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <Badge className="bg-white/20 text-white border-none font-bold text-xs">
            Constituency Communication Platform
          </Badge>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Create a New Creative</h1>
          <p className="text-emerald-100 text-xs md:text-sm leading-relaxed">
            Create professional constituency posters, announcements and social media creatives in 60 seconds with automatic branding.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <Button
              onClick={onStartBlank}
              className="rounded-2xl bg-white text-[#047857] hover:bg-emerald-50 font-bold text-xs h-10 shadow-md gap-1.5"
            >
              <Plus className="w-4 h-4" /> Start Custom Design
            </Button>
          </div>
        </div>
      </div>

      {/* ── SEARCH INPUT ─────────────────────────────────────────── */}
      <div className="relative max-w-xl mx-auto">
        <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
        <Input
          placeholder="Search what you want to create (e.g. Birthday, Meeting, Scheme...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11 h-11 rounded-2xl border-slate-200 bg-white dark:bg-slate-900 shadow-xs text-xs"
        />
      </div>

      {/* ── CATEGORY SELECTION GRID ───────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white text-base">What do you want to create?</h2>
          <span className="text-xs text-slate-500 font-medium">Select occasion or category</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {filteredCategories.map((cat) => (
            <div
              key={cat.category}
              onClick={() => onSelectCategory(cat.category)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 shadow-2xs hover:shadow-md hover:scale-[1.02] ${cat.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{cat.icon}</span>
                <ArrowRight className="w-4 h-4 opacity-60" />
              </div>
              <div>
                <h3 className="font-bold text-xs">{cat.title}</h3>
                <p className="text-[10px] opacity-80 line-clamp-1 mt-0.5">{cat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RECENTLY USED TEMPLATES ────────────────────────────────── */}
      {recentTemplates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#047857]" /> Popular & Recent Templates
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                <CardContent className="p-2.5 text-center">
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
