import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
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
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { motion } from "framer-motion";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  user: any;
}

export function Sidebar({ collapsed, setCollapsed, user }: SidebarProps) {
  const [location] = useLocation();

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Grievances", icon: MessageSquareWarning, href: "/grievances" },
    { label: "Projects", icon: ClipboardList, href: "/projects" },
    { label: "Institutions", icon: Building2, href: "/institutions" },
    { label: "Community", icon: Users, href: "/community" },
    { label: "Schemes", icon: FileText, href: "/schemes" },
    { label: "Wards", icon: Map, href: "/wards" },
    { label: "Reports", icon: BarChart3, href: "/reports" },
  ];

  const bottomItems = [
    { label: "Settings", icon: Settings, href: "/settings" },
    { label: "Admin Panel", icon: Shield, href: "/admin", adminOnly: true },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      className="h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 shadow-xl"
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border/50">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="bg-primary/20 p-1.5 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg leading-tight truncate">Constituency</h1>
              <p className="text-xs text-muted-foreground truncate">Management Portal</p>
            </div>
          </div>
        )}
        {collapsed && (
           <div className="w-full flex justify-center">
             <Shield className="h-8 w-8 text-primary" />
           </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("text-sidebar-foreground hover:bg-sidebar-accent", collapsed && "hidden")}
          onClick={() => setCollapsed(true)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary text-primary-foreground font-medium shadow-md"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 min-w-5", isActive ? "text-white" : "group-hover:text-primary")} />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {collapsed && (
                   <div className="absolute left-14 bg-popover text-popover-foreground px-2 py-1 rounded text-xs shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-border">
                     {item.label}
                   </div>
                )}
              </div>
            </Link>
          );
        })}

        <div className="my-4 border-t border-sidebar-border/50 mx-2" />

        {bottomItems.map((item) => (
          <Link key={item.href} href={item.href}>
             <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative",
                  location === item.href
                    ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5 min-w-5" />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                 {collapsed && (
                   <div className="absolute left-14 bg-popover text-popover-foreground px-2 py-1 rounded text-xs shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-border">
                     {item.label}
                   </div>
                )}
              </div>
          </Link>
        ))}
      </div>

      {/* Expand Button (when collapsed) */}
      {collapsed && (
        <div className="p-2 flex justify-center">
            <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      )}

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border/50 bg-sidebar-accent/10">
        <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "")}>
          <Avatar className="h-9 w-9 border border-sidebar-border shadow-sm">
            <AvatarImage src={user.avatar} />
            <AvatarFallback>RK</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.role}</p>
            </div>
          )}
          {!collapsed && (
             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
             </Button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
