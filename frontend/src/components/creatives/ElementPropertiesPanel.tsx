import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Move, RotateCw, Layers, ArrowUp, ArrowDown, Type, ImageIcon, Palette } from "lucide-react";
import { CanvasElement } from "@/types/creative";
import { TextToolbar } from "./TextToolbar";

interface ElementPropertiesPanelProps {
  selectedElement: CanvasElement | null;
  onUpdateElement: (updated: Partial<CanvasElement>) => void;
  onReorderElement?: (direction: "up" | "down" | "top" | "bottom") => void;
}

export function ElementPropertiesPanel({
  selectedElement,
  onUpdateElement,
  onReorderElement,
}: ElementPropertiesPanelProps) {
  if (!selectedElement) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border text-center text-xs text-slate-400">
        Select an element on the canvas to inspect and edit properties.
      </div>
    );
  }

  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
      <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between text-xs border-b pb-2 border-slate-200 dark:border-slate-800">
        <span className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-[#047857]" /> Element Properties
        </span>
        <span className="text-[10px] text-slate-400 font-mono">{selectedElement.name || selectedElement.id}</span>
      </div>

      {/* ── 1. TYPE SPECIFIC INSPECTORS ───────────────────────── */}
      {selectedElement.type === "text" && (
        <TextToolbar selectedElement={selectedElement} onUpdateElement={onUpdateElement} />
      )}

      {(selectedElement.type === "image" || selectedElement.type === "leader_photo" || selectedElement.type === "logo") && (
        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Image & Framing Settings
          </span>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500">Border Radius ({selectedElement.borderRadius || 0}px)</Label>
            <Slider
              value={[selectedElement.borderRadius || 0]}
              onValueChange={([val]) => onUpdateElement({ borderRadius: val })}
              min={0}
              max={100}
              step={2}
              className="pt-1"
            />
          </div>
        </div>
      )}

      {selectedElement.type === "shape" && (
        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-amber-600" /> Shape Fill & Corner
          </span>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500">Fill Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedElement.backgroundColor || "#047857"}
                onChange={(e) => onUpdateElement({ backgroundColor: e.target.value })}
                className="w-8 h-8 rounded-lg border cursor-pointer p-0.5"
              />
              <Input
                value={selectedElement.backgroundColor || "#047857"}
                onChange={(e) => onUpdateElement({ backgroundColor: e.target.value })}
                className="h-8 text-xs font-mono rounded-xl bg-white dark:bg-slate-950"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 2. GENERAL TRANSFORM & POSITION ─────────────────── */}
      <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
        <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Transform</span>

        {/* Position (X, Y) */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
              <Move className="w-3 h-3 text-blue-600" /> X Position (px)
            </Label>
            <Input
              type="number"
              value={Math.round(selectedElement.x)}
              onChange={(e) => onUpdateElement({ x: parseInt(e.target.value) || 0 })}
              className="rounded-xl h-8 text-xs font-mono bg-white dark:bg-slate-900"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
              <Move className="w-3 h-3 text-blue-600" /> Y Position (px)
            </Label>
            <Input
              type="number"
              value={Math.round(selectedElement.y)}
              onChange={(e) => onUpdateElement({ y: parseInt(e.target.value) || 0 })}
              className="rounded-xl h-8 text-xs font-mono bg-white dark:bg-slate-900"
            />
          </div>
        </div>

        {/* Size (Width, Height) */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500">Width (px)</Label>
            <Input
              type="number"
              value={Math.round(selectedElement.width || 100)}
              onChange={(e) => onUpdateElement({ width: parseInt(e.target.value) || 10 })}
              className="rounded-xl h-8 text-xs font-mono bg-white dark:bg-slate-900"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500">Height (px)</Label>
            <Input
              type="number"
              value={Math.round(selectedElement.height || 100)}
              onChange={(e) => onUpdateElement({ height: parseInt(e.target.value) || 10 })}
              className="rounded-xl h-8 text-xs font-mono bg-white dark:bg-slate-900"
            />
          </div>
        </div>

        {/* Rotation & Opacity */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
              <RotateCw className="w-3 h-3 text-emerald-600" /> Rotation ({selectedElement.rotation || 0}°)
            </Label>
            <Input
              type="number"
              value={selectedElement.rotation || 0}
              onChange={(e) => onUpdateElement({ rotation: parseInt(e.target.value) || 0 })}
              className="rounded-xl h-8 text-xs font-mono bg-white dark:bg-slate-900"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500">Opacity ({Math.round((selectedElement.opacity ?? 1) * 100)}%)</Label>
            <Slider
              value={[(selectedElement.opacity ?? 1) * 100]}
              onValueChange={([val]) => onUpdateElement({ opacity: val / 100 })}
              min={10}
              max={100}
              step={5}
              className="pt-2"
            />
          </div>
        </div>
      </div>

      {/* ── 3. LAYER ORDERING CONTROLS ───────────────────────── */}
      {onReorderElement && (
        <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-600" /> Layer Arrangement
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReorderElement("up")}
              className="rounded-xl h-8 text-[11px] font-bold border-slate-200 gap-1"
            >
              <ArrowUp className="w-3 h-3" /> Bring Forward
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReorderElement("down")}
              className="rounded-xl h-8 text-[11px] font-bold border-slate-200 gap-1"
            >
              <ArrowDown className="w-3 h-3" /> Send Backward
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
