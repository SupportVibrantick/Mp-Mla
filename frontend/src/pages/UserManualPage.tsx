import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  BookOpen,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useSystemSettings } from "@/contexts/SettingsContext";

export default function UserManualPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { settings } = useSystemSettings();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const orgName = settings?.platform_name || "MP-MLA Platform";

  useEffect(() => {
    document.title = `User Manual — ${orgName}`;
  }, [orgName]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* ─── Sticky Header Bar ─── */}
      {!isFullscreen && (
        <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="max-w-[1920px] mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-[#13538A] dark:hover:text-[#38bdf8] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Login</span>
              </Link>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

              <div className="flex items-center gap-2">
                <div className="bg-[#13538A] p-1.5 rounded-lg text-white">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                    User Manual
                  </h1>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none hidden sm:block">
                    Complete operating guide for {orgName}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-all"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">
                  {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                </span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* ─── Fullscreen exit button (floating) ─── */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="fixed top-3 right-3 z-[9999] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 text-white hover:bg-slate-900 text-xs font-bold shadow-2xl backdrop-blur-md transition-all"
        >
          <Minimize2 className="h-3.5 w-3.5" />
          Exit Fullscreen
        </button>
      )}

      {/* ─── Documentation Iframe ─── */}
      <div
        className={`flex-1 ${isFullscreen ? "fixed inset-0 z-[9998]" : ""}`}
      >
        <iframe
          ref={iframeRef}
          src="/docs/index.html"
          title="User Manual - MP-MLA Platform Documentation"
          className="w-full h-full border-0"
          style={{
            minHeight: isFullscreen ? "100vh" : "calc(100vh - 56px)",
          }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    </div>
  );
}
