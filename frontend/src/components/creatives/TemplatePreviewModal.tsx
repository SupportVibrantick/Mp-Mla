import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreativeTemplateDef } from "@/types/creative";
import { LayoutGrid, Sparkles, Heart, Smartphone, FileText, Image as ImageIcon } from "lucide-react";

interface TemplatePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: CreativeTemplateDef | null;
  onUseTemplate: (template: CreativeTemplateDef) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (templateId: string) => void;
}

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  open,
  onOpenChange,
  template,
  onUseTemplate,
  isFavorite = false,
  onToggleFavorite,
}) => {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-[#047857]" /> Template Visual Preview
            </DialogTitle>
            <Badge className="bg-emerald-50 text-[#047857] border-emerald-200 font-bold text-xs">
              Template #{template.num}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Real design canvas preview matching actual exported dimensions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-2 items-center">
          {/* Visual Canvas Display Box */}
          <div
            style={{
              background: template.bgGradient,
              aspectRatio: `${template.width}/${template.height}`,
            }}
            className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between items-center shadow-md relative overflow-hidden text-center"
          >
            <div className="w-full flex items-center justify-between z-10">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 text-[#047857]">
                {template.category}
              </span>
              <span className="text-[10px] font-bold text-slate-700 bg-white/80 px-2 py-0.5 rounded-md">
                {template.tag}
              </span>
            </div>

            <div className="space-y-2 py-4 z-10 my-auto">
              <h3 style={{ color: template.primaryColor }} className="text-xl md:text-2xl font-black line-clamp-2">
                {template.headingText}
              </h3>
              <p className="text-xs text-slate-700 font-medium line-clamp-3 max-w-[220px] mx-auto">
                {template.messageText}
              </p>
            </div>

            <div className="w-full bg-[#064e3b] text-white p-2 rounded-xl text-center text-[10px] font-bold z-10">
              {template.footerText}
            </div>
          </div>

          {/* Template Details & Action Buttons */}
          <div className="space-y-4 text-xs">
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">{template.name}</h4>
              <p className="text-xs text-slate-500 mt-1">{template.description}</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Category:</span>
                <span className="font-bold text-slate-900 dark:text-white">{template.category}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Resolution:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {template.width} × {template.height} px
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Format:</span>
                <span className="font-bold text-slate-900 dark:text-white">{template.format}</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <Button
                onClick={() => {
                  onUseTemplate(template);
                  onOpenChange(false);
                }}
                className="w-full rounded-2xl bg-[#047857] hover:bg-[#064e3b] text-white font-bold h-10 text-xs shadow-md"
              >
                <Sparkles className="w-4 h-4 mr-2" /> Use This Template in Editor
              </Button>

              {onToggleFavorite && (
                <Button
                  variant="outline"
                  onClick={() => onToggleFavorite(template.id)}
                  className="w-full rounded-2xl border-slate-200 text-xs font-bold"
                >
                  <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "fill-rose-500 text-rose-500" : "text-slate-500"}`} />
                  {isFavorite ? "Saved in Favorites" : "Add to Favorites"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
