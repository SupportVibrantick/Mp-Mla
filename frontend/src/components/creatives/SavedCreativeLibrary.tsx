import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { FileText, CheckCircle2, Clock, XCircle, Share2, Copy, Trash2, Edit3, Search, Filter } from "lucide-react";
import { SavedCreativeItem, CreativeStatus } from "@/types/creative";
import { getImageUrl } from "@/lib/utils";

interface SavedCreativeLibraryProps {
  savedCreatives: SavedCreativeItem[];
  onOpenCreative: (creative: SavedCreativeItem) => void;
  onSubmitApproval: (id: string) => void;
  onApproveCreative?: (id: string) => void;
  onRejectCreative?: (id: string) => void;
  onDeleteCreative: (id: string) => void;
  onDuplicateCreative?: (creative: SavedCreativeItem) => void;
  onShareCreative?: (id: string) => void;
}

export function SavedCreativeLibrary({
  savedCreatives,
  onOpenCreative,
  onSubmitApproval,
  onApproveCreative,
  onRejectCreative,
  onDeleteCreative,
  onDuplicateCreative,
  onShareCreative,
}: SavedCreativeLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteItem, setTargetDeleteItem] = useState<SavedCreativeItem | null>(null);

  const filteredCreatives = savedCreatives.filter((item) => {
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const confirmDelete = () => {
    if (targetDeleteItem) {
      onDeleteCreative(targetDeleteItem.id);
      setDeleteModalOpen(false);
      setTargetDeleteItem(null);
    }
  };

  return (
    <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 space-y-4">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-bold flex items-center justify-between">
          <span className="text-slate-900 dark:text-white">Saved Creatives Library</span>
          <Badge variant="outline" className="font-mono text-xs border-emerald-200 text-[#047857] bg-emerald-50">
            {filteredCreatives.length} Saved Designs
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Access your saved creative posters, manage approval workflows, or duplicate existing designs.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Search & Filter Tabs Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search saved designs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 rounded-xl border-slate-200"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {["ALL", "DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? "bg-[#047857] text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {st === "ALL" ? "All" : st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Saved Cards Grid */}
        {filteredCreatives.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold">No saved designs found.</p>
            <p className="text-xs text-slate-400">Save a poster draft to populate your library.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredCreatives.map((item) => (
              <Card
                key={item.id}
                className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-md transition-all bg-white dark:bg-slate-950 flex flex-col justify-between"
              >
                {/* Poster Thumbnail / Preview Header */}
                <div className="h-44 bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center relative p-3 border-b border-slate-200/80 overflow-hidden">
                  <Badge
                    className={`absolute top-2 left-2 text-[10px] font-bold ${
                      item.status === "APPROVED"
                        ? "bg-emerald-500 text-white"
                        : item.status === "PENDING_REVIEW"
                        ? "bg-amber-500 text-white"
                        : "bg-slate-700 text-white"
                    }`}
                  >
                    {item.status}
                  </Badge>

                  {item.previewUrl ? (
                    <img src={getImageUrl(item.previewUrl)} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-center space-y-1 p-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#047857] flex items-center justify-center font-bold text-lg shadow-sm">
                        {item.title[0]}
                      </div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">{item.format}</span>
                    </div>
                  )}
                </div>

                {/* Card Content & Action Buttons */}
                <CardContent className="p-3.5 space-y-3 flex-1 flex flex-col justify-between text-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white truncate">{item.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">v{item.version}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold border-slate-200">
                        {item.category}
                      </Badge>
                      <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenCreative(item)}
                      className="rounded-xl h-8 text-xs flex-1 font-bold gap-1 border-slate-200 text-[#047857]"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Open
                    </Button>

                    {onDuplicateCreative && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDuplicateCreative(item)}
                        className="rounded-xl h-8 text-xs px-2.5 font-bold border-slate-200 text-slate-700"
                        title="Duplicate design"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {onShareCreative && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onShareCreative(item.id)}
                        className="rounded-xl h-8 text-xs px-2.5 font-bold border-slate-200 text-slate-700"
                        title="Share link"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {item.status === "DRAFT" && (
                      <Button
                        size="sm"
                        onClick={() => onSubmitApproval(item.id)}
                        className="rounded-xl h-8 text-xs bg-[#047857] hover:bg-[#064e3b] text-white font-bold"
                      >
                        Submit
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setTargetDeleteItem(item);
                        setDeleteModalOpen(true);
                      }}
                      className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600">Delete Saved Creative?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to permanently delete "{targetDeleteItem?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
