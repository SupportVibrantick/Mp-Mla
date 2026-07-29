import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Building2,
} from "lucide-react";
import { useSystemSettings } from "@/contexts/SettingsContext";
import { getImageUrl } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const { settings } = useSystemSettings();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fill for demo
  const fillDemo = (
    role: "platform_admin",
  ) => {
    const creds = {
      platform_admin: {
        email: "superadmin@admin.mpmla.in",
        password: "Platform@123456",
      },

    };
    setValue("email", creds[role].email);
    setValue("password", creds[role].password);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* ─── Left Panel ──────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4f46e5] text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 mix-blend-overlay" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            {settings.brand_logo_url ? (
              <div className="h-16 max-w-[200px] flex items-center justify-center bg-white/10 rounded-xl p-2 border border-white/10">
                <img
                  src={getImageUrl(settings.brand_logo_url)}
                  alt="Logo"
                  className="h-full w-auto object-contain"
                />
              </div>
            ) : (
              <>
                <div className="bg-white/15 p-2.5 rounded-xl border border-white/10">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {settings.org_name || "Constituency Platform"}
                </h1>
              </>
            )}
          </div>

          <div className="space-y-6 max-w-lg">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Master Control Panel
            </h2>
            <p className="text-lg text-white/80 leading-relaxed font-medium">
              Platform administration, tenant management, and global monitoring
              system for the Constituency Management SaaS.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              { label: "Total Tenants", value: "50+" },
              { label: "System Uptime", value: "99.9%" },
              { label: "Revenue Tiers", value: "5" },
              { label: "Global Modules", value: "12+" },
              { label: "API Success", value: "100%" },
              { label: "Latency", value: "<80ms" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center hover:bg-white/15 hover:scale-[1.02] transition-all duration-300 shadow-md"
              >
                <div className="text-2xl font-extrabold tracking-tight">{stat.value}</div>
                <div className="text-sm text-white/75 font-medium mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-sm text-white/60 sm:mt-10 font-medium">
          © {new Date().getFullYear()}{" "}
          {settings.brand_footer_text || "Vibrantick Infotech Solutions"}. All rights reserved.
        </div>
      </div>

      {/* ─── Right Panel — Login Form ────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
        <Card className="w-full max-w-md border-none shadow-none bg-transparent">
          <CardHeader className="space-y-2 text-center pb-2">
            <div className="mx-auto p-3 rounded-full w-fit mb-2 lg:hidden">
              {settings.brand_logo_url ? (
                <div className="h-16 max-w-[200px] flex items-center justify-center mb-2 mx-auto">
                  <img
                    src={getImageUrl(settings.brand_logo_url)}
                    alt="Logo"
                    className="h-full w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="bg-primary/10 p-3 rounded-full">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              )}
            </div>
            <h2 className="text-3xl font-bold">Platform Login</h2>
            <p className="text-muted-foreground">Master administrator access</p>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Error Alert */}
            {error && (
              <div className="mb-6 flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Login Failed</p>
                  <p className="mt-1 opacity-90">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Platform Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@vibrantick.com"
                    className={`pl-9 h-11 ${errors.email ? "border-destructive" : ""}`}
                    disabled={isSubmitting}
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`pl-9 pr-10 h-11 ${errors.password ? "border-destructive" : ""}`}
                    disabled={isSubmitting}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 text-base bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Access Master Dashboard"
                )}
              </Button>
            </form>

            {/* Demo Quick Fill */}
            <div className="mt-8 pt-6 border-t">
              <p className="text-sm text-muted-foreground text-center mb-3">
                Platform Roles:
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <button
                  type="button"
                  onClick={() => fillDemo("platform_admin")}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs font-medium transition-colors dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                >
                  Platform Admin
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
