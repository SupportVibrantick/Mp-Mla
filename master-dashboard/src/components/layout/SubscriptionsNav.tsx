import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Layers, Users, Calendar, Receipt } from "lucide-react";

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
      label: "Invoices",
      href: "/subscriptions/invoices",
      icon: Receipt,
    },
  ];

  return (
    <div className="flex border-b border-border/60 pb-px mb-6 overflow-x-auto scrollbar-none">
      <div className="flex space-x-1 p-1 bg-muted/30 rounded-xl border border-border/40">
        {tabs.map((tab) => {
          const isActive = location === tab.href;
          const Icon = tab.icon;

          return (
            <Link key={tab.href} href={tab.href}>
              <div
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 select-none whitespace-nowrap",
                  isActive
                    ? "bg-background text-primary shadow-sm border border-border/40"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{tab.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
