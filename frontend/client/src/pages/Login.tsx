import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Shield, Lock, Mail } from "lucide-react";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex w-1/2 bg-sidebar text-sidebar-foreground flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/10 mix-blend-overlay"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-primary p-2 rounded-lg">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold font-heading tracking-tight">Constituency Portal</h1>
          </div>
          
          <div className="space-y-6 max-w-md">
            <h2 className="text-4xl font-bold font-heading leading-tight">
              Digital Governance for a Better Tomorrow
            </h2>
            <p className="text-lg text-sidebar-foreground/80 leading-relaxed">
              Empowering elected representatives with real-time data, grievance monitoring, and development tracking.
            </p>
          </div>
        </div>

        <div className="relative z-10 text-sm text-sidebar-foreground/60">
          © 2024 Vibrantick Infotech Solutions. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md border-none shadow-none bg-transparent">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4 lg:hidden">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold font-heading">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to your dashboard</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="mla@constituency.gov.in" className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm text-primary hover:underline">Forgot password?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" className="pl-9" />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="font-normal text-muted-foreground">Remember me for 30 days</Label>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11 text-base">
                Sign In
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 text-center">
             <div className="text-sm text-muted-foreground">
               Select Role for Demo:
             </div>
             <div className="flex gap-2 justify-center flex-wrap">
               <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium dark:bg-blue-900/30 dark:text-blue-300">MLA / MP</span>
               <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium dark:bg-emerald-900/30 dark:text-emerald-300">Office Staff</span>
               <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium dark:bg-slate-800 dark:text-slate-300">Super Admin</span>
             </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
