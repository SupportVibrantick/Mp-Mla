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
        width: `${width}px`,
        height: `${height}px`,
        position: "relative",
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
                left: `${elem.x}px`,
                top: `${elem.y}px`,
                width: `${elem.width}px`,
                height: `${elem.height}px`,
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
                    <div className="w-full h-full bg-gradient-to-t from-slate-200 via-slate-100 to-slate-50 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-700 flex flex-col items-center justify-center p-4 text-slate-400 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 shadow-xs pointer-events-none text-center">
                      <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center mb-2 shadow-xs">
                        <UserCheck className="w-8 h-8 text-slate-400" />
                      </div>
                      <span className="font-bold text-xs text-slate-600 dark:text-slate-300">Leader Photo</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Upload in Brand Kit</span>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-white/90 dark:bg-slate-800/90 flex flex-col items-center justify-center p-2 text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl pointer-events-none shadow-2xs">
                      <ImageIcon className="w-6 h-6 text-slate-400" />
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
                    fontSize: `${elem.fontSize || 26}px`,
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

