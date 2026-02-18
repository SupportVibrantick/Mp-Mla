import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const wards = [
  { id: "01", name: "Shanti Nagar", pop: 12500, type: "Urban", grievances: 45, pending: 5 },
  { id: "02", name: "Gandhi Puram", pop: 8200, type: "Semi-Urban", grievances: 28, pending: 12 },
  { id: "03", name: "Nehru Colony", pop: 15400, type: "Urban", grievances: 62, pending: 8 },
  { id: "04", name: "Green Park", pop: 5600, type: "Rural", grievances: 12, pending: 1 },
  { id: "05", name: "Industrial Area", pop: 3400, type: "Urban", grievances: 85, pending: 24 },
  { id: "06", name: "Lake View", pop: 9800, type: "Semi-Urban", grievances: 32, pending: 4 },
];

export default function Wards() {
  return (
    <MainLayout title="Ward Management">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wards.map((ward) => (
          <Card key={ward.id} className="glass-card hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-heading">Ward {ward.id}</CardTitle>
              <Badge variant="outline">{ward.type}</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Map className="h-4 w-4" />
                <span className="text-sm font-medium">{ward.name}</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Population</span>
                  <span className="font-medium">{ward.pop.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Grievances</span>
                  <span className="font-medium">{ward.grievances}</span>
                </div>
                <div className="flex justify-between text-sm items-center p-2 bg-muted/50 rounded-lg">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Pending Issues
                  </span>
                  <Badge variant={ward.pending > 10 ? "destructive" : "secondary"}>
                    {ward.pending}
                  </Badge>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center">
                 <span className="text-xs text-muted-foreground">Updated 2 hrs ago</span>
                 <a href="#" className="text-sm text-primary font-medium hover:underline">View Map</a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </MainLayout>
  );
}
