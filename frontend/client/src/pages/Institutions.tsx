import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Search, 
  Plus, 
  Stethoscope, 
  GraduationCap, 
  Landmark, 
  Users 
} from "lucide-react";
import { MOCK_DATA } from "@/lib/mock-data";

const institutions = [
  { id: 1, name: "Govt High School", category: "Education", address: "Sector 4, Ward 12", contact: "080-23456789", status: "Active", head: "Ramesh Principal" },
  { id: 2, name: "City Civil Hospital", category: "Health", address: "Main Road, Ward 05", contact: "080-98765432", status: "Active", head: "Dr. Sarah Khan" },
  { id: 3, name: "Shiva Temple Trust", category: "Religious", address: "Old Town, Ward 02", contact: "9876543210", status: "Active", head: "Pandit Ji" },
  { id: 4, name: "Women's Co-op Society", category: "Community", address: "Market Complex, Ward 08", contact: "8765432109", status: "Active", head: "Mrs. Lakshmi" },
  { id: 5, name: "Police Station - North", category: "Government", address: "North Zone, Ward 15", contact: "100", status: "Active", head: "Inspector Singh" },
  { id: 6, name: "Youth Sports Club", category: "Recreation", address: "Stadium Road, Ward 10", contact: "7654321098", status: "Inactive", head: "Coach Mike" },
];

const categories = [
  { id: "all", label: "All", icon: Building2 },
  { id: "health", label: "Health", icon: Stethoscope },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "religious", label: "Religious", icon: Landmark },
  { id: "community", label: "Community", icon: Users },
];

export default function Institutions() {
  return (
    <MainLayout title="Institutions Directory">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search institutions, schools, hospitals..." className="pl-9" />
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Institution
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 bg-muted/50 p-1 rounded-xl h-auto flex-wrap justify-start">
          {categories.map((cat) => (
            <TabsTrigger 
              key={cat.id} 
              value={cat.id}
              className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <cat.icon className="h-4 w-4" />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {institutions.map((inst) => (
              <Card key={inst.id} className="glass-card hover:shadow-md transition-all group">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {inst.category === 'Health' ? <Stethoscope className="h-5 w-5" /> : 
                       inst.category === 'Education' ? <GraduationCap className="h-5 w-5" /> :
                       inst.category === 'Religious' ? <Landmark className="h-5 w-5" /> :
                       <Building2 className="h-5 w-5" />}
                    </div>
                    <div>
                      <CardTitle className="text-base">{inst.name}</CardTitle>
                      <CardDescription>{inst.category}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={inst.status === 'Active' ? 'default' : 'secondary'} className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100">
                    {inst.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{inst.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{inst.contact}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground border-t border-border/50 pt-3 mt-3">
                      <Users className="h-4 w-4 shrink-0" />
                      <span>In-charge: <span className="text-foreground font-medium">{inst.head}</span></span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
