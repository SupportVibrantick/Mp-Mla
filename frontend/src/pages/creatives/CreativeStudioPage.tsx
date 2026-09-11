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
import { CreativeRenderer } from "@/components/creatives/CreativeRenderer";
import { TextElementsPanel } from "@/components/creatives/TextElementsPanel";
import { BrandKitPanel, BrandKitData } from "@/components/creatives/BrandKitPanel";
import { BackgroundPanel } from "@/components/creatives/BackgroundPanel";
import { LayersPanel } from "@/components/creatives/LayersPanel";
import { ElementPropertiesPanel } from "@/components/creatives/ElementPropertiesPanel";
import { FormatSwitcher } from "@/components/creatives/FormatSwitcher";
import { DesignHealthInspector } from "@/components/creatives/DesignHealthInspector";

import {
  SlidersHorizontal,
  Building2,
  Share2,
  Download,
  Save,
  LayoutGrid,
  Undo2,
  Redo2,
  Sparkles,
  FolderHeart,
  Wand2,
  Palette,
  Check,
  Loader2,
  Plus,
} from "lucide-react";

type StudioView = "landing" | "templates" | "quick" | "advanced" | "brand" | "saved";

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
    updateSettings,
    setSlotValue,
    loadTemplate,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    reorderElement,
    changeFormat,
    autoFixLayout,
    undo,
    redo,
    saveDesign,
    loadDesign,
  } = useCreativeDesign();

  // SINGLE UNIFIED STUDIO VIEW STATE
  const [studioView, setStudioView] = useState<StudioView>("landing");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [favorites, setFavorites] = useState<string[]>([]);

  // Modals
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<CreativeTemplateDef | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  // Advanced Left Tool Drawer
  const [advancedLeftTab, setAdvancedLeftTab] = useState<"templates" | "text" | "elements" | "background" | "brand" | "layers">("templates");

  // Fetch Backend Templates
  const { data: backendTemplates } = useQuery({
    queryKey: ["creative-templates"],
    queryFn: async () => {
      try {
        const res = await api.get("/admin/creatives/templates");
        return res.data?.data || [];
      } catch (err) {
        return [];
      }
    },
  });

  const templatesList: CreativeTemplateDef[] =
    backendTemplates && backendTemplates.length > 0 ? backendTemplates : MASTER_CREATIVE_TEMPLATES;

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

  // Handle Multi-Format Real Canvas Exporter using html-to-image
  const handleExportFile = async (format: "png" | "jpeg" | "pdf", dpi: number) => {
    try {
      toast({
        title: `Exporting ${format.toUpperCase()} (${dpi} DPI)...`,
        description: "Generating high-resolution poster render.",
      });

      const targetNode =
        document.getElementById("canvas-svg-element") ||
        document.getElementById("creative-canvas-export");

      if (!targetNode) {
        toast({
          title: "Export Error",
          description: "Canvas element not found on page.",
          variant: "destructive",
        });
        return;
      }

      const pixelRatio = dpi / 72;
      let dataUrl = "";

      if (format === "jpeg") {
        dataUrl = await toJpeg(targetNode, {
          quality: 0.95,
          pixelRatio,
          backgroundColor: "#ffffff",
        });
      } else {
        dataUrl = await toPng(targetNode, {
          quality: 0.98,
          pixelRatio,
        });
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
      toast({
        title: "Export Failed",
        description: "Could not rasterize canvas. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout title="Creative Studio">
      <div className="space-y-5 pb-12 font-sans">
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
                Create professional constituency posters, announcements and social media creatives.
              </p>
            </div>
          </div>

          {/* Top Header Action Buttons */}
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
              onClick={autoFixLayout}
              className="rounded-xl text-xs font-bold border-emerald-200 text-[#047857] hover:bg-emerald-50"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Auto Fix
            </Button>
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
              <Download className="w-3.5 h-3.5 mr-1.5" /> Download
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
              <LayoutGrid className="w-4 h-4" /> Templates
            </button>
            <button
              onClick={() => setStudioView("quick")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
                studioView === "quick"
                  ? "border-[#047857] text-[#047857] bg-emerald-50/50 dark:bg-emerald-950/30"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" /> Quick Edit
            </button>
            <button
              onClick={() => setStudioView("advanced")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
                studioView === "advanced"
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Wand2 className="w-4 h-4" /> Advanced Editor
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
              setStudioView("quick");
            }}
            recentTemplates={templatesList}
            savedCreatives={savedCreativesData || []}
            onOpenSavedCreative={(item) => {
              loadDesign(item.designJson, item.id, item.title);
              setStudioView("quick");
            }}
            onStartBlank={() => {
              setStudioView("quick");
            }}
          />
        )}

        {/* VIEW 2: TEMPLATES BROWSER GALLERY */}
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
              setStudioView("quick");
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
              setStudioView("quick");
              toast({ title: "Design Loaded", description: `Opened: ${item.title}` });
            }}
            onSubmitApproval={async (id) => {
              await api.post(`/admin/creatives/saved/${id}/submit`);
              refetchSavedCreatives();
              toast({ title: "Submitted", description: "Sent to manager review queue." });
            }}
            onDeleteCreative={async (id) => {
              await api.delete(`/admin/creatives/saved/${id}`);
              refetchSavedCreatives();
              toast({ title: "Deleted", description: "Design removed." });
            }}
            onDuplicateCreative={(item) => {
              loadDesign(item.designJson, undefined, `${item.title} (Copy)`);
              setStudioView("quick");
              toast({ title: "Design Duplicated", description: "Copied into workspace." });
            }}
            onShareCreative={async (id) => {
              const res = await api.post(`/admin/creatives/saved/${id}/share`);
              setShareUrl(res.data?.data?.shareUrl || `${window.location.origin}/creatives/shared/${id}`);
              setShareModalOpen(true);
            }}
          />
        )}

        {/* VIEW 5: QUICK EDIT WORKSPACE */}
        {studioView === "quick" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Dynamic Quick Edit Form Panel */}
            <div className="lg:col-span-5 space-y-4">
              <DynamicQuickEditor
                activeTemplate={activeTemplate}
                schema={activeTemplate.quickEditSchema}
                slotValues={designState.slotValues}
                onSetSlotValue={setSlotValue}
                branding={designState.branding}
                onUpdateBranding={updateBranding}
                onFileUpload={handleFileUpload}
                onOpenAdvancedEdit={() => setStudioView("advanced")}
              />
            </div>

            {/* Live Canvas Preview Panel */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-slate-900 dark:text-white text-base">Live Creative Canvas</h2>
                    <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 text-slate-600">
                      {designState.canvas.width} × {designState.canvas.height} px
                    </Badge>
                  </div>

                  {/* Format Switcher */}
                  <FormatSwitcher
                    selectedFormat={designState.metadata.format}
                    onSelectFormat={(fmtId) => changeFormat(fmtId as CreativeFormat)}
                    showSafeArea={designState.settings.showSafeArea}
                    setShowSafeArea={(show) => updateSettings({ showSafeArea: show })}
                  />

                  {/* Design Health Inspector */}
                  <DesignHealthInspector
                    elements={designState.elements}
                    canvasWidth={designState.canvas.width}
                    canvasHeight={designState.canvas.height}
                    onAutoFix={autoFixLayout}
                  />

                  {/* Real Time Canvas Renderer */}
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
                    showSafeArea={designState.settings.showSafeArea}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* VIEW 6: ADVANCED EDITOR WORKSPACE (Canvas Dominated Layout) */}
        {studioView === "advanced" && (
          <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_300px] gap-4 items-start">
            {/* LEFT DRAWER TOOLS */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                <button
                  onClick={() => setAdvancedLeftTab("templates")}
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-bold flex-1 transition-all ${
                    advancedLeftTab === "templates" ? "bg-white shadow text-[#047857]" : "text-slate-600"
                  }`}
                >
                  Templates
                </button>
                <button
                  onClick={() => setAdvancedLeftTab("elements")}
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-bold flex-1 transition-all ${
                    advancedLeftTab === "elements" ? "bg-white shadow text-[#047857]" : "text-slate-600"
                  }`}
                >
                  Elements
                </button>
                <button
                  onClick={() => setAdvancedLeftTab("background")}
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-bold flex-1 transition-all ${
                    advancedLeftTab === "background" ? "bg-white shadow text-[#047857]" : "text-slate-600"
                  }`}
                >
                  BG
                </button>
                <button
                  onClick={() => setAdvancedLeftTab("brand")}
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-bold flex-1 transition-all ${
                    advancedLeftTab === "brand" ? "bg-white shadow text-[#047857]" : "text-slate-600"
                  }`}
                >
                  Brand
                </button>
                <button
                  onClick={() => setAdvancedLeftTab("layers")}
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-bold flex-1 transition-all ${
                    advancedLeftTab === "layers" ? "bg-white shadow text-[#047857]" : "text-slate-600"
                  }`}
                >
                  Layers
                </button>
              </div>

              {advancedLeftTab === "templates" && (
                <TemplateLibrary
                  templates={templatesList}
                  activeTemplateId={designState.metadata.templateId}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  onSelectTemplate={(tpl) => loadTemplate(tpl)}
                  onPreviewTemplate={(tpl) => {
                    setPreviewTemplate(tpl);
                    setPreviewModalOpen(true);
                  }}
                />
              )}

              {advancedLeftTab === "elements" && (
                <TextElementsPanel
                  onAddElement={(element) => {
                    addElement(element);
                    toast({ title: "Element Inserted", description: `Added ${element.name || "element"} to canvas.` });
                  }}
                />
              )}

              {advancedLeftTab === "background" && (
                <BackgroundPanel
                  canvasBackground={designState.canvas.background}
                  setCanvasBackground={(bg) => updateCanvas({ background: bg })}
                />
              )}

              {advancedLeftTab === "brand" && (
                <BrandKitPanel
                  onApplyBrandKit={(brandData: BrandKitData) => {
                    updateBranding({
                      representativeName: brandData.representativeName,
                      designation: brandData.designation,
                      leaderPhotoUrl: brandData.leaderPhotoUrl || designState.branding.leaderPhotoUrl,
                      partyLogoUrl: brandData.partyLogoUrl || designState.branding.partyLogoUrl,
                      footerText: brandData.footerText,
                    });
                    toast({ title: "Brand Applied", description: "Official branding updated." });
                  }}
                />
              )}

              {advancedLeftTab === "layers" && (
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
                  onAddTextLayer={() => addElement({ type: "text", text: "New Layer Text", fontSize: 24 })}
                />
              )}
            </div>

            {/* CENTER CANVAS WORKSPACE */}
            <div className="space-y-3">
              <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                <CardContent className="p-4 space-y-3">
                  <FormatSwitcher
                    selectedFormat={designState.metadata.format}
                    onSelectFormat={(fmtId) => changeFormat(fmtId as CreativeFormat)}
                    showSafeArea={designState.settings.showSafeArea}
                    setShowSafeArea={(show) => updateSettings({ showSafeArea: show })}
                  />

                  <DesignHealthInspector
                    elements={designState.elements}
                    canvasWidth={designState.canvas.width}
                    canvasHeight={designState.canvas.height}
                    onAutoFix={autoFixLayout}
                  />

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
                    showSafeArea={designState.settings.showSafeArea}
                  />
                </CardContent>
              </Card>
            </div>

            {/* RIGHT ELEMENT PROPERTIES INSPECTOR */}
            <div>
              <ElementPropertiesPanel
                selectedElement={selectedElement}
                onUpdateElement={(updated) => {
                  if (selectedElementId) updateElement(selectedElementId, updated);
                }}
                onReorderElement={(dir) => {
                  if (selectedElementId) reorderElement(selectedElementId, dir);
                }}
              />
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
          setStudioView("quick");
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
