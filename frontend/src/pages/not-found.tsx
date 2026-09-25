import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home, ShieldCheck } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const { isAuthenticated } = useAuth();

  const content = (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-center py-10 px-6 shadow-xl rounded-3xl">
        <CardContent className="flex flex-col items-center gap-4 p-0">
          <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-12 w-12" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">404 Page Not Found</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
              The page you are looking for does not exist or has been moved.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full mt-2">
            <Link to="/voter-portal" className="w-full">
              <Button className="w-full bg-[#13538A] hover:bg-[#13538A]/90 text-white rounded-xl text-xs font-bold gap-1.5 h-10">
                <ShieldCheck className="w-4 h-4" />
                <span>Go to Voter Portal</span>
              </Button>
            </Link>

            <Link to={isAuthenticated ? "/dashboard" : "/login"} className="w-full">
              <Button variant="outline" className="w-full rounded-xl text-xs font-bold gap-1.5 h-10 border-slate-200 dark:border-slate-800">
                <Home className="w-4 h-4" />
                <span>{isAuthenticated ? "Admin Dashboard" : "Admin Login"}</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (isAuthenticated) {
    return <MainLayout title="Page Not Found">{content}</MainLayout>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      {content}
    </div>
  );
}
