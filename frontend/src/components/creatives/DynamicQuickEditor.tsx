import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getImageUrl } from "@/lib/utils";
import { QuickEditField, CreativeTemplateDef } from "@/types/creative";
import {
  Upload,
  UserCheck,
  Building2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Palette,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  FileText,
  ImageIcon,
} from "lucide-react";

interface DynamicQuickEditorProps {
  activeTemplate: CreativeTemplateDef;
  schema?: QuickEditField[];
  slotValues: Record<string, string>;
  onSetSlotValue: (key: string, val: string) => void;
  branding: {
    useOfficial: boolean;
    representativeName: string;
    designation: string;
    leaderPhotoUrl: string;
    partyLogoUrl: string;
    footerText: string;
  };
  onUpdateBranding: (fields: Partial<DynamicQuickEditorProps["branding"]>) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, target: "leader" | "logo") => void;
  onOpenAdvancedEdit?: () => void;
  activeBg?: string;
  onSetActiveBg?: (val: string) => void;
  activeThemeColor?: string;
  onSetActiveThemeColor?: (val: string) => void;
}

export function DynamicQuickEditor({
  activeTemplate,
  schema = [],
  slotValues,
  onSetSlotValue,
  branding,
  onUpdateBranding,
  onFileUpload,
  onOpenAdvancedEdit,
  activeBg,
  onSetActiveBg,
  activeThemeColor,
  onSetActiveThemeColor,
}: DynamicQuickEditorProps) {
  const [showBrandDetails, setShowBrandDetails] = React.useState(false);
  const [showStyleOptions, setShowStyleOptions] = React.useState(false);

  // Default schema fallback if template doesn't specify one
  const activeSchema: QuickEditField[] =
    schema && schema.length > 0
      ? schema
      : [
          { key: "headingText", label: "Main Heading", type: "text", required: true },
          { key: "subheadingText", label: "Sub Heading", type: "text" },
          { key: "messageText", label: "Description / Message", type: "textarea" },
          { key: "sloganText", label: "Top Tagline / Slogan", type: "text" },
        ];

  return (
    <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardContent className="p-4 space-y-4 text-xs">
        {/* Editor Header */}
        <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 dark:text-white text-base">Quick Edit</h2>
              <Badge className="bg-emerald-50 text-[#047857] border-emerald-200 text-[10px] font-bold">
                ✓ Template Driven
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Editing: <span className="font-bold text-[#047857]">{activeTemplate.name}</span>
            </p>
          </div>

          {onOpenAdvancedEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAdvancedEdit}
              className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:text-indigo-600"
            >
              <Sliders className="w-3.5 h-3.5 mr-1 text-[#047857]" /> Advanced
            </Button>
          )}
        </div>

        {/* ── 1. COLLAPSED OFFICIAL BRANDING CARD ────────────────── */}
        <div className="p-3 bg-emerald-50/40 dark:bg-slate-800/40 rounded-2xl border border-emerald-200/60 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#047857]" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-xs">Official Branding Applied</span>
                <p className="text-[10px] text-slate-500">
                  {branding.representativeName || "Shri Representative"} • {branding.designation || "MLA"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBrandDetails(!showBrandDetails)}
              className="text-[11px] font-bold text-[#047857] hover:underline flex items-center gap-0.5"
            >
              {showBrandDetails ? "Hide" : "Customize"} {showBrandDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showBrandDetails && (
            <div className="pt-2 space-y-3 border-t border-emerald-100 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-600">Leader Photo</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-12 bg-slate-100 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center">
                      {branding.leaderPhotoUrl ? (
                        <img src={getImageUrl(branding.leaderPhotoUrl)} alt="Leader" className="w-full h-full object-cover" />
                      ) : (
                        <UserCheck className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <label className="px-2 py-1 bg-white border rounded-lg text-[10px] font-bold cursor-pointer hover:bg-slate-50">
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, "leader")} />
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-600">Party Logo</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center p-1">
                      {branding.partyLogoUrl ? (
                        <img src={getImageUrl(branding.partyLogoUrl)} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <label className="px-2 py-1 bg-white border rounded-lg text-[10px] font-bold cursor-pointer hover:bg-slate-50">
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, "logo")} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Input
                  placeholder="Representative Name"
                  value={branding.representativeName}
                  onChange={(e) => onUpdateBranding({ representativeName: e.target.value })}
                  className="h-8 text-xs font-bold rounded-xl bg-white"
                />
                <Input
                  placeholder="Title & Constituency"
                  value={branding.designation}
                  onChange={(e) => onUpdateBranding({ designation: e.target.value })}
                  className="h-8 text-xs rounded-xl bg-white"
                />
                <Input
                  placeholder="Footer Banner Slogan"
                  value={branding.footerText}
                  onChange={(e) => onUpdateBranding({ footerText: e.target.value })}
                  className="h-8 text-xs rounded-xl bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── 2. DYNAMICALLY RENDERED SCHEMA FIELDS ─────────────── */}
        <div className="space-y-3">
          {activeSchema.map((field) => {
            const val = slotValues[field.key] ?? field.defaultValue ?? "";

            return (
              <div key={field.key} className="space-y-1">
                <Label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>{field.label}</span>
                  {field.required && <span className="text-rose-500 font-normal text-[10px]">*Required</span>}
                </Label>

                {field.type === "textarea" ? (
                  <Textarea
                    value={val}
                    onChange={(e) => onSetSlotValue(field.key, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                    className="rounded-xl text-xs min-h-[70px] border-slate-200"
                  />
                ) : field.type === "select" && field.options ? (
                  <Select value={val} onValueChange={(selected) => onSetSlotValue(field.key, selected)}>
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-white border-slate-200">
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={val}
                    onChange={(e) => onSetSlotValue(field.key, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                    className="rounded-xl h-9 text-xs border-slate-200"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── 3. OPTIONAL STYLE SECTION ────────────────────────── */}
        {(onSetActiveBg || onSetActiveThemeColor) && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setShowStyleOptions(!showStyleOptions)}
              className="w-full py-2 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#047857]"
            >
              <span className="flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-[#047857]" /> Theme & Background Style
              </span>
              {showStyleOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
