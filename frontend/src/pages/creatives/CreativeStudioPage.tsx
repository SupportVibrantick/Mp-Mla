import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { useSystemSettings } from "@/contexts/SettingsContext";
import { toPng, toJpeg } from "html-to-image";

// Context & Types
import { CreativeDesignProvider, useCreativeDesign } from "@/contexts/CreativeDesignContext";
import { CreativeTemplateDef, SavedCreativeItem, CreativeFormat, CreativeCategory } from "@/types/creative";
import { MASTER_CREATIVE_TEMPLATES } from "@/data/creativeTemplates";

// Studio Components
import { CreativeLandingScreen } from "@/components/creatives/CreativeLandingScreen";
import { DynamicQuickEditor } from "@/components/creatives/DynamicQuickEditor";
import { TemplateLibrary } from "@/components/creatives/TemplateLibrary";
import { TemplatePreviewModal } from "@/components/creatives/TemplatePreviewModal";
import { ExportModal } from "@/components/creatives/ExportModal";
import { SavedCreativeLibrary } from "@/components/creatives/SavedCreativeLibrary";
import { CreativeCanvas } from "@/components/creatives/CreativeCanvas";
import { TextElementsPanel } from "@/components/creatives/TextElementsPanel";
import { BrandKitPanel, BrandKitData } from "@/components/creatives/BrandKitPanel";
import { BackgroundPanel } from "@/components/creatives/BackgroundPanel";
import { LayersPanel } from "@/components/creatives/LayersPanel";
import { ElementPropertiesPanel } from "@/components/creatives/ElementPropertiesPanel";
import { FormatSwitcher } from "@/components/creatives/FormatSwitcher";

import {
  FileText,
  Building2,
  Share2,
  Download,
  Save,
  LayoutGrid,
  Undo2,
  Redo2,
  FolderHeart,
  Wand2,
  Palette,
  Check,
  Loader2,
  Plus,
  Layers,
  Sparkles,
  MousePointerClick,
  Info,
} from "lucide-react";

type StudioView = "landing" | "templates" | "editor" | "brand" | "saved";
type EditorTab = "content" | "elements" | "background" | "brand" | "layers";

function CreativeStudioInner() {
  const { settings } = useSystemSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    designState,
    selectedElementId,
    saveStatus,
    canUndo,
    canRedo,
    setSelectedElementId,
    updateMetadata,
    updateCanvas,
    updateBranding,
    updateTheme,
    setSlotValue,
    loadTemplate,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    reorderElement,
    changeFormat,
    undo,
    redo,
    saveDesign,
    loadDesign,
    startBlankCanvas,
  } = useCreativeDesign();

  // UNIFIED STUDIO VIEW
  const [studioView, setStudioView] = useState<StudioView>("landing");
  const [editorTab, setEditorTab] = useState<EditorTab>("content");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [favorites, setFavorites] = useState<string[]>([]);

  // Modals
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<CreativeTemplateDef | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const templatesList: CreativeTemplateDef[] = MASTER_CREATIVE_TEMPLATES;

  // Fetch Saved Creatives
  const { data: savedCreativesData, refetch: refetchSavedCreatives } = useQuery({
    queryKey: ["saved-creatives"],
    queryFn: async () => {
      const res = await api.get("/admin/creatives/saved");
      return res.data?.data || [];
    },
  });

  const activeTemplate =
    templatesList.find((t) => t.id === designState.metadata.templateId) || templatesList[0];

  const selectedElement = designState.elements.find((e) => e.id === selectedElementId) || null;

  // Favorites toggle handler
  const handleToggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handle Photo/Logo Upload
  const uploadAssetMutation = useMutation({
    mutationFn: async ({ file, target }: { file: File; target: "leader" | "logo" }) => {
      const formData = new FormData();
      formData.append("asset", file);
      formData.append("type", target === "leader" ? "LEADER_PHOTO" : "PARTY_LOGO");
      const res = await api.post("/admin/creatives/upload-asset", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return { data: res.data, target };
    },
    onSuccess: ({ data, target }) => {
      if (data?.data?.fileUrl) {
        if (target === "leader") {
          updateBranding({ leaderPhotoUrl: data.data.fileUrl });
        } else {
          updateBranding({ partyLogoUrl: data.data.fileUrl });
        }
        toast({ title: "Image Uploaded", description: `${target === "leader" ? "Leader Photo" : "Party Logo"} updated.` });
      }
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "leader" | "logo") => {
    const file = e.target.files?.[0];
    if (file) uploadAssetMutation.mutate({ file, target });
  };

  // Handle Save
  const handleSaveDraft = async () => {
    await saveDesign();
    queryClient.invalidateQueries({ queryKey: ["saved-creatives"] });
    toast({ title: "Draft Saved", description: "Design persisted to database." });
  };

  // Handle Share Link Generation
  const handleGenerateShare = async () => {
    try {
      if (!designState.id) {
        await saveDesign();
      }
      if (designState.id) {
        const res = await api.post(`/admin/creatives/saved/${designState.id}/share`);
        const url = res.data?.data?.shareUrl || `${window.location.origin}/creatives/shared/${designState.id}`;
        setShareUrl(url);
        setShareModalOpen(true);
      } else {
        toast({ title: "Save First", description: "Please save design before generating share link." });
      }
    } catch (err) {
      toast({ title: "Share Error", description: "Could not generate share link. Try again." });
    }
  };

  // Handle Clean Multi-Format Poster Exporter (strips selection boxes completely before download)
  const handleExportFile = async (format: "png" | "jpeg" | "pdf", dpi: number) => {
    const prevSelectedId = selectedElementId;
    try {
      toast({
        title: `Exporting ${format.toUpperCase()} (${dpi} DPI)...`,
        description: "Rendering clean high-resolution poster.",
      });

      // 1. Temporarily deselect element so bounding boxes and handles are hidden
      setSelectedElementId(null);

      // 2. Wait for React to re-render DOM cleanly without selection markers
      await new Promise((resolve) => setTimeout(resolve, 150));

      const targetNode =
        document.getElementById("canvas-svg-element") ||
        document.getElementById("creative-canvas-export");

      if (!targetNode) {
        toast({
          title: "Export Error",
          description: "Canvas element not found on page.",
          variant: "destructive",
        });
        if (prevSelectedId) setSelectedElementId(prevSelectedId);
        return;
      }

      const pixelRatio = dpi / 72;
      const filter = (node: HTMLElement) => {
        if (
          node.classList?.contains("export-exclude") ||
          node.getAttribute?.("data-export-exclude") === "true"
        ) {
          return false;
        }
        return true;
      };

      let dataUrl = "";
      if (format === "jpeg") {
        dataUrl = await toJpeg(targetNode, {
          quality: 0.98,
          pixelRatio,
          backgroundColor: "#ffffff",
          filter,
        });
      } else {
        dataUrl = await toPng(targetNode, {
          quality: 0.98,
          pixelRatio,
          filter,
        });
      }

      // 3. Restore selected element for the user
      if (prevSelectedId) {
        setSelectedElementId(prevSelectedId);
      }

      const cleanTitle = designState.metadata.title
        ? designState.metadata.title.replace(/[^a-z0-9]+/gi, "_")
        : "creative_poster";
      const fileName = `${cleanTitle}.${format === "pdf" ? "png" : format}`;

      const downloadLink = document.createElement("a");
      downloadLink.href = dataUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      toast({
        title: "Download Complete!",
        description: `Saved poster as ${fileName}`,
      });
    } catch (err) {
      console.error("Export error:", err);
      if (prevSelectedId) {
        setSelectedElementId(prevSelectedId);
      }
      toast({
        title: "Export Failed",
        description: "Could not rasterize canvas. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout title="Creative Studio">
      <div className="space-y-4 pb-12 font-sans">
        {/* ── 1. TOP TITLE & ACTIONS BAR ───────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#047857] flex items-center justify-center font-bold">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  value={designState.metadata.title}
                  onChange={(e) => updateMetadata({ title: e.target.value })}
                  className="text-lg font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#047857] focus:outline-none px-1 rounded transition-colors"
                />
                <Badge variant="outline" className="text-[10px] font-bold uppercase bg-emerald-50 text-[#047857] border-emerald-200">
                  {saveStatus === "saving" ? (
                    <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>
                  ) : saveStatus === "saved" ? (
                    <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#047857]" /> Saved</span>
                  ) : (
                    "Unsaved"
                  )}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Design constituency posters, birthday greetings, meetings, and public notices in one unified studio.
              </p>
            </div>
          </div>

          {/* Top Header Action Buttons (Auto Fix removed) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200">
              <Button
                size="icon"
                variant="ghost"
                onClick={undo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="h-8 w-8 rounded-xl text-slate-700 dark:text-slate-200"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={redo}
                disabled={!canRedo}
                title="Redo (Ctrl+Shift+Z)"
                className="h-8 w-8 rounded-xl text-slate-700 dark:text-slate-200"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              className="rounded-xl font-bold text-xs bg-white shadow-sm border-slate-200"
            >
              <Save className="w-3.5 h-3.5 mr-1.5 text-slate-600" /> Save Draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateShare}
              className="rounded-xl font-bold text-xs bg-white border-slate-200 text-slate-700"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5 text-slate-600" /> Share
            </Button>
            <Button
              size="sm"
              onClick={() => setExportModalOpen(true)}
              className="rounded-xl font-bold text-xs bg-[#047857] hover:bg-[#064e3b] text-white shadow-md px-4"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Download Poster
            </Button>
          </div>
        </div>

        {/* ── 2. WORKSPACE NAVIGATION BAR ───────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setStudioView("landing")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 ${
                studioView === "landing"
                  ? "border-[#047857] text-[#047857] bg-emerald-50/50 dark:bg-emerald-950/30"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Plus className="w-4 h-4" /> Create Creative
            </button>
            <button
              onClick={() => setStudioView("templates")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
                studioView === "templates"
                  ? "border-[#047857] text-[#047857] bg-emerald-50/50 dark:bg-emerald-950/30"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Templates (4)
            </button>
            <button
              onClick={() => setStudioView("editor")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
                studioView === "editor"
                  ? "border-[#047857] text-[#047857] bg-emerald-50/50 dark:bg-emerald-950/30 shadow-xs"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Wand2 className="w-4 h-4 text-[#047857]" /> Studio Editor
            </button>
            <button
              onClick={() => setStudioView("brand")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
                studioView === "brand"
                  ? "border-[#047857] text-[#047857] bg-emerald-50/50 dark:bg-emerald-950/30"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-4 h-4" /> Brand Kit
            </button>
            <button
              onClick={() => setStudioView("saved")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
                studioView === "saved"
                  ? "border-[#047857] text-[#047857] bg-emerald-50/50 dark:bg-emerald-950/30"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <FolderHeart className="w-4 h-4" /> My Creatives ({savedCreativesData?.length || 0})
            </button>
          </div>
        </div>

        {/* ── 3. STUDIO VIEWS ───────────────────────────────────────────── */}

        {/* VIEW 1: LANDING SCREEN */}
        {studioView === "landing" && (
          <CreativeLandingScreen
            onSelectCategory={(cat: CreativeCategory) => {
              setSelectedCategory(cat);
              setStudioView("templates");
            }}
            onSelectTemplate={(tpl) => {
              loadTemplate(tpl);
              setStudioView("editor");
            }}
            recentTemplates={templatesList}
            savedCreatives={savedCreativesData || []}
            onOpenSavedCreative={(item) => {
              loadDesign(item.designJson, item.id, item.title);
              setStudioView("editor");
            }}
            onStartBlank={() => {
              startBlankCanvas("SQUARE_POST");
              setEditorTab("elements");
              setStudioView("editor");
              toast({ title: "Blank Canvas Created", description: "Start creating your design by adding text, elements, or background." });
            }}
          />
        )}

        {/* VIEW 2: 4 MASTER TEMPLATES GALLERY */}
        {studioView === "templates" && (
          <TemplateLibrary
            templates={templatesList}
            activeTemplateId={designState.metadata.templateId}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            isFullView={true}
            onSelectTemplate={(tpl) => {
              loadTemplate(tpl);
              setStudioView("editor");
            }}
            onPreviewTemplate={(tpl) => {
              setPreviewTemplate(tpl);
              setPreviewModalOpen(true);
            }}
          />
        )}

        {/* VIEW 3: BRAND KIT MANAGER */}
        {studioView === "brand" && (
          <div className="max-w-2xl mx-auto space-y-4">
            <BrandKitPanel
              onApplyBrandKit={(brandData: BrandKitData) => {
                updateBranding({
                  representativeName: brandData.representativeName,
                  designation: brandData.designation,
                  leaderPhotoUrl: brandData.leaderPhotoUrl || designState.branding.leaderPhotoUrl,
                  partyLogoUrl: brandData.partyLogoUrl || designState.branding.partyLogoUrl,
                  footerText: brandData.footerText,
                });
                updateTheme({
                  primary: brandData.colors.primary,
                  secondary: brandData.colors.secondary,
                  accent: brandData.colors.accent,
                });
                toast({ title: "Brand Kit Applied", description: "Loaded official representative profile and colors." });
              }}
            />
          </div>
        )}

        {/* VIEW 4: SAVED CREATIVES GALLERY */}
        {studioView === "saved" && (
          <SavedCreativeLibrary
            savedCreatives={savedCreativesData || []}
            onOpenCreative={(item) => {
              loadDesign(item.designJson, item.id, item.title);
              setStudioView("editor");
              toast({ title: "Design Loaded", description: `Opened: ${item.title}` });
            }}
            onDownloadCreative={(item) => {
              loadDesign(item.designJson, item.id, item.title);
              setStudioView("editor");
              setExportModalOpen(true);
            }}
            onDeleteCreative={async (id) => {
              await api.delete(`/admin/creatives/saved/${id}`);
              refetchSavedCreatives();
              toast({ title: "Deleted", description: "Design removed." });
            }}
            onDuplicateCreative={(item) => {
              loadDesign(item.designJson, undefined, `${item.title} (Copy)`);
              setStudioView("editor");
              toast({ title: "Design Duplicated", description: "Copied into workspace." });
            }}
            onShareCreative={async (id) => {
              const res = await api.post(`/admin/creatives/saved/${id}/share`);
              setShareUrl(res.data?.data?.shareUrl || `${window.location.origin}/creatives/shared/${id}`);
              setShareModalOpen(true);
            }}
          />
        )}

        {/* VIEW 5: UNIFIED STUDIO EDITOR (Merged Quick Edit + Elements + BG + Brand + Layers + Properties + Canvas) */}
        {studioView === "editor" && (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)_300px] gap-4 items-start">
            {/* ── LEFT SIDEBAR TABS (Content, Elements, BG, Brand, Layers) ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setEditorTab("content")}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold flex-1 transition-all ${
                    editorTab === "content" ? "bg-white shadow text-[#047857]" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Content
                </button>
                <button
                  onClick={() => setEditorTab("elements")}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold flex-1 transition-all ${
                    editorTab === "elements" ? "bg-white shadow text-[#047857]" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Elements
                </button>
                <button
                  onClick={() => setEditorTab("background")}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold flex-1 transition-all ${
                    editorTab === "background" ? "bg-white shadow text-[#047857]" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  BG
                </button>
                <button
                  onClick={() => setEditorTab("brand")}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold flex-1 transition-all ${
                    editorTab === "brand" ? "bg-white shadow text-[#047857]" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Brand
                </button>
                <button
                  onClick={() => setEditorTab("layers")}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold flex-1 transition-all ${
                    editorTab === "layers" ? "bg-white shadow text-[#047857]" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Layers
                </button>
              </div>

              {/* TAB 1: CONTENT / QUICK EDIT FIELDS */}
              {editorTab === "content" && (
                <DynamicQuickEditor
                  activeTemplate={activeTemplate}
                  schema={activeTemplate.quickEditSchema}
                  slotValues={designState.slotValues}
                  onSetSlotValue={setSlotValue}
                  branding={designState.branding}
                  onUpdateBranding={updateBranding}
                  onFileUpload={handleFileUpload}
                />
              )}

              {/* TAB 2: TEXT & STICKER ELEMENTS */}
              {editorTab === "elements" && (
                <TextElementsPanel
                  onAddElement={(element) => {
                    addElement(element);
                    toast({ title: "Element Added", description: `Inserted ${element.name || "element"} onto canvas.` });
                  }}
                />
              )}

              {/* TAB 3: BACKGROUND PICKER */}
              {editorTab === "background" && (
                <BackgroundPanel
                  canvasBackground={designState.canvas.background}
                  setCanvasBackground={(bg) => updateCanvas({ background: bg })}
                />
              )}

              {/* TAB 4: BRAND KIT PROFILE */}
              {editorTab === "brand" && (
                <BrandKitPanel
                  onApplyBrandKit={(brandData: BrandKitData) => {
                    updateBranding({
                      representativeName: brandData.representativeName,
                      designation: brandData.designation,
                      leaderPhotoUrl: brandData.leaderPhotoUrl || designState.branding.leaderPhotoUrl,
                      partyLogoUrl: brandData.partyLogoUrl || designState.branding.partyLogoUrl,
                      footerText: brandData.footerText,
                    });
                    toast({ title: "Brand Applied", description: "Official branding updated on poster." });
                  }}
                />
              )}

              {/* TAB 5: LAYERS MANAGER */}
              {editorTab === "layers" && (
                <LayersPanel
                  layers={designState.elements}
                  selectedLayerId={selectedElementId}
                  onSelectLayer={(id) => setSelectedElementId(id)}
                  onUpdateLayer={(id, updated) => updateElement(id, updated)}
                  onDeleteLayer={(id) => deleteElement(id)}
                  onDuplicateLayer={(id) => duplicateElement(id)}
                  onMoveLayer={(index, dir) => {
                    const elem = designState.elements[index];
                    if (elem) reorderElement(elem.id, dir === "up" ? "up" : "down");
                  }}
                  onAddTextLayer={() => addElement({ type: "text", text: "New Text Element", fontSize: 28 })}
                />
              )}
            </div>

            {/* ── CENTER LIVE CANVAS WORKSPACE ───────────────────────── */}
            <div className="space-y-3">
              <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                <CardContent className="p-4 space-y-3">
                  {/* Format Switcher (Safe Line removed) */}
                  <FormatSwitcher
                    selectedFormat={designState.metadata.format}
                    onSelectFormat={(fmtId) => changeFormat(fmtId as CreativeFormat)}
                  />

                  {/* Real-Time Interactive Canvas */}
                  <CreativeCanvas
                    canvasWidth={designState.canvas.width}
                    canvasHeight={designState.canvas.height}
                    canvasBackground={designState.canvas.background}
                    elements={designState.elements}
                    selectedElementId={selectedElementId}
                    onSelectElement={setSelectedElementId}
                    onUpdateElement={updateElement}
                    onDeleteElement={deleteElement}
                    onDuplicateElement={duplicateElement}
                  />
                </CardContent>
              </Card>
            </div>

            {/* ── RIGHT PROPERTIES INSPECTOR / QUICK ACTIONS ─────────── */}
            <div>
              {selectedElement ? (
                <ElementPropertiesPanel
                  selectedElement={selectedElement}
                  onUpdateElement={(updated) => {
                    if (selectedElementId) updateElement(selectedElementId, updated);
                  }}
                  onReorderElement={(dir) => {
                    if (selectedElementId) reorderElement(selectedElementId, dir);
                  }}
                />
              ) : (
                <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                  <CardContent className="p-4 space-y-4 text-xs">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b pb-2 border-slate-100 dark:border-slate-800">
                      <MousePointerClick className="w-4 h-4 text-[#047857]" /> Element Inspector
                    </div>

                    <p className="text-slate-500 leading-relaxed">
                      Click any element on the canvas to edit its position, font size, colors, opacity, alignment, or rotation.
                    </p>

                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-1.5">
                      <div className="font-bold text-[#047857] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Quick Tips:
                      </div>
                      <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-3.5">
                        <li>Drag elements to reposition freely.</li>
                        <li>Use corner circles to resize.</li>
                        <li>Use top handle to rotate.</li>
                        <li>Switch tabs on left to modify content or background.</li>
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Total Canvas Layers:</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {designState.elements.length}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Current Resolution:</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {designState.canvas.width} × {designState.canvas.height} px
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ────────────────────────────────────────────────── */}
      <TemplatePreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        template={previewTemplate}
        onUseTemplate={(tpl) => {
          loadTemplate(tpl);
          setStudioView("editor");
        }}
      />

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        headingText={designState.metadata.title}
        selectedFormat={designState.metadata.format}
        onExport={handleExportFile}
      />

      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Share2 className="w-5 h-5 text-[#047857]" /> Share Poster Preview Link
            </DialogTitle>
            <DialogDescription className="text-xs">
              Anyone with this token link can view the poster preview.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-2">
            <Input value={shareUrl} readOnly className="rounded-xl text-xs font-mono" />
            <Button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast({ title: "Copied!", description: "URL copied to clipboard." });
              }}
              className="rounded-xl bg-[#047857] hover:bg-[#064e3b] text-white font-bold"
            >
              Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

export default function CreativeStudioPage() {
  return (
    <CreativeDesignProvider>
      <CreativeStudioInner />
    </CreativeDesignProvider>
  );
}
