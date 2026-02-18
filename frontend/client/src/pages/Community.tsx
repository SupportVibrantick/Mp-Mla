import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from "recharts";
import { Users, UserCheck, Baby, Accessibility } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ageData = [
  { name: '0-18', value: 2500, color: '#3B82F6' },
  { name: '19-35', value: 4500, color: '#10B981' },
  { name: '36-60', value: 3000, color: '#F59E0B' },
  { name: '60+', value: 1200, color: '#8B5CF6' },
];

const communityGroups = [
  { name: 'Market Assoc.', count: 12, members: 450 },
  { name: 'RWAs', count: 24, members: 2800 },
  { name: 'Slum Comm.', count: 8, members: 1200 },
  { name: 'Youth Clubs', count: 15, members: 800 },
  { name: 'Senior Cit.', count: 5, members: 350 },
  { name: 'Women Grps', count: 18, members: 920 },
];

export default function Community() {
  return (
    <MainLayout title="Community & Demographics">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full dark:bg-blue-900/30">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Population</p>
              <h3 className="text-2xl font-bold font-heading">42,850</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full dark:bg-emerald-900/30">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Voters</p>
              <h3 className="text-2xl font-bold font-heading">28,400</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-full dark:bg-amber-900/30">
              <Baby className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Children (0-14)</p>
              <h3 className="text-2xl font-bold font-heading">8,200</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-full dark:bg-purple-900/30">
              <Accessibility className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Senior Citizens</p>
              <h3 className="text-2xl font-bold font-heading">4,150</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Age Demographics */}
        <Card className="glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Age Distribution</CardTitle>
            <CardDescription>Population breakdown by age groups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {ageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Community Groups Bar Chart */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Registered Community Groups</CardTitle>
            <CardDescription>Active organizations and associations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={communityGroups} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="members" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Members" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Community Directory Grid */}
      <h3 className="text-lg font-heading font-semibold mb-4">Community Groups Directory</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {communityGroups.map((group, i) => (
          <Card key={i} className="glass-card hover:bg-muted/50 transition-colors cursor-pointer">
             <CardContent className="p-4 flex justify-between items-center">
                <div>
                   <h4 className="font-medium">{group.name}</h4>
                   <p className="text-sm text-muted-foreground">{group.count} Active Groups</p>
                </div>
                <Badge variant="secondary">{group.members} Members</Badge>
             </CardContent>
          </Card>
        ))}
      </div>
    </MainLayout>
  );
}
