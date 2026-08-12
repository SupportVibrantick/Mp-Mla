import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Building2,
  ArrowRight,
  Zap,
  Share2,
} from "lucide-react";
import { useSystemSettings } from "@/contexts/SettingsContext";
import { getImageUrl } from "@/lib/utils";
import { InteractiveMeshBackground } from "@/components/ui/InteractiveMeshBackground";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
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
    defaultValues: { email: "", password: "", rememberMe: true },
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
  const fillDemo = (role: "platform_admin") => {
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

  const orgName = settings?.org_name || "Constituency Management Portal";

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans bg-[#f4f7f6] dark:bg-slate-950 p-4 md:p-8">
      {/* 3D Interactive Mesh Background Wave */}
      <InteractiveMeshBackground />

      <div className="relative z-10 w-full max-w-7xl flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
        {/* ─── LEFT PANEL (Branding & Feature Highlights) ─── */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-8 text-left lg:pl-4">
          <div className="space-y-4">
            {/* Workspace Badge */}
            <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#13538A]/10 dark:bg-[#13538A]/20 border border-[#13538A]/20 text-[#13538A] dark:text-[#38bdf8] text-xs font-bold tracking-wider uppercase">
              MASTER CONTROL PANEL
            </div>

            {/* Logo & Headline */}
            <div className="flex items-center gap-3">
              {settings.brand_logo_url ? (
                <div className="h-12 max-w-[180px] flex items-center justify-center">
                  <img
                    src={getImageUrl(settings.brand_logo_url)}
                    alt="Logo"
                    className="h-full w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="bg-[#13538A] p-2 rounded-xl text-white shadow-md shadow-[#13538A]/20">
                    <Shield className="h-6 w-6" />
                  </div>
                  <span className="text-xl font-extrabold text-[#13538A] dark:text-white uppercase tracking-tight">
                    {orgName}
                  </span>
                </div>
              )}
            </div>

            <p className="text-[10px] tracking-widest text-[#5D28A8] dark:text-purple-400 font-extrabold uppercase mt-1">
              SYSTEM ADMINISTRATION & TENANT MONITORING
            </p>
          </div>

          {/* Heading */}
          <div className="space-y-5">
            <h1 className="font-['Ubuntu',sans-serif] text-[48px] font-extrabold tracking-tight text-[#111827] dark:text-white leading-[1.1]">
              Master Dashboard
            </h1>
            <p className="font-['Ubuntu',sans-serif] text-[16px] text-[#111827] dark:text-slate-400 font-normal leading-[24px] tracking-normal">
              Sign in to manage tenants, view global statistics, and control
              platform operations.
            </p>
          </div>

          {/* Three Feature Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            {/* Card 1 */}
            <div className="bg-white/15 dark:bg-slate-900/10 backdrop-blur-md border border-white/20 dark:border-slate-800/20 rounded-[24px] p-5 hover:bg-white/35 dark:hover:bg-slate-900/30 hover:scale-[1.02] transition-all duration-300 shadow-sm">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#13538A] dark:text-blue-400 w-fit mb-4">
                <Shield className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Secure
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Bank-level encryption and layered verification protocols.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white/15 dark:bg-slate-900/10 backdrop-blur-md border border-white/20 dark:border-slate-800/20 rounded-[24px] p-5 hover:bg-white/35 dark:hover:bg-slate-900/30 hover:scale-[1.02] transition-all duration-300 shadow-sm">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 w-fit mb-4">
                <Zap className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Fast
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Smooth sign-in flow with real-time session validation.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white/15 dark:bg-slate-900/10 backdrop-blur-md border border-white/20 dark:border-slate-800/20 rounded-[24px] p-5 hover:bg-white/35 dark:hover:bg-slate-900/30 hover:scale-[1.02] transition-all duration-300 shadow-sm">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 w-fit mb-4">
                <Share2 className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Connected
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                One unified platform to manage tenants, roles, and global
                configurations.
              </p>
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL (Pixel-Perfect Sign In Card) ─── */}
        <div className="w-full lg:w-[480px] shrink-0">
          <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-[32px] p-8 md:p-10 relative">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-3xl font-extrabold text-slate-900 dark:text-white">
                Sign In
              </CardTitle>
              <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Continue to your Master Control workspace.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 space-y-6">
              {/* Error Alert */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs text-red-700 dark:text-red-300 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="h-4.5 w-4.5 mt-0.5 shrink-0 text-red-500" />
                  <div>
                    <p className="font-bold">Login Failed</p>
                    <p className="mt-0.5 opacity-90 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email Input */}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@vibrantick.com"
                      className={`h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:border-[#13538A] focus:ring-4 focus:ring-[#13538A]/10 transition-all font-medium text-sm ${
                        errors.email
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          : ""
                      }`}
                      disabled={isSubmitting}
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs font-semibold text-red-500 mt-1 pl-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      Password
                    </Label>
                    {/* <button
                      type="button"
                      onClick={() =>
                        alert(
                          "Please contact the main administrator to reset your password.",
                        )
                      }
                      className="text-xs font-bold text-[#13538A] dark:text-[#38bdf8] hover:underline"
                    >
                      Forgot password?
                    </button> */}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className={`h-12 pl-11 pr-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:border-[#13538A] focus:ring-4 focus:ring-[#13538A]/10 transition-all font-medium text-sm ${
                        errors.password
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          : ""
                      }`}
                      disabled={isSubmitting}
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
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
                    <p className="text-xs font-semibold text-red-500 mt-1 pl-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Keep Me Logged In */}
                <div className="flex items-center pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer text-slate-500 dark:text-slate-400 font-semibold text-xs sm:text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-[#13538A] focus:ring-[#13538A] cursor-pointer"
                      {...register("rememberMe")}
                    />
                    <span>Remember me for 30 days</span>
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-[#13538A] hover:bg-[#13538A]/90 text-white font-bold text-sm sm:text-base shadow-lg shadow-[#13538A]/25 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Access Master Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Quick Fill for Demo */}
              {/* <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-400 text-center mb-2.5 tracking-wide uppercase">
                  Quick fill for demo:
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fillDemo("platform_admin")}
                    className="px-4 py-1.5 bg-[#13538A]/10 hover:bg-[#13538A]/20 text-[#13538A] dark:text-blue-300 rounded-full text-xs font-bold transition-all active:scale-95 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 cursor-pointer"
                  >
                    Platform Admin
                  </button>
                </div>
              </div> */}
            </CardContent>
          </Card>

          {/* Copyright notice below card */}
          <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-6 font-semibold">
            © {new Date().getFullYear()}{" "}
            {settings.brand_footer_text || "Vibrantick Infotech Solutions"}. All
            rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
