import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, AlertCircle } from "lucide-react";
import { useSystemSettings } from "@/contexts/SettingsContext";
import { getImageUrl } from "@/lib/utils";
import "./Login.css";

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

  const brandName = settings?.platform_name || settings?.platform_operator_name || "MP-MLA Platform";

  return (
    <main className="login-page">
      {/* ===================================================
           LEFT / MARKETING PANEL
      ==================================================== */}
      <section className="marketing-panel">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>

        {/* Brand */}
        <div className="brand">
          {settings?.brand_logo_url ? (
            <div className="h-9 max-w-[180px] flex items-center justify-center">
              <img
                src={getImageUrl(settings.brand_logo_url)}
                alt="Logo"
                className="h-full w-auto object-contain"
              />
            </div>
          ) : (
            <div className="brand-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2.8L20 7.2V16.8L12 21.2L4 16.8V7.2L12 2.8Z"
                  stroke="white"
                  strokeWidth="2"
                />
                <path
                  d="M8 9.5L12 7.3L16 9.5V14.3L12 16.5L8 14.3V9.5Z"
                  fill="white"
                />
              </svg>
            </div>
          )}

          <div>
            <div className="brand-name">{brandName}</div>
            <span className="brand-subtitle">Master Dashboard</span>
          </div>
        </div>

        {/* Marketing Content */}
        <div className="marketing-content">
          <h1 className="marketing-title">
            People
            <br />
            Power
            <br />
            Progress
          </h1>

          <p className="marketing-description">
            A connected platform for stronger communities and brighter futures.
          </p>

          {/* Dashboard Illustration */}
          <div className="illustration">
            {/* Dashboard Card */}
            <div className="dashboard-card">
              <div className="dashboard-header">
                <div className="dashboard-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>

              <div className="dashboard-body">
                <aside className="dashboard-sidebar">
                  <div className="side-line active"></div>
                  <div className="side-line"></div>
                  <div className="side-line"></div>
                  <div className="side-line"></div>
                  <div className="side-line"></div>
                </aside>

                <div className="dashboard-main">
                  <div className="dashboard-heading"></div>

                  <div className="chart">
                    <div className="chart-bars">
                      <div className="bar"></div>
                      <div className="bar"></div>
                      <div className="bar"></div>
                      <div className="bar"></div>
                      <div className="bar"></div>
                      <div className="bar"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Analytics */}
            <div className="floating-card">
              <div className="floating-label">Platform Growth</div>
              <div className="floating-value">+28.4%</div>
              <div className="floating-chart">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>

            {/* Person Illustration */}
            <div className="person">
              <div className="person-hair"></div>
              <div className="person-head"></div>
              <div className="person-body"></div>
              <div className="person-arm"></div>
              <div className="person-leg left"></div>
              <div className="person-leg right"></div>
            </div>
          </div>

          {/* Statistics */}
          <div className="stats">
            <div className="stat">
              <div className="stat-value">500+</div>
              <div className="stat-label">Organizations</div>
            </div>

            <div className="stat">
              <div className="stat-value">10M+</div>
              <div className="stat-label">People Managed</div>
            </div>

            <div className="stat">
              <div className="stat-value">99.9%</div>
              <div className="stat-label">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
           RIGHT / LOGIN PANEL
      ==================================================== */}
      <section className="login-panel">
        <div className="login-container">
          <h2 className="login-heading">Sign In</h2>
          <p className="login-subtitle">Access your master dashboard</p>

          {/* Error Alert */}
          {error && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form
            className="login-form"
            id="loginForm"
            onSubmit={handleSubmit(onSubmit)}
          >
            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address
              </label>

              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 6.5C4 5.67 4.67 5 5.5 5H18.5C19.33 5 20 5.67 20 6.5V17.5C20 18.33 19.33 19 18.5 19H5.5C4.67 19 4 18.33 4 17.5V6.5Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M5 7L12 12L19 7"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                </svg>

                <input
                  id="email"
                  className="form-input"
                  type="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                  disabled={isSubmitting}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p
                  style={{
                    color: "#dc2626",
                    fontSize: "11px",
                    marginTop: "4px",
                    fontWeight: 500,
                  }}
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>

              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M8 10V7.5C8 5.29 9.79 3.5 12 3.5C14.21 3.5 16 5.29 16 7.5V10"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                </svg>

                <input
                  id="password"
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  {...register("password")}
                />

                <button
                  type="button"
                  className="password-toggle"
                  id="togglePassword"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      id="eyeIcon"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M2 12C4.5 7.5 8 5 12 5C16 5 19.5 7.5 22 12C19.5 16.5 16 19 12 19C8 19 4.5 16.5 2 12Z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  style={{
                    color: "#dc2626",
                    fontSize: "11px",
                    marginTop: "4px",
                    fontWeight: 500,
                  }}
                >
                  {errors.password.message}
                </p>
              )}

              <div className="form-options">
                <label className="remember">
                  <input
                    type="checkbox"
                    id="remember"
                    {...register("rememberMe")}
                  />
                  Remember me
                </label>

                <a
                  href="#"
                  className="forgot-password"
                  onClick={(e) => {
                    e.preventDefault();
                    alert(
                      "Please contact your system administrator to reset your password.",
                    );
                  }}
                >
                  Forgot password?
                </a>
              </div>
            </div>

            {/* Login */}
            <button
              type="submit"
              className="login-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Loader2 className="animate-spin" size={16} /> Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>

            {/* Divider */}
            {/* <div className="divider">
              <span>or continue with</span>
            </div> */}

            {/* Social */}
            {/* <div className="social-login">
              <button type="button" className="social-button">
                <span className="google-icon">G</span>
                Google
              </button>

              <button type="button" className="social-button">
                <span className="microsoft-icon">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
                Microsoft
              </button>
            </div> */}

            {/* Footer */}
            <div className="login-footer">
              Don't have an account?{" "}
              <a
                href="#"
                className="admin-link"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Please contact system administrator.");
                }}
              >
                Contact Admin
              </a>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
