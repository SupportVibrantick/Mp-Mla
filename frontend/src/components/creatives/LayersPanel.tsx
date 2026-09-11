import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Plus,
} from "lucide-react";
import { CanvasElement } from "@/types/creative";

interface LayersPanelProps {
  layers: CanvasElement[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, updated: Partial<CanvasElement>) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onMoveLayer: (index: number, direction: "up" | "down") => void;
  onAddTextLayer: () => void;
}

export function LayersPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onMoveLayer,
  onAddTextLayer,
}: LayersPanelProps) {
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
        <span className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-indigo-600" /> Layers Tree ({layers.length})</span>
        <Button size="sm" variant="ghost" onClick={onAddTextLayer} className="h-7 text-indigo-600 text-xs font-bold gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Layer
        </Button>
      </div>

      <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
        {layers.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">No elements on canvas.</div>
        ) : (
          layers.map((layer, index) => {
            const isSelected = selectedLayerId === layer.id;
            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                {/* Element Info */}
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                    #{layers.length - index}
                  </Badge>
                  <span className="font-bold truncate text-slate-800 dark:text-slate-200 text-[11px]">
                    {layer.name || layer.id}
                  </span>
                </div>

                {/* Layer Actions */}
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-slate-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveLayer(index, "up");
                    }}
                    disabled={index === 0}
                    title="Bring Forward"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-slate-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveLayer(index, "down");
                    }}
                    disabled={index === layers.length - 1}
                    title="Send Backward"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-indigo-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateLayer(layer.id, { locked: !layer.locked });
                    }}
                    title={layer.locked ? "Unlock" : "Lock"}
                  >
                    {layer.locked ? <Lock className="w-3 h-3 text-amber-600" /> : <Unlock className="w-3 h-3" />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-indigo-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateLayer(layer.id);
                    }}
                    title="Duplicate"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-rose-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLayer(layer.id);
                    }}
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
