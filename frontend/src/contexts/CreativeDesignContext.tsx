import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  CreativeCategory,
  CreativeFormat,
  CanvasElement,
  CreativeTemplateDef,
} from "@/types/creative";
import { useSystemSettings } from "@/contexts/SettingsContext";
import { getTemplateElements } from "@/data/templateElementGenerator";
import { MASTER_CREATIVE_TEMPLATES } from "@/data/creativeTemplates";
import api from "@/lib/api";

export interface CreativeDesignState {
  id?: string;
  metadata: {
    title: string;
    templateId?: string;
    category: CreativeCategory;
    format: CreativeFormat;
  };
  canvas: {
    width: number;
    height: number;
    background: string;
  };
  slotValues: Record<string, string>;
  branding: {
    useOfficial: boolean;
    representativeName: string;
    designation: string;
    leaderPhotoUrl: string;
    partyLogoUrl: string;
    footerText: string;
  };
  theme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  elements: CanvasElement[];
  settings: {
    showGrid: boolean;
    snapToGrid: boolean;
    showSafeArea: boolean;
  };
}

interface CreativeDesignContextType {
  designState: CreativeDesignState;
  selectedElementId: string | null;
  editorMode: "quick" | "advanced";
  saveStatus: "saved" | "unsaved" | "saving" | "error";
  canUndo: boolean;
  canRedo: boolean;
  setEditorMode: (mode: "quick" | "advanced") => void;
  setSelectedElementId: (id: string | null) => void;
  updateMetadata: (fields: Partial<CreativeDesignState["metadata"]>) => void;
  updateCanvas: (fields: Partial<CreativeDesignState["canvas"]>) => void;
  updateBranding: (fields: Partial<CreativeDesignState["branding"]>) => void;
  updateTheme: (fields: Partial<CreativeDesignState["theme"]>) => void;
  updateSettings: (fields: Partial<CreativeDesignState["settings"]>) => void;
  setSlotValue: (key: string, value: string) => void;
  loadTemplate: (template: CreativeTemplateDef) => void;
  addElement: (element: Partial<CanvasElement>) => void;
  updateElement: (id: string, updated: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  reorderElement: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  toggleLockElement: (id: string) => void;
  toggleHideElement: (id: string) => void;
  changeFormat: (format: CreativeFormat) => void;
  autoFixLayout: () => void;
  undo: () => void;
  redo: () => void;
  saveDesign: () => Promise<void>;
  loadDesign: (designJson: any, id?: string, title?: string) => void;
  startBlankCanvas: (format?: CreativeFormat) => void;
}

const DEFAULT_INITIAL_STATE: CreativeDesignState = {
  metadata: {
    title: MASTER_CREATIVE_TEMPLATES[0].name,
    templateId: MASTER_CREATIVE_TEMPLATES[0].id,
    category: "BIRTHDAY",
    format: "SQUARE_POST",
  },
  canvas: {
    width: 1080,
    height: 1080,
    background: MASTER_CREATIVE_TEMPLATES[0].bgGradient,
  },
  slotValues: {
    headingText: MASTER_CREATIVE_TEMPLATES[0].headingText || "जन्मदिन की हार्दिक शुभकामनाएं",
    subheadingText: MASTER_CREATIVE_TEMPLATES[0].subheadingText || "सुख, उत्तम स्वास्थ्य एवं दीर्घायु जीवन की मंगलकामनाएं",
    messageText: MASTER_CREATIVE_TEMPLATES[0].messageText || "ईश्वर से आपके उत्तम स्वास्थ्य, दीर्घायु एवं यशस्वी जीवन की मंगलकामना करते हैं। आपके नेतृत्व में हमारा क्षेत्र निरंतर प्रगति के नए कीर्तिमान स्थापित करे।",
    sloganText: MASTER_CREATIVE_TEMPLATES[0].sloganText || "सेवा • समर्पण • सुशासन",
    footerText: MASTER_CREATIVE_TEMPLATES[0].footerText || "सेवा • समर्पण • सुशासन",
    repNameText: "Shri Rajesh Kumar",
    repDesignationText: "MLA, Green Valley Constituency",
  },
  branding: {
    useOfficial: true,
    representativeName: "Shri Rajesh Kumar",
    designation: "MLA, Green Valley Constituency",
    leaderPhotoUrl: "",
    partyLogoUrl: "",
    footerText: "सेवा • समर्पण • सुशासन",
  },
  theme: {
    primary: MASTER_CREATIVE_TEMPLATES[0].primaryColor || "#ea580c",
    secondary: MASTER_CREATIVE_TEMPLATES[0].secondaryColor || "#c2410c",
    accent: "#f59e0b",
  },
  elements: getTemplateElements(MASTER_CREATIVE_TEMPLATES[0]),
  settings: {
    showGrid: false,
    snapToGrid: false,
    showSafeArea: false,
  },
};

const CreativeDesignContext = createContext<CreativeDesignContextType | undefined>(undefined);

export const CreativeDesignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings: tenantSettings } = useSystemSettings();
  const [designState, setDesignState] = useState<CreativeDesignState>(DEFAULT_INITIAL_STATE);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"quick" | "advanced">("quick");
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving" | "error">("saved");

  // History stack for Undo / Redo
  const historyRef = useRef<CreativeDesignState[]>([DEFAULT_INITIAL_STATE]);
  const historyIndexRef = useRef<number>(0);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // Save history snapshot
  const pushHistory = useCallback((newState: CreativeDesignState) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(JSON.parse(JSON.stringify(newState)));
    if (newHistory.length > 30) newHistory.shift();
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setSaveStatus("unsaved");
  }, []);

  // Sync tenant settings into state on load
  useEffect(() => {
    if (tenantSettings) {
      setDesignState((prev) => {
        const repName = tenantSettings.representative_name || prev.branding.representativeName;
        const repTitle = `${tenantSettings.representative_title || "MLA"}, ${tenantSettings.org_name || "Constituency"}`;
        const photo = tenantSettings.representative_photo || prev.branding.leaderPhotoUrl;
        const logo = tenantSettings.brand_logo_url || prev.branding.partyLogoUrl;

        return {
          ...prev,
          branding: {
            ...prev.branding,
            representativeName: repName,
            designation: repTitle,
            leaderPhotoUrl: photo,
            partyLogoUrl: logo,
          },
        };
      });
    }
  }, [tenantSettings]);

  // Debounced Autosave (1.5 sec)
  useEffect(() => {
    if (saveStatus !== "unsaved") return;

    const timer = setTimeout(async () => {
      try {
        setSaveStatus("saving");
        if (designState.id) {
          await api.put(`/admin/creatives/saved/${designState.id}`, {
            title: designState.metadata.title,
            category: designState.metadata.category,
            format: designState.metadata.format,
            designJson: designState,
          });
        }
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("error");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [designState, saveStatus]);

  const updateMetadata = (fields: Partial<CreativeDesignState["metadata"]>) => {
    setDesignState((prev) => {
      const next = { ...prev, metadata: { ...prev.metadata, ...fields } };
      pushHistory(next);
      return next;
    });
  };

  const updateCanvas = (fields: Partial<CreativeDesignState["canvas"]>) => {
    setDesignState((prev) => {
      const next = { ...prev, canvas: { ...prev.canvas, ...fields } };
      pushHistory(next);
      return next;
    });
  };

  const updateBranding = (fields: Partial<CreativeDesignState["branding"]>) => {
    setDesignState((prev) => {
      const newBranding = { ...prev.branding, ...fields };

      const updatedElements = prev.elements.map((el) => {
        if (fields.footerText !== undefined && (el.type === "footer" || el.dynamicToken === "{{footerText}}")) {
          return { ...el, text: fields.footerText };
        }
        if (fields.leaderPhotoUrl !== undefined && (el.type === "leader_photo" || el.dynamicToken === "{{leaderPhoto}}")) {
          return { ...el, url: fields.leaderPhotoUrl };
        }
        if (fields.partyLogoUrl !== undefined && (el.type === "logo" || el.dynamicToken === "{{partyLogo}}")) {
          return { ...el, url: fields.partyLogoUrl };
        }
        return el;
      });

      const next = { ...prev, branding: newBranding, elements: updatedElements };
      pushHistory(next);
      return next;
    });
  };

  const updateTheme = (fields: Partial<CreativeDesignState["theme"]>) => {
    setDesignState((prev) => {
      const next = { ...prev, theme: { ...prev.theme, ...fields } };
      pushHistory(next);
      return next;
    });
  };

  const updateSettings = (fields: Partial<CreativeDesignState["settings"]>) => {
    setDesignState((prev) => ({ ...prev, settings: { ...prev.settings, ...fields } }));
  };

  const setSlotValue = (key: string, value: string) => {
    setDesignState((prev) => {
      const updatedSlots = { ...prev.slotValues, [key]: value };
      const updatedElements = prev.elements.map((el) => {
        if (el.dynamicToken === `{{${key}}}`) {
          return { ...el, text: value };
        }
        return el;
      });

      const next = { ...prev, slotValues: updatedSlots, elements: updatedElements };
      pushHistory(next);
      return next;
    });
  };

  const loadTemplate = (template: CreativeTemplateDef) => {
    setDesignState((prev) => {
      const width = template.format === "PORTRAIT_POST" ? 1080 : template.format === "BANNER_WIDE" ? 1200 : 1080;
      const height = template.format === "PORTRAIT_POST" ? 1350 : template.format === "BANNER_WIDE" ? 630 : 1080;

      const next: CreativeDesignState = {
        ...prev,
        metadata: {
          title: template.name,
          templateId: template.id,
          category: template.category,
          format: template.format,
        },
        canvas: {
          width,
          height,
          background: template.bgGradient,
        },
        theme: {
          primary: template.primaryColor,
          secondary: template.secondaryColor || "#047857",
          accent: "#f59e0b",
        },
        slotValues: {
          headingText: template.headingText,
          subheadingText: template.subheadingText,
          messageText: template.messageText,
          sloganText: template.sloganText,
          dateText: template.dateText || "",
          timeText: template.timeText || "",
          venueText: template.venueText || "",
          bullet1: template.bullet1 || "",
          bullet2: template.bullet2 || "",
          bullet3: template.bullet3 || "",
          footerText: template.footerText,
        },
        elements: getTemplateElements(template),
      };
      pushHistory(next);
      return next;
    });
  };

  const startBlankCanvas = (format: CreativeFormat = "SQUARE_POST") => {
    setDesignState((prev) => {
      const width = format === "PORTRAIT_POST" ? 1080 : format === "BANNER_WIDE" ? 1200 : 1080;
      const height = format === "PORTRAIT_POST" ? 1350 : format === "BANNER_WIDE" ? 630 : 1080;

      const blankState: CreativeDesignState = {
        id: undefined,
        metadata: {
          title: "Blank Design",
          category: "GENERAL",
          format,
        },
        canvas: {
          width,
          height,
          background: "#ffffff",
        },
        slotValues: {},
        branding: prev.branding,
        theme: {
          primary: "#047857",
          secondary: "#064e3b",
          accent: "#f59e0b",
        },
        elements: [],
        settings: {
          showGrid: false,
          snapToGrid: false,
          showSafeArea: false,
        },
      };
      setSelectedElementId(null);
      pushHistory(blankState);
      return blankState;
    });
  };

  const addElement = (element: Partial<CanvasElement>) => {
    setDesignState((prev) => {
      const newEl: CanvasElement = {
        id: `el-${Date.now()}`,
        name: element.name || "New Element",
        type: element.type || "text",
        x: element.x ?? prev.canvas.width / 2 - 100,
        y: element.y ?? prev.canvas.height / 2 - 25,
        width: element.width ?? 200,
        height: element.height ?? 50,
        text: element.text || "New Text",
        fontSize: element.fontSize || 24,
        fontFamily: element.fontFamily || "Noto Sans Devanagari",
        color: element.color || prev.theme.primary,
        align: element.align || "left",
        visible: true,
        locked: false,
        editable: true,
        ...element,
      };

      const next = { ...prev, elements: [...prev.elements, newEl] };
      setSelectedElementId(newEl.id);
      pushHistory(next);
      return next;
    });
  };

  const updateElement = (id: string, updated: Partial<CanvasElement>) => {
    setDesignState((prev) => {
      const nextElements = prev.elements.map((el) => (el.id === id ? { ...el, ...updated } : el));
      const next = { ...prev, elements: nextElements };
      pushHistory(next);
      return next;
    });
  };

  const deleteElement = (id: string) => {
    setDesignState((prev) => {
      const next = { ...prev, elements: prev.elements.filter((el) => el.id !== id) };
      if (selectedElementId === id) setSelectedElementId(null);
      pushHistory(next);
      return next;
    });
  };

  const duplicateElement = (id: string) => {
    const target = designState.elements.find((e) => e.id === id);
    if (!target) return;

    addElement({
      ...target,
      id: `el-${Date.now()}`,
      name: `${target.name} Copy`,
      x: target.x + 20,
      y: target.y + 20,
    });
  };

  const reorderElement = (id: string, direction: "up" | "down" | "top" | "bottom") => {
    setDesignState((prev) => {
      const idx = prev.elements.findIndex((e) => e.id === id);
      if (idx === -1) return prev;

      const elements = [...prev.elements];
      const item = elements.splice(idx, 1)[0];

      if (direction === "top") elements.push(item);
      else if (direction === "bottom") elements.unshift(item);
      else if (direction === "up" && idx < elements.length) elements.splice(idx + 1, 0, item);
      else if (direction === "down" && idx > 0) elements.splice(idx - 1, 0, item);
      else elements.splice(idx, 0, item);

      const next = { ...prev, elements };
      pushHistory(next);
      return next;
    });
  };

  const toggleLockElement = (id: string) => {
    setDesignState((prev) => {
      const nextElements = prev.elements.map((el) => (el.id === id ? { ...el, locked: !el.locked } : el));
      return { ...prev, elements: nextElements };
    });
  };

  const toggleHideElement = (id: string) => {
    setDesignState((prev) => {
      const nextElements = prev.elements.map((el) => (el.id === id ? { ...el, visible: !el.visible } : el));
      return { ...prev, elements: nextElements };
    });
  };

  const changeFormat = (format: CreativeFormat) => {
    setDesignState((prev) => {
      let width = 1080;
      let height = 1080;
      if (format === "PORTRAIT_POST") {
        height = 1350;
      } else if (format === "BANNER_WIDE") {
        width = 1200;
        height = 630;
      } else if (format === "PRINT_A4") {
        width = 2480;
        height = 3508;
      } else if (format === "PRINT_A3") {
        width = 3508;
        height = 4961;
      }

      const next: CreativeDesignState = {
        ...prev,
        metadata: { ...prev.metadata, format },
        canvas: { ...prev.canvas, width, height },
      };
      pushHistory(next);
      return next;
    });
  };

  const autoFixLayout = () => {
    setDesignState((prev) => {
      const fixedElements = prev.elements.map((el) => {
        let x = Math.max(40, Math.min(el.x, prev.canvas.width - el.width - 40));
        let y = Math.max(40, Math.min(el.y, prev.canvas.height - el.height - 40));
        return { ...el, x, y };
      });
      const next = { ...prev, elements: fixedElements };
      pushHistory(next);
      return next;
    });
  };

  const undo = () => {
    if (!canUndo) return;
    historyIndexRef.current -= 1;
    setDesignState(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
  };

  const redo = () => {
    if (!canRedo) return;
    historyIndexRef.current += 1;
    setDesignState(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
  };

  const saveDesign = async () => {
    try {
      setSaveStatus("saving");
      if (designState.id) {
        await api.put(`/admin/creatives/saved/${designState.id}`, {
          title: designState.metadata.title,
          category: designState.metadata.category,
          format: designState.metadata.format,
          designJson: designState,
        });
      } else {
        const res = await api.post("/admin/creatives/saved", {
          title: designState.metadata.title,
          category: designState.metadata.category,
          format: designState.metadata.format,
          designJson: designState,
        });
        if (res.data?.data?.id) {
          setDesignState((prev) => ({ ...prev, id: res.data.data.id }));
        }
      }
      setSaveStatus("saved");
    } catch (err) {
      setSaveStatus("error");
    }
  };

  const loadDesign = (designJson: any, id?: string, title?: string) => {
    if (designJson && typeof designJson === "object") {
      const loaded: CreativeDesignState = {
        ...DEFAULT_INITIAL_STATE,
        ...designJson,
        id: id || designJson.id,
        metadata: {
          ...DEFAULT_INITIAL_STATE.metadata,
          ...designJson.metadata,
          title: title || designJson.metadata?.title || DEFAULT_INITIAL_STATE.metadata.title,
        },
      };
      setDesignState(loaded);
      historyRef.current = [loaded];
      historyIndexRef.current = 0;
      setSaveStatus("saved");
    }
  };

  return (
    <CreativeDesignContext.Provider
      value={{
        designState,
        selectedElementId,
        editorMode,
        saveStatus,
        canUndo,
        canRedo,
        setEditorMode,
        setSelectedElementId,
        updateMetadata,
        updateCanvas,
        updateBranding,
        updateTheme,
        updateSettings,
        setSlotValue,
        loadTemplate,
        addElement,
        updateElement,
        deleteElement,
        duplicateElement,
        reorderElement,
        toggleLockElement,
        toggleHideElement,
        changeFormat,
        autoFixLayout,
        undo,
        redo,
        saveDesign,
        loadDesign,
        startBlankCanvas,
      }}
    >
      {children}
    </CreativeDesignContext.Provider>
  );
};

export const useCreativeDesign = () => {
  const context = useContext(CreativeDesignContext);
  if (!context) {
    throw new Error("useCreativeDesign must be used within a CreativeDesignProvider");
  }
  return context;
};
