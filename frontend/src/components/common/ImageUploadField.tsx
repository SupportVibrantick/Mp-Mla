import React, { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Loader2, Link as LinkIcon, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { getImageUrl } from "@/lib/utils";

interface ImageUploadFieldProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  websiteId?: string;
  placeholder?: string;
  className?: string;
  aspectRatio?: "square" | "portrait" | "landscape" | "auto";
  helperText?: string;
  disabled?: boolean;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  websiteId,
  placeholder = "Upload an image",
  className = "",
  aspectRatio = "auto",
  helperText,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  const handleFile = async (file: File) => {
    if (!file || disabled) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, SVG, WebP)");
      return;
    }

    // Generate local preview immediately for instant feedback
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        onChange(base64);
      }
    };
    reader.readAsDataURL(file);

    // Upload to server
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);

      const endpoint = websiteId
        ? `/admin/websites/${websiteId}/assets/upload`
        : `/admin/websites/upload`;

      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success && (res.data.data?.fileUrl || res.data.data?.url)) {
        onChange(res.data.data.fileUrl || res.data.data.url);
      }
    } catch (err) {
      console.warn("Server upload failed, falling back to local base64/creatives uploader:", err);
      try {
        const formData2 = new FormData();
        formData2.append("asset", file);
        formData2.append("name", file.name);
        formData2.append("type", "OTHER");
        const fallbackRes = await api.post("/admin/creatives/upload-asset", formData2, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (fallbackRes.data?.data?.fileUrl) {
          onChange(fallbackRes.data.data.fileUrl);
        }
      } catch (fallbackErr) {
        console.warn("Fallback upload failed, retaining base64 data URL", fallbackErr);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // reset input so same file can be selected again
    e.target.value = "";
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlDraft.trim()) {
      onChange(urlDraft.trim());
      setUrlDraft("");
      setShowUrlInput(false);
    }
  };

  const displayUrl = value ? getImageUrl(value) : "";

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label}
          </label>
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 hover:underline flex items-center gap-1"
          >
            <LinkIcon className="w-3 h-3" />
            {showUrlInput ? "Use File Upload" : "Enter Image URL"}
          </button>
        </div>
      )}

      {showUrlInput ? (
        <form onSubmit={handleUrlSubmit} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={urlDraft || value || ""}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="https://example.com/image.png"
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors"
            >
              Set
            </button>
          </div>
          {value && (
            <p className="text-[11px] text-slate-500 truncate">
              Current: <span className="font-mono">{value}</span>
            </p>
          )}
        </form>
      ) : displayUrl ? (
        /* Image Preview Box */
        <div className="relative group rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-2.5 overflow-hidden transition-all hover:border-orange-300 dark:hover:border-orange-500/50">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
              <img
                src={displayUrl}
                alt={label || "Uploaded"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'><rect width='18' height='18' x='3' y='3' rx='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>";
                }}
              />
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {label || "Image Uploaded"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono mt-0.5">
                {value?.startsWith("data:") ? "Local Image Preview" : value}
              </p>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  disabled={disabled || isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 shadow-2xs transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Replace
                </button>
                <button
                  type="button"
                  disabled={disabled || isUploading}
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Upload Drag & Drop Area */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 scale-[0.99]"
              : "border-slate-300 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-500 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-orange-50/20"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-xs">
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isUploading ? "Uploading Image..." : "Click or Drag & Drop Image"}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                PNG, JPG, SVG, WebP up to 10MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {helperText && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
};
