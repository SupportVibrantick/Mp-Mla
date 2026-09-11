import { Badge } from "@/components/ui/badge";
import { LayoutGrid, Smartphone, FileText, Monitor } from "lucide-react";

export interface FormatPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  icon: any;
  isPrint?: boolean;
}

export const FORMAT_PRESETS: FormatPreset[] = [
  { id: "SQUARE_POST", label: "Social Square", width: 1080, height: 1080, icon: LayoutGrid },
  { id: "PORTRAIT_POST", label: "Instagram Portrait", width: 1080, height: 1350, icon: Smartphone },
  { id: "STORY_STATUS", label: "WhatsApp Status", width: 1080, height: 1920, icon: Smartphone },
  { id: "LANDSCAPE_POST", label: "Facebook Banner", width: 1200, height: 630, icon: Monitor },
  { id: "PRINT_A4", label: "Print A4 Poster", width: 2480, height: 3508, icon: FileText, isPrint: true },
  { id: "PRINT_A3", label: "Print A3 Poster", width: 3508, height: 4961, icon: FileText, isPrint: true },
];

interface FormatSwitcherProps {
  selectedFormat: string;
  onSelectFormat: (formatId: string) => void;
  showSafeArea: boolean;
  setShowSafeArea: (show: boolean) => void;
}

export function FormatSwitcher({
  selectedFormat,
  onSelectFormat,
  showSafeArea,
  setShowSafeArea,
}: FormatSwitcherProps) {
  const currentFormat = FORMAT_PRESETS.find((f) => f.id === selectedFormat) || FORMAT_PRESETS[0];

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {FORMAT_PRESETS.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => onSelectFormat(fmt.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                selectedFormat === fmt.id
                  ? "bg-indigo-600 text-white shadow-md scale-[1.02]"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              <fmt.icon className="w-3 h-3" />
              {fmt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-mono bg-white dark:bg-slate-900">
            {currentFormat.width} × {currentFormat.height} px {currentFormat.isPrint ? "(300 DPI)" : ""}
          </Badge>

          {currentFormat.isPrint && (
            <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showSafeArea}
                onChange={(e) => setShowSafeArea(e.target.checked)}
                className="rounded text-indigo-600"
              />
              Show Safe Area / Bleed
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
