import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
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
  Phone,
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
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const normalizedEmail = data.email.trim().toLowerCase();
      await login(normalizedEmail, data.password);
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

  const repName = settings?.representative_name || "Shri Representative";
  const orgName = settings?.platform_name || "Constituency Management Portal";

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col items-center justify-center relative overflow-x-hidden overflow-y-auto lg:overflow-hidden font-sans bg-[#f4f7f6] dark:bg-slate-950 px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-4">
      {/* 3D Interactive Mesh Background Wave */}
      <InteractiveMeshBackground />

      <div className="relative z-10 w-full max-w-6xl my-auto flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8 xl:gap-12 py-1 sm:py-2">
        {/* ─── LEFT PANEL (Branding & Feature Highlights) ─── */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-4 lg:space-y-5 text-left lg:pl-2">
          <div className="space-y-2.5">
            {/* Workspace Badge */}
            <div className="inline-flex items-center px-3 py-0.5 rounded-full bg-[#13538A]/10 dark:bg-[#13538A]/20 border border-[#13538A]/20 text-[#13538A] dark:text-[#38bdf8] text-[11px] font-bold tracking-wider uppercase">
              {settings?.org_short_name || "CONSTITUENCY WORKSPACE"}
            </div>

            {/* Logo & Headline */}
            <div className="flex items-center gap-3">
              {settings.brand_logo_url ? (
                <div className="h-9 sm:h-11 max-w-[170px] flex items-center justify-center">
                  <img
                    src={getImageUrl(settings.brand_logo_url)}
                    alt="Logo"
                    className="h-full w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="bg-[#13538A] p-1.5 rounded-xl text-white shadow-md shadow-[#13538A]/20">
                    <Shield className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
                  </div>
                  <span className="text-lg sm:text-xl font-extrabold text-[#13538A] dark:text-white uppercase tracking-tight">
                    {orgName}
                  </span>
                </div>
              )}
            </div>

            <p className="text-[10px] tracking-widest text-[#5D28A8] dark:text-purple-400 font-extrabold uppercase">
              UNIFIED CONSTITUENCY OPERATIONS
            </p>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="font-['Ubuntu',sans-serif] text-2xl sm:text-3xl lg:text-[38px] font-extrabold tracking-tight text-[#111827] dark:text-white leading-tight">
              Welcome Back
            </h1>
            <p className="font-['Ubuntu',sans-serif] text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
              Enter your email and password to access your constituency portal.
            </p>
          </div>

          {/* Three Feature Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Card 1 */}
            <div className="bg-white/15 dark:bg-slate-900/20 backdrop-blur-md border border-white/40 dark:border-slate-800/30 rounded-xl p-3 sm:p-3.5 hover:bg-white/30 dark:hover:bg-slate-900/35 hover:scale-[1.02] transition-all duration-300 shadow-sm">
              <div className="p-1.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/50 text-[#13538A] dark:text-blue-400 w-fit mb-2">
                <Shield className="h-4 w-4" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-0.5">
                Secure
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Bank-level encryption and layered verification protocols.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white/15 dark:bg-slate-900/20 backdrop-blur-md border border-white/40 dark:border-slate-800/30 rounded-xl p-3 sm:p-3.5 hover:bg-white/30 dark:hover:bg-slate-900/35 hover:scale-[1.02] transition-all duration-300 shadow-sm">
              <div className="p-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 w-fit mb-2">
                <Zap className="h-4 w-4" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-0.5">
                Fast
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Smooth sign-in flow with real-time session validation.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white/15 dark:bg-slate-900/20 backdrop-blur-md border border-white/40 dark:border-slate-800/30 rounded-xl p-3 sm:p-3.5 hover:bg-white/30 dark:hover:bg-slate-900/35 hover:scale-[1.02] transition-all duration-300 shadow-sm">
              <div className="p-1.5 rounded-lg bg-purple-50/80 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 w-fit mb-2">
                <Share2 className="h-4 w-4" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-0.5">
                Connected
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                One role-aware workspace for grievances, projects, and events.
              </p>
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL (Pixel-Perfect Sign In Card) ─── */}
        <div className="w-full lg:w-[420px] xl:w-[440px] shrink-0">
          <Card className="border-0 shadow-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl sm:rounded-[24px] p-5 sm:p-6 relative">
            <CardHeader className="p-0 mb-3 sm:mb-4">
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Sign In
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Continue to your {orgName} workspace.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 space-y-3 sm:space-y-3.5">
              {/* Error Alert */}
              {error && (
                <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-500" />
                  <div>
                    <p className="font-bold">Login Failed</p>
                    <p className="mt-0.5 opacity-90 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                {/* Email Input */}
                <div className="space-y-1">
                  <Label
                    htmlFor="email"
                    className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      className={`h-10 pl-9 pr-3.5 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:border-[#13538A] focus:ring-4 focus:ring-[#13538A]/10 transition-all font-medium text-xs sm:text-sm ${
                        errors.email
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          : ""
                      }`}
                      disabled={isSubmitting}
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] font-semibold text-red-500 mt-0.5 pl-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          "Please contact the MP/MLA constituency administrative office to request a password reset.",
                        )
                      }
                      className="text-[11px] font-bold text-[#13538A] dark:text-[#38bdf8] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      className={`h-10 pl-9 pr-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:border-[#13538A] focus:ring-4 focus:ring-[#13538A]/10 transition-all font-medium text-xs sm:text-sm ${
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] font-semibold text-red-500 mt-0.5 pl-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Keep Me Logged In */}
                <div className="flex items-center pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-500 dark:text-slate-400 font-semibold text-xs select-none">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#13538A] focus:ring-[#13538A] cursor-pointer"
                      {...register("rememberMe")}
                    />
                    <span>Remember me for 30 days</span>
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-10 sm:h-10.5 rounded-xl bg-[#13538A] hover:bg-[#13538A]/90 text-white font-bold text-xs sm:text-sm shadow-md shadow-[#13538A]/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                    </>
                  )}
                </Button>
              </form>

              {/* Citizen Voter Verification Link */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Are you a citizen?{" "}
                  <Link
                    to="/voter-verification"
                    className="font-bold text-[#13538A] dark:text-[#38bdf8] hover:underline ml-1"
                  >
                    Verify Voter Details
                  </Link>
                </p>
              </div>

              {/* Trouble signing in section */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Trouble signing in? Reach us directly:
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <a
                    href="https://wa.me/9870443528"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#00c278] hover:bg-[#00b06d] text-white font-bold text-xs shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <svg className="h-3.5 w-3.5 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.454 5.709 1.455h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span>WhatsApp us</span>
                  </a>
                  <a
                    href="tel:+919870443528"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-bold text-xs shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Phone className="h-3.5 w-3.5 text-slate-800 dark:text-white shrink-0" />
                    <span>+91 9870443528</span>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Copyright notice below card */}
          <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-2 sm:mt-2.5 font-medium">
            © {new Date().getFullYear()} {settings.brand_footer_text || "Vibrantick Infotech Solutions"}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
