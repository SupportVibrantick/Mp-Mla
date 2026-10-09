import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Sparkles, AlertTriangle, ArrowRight, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function TrialBanner() {
  const {
    user,
    isTrialActive,
    isTrialExpired,
    isSubscriptionExpired,
    isSubscriptionSuspended,
    trialDaysRemaining,
  } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const subscription = user?.tenant?.subscription;

  // Allow user to dismiss active trial banner if more than 3 days remain
  if (dismissed && isTrialActive && trialDaysRemaining > 3) {
    return null;
  }

  // 1. Free Trial Expired / Subscription Expired Banner (Permanent until reactivated)
  if (isSubscriptionExpired || isTrialExpired) {
    return (
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between flex-wrap gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-full bg-white/20">
            <ShieldAlert className="h-4 w-4 text-white" />
          </div>
          <span>
            <strong className="font-bold tracking-wide">Free Trial Expired:</strong> Your organization's trial has ended and workspace operations are locked.
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Link href="/billing">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white text-red-700 hover:bg-slate-100 font-semibold shadow-sm h-8 px-3 text-xs cursor-pointer"
            >
              Reactivate Account <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 2. Subscription Suspended Banner
  if (isSubscriptionSuspended) {
    return (
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between flex-wrap gap-2 text-sm font-medium">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-200" />
          <span>
            <strong className="font-bold">Subscription Suspended:</strong> Please clear outstanding invoices to restore full access.
          </span>
        </div>
        <Link href="/billing">
          <Button
            size="sm"
            variant="secondary"
            className="bg-white text-amber-800 hover:bg-slate-100 font-semibold shadow-sm h-8 px-3 text-xs ml-auto cursor-pointer"
          >
            Pay Dues <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    );
  }

  // 3. Active Free Trial Banner with countdown
  if (isTrialActive) {
    const isUrgent = trialDaysRemaining <= 3;
    const formattedDate = subscription?.trialEndsAt
      ? new Date(subscription.trialEndsAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;

    return (
      <div
        className={`px-4 py-2 text-xs md:text-sm font-medium shadow-sm flex items-center justify-between flex-wrap gap-2 transition-all duration-300 ${
          isUrgent
            ? "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white"
            : "bg-gradient-to-r from-blue-600 via-indigo-600 to-primary text-white"
        }`}
      >
        <div className="flex items-center gap-2">
          {isUrgent ? (
            <Clock className="h-4 w-4 animate-pulse text-amber-200" />
          ) : (
            <Sparkles className="h-4 w-4 text-yellow-300" />
          )}
          <span>
            <span className="font-bold uppercase tracking-wider text-[11px] bg-white/20 px-2 py-0.5 rounded-full mr-2">
              Free Trial
            </span>
            {isUrgent ? (
              <span>
                <strong>{trialDaysRemaining} day{trialDaysRemaining === 1 ? "" : "s"} left</strong> in your trial (ends {formattedDate}). Upgrade now to avoid service disruption!
              </span>
            ) : (
              <span>
                You are enjoying a free trial with <strong>{trialDaysRemaining} day{trialDaysRemaining === 1 ? "" : "s"} remaining</strong> (ends {formattedDate}).
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Link href="/billing">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white text-slate-900 hover:bg-slate-100 font-semibold shadow-sm h-7 px-3 text-xs cursor-pointer"
            >
              Upgrade Plan <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
          {!isUrgent && (
            <button
              onClick={() => setDismissed(true)}
              className="text-white/80 hover:text-white text-xs px-1.5 py-0.5 ml-1 cursor-pointer"
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}