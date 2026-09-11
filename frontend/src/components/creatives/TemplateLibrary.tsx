import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Sparkles, Filter, Eye, CheckCircle2, Heart } from "lucide-react";
import { CreativeTemplateDef, CreativeCategory } from "@/types/creative";
import { CreativeRenderer } from "./CreativeRenderer";
import { getTemplateElements } from "@/data/templateElementGenerator";

interface TemplateLibraryProps {
  templates: CreativeTemplateDef[];
  activeTemplateId?: string;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onSelectTemplate: (template: CreativeTemplateDef) => void;
  onPreviewTemplate?: (template: CreativeTemplateDef) => void;
  favorites?: string[];
  onToggleFavorite?: (templateId: string) => void;
  isFullView?: boolean;
}

export const CATEGORIES: { value: string; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "FAVORITES", label: "♥ Favorites" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "MEETING", label: "Meeting" },
  { value: "EVENTS", label: "Events" },
  { value: "JANATA_DARBAR", label: "Janata Darbar" },
  { value: "GOVT_SCHEME", label: "Government Schemes" },
  { value: "AWARENESS", label: "Awareness" },
  { value: "FESTIVAL", label: "Festival" },
  { value: "NATIONAL_DAYS", label: "National Days" },
  { value: "DEVELOPMENT_WORK", label: "Development Work" },
  { value: "PUBLIC_ANNOUNCEMENT", label: "Announcements" },
  { value: "GENERAL", label: "General" },
];

function TemplatePosterThumbnail({
  tpl,
  onClick,
  isFav,
  onToggleFavorite,
}: {
  tpl: CreativeTemplateDef;
  onClick: () => void;
  isFav?: boolean;
  onToggleFavorite?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  const w = tpl.width || 1080;
  const h = tpl.height || (tpl.format === "PORTRAIT_POST" ? 1350 : 1080);
  const elements = getTemplateElements(tpl);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (containerRef.current) {
        const clientWidth = containerRef.current.clientWidth;
        setScale(clientWidth / w);
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [w]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className="w-full aspect-[4/5] relative overflow-hidden cursor-pointer bg-slate-50 dark:bg-slate-900 group-hover:scale-[1.01] transition-transform shadow-inner rounded-t-2xl"
    >
      {/* Visual Scaled Poster Render */}
      <div
        style={{
          width: `${w}px`,
          height: `${h}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        className="absolute top-0 left-0 pointer-events-none select-none"
      >
        <CreativeRenderer
          width={w}
          height={h}
          background={tpl.bgGradient}
          elements={elements}
          slotValues={{
            headingText: tpl.headingText,
            subheadingText: tpl.subheadingText,
            messageText: tpl.messageText,
            sloganText: tpl.sloganText,
            dateText: tpl.dateText || "",
            timeText: tpl.timeText || "",
            venueText: tpl.venueText || "",
            bullet1: tpl.bullet1 || "",
            bullet2: tpl.bullet2 || "",
            bullet3: tpl.bullet3 || "",
            footerText: tpl.footerText,
          }}
          readOnly
        />
      </div>

      {/* Floating Badges */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20 pointer-events-none">
        <Badge className="bg-white/90 text-[#047857] font-bold text-[9px] px-1.5 py-0 shadow-2xs border border-slate-200">
          #{tpl.num}
        </Badge>
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(tpl.id);
            }}
            className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-slate-500 hover:text-rose-500 transition-colors shadow-2xs pointer-events-auto"
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
        )}
      </div>
    </div>
  );
}

export function TemplateLibrary({
  templates,
  activeTemplateId,
  selectedCategory,
  setSelectedCategory,
  onSelectTemplate,
  onPreviewTemplate,
  favorites = [],
  onToggleFavorite,
  isFullView = false,
}: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recommended" | "newest" | "most_used">("recommended");

  // Filter templates matching canonical Prisma category identifiers
  let filteredTemplates = templates.filter((tpl) => {
    let matchesCat = false;
    if (selectedCategory === "ALL") {
      matchesCat = true;
    } else if (selectedCategory === "FAVORITES") {
      matchesCat = favorites.includes(tpl.id);
    } else {
      matchesCat = tpl.category === selectedCategory;
    }

    const matchesQuery =
      !searchQuery ||
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCat && matchesQuery;
  });

  // Real sorting implementation
  filteredTemplates = [...filteredTemplates].sort((a, b) => {
    if (sortBy === "newest") {
      return b.num - a.num;
    }
    if (sortBy === "most_used") {
      return (b.tag === "POPULAR" ? 1 : 0) - (a.tag === "POPULAR" ? 1 : 0);
    }
    return a.num - b.num;
  });

  return (
    <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <span className="text-slate-900 dark:text-white">Choose Template</span>
          <Badge variant="secondary" className="text-[10px] font-mono bg-emerald-50 text-[#047857] border-emerald-200">
            {filteredTemplates.length} Templates
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Search & Sort controls */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search birthday, meeting, scheme..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 rounded-xl border-slate-200"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Sort:</span>
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="h-7 text-[11px] rounded-xl w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="most_used">Most Used</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.value
                  ? "bg-[#047857] text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Image-First Template Cards Grid */}
        <div
          className={
            isFullView
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[700px] overflow-y-auto pr-1"
              : "grid grid-cols-1 gap-3 max-h-[580px] overflow-y-auto pr-1"
          }
        >
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full text-center py-10 text-xs text-slate-400 space-y-1">
              <Filter className="w-6 h-6 mx-auto text-slate-300" />
              <p>No templates found matching your selection.</p>
            </div>
          ) : (
            filteredTemplates.map((tpl) => {
              const isSelected = activeTemplateId === tpl.id;
              const isFav = favorites.includes(tpl.id);

              return (
                <div
                  key={tpl.id}
                  className={`group relative rounded-2xl border overflow-hidden transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-[#047857] ring-2 ring-[#047857]/20 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-md"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  {/* Scaled Real Poster Canvas Box */}
                  <TemplatePosterThumbnail
                    tpl={tpl}
                    onClick={() => onSelectTemplate(tpl)}
                    isFav={isFav}
                    onToggleFavorite={onToggleFavorite}
                  />

                  {/* Template Meta Footer */}
                  <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        onClick={() => onSelectTemplate(tpl)}
                        className="font-bold text-xs text-slate-900 dark:text-white truncate cursor-pointer hover:text-[#047857]"
                      >
                        {tpl.name}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-semibold border-slate-200">
                        {tpl.category}
                      </Badge>
                      <span>{tpl.format.replace("_POST", "")}</span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      {onPreviewTemplate && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onPreviewTemplate(tpl)}
                          className="h-7 rounded-xl text-[10px] font-bold flex-1 border-slate-200 gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => onSelectTemplate(tpl)}
                        className="h-7 rounded-xl text-[10px] font-bold flex-1 bg-[#047857] hover:bg-[#064e3b] text-white gap-1"
                      >
                        Use <Sparkles className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

