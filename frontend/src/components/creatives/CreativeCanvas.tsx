import React, { useRef, useState, useEffect } from "react";
import { CanvasElement } from "@/types/creative";
import { getImageUrl } from "@/lib/utils";
import { useSystemSettings } from "@/contexts/SettingsContext";
import { useCreativeDesign } from "@/contexts/CreativeDesignContext";
import { RotateCw, Copy, Trash2, UserCheck, Image as ImageIcon } from "lucide-react";

interface CreativeCanvasProps {
  canvasWidth: number;
  canvasHeight: number;
  canvasBackground: string;
  elements: CanvasElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updated: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  showSafeArea?: boolean;
  readOnly?: boolean;
}

export function CreativeCanvas({
  canvasWidth,
  canvasHeight,
  canvasBackground,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  showSafeArea = false,
  readOnly = false,
}: CreativeCanvasProps) {
  const { settings } = useSystemSettings();
  const designContext = useCreativeDesign();
  const branding = designContext?.designState?.branding;

  const canvasRef = useRef<HTMLDivElement>(null);

  // Dragging, Resizing & Rotating state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [elementStartPos, setElementStartPos] = useState<{ x: number; y: number; w: number; h: number; rot: number }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    rot: 0,
  });
  const [activeHandle, setActiveHandle] = useState<string | null>(null);

  const selectedElement = elements.find((e) => e.id === selectedElementId);

  // Resolve dynamic tokens from branding and system settings
  const resolveTokenText = (text?: string, token?: string): string => {
    let result = text || "";
    const repName = branding?.representativeName || settings?.representative_name || "Shri Rajesh Kumar";
    const repTitle = branding?.designation || `${settings?.representative_title || "MLA"}, ${settings?.org_name || "Green Valley Constituency"}`;
    const partyName = settings?.party_name || "BJP";

    if (token || result.includes("{{")) {
      result = result
        .replace(/{{representativeName}}/g, repName)
        .replace(/{{designation}}/g, repTitle)
        .replace(/{{partyName}}/g, partyName)
        .replace(/{{constituencyName}}/g, settings?.constituency_name || "Green Valley Constituency");
    }
    return result;
  };

  const resolveTokenImage = (type: string, url?: string, token?: string): string => {
    if (token === "{{leaderPhoto}}" || url === "{{leaderPhoto}}" || type === "leader_photo") {
      return branding?.leaderPhotoUrl || settings?.representative_photo || (url && !url.includes("{{") ? url : "");
    }
    if (token === "{{partyLogo}}" || url === "{{partyLogo}}" || type === "logo") {
      return branding?.partyLogoUrl || settings?.party_logo_url || settings?.brand_logo_url || (url && !url.includes("{{") ? url : "");
    }
    return url || "";
  };

  // Mouse Move Event for Dragging, Resizing & Rotating with Display Scale Conversion
  useEffect(() => {
    if (readOnly) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !selectedElementId || selectedElement?.locked || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasWidth / (rect.width || 1);
      const scaleY = canvasHeight / (rect.height || 1);

      const clientDeltaX = e.clientX - dragStart.x;
      const clientDeltaY = e.clientY - dragStart.y;

      const designDeltaX = clientDeltaX * scaleX;
      const designDeltaY = clientDeltaY * scaleY;

      if (activeHandle === "move") {
        onUpdateElement(selectedElementId, {
          x: Math.round(elementStartPos.x + designDeltaX),
          y: Math.round(elementStartPos.y + designDeltaY),
        });
      } else if (activeHandle === "rotate") {
        const centerX = rect.left + ((elementStartPos.x + elementStartPos.w / 2) / scaleX);
        const centerY = rect.top + ((elementStartPos.y + elementStartPos.h / 2) / scaleY);
        const radians = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let degrees = Math.round(radians * (180 / Math.PI)) + 90;
        if (degrees < 0) degrees += 360;
        onUpdateElement(selectedElementId, { rotation: degrees });
      } else if (activeHandle === "se") {
        onUpdateElement(selectedElementId, {
          width: Math.max(20, Math.round(elementStartPos.w + designDeltaX)),
          height: Math.max(20, Math.round(elementStartPos.h + designDeltaY)),
        });
      } else if (activeHandle === "sw") {
        onUpdateElement(selectedElementId, {
          x: Math.round(elementStartPos.x + designDeltaX),
          width: Math.max(20, Math.round(elementStartPos.w - designDeltaX)),
          height: Math.max(20, Math.round(elementStartPos.h + designDeltaY)),
        });
      } else if (activeHandle === "ne") {
        onUpdateElement(selectedElementId, {
          y: Math.round(elementStartPos.y + designDeltaY),
          width: Math.max(20, Math.round(elementStartPos.w + designDeltaX)),
          height: Math.max(20, Math.round(elementStartPos.h - designDeltaY)),
        });
      } else if (activeHandle === "nw") {
        onUpdateElement(selectedElementId, {
          x: Math.round(elementStartPos.x + designDeltaX),
          y: Math.round(elementStartPos.y + designDeltaY),
          width: Math.max(20, Math.round(elementStartPos.w - designDeltaX)),
          height: Math.max(20, Math.round(elementStartPos.h - designDeltaY)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setActiveHandle(null);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, activeHandle, dragStart, elementStartPos, selectedElementId, selectedElement, canvasWidth, canvasHeight, onUpdateElement, readOnly]);

  const handleMouseDownElement = (e: React.MouseEvent, elem: CanvasElement, handle = "move") => {
    if (readOnly) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectElement(elem.id);

    if (elem.locked) return;

    setIsDragging(true);
    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStartPos({ x: elem.x, y: elem.y, w: elem.width, h: elem.height, rot: elem.rotation || 0 });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    // Only deselect if clicked directly on background, not on children
    if (e.target === canvasRef.current || (e.target as HTMLElement).id === "canvas-svg-element") {
      onSelectElement(null);
    }
  };

  return (
    <div
      ref={canvasRef}
      onClick={handleCanvasClick}
      style={{
        aspectRatio: `${canvasWidth}/${canvasHeight}`,
      }}
      className="w-full rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-2xl overflow-hidden relative bg-white select-none"
    >
      <div
        id="canvas-svg-element"
        onClick={handleCanvasClick}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          background: canvasBackground,
          overflow: "hidden",
        }}
      >
        {/* Safe Printing Area Guide */}
        {showSafeArea && (
          <div className="absolute inset-8 border-2 border-dashed border-rose-500/50 pointer-events-none z-50 flex items-start justify-end p-2">
            <span className="text-[10px] font-bold text-rose-600 bg-white/90 px-1.5 py-0.5 rounded border border-rose-200">
              Safe Trim Boundary (300 DPI)
            </span>
          </div>
        )}

        {/* Render Canvas Elements in Z-Order */}
        {elements
          .filter((el) => el.visible !== false)
          .map((elem) => {
            const isSelected = elem.id === selectedElementId && !readOnly;
            const textContent = resolveTokenText(elem.text, elem.dynamicToken);
            const imageUrl = resolveTokenImage(elem.type, elem.url, elem.dynamicToken);

            const leftPct = (elem.x / canvasWidth) * 100;
            const topPct = (elem.y / canvasHeight) * 100;
            const widthPct = (elem.width / canvasWidth) * 100;
            const heightPct = (elem.height / canvasHeight) * 100;

            return (
              <div
                key={elem.id}
                onMouseDown={(e) => handleMouseDownElement(e, elem, "move")}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement(elem.id);
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
                {/* TEXT ELEMENT */}
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
                      textAlign: elem.align || "left",
                      lineHeight: elem.lineHeight || 1.3,
                      textTransform: elem.textTransform || "none",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {textContent}
                  </div>
                )}

                {/* IMAGE / LEADER PHOTO / LOGO ELEMENT */}
                {(elem.type === "image" || elem.type === "leader_photo" || elem.type === "logo") && (
                  <div className="w-full h-full relative overflow-hidden pointer-events-none" style={{ borderRadius: `${elem.borderRadius || 0}px` }}>
                    {imageUrl ? (
                      <img
                        src={getImageUrl(imageUrl)}
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
                        <span className="font-bold text-xs drop-shadow-sm">{branding?.representativeName || settings?.representative_name || "Shri Representative"}</span>
                        <span className="text-[10px] text-slate-200 font-medium">{branding?.designation || `${settings?.representative_title || "MLA"}, Constituency`}</span>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center p-2 text-slate-400 border-2 border-dashed border-slate-300 rounded-xl pointer-events-none">
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                        <span className="font-bold text-[10px] mt-1">{elem.name}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* SHAPE ELEMENT RENDERER REGISTRY */}
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

                {/* FOOTER BANNER ELEMENT */}
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
                    {textContent}
                  </div>
                )}

                {/* BOUNDING BOX & ROTATION CONTROLS */}
                {isSelected && !elem.locked && (
                  <>
                    {/* Top Rotation Handle */}
                    <div
                      onMouseDown={(e) => handleMouseDownElement(e, elem, "rotate")}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute -top-7 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-indigo-600 rounded-full cursor-grab flex items-center justify-center shadow-md hover:scale-110 transition-transform z-50"
                      title="Rotate element"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                    </div>

                    {/* Corner Resize Handles */}
                    <div
                      onMouseDown={(e) => handleMouseDownElement(e, elem, "nw")}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize shadow-md z-50"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDownElement(e, elem, "ne")}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize shadow-md z-50"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDownElement(e, elem, "sw")}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize shadow-md z-50"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDownElement(e, elem, "se")}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize shadow-md z-50"
                    />

                    {/* Quick Floating Action Bar */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute -top-12 right-0 flex items-center gap-1 bg-slate-900 text-white p-1 rounded-xl shadow-xl z-50 text-[10px]"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateElement(elem.id);
                        }}
                        className="px-2 py-0.5 hover:bg-slate-700 rounded flex items-center gap-1 font-bold"
                        title="Duplicate"
                      >
                        <Copy className="w-3 h-3" /> Duplicate
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteElement(elem.id);
                        }}
                        className="px-2 py-0.5 hover:bg-rose-700 rounded text-rose-300 flex items-center gap-1 font-bold"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
