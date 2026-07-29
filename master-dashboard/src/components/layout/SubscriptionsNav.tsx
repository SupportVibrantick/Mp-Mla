import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Layers, Users, Calendar, Receipt, ArrowUpCircle } from "lucide-react";

export function SubscriptionsNav() {
  const [location] = useLocation();

  const tabs = [
    {
      label: "Plans & Tiers",
      href: "/subscriptions",
      icon: Layers,
    },
    {
      label: "Tenant Subscriptions",
      href: "/subscriptions/tenants",
      icon: Users,
    },
    {
      label: "Upcoming Renewals",
      href: "/subscriptions/renewals",
      icon: Calendar,
    },
    {
      label: "Upgrade Requests",
      href: "/subscriptions/upgrade-requests",
      icon: ArrowUpCircle,
    },
    {
      label: "Invoices",
      href: "/subscriptions/invoices",
      icon: Receipt,
    },
  ];

  return (
    <div className="flex mb-8 overflow-x-auto scrollbar-none">
      <div className="flex space-x-1.5 p-1.5 bg-muted/40 backdrop-blur-md rounded-2xl border border-border/60 shadow-inner">
        {tabs.map((tab) => {
          const isActive = location === tab.href;
          const Icon = tab.icon;

          return (
            <Link key={tab.href} href={tab.href}>
              <div
                className={cn(
                  "flex items-center gap-2.5 px-5 py-2.5 rounded-xl cursor-pointer text-sm font-semibold transition-all duration-300 select-none whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]",
                  isActive
                    ? "bg-background text-primary shadow-[0_2px_8px_rgba(59,130,246,0.08)] border border-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <Icon className={cn("h-4 w-4 transition-transform duration-300", isActive ? "text-primary scale-110" : "text-muted-foreground")} />
                <span>{tab.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
