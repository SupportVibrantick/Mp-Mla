import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, CheckCircle2, Clock, Users } from "lucide-react";

const schemes = [
  { id: 1, name: "PM Awas Yojana", dept: "Housing", beneficiaries: 1250, budget: "₹5 Cr", status: "Active", deadline: "Dec 2024" },
  { id: 2, name: "Swachh Bharat Mission", dept: "Sanitation", beneficiaries: 5000, budget: "₹2 Cr", status: "Active", deadline: "Ongoing" },
  { id: 3, name: "Skill India Initiative", dept: "Education", beneficiaries: 800, budget: "₹50 L", status: "Pending", deadline: "June 2024" },
  { id: 4, name: "Old Age Pension", dept: "Social Welfare", beneficiaries: 3200, budget: "₹1.5 Cr", status: "Active", deadline: "Monthly" },
  { id: 5, name: "Solar Rooftop Subsidy", dept: "Energy", beneficiaries: 150, budget: "₹80 L", status: "Closed", deadline: "Jan 2024" },
];

export default function Schemes() {
  return (
    <MainLayout title="Government Schemes">
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search schemes..." className="pl-9" />
        </div>
        <Button>Check Eligibility</Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {schemes.map((scheme) => (
          <Card key={scheme.id} className="glass-card hover:shadow-md transition-all">
            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 text-primary rounded-lg">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-lg">{scheme.name}</h3>
                  <p className="text-sm text-muted-foreground">{scheme.dept} Department</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{scheme.beneficiaries} Beneficiaries</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Ends: {scheme.deadline}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right mr-4 hidden md:block">
                  <p className="text-sm font-medium">Budget</p>
                  <p className="text-lg font-bold text-foreground">{scheme.budget}</p>
                </div>
                <Badge variant={scheme.status === 'Active' ? 'default' : 'secondary'} className={
                  scheme.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : ''
                }>
                  {scheme.status}
                </Badge>
                <Button variant="outline" size="sm">Details</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </MainLayout>
  );
}
