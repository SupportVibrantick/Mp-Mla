import React, { useRef, useState, useEffect } from "react";
import { CanvasElement } from "@/types/creative";
import { getImageUrl } from "@/lib/utils";
import { useSystemSettings } from "@/contexts/SettingsContext";
import { useCreativeDesign } from "@/contexts/CreativeDesignContext";
import { RotateCw, Copy, Trash2, UserCheck, Image as ImageIcon, Plus } from "lucide-react";

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
  readOnly = false,
}: CreativeCanvasProps) {
  const { settings } = useSystemSettings();
  const designContext = useCreativeDesign();
  const branding = designContext?.designState?.branding;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(0.5);

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

  // ResizeObserver for responsive scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (containerRef.current && canvasWidth > 0) {
        const clientWidth = containerRef.current.clientWidth;
        if (clientWidth > 0) {
          setScale(clientWidth / canvasWidth);
        }
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [canvasWidth]);

  // Resolve dynamic tokens from slot values, branding and system settings
  const resolveTokenText = (text?: string, dynamicToken?: string): string => {
    let result = text || "";
    const slotValues = designContext?.designState?.slotValues || {};
    const repName = branding?.representativeName || settings?.representative_name || "Shri Rajesh Kumar";
    const repTitle = branding?.designation || `${settings?.representative_title || "MLA"}, ${settings?.org_name || "Green Valley Constituency"}`;
    const partyName = settings?.party_name || "BJP";

    // Direct token substitution
    if (dynamicToken) {
      const cleanToken = dynamicToken.replace(/[{}]/g, "");
      if (slotValues[cleanToken] !== undefined && slotValues[cleanToken] !== "") {
        result = slotValues[cleanToken];
      }
    }

    // Dynamic pattern replacement
    if (result.includes("{{")) {
      Object.entries(slotValues).forEach(([k, v]) => {
        if (v !== undefined) {
          result = result.replace(new RegExp(`{{${k}}}`, "g"), v);
        }
      });
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

      const currentScale = scale || 1;
      const clientDeltaX = e.clientX - dragStart.x;
      const clientDeltaY = e.clientY - dragStart.y;

      const designDeltaX = clientDeltaX / currentScale;
      const designDeltaY = clientDeltaY / currentScale;

      if (activeHandle === "move") {
        onUpdateElement(selectedElementId, {
          x: Math.round(elementStartPos.x + designDeltaX),
          y: Math.round(elementStartPos.y + designDeltaY),
        });
      } else if (activeHandle === "rotate") {
        const rect = canvasRef.current.getBoundingClientRect();
        const centerScreenX = rect.left + (elementStartPos.x + elementStartPos.w / 2) * currentScale;
        const centerScreenY = rect.top + (elementStartPos.y + elementStartPos.h / 2) * currentScale;
        const radians = Math.atan2(e.clientY - centerScreenY, e.clientX - centerScreenX);
        let degrees = Math.round(radians * (180 / Math.PI)) + 90;
        if (degrees < 0) degrees += 360;
        onUpdateElement(selectedElementId, { rotation: degrees });
      } else if (activeHandle === "se") {
        onUpdateElement(selectedElementId, {
          width: Math.max(30, Math.round(elementStartPos.w + designDeltaX)),
          height: Math.max(30, Math.round(elementStartPos.h + designDeltaY)),
        });
      } else if (activeHandle === "sw") {
        onUpdateElement(selectedElementId, {
          x: Math.round(elementStartPos.x + designDeltaX),
          width: Math.max(30, Math.round(elementStartPos.w - designDeltaX)),
          height: Math.max(30, Math.round(elementStartPos.h + designDeltaY)),
        });
      } else if (activeHandle === "ne") {
        onUpdateElement(selectedElementId, {
          y: Math.round(elementStartPos.y + designDeltaY),
          width: Math.max(30, Math.round(elementStartPos.w + designDeltaX)),
          height: Math.max(30, Math.round(elementStartPos.h - designDeltaY)),
        });
      } else if (activeHandle === "nw") {
        onUpdateElement(selectedElementId, {
          x: Math.round(elementStartPos.x + designDeltaX),
          y: Math.round(elementStartPos.y + designDeltaY),
          width: Math.max(30, Math.round(elementStartPos.w - designDeltaX)),
          height: Math.max(30, Math.round(elementStartPos.h - designDeltaY)),
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
  }, [isDragging, activeHandle, dragStart, elementStartPos, selectedElementId, selectedElement, scale, onUpdateElement, readOnly]);

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
    if (e.target === containerRef.current || e.target === canvasRef.current) {
      onSelectElement(null);
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleCanvasClick}
      style={{
        aspectRatio: `${canvasWidth} / ${canvasHeight}`,
        width: "100%",
        maxHeight: "75vh",
      }}
      className="relative rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 select-none flex items-center justify-center mx-auto"
    >
      <div
        id="canvas-svg-element"
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
          background: canvasBackground,
          overflow: "hidden",
        }}
      >
        {/* Blank Canvas Helper Placeholder */}
        {elements.length === 0 && !readOnly && (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3 export-exclude pointer-events-none select-none">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-300">
              <Plus className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Blank Canvas Ready</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Add text headings, shapes, badges, or leader branding from the left sidebar to start designing.
              </p>
            </div>
          </div>
        )}

        {/* Render Canvas Elements in Z-Order with exact pixel coordinates */}
        {elements
          .filter((el) => el.visible !== false)
          .map((elem) => {
            const isSelected = elem.id === selectedElementId && !readOnly;
            const textContent = resolveTokenText(elem.text, elem.dynamicToken);
            const imageUrl = resolveTokenImage(elem.type, elem.url, elem.dynamicToken);

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
                      fontSize: `${elem.fontSize || 26}px`,
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
                  <div className="export-exclude" data-export-exclude="true">
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
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

