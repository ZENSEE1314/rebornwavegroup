import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Mail, User, Lock, Eye, EyeOff, AlertCircle, Phone, Calendar, Users, Sparkles, ArrowLeft, CheckCircle, Crown, Star, Zap, Gift } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import rwgLogo from "@assets/rwg-logo.png";

/* ─── Validation schemas (unchanged) ─── */
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be less than 20 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  countryCode: z.string().min(1, "Please select a country code"),
  phoneNumber: z.string().min(7, "Please enter a valid phone number"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().refine((val) => val === "male" || val === "female", {
    message: "Please select a gender",
  }),
  referralCode: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/* ─── Small helper components ─── */
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {msg}
    </p>
  );
}

function FormField({
  label,
  icon: Icon,
  rightSlot,
  error,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  rightSlot?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-amber-200/70 text-xs font-semibold uppercase tracking-wider mb-2 block">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/40 pointer-events-none z-10" />}
        <div className={Icon ? "pl-10" : ""}>{children}</div>
        {rightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

/* ─── Register benefit pills ─── */
const REGISTER_PERKS = [
  { icon: Crown, label: "Exclusive Membership Access" },
  { icon: Gift, label: "Blind Box Rewards" },
  { icon: Zap, label: "KTV & VIP Privileges" },
  { icon: Star, label: "Referral Earnings" },
];

/* ═══════════════════════════════════════
   Main Login Component
═══════════════════════════════════════ */
export default function Login() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [referralCodeFromUrl, setReferralCodeFromUrl] = useState("");
  const { toast } = useToast();

  /* Shared class snippets */
  const inputBase =
    "rwg-input w-full h-11 rounded-xl text-sm text-white placeholder:text-white/25 border-0 focus-visible:ring-0 focus-visible:ring-offset-0";
  const selectBase =
    "rwg-select h-11 rounded-xl text-sm text-amber-100 px-3 border-0 cursor-pointer";
  const eyeBtn =
    "text-amber-400/40 hover:text-amber-300 transition-colors";
  const submitBtn =
    "w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-bold rounded-xl border-0 shadow-lg shadow-amber-900/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-amber-700/50 mt-2 text-sm tracking-wide";

  /* ─── Forms ─── */
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "", username: "", password: "",
      firstName: "", lastName: "",
      countryCode: "+62", phoneNumber: "",
      dateOfBirth: "", gender: "male", referralCode: "",
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const resetPasswordForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: "", newPassword: "", confirmPassword: "" },
  });

  /* Auto-fill referral code from URL */
  useEffect(() => {
    const currentURL = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    let refCode = urlParams.get("ref") || hashParams.get("ref");
    if (!refCode) {
      const refMatch = currentURL.match(/[?&]ref=([^&]+)/);
      if (refMatch) refCode = decodeURIComponent(refMatch[1]);
    }
    if (refCode) {
      setReferralCodeFromUrl(refCode);
      registerForm.setValue("referralCode", refCode);
      setActiveTab("register");
    }
  }, [registerForm]);

  /* ─── Mutations ─── */
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Login failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Welcome back!", description: "Logged in successfully." });
      setTimeout(() => { window.location.href = "/"; }, 500);
    },
    onError: (err: any) => setError(err.message || "Login failed. Please try again."),
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const fullPhoneNumber = `${data.countryCode}${data.phoneNumber}`;
      const registrationData = { ...data, phoneNumber: fullPhoneNumber };
      delete (registrationData as any).countryCode;
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationData),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Registration failed");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Account created!", description: "Welcome to Reborn Wave Group!" });
      window.location.href = "/";
    },
    onError: (err: any) => setError(err.message || "Registration failed. Please try again."),
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to send reset email");
      }
      return response.json();
    },
    onSuccess: () => {
      setResetEmailSent(true);
      toast({ title: "Reset email sent!", description: "Check your inbox." });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message || "Failed to send reset email.", variant: "destructive" }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to reset password");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Password reset!", description: "You can now log in with your new password." });
      setActiveTab("login");
      setResetEmailSent(false);
      resetPasswordForm.reset();
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message || "Failed to reset password.", variant: "destructive" }),
  });

  const onLogin = (data: LoginFormData) => { setError(""); loginMutation.mutate(data); };
  const onRegister = (data: RegisterFormData) => { setError(""); registerMutation.mutate(data); };
  const onForgotPassword = (data: ForgotPasswordFormData) => { forgotPasswordMutation.mutate(data); };
  const onResetPassword = (data: ResetPasswordFormData) => { resetPasswordMutation.mutate(data); };

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <>
      {/* Inline animation styles */}
      <style>{`
        @keyframes rwg-login-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-18px) rotate(3deg); }
          66%       { transform: translateY(-8px) rotate(-2deg); }
        }
        @keyframes rwg-login-pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(1.12); }
        }
        @keyframes rwg-login-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes rwg-login-spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .rwg-gold-orb-1 {
          position: fixed; top: -120px; right: -80px;
          width: 420px; height: 420px; border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 70%);
          animation: rwg-login-pulse 7s ease-in-out infinite;
          pointer-events: none; z-index: 0;
        }
        .rwg-gold-orb-2 {
          position: fixed; bottom: -100px; left: -60px;
          width: 360px; height: 360px; border-radius: 50%;
          background: radial-gradient(circle, rgba(233,69,96,0.15) 0%, transparent 70%);
          animation: rwg-login-pulse 9s ease-in-out infinite 2s;
          pointer-events: none; z-index: 0;
        }
        .rwg-gold-orb-3 {
          position: fixed; top: 40%; left: 50%;
          width: 600px; height: 600px; border-radius: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 60%);
          animation: rwg-login-pulse 12s ease-in-out infinite 1s;
          pointer-events: none; z-index: 0;
        }
        .rwg-floating-gem {
          animation: rwg-login-float linear infinite;
          pointer-events: none;
        }
        .rwg-card-glow {
          box-shadow:
            0 0 0 1px rgba(201,168,76,0.15),
            0 4px 6px rgba(0,0,0,0.4),
            0 20px 60px rgba(0,0,0,0.5),
            0 0 80px rgba(201,168,76,0.06);
        }
        .rwg-gold-tab-active {
          background: linear-gradient(135deg, #C9A84C, #F5D87A);
          color: #000;
          font-weight: 700;
          box-shadow: 0 0 20px rgba(201,168,76,0.35);
        }
        .rwg-gold-tab-inactive {
          color: rgba(255,255,255,0.35);
        }
        .rwg-gold-tab-inactive:hover {
          color: rgba(201,168,76,0.7);
        }
        .rwg-member-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05));
          border: 1px solid rgba(201,168,76,0.25);
          border-radius: 999px; padding: 4px 14px;
          font-size: 11px; font-weight: 600;
          color: #C9A84C; letter-spacing: 0.02em;
        }
        .rwg-perk-pill {
          display: flex; align-items: center; gap: 6px;
          background: rgba(201,168,76,0.06);
          border: 1px solid rgba(201,168,76,0.15);
          border-radius: 8px; padding: 7px 12px;
          font-size: 11px; color: rgba(255,255,255,0.6);
          transition: all 0.2s;
        }
        .rwg-perk-pill:hover {
          background: rgba(201,168,76,0.1);
          color: rgba(255,255,255,0.85);
          border-color: rgba(201,168,76,0.3);
        }
        .rwg-divider-gold {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent);
          margin: 16px 0;
        }
      `}</style>

      <div className="rwg-page-bg min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
        {/* Atmospheric orbs */}
        <div className="rwg-gold-orb-1" />
        <div className="rwg-gold-orb-2" />
        <div className="rwg-gold-orb-3" />
        <div className="rwg-grid-overlay" />

        {/* Floating decorative gems */}
        <div className="rwg-floating-gem fixed top-[15%] left-[8%] text-2xl opacity-20" style={{ animationDuration: "8s" }}>💎</div>
        <div className="rwg-floating-gem fixed top-[65%] right-[6%] text-xl opacity-15" style={{ animationDuration: "11s", animationDelay: "3s" }}>⭐</div>
        <div className="rwg-floating-gem fixed top-[40%] left-[5%] text-lg opacity-10" style={{ animationDuration: "14s", animationDelay: "1.5s" }}>✨</div>
        <div className="rwg-floating-gem fixed bottom-[20%] right-[10%] text-2xl opacity-15" style={{ animationDuration: "9s", animationDelay: "5s" }}>👑</div>

        <div className="relative z-10 w-full max-w-[440px]">
          {/* ── Top bar ── */}
          <div className="flex items-center justify-between mb-6">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-amber-500/20 group-hover:ring-amber-400/50 transition-all shadow-lg shadow-amber-900/30">
                <img src={rwgLogo} alt="RWG" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors block leading-tight">
                  Reborn Wave Group
                </span>
                <span className="text-[10px] text-amber-400/60 tracking-widest uppercase">Elite Experience</span>
              </div>
            </a>
            <LanguageSelector />
          </div>

          {/* ── Social proof strip ── */}
          <div className="flex justify-center mb-5">
            <span className="rwg-member-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              12,847+ members worldwide
            </span>
          </div>

          {/* ── Card ── */}
          <div className="rwg-card rwg-card-glow p-7">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-900/50"
                style={{ background: "linear-gradient(135deg, #C9A84C, #F5D87A)" }}>
                {activeTab === "login" ? (
                  <Crown className="w-7 h-7 text-black" />
                ) : activeTab === "register" ? (
                  <Sparkles className="w-7 h-7 text-black" />
                ) : (
                  <Lock className="w-7 h-7 text-black" />
                )}
              </div>

              {activeTab === "login" && (
                <>
                  <h1 className="text-2xl font-bold text-white">{t("auth.title")}</h1>
                  <p className="text-white/40 text-sm mt-1">{t("auth.subtitle")}</p>
                </>
              )}
              {activeTab === "register" && (
                <>
                  <h1 className="text-2xl font-bold text-white">{t("auth.signUp")}</h1>
                  <p className="text-white/40 text-sm mt-1">Join Reborn Wave Group today</p>
                </>
              )}
              {(activeTab === "forgot" || activeTab === "reset") && (
                <>
                  <h1 className="text-2xl font-bold text-white">Reset Password</h1>
                  <p className="text-white/40 text-sm mt-1">We'll help you get back in</p>
                </>
              )}
            </div>

            {/* ── Tab switcher ── */}
            {(activeTab === "login" || activeTab === "register") && (
              <div className="rwg-tab-switcher mb-5">
                <button
                  type="button"
                  onClick={() => { setActiveTab("login"); setError(""); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    activeTab === "login" ? "rwg-gold-tab-active" : "rwg-gold-tab-inactive"
                  }`}
                >
                  {t("auth.login")}
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("register"); setError(""); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    activeTab === "register" ? "rwg-gold-tab-active" : "rwg-gold-tab-inactive"
                  }`}
                >
                  {t("auth.signUp")}
                </button>
              </div>
            )}

            {/* ── Error banner ── */}
            {error && (
              <div className="rwg-error-alert mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* ══════════════════════════════
                LOGIN FORM
            ══════════════════════════════ */}
            {activeTab === "login" && (
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <FormField label={t("auth.email")} icon={Mail} error={loginForm.formState.errors.email?.message}>
                  <Input
                    placeholder={t("auth.enterEmail")}
                    className={inputBase}
                    autoComplete="email"
                    {...loginForm.register("email")}
                  />
                </FormField>

                <FormField
                  label={t("auth.password")}
                  icon={Lock}
                  error={loginForm.formState.errors.password?.message}
                  rightSlot={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className={eyeBtn}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                >
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.enterPassword")}
                    className={`${inputBase} pr-10`}
                    autoComplete="current-password"
                    {...loginForm.register("password")}
                  />
                </FormField>

                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/20 accent-amber-500" />
                    <span className="text-xs text-white/40">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setActiveTab("forgot"); setError(""); }}
                    className="text-xs text-amber-400/70 hover:text-amber-300 transition-colors"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>

                <Button type="submit" disabled={loginMutation.isPending} className={submitBtn}>
                  {loginMutation.isPending ? t("auth.signingIn") : t("auth.signIn")}
                </Button>

                {/* Register CTA */}
                <p className="text-center text-xs text-white/30 mt-3">
                  New here?{" "}
                  <button
                    type="button"
                    onClick={() => { setActiveTab("register"); setError(""); }}
                    className="text-amber-400/80 hover:text-amber-300 font-semibold transition-colors"
                  >
                    Create a free account →
                  </button>
                </p>
              </form>
            )}

            {/* ══════════════════════════════
                REGISTER FORM
            ══════════════════════════════ */}
            {activeTab === "register" && (
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-3.5">
                {/* Referral banner */}
                {referralCodeFromUrl && (
                  <div className="rwg-referral-banner">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    Referral code applied from your invitation link
                  </div>
                )}

                {/* Perks strip */}
                <div className="grid grid-cols-2 gap-1.5 mb-1">
                  {REGISTER_PERKS.map(({ icon: Icon, label }) => (
                    <div key={label} className="rwg-perk-pill">
                      <Icon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="text-[10px] leading-tight">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="rwg-divider-gold" />

                {/* First + Last name */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField label={t("auth.firstName")} icon={User} error={registerForm.formState.errors.firstName?.message}>
                    <Input placeholder="First name" className={inputBase} {...registerForm.register("firstName")} />
                  </FormField>
                  <FormField label={t("auth.lastName")} icon={User} error={registerForm.formState.errors.lastName?.message}>
                    <Input placeholder="Last name" className={inputBase} {...registerForm.register("lastName")} />
                  </FormField>
                </div>

                <FormField label={t("auth.email")} icon={Mail} error={registerForm.formState.errors.email?.message}>
                  <Input placeholder={t("auth.enterEmail")} className={inputBase} autoComplete="email" {...registerForm.register("email")} />
                </FormField>

                <FormField label="Username" icon={User} error={registerForm.formState.errors.username?.message}>
                  <Input placeholder="Choose a username" className={inputBase} autoComplete="username" {...registerForm.register("username")} />
                </FormField>

                <FormField
                  label={t("auth.password")}
                  icon={Lock}
                  error={registerForm.formState.errors.password?.message}
                  rightSlot={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className={eyeBtn}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                >
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    className={`${inputBase} pr-10`}
                    autoComplete="new-password"
                    {...registerForm.register("password")}
                  />
                </FormField>

                {/* Phone number */}
                <div>
                  <label className="text-amber-200/70 text-xs font-semibold uppercase tracking-wider mb-2 block">
                    {t("auth.phoneNumber")}
                  </label>
                  <div className="flex gap-2 items-stretch">
                    <div className="relative flex-shrink-0 w-[120px]">
                      <select className={`${selectBase} w-full`} {...registerForm.register("countryCode")}>
                        <option value="+62">🇮🇩 +62</option>
                        <option value="+65">🇸🇬 +65</option>
                        <option value="+60">🇲🇾 +60</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+86">🇨🇳 +86</option>
                        <option value="+81">🇯🇵 +81</option>
                        <option value="+82">🇰🇷 +82</option>
                        <option value="+63">🇵🇭 +63</option>
                        <option value="+66">🇹🇭 +66</option>
                        <option value="+84">🇻🇳 +84</option>
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+61">🇦🇺 +61</option>
                        <option value="+33">🇫🇷 +33</option>
                        <option value="+49">🇩🇪 +49</option>
                        <option value="+39">🇮🇹 +39</option>
                        <option value="+34">🇪🇸 +34</option>
                        <option value="+7">🇷🇺 +7</option>
                        <option value="+55">🇧🇷 +55</option>
                        <option value="+52">🇲🇽 +52</option>
                        <option value="+27">🇿🇦 +27</option>
                        <option value="+971">🇦🇪 +971</option>
                        <option value="+966">🇸🇦 +966</option>
                        <option value="+351">🇵🇹 +351</option>
                        <option value="+31">🇳🇱 +31</option>
                        <option value="+46">🇸🇪 +46</option>
                        <option value="+47">🇳🇴 +47</option>
                        <option value="+45">🇩🇰 +45</option>
                        <option value="+41">🇨🇭 +41</option>
                        <option value="+90">🇹🇷 +90</option>
                        <option value="+92">🇵🇰 +92</option>
                        <option value="+880">🇧🇩 +880</option>
                      </select>
                    </div>
                    <div className="relative flex-1">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/40 pointer-events-none z-10" />
                      <Input
                        placeholder="Phone number"
                        className={`${inputBase} pl-10`}
                        type="tel"
                        {...registerForm.register("phoneNumber")}
                      />
                    </div>
                  </div>
                  <FieldError msg={registerForm.formState.errors.phoneNumber?.message || registerForm.formState.errors.countryCode?.message} />
                </div>

                {/* DOB + Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-amber-200/70 text-xs font-semibold uppercase tracking-wider mb-2 block">
                      {t("auth.dateOfBirth")}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/40 pointer-events-none z-10" />
                      <Input type="date" className={`${inputBase} pl-10`} {...registerForm.register("dateOfBirth")} />
                    </div>
                    <FieldError msg={registerForm.formState.errors.dateOfBirth?.message} />
                  </div>
                  <div>
                    <label className="text-amber-200/70 text-xs font-semibold uppercase tracking-wider mb-2 block">
                      {t("auth.gender")}
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/40 pointer-events-none z-10" />
                      <select className={`${selectBase} w-full pl-10`} {...registerForm.register("gender")}>
                        <option value="">{t("auth.gender")}</option>
                        <option value="male">{t("auth.male")}</option>
                        <option value="female">{t("auth.female")}</option>
                      </select>
                    </div>
                    <FieldError msg={registerForm.formState.errors.gender?.message} />
                  </div>
                </div>

                {/* Referral code */}
                <div>
                  <label className="text-amber-200/70 text-xs font-semibold uppercase tracking-wider mb-2 block">
                    {t("auth.referralCodeOptional")}
                    {referralCodeFromUrl && (
                      <span className="text-emerald-400 normal-case font-normal ml-2">(from invite link)</span>
                    )}
                  </label>
                  <Input
                    placeholder={t("auth.referralCodeOptional")}
                    className={`rwg-input w-full h-11 rounded-xl text-sm text-white placeholder:text-white/25 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${
                      referralCodeFromUrl ? "border border-emerald-500/30" : ""
                    }`}
                    {...registerForm.register("referralCode")}
                    readOnly={!!referralCodeFromUrl}
                  />
                  {!referralCodeFromUrl && (
                    <p className="text-xs text-white/25 mt-1.5">{t("auth.referralCodeInfo")}</p>
                  )}
                </div>

                <Button type="submit" disabled={registerMutation.isPending} className={submitBtn}>
                  {registerMutation.isPending ? t("auth.creatingAccount") : t("auth.createAccount")}
                </Button>
              </form>
            )}

            {/* ══════════════════════════════
                FORGOT PASSWORD
            ══════════════════════════════ */}
            {activeTab === "forgot" && !resetEmailSent && (
              <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPassword)} className="space-y-4">
                <FormField label="Email address" icon={Mail} error={forgotPasswordForm.formState.errors.email?.message}>
                  <Input
                    placeholder="Enter your email"
                    className={inputBase}
                    autoComplete="email"
                    {...forgotPasswordForm.register("email")}
                  />
                </FormField>

                <Button type="submit" disabled={forgotPasswordMutation.isPending} className={submitBtn}>
                  {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Email"}
                </Button>

                <button
                  type="button"
                  onClick={() => setActiveTab("login")}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-white/35 hover:text-amber-300/60 transition-colors py-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Login
                </button>
              </form>
            )}

            {/* ══════════════════════════════
                RESET EMAIL SENT + TOKEN FORM
            ══════════════════════════════ */}
            {activeTab === "forgot" && resetEmailSent && (
              <div className="space-y-5">
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">Reset Email Sent!</h3>
                  <p className="text-sm text-white/40">Check your inbox. The link expires in 1 hour.</p>
                </div>

                <div className="rwg-divider-gold" />
                <p className="text-xs text-white/35 text-center">Have your reset token? Enter it below:</p>

                <form onSubmit={resetPasswordForm.handleSubmit(onResetPassword)} className="space-y-3">
                  <FormField label="Reset Token" error={resetPasswordForm.formState.errors.token?.message}>
                    <Input
                      placeholder="Paste token from email"
                      className={inputBase}
                      {...resetPasswordForm.register("token")}
                    />
                  </FormField>

                  <FormField
                    label="New Password"
                    icon={Lock}
                    error={resetPasswordForm.formState.errors.newPassword?.message}
                    rightSlot={
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className={eyeBtn}>
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  >
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      className={`${inputBase} pr-10`}
                      {...resetPasswordForm.register("newPassword")}
                    />
                  </FormField>

                  <FormField
                    label="Confirm Password"
                    icon={Lock}
                    error={resetPasswordForm.formState.errors.confirmPassword?.message}
                    rightSlot={
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className={eyeBtn}>
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  >
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      className={`${inputBase} pr-10`}
                      {...resetPasswordForm.register("confirmPassword")}
                    />
                  </FormField>

                  <Button type="submit" disabled={resetPasswordMutation.isPending} className={submitBtn}>
                    {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={() => { setResetEmailSent(false); setActiveTab("login"); forgotPasswordForm.reset(); }}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-white/35 hover:text-amber-300/60 transition-colors py-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Login
                </button>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="text-center mt-6 space-y-1">
            <p className="text-white/20 text-xs">© 2026 Reborn Wave Group · All rights reserved</p>
            <p className="text-white/15 text-[10px] tracking-wider uppercase">Batam · Singapore · Expanding Worldwide</p>
          </div>
        </div>
      </div>
    </>
  );
}
