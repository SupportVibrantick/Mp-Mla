import { Bell, Search, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";

export function Header({ title }: { title: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between transition-all duration-300">
      <div className="flex flex-col">
        <h2 className="text-xl font-heading font-semibold text-foreground tracking-tight">{title}</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
           <span>Home</span>
           <span>/</span>
           <span className="text-foreground font-medium">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search grievances, projects..."
            className="pl-9 h-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:bg-background transition-all"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full border border-background"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
