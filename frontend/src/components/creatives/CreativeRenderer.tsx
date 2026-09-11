import React from "react";
import { CanvasElement, CreativeFormat } from "@/types/creative";
import { getImageUrl } from "@/lib/utils";
import { useSystemSettings } from "@/contexts/SettingsContext";
import { UserCheck, Image as ImageIcon } from "lucide-react";

interface CreativeRendererProps {
  width: number;
  height: number;
  background: string;
  elements: CanvasElement[];
  slotValues?: Record<string, string>;
  branding?: {
    representativeName?: string;
    designation?: string;
    leaderPhotoUrl?: string;
    partyLogoUrl?: string;
    footerText?: string;
  };
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onMouseDownElement?: (e: React.MouseEvent, elem: CanvasElement, handle?: string) => void;
  showSafeArea?: boolean;
  readOnly?: boolean;
}

export function CreativeRenderer({
  width,
  height,
  background,
  elements,
  slotValues = {},
  branding,
  selectedElementId = null,
  onSelectElement,
  onMouseDownElement,
  showSafeArea = false,
  readOnly = false,
}: CreativeRendererProps) {
  const { settings } = useSystemSettings();

  // Helper to resolve text bindings & tokens
  const getRenderText = (elem: CanvasElement): string => {
    if (elem.binding && slotValues[elem.binding] !== undefined) {
      return slotValues[elem.binding];
    }
    if (elem.dynamicToken) {
      const cleanToken = elem.dynamicToken.replace(/[{}]/g, "");
      if (slotValues[cleanToken] !== undefined && slotValues[cleanToken] !== "") {
        return slotValues[cleanToken];
      }
    }
    let val = elem.text || "";
    if (elem.dynamicToken || val.includes("{{")) {
      const repName = branding?.representativeName || settings?.representative_name || "Shri Rajesh Kumar";
      const repTitle = branding?.designation || `${settings?.representative_title || "MLA"}, ${settings?.org_name || "Green Valley Constituency"}`;
      const partyName = settings?.party_name || "BJP";

      Object.entries(slotValues).forEach(([k, v]) => {
        if (v !== undefined) {
          val = val.replace(new RegExp(`{{${k}}}`, "g"), v);
        }
      });

      val = val
        .replace(/{{representativeName}}/g, repName)
        .replace(/{{designation}}/g, repTitle)
        .replace(/{{partyName}}/g, partyName)
        .replace(/{{constituencyName}}/g, settings?.constituency_name || "Green Valley Constituency");
    }
    return val;
  };

  // Helper to resolve image bindings & tokens
  const getRenderImage = (elem: CanvasElement): string => {
    if (elem.binding && slotValues[elem.binding]) {
      return slotValues[elem.binding];
    }
    if (elem.dynamicToken === "{{leaderPhoto}}" || elem.url === "{{leaderPhoto}}") {
      return branding?.leaderPhotoUrl || settings?.representative_photo || "";
    }
    if (elem.dynamicToken === "{{partyLogo}}" || elem.url === "{{partyLogo}}") {
      return branding?.partyLogoUrl || settings?.party_logo_url || settings?.brand_logo_url || "";
    }
    return elem.url || "";
  };

  return (
    <div
      style={{
        aspectRatio: `${width}/${height}`,
        position: "relative",
        width: "100%",
        height: "100%",
        background,
        overflow: "hidden",
      }}
      className="select-none overflow-hidden"
    >
      {/* Safe Printing Boundary */}
      {showSafeArea && (
        <div className="absolute inset-8 border-2 border-dashed border-rose-500/50 pointer-events-none z-50 flex items-start justify-end p-2">
          <span className="text-[10px] font-bold text-rose-600 bg-white/90 px-1.5 py-0.5 rounded border border-rose-200">
            Safe Trim Boundary (300 DPI)
          </span>
        </div>
      )}

      {/* Render Canvas Elements in Canonical Z-Order */}
      {elements
        .filter((el) => el.visible !== false)
        .map((elem) => {
          const isSelected = elem.id === selectedElementId && !readOnly;
          const textVal = getRenderText(elem);
          const imageVal = getRenderImage(elem);

          const leftPct = (elem.x / width) * 100;
          const topPct = (elem.y / height) * 100;
          const widthPct = (elem.width / width) * 100;
          const heightPct = (elem.height / height) * 100;

          return (
            <div
              key={elem.id}
              onMouseDown={(e) => onMouseDownElement && onMouseDownElement(e, elem, "move")}
              onClick={(e) => {
                if (!readOnly && onSelectElement) {
                  e.stopPropagation();
                  onSelectElement(elem.id);
                }
              }}
              style={{
                position: "absolute",
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                transform: `rotate(${elem.rotation || 0}deg)`,
                opacity: elem.opacity ?? 1,
                cursor: readOnly ? "default" : elem.locked ? "not-allowed" : "move",
                zIndex: elem.zIndex || 1,
              }}
              className={`group transition-shadow ${
                isSelected ? "ring-2 ring-indigo-600 shadow-lg" : "hover:ring-1 hover:ring-indigo-300"
              }`}
            >
              {/* TEXT ELEMENT RENDERER */}
              {elem.type === "text" && (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    fontFamily: elem.fontFamily || "Noto Sans Devanagari, sans-serif",
                    fontSize: `${elem.fontSize || 24}px`,
                    fontWeight: elem.fontWeight || "normal",
                    fontStyle: elem.fontStyle || "normal",
                    textDecoration: elem.textDecoration || "none",
                    color: elem.color || "#0f172a",
                    backgroundColor: elem.backgroundColor || "transparent",
                    borderRadius: elem.borderRadius ? `${elem.borderRadius}px` : undefined,
                    borderWidth: elem.borderWidth ? `${elem.borderWidth}px` : undefined,
                    borderColor: elem.borderColor || undefined,
                    borderStyle: elem.borderWidth ? "solid" : undefined,
                    textAlign: elem.align || "left",
                    lineHeight: elem.lineHeight || 1.3,
                    textTransform: elem.textTransform || "none",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    display: "flex",
                    alignItems: elem.height && elem.height <= 80 ? "center" : "flex-start",
                    justifyContent: elem.align === "center" ? "center" : elem.align === "right" ? "flex-end" : "flex-start",
                    padding: elem.backgroundColor ? "14px 18px" : "2px 4px",
                    boxSizing: "border-box",
                  }}
                >
                  {textVal}
                </div>
              )}

              {/* ICON / ARTWORK GRAPHIC RENDERER */}
              {elem.type === "icon" && (
                <div className="w-full h-full relative flex items-center justify-center pointer-events-none">
                  {elem.url === "flower_garland" ? (
                    <svg viewBox="0 0 400 100" className="w-full h-full text-amber-500 fill-current">
                      <path d="M0 20 Q100 80 200 20 Q300 80 400 20" stroke="#f59e0b" strokeWidth="8" fill="none" strokeDasharray="12,6" />
                      <circle cx="50" cy="40" r="16" fill="#ea580c" />
                      <circle cx="100" cy="55" r="18" fill="#f59e0b" />
                      <circle cx="150" cy="48" r="16" fill="#ea580c" />
                      <circle cx="200" cy="35" r="20" fill="#f59e0b" />
                      <circle cx="250" cy="48" r="16" fill="#ea580c" />
                      <circle cx="300" cy="55" r="18" fill="#f59e0b" />
                      <circle cx="350" cy="40" r="16" fill="#ea580c" />
                    </svg>
                  ) : elem.url === "marathon" ? (
                    <svg viewBox="0 0 400 200" className="w-full h-full">
                      <circle cx="200" cy="100" r="80" fill="#ffedd5" opacity="0.5" />
                      <path d="M60 160 L100 90 L130 110 L160 160" stroke="#ea580c" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      <circle cx="100" cy="70" r="14" fill="#ea580c" />
                      <path d="M180 160 L220 80 L250 100 L280 160" stroke="#047857" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      <circle cx="220" cy="60" r="16" fill="#047857" />
                      <path d="M290 160 L320 100 L340 120 L370 160" stroke="#0284c7" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      <circle cx="320" cy="80" r="12" fill="#0284c7" />
                    </svg>
                  ) : elem.url === "house" ? (
                    <svg viewBox="0 0 300 300" className="w-full h-full">
                      <path d="M150 40 L40 140 H70 V260 H230 V140 H260 Z" fill="#0284c7" />
                      <rect x="120" y="170" width="60" height="90" fill="#e0f2fe" rx="6" />
                      <rect x="80" y="160" width="30" height="30" fill="#ffffff" rx="4" />
                      <rect x="190" y="160" width="30" height="30" fill="#ffffff" rx="4" />
                      <circle cx="230" cy="70" r="28" fill="#f59e0b" />
                    </svg>
                  ) : elem.url === "plant" ? (
                    <svg viewBox="0 0 300 300" className="w-full h-full">
                      <path d="M150 240 V130" stroke="#16a34a" strokeWidth="12" strokeLinecap="round" />
                      <path d="M150 170 Q100 130 80 80 Q140 90 150 170" fill="#22c55e" />
                      <path d="M150 150 Q200 110 220 60 Q160 70 150 150" fill="#16a34a" />
                      <path d="M60 260 Q150 290 240 260 Q210 210 150 230 Q90 210 60 260" fill="#15803d" opacity="0.3" />
                    </svg>
                  ) : elem.url === "diyas" ? (
                    <svg viewBox="0 0 400 250" className="w-full h-full">
                      <path d="M100 180 Q200 240 300 180 Q200 160 100 180" fill="#b45309" stroke="#f59e0b" strokeWidth="4" />
                      <path d="M200 165 Q180 110 200 60 Q220 110 200 165" fill="#f59e0b" />
                      <path d="M200 150 Q190 120 200 80 Q210 120 200 150" fill="#fef08a" />
                      <circle cx="200" cy="50" r="30" fill="#f59e0b" opacity="0.3" />
                    </svg>
                  ) : elem.url === "highway" ? (
                    <svg viewBox="0 0 400 400" className="w-full h-full">
                      <polygon points="180,40 220,40 380,380 20,380" fill="#334155" />
                      <line x1="200" y1="40" x2="200" y2="380" stroke="#ffffff" strokeWidth="6" strokeDasharray="20,15" />
                      <line x1="180" y1="40" x2="20" y2="380" stroke="#0f766e" strokeWidth="8" />
                      <line x1="220" y1="40" x2="380" y2="380" stroke="#0f766e" strokeWidth="8" />
                    </svg>
                  ) : elem.url === "darbar" ? (
                    <svg viewBox="0 0 400 200" className="w-full h-full">
                      <rect x="40" y="120" width="320" height="60" rx="12" fill="#ea580c" opacity="0.2" />
                      <circle cx="100" cy="140" r="16" fill="#ea580c" />
                      <circle cx="160" cy="140" r="16" fill="#ea580c" />
                      <circle cx="220" cy="140" r="16" fill="#ea580c" />
                      <circle cx="280" cy="140" r="16" fill="#ea580c" />
                    </svg>
                  ) : elem.url === "megaphone" ? (
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      <path d="M40 80 H80 L140 40 V160 L80 120 H40 Z" fill="#dc2626" />
                      <path d="M140 70 A50 50 0 0 1 140 130" stroke="#0284c7" strokeWidth="12" fill="none" strokeLinecap="round" />
                      <path d="M160 50 A80 80 0 0 1 160 150" stroke="#0284c7" strokeWidth="10" fill="none" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <div className="w-full h-full bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center justify-center text-[#047857] font-bold text-xs">
                      {elem.name}
                    </div>
                  )}
                </div>
              )}

              {/* IMAGE / LEADER PHOTO / LOGO ELEMENT RENDERER */}
              {(elem.type === "image" || elem.type === "leader_photo" || elem.type === "logo") && (
                <div className="w-full h-full relative overflow-hidden pointer-events-none" style={{ borderRadius: `${elem.borderRadius || 0}px` }}>
                  {imageVal ? (
                    <img
                      src={getImageUrl(imageVal)}
                      alt={elem.name}
                      style={{
                        objectFit: elem.type === "logo" ? "contain" : "cover",
                        borderRadius: `${elem.borderRadius || 0}px`,
                      }}
                      className="w-full h-full pointer-events-none"
                    />
                  ) : elem.type === "leader_photo" ? (
                    <div className="w-full h-full bg-gradient-to-t from-slate-900/80 via-slate-700/40 to-slate-200 flex flex-col items-center justify-end p-4 text-white rounded-2xl border-4 border-white shadow-xl pointer-events-none text-center">
                      <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-2 backdrop-blur-xs">
                        <UserCheck className="w-10 h-10 text-white" />
                      </div>
                      <span className="font-bold text-xs drop-shadow-sm">{branding?.representativeName || settings?.representative_name || "Shri Rajesh Kumar"}</span>
                      <span className="text-[10px] text-slate-200 font-medium">{branding?.designation || `${settings?.representative_title || "MLA"}, Green Valley`}</span>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center p-2 text-slate-400 border-2 border-dashed border-slate-300 rounded-xl pointer-events-none">
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                      <span className="font-bold text-[10px] mt-1">{elem.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* SHAPE ELEMENT RENDERER */}
              {elem.type === "shape" && (
                <div className="w-full h-full relative pointer-events-none">
                  {elem.shapeType === "circle" ? (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        backgroundColor: elem.backgroundColor || "#047857",
                        borderRadius: "50%",
                      }}
                    />
                  ) : elem.shapeType === "tricolor_strip" ? (
                    <div className="w-full h-full flex flex-col rounded-md overflow-hidden shadow-xs">
                      <div className="flex-1 bg-orange-500" />
                      <div className="flex-1 bg-white" />
                      <div className="flex-1 bg-emerald-600" />
                    </div>
                  ) : elem.shapeType === "divider" ? (
                    <div
                      style={{
                        width: "100%",
                        height: "2px",
                        backgroundColor: elem.backgroundColor || "#cbd5e1",
                        marginTop: "auto",
                        marginBottom: "auto",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        backgroundColor: elem.backgroundColor || "#047857",
                        borderRadius: `${elem.borderRadius || 0}px`,
                      }}
                    />
                  )}
                </div>
              )}

              {/* FOOTER BANNER RENDERER */}
              {elem.type === "footer" && (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: elem.backgroundColor || "#064e3b",
                    color: elem.color || "#ffffff",
                    fontFamily: elem.fontFamily || "Noto Sans Devanagari, sans-serif",
                    fontSize: `${elem.fontSize || 28}px`,
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: elem.align === "center" ? "center" : elem.align === "right" ? "flex-end" : "flex-start",
                    padding: "0 24px",
                  }}
                  className="pointer-events-none"
                >
                  {textVal}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
