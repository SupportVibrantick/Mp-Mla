import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  Save,
  Undo2,
  Redo2,
  Eye,
  Share2,
  Download,
  Loader2,
  Check,
} from "lucide-react";

interface CreativeToolbarProps {
  designTitle: string;
  setDesignTitle: (title: string) => void;
  autosaveStatus: "saved" | "saving" | "idle";
  lastSavedText: string;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSaveDraft: () => void;
  onPreview: () => void;
  onShare: () => void;
  onDownload: () => void;
  isSaving: boolean;
}

export function CreativeToolbar({
  designTitle,
  setDesignTitle,
  autosaveStatus,
  lastSavedText,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSaveDraft,
  onPreview,
  onShare,
  onDownload,
  isSaving,
}: CreativeToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Title & Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold shrink-0">
          <Palette className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <input
              value={designTitle}
              onChange={(e) => setDesignTitle(e.target.value)}
              className="text-lg font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-600 focus:outline-none px-1 rounded transition-colors"
            />
            <Badge
              variant="outline"
              className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border-emerald-300"
            >
              {autosaveStatus === "saving" || isSaving ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" /> {lastSavedText || "Saved"}
                </span>
              )}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Create professional posters, banners, and social media creatives for your constituency.
          </p>
        </div>
      </div>

      {/* Top Header Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Button
            size="icon"
            variant="ghost"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="h-8 w-8 rounded-xl text-slate-700 dark:text-slate-200"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="h-8 w-8 rounded-xl text-slate-700 dark:text-slate-200"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Action Buttons */}
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveDraft}
          disabled={isSaving}
          className="rounded-xl gap-1.5 text-xs font-bold"
        >
          <Save className="w-3.5 h-3.5" /> Save Draft
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="rounded-xl gap-1.5 text-xs font-bold"
        >
          <Eye className="w-3.5 h-3.5" /> Preview
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onShare}
          className="rounded-xl gap-1.5 text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
        >
          <Share2 className="w-3.5 h-3.5" /> Share
        </Button>
        <Button
          size="sm"
          onClick={onDownload}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold shadow-md"
        >
          <Download className="w-3.5 h-3.5" /> Download
        </Button>
      </div>
    </div>
  );
}
