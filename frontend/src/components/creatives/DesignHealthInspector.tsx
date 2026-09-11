import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { CanvasElement, DesignHealthIssue } from "@/types/creative";

interface DesignHealthInspectorProps {
  elements: CanvasElement[];
  canvasWidth: number;
  canvasHeight: number;
  onAutoFix: () => void;
}

export function DesignHealthInspector({
  elements,
  canvasWidth,
  canvasHeight,
  onAutoFix,
}: DesignHealthInspectorProps) {
  // Analyze elements for issues
  const issues: DesignHealthIssue[] = [];

  elements.forEach((el) => {
    // 1. Unsafe margin check (ignoring full-bleed backgrounds, headers, and footers)
    const isFullBleed =
      el.type === "shape" ||
      el.type === "footer" ||
      el.type === "background" ||
      el.name?.toLowerCase().includes("header") ||
      el.name?.toLowerCase().includes("background") ||
      el.name?.toLowerCase().includes("banner") ||
      el.width >= canvasWidth - 10;

    if (!isFullBleed && (el.x < 10 || el.y < 10 || el.x + el.width > canvasWidth - 10 || el.y + el.height > canvasHeight - 10)) {
      issues.push({
        id: `margin-${el.id}`,
        type: "margin_unsafe",
        message: `"${el.name || el.type}" extends outside 10px safe margins`,
        severity: "warning",
        elementId: el.id,
        autoFixable: true,
      });
    }

    // 2. Image missing check
    if ((el.type === "image" || el.type === "leader_photo" || el.type === "logo") && !el.url && !el.dynamicToken) {
      issues.push({
        id: `img-${el.id}`,
        type: "image_missing",
        message: `"${el.name}" frame is empty`,
        severity: "warning",
        elementId: el.id,
        autoFixable: false,
      });
    }
  });

  if (issues.length === 0) {
    return (
      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#047857]" />
          <span className="font-bold text-[#047857] dark:text-emerald-300">Design Health: Ready for Export</span>
        </div>
        <Badge className="bg-emerald-600 text-white font-mono text-[9px]">✓ Verified</Badge>
      </div>
    );
  }

  return (
    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="font-bold text-amber-900 dark:text-amber-300">
            Design Health: {issues.length} {issues.length === 1 ? "Issue" : "Issues"} Found
          </span>
        </div>
        <Button
          size="sm"
          onClick={onAutoFix}
          className="h-7 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl gap-1 shadow-xs"
        >
          <Sparkles className="w-3 h-3" /> Auto Fix Issues
        </Button>
      </div>

      <div className="space-y-1 pt-1">
        {issues.map((iss) => (
          <p key={iss.id} className="text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            {iss.message}
          </p>
        ))}
      </div>
    </div>
  );
}
