import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MOCK_DATA } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function MainLayout({ children, title = "Dashboard" }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        user={MOCK_DATA.user}
      />
      
      <div
        className={cn(
          "transition-all duration-300 min-h-screen flex flex-col",
          sidebarCollapsed ? "ml-20" : "ml-[280px]"
        )}
      >
        <Header title={title} />
        <main className="flex-1 p-6 overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
