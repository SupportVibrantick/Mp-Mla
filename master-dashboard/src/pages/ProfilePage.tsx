import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useDepartments } from "@/hooks/useDepartments";
import { Building2, Mail, Phone, User as UserIcon, Shield } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: deptRes, isLoading: deptLoading } = useDepartments();
  const departments = deptRes?.data || [];

  // Filter all active departments
  const activeDepartments = departments.filter((d: any) => d.isActive !== false);

  return (
    <MainLayout title="My Profile">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Profile Header */}
        <Card className="border border-border/50 shadow-sm overflow-hidden bg-card">
          <div className="h-32 bg-gradient-to-r from-primary/80 to-primary/40" />
          <div className="px-6 pb-6 relative">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12 mb-4">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                <AvatarImage src={user?.avatarUrl || ""} alt={user?.name} />
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                  {user?.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <h1 className="text-3xl font-bold">{user?.name}</h1>
                <p className="text-muted-foreground font-medium">{user?.designation || "Constituency Official"}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="uppercase tracking-widest text-[10px]">
                    {user?.role?.replace("_", " ")}
                  </Badge>
                  {user?.department && (
                    <Badge variant="outline" className="text-[10px]">{user.department}</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-border/50">
              <div className="flex items-center gap-3 text-sm">
                <div className="bg-primary/10 p-2 rounded-full text-primary">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="bg-primary/10 p-2 rounded-full text-primary">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Phone</p>
                  <p className="font-medium">{user?.phone || "Not Set"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="bg-primary/10 p-2 rounded-full text-primary">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Status</p>
                  <p className="font-medium text-emerald-600 dark:text-emerald-400">{user?.status || "Active"}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Departments Managed */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Active Departments
          </h2>
          <p className="text-sm text-muted-foreground">
            All active departments across the constituency.
          </p>

          {deptLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {[1,2,3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
            </div>
          ) : activeDepartments.length === 0 ? (
            <Card className="border-dashed bg-transparent shadow-none">
               <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                 <Building2 className="h-12 w-12 mb-4 opacity-20" />
                 <p>No active departments found.</p>
               </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeDepartments.map((dept: any) => (
                <Card key={dept.id} className="hover:shadow-md transition-shadow cursor-pointer border-t-4 border-t-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between items-start">
                      <span className="truncate pr-2">{dept.name}</span>
                      <Badge variant="outline" className="text-xs bg-primary/5">{dept.code}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                     <p className="text-sm text-muted-foreground line-clamp-2">
                       {dept.description || "No description provided."}
                     </p>
                     
                     <div className="space-y-2 pt-2 border-t text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <UserIcon className="h-3.5 w-3.5" />
                          <span className="truncate">{dept.headName || "No Head Assigned"} (Head)</span>
                        </div>
                        {dept.headPhone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{dept.headPhone}</span>
                          </div>
                        )}
                     </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>
    </MainLayout>
  );
}
