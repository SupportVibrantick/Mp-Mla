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
  Puzzle,
  Layers,
  Receipt,
  ArrowUpCircle,
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
  const { user, logout, canAny } = useAuth();
  const { settings } = useSystemSettings();

  const [location] = useLocation();

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  ];

  const filteredNavItems = navItems.filter(
    (item: any) =>
      !item.module || canAny(item.module) || user?.role === "SUPER_ADMIN",
  );

  const adminItems = [
    {
      label: "Tenant Management",
      icon: Building2,
      href: "/tenants",
      module: "tenants",
    },
    {
      label: "Plans & Tiers",
      icon: Layers,
      href: "/subscriptions",
      module: "subscriptions",
    },
    {
      label: "Tenant Subscriptions",
      icon: Users,
      href: "/subscriptions/tenants",
      module: "subscriptions",
    },
    {
      label: "Upcoming Renewals",
      icon: CalendarDays,
      href: "/subscriptions/renewals",
      module: "subscriptions",
    },
    {
      label: "Upgrade Requests",
      icon: ArrowUpCircle,
      href: "/subscriptions/upgrade-requests",
      module: "subscriptions",
    },
    {
      label: "Invoices",
      icon: Receipt,
      href: "/subscriptions/invoices",
      module: "subscriptions",
    },
    {
      label: "Modules & Addons",
      icon: Puzzle,
      href: "/modules",
      module: "modules",
    },
    {
      label: "Payments",
      icon: IndianRupeeIcon,
      href: "/payments",
      module: "payments",
    },
    { label: "Platform Users", icon: Users, href: "/users", module: "users" },
  ].filter(
    (item) =>
      !item.module || canAny(item.module) || user?.role === "SUPER_ADMIN",
  );

  const bottomItems = [
    {
      label: "Settings",
      icon: Settings,
      href: "/settings",
      module: "settings",
    },
    {
      label: "Profile",
      icon: Users,
      href: "/profile",
    },
  ].filter(
    (item) =>
      !item.module || canAny(item.module) || user?.role === "SUPER_ADMIN",
  );

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        className="h-screen bg-[#13538A] text-white border-r border-[#5D28A8] flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 shadow-2xl dark:bg-gray-900 dark:border-gray-800"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 bg-transparent">
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
                  <div className="bg-white/15 p-1.5 rounded-lg flex-shrink-0">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h1 className="font-heading font-extrabold text-sm leading-tight truncate text-white">
                      {settings.org_name || "Constituency"}
                    </h1>
                    <p className="text-[10px] text-white/70 truncate uppercase tracking-widest font-semibold">
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
                <Shield className="h-8 w-8 text-white" />
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-white hover:bg-white/15",
              collapsed && "hidden",
            )}
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto sidebar-scroll py-4 px-2 space-y-1">
          <div className="mt-2 mb-2 px-3">
            {!collapsed ? (
              <p className="text-[10px] uppercase font-bold text-white/50 tracking-widest">
                MENU
              </p>
            ) : (
              <div className="border-t border-white/10 mx-2" />
            )}
          </div>
          {filteredNavItems.map((item) => {
            const isActive = location === item.href;
            const content = (
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative mx-1",
                  isActive
                    ? "bg-white/12 text-white font-medium shadow-sm"
                    : "text-white hover:bg-white/5 font-medium",
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 min-w-5",
                    isActive
                      ? "text-white"
                      : "text-white group-hover:text-white transition-colors",
                  )}
                />
                {!collapsed && (
                  <span className="truncate text-sm tracking-wide">
                    {item.label}
                  </span>
                )}
              </div>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>{content}</Link>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    sideOffset={14}
                    className="font-bold text-xs ml-1 bg-[#1b3a88] text-white border-white/10"
                  >
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
                  <p className="text-[10px] uppercase font-bold text-white/70 tracking-widest">
                    Administration
                  </p>
                ) : (
                  <div className="border-t border-white/10 mx-2" />
                )}
              </div>

              {adminItems.map((item) => {
                const isItemActive = location === item.href;
                const content = (
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative mx-1",
                      isItemActive
                        ? "bg-white/12 text-white font-medium shadow-sm"
                        : "text-white hover:bg-white/5 font-medium",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 min-w-5",
                        isItemActive
                          ? "text-white"
                          : "text-white group-hover:text-white transition-colors",
                      )}
                    />
                    {!collapsed && (
                      <span className="truncate text-sm tracking-wide">
                        {item.label}
                      </span>
                    )}
                  </div>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link href={item.href}>{content}</Link>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        sideOffset={14}
                        className="font-bold text-xs ml-1 bg-[#1b3a88] text-white border-white/10"
                      >
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

          <div className="my-4 border-t border-white/10 mx-2" />

          {bottomItems.map((item) => {
            const isActive = location === item.href;
            const content = (
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative mx-1",
                  isActive
                    ? "bg-white/12 text-white font-medium shadow-sm"
                    : "text-white hover:bg-white/5 font-medium",
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 min-w-5",
                    isActive
                      ? "text-white"
                      : "text-white group-hover:text-white transition-colors",
                  )}
                />
                {!collapsed && (
                  <span className="truncate text-sm tracking-wide">
                    {item.label}
                  </span>
                )}
              </div>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>{content}</Link>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    sideOffset={14}
                    className="font-bold text-xs ml-1 bg-[#1b3a88] text-white border-white/10"
                  >
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
          <div className="p-2 flex justify-center border-t border-white/10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              className="text-white/80 hover:bg-white/10 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* User Profile */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <div
            className={cn(
              "flex items-center gap-3",
              collapsed ? "justify-center" : "",
            )}
          >
            <Avatar className="h-9 w-9 border border-white/20 shadow-sm">
              <AvatarImage src={user?.avatarUrl || ""} />
              <AvatarFallback className="bg-white/20 text-white font-bold">
                {user?.name?.substring(0, 2).toUpperCase() || "CN"}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold truncate text-white">
                  {user?.name}
                </p>
                <p className="text-xs text-white/70 truncate font-semibold">
                  {user?.role}
                </p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:bg-rose-500/20 hover:text-rose-300"
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