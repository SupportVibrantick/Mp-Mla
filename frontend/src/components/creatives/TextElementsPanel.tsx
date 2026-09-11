import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Type,
  Heading1,
  Heading2,
  FileText,
  Quote,
  User,
  Award,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Globe,
  Square,
  Circle,
  Minus,
  Flag,
  Sparkles,
  QrCode,
  Share2,
} from "lucide-react";
import { CanvasElement } from "@/types/creative";

interface TextElementsPanelProps {
  onAddElement: (element: Partial<CanvasElement>) => void;
}

export function TextElementsPanel({ onAddElement }: TextElementsPanelProps) {
  return (
    <div className="space-y-4 text-xs">
      {/* TEXT PRESETS */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5"><Type className="w-4 h-4 text-emerald-600" /> Add Text Presets</span>
          <Badge variant="outline" className="text-[9px]">Click to Insert</Badge>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAddElement({
                type: "text",
                name: "Main Heading",
                text: "Heading Title",
                fontSize: 54,
                fontWeight: "bold",
                color: "#1e3a8a",
                fontFamily: "Noto Sans Devanagari, sans-serif",
                x: 80,
                y: 180,
                width: 500,
                height: 80,
              })
            }
            className="h-9 justify-start font-bold text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200"
          >
            <Heading1 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> + Add Heading
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAddElement({
                type: "text",
                name: "Subheading",
                text: "Subheading Tagline",
                fontSize: 32,
                fontWeight: "bold",
                color: "#047857",
                fontFamily: "Noto Sans Devanagari, sans-serif",
                x: 80,
                y: 260,
                width: 500,
                height: 60,
              })
            }
            className="h-9 justify-start font-semibold text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200"
          >
            <Heading2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> + Add Subheading
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAddElement({
                type: "text",
                name: "Body Text",
                text: "Wishing you good health, prosperity and continuous success in public service.",
                fontSize: 22,
                color: "#334155",
                fontFamily: "Noto Sans Devanagari, sans-serif",
                x: 80,
                y: 340,
                width: 520,
                height: 120,
              })
            }
            className="h-9 justify-start text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-600" /> + Add Body Text
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAddElement({
                type: "text",
                name: "Public Quote",
                text: '"जनसेवा ही संकल्प • विकास ही लक्ष्य"',
                fontSize: 26,
                fontWeight: "bold",
                color: "#ea580c",
                fontFamily: "Noto Sans Devanagari, sans-serif",
                x: 80,
                y: 480,
                width: 500,
                height: 60,
              })
            }
            className="h-9 justify-start text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200"
          >
            <Quote className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> + Add Quote
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAddElement({
                type: "text",
                name: "Leader Name",
                text: "Shri Representative Name",
                fontSize: 34,
                fontWeight: "bold",
                color: "#ffffff",
                fontFamily: "Noto Sans Devanagari, sans-serif",
                x: 130,
                y: 910,
                width: 600,
                height: 50,
              })
            }
            className="h-9 justify-start text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200"
          >
            <User className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> + Add Name
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAddElement({
                type: "text",
                name: "Designation",
                text: "Member of Parliament / Legislative Assembly",
                fontSize: 20,
                color: "#a7f3d0",
                fontFamily: "Noto Sans Devanagari, sans-serif",
                x: 130,
                y: 960,
                width: 600,
                height: 40,
              })
            }
            className="h-9 justify-start text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200"
          >
            <Award className="w-3.5 h-3.5 mr-1.5 text-purple-600" /> + Add Designation
          </Button>
        </div>
      </div>

      {/* EVENT & VENUE META DETAILS */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-blue-600" /> Event & Venue Meta</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAddElement({
                type: "text",
                name: "Event Date",
                text: "📅 15 September 2026",
                fontSize: 22,
                fontWeight: "bold",
                color: "#0f172a",
                x: 80,
                y: 440,
                width: 300,
                height: 40,
              })
            }
            className="h-8 justify-start text-xs rounded-xl bg-white dark:bg-slate-900"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> + Add Date
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAddElement({
                type: "text",
                name: "Event Time",
                text: "⏰ 10:30 AM Onwards",
                fontSize: 22,
                fontWeight: "bold",
                color: "#0f172a",
                x: 390,
                y: 440,
                width: 300,
                height: 40,
              })
            }
            className="h-8 justify-start text-xs rounded-xl bg-white dark:bg-slate-900"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> + Add Time
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAddElement({
                type: "text",
                name: "Event Location",
                text: "📍 Community Hall, Central Constituency",
                fontSize: 22,
                color: "#334155",
                x: 80,
                y: 490,
                width: 500,
                height: 50,
              })
            }
            className="h-8 justify-start text-xs rounded-xl bg-white dark:bg-slate-900"
          >
            <MapPin className="w-3.5 h-3.5 mr-1.5 text-rose-600" /> + Add Location
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAddElement({
                type: "text",
                name: "Contact Phone",
                text: "📞 Helpline: +91 98765 43210",
                fontSize: 20,
                color: "#334155",
                x: 80,
                y: 550,
                width: 400,
                height: 40,
              })
            }
            className="h-8 justify-start text-xs rounded-xl bg-white dark:bg-slate-900"
          >
            <Phone className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> + Add Contact
          </Button>
        </div>
      </div>

      {/* SHAPES, BADGES & TRICOLOR DECORATIONS */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-500" /> Shapes & Tricolor Accents</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAddElement({
                type: "shape",
                shapeType: "rectangle",
                name: "Card Background Box",
                backgroundColor: "#ffffff",
                x: 80,
                y: 400,
                width: 520,
                height: 180,
                borderRadius: 20,
              })
            }
            className="h-8 justify-start text-xs rounded-xl bg-white dark:bg-slate-900"
          >
            <Square className="w-3.5 h-3.5 mr-1.5 text-slate-600" /> Rectangle Box
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAddElement({
                type: "shape",
                shapeType: "tricolor_strip",
                name: "Tricolor Header Ribbon",
                x: 0,
                y: 0,
                width: 1080,
                height: 48,
              })
            }
            className="h-8 justify-start text-xs rounded-xl bg-white dark:bg-slate-900"
          >
            <Flag className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> Tricolor Ribbon
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAddElement({
                type: "shape",
                shapeType: "divider",
                name: "Accent Divider Line",
                backgroundColor: "#047857",
                x: 80,
                y: 320,
                width: 500,
                height: 4,
              })
            }
            className="h-8 justify-start text-xs rounded-xl bg-white dark:bg-slate-900"
          >
            <Minus className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Divider Line
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAddElement({
                type: "text",
                name: "Slogan Pill Badge",
                text: "आपका साथ • हमारी शक्ति",
                fontSize: 22,
                fontWeight: "bold",
                color: "#047857",
                x: 80,
                y: 80,
                width: 360,
                height: 46,
              })
            }
            className="h-8 justify-start text-xs rounded-xl bg-white dark:bg-slate-900"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Slogan Badge
          </Button>
        </div>
      </div>
    </div>
  );
}
