import React from "react";
import { Trash2, ArrowUp, ArrowDown, Palette, Type, Layers, Plus, ChevronRight } from "lucide-react";
import { ImageUploadField } from "@/components/common/ImageUploadField";
import { SectionBlock } from "../types";

interface SectionInspectorProps {
  section: SectionBlock | null;
  onUpdate: (updated: SectionBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  websiteId?: string;
}

export const SectionInspector: React.FC<SectionInspectorProps> = ({
  section,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  websiteId,
}) => {
  if (!section) {
    return (
      <div className="p-6 text-center text-slate-500 dark:text-slate-400">
        <Layers className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className="font-medium text-sm">Select any section on the canvas</p>
        <p className="text-xs mt-1">Click on a block to configure its content, styling, and data link.</p>
      </div>
    );
  }

  const handlePropChange = (key: string, value: any) => {
    onUpdate({
      ...section,
      props: {
        ...section.props,
        [key]: value,
      },
    });
  };

  const handleStyleChange = (key: string, value: any) => {
    onUpdate({
      ...section,
      styles: {
        ...section.styles,
        [key]: value,
      },
    });
  };

  // Helper for array item updates
  const handleArrayItemChange = (arrayKey: string, index: number, field: string, value: any, defaultItems: any[] = []) => {
    const currentList = Array.isArray(section.props[arrayKey]) ? [...section.props[arrayKey]] : [...defaultItems];
    if (!currentList[index]) {
      currentList[index] = {};
    }
    currentList[index] = {
      ...currentList[index],
      [field]: value,
    };
    handlePropChange(arrayKey, currentList);
  };

  const handleAddArrayItem = (arrayKey: string, newItem: any, defaultItems: any[] = []) => {
    const currentList = Array.isArray(section.props[arrayKey]) ? [...section.props[arrayKey]] : [...defaultItems];
    currentList.push(newItem);
    handlePropChange(arrayKey, currentList);
  };

  const handleRemoveArrayItem = (arrayKey: string, index: number, defaultItems: any[] = []) => {
    const currentList = Array.isArray(section.props[arrayKey]) ? [...section.props[arrayKey]] : [...defaultItems];
    currentList.splice(index, 1);
    handlePropChange(arrayKey, currentList);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            Section Inspector
          </span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
            {section.type.replace(/[-_]/g, " ")} Block
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
            title="Move Section Up"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
            title="Move Section Down"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            title="Delete Section"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Content Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Type className="w-4 h-4 text-orange-500" />
            <span>Content & Text</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Heading / Title
            </label>
            <input
              type="text"
              value={section.props.title || section.props.headline || ""}
              onChange={(e) => {
                handlePropChange("title", e.target.value);
                if (section.type.includes("hero")) {
                  handlePropChange("headline", e.target.value);
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Section main heading"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Subtitle / Description
            </label>
            <textarea
              rows={2}
              value={section.props.subtitle || section.props.subheadline || ""}
              onChange={(e) => {
                handlePropChange("subtitle", e.target.value);
                if (section.type.includes("hero")) {
                  handlePropChange("subheadline", e.target.value);
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Section description"
            />
          </div>

          {/* NAVBAR SECTION */}
          {section.type === "navbar" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Brand / Representative Name
                </label>
                <input
                  type="text"
                  value={section.props.brandName || ""}
                  onChange={(e) => handlePropChange("brandName", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. Constituency Portal / MLA Office"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Subtitle / Constituency Tag
                </label>
                <input
                  type="text"
                  value={section.props.brandSubtitle || ""}
                  onChange={(e) => handlePropChange("brandSubtitle", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. Official Representative Portal"
                />
              </div>
              <div>
                <ImageUploadField
                  label="Logo Image / Official Emblem"
                  value={section.props.logoUrl || ""}
                  onChange={(url) => handlePropChange("logoUrl", url)}
                  websiteId={websiteId}
                  helperText="Upload official emblem, party symbol, or representative logo."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Helpline Hotline Number
                </label>
                <input
                  type="text"
                  value={section.props.helplineText || ""}
                  onChange={(e) => handlePropChange("helplineText", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="1800-889-2024"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Action Button Label
                </label>
                <input
                  type="text"
                  value={section.props.primaryButtonText || ""}
                  onChange={(e) => handlePropChange("primaryButtonText", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Lodge Grievance"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Action Button Link
                </label>
                <input
                  type="text"
                  value={section.props.primaryButtonLink || ""}
                  onChange={(e) => handlePropChange("primaryButtonLink", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="#grievance"
                />
              </div>
            </>
          )}

          {/* FOOTER SECTION */}
          {section.type === "footer" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Brand / Secretariat Name
                </label>
                <input
                  type="text"
                  value={section.props.brandName || ""}
                  onChange={(e) => handlePropChange("brandName", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. Constituency Secretariat"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={section.props.brandSubtitle || ""}
                  onChange={(e) => handlePropChange("brandSubtitle", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Official Representative Portal"
                />
              </div>
              <div>
                <ImageUploadField
                  label="Footer Logo (Optional)"
                  value={section.props.logoUrl || ""}
                  onChange={(url) => handlePropChange("logoUrl", url)}
                  websiteId={websiteId}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Mission / Vision Statement
                </label>
                <textarea
                  rows={2}
                  value={section.props.description || ""}
                  onChange={(e) => handlePropChange("description", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Dedicated to transparent governance..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Office Address
                </label>
                <input
                  type="text"
                  value={section.props.officeAddress || ""}
                  onChange={(e) => handlePropChange("officeAddress", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Central Secretariat & Camp Office, Civil Lines"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Helpline Hotline
                  </label>
                  <input
                    type="text"
                    value={section.props.helpline || ""}
                    onChange={(e) => handlePropChange("helpline", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="1800-889-2024"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={section.props.email || ""}
                    onChange={(e) => handlePropChange("email", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="office@constituency.gov.in"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={section.props.primaryButtonText || ""}
                    onChange={(e) => handlePropChange("primaryButtonText", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Lodge a Grievance"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Button Link
                  </label>
                  <input
                    type="text"
                    value={section.props.primaryButtonLink || ""}
                    onChange={(e) => handlePropChange("primaryButtonLink", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="#grievance"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Copyright Notice
                </label>
                <input
                  type="text"
                  value={section.props.copyrightText || ""}
                  onChange={(e) => handlePropChange("copyrightText", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="© 2026 Constituency Portal. All Rights Reserved."
                />
              </div>
            </>
          )}

          {/* HERO SECTION */}
          {(section.type === "hero" || section.type === "representative-hero" || section.type === "representative_hero" || section.type === "dev-hero") && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Tagline / Top Badge
                </label>
                <input
                  type="text"
                  value={section.props.tagline || section.props.badge || ""}
                  onChange={(e) => {
                    handlePropChange("tagline", e.target.value);
                    handlePropChange("badge", e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. Dedicated to Serving Our Constituency"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Leader Name
                  </label>
                  <input
                    type="text"
                    value={section.props.leaderName || ""}
                    onChange={(e) => handlePropChange("leaderName", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. Shri Mayank Goyal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Leader Title / Designation
                  </label>
                  <input
                    type="text"
                    value={section.props.leaderTitle || ""}
                    onChange={(e) => handlePropChange("leaderTitle", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. MLA / Member of Parliament"
                  />
                </div>
              </div>
              <div>
                <ImageUploadField
                  label="Leader Portrait Photo"
                  value={section.props.leaderImage || section.props.imageUrl || ""}
                  onChange={(url) => {
                    handlePropChange("leaderImage", url);
                    handlePropChange("imageUrl", url);
                  }}
                  websiteId={websiteId}
                  helperText="Upload official high-resolution photo of the representative."
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Primary Button Text
                  </label>
                  <input
                    type="text"
                    value={section.props.primaryButtonText || ""}
                    onChange={(e) => handlePropChange("primaryButtonText", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Lodge Grievance"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Primary Button Link
                  </label>
                  <input
                    type="text"
                    value={section.props.primaryButtonLink || ""}
                    onChange={(e) => handlePropChange("primaryButtonLink", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="#grievance"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Secondary Button Text
                  </label>
                  <input
                    type="text"
                    value={section.props.secondaryButtonText || ""}
                    onChange={(e) => handlePropChange("secondaryButtonText", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Explore Projects"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Secondary Button Link
                  </label>
                  <input
                    type="text"
                    value={section.props.secondaryButtonLink || ""}
                    onChange={(e) => handlePropChange("secondaryButtonLink", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="#projects"
                  />
                </div>
              </div>
            </>
          )}

          {/* REPRESENTATIVE PROFILE / BIO SECTION */}
          {(section.type === "representative_profile" ||
            section.type === "representative-profile" ||
            section.type === "about-bio" ||
            section.type === "about_bio" ||
            section.type === "about" ||
            section.type === "about_representative" ||
            section.type === "about-representative") && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Tagline / Badge
                </label>
                <input
                  type="text"
                  value={section.props.tagline || ""}
                  onChange={(e) => handlePropChange("tagline", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. Leadership & Vision"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Leader Name
                  </label>
                  <input
                    type="text"
                    value={section.props.leaderName || ""}
                    onChange={(e) => handlePropChange("leaderName", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Hon'ble Representative"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Official Title
                  </label>
                  <input
                    type="text"
                    value={section.props.leaderTitle || ""}
                    onChange={(e) => handlePropChange("leaderTitle", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Member of Legislative Assembly / Parliament"
                  />
                </div>
              </div>
              <div>
                <ImageUploadField
                  label="Representative Portrait Photo"
                  value={section.props.leaderImage || section.props.imageUrl || ""}
                  onChange={(url) => {
                    handlePropChange("leaderImage", url);
                    handlePropChange("imageUrl", url);
                  }}
                  websiteId={websiteId}
                  helperText="Upload official profile photo."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Biography & Journey
                </label>
                <textarea
                  rows={4}
                  value={section.props.bio || section.props.subtitle || ""}
                  onChange={(e) => {
                    handlePropChange("bio", e.target.value);
                    handlePropChange("subtitle", e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Dedicated public servant committed to grassroots empowerment..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Years of Service
                  </label>
                  <input
                    type="text"
                    value={section.props.experienceYears || ""}
                    onChange={(e) => handlePropChange("experienceYears", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="15+"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Region / Constituency
                  </label>
                  <input
                    type="text"
                    value={section.props.constituencyName || ""}
                    onChange={(e) => handlePropChange("constituencyName", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Constituency Region"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Primary Button Text
                  </label>
                  <input
                    type="text"
                    value={section.props.primaryButtonText || ""}
                    onChange={(e) => handlePropChange("primaryButtonText", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Meet at Janata Darbar"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Primary Button Link
                  </label>
                  <input
                    type="text"
                    value={section.props.primaryButtonLink || ""}
                    onChange={(e) => handlePropChange("primaryButtonLink", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="#events"
                  />
                </div>
              </div>
            </>
          )}

          {/* STATS SECTION */}
          {(section.type === "stats" || section.type === "constituency-stats" || section.type === "constituency_stats") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Stats & Impact Counters
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleAddArrayItem("items", { value: "100+", label: "New Metric" }, [
                      { value: "520+", label: "Development Works" },
                      { value: "₹ 145 Cr", label: "Funds Sanctioned" },
                      { value: "18,400+", label: "Grievances Resolved" },
                      { value: "99.1%", label: "Citizen Satisfaction" },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Counter
                </button>
              </div>

              {(
                section.props.items || [
                  { value: "520+", label: "Development Works" },
                  { value: "₹ 145 Cr", label: "Funds Sanctioned" },
                  { value: "18,400+", label: "Grievances Resolved" },
                  { value: "99.1%", label: "Citizen Satisfaction" },
                ]
              ).map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 space-y-2 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Stat #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveArrayItem("items", idx)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={item.value || ""}
                      onChange={(e) => handleArrayItemChange("items", idx, "value", e.target.value)}
                      placeholder="Value (e.g. 520+)"
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    />
                    <input
                      type="text"
                      value={item.label || ""}
                      onChange={(e) => handleArrayItemChange("items", idx, "label", e.target.value)}
                      placeholder="Label (e.g. Projects)"
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SCHEMES SECTION */}
          {(section.type === "schemes" ||
            section.type === "government-schemes" ||
            section.type === "government_schemes" ||
            section.type === "schemes-preview") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Government Schemes Cards
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleAddArrayItem(
                      "schemes",
                      {
                        title: "New Welfare Scheme",
                        category: "Welfare",
                        department: "Govt. Department",
                        benefits: "Direct financial / welfare subsidy assistance.",
                        eligibilityCriteria: "Constituency residents meeting criteria.",
                        applyLink: "#apply",
                      },
                      [
                        {
                          title: "Pradhan Mantri Awas Yojana (PMAY)",
                          category: "Housing",
                          department: "Urban Development",
                          benefits: "Financial subsidy up to ₹ 2.67 Lakh for pucca housing.",
                          eligibilityCriteria: "EWS / LIG families without existing pucca house.",
                        },
                        {
                          title: "Ayushman Bharat Health Card",
                          category: "Healthcare",
                          department: "Health & Family Welfare",
                          benefits: "Cashless secondary & tertiary hospital care up to ₹ 5 Lakh/year.",
                          eligibilityCriteria: "Families identified under SECC socio-economic database.",
                        },
                        {
                          title: "Chief Minister Youth Employment Scheme",
                          category: "Youth & Skill",
                          department: "Skill Development",
                          benefits: "Collateral-free subsidized loan for micro-enterprises.",
                          eligibilityCriteria: "Age 18-35, minimum 10th pass resident of constituency.",
                        },
                      ]
                    )
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Scheme
                </button>
              </div>

              {(
                section.props.schemes || [
                  {
                    title: "Pradhan Mantri Awas Yojana (PMAY)",
                    category: "Housing",
                    department: "Urban Development",
                    benefits: "Financial subsidy up to ₹ 2.67 Lakh for pucca housing.",
                    eligibilityCriteria: "EWS / LIG families without existing pucca house.",
                  },
                  {
                    title: "Ayushman Bharat Health Card",
                    category: "Healthcare",
                    department: "Health & Family Welfare",
                    benefits: "Cashless secondary & tertiary hospital care up to ₹ 5 Lakh/year.",
                    eligibilityCriteria: "Families identified under SECC socio-economic database.",
                  },
                  {
                    title: "Chief Minister Youth Employment Scheme",
                    category: "Youth & Skill",
                    department: "Skill Development",
                    benefits: "Collateral-free subsidized loan for micro-enterprises.",
                    eligibilityCriteria: "Age 18-35, minimum 10th pass resident of constituency.",
                  },
                ]
              ).map((scheme: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 space-y-2.5 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                      Scheme #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveArrayItem("schemes", idx)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Scheme Name</label>
                    <input
                      type="text"
                      value={scheme.title || ""}
                      onChange={(e) => handleArrayItemChange("schemes", idx, "title", e.target.value)}
                      placeholder="Scheme Name"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Category Tag</label>
                      <input
                        type="text"
                        value={scheme.category || ""}
                        onChange={(e) => handleArrayItemChange("schemes", idx, "category", e.target.value)}
                        placeholder="e.g. Housing, Health"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Department</label>
                      <input
                        type="text"
                        value={scheme.department || ""}
                        onChange={(e) => handleArrayItemChange("schemes", idx, "department", e.target.value)}
                        placeholder="e.g. Urban Development"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Key Benefits</label>
                    <textarea
                      rows={2}
                      value={scheme.benefits || ""}
                      onChange={(e) => handleArrayItemChange("schemes", idx, "benefits", e.target.value)}
                      placeholder="Financial subsidy / benefits details..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Eligibility Criteria</label>
                    <input
                      type="text"
                      value={scheme.eligibilityCriteria || ""}
                      onChange={(e) => handleArrayItemChange("schemes", idx, "eligibilityCriteria", e.target.value)}
                      placeholder="Who is eligible..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PROJECTS SECTION */}
          {(section.type === "projects" ||
            section.type === "development-projects" ||
            section.type === "development_projects" ||
            section.type === "all-projects" ||
            section.type === "dev-projects") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Development Projects Cards
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleAddArrayItem(
                      "projects",
                      {
                        title: "New Constituency Project",
                        category: "Infrastructure",
                        status: "IN_PROGRESS",
                        location: "Main Ward Area",
                        budget: 10000000,
                        description: "Initiative aimed at infrastructure improvement.",
                      },
                      [
                        {
                          title: "Smart Flyover & Highway Widening",
                          category: "Infrastructure",
                          budget: 15000000,
                          status: "IN_PROGRESS",
                          location: "Main Transit Highway",
                          description: "Decongesting prime city corridor with 6-lane elevated express corridor.",
                        },
                        {
                          title: "200-Bed Multi-Specialty Hospital Wing",
                          category: "Healthcare",
                          budget: 35000000,
                          status: "COMPLETED",
                          location: "District Civil Hospital",
                          description: "Equipped with advanced emergency ICU, Dialysis, and Mother & Child wing.",
                        },
                        {
                          title: "Clean Drinking Water RO Pipeline",
                          category: "Water Supply",
                          budget: 8500000,
                          status: "IN_PROGRESS",
                          location: "Wards 10 to 22",
                          description: "24x7 treated potable drinking water supply network connecting 10,000 households.",
                        },
                      ]
                    )
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Project
                </button>
              </div>

              {(
                section.props.projects || [
                  {
                    title: "Smart Flyover & Highway Widening",
                    category: "Infrastructure",
                    budget: 15000000,
                    status: "IN_PROGRESS",
                    location: "Main Transit Highway",
                    description: "Decongesting prime city corridor with 6-lane elevated express corridor.",
                  },
                  {
                    title: "200-Bed Multi-Specialty Hospital Wing",
                    category: "Healthcare",
                    budget: 35000000,
                    status: "COMPLETED",
                    location: "District Civil Hospital",
                    description: "Equipped with advanced emergency ICU, Dialysis, and Mother & Child wing.",
                  },
                  {
                    title: "Clean Drinking Water RO Pipeline",
                    category: "Water Supply",
                    budget: 8500000,
                    status: "IN_PROGRESS",
                    location: "Wards 10 to 22",
                    description: "24x7 treated potable drinking water supply network connecting 10,000 households.",
                  },
                ]
              ).map((project: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                      Project #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveArrayItem("projects", idx)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Project Title</label>
                    <input
                      type="text"
                      value={project.title || ""}
                      onChange={(e) => handleArrayItemChange("projects", idx, "title", e.target.value)}
                      placeholder="Project Title"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Category</label>
                      <input
                        type="text"
                        value={project.category || ""}
                        onChange={(e) => handleArrayItemChange("projects", idx, "category", e.target.value)}
                        placeholder="e.g. Infrastructure"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Status</label>
                      <select
                        value={project.status || "IN_PROGRESS"}
                        onChange={(e) => handleArrayItemChange("projects", idx, "status", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="SANCTIONED">Sanctioned</option>
                        <option value="PLANNED">Planned</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Location / Ward</label>
                      <input
                        type="text"
                        value={project.location || ""}
                        onChange={(e) => handleArrayItemChange("projects", idx, "location", e.target.value)}
                        placeholder="Ward / Area"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Budget (₹)</label>
                      <input
                        type="number"
                        value={project.budget || ""}
                        onChange={(e) => handleArrayItemChange("projects", idx, "budget", Number(e.target.value))}
                        placeholder="15000000"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Description</label>
                    <textarea
                      rows={2}
                      value={project.description || ""}
                      onChange={(e) => handleArrayItemChange("projects", idx, "description", e.target.value)}
                      placeholder="Project details..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EVENTS SECTION */}
          {(section.type === "events" ||
            section.type === "upcoming-events" ||
            section.type === "upcoming_events" ||
            section.type === "events-preview") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Public Events & Hearings
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleAddArrayItem(
                      "events",
                      {
                        title: "Public Interaction Camp",
                        startDate: "Upcoming Weekend",
                        location: "Community Center",
                        description: "Open grievance and consultation program for constituency residents.",
                      },
                      [
                        {
                          title: "Janata Darbar & Public Hearing",
                          startDate: "Every Monday & Thursday",
                          location: "Constituency Central Camp Office",
                          description: "Open interaction with citizens to address local grievances and petitions.",
                        },
                        {
                          title: "Free Mega Health & Eye Checkup Camp",
                          startDate: "Upcoming Sunday, 9:00 AM",
                          location: "Ward 14 Community Center",
                          description: "Free consultations, spectacles distribution, and medicine kits.",
                        },
                      ]
                    )
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Event
                </button>
              </div>

              {(
                section.props.events || [
                  {
                    title: "Janata Darbar & Public Hearing",
                    startDate: "Every Monday & Thursday",
                    location: "Constituency Central Camp Office",
                    description: "Open interaction with citizens to address local grievances and petitions.",
                  },
                  {
                    title: "Free Mega Health & Eye Checkup Camp",
                    startDate: "Upcoming Sunday, 9:00 AM",
                    location: "Ward 14 Community Center",
                    description: "Free consultations, spectacles distribution, and medicine kits.",
                  },
                ]
              ).map((event: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                      Event #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveArrayItem("events", idx)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Event Title</label>
                    <input
                      type="text"
                      value={event.title || ""}
                      onChange={(e) => handleArrayItemChange("events", idx, "title", e.target.value)}
                      placeholder="e.g. Janata Darbar"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Date & Time</label>
                      <input
                        type="text"
                        value={event.startDate || ""}
                        onChange={(e) => handleArrayItemChange("events", idx, "startDate", e.target.value)}
                        placeholder="e.g. Every Monday, 10 AM"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Location</label>
                      <input
                        type="text"
                        value={event.location || ""}
                        onChange={(e) => handleArrayItemChange("events", idx, "location", e.target.value)}
                        placeholder="e.g. Camp Office"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Description</label>
                    <textarea
                      rows={2}
                      value={event.description || ""}
                      onChange={(e) => handleArrayItemChange("events", idx, "description", e.target.value)}
                      placeholder="Event details..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FAQ SECTION */}
          {(section.type === "faq_accordion" || section.type === "faq") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  FAQ Questions & Answers
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleAddArrayItem(
                      "faqs",
                      {
                        q: "New Citizen Question?",
                        a: "Helpful answer explaining the process.",
                      },
                      [
                        {
                          q: "How can I meet the MLA/MP in person?",
                          a: "Janata Darbar is hosted every Monday & Thursday morning at the Central Camp Office.",
                        },
                        {
                          q: "How do I check the status of my logged grievance?",
                          a: "You can track your grievance using your 10-digit mobile number through our 24/7 Citizen Portal.",
                        },
                      ]
                    )
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400"
                >
                  <Plus className="w-3.5 h-3.5" /> Add FAQ
                </button>
              </div>

              {(
                section.props.faqs || [
                  {
                    q: "How can I meet the MLA/MP in person?",
                    a: "Janata Darbar is hosted every Monday & Thursday morning at the Central Camp Office. Citizens are met on a first-come basis without needing prior appointment.",
                  },
                  {
                    q: "How do I check the status of my logged grievance?",
                    a: "You can track your grievance using your 10-digit mobile number or unique Reference ID through our 24/7 Citizen Portal.",
                  },
                  {
                    q: "Can I request assistance for hospital admission or financial relief?",
                    a: "Yes, our team facilitates CM Relief Fund and emergency healthcare recommendations. Bring valid medical documents to the camp office.",
                  },
                ]
              ).map((faq: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Question #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveArrayItem("faqs", idx)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={faq.q || ""}
                    onChange={(e) => handleArrayItemChange("faqs", idx, "q", e.target.value)}
                    placeholder="Question"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  />
                  <textarea
                    rows={2}
                    value={faq.a || ""}
                    onChange={(e) => handleArrayItemChange("faqs", idx, "a", e.target.value)}
                    placeholder="Answer..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              ))}
            </div>
          )}

          {/* GRIEVANCE CTA SECTION */}
          {(section.type === "grievance_cta" ||
            section.type === "grievance-cta" ||
            section.type === "grievance_form" ||
            section.type === "grievance-form-block" ||
            section.type === "grievance_form_block") && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Helpline Number
                </label>
                <input
                  type="text"
                  value={section.props.helpline || section.props.helplineNumber || ""}
                  onChange={(e) => {
                    handlePropChange("helpline", e.target.value);
                    handlePropChange("helplineNumber", e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="1800-889-2024"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={section.props.buttonText || ""}
                    onChange={(e) => handlePropChange("buttonText", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Submit Grievance Online"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Button Link
                  </label>
                  <input
                    type="text"
                    value={section.props.buttonLink || ""}
                    onChange={(e) => handlePropChange("buttonLink", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="/voter-portal"
                  />
                </div>
              </div>
            </>
          )}

          {/* CONTACT OFFICE SECTION */}
          {(section.type === "contact_office" ||
            section.type === "contact-office" ||
            section.type === "office-directory" ||
            section.type === "office-locations" ||
            section.type === "contact") && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Office Address
                </label>
                <textarea
                  rows={2}
                  value={section.props.officeAddress || ""}
                  onChange={(e) => handlePropChange("officeAddress", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="MLA Office, Civil Lines, Main Highway Road"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Office Phone
                  </label>
                  <input
                    type="text"
                    value={section.props.officePhone || ""}
                    onChange={(e) => handlePropChange("officePhone", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Office Email
                  </label>
                  <input
                    type="text"
                    value={section.props.officeEmail || ""}
                    onChange={(e) => handlePropChange("officeEmail", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="office@constituency.in"
                  />
                </div>
              </div>
            </>
          )}

          {/* RICH TEXT */}
          {section.type === "rich_text" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                HTML / Rich Text Content
              </label>
              <textarea
                rows={6}
                value={section.props.htmlContent || section.props.content || ""}
                onChange={(e) => {
                  handlePropChange("htmlContent", e.target.value);
                  handlePropChange("content", e.target.value);
                }}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}

          {/* CUSTOM BOX */}
          {(section.type === "custom_box" || section.type === "custom-box") && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Eyebrow Badge
                </label>
                <input
                  type="text"
                  value={section.props.badge || ""}
                  onChange={(e) => handlePropChange("badge", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Special Notice / Initiative"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Box Visual Style
                </label>
                <select
                  value={section.props.boxStyle || "card"}
                  onChange={(e) => handlePropChange("boxStyle", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="card">Clean Card (White / Dark)</option>
                  <option value="gradient">Saffron / Amber Gradient</option>
                  <option value="dark">Midnight Dark Card</option>
                  <option value="outline">Modern Highlight Outline</option>
                  <option value="glassmorphism">Frosted Glassmorphism</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Detailed Body Content
                </label>
                <textarea
                  rows={4}
                  value={section.props.description || section.props.content || ""}
                  onChange={(e) => {
                    handlePropChange("description", e.target.value);
                    handlePropChange("content", e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter detailed notice, message, or initiative details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Image Layout
                  </label>
                  <select
                    value={section.props.imagePosition || "right"}
                    onChange={(e) => handlePropChange("imagePosition", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="right">Right Side (Side-by-side)</option>
                    <option value="top">Top Banner</option>
                    <option value="bottom">Bottom Banner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Upload Box Image
                  </label>
                  <ImageUploadField
                    label=""
                    value={section.props.imageUrl || ""}
                    onChange={(url) => handlePropChange("imageUrl", url)}
                    websiteId={websiteId}
                    helperText="Upload image/photo."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Action Buttons</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={section.props.primaryButtonText || ""}
                    onChange={(e) => handlePropChange("primaryButtonText", e.target.value)}
                    placeholder="Primary Button Text"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    value={section.props.primaryButtonLink || ""}
                    onChange={(e) => handlePropChange("primaryButtonLink", e.target.value)}
                    placeholder="Primary Button Link"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={section.props.secondaryButtonText || ""}
                    onChange={(e) => handlePropChange("secondaryButtonText", e.target.value)}
                    placeholder="Secondary Button Text"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    value={section.props.secondaryButtonLink || ""}
                    onChange={(e) => handlePropChange("secondaryButtonLink", e.target.value)}
                    placeholder="Secondary Button Link"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Features / Highlights list */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Feature Bullet Highlights
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddArrayItem("features", "New Initiative Key Highlight", [
                        "Direct monitoring by elected representative",
                        "Zero bureaucratic delays in public services",
                        "24/7 dedicated helpline support",
                      ])
                    }
                    className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Point
                  </button>
                </div>
                {(
                  section.props.features || [
                    "Direct monitoring by elected representative",
                    "Zero bureaucratic delays in public services",
                    "24/7 dedicated helpline support",
                  ]
                ).map((feat: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={typeof feat === "string" ? feat : (feat as any)?.title || ""}
                      onChange={(e) => {
                        const current = Array.isArray(section.props.features)
                          ? [...section.props.features]
                          : [
                              "Direct monitoring by elected representative",
                              "Zero bureaucratic delays in public services",
                              "24/7 dedicated helpline support",
                            ];
                        current[idx] = e.target.value;
                        handlePropChange("features", current);
                      }}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      placeholder="Highlight point..."
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveArrayItem("features", idx, [
                          "Direct monitoring by elected representative",
                          "Zero bureaucratic delays in public services",
                          "24/7 dedicated helpline support",
                        ])
                      }
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TESTIMONIALS */}
          {(section.type === "testimonials" ||
            section.type === "citizen-testimonials" ||
            section.type === "citizen_feedback") && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={section.props.badge || ""}
                  onChange={(e) => handlePropChange("badge", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  placeholder="Voice of Constituents"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Citizen Testimonial Cards
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddArrayItem(
                        "items",
                        {
                          name: "Citizen Name",
                          role: "Resident, Ward 1",
                          quote: "Great service and fast response to our area problems.",
                          rating: 5,
                          avatarUrl: "",
                        },
                        [
                          {
                            name: "Rajesh Sharma",
                            role: "Ward 12 Resident & Trader",
                            quote:
                              "The road widening and new LED street lighting project was executed in record time. Our shop market area is now safe and vibrant at night.",
                            rating: 5,
                            avatarUrl: "",
                          },
                          {
                            name: "Pooja Verma",
                            role: "Parent & Teacher, Sector 4",
                            quote:
                              "The government school modernization project provided smart digital classrooms and clean drinking water facilities for all our children.",
                            rating: 5,
                            avatarUrl: "",
                          },
                          {
                            name: "Mohammad Arif",
                            role: "Youth Sports Club Leader",
                            quote:
                              "The new community sports complex and open gym in our park has given hundreds of local youths a healthy and positive environment.",
                            rating: 5,
                            avatarUrl: "",
                          },
                        ]
                      )
                    }
                    className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Testimonial
                  </button>
                </div>

                {(
                  section.props.items || [
                    {
                      name: "Rajesh Sharma",
                      role: "Ward 12 Resident & Trader",
                      quote:
                        "The road widening and new LED street lighting project was executed in record time. Our shop market area is now safe and vibrant at night.",
                      rating: 5,
                      avatarUrl: "",
                    },
                    {
                      name: "Pooja Verma",
                      role: "Parent & Teacher, Sector 4",
                      quote:
                        "The government school modernization project provided smart digital classrooms and clean drinking water facilities for all our children.",
                      rating: 5,
                      avatarUrl: "",
                    },
                    {
                      name: "Mohammad Arif",
                      role: "Youth Sports Club Leader",
                      quote:
                        "The new community sports complex and open gym in our park has given hundreds of local youths a healthy and positive environment.",
                      rating: 5,
                      avatarUrl: "",
                    },
                  ]
                ).map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Citizen #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveArrayItem("items", idx, [
                            {
                              name: "Rajesh Sharma",
                              role: "Ward 12 Resident & Trader",
                              quote: "Road widening completed fast.",
                              rating: 5,
                            },
                          ])
                        }
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.name || ""}
                        onChange={(e) => handleArrayItemChange("items", idx, "name", e.target.value)}
                        placeholder="Citizen Name"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <input
                        type="text"
                        value={item.role || ""}
                        onChange={(e) => handleArrayItemChange("items", idx, "role", e.target.value)}
                        placeholder="Ward / Profession"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <textarea
                        rows={2}
                        value={item.quote || ""}
                        onChange={(e) => handleArrayItemChange("items", idx, "quote", e.target.value)}
                        placeholder="Citizen quote or feedback..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Rating (1-5)</label>
                        <select
                          value={item.rating || 5}
                          onChange={(e) =>
                            handleArrayItemChange("items", idx, "rating", Number(e.target.value))
                          }
                          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        >
                          <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                          <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                          <option value={3}>⭐⭐⭐ (3 Stars)</option>
                        </select>
                      </div>
                      <div>
                        <ImageUploadField
                          label="Avatar (Optional)"
                          value={item.avatarUrl || ""}
                          onChange={(url) => handleArrayItemChange("items", idx, "avatarUrl", url)}
                          websiteId={websiteId}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PRESS & NEWS */}
          {(section.type === "press_news" ||
            section.type === "latest-news" ||
            section.type === "media_coverage") && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={section.props.badge || ""}
                  onChange={(e) => handlePropChange("badge", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  placeholder="Media & Press Room"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Press & News Articles
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddArrayItem(
                        "items",
                        {
                          publication: "State News",
                          date: "Recent",
                          headline: "New Development Initiative Launched",
                          summary: "Key updates and details on the newly launched public infrastructure project.",
                          imageUrl: "",
                          tag: "Progress",
                          link: "#",
                        },
                        [
                          {
                            publication: "State Times Bureau",
                            date: "May 2026",
                            headline: "₹ 140 Crore Model Infrastructure Package Approved for Constituency",
                            summary: "New underground drainage, four-lane connectivity, and healthcare centers.",
                            imageUrl: "",
                            tag: "Infrastructure",
                            link: "#",
                          },
                        ]
                      )
                    }
                    className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Article
                  </button>
                </div>

                {(
                  section.props.items || [
                    {
                      publication: "State Times Bureau",
                      date: "May 2026",
                      headline: "₹ 140 Crore Model Infrastructure Package Approved for Constituency",
                      summary: "New underground drainage, four-lane connectivity, and community healthcare centers sanctioned under flagship masterplan.",
                      imageUrl: "",
                      tag: "Infrastructure",
                      link: "#",
                    },
                    {
                      publication: "Daily Citizen Post",
                      date: "April 2026",
                      headline: "Over 18,000 Citizen Grievances Resolved with 99% Satisfaction Rate",
                      summary: "Constituency digital grievance portal recognized as a state-wide benchmark for rapid public service delivery.",
                      imageUrl: "",
                      tag: "Governance",
                      link: "#",
                    },
                  ]
                ).map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Article #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem("items", idx)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={item.publication || ""}
                        onChange={(e) => handleArrayItemChange("items", idx, "publication", e.target.value)}
                        placeholder="Publication"
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <input
                        type="text"
                        value={item.date || ""}
                        onChange={(e) => handleArrayItemChange("items", idx, "date", e.target.value)}
                        placeholder="Date (e.g. May 2026)"
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <input
                        type="text"
                        value={item.tag || ""}
                        onChange={(e) => handleArrayItemChange("items", idx, "tag", e.target.value)}
                        placeholder="Category Tag"
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <input
                      type="text"
                      value={item.headline || ""}
                      onChange={(e) => handleArrayItemChange("items", idx, "headline", e.target.value)}
                      placeholder="Article Headline"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                    />
                    <textarea
                      rows={2}
                      value={item.summary || ""}
                      onChange={(e) => handleArrayItemChange("items", idx, "summary", e.target.value)}
                      placeholder="Short summary of article..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <input
                        type="text"
                        value={item.link || ""}
                        onChange={(e) => handleArrayItemChange("items", idx, "link", e.target.value)}
                        placeholder="Article Link URL (#)"
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <ImageUploadField
                        label="Article Image"
                        value={item.imageUrl || ""}
                        onChange={(url) => handleArrayItemChange("items", idx, "imageUrl", url)}
                        websiteId={websiteId}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GALLERY */}
          {section.type === "gallery" && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={section.props.badge || ""}
                  onChange={(e) => handlePropChange("badge", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  placeholder="Constituency Gallery"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Gallery Photos
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddArrayItem(
                        "items",
                        {
                          title: "New Constituency Moment",
                          category: "Community",
                          date: "2026",
                          imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
                        },
                        [
                          {
                            title: "Flyover Inauguration",
                            category: "Infrastructure",
                            date: "2026",
                            imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
                          },
                        ]
                      )
                    }
                    className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Photo
                  </button>
                </div>

                {(
                  section.props.items || [
                    {
                      title: "Flyover & Highway Inauguration",
                      category: "Infrastructure",
                      date: "2026",
                      imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
                    },
                    {
                      title: "Mega Health Checkup & Medicine Distribution",
                      category: "Healthcare",
                      date: "2026",
                      imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80",
                    },
                  ]
                ).map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Photo #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem("items", idx)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <ImageUploadField
                      label="Upload Gallery Photo"
                      value={item.imageUrl || ""}
                      onChange={(url) => handleArrayItemChange("items", idx, "imageUrl", url)}
                      websiteId={websiteId}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.title || ""}
                        onChange={(e) => handleArrayItemChange("items", idx, "title", e.target.value)}
                        placeholder="Photo Title / Caption"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <input
                        type="text"
                        value={item.category || ""}
                        onChange={(e) => handleArrayItemChange("items", idx, "category", e.target.value)}
                        placeholder="Category (e.g. Health)"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FEATURES GRID */}
          {section.type === "features_grid" && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={section.props.badge || ""}
                  onChange={(e) => handlePropChange("badge", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  placeholder="Strategic Vision"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Governance Pillars
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddArrayItem(
                        "items",
                        {
                          icon: "shield",
                          title: "New Governance Priority",
                          description: "Description of key commitment and deliverables for citizens.",
                        },
                        [
                          {
                            icon: "shield",
                            title: "Transparent & Accountable Governance",
                            description: "Audited public tenders and online tracking.",
                          },
                        ]
                      )
                    }
                    className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Pillar
                  </button>
                </div>

                {(
                  section.props.items || [
                    {
                      icon: "shield",
                      title: "Transparent & Accountable Governance",
                      description: "Every public tender and fund utilization is audited and accessible to citizens online.",
                    },
                    {
                      icon: "heart",
                      title: "Accessible & Subsidized Healthcare",
                      description: "Primary health centers equipped with 24/7 doctors, ambulances, and essential diagnostic tests.",
                    },
                  ]
                ).map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Pillar #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem("items", idx)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={item.icon || "shield"}
                        onChange={(e) => handleArrayItemChange("items", idx, "icon", e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <option value="shield">🛡️ Shield</option>
                        <option value="heart">❤️ Healthcare</option>
                        <option value="users">👥 Youth/Users</option>
                        <option value="building">🏢 Building</option>
                        <option value="award">🏆 Award</option>
                        <option value="sparkles">✨ Sparkles</option>
                        <option value="zap">⚡ Energy/Zap</option>
                      </select>
                      <input
                        type="text"
                        value={item.title || ""}
                        onChange={(e) => handleArrayItemChange("items", idx, "title", e.target.value)}
                        placeholder="Pillar Title"
                        className="col-span-2 w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={item.description || ""}
                      onChange={(e) => handleArrayItemChange("items", idx, "description", e.target.value)}
                      placeholder="Pillar details and mission description..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NEWSLETTER */}
          {section.type === "newsletter" && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={section.props.badge || ""}
                  onChange={(e) => handlePropChange("badge", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  placeholder="Direct Citizen Broadcast"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Input Placeholder
                  </label>
                  <input
                    type="text"
                    value={section.props.placeholder || ""}
                    onChange={(e) => handlePropChange("placeholder", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    placeholder="Enter WhatsApp number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={section.props.buttonText || ""}
                    onChange={(e) => handlePropChange("buttonText", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    placeholder="Join WhatsApp Channel"
                  />
                </div>
              </div>

              {/* Benefits list */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Channel Benefits & Badges
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddArrayItem("benefits", "Instant Alert Notification", [
                        "Instant Janata Darbar schedule updates",
                        "Direct welfare scheme notifications",
                        "Zero spam guarantee",
                      ])
                    }
                    className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Tag
                  </button>
                </div>
                {(
                  section.props.benefits || [
                    "Instant Janata Darbar schedule updates",
                    "Direct welfare scheme notifications",
                    "Zero spam guarantee",
                  ]
                ).map((b: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={b || ""}
                      onChange={(e) => {
                        const current = Array.isArray(section.props.benefits)
                          ? [...section.props.benefits]
                          : [
                              "Instant Janata Darbar schedule updates",
                              "Direct welfare scheme notifications",
                              "Zero spam guarantee",
                            ];
                        current[idx] = e.target.value;
                        handlePropChange("benefits", current);
                      }}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveArrayItem("benefits", idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIDEO EMBED */}
          {section.type === "video_embed" && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  YouTube / Video URL
                </label>
                <input
                  type="text"
                  value={section.props.videoUrl || ""}
                  onChange={(e) => handlePropChange("videoUrl", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Styling Section */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Palette className="w-4 h-4 text-orange-500" />
            <span>Style & Spacing</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Background Color
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={section.styles?.backgroundColor || "#ffffff"}
                onChange={(e) => handleStyleChange("backgroundColor", e.target.value)}
                className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
              />
              <input
                type="text"
                value={section.styles?.backgroundColor || ""}
                onChange={(e) => handleStyleChange("backgroundColor", e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                placeholder="transparent or #ffffff"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Top / Bottom Padding
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={section.styles?.paddingTop || "4rem"}
                onChange={(e) => handleStyleChange("paddingTop", e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                placeholder="Top (e.g. 4rem)"
              />
              <input
                type="text"
                value={section.styles?.paddingBottom || "4rem"}
                onChange={(e) => handleStyleChange("paddingBottom", e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                placeholder="Bottom (e.g. 4rem)"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Container Width
            </label>
            <select
              value={section.styles?.containerWidth || "default"}
              onChange={(e) => handleStyleChange("containerWidth", e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="narrow">Narrow (4xl)</option>
              <option value="default">Default (7xl)</option>
              <option value="full">Full Width (100%)</option>
            </select>
          </div>

          <div>
            <ImageUploadField
              label="Background Image (Optional)"
              value={section.styles?.backgroundImage || ""}
              onChange={(url) => handleStyleChange("backgroundImage", url)}
              websiteId={websiteId}
              helperText="Upload custom section background pattern or texture."
            />
          </div>
        </div>
      </div>
    </div>
  );
};
