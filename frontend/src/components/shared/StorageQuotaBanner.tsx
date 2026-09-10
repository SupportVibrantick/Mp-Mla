import { useState } from "react";
import { Link } from "wouter";
import { useAccountUsage } from "@/hooks/useAccount";
import { AlertTriangle, HardDrive, ArrowUpRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StorageQuotaBannerProps {
  /** If true, only renders when storage usage >= 80% or >= 100%. Defaults to true */
  warningOnly?: boolean;
  className?: string;
}

export function formatStorageSize(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export function StorageQuotaBanner({
  warningOnly = true,
  className = "",
}: StorageQuotaBannerProps) {
  const { data: usage, isLoading } = useAccountUsage();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || !usage?.storage) return null;

  const { usedMB, limitMB } = usage.storage;

  // If unlimited storage
  if (!limitMB || limitMB <= 0) {
    if (warningOnly) return null;
    return (
      <div
        className={`flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground ${className}`}
      >
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-primary" />
          <span>
            Storage: <strong className="text-foreground">{formatStorageSize(usedMB)}</strong> used (Unlimited Storage plan)
          </span>
        </div>
      </div>
    );
  }

  const percentUsed = Math.min(100, Math.round((usedMB / limitMB) * 100));
  const isFull = percentUsed >= 100;
  const isWarning = percentUsed >= 80;

  if (warningOnly && !isWarning) return null;
  if (dismissed && !isFull) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
        isFull
          ? "border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/20"
          : isWarning
            ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
            : "border-border/60 bg-card text-foreground"
      } ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
              isFull
                ? "bg-destructive text-destructive-foreground shadow-sm"
                : isWarning
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-primary/10 text-primary"
            }`}
          >
            {isFull ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <HardDrive className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold">
                {isFull
                  ? "Storage Quota Exceeded (Uploads Blocked)"
                  : isWarning
                    ? `Storage Warning: ${percentUsed}% Used`
                    : "Tenant Storage Usage"}
              </h4>
              <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs">
                {percentUsed}% Quota
              </span>
            </div>
            <p className="mt-0.5 text-xs opacity-90">
              {isFull
                ? `You have reached your limit of ${formatStorageSize(limitMB)} (${formatStorageSize(usedMB)} used). Further file uploads are restricted until you upgrade.`
                : `You have utilized ${formatStorageSize(usedMB)} of your ${formatStorageSize(limitMB)} quota. Upgrade your plan to prevent upload disruptions.`}
            </p>
            {/* Storage Progress Bar */}
            <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-background/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isFull
                    ? "bg-destructive"
                    : isWarning
                      ? "bg-amber-500"
                      : "bg-primary"
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            asChild
            size="sm"
            className={`h-8 rounded-xl px-3 text-xs font-semibold shadow-xs ${
              isFull
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : isWarning
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : ""
            }`}
          >
            <Link to="/account/billing">
              Upgrade Plan
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          {!isFull && (
            <button
              onClick={() => setDismissed(true)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
export default StorageQuotaBanner;
