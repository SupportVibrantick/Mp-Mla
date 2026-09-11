import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Image as ImageIcon, Printer } from "lucide-react";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headingText: string;
  selectedFormat: string;
  onExport: (format: "png" | "jpeg" | "pdf", dpi: number) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  onOpenChange,
  headingText,
  selectedFormat,
  onExport,
}) => {
  const [fileFormat, setFileFormat] = useState<"png" | "jpeg" | "pdf">("png");
  const [dpiQuality, setDpiQuality] = useState<number>(150);
  const [includeBleed, setIncludeBleed] = useState<boolean>(false);

  const getEstimatedSize = () => {
    if (fileFormat === "png") return dpiQuality === 300 ? "~4.2 MB" : "~1.8 MB";
    if (fileFormat === "jpeg") return dpiQuality === 300 ? "~2.1 MB" : "~850 KB";
    return "~3.5 MB";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-[#047857]" /> High-Res Export Engine
            </DialogTitle>
            <Badge className="bg-emerald-50 text-[#047857] border-emerald-200 text-[10px] font-bold">
              Multi-DPI
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Export poster creative for social media sharing or high-DPI print production.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2 text-xs">
          {/* Format Picker */}
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700 dark:text-slate-300">Export File Format</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFileFormat("png")}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  fileFormat === "png"
                    ? "border-[#047857] bg-emerald-50/50 text-[#047857] font-bold shadow-sm"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                }`}
              >
                <ImageIcon className="w-5 h-5" />
                <span>PNG (Lossless)</span>
              </button>
              <button
                onClick={() => setFileFormat("jpeg")}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  fileFormat === "jpeg"
                    ? "border-[#047857] bg-emerald-50/50 text-[#047857] font-bold shadow-sm"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                }`}
              >
                <ImageIcon className="w-5 h-5" />
                <span>JPEG (Compressed)</span>
              </button>
              <button
                onClick={() => setFileFormat("pdf")}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  fileFormat === "pdf"
                    ? "border-[#047857] bg-emerald-50/50 text-[#047857] font-bold shadow-sm"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                }`}
              >
                <FileText className="w-5 h-5" />
                <span>PDF (Document)</span>
              </button>
            </div>
          </div>

          {/* Quality DPI Picker */}
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700 dark:text-slate-300">DPI Resolution Quality</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setDpiQuality(72)}
                className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                  dpiQuality === 72 ? "border-[#047857] bg-emerald-50 text-[#047857] font-bold" : "border-slate-200 dark:border-slate-800 text-slate-600"
                }`}
              >
                72 DPI (Web)
              </button>
              <button
                onClick={() => setDpiQuality(150)}
                className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                  dpiQuality === 150 ? "border-[#047857] bg-emerald-50 text-[#047857] font-bold" : "border-slate-200 dark:border-slate-800 text-slate-600"
                }`}
              >
                150 DPI (HD)
              </button>
              <button
                onClick={() => setDpiQuality(300)}
                className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                  dpiQuality === 300 ? "border-[#047857] bg-emerald-50 text-[#047857] font-bold" : "border-slate-200 dark:border-slate-800 text-slate-600"
                }`}
              >
                300 DPI (Print)
              </button>
            </div>
          </div>

          {/* Print Bleed Option */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-[#047857]" /> Print Safe Area & Bleed Marks
              </span>
              <p className="text-[10px] text-slate-500">Include 3mm print trim boundary guides</p>
            </div>
            <input
              type="checkbox"
              checked={includeBleed}
              onChange={(e) => setIncludeBleed(e.target.checked)}
              className="w-4 h-4 text-[#047857] rounded border-slate-300 focus:ring-[#047857]"
            />
          </div>

          {/* File summary */}
          <div className="flex items-center justify-between text-slate-500 text-[11px] px-1">
            <span>Estimated File Size:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{getEstimatedSize()}</span>
          </div>

          <Button
            onClick={() => {
              onExport(fileFormat, dpiQuality);
              onOpenChange(false);
            }}
            className="w-full rounded-2xl bg-[#047857] hover:bg-[#064e3b] text-white font-bold h-11 text-xs shadow-md mt-2"
          >
            <Download className="w-4 h-4 mr-2" /> Generate High-Res Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
