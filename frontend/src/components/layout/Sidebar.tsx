import { Link, useLocation } from "wouter";
import { cn, getImageUrl } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquareWarning,
  ClipboardList,
  Building2,
  Users,
  FileText,
  Map,
  BarChart3,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BarChart4,
  BarChart,
  Landmark,
  IndianRupeeIcon,
  Cake,
  Trash2,
  CalendarDays,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/contexts/SettingsContext";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { user, logout, canAny, hasModule } = useAuth();
  const { settings } = useSystemSettings();

  const [location] = useLocation();

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },

    {
      label: "Projects",
      icon: ClipboardList,
      href: "/projects",
      module: "projects",
    },
    {
      label: "Public Facilities",
      icon: Building2,
      href: "/public-facilities",
      module: "institutions",
    },

    {
      label: " Community Groups",
      icon: Users,
      href: "/community",
      module: "community_groups",
    },

    // { label: "Schemes", icon: FileText, href: "/schemes", module: "schemes" },
    { label: "Wards", icon: Map, href: "/wards", module: "wards" },
    {
      label: "Demographics",
      icon: BarChart,
      href: "/demographics",
      module: "demographics",
    },
    {
      label: "Departments",
      icon: Landmark,
      href: "/departments",
      module: "departments",
    },
    {
      label: "Funds",
      icon: IndianRupeeIcon,
      href: "/funds",
      module: "funds",
    },
    // { type: "divider", label: "People" },
    { label: "Local Representatives", icon: Users, href: "/leaders", module: "leaders" },
    {
      label: "Birthdays",
      icon: Cake,
      href: "/leaders/birthdays",
      module: "leaders",
    },
    {
      label: "Public Requests",
      icon: MessageSquareWarning,
      href: "/public-requests",
      module: "grievances",
    },
    {
      label: "Meetings & Events",
      icon: CalendarDays,
      href: "/meetings",
      module: "meeting",
    },
    { label: "Reports", icon: BarChart3, href: "/reports", module: "reports" },
    {
      label: "Competitor Analysis",
      icon: BarChart4,
      href: "/competitor-analysis",
      module: "competitors",
    },
  ];

  const filteredNavItems = navItems.filter(
    (item: any) =>
      !item.module ||
      (hasModule(item.module) && (canAny(item.module) || user?.role === "SYSTEM_ADMIN")),
  );

  const adminItems = [
    { label: "User Management", icon: Users, href: "/users", module: "users" },
    {
      label: "Permissions",
      icon: Shield,
      href: "/permissions",
      module: "users",
    },
  ].filter(
    (item) =>
      !item.module ||
      (hasModule(item.module) && (canAny(item.module) || user?.role === "SYSTEM_ADMIN")),
  );

  const bottomItems = [
    {
      label: "Billing",
      icon: CreditCard,
      href: "/billing",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/settings",
      module: "settings",
    },
    {
      label: "Audit Logs",
      icon: Shield,
      href: "/audit-logs",
      module: "audit_logs",
    },
    {
      label: "Recycle Bin",
      icon: Trash2,
      href: "/recycle-bin",
      module: "recycle_bin",
    },
  ].filter(
    (item) =>
      !item.module ||
      (hasModule(item.module) && (canAny(item.module) || user?.role === "SYSTEM_ADMIN")),
  );

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        className="h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 text-white border-r border-indigo-950/50 flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 shadow-2xl"
      >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-indigo-950/50">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            {settings.brand_logo_url ? (
              <div className="h-10 max-w-[160px] flex-shrink-0 flex items-center justify-start">
                <img
                  src={getImageUrl(settings.brand_logo_url)}
                  alt="Logo"
                  className="h-full w-auto object-contain"
                />
              </div>
            ) : (
              <>
                <div className="bg-primary/20 p-1.5 rounded-lg flex-shrink-0">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h1 className="font-heading font-bold text-sm leading-tight truncate">
                    {settings.org_name || "Constituency"}
                  </h1>
                  <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider">
                    {settings.org_short_name || "Management Portal"}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            {settings.brand_logo_url ? (
              <div className="h-8 max-w-[50px] flex items-center justify-center">
                <img
                  src={getImageUrl(settings.brand_logo_url)}
                  alt="Logo"
                  className="h-full w-auto object-contain"
                />
              </div>
            ) : (
              <Shield className="h-8 w-8 text-primary" />
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "hidden",
          )}
          onClick={() => setCollapsed(true)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto sidebar-scroll py-4 px-2 space-y-1">
        {filteredNavItems.map((item) => {
          const isActive = location === item.href;
          const content = (
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative",
                isActive
                  ? "bg-indigo-600/35 text-white font-bold border-l-2 border-indigo-400 rounded-none rounded-r-lg shadow-sm"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 min-w-5",
                  isActive ? "text-white" : "group-hover:text-white",
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </div>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href}>{content}</Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={14} className="font-semibold text-xs ml-1">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link key={item.href} href={item.href}>
              {content}
            </Link>
          );
        })}

        {adminItems.length > 0 && (
          <>
            <div className="mt-6 mb-2 px-3">
              {!collapsed ? (
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  Administration
                </p>
              ) : (
                <div className="border-t border-indigo-950/50 mx-2" />
              )}
            </div>

            {adminItems.map((item) => {
              const isActive = location === item.href;
              const content = (
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative",
                    isActive
                      ? "bg-indigo-600/35 text-white font-bold border-l-2 border-indigo-400 rounded-none rounded-r-lg shadow-sm"
                      : "text-white/70 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 min-w-5",
                      isActive ? "text-white" : "group-hover:text-white",
                    )}
                  />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </div>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link href={item.href}>{content}</Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={14} className="font-semibold text-xs ml-1">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link key={item.href} href={item.href}>
                  {content}
                </Link>
              );
            })}
          </>
        )}

        <div className="my-4 border-t border-indigo-950/50 mx-2" />

        {bottomItems.map((item) => {
          const isActive = location === item.href;
          const content = (
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative",
                isActive
                  ? "bg-indigo-600/35 text-white font-bold border-l-2 border-indigo-400 rounded-none rounded-r-lg shadow-sm"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon className="h-5 w-5 min-w-5" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </div>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href}>{content}</Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={14} className="font-semibold text-xs ml-1">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link key={item.href} href={item.href}>
              {content}
            </Link>
          );
        })}
      </div>

      {/* Expand Button (when collapsed) */}
      {collapsed && (
        <div className="p-2 flex justify-center border-t border-indigo-950/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="text-white hover:bg-white/5"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* User Profile */}
      <div className="p-4 border-t border-indigo-950/50 bg-white/5">
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed ? "justify-center" : "",
          )}
        >
          <Avatar className="h-9 w-9 border border-indigo-900/50 shadow-sm">
            <AvatarImage src={user?.avatarUrl || ""} />
            <AvatarFallback className="bg-primary/20 text-primary-foreground">
              {user?.name?.substring(0, 2).toUpperCase() || "CN"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">{user?.name}</p>
              <p className="text-xs text-indigo-300 truncate">
                {user?.role}
              </p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-indigo-200 hover:bg-rose-500/10 hover:text-rose-400"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.aside>
    </TooltipProvider>
  );
}
