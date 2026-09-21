import React from "react";
import {
  Building2,
  CheckCircle2,
  Users,
  Award,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  HeartHandshake,
  ShieldCheck,
  Send,
  HelpCircle,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Trash2,
  GripVertical,
  Star,
  Quote,
  Newspaper,
  Image as ImageIcon,
  CheckCircle,
  Bell,
  Play,
  Zap,
  Radio,
  Menu,
  X,
} from "lucide-react";
import { getImageUrl } from "@/lib/utils";
import { SectionBlock } from "../types";

interface RendererProps {
  section: SectionBlock;
  isEditing?: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  dropPosition?: "top" | "bottom" | null;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  pages?: any[];
  activePageId?: string;
  onSwitchPage?: (pageId: string) => void;
  liveData?: {
    projects?: any[];
    schemes?: any[];
    events?: any[];
    leaders?: any[];
  };
  viewport?: "desktop" | "tablet" | "mobile";
}

export const SectionRenderer: React.FC<RendererProps> = ({
  section,
  isEditing = false,
  onSelect,
  isSelected = false,
  onMoveUp,
  onMoveDown,
  onDelete,
  canMoveUp = false,
  canMoveDown = false,
  isDragging = false,
  isDropTarget = false,
  dropPosition = null,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  pages = [],
  activePageId,
  onSwitchPage,
  liveData = {},
  viewport = "desktop",
}) => {
  const { type, props = {}, styles = {} } = section;
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isMobile = viewport === "mobile";
  const isTablet = viewport === "tablet";

  const containerStyle: React.CSSProperties = {
    backgroundColor: styles.backgroundColor || undefined,
    color: styles.textColor || undefined,
    paddingTop: styles.paddingTop || undefined,
    paddingBottom: styles.paddingBottom || undefined,
  };

  const getContainerWidthClass = () => {
    if (isMobile) return "w-full px-3 sm:px-4 mx-auto";
    if (styles.containerWidth === "narrow") return "w-full max-w-4xl px-4 sm:px-6 lg:px-8 mx-auto";
    if (styles.containerWidth === "full") return "w-full px-4 sm:px-6 lg:px-8";
    return "w-full max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto";
  };

  const renderContent = () => {
    switch (type) {
      case "navbar":
        return (
          <nav className="w-full relative">
            <div className="flex items-center justify-between gap-3 py-2">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {props.logoUrl ? (
                  <img
                    src={getImageUrl(props.logoUrl)}
                    alt={props.brandName || "Logo"}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain shadow-sm border border-slate-200/60 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-black text-sm sm:text-base flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
                    {props.logoText || props.brandName?.charAt(0) || "M"}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight truncate">
                    {props.brandName || "Constituency Portal"}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-orange-600 dark:text-orange-400 truncate">
                    {props.brandSubtitle || "Official Representative Portal"}
                  </p>
                </div>
              </div>

              {/* Desktop Nav Links (Hidden if isMobile or on mobile view) */}
              <div className={isMobile ? "hidden" : "hidden md:flex items-center gap-1.5"}>
                {pages && pages.length > 0 ? (
                  pages.map((p: any) => {
                    const isCurrent = activePageId ? activePageId === p.id || activePageId === p.slug : false;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSwitchPage?.(p.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isCurrent
                            ? "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold"
                            : "text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50/50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {p.title}
                      </button>
                    );
                  })
                ) : (
                  (props.links || [
                    { label: "Home", url: "#hero" },
                    { label: "Projects", url: "#projects" },
                    { label: "Schemes", url: "#schemes" },
                    { label: "Janata Darbar", url: "#events" },
                    { label: "Contact", url: "#contact" },
                  ]).map((link: any, idx: number) => (
                    <a
                      key={idx}
                      href={link.url || "#"}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50/50 dark:hover:bg-slate-800 transition-all"
                    >
                      {link.label}
                    </a>
                  ))
                )}

                {props.showHelpline !== false && (props.helplineText || "1800-889-2024") && (
                  <div className="ml-2 hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <Phone className="w-3 h-3 text-orange-500" />
                    <span>{props.helplineText || "1800-889-2024"}</span>
                  </div>
                )}

                {props.primaryButtonText !== "" && (
                  <a
                    href={props.primaryButtonLink || "#grievance"}
                    className="ml-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:scale-[1.02] transition-all"
                  >
                    {props.primaryButtonText || "Lodge Grievance"}
                  </a>
                )}
              </div>

              {/* Mobile Quick Action & Hamburger Toggle */}
              <div className={isMobile ? "flex items-center gap-2" : "md:hidden flex items-center gap-2"}>
                {props.primaryButtonText !== "" && (
                  <a
                    href={props.primaryButtonLink || "#grievance"}
                    className="px-2.5 py-1.5 rounded-lg bg-orange-600 text-white font-bold text-[11px] shadow-sm whitespace-nowrap"
                  >
                    {props.primaryButtonText || "Grievance"}
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-orange-600 transition-colors"
                  aria-label="Toggle Navigation Menu"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Mobile Dropdown Menu */}
            {mobileMenuOpen && (
              <div className="pt-3 pb-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                {pages && pages.length > 0 ? (
                  pages.map((p: any) => {
                    const isCurrent = activePageId ? activePageId === p.id || activePageId === p.slug : false;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onSwitchPage?.(p.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isCurrent
                            ? "bg-orange-500 text-white font-bold"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {p.title}
                      </button>
                    );
                  })
                ) : (
                  ["Home", "Projects", "Schemes", "Janata Darbar", "Contact"].map((label, idx) => (
                    <a
                      key={idx}
                      href={`#${label.toLowerCase()}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      {label}
                    </a>
                  ))
                )}
                {(props.helplineText || "1800-889-2024") && (
                  <div className="pt-2 flex items-center justify-between text-xs px-2 text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-orange-500" />
                      Helpline:
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {props.helplineText || "1800-889-2024"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </nav>
        );

      case "footer":
        return (
          <footer className="w-full text-slate-300">
            <div
              className={`gap-8 lg:gap-10 pb-8 sm:pb-10 border-b border-slate-700/60 dark:border-slate-800 ${
                isMobile
                  ? "grid grid-cols-1 space-y-6"
                  : isTablet
                  ? "grid grid-cols-2"
                  : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12"
              }`}
            >
              {/* Column 1: Brand & Mission */}
              <div className={isMobile ? "space-y-4" : "lg:col-span-4 space-y-4"}>
                <div className="flex items-center gap-3">
                  {props.logoUrl ? (
                    <img
                      src={getImageUrl(props.logoUrl)}
                      alt={props.brandName || "Logo"}
                      className="w-10 h-10 rounded-xl object-contain shadow-md border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
                      {props.logoText || props.brandName?.charAt(0) || "M"}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-white leading-tight">
                      {props.brandName || "Constituency Portal"}
                    </h3>
                    <p className="text-[11px] font-semibold text-orange-400">
                      {props.brandSubtitle || "Official Representative Portal"}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                  {props.description ||
                    "Dedicated to transparent governance, rapid grievance resolution, and progressive infrastructure across all municipal wards."}
                </p>
                {props.primaryButtonText !== "" && (
                  <a
                    href={props.primaryButtonLink || "#grievance"}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:scale-[1.02] transition-all"
                  >
                    {props.primaryButtonText || "Lodge a Grievance"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Column 2: Navigation Links */}
              <div className={isMobile ? "space-y-3" : "lg:col-span-2 space-y-3"}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Quick Navigation
                </h4>
                <ul className="space-y-2 text-xs">
                  {pages && pages.length > 0 ? (
                    pages.map((p: any) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => onSwitchPage?.(p.id)}
                          className="hover:text-orange-400 transition-colors text-left"
                        >
                          {p.title}
                        </button>
                      </li>
                    ))
                  ) : (
                    ["Home", "Projects", "Schemes", "Janata Darbar", "Contact"].map((label, idx) => (
                      <li key={idx}>
                        <a href={`#${label.toLowerCase()}`} className="hover:text-orange-400 transition-colors">
                          {label}
                        </a>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Column 3: Citizen Services */}
              <div className={isMobile ? "space-y-3" : "lg:col-span-3 space-y-3"}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Citizen Services
                </h4>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li>
                    <a href="#grievance" className="hover:text-orange-400 transition-colors flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      24/7 Grievance Registration
                    </a>
                  </li>
                  <li>
                    <a href="#projects" className="hover:text-orange-400 transition-colors flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      Infrastructure Progress Tracker
                    </a>
                  </li>
                  <li>
                    <a href="#schemes" className="hover:text-orange-400 transition-colors flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      Welfare Schemes & Direct Benefits
                    </a>
                  </li>
                  <li>
                    <a href="#events" className="hover:text-orange-400 transition-colors flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      Janata Darbar Public Hearings
                    </a>
                  </li>
                </ul>
              </div>

              {/* Column 4: Contact & Secretariat */}
              <div className={isMobile ? "space-y-3" : "lg:col-span-3 space-y-3"}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Secretariat & Office
                </h4>
                <div className="space-y-2.5 text-xs text-slate-400">
                  <p className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <span className="break-words">
                      {props.officeAddress || "Central Constituency Secretariat & Camp Office, Civil Lines"}
                    </span>
                  </p>
                  {(props.helpline || props.phone || "1800-889-2024") && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                      <a href={`tel:${props.helpline || props.phone || "1800-889-2024"}`} className="hover:text-white">
                        {props.helpline || props.phone || "1800-889-2024"}
                      </a>
                    </p>
                  )}
                  {(props.email || "office@constituency.gov.in") && (
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-orange-400 shrink-0" />
                      <a href={`mailto:${props.email || "office@constituency.gov.in"}`} className="hover:text-white truncate">
                        {props.email || "office@constituency.gov.in"}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Copyright Bar */}
            <div className="pt-5 sm:pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-3 text-center sm:text-left">
              <p>
                {props.copyrightText ||
                  `© ${new Date().getFullYear()} ${props.brandName || "Constituency Portal"}. All Rights Reserved.`}
              </p>
              <div className="flex items-center gap-3 sm:gap-4 justify-center">
                <span className="text-slate-400 font-medium">Official Portal</span>
                <span>•</span>
                <span className="text-orange-500 font-semibold">Serving Citizens 24/7</span>
              </div>
            </div>
          </footer>
        );

      case "hero":
      case "representative-hero":
      case "representative_hero":
      case "dev-hero":
        return (
          <div className="relative overflow-hidden py-2 sm:py-6">
            <div
              className={`gap-6 sm:gap-8 lg:gap-12 items-center ${
                isMobile
                  ? "grid grid-cols-1"
                  : isTablet
                  ? "grid grid-cols-1 md:grid-cols-12"
                  : "grid grid-cols-1 lg:grid-cols-12"
              }`}
            >
              <div
                className={`space-y-4 sm:space-y-6 ${
                  isMobile
                    ? "w-full text-center"
                    : isTablet
                    ? "md:col-span-7 text-left"
                    : "lg:col-span-7 text-center lg:text-left"
                }`}
              >
                {props.tagline && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold text-xs tracking-wider uppercase border border-orange-500/20">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate max-w-[280px] sm:max-w-none">{props.tagline}</span>
                  </div>
                )}
                {props.badge && !props.tagline && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold text-xs tracking-wider uppercase border border-orange-500/20">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate max-w-[280px] sm:max-w-none">{props.badge}</span>
                  </div>
                )}

                <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] text-slate-900 dark:text-white">
                  {props.title || props.headline || "Dedicated to Serving Our Constituency"}
                </h1>

                <p className="text-xs sm:text-base md:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  {props.subtitle ||
                    props.subheadline ||
                    "Committed to transparent governance, inclusive infrastructure, and 24/7 public service for every citizen."}
                </p>

                <div
                  className={`flex flex-col sm:flex-row gap-3 pt-2 ${
                    isMobile ? "justify-center" : "justify-center lg:justify-start"
                  }`}
                >
                  {props.primaryButtonText && (
                    <a
                      href={props.primaryButtonLink || "#grievance"}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] transition-all"
                    >
                      {props.primaryButtonText}
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                  {props.secondaryButtonText && (
                    <a
                      href={props.secondaryButtonLink || "#projects"}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all"
                    >
                      {props.secondaryButtonText}
                    </a>
                  )}
                </div>
              </div>

              <div
                className={`flex justify-center ${
                  isMobile ? "w-full mt-4" : isTablet ? "md:col-span-5" : "lg:col-span-5"
                }`}
              >
                <div className="relative w-full max-w-[280px] sm:max-w-sm md:max-w-md">
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-orange-500/30 to-blue-500/30 blur-2xl opacity-70" />
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/60 dark:border-slate-800/60 bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 aspect-[4/5] flex items-center justify-center">
                    {props.leaderImage || props.imageUrl ? (
                      <img
                        src={getImageUrl(props.leaderImage || props.imageUrl)}
                        alt={props.leaderName || "Representative"}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="text-center p-6 sm:p-8">
                        <Users className="w-16 h-16 sm:w-20 sm:h-20 text-slate-400 mx-auto mb-3" />
                        <p className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-200">
                          {props.leaderName || "Hon'ble Representative"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {props.leaderTitle || "Member of Legislative Assembly"}
                        </p>
                      </div>
                    )}
                    {(props.leaderName || props.leaderTitle || props.leaderBadge || props.badge) && (
                      <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2.5 sm:p-3.5 rounded-2xl border border-white/40 dark:border-slate-700/50 shadow-xl text-center">
                        {props.leaderName && (
                          <h4 className="text-xs sm:text-base font-black text-slate-900 dark:text-white leading-tight truncate">
                            {props.leaderName}
                          </h4>
                        )}
                        <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 mt-0.5 truncate">
                          {props.leaderTitle || props.leaderBadge || props.badge || "Official Representative"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "representative-profile":
      case "representative_profile":
      case "about-bio":
      case "about_bio":
      case "about":
      case "about_representative":
      case "about-representative":
        return (
          <div className="py-2 sm:py-4 space-y-8 sm:space-y-12">
            {/* Top Bio Section */}
            <div
              className={`gap-6 sm:gap-8 lg:gap-12 items-center ${
                isMobile
                  ? "grid grid-cols-1"
                  : isTablet
                  ? "grid grid-cols-1 md:grid-cols-12"
                  : "grid grid-cols-1 lg:grid-cols-12"
              }`}
            >
              <div
                className={`flex justify-center ${
                  isMobile ? "w-full" : isTablet ? "md:col-span-5" : "lg:col-span-5"
                }`}
              >
                <div className="relative w-full max-w-[280px] sm:max-w-sm">
                  <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-orange-500/20 via-amber-500/20 to-blue-500/20 blur-2xl opacity-80" />
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/80 dark:border-slate-800/80 bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 aspect-[4/5] flex items-center justify-center">
                    {props.leaderImage || props.imageUrl ? (
                      <img
                        src={getImageUrl(props.leaderImage || props.imageUrl)}
                        alt={props.leaderName || "Representative"}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="text-center p-8">
                        <Users className="w-20 h-20 text-slate-400 mx-auto mb-3" />
                        <p className="font-bold text-lg text-slate-800 dark:text-slate-200">
                          {props.leaderName || "Hon'ble Representative"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {props.leaderTitle || "Member of Legislative Assembly / Parliament"}
                        </p>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2.5 sm:p-3.5 rounded-2xl border border-white/30 dark:border-slate-700/50 shadow-xl flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {props.leaderName || "People's Representative"}
                        </p>
                        <p className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 truncate">
                          {props.constituencyName || "Serving Citizens 24/7"}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-[10px] font-extrabold shrink-0 ml-2">
                        {props.experienceYears || "15+"} Yrs Service
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`space-y-4 sm:space-y-6 ${
                  isMobile
                    ? "w-full text-center"
                    : isTablet
                    ? "md:col-span-7 text-left"
                    : "lg:col-span-7 text-center lg:text-left"
                }`}
              >
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-xs tracking-wider uppercase border border-orange-500/20 mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{props.tagline || "Leadership & Vision"}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                    {props.title || "Serving with Integrity, Passion & Vision"}
                  </h2>
                </div>

                <p className="text-xs sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  {props.bio ||
                    props.subtitle ||
                    "Dedicated public servant committed to grassroots empowerment, educational excellence, healthcare access, and farmer prosperity."}
                </p>

                {props.description && (
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {props.description}
                  </p>
                )}

                <div
                  className={`flex flex-col sm:flex-row gap-3 pt-2 ${
                    isMobile ? "justify-center" : "justify-center lg:justify-start"
                  }`}
                >
                  {props.primaryButtonText !== "" && (
                    <a
                      href={props.primaryButtonLink || "#events"}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:scale-[1.02] transition-all"
                    >
                      {props.primaryButtonText || "Meet at Janata Darbar"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {props.secondaryButtonText !== "" && (
                    <a
                      href={props.secondaryButtonLink || "#grievance"}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                    >
                      {props.secondaryButtonText || "Lodge a Grievance"}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Vision Pillars Grid */}
            <div className="pt-6 sm:pt-8 border-t border-slate-200 dark:border-slate-800">
              <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Core Governance Pillars
                </span>
                <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  Our Mission & Constituency Commitments
                </h3>
              </div>

              <div
                className={`gap-3.5 sm:gap-5 ${
                  isMobile
                    ? "grid grid-cols-1"
                    : isTablet
                    ? "grid grid-cols-2"
                    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                }`}
              >
                {(
                  props.visionPoints || [
                    { title: "Transparent Governance", desc: "Zero-tolerance for delays with tracked public grievance resolution." },
                    { title: "Youth & Education", desc: "Modern schools, digital skill labs, and community sports complexes." },
                    { title: "Farmer & Rural Support", desc: "Direct crop insurance facilitation, micro-irrigation, and paved farm roads." },
                    { title: "Universal Healthcare", desc: "Subsidized health camps, emergency ambulances, and 24/7 medicine centers." },
                  ]
                ).map((vp: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:shadow-lg transition-all"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black text-xs sm:text-sm mb-2.5 sm:mb-3">
                      0{idx + 1}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-1">
                      {vp.title}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {vp.desc || vp.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "stats":
      case "constituency-stats":
      case "constituency_stats":
        return (
          <div className="py-2 sm:py-4">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {props.title || "Impact in Numbers"}
              </h2>
              {props.subtitle && (
                <p className="mt-1.5 sm:mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  {props.subtitle}
                </p>
              )}
            </div>
            <div
              className={`gap-3 sm:gap-6 ${
                isMobile
                  ? "grid grid-cols-2"
                  : isTablet
                  ? "grid grid-cols-2"
                  : "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {(
                props.items || [
                  { value: "520+", label: "Development Works", icon: "projects" },
                  { value: "₹ 145 Cr", label: "Funds Sanctioned", icon: "funds" },
                  { value: "18,400+", label: "Grievances Resolved", icon: "grievances" },
                  { value: "99.1%", label: "Citizen Satisfaction", icon: "satisfaction" },
                ]
              ).map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 sm:p-6 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 text-center hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  <div className="text-lg sm:text-2xl lg:text-4xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-1 sm:mb-2 leading-tight">
                    {item.value}
                  </div>
                  <div className="text-[11px] sm:text-sm font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "projects":
      case "development-projects":
      case "development_projects":
      case "all-projects":
      case "dev-projects": {
        const projectsList =
          props.projects && props.projects.length > 0
            ? props.projects
            : liveData.projects && liveData.projects.length > 0
            ? liveData.projects
            : [
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
              ];

        return (
          <div className="py-2 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-10 gap-3 sm:gap-4">
              <div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Transforming Our Constituency
                </span>
                <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5 sm:mt-1">
                  {props.title || "Major Development Projects"}
                </h2>
              </div>
              <a
                href="#all-projects"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400 hover:underline shrink-0"
              >
                View all projects <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div
              className={`gap-4 sm:gap-6 ${
                isMobile
                  ? "grid grid-cols-1"
                  : isTablet
                  ? "grid grid-cols-2"
                  : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {projectsList.map((p: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {p.category || "General"}
                      </span>
                      <span className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        {p.status || "Active"}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5 leading-snug">
                      {p.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 mb-3 leading-relaxed">
                      {p.description || "Public infrastructure initiative for constituency development."}
                    </p>
                  </div>
                  <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 truncate max-w-[60%]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{p.location || "Constituency"}</span>
                    </span>
                    {p.budget && (
                      <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">
                        ₹ {(p.budget / 10000000).toFixed(2)} Cr
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "grievance_cta":
      case "grievance-cta":
      case "grievance-form-block":
      case "grievance_form":
      case "grievance_form_block":
        return (
          <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-5 sm:p-10 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white font-medium text-xs mb-3 sm:mb-4">
                <HeartHandshake className="w-4 h-4" />
                Citizen First Service
              </div>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight mb-2.5 sm:mb-4 leading-tight">
                {props.title || "Have a Problem in Your Ward? Lodge a Grievance 24/7"}
              </h2>
              <p className="text-orange-100 text-xs sm:text-sm md:text-base mb-5 sm:mb-8 leading-relaxed">
                {props.subtitle ||
                  props.description ||
                  "Every citizen grievance is tracked with a unique reference number. Our team reviews and resolves issues directly with municipal and government authorities."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <a
                  href={props.buttonLink || "/voter-portal"}
                  className="px-5 py-3 sm:px-6 sm:py-3.5 rounded-xl bg-white text-orange-700 font-bold text-xs sm:text-sm shadow-lg hover:bg-orange-50 hover:scale-[1.02] transition-all inline-flex items-center justify-center gap-2 text-center"
                >
                  <Send className="w-4 h-4" />
                  {props.buttonText || "Submit Grievance Online"}
                </a>
                <a
                  href={`tel:${props.helpline || props.helplineNumber || "1800-889-2024"}`}
                  className="px-5 py-3 sm:px-6 sm:py-3.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white font-semibold text-xs sm:text-sm hover:bg-white/30 transition-all inline-flex items-center justify-center gap-2 text-center"
                >
                  <Phone className="w-4 h-4" />
                  Helpline: {props.helpline || props.helplineNumber || "1800-889-2024"}
                </a>
              </div>
            </div>
          </div>
        );

      case "schemes":
      case "government-schemes":
      case "government_schemes":
      case "schemes-preview": {
        const schemesList =
          props.schemes && props.schemes.length > 0
            ? props.schemes
            : liveData.schemes && liveData.schemes.length > 0
            ? liveData.schemes
            : [
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
              ];

        return (
          <div className="py-2 sm:py-4">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                Welfare & Empowerment
              </span>
              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5 sm:mt-1">
                {props.title || "Government Schemes & Welfare Services"}
              </h2>
              <p className="mt-1.5 sm:mt-3 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                Explore flagship central & state government schemes available for constituency residents.
              </p>
            </div>

            <div
              className={`gap-4 sm:gap-6 ${
                isMobile
                  ? "grid grid-cols-1"
                  : isTablet
                  ? "grid grid-cols-2"
                  : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {schemesList.map((s: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 sm:p-6 flex flex-col justify-between hover:border-orange-500/50 hover:shadow-lg transition-all"
                >
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-semibold px-2.5 py-1 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60">
                      {s.category || "General Scheme"}
                    </span>
                    <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white mt-2.5 sm:mt-3 mb-2 leading-snug">
                      {s.title}
                    </h3>
                    <div className="space-y-1.5 sm:space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>
                        <strong className="text-slate-800 dark:text-slate-100">Benefits: </strong>
                        {s.benefits}
                      </p>
                      {s.eligibilityCriteria && (
                        <p>
                          <strong className="text-slate-800 dark:text-slate-100">Eligibility: </strong>
                          {s.eligibilityCriteria}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="pt-3.5 sm:pt-4 mt-3 sm:mt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs">
                    <span className="text-slate-500 truncate max-w-[50%]">{s.department || "Govt. of India"}</span>
                    <a
                      href={s.applyLink || "#apply"}
                      className="font-bold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      Apply Guidance <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "events":
      case "upcoming-events":
      case "upcoming_events":
      case "events-preview": {
        const eventsList =
          props.events && props.events.length > 0
            ? props.events
            : liveData.events && liveData.events.length > 0
            ? liveData.events
            : [
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
              ];

        return (
          <div className="py-2 sm:py-4">
            <div className="mb-6 sm:mb-8 text-center sm:text-left">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                Public Schedule
              </span>
              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5 sm:mt-1">
                {props.title || "Janata Darbar & Upcoming Events"}
              </h2>
            </div>

            <div
              className={`gap-4 sm:gap-6 ${
                isMobile ? "grid grid-cols-1" : "grid grid-cols-1 md:grid-cols-2"
              }`}
            >
              {eventsList.map((e: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-4 hover:shadow-lg transition-all"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      {e.startDate}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 leading-snug">
                      {e.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 leading-relaxed">
                      {e.description}
                    </p>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{e.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "contact_office":
      case "contact-office":
      case "office-directory":
      case "office-locations":
      case "contact":
        return (
          <div
            className={`gap-8 items-center py-2 sm:py-4 ${
              isMobile
                ? "grid grid-cols-1"
                : isTablet
                ? "grid grid-cols-1 md:grid-cols-12"
                : "grid grid-cols-1 lg:grid-cols-12"
            }`}
          >
            <div
              className={`space-y-4 sm:space-y-6 ${
                isMobile ? "w-full" : isTablet ? "md:col-span-6" : "lg:col-span-6"
              }`}
            >
              <div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Connect With Us
                </span>
                <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5 sm:mt-1">
                  {props.title || "Constituency Office & Citizen Assistance"}
                </h2>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                {props.subtitle ||
                  "Visit our head office or reach out via email/phone. Our dedicated secretariat team is available to assist you on all working days."}
              </p>

              <div className="space-y-3.5 pt-2">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <p className="font-bold text-slate-900 dark:text-white">Head Office</p>
                    <p className="text-slate-600 dark:text-slate-300 break-words">
                      {props.officeAddress || "MLA Office, Civil Lines, Main Highway Road, Constituency Office"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-orange-600 shrink-0" />
                  <div className="text-xs sm:text-sm">
                    <span className="font-bold text-slate-900 dark:text-white">Phone: </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {props.officePhone || "+91 98765 43210"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-orange-600 shrink-0" />
                  <div className="text-xs sm:text-sm">
                    <span className="font-bold text-slate-900 dark:text-white">Email: </span>
                    <span className="text-slate-600 dark:text-slate-300 truncate">
                      {props.officeEmail || "office@constituency.in"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={isMobile ? "w-full" : isTablet ? "md:col-span-6" : "lg:col-span-6"}>
              <div className="p-5 sm:p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-4">
                  Send a Direct Message
                </h3>
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Message / Query
                    </label>
                    <textarea
                      rows={3}
                      placeholder="How can our office assist you?"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <button
                    type="button"
                    className="w-full py-3 rounded-xl bg-orange-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-700 transition-all"
                  >
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case "rich_text":
        return (
          <div className="prose prose-slate dark:prose-invert max-w-none py-2 sm:py-4">
            {props.title && <h2 className="text-xl sm:text-3xl font-extrabold mb-4">{props.title}</h2>}
            <div
              dangerouslySetInnerHTML={{
                __html:
                  props.htmlContent ||
                  props.content ||
                  "<p>Official announcement and constituency updates will appear here.</p>",
              }}
            />
          </div>
        );

      case "faq_accordion":
        return (
          <div className="max-w-4xl mx-auto py-2 sm:py-4">
            <div className="text-center mb-6 sm:mb-10">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                Citizen Helpdesk
              </span>
              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5 sm:mt-1">
                {props.title || "Frequently Asked Questions"}
              </h2>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {(
                props.faqs || [
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
              ).map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 sm:p-5"
                >
                  <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1 sm:mb-2">
                    <HelpCircle className="w-4 h-4 text-orange-500 shrink-0" />
                    {item.q}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 pl-6 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );

      case "custom_box":
      case "custom-box": {
        const boxStyle = props.boxStyle || "card";
        const imagePos = props.imagePosition || "right";

        let containerBoxClass = "rounded-2xl sm:rounded-3xl p-5 sm:p-10 transition-all";
        let isDarkTheme = false;

        if (boxStyle === "gradient") {
          containerBoxClass += " bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 text-white shadow-2xl shadow-orange-600/20";
          isDarkTheme = true;
        } else if (boxStyle === "dark") {
          containerBoxClass += " bg-slate-950 border border-slate-800 text-white shadow-2xl";
          isDarkTheme = true;
        } else if (boxStyle === "outline") {
          containerBoxClass += " bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-2 border-orange-500/40 shadow-xl";
        } else if (boxStyle === "glassmorphism") {
          containerBoxClass += " bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/60 dark:border-slate-700/60 shadow-2xl";
        } else {
          containerBoxClass += " bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl";
        }

        const featuresList = Array.isArray(props.features) ? props.features : [];

        return (
          <div className="py-2">
            <div className={containerBoxClass}>
              <div
                className={`gap-6 sm:gap-8 items-center ${
                  isMobile
                    ? "grid grid-cols-1"
                    : isTablet
                    ? "grid grid-cols-1 md:grid-cols-12"
                    : props.imageUrl && imagePos !== "background" && imagePos !== "top" && imagePos !== "bottom"
                    ? "grid grid-cols-1 lg:grid-cols-12"
                    : "grid grid-cols-1"
                }`}
              >
                {/* Top Image layout */}
                {props.imageUrl && (imagePos === "top" || isMobile) && (
                  <div className="w-full overflow-hidden rounded-2xl max-h-80 mb-2">
                    <img
                      src={getImageUrl(props.imageUrl)}
                      alt={props.title || "Custom Box"}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  </div>
                )}

                <div
                  className={
                    !isMobile && props.imageUrl && (imagePos === "right" || imagePos === "side")
                      ? isTablet
                        ? "md:col-span-7 space-y-4"
                        : "lg:col-span-7 space-y-4 sm:space-y-5"
                      : "space-y-4 sm:space-y-5"
                  }
                >
                  {props.badge && (
                    <div
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase ${
                        isDarkTheme
                          ? "bg-white/15 text-white border border-white/20"
                          : "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[280px] sm:max-w-none">{props.badge}</span>
                    </div>
                  )}

                  <h2
                    className={`text-xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight ${
                      isDarkTheme ? "text-white" : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {props.title || "Special Constituency Notice & Initiative"}
                  </h2>

                  {props.subtitle && (
                    <p
                      className={`text-xs sm:text-base font-semibold leading-relaxed ${
                        isDarkTheme ? "text-orange-100" : "text-orange-600 dark:text-orange-400"
                      }`}
                    >
                      {props.subtitle}
                    </p>
                  )}

                  {(props.description || props.content) && (
                    <p
                      className={`text-xs sm:text-sm leading-relaxed ${
                        isDarkTheme ? "text-slate-200" : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {props.description || props.content}
                    </p>
                  )}

                  {/* Feature checkmarks list */}
                  {featuresList.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 pt-2">
                      {featuresList.map((feat: any, fIdx: number) => {
                        const featText = typeof feat === "string" ? feat : feat?.title || feat?.desc || "";
                        if (!featText) return null;
                        return (
                          <div key={fIdx} className="flex items-center gap-2 text-xs font-semibold">
                            <CheckCircle2
                              className={`w-4 h-4 shrink-0 ${
                                isDarkTheme ? "text-white" : "text-orange-500"
                              }`}
                            />
                            <span className={isDarkTheme ? "text-slate-100" : "text-slate-800 dark:text-slate-200"}>
                              {featText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {((props.primaryButtonText && props.primaryButtonText !== "") ||
                    (props.secondaryButtonText && props.secondaryButtonText !== "")) && (
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      {props.primaryButtonText && (
                        <a
                          href={props.primaryButtonLink || "#"}
                          className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all inline-flex items-center justify-center gap-2 ${
                            isDarkTheme
                              ? "bg-white text-orange-700 hover:bg-orange-50"
                              : "bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:scale-[1.02] shadow-orange-500/20"
                          }`}
                        >
                          {props.primaryButtonText}
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      )}
                      {props.secondaryButtonText && (
                        <a
                          href={props.secondaryButtonLink || "#"}
                          className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm border transition-all inline-flex items-center justify-center gap-2 ${
                            isDarkTheme
                              ? "border-white/30 text-white hover:bg-white/10"
                              : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {props.secondaryButtonText}
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Image Layout */}
                {!isMobile && props.imageUrl && (imagePos === "right" || imagePos === "side") && (
                  <div className={isTablet ? "md:col-span-5" : "lg:col-span-5"}>
                    <div className="relative overflow-hidden rounded-2xl shadow-xl border border-black/5 dark:border-white/10 group">
                      <img
                        src={getImageUrl(props.imageUrl)}
                        alt={props.title || "Custom Box"}
                        className="w-full h-64 sm:h-80 object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>
                )}

                {/* Bottom Image layout */}
                {!isMobile && props.imageUrl && imagePos === "bottom" && (
                  <div className="w-full overflow-hidden rounded-2xl max-h-96 mt-2">
                    <img
                      src={getImageUrl(props.imageUrl)}
                      alt={props.title || "Custom Box"}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      case "testimonials":
      case "citizen-testimonials":
      case "citizen_feedback": {
        const testimonialsList =
          props.items && props.items.length > 0
            ? props.items
            : [
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
              ];

        return (
          <div className="py-2 sm:py-4">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                {props.badge || "Voice of Constituents"}
              </span>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5 sm:mt-1">
                {props.title || "What Citizens Say About Our Work"}
              </h2>
              {props.subtitle && (
                <p className="mt-1.5 sm:mt-3 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                  {props.subtitle}
                </p>
              )}
            </div>

            <div
              className={`gap-4 sm:gap-6 ${
                isMobile
                  ? "grid grid-cols-1"
                  : isTablet
                  ? "grid grid-cols-2"
                  : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {testimonialsList.map((t: any, idx: number) => {
                const ratingCount = Math.max(1, Math.min(5, Number(t.rating) || 5));
                return (
                  <div
                    key={idx}
                    className="relative rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 sm:p-6 flex flex-col justify-between hover:border-orange-500/50 hover:shadow-xl transition-all group"
                  >
                    <Quote className="absolute top-4 right-4 w-7 h-7 text-orange-500/10 dark:text-orange-400/10 group-hover:text-orange-500/20 transition-colors" />

                    <div>
                      {/* Star Rating */}
                      <div className="flex items-center gap-1 mb-2.5">
                        {Array.from({ length: 5 }).map((_, sIdx) => (
                          <Star
                            key={sIdx}
                            className={`w-3.5 h-3.5 ${
                              sIdx < ratingCount
                                ? "text-amber-400 fill-amber-400"
                                : "text-slate-200 dark:text-slate-700"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Quote Body */}
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic mb-4 sm:mb-6">
                        "{t.quote || "Dedicated service and genuine care for the constituency."}"
                      </p>
                    </div>

                    {/* Author Footer */}
                    <div className="flex items-center gap-3 pt-3.5 border-t border-slate-100 dark:border-slate-700/80">
                      {t.avatarUrl ? (
                        <img
                          src={getImageUrl(t.avatarUrl)}
                          alt={t.name || "Citizen"}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-orange-500/30 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                          {t.name?.charAt(0) || "C"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {t.name || "Citizen Resident"}
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {t.role || "Constituency Resident"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case "press_news":
      case "latest-news":
      case "media_coverage": {
        const newsList =
          props.items && props.items.length > 0
            ? props.items
            : [
                {
                  publication: "State Times Bureau",
                  date: "May 2026",
                  headline: "₹ 140 Crore Model Infrastructure Package Approved for Constituency",
                  summary:
                    "New underground drainage, four-lane connectivity, and community healthcare centers sanctioned under flagship masterplan.",
                  imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
                  tag: "Infrastructure",
                  link: "#",
                },
                {
                  publication: "Daily Citizen Post",
                  date: "April 2026",
                  headline: "Over 18,000 Citizen Grievances Resolved with 99% Satisfaction Rate",
                  summary:
                    "Constituency digital grievance portal recognized as a state-wide benchmark for rapid public service delivery.",
                  imageUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80",
                  tag: "Governance",
                  link: "#",
                },
                {
                  publication: "National Tribune",
                  date: "March 2026",
                  headline: "Free Mega Healthcare Camp Benefits Over 5,000 Local Families",
                  summary:
                    "Specialist doctors, free medicines, and diagnostic checkups organized across all rural and urban wards.",
                  imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80",
                  tag: "Healthcare",
                  link: "#",
                },
              ];

        return (
          <div className="py-2 sm:py-4">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                {props.badge || "Media & Press Room"}
              </span>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5 sm:mt-1">
                {props.title || "Constituency In The News"}
              </h2>
              {props.subtitle && (
                <p className="mt-1.5 sm:mt-3 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                  {props.subtitle}
                </p>
              )}
            </div>

            <div
              className={`gap-4 sm:gap-6 ${
                isMobile
                  ? "grid grid-cols-1"
                  : isTablet
                  ? "grid grid-cols-2"
                  : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {newsList.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col justify-between hover:border-orange-500/50 hover:shadow-xl transition-all group"
                >
                  <div>
                    {item.imageUrl ? (
                      <div className="h-44 sm:h-48 overflow-hidden relative">
                        <img
                          src={getImageUrl(item.imageUrl)}
                          alt={item.headline || "News"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {item.tag && (
                          <span className="absolute top-3 left-3 bg-orange-600/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shadow-md">
                            {item.tag}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-24 sm:h-28 bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-between px-5">
                        <Newspaper className="w-8 h-8 text-orange-500/50" />
                        {item.tag && (
                          <span className="bg-orange-600 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shadow-md">
                            {item.tag}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="p-4 sm:p-6 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span className="text-orange-600 dark:text-orange-400 font-bold truncate max-w-[60%]">
                          {item.publication || "Press Release"}
                        </span>
                        <span className="shrink-0">{item.date || "Recent"}</span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                        {item.headline || "Constituency Development Milestone"}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                        {item.summary || "Details and ground reports of the development project."}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 pb-4 sm:px-6 sm:pb-6 pt-1 sm:pt-2">
                    <a
                      href={item.link || "#"}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                    >
                      Read Full Article <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "gallery": {
        const galleryItems =
          props.items && props.items.length > 0
            ? props.items
            : [
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
                {
                  title: "Modern Smart Classroom Launch",
                  category: "Education",
                  date: "2026",
                  imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80",
                },
                {
                  title: "Janata Darbar Open Citizen Hearing",
                  category: "Public Service",
                  date: "2026",
                  imageUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80",
                },
              ];

        return (
          <div className="py-2 sm:py-4">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                {props.badge || "Constituency Gallery"}
              </span>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5 sm:mt-1">
                {props.title || "Glimpses of Grassroots Progress"}
              </h2>
              {props.subtitle && (
                <p className="mt-1.5 sm:mt-3 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                  {props.subtitle}
                </p>
              )}
            </div>

            <div
              className={`gap-3.5 sm:gap-5 ${
                isMobile
                  ? "grid grid-cols-1 sm:grid-cols-2"
                  : isTablet
                  ? "grid grid-cols-2"
                  : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {galleryItems.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="group relative rounded-2xl overflow-hidden shadow-md bg-slate-900 aspect-[4/3] border border-slate-200 dark:border-slate-800"
                >
                  <img
                    src={getImageUrl(item.imageUrl)}
                    alt={item.title || "Gallery photo"}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-3.5 sm:p-4 flex flex-col justify-end">
                    {item.category && (
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase text-orange-400 tracking-wider">
                        {item.category}
                      </span>
                    )}
                    <h4 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2">
                      {item.title || "Constituency Event"}
                    </h4>
                    {item.date && (
                      <span className="text-[10px] text-slate-300 mt-0.5">{item.date}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "features_grid": {
        const features =
          props.items && props.items.length > 0
            ? props.items
            : [
                {
                  icon: "shield",
                  title: "Transparent & Accountable Governance",
                  description:
                    "Every public tender and fund utilization is audited and accessible to citizens online.",
                },
                {
                  icon: "heart",
                  title: "Accessible & Subsidized Healthcare",
                  description:
                    "Primary health centers equipped with 24/7 doctors, ambulances, and essential diagnostic tests.",
                },
                {
                  icon: "users",
                  title: "Youth Skills & Job Opportunities",
                  description:
                    "Free vocational training centers, digital learning labs, and annual constituency mega job fairs.",
                },
                {
                  icon: "building",
                  title: "World-Class Infrastructure",
                  description:
                    "Paved all-weather roads, storm drainage systems, and 24x7 clean piped drinking water.",
                },
                {
                  icon: "award",
                  title: "Direct Farmer & Welfare Assistance",
                  description:
                    "Crop insurance desks, farmer subsidies, and zero-fee processing for government schemes.",
                },
                {
                  icon: "sparkles",
                  title: "Safe, Green & Clean Environment",
                  description:
                    "Solar street lighting, waste management initiatives, and urban tree plantation drives.",
                },
              ];

        const renderIcon = (iconName: string) => {
          switch (iconName?.toLowerCase()) {
            case "shield":
              return <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />;
            case "heart":
              return <HeartHandshake className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />;
            case "users":
              return <Users className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />;
            case "building":
              return <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />;
            case "award":
              return <Award className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />;
            case "sparkles":
              return <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />;
            case "zap":
              return <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />;
            default:
              return <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />;
          }
        };

        return (
          <div className="py-2 sm:py-4">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                {props.badge || "Strategic Vision"}
              </span>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5 sm:mt-1">
                {props.title || "Our Core Governance Commitments"}
              </h2>
              {props.subtitle && (
                <p className="mt-1.5 sm:mt-3 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                  {props.subtitle}
                </p>
              )}
            </div>

            <div
              className={`gap-4 sm:gap-6 ${
                isMobile
                  ? "grid grid-cols-1"
                  : isTablet
                  ? "grid grid-cols-2"
                  : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {features.map((feat: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 sm:p-6 hover:border-orange-500/50 hover:shadow-xl transition-all group"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-500/10 dark:bg-orange-950/40 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                    {renderIcon(feat.icon)}
                  </div>
                  <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5 leading-snug">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "newsletter": {
        const benefitsList = Array.isArray(props.benefits)
          ? props.benefits
          : [
              "Instant Janata Darbar schedule updates",
              "Direct welfare scheme notifications",
              "Zero spam, only official verified alerts",
            ];

        return (
          <div className="py-2">
            <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-slate-950 via-slate-900 to-orange-950 text-white p-5 sm:p-10 lg:p-12 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="max-w-3xl mx-auto text-center space-y-3.5 sm:space-y-6 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-orange-500/20 text-orange-400 font-bold text-[11px] sm:text-xs uppercase tracking-wider border border-orange-500/30">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>{props.badge || "Direct Citizen Broadcast"}</span>
                </div>

                <h2 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                  {props.title || "Stay Updated on Constituency News & Welfare Alerts"}
                </h2>

                <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
                  {props.subtitle ||
                    "Subscribe for instant notifications on upcoming Janata Darbar dates, scheme enrollments, and emergency ward advisories."}
                </p>

                {/* Benefits Pill list */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 pt-1 sm:pt-2">
                  {benefitsList.map((b: string, bIdx: number) => (
                    <div
                      key={bIdx}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm text-[10px] sm:text-[11px] font-semibold text-slate-200 border border-white/10"
                    >
                      <CheckCircle className="w-3 h-3 text-orange-400 shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                {/* Subscription Form */}
                <div className="max-w-md mx-auto pt-2 sm:pt-3">
                  <div className="flex flex-col sm:flex-row gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/20 backdrop-blur-md shadow-lg">
                    <input
                      type="text"
                      placeholder={props.placeholder || "Enter WhatsApp number or Email"}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:bg-white/20"
                    />
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs sm:text-sm shadow-md hover:scale-[1.02] transition-all whitespace-nowrap"
                    >
                      {props.buttonText || "Subscribe Free"}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    🔒 Official helpline channel. We respect your privacy and never send spam.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "video_embed":
        return (
          <div className="max-w-4xl mx-auto py-2 sm:py-4">
            <div className="text-center mb-4 sm:mb-6">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                {props.badge || "Video Broadcast"}
              </span>
              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5 sm:mt-1">
                {props.title || "Constituency Video & Address"}
              </h2>
              {props.subtitle && (
                <p className="mt-1.5 sm:mt-2 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                  {props.subtitle}
                </p>
              )}
            </div>

            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black aspect-video border border-slate-200 dark:border-slate-800">
              {props.videoUrl ? (
                <iframe
                  src={props.videoUrl.replace("watch?v=", "embed/")}
                  title={props.title || "Video"}
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/70 p-6 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-orange-600/80 flex items-center justify-center mb-3 text-white shadow-xl">
                    <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-white ml-0.5" />
                  </div>
                  <p className="font-semibold text-xs sm:text-sm">Add a YouTube or MP4 video URL in the inspector</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center my-4">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Section: {type}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {props.title || "Custom section block"}
            </p>
          </div>
        );
    }
  };

  return (
    <div
      id={`section-${section.id}`}
      onClick={isEditing ? onSelect : undefined}
      onDragOver={isEditing ? onDragOver : undefined}
      onDragLeave={isEditing ? onDragLeave : undefined}
      onDrop={isEditing ? onDrop : undefined}
      style={containerStyle}
      className={`relative group scroll-mt-6 transition-all ${
        type === "navbar"
          ? "px-4 sm:px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          : "py-6 sm:py-10 md:py-14"
      } ${
        isEditing
          ? `cursor-pointer border-2 transition-colors ${
              isSelected
                ? "border-orange-500 shadow-xl ring-2 ring-orange-500/20"
                : "border-transparent hover:border-orange-300 dark:hover:border-orange-500/40"
            } ${
              isDragging ? "opacity-40 border-dashed border-2 border-orange-400 scale-[0.99]" : ""
            }`
          : ""
      }`}
    >
      {/* Visual Drop Line Indicator (Top) */}
      {isEditing && isDropTarget && dropPosition === "top" && (
        <div className="absolute -top-3 left-4 right-4 z-40 flex items-center justify-center pointer-events-none">
          <div className="w-full h-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 rounded-full shadow-lg shadow-orange-500/50 animate-pulse flex items-center justify-center">
            <span className="bg-orange-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-md">
              Insert Section Here
            </span>
          </div>
        </div>
      )}

      {/* Visual Drop Line Indicator (Bottom) */}
      {isEditing && isDropTarget && dropPosition === "bottom" && (
        <div className="absolute -bottom-3 left-4 right-4 z-40 flex items-center justify-center pointer-events-none">
          <div className="w-full h-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 rounded-full shadow-lg shadow-orange-500/50 animate-pulse flex items-center justify-center">
            <span className="bg-orange-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-md">
              Insert Section Here
            </span>
          </div>
        </div>
      )}

      {/* Floating Action Controls on Canvas - ONLY visible when section is selected */}
      {isEditing && isSelected && (
        <div
          className="absolute -top-3.5 right-6 z-30 flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1 rounded-full border border-orange-500 shadow-xl ring-4 ring-orange-500/15 select-none animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Drag Grip Handle with Mouse */}
          <div
            draggable={true}
            onDragStart={onDragStart}
            className="flex items-center gap-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-orange-600 pr-1.5 border-r border-slate-200 dark:border-slate-700 py-0.5"
            title="Click and drag with mouse to move up / down"
          >
            <GripVertical className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              {type.replace("_", " ")}
            </span>
          </div>

          <button
            type="button"
            disabled={!canMoveUp}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp?.();
            }}
            className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 hover:text-orange-600 transition-colors"
            title="Move Section Up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown?.();
            }}
            className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 hover:text-orange-600 transition-colors"
            title="Move Section Down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="Delete Section"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className={getContainerWidthClass()}>
        {renderContent()}
      </div>
    </div>
  );
};
