import { Link, useLocation } from "wouter";
import { cn, getImageUrl } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquareWarning,
  ClipboardList,
  Building2,
  Users,
  UserCheck,
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

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  module?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { user, logout, canAny, hasModule } = useAuth();
  const { settings } = useSystemSettings();

  const [location] = useLocation();

  const navSections: NavSection[] = [
    {
      title: "Main Menu",
      items: [
        { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
        { label: "Reports", icon: BarChart3, href: "/reports", module: "reports" },
      ],
    },
    {
      title: "Constituency & Infra",
      items: [
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
        { label: "Wards", icon: Map, href: "/wards", module: "wards" },
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
      ],
    },
    {
      title: "People & Community",
      items: [
        {
          label: "Voter List",
          icon: UserCheck,
          href: "/voter-list",
          module: "voter_list",
        },
        {
          label: "Demographics",
          icon: BarChart,
          href: "/demographics",
          module: "demographics",
        },
        {
          label: "Community Groups",
          icon: Users,
          href: "/community",
          module: "community_groups",
        },
        {
          label: "Local Representatives",
          icon: Users,
          href: "/leaders",
          module: "leaders",
        },
        {
          label: "Birthdays",
          icon: Cake,
          href: "/leaders/birthdays",
          module: "leaders",
        },
      ],
    },
    {
      title: "Engagement & Operations",
      items: [
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
        {
          label: "Competitor Analysis",
          icon: BarChart4,
          href: "/competitor-analysis",
          module: "competitors",
        },
      ],
    },
    {
      title: "Administration",
      items: [
        {
          label: "User Management",
          icon: Users,
          href: "/users",
          module: "users",
        },
        {
          label: "Permissions",
          icon: Shield,
          href: "/permissions",
          module: "users",
        },
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
      ],
    },
  ];

  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          !item.module ||
          (hasModule(item.module) && (canAny(item.module) || user?.role === "SYSTEM_ADMIN")),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        className="h-screen bg-[#13538A] text-white border-r border-[#5D28A8] flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 shadow-2xl dark:bg-gray-900 dark:border-gray-800"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 bg-transparent flex-shrink-0">
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
        <div className="flex-1 overflow-y-auto sidebar-scroll py-3 px-2 space-y-4">
          {filteredSections.map((section, sectionIdx) => (
            <div key={section.title} className="space-y-1">
              {!collapsed ? (
                <div className={cn("px-3 pb-1.5 pt-1", sectionIdx > 0 && "pt-3 border-t border-white/10")}>
                  <p className="text-[11px] uppercase font-bold text-white/60 tracking-wider">
                    {section.title}
                  </p>
                </div>
              ) : (
                sectionIdx > 0 && <div className="border-t border-white/10 mx-2 my-2" />
              )}

              {section.items.map((item) => {
                const isActive = location === item.href;
                const content = (
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group relative mx-1",
                      isActive
                        ? "bg-white/15 text-white font-semibold shadow-sm"
                        : "text-white/85 hover:text-white hover:bg-white/10 font-medium",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 min-w-5",
                        isActive ? "text-white" : "text-white/80 group-hover:text-white transition-colors",
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
                        className="font-bold text-xs ml-1 bg-[#1b3a88] text-white border-white/10 shadow-lg"
                      >
                        <span className="text-[10px] uppercase opacity-70 block text-white/70 font-semibold mb-0.5">
                          {section.title}
                        </span>
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
          ))}
        </div>

        {/* Expand Button (when collapsed) */}
        {collapsed && (
          <div className="p-2 flex justify-center border-t border-white/10 flex-shrink-0">
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
        <div className="p-4 border-t border-white/10 bg-white/5 flex-shrink-0">
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
                <p className="text-sm font-extrabold truncate text-white">{user?.name}</p>
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

