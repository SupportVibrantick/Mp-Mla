import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Baseline,
} from "lucide-react";
import { CanvasElement } from "@/types/creative";

interface TextToolbarProps {
  selectedElement: CanvasElement;
  onUpdateElement: (updated: Partial<CanvasElement>) => void;
}

const FONTS = [
  { name: "Noto Sans Devanagari (Hindi)", value: "Noto Sans Devanagari, sans-serif" },
  { name: "Noto Serif Devanagari (Hindi)", value: "Noto Serif Devanagari, serif" },
  { name: "Inter (Modern Sans)", value: "Inter, sans-serif" },
  { name: "Roboto (Clean)", value: "Roboto, sans-serif" },
  { name: "Georgia (Classic Serif)", value: "Georgia, serif" },
  { name: "Great Vibes (Script)", value: "Great Vibes, cursive" },
];

export function TextToolbar({ selectedElement, onUpdateElement }: TextToolbarProps) {
  if (selectedElement.type !== "text") return null;

  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
      <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5"><Type className="w-4 h-4 text-emerald-600" /> Text Formatting</span>
        <span className="text-[10px] text-muted-foreground font-mono">ID: {selectedElement.id}</span>
      </div>

      {/* Font Family & Size */}
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-8 space-y-1">
          <label className="text-[10px] font-bold text-slate-500">Font Family</label>
          <Select
            value={selectedElement.fontFamily || FONTS[0].value}
            onValueChange={(val) => onUpdateElement({ fontFamily: val })}
          >
            <SelectTrigger className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONTS.map((font) => (
                <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                  {font.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-4 space-y-1">
          <label className="text-[10px] font-bold text-slate-500">Size (px)</label>
          <input
            type="number"
            value={selectedElement.fontSize || 24}
            onChange={(e) => onUpdateElement({ fontSize: parseInt(e.target.value) || 16 })}
            className="w-full h-8 px-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono"
          />
        </div>
      </div>

      {/* Weight, Style, Alignments */}
      <div className="flex flex-wrap items-center justify-between gap-1 bg-white dark:bg-slate-900 p-1.5 rounded-xl border">
        <div className="flex items-center gap-0.5">
          <Button
            size="icon"
            variant={selectedElement.fontWeight === "bold" ? "default" : "ghost"}
            onClick={() => onUpdateElement({ fontWeight: selectedElement.fontWeight === "bold" ? "normal" : "bold" })}
            className="h-7 w-7 rounded-lg text-xs"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="icon"
            variant={selectedElement.fontStyle === "italic" ? "default" : "ghost"}
            onClick={() => onUpdateElement({ fontStyle: selectedElement.fontStyle === "italic" ? "normal" : "italic" })}
            className="h-7 w-7 rounded-lg text-xs"
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="icon"
            variant={selectedElement.textDecoration === "underline" ? "default" : "ghost"}
            onClick={() => onUpdateElement({ textDecoration: selectedElement.textDecoration === "underline" ? "none" : "underline" })}
            className="h-7 w-7 rounded-lg text-xs"
            title="Underline"
          >
            <Underline className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

        <div className="flex items-center gap-0.5">
          <Button
            size="icon"
            variant={selectedElement.align === "left" ? "default" : "ghost"}
            onClick={() => onUpdateElement({ align: "left" })}
            className="h-7 w-7 rounded-lg text-xs"
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant={selectedElement.align === "center" ? "default" : "ghost"}
            onClick={() => onUpdateElement({ align: "center" })}
            className="h-7 w-7 rounded-lg text-xs"
            title="Align Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant={selectedElement.align === "right" ? "default" : "ghost"}
            onClick={() => onUpdateElement({ align: "right" })}
            className="h-7 w-7 rounded-lg text-xs"
            title="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Colors & Spacing */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
            <Baseline className="w-3 h-3 text-emerald-600" /> Text Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={selectedElement.color || "#0f172a"}
              onChange={(e) => onUpdateElement({ color: e.target.value })}
              className="w-8 h-8 rounded-lg border cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={selectedElement.color || "#0f172a"}
              onChange={(e) => onUpdateElement({ color: e.target.value })}
              className="flex-1 h-8 px-2 rounded-xl text-[11px] font-mono border bg-white dark:bg-slate-900"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500">Transform</label>
          <Select
            value={selectedElement.textTransform || "none"}
            onValueChange={(val: any) => onUpdateElement({ textTransform: val })}
          >
            <SelectTrigger className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Normal</SelectItem>
              <SelectItem value="uppercase">UPPERCASE</SelectItem>
              <SelectItem value="capitalize">Capitalize</SelectItem>
              <SelectItem value="lowercase">lowercase</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
