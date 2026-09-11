import { Label } from "@/components/ui/label";
import { Palette } from "lucide-react";

interface BackgroundPanelProps {
  canvasBackground: string;
  setCanvasBackground: (bg: string) => void;
}

export const BACKGROUND_CATEGORIES = [
  {
    title: "Official & Patriotic",
    presets: [
      { id: "tricolor-glow", name: "Saffron Tricolor Glow", value: "linear-gradient(135deg, #fffdfa 0%, #fef3c7 40%, #fde68a 100%)" },
      { id: "emerald-govt", name: "Government Emerald", value: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #a7f3d0 100%)" },
      { id: "saffron-festive", name: "Deep Saffron Warmth", value: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)" },
    ],
  },
  {
    title: "Professional & Corporate",
    presets: [
      { id: "royal-blue", name: "Royal Blue Gradient", value: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)" },
      { id: "slate-minimal", name: "Clean Studio Slate", value: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)" },
      { id: "teal-growth", name: "Teal Growth Gradient", value: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #99f6e4 100%)" },
    ],
  },
  {
    title: "Festive & Night Premium",
    presets: [
      { id: "festive-gold", name: "Golden Festive Light", value: "linear-gradient(135deg, #fffdf5 0%, #fef9c3 50%, #fef08a 100%)" },
      { id: "dark-royal", name: "Royal Midnight Dark", value: "linear-gradient(180deg, #1e1b4b 0%, #311042 50%, #4c0519 100%)" },
      { id: "amber-glow", name: "Sunset Amber Glow", value: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" },
    ],
  },
];

export function BackgroundPanel({
  canvasBackground,
  setCanvasBackground,
}: BackgroundPanelProps) {
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs border-b pb-2 border-slate-200 dark:border-slate-800">
        <Palette className="w-4 h-4 text-indigo-600" /> Curated Background Asset Presets
      </div>

      {BACKGROUND_CATEGORIES.map((cat) => (
        <div key={cat.title} className="space-y-1.5">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{cat.title}</Label>
          <div className="grid grid-cols-2 gap-2">
            {cat.presets.map((bg) => (
              <button
                key={bg.id}
                onClick={() => setCanvasBackground(bg.value)}
                style={{ background: bg.value }}
                className={`p-2.5 rounded-xl text-[10px] font-bold text-slate-800 border text-center transition-all shadow-sm ${
                  canvasBackground === bg.value
                    ? "ring-2 ring-indigo-600 border-transparent shadow-md scale-[1.02]"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {bg.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
