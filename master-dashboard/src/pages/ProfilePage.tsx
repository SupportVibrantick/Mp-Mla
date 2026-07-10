import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Shield, Calendar, Laptop } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return dateStr;
    }
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <MainLayout title="My Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Profile Header */}
        <Card className="border border-border/50 shadow-sm overflow-hidden bg-card">
          <div className="h-32 bg-gradient-to-r from-primary/80 to-primary/40" />
          <div className="px-6 pb-6 relative">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12 mb-4">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                <AvatarImage src={user?.avatarUrl || ""} alt={user?.name} />
                <AvatarFallback className="text-3xl bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <h1 className="text-3xl font-bold">{user?.name || "Platform Admin"}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="uppercase tracking-wider text-[10px]">
                    {user?.role?.replace("_", " ") || "PLATFORM ADMIN"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {user?.accountType || "Platform"} Account
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 mt-8 pt-6 border-t border-border/50">
              <div className="flex items-center gap-3 text-sm">
                <div className="bg-primary/10 p-2 rounded-full text-primary">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Email</p>
                  <p className="font-medium">{user?.email || "Not Set"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="bg-primary/10 p-2 rounded-full text-primary">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Status</p>
                  <p className={`font-semibold ${user?.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"}`}>
                    {user?.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="bg-primary/10 p-2 rounded-full text-primary">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Created At</p>
                  <p className="font-medium">{formatDate(user?.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="bg-primary/10 p-2 rounded-full text-primary">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Last Login</p>
                  <p className="font-medium">{formatDate(user?.lastLoginAt) || "Current Session"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="bg-primary/10 p-2 rounded-full text-primary">
                  <Laptop className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Last Login IP</p>
                  <p className="font-medium">{user?.lastLoginIp || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

      </div>
    </MainLayout>
  );
}
