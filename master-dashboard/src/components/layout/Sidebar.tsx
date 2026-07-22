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
    { label: "Tenant Management", icon: Building2, href: "/tenants", module: "tenants" },
    { label: "Plans & Tiers", icon: Layers, href: "/subscriptions", module: "subscriptions" },
    { label: "Tenant Subscriptions", icon: Users, href: "/subscriptions/tenants", module: "subscriptions" },
    { label: "Upcoming Renewals", icon: CalendarDays, href: "/subscriptions/renewals", module: "subscriptions" },
    { label: "Upgrade Requests", icon: ArrowUpCircle, href: "/subscriptions/upgrade-requests", module: "subscriptions" },
    { label: "Invoices", icon: Receipt, href: "/subscriptions/invoices", module: "subscriptions" },
    { label: "Modules & Addons", icon: Puzzle, href: "/modules", module: "modules" },
    { label: "Payments", icon: IndianRupeeIcon, href: "/payments", module: "payments" },
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
        className="h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 shadow-xl"
      >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border/50">
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
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {filteredNavItems.map((item) => {
          const isActive = location === item.href;
          const content = (
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative",
                isActive
                  ? "bg-primary text-primary-foreground font-medium shadow-md"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 min-w-5",
                  isActive ? "text-white" : "group-hover:text-primary",
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
                <div className="border-t border-sidebar-border/50 mx-2" />
              )}
            </div>

            {adminItems.map((item) => {
              const isActive = location === item.href;
              const content = (
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative",
                    isActive
                      ? "bg-primary/20 text-primary font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 min-w-5",
                      isActive ? "text-primary" : "group-hover:text-primary",
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

        <div className="my-4 border-t border-sidebar-border/50 mx-2" />

        {bottomItems.map((item) => {
          const content = (
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative",
                location === item.href
                  ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
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
        <div className="p-2 flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border/50 bg-sidebar-accent/10">
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed ? "justify-center" : "",
          )}
        >
          <Avatar className="h-9 w-9 border border-sidebar-border shadow-sm">
            <AvatarImage src={user?.avatarUrl || ""} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.name?.substring(0, 2).toUpperCase() || "CN"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.role}
              </p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
