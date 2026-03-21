import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Mail, User, Lock, Eye, EyeOff, AlertCircle, Phone, Calendar, Users, Sparkles, ArrowLeft, CheckCircle, ChevronDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import rwgLogo from "@assets/rwg-logo.png";

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
    message: "Please select a gender"
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

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {msg}
    </p>
  );
}

// Styled input with icon slot
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
      <label className="text-violet-200/80 text-xs font-semibold uppercase tracking-wider mb-2 block">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400/50 pointer-events-none z-10" />}
        <div className={Icon ? "pl-10" : ""}>{children}</div>
        {rightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

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

  // Base classes — rwg-input overrides shadcn white bg with !important
  const inputBase = "rwg-input w-full h-11 rounded-xl text-sm text-white placeholder:text-white/25 border-0 focus-visible:ring-0 focus-visible:ring-offset-0";
  const selectBase = "rwg-select h-11 rounded-xl text-sm text-violet-100 px-3 border-0 cursor-pointer";
  const eyeBtn = "text-violet-400/40 hover:text-violet-300 transition-colors";

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

  useEffect(() => {
    const currentURL = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    let refCode = urlParams.get('ref') || hashParams.get('ref');
    if (!refCode) {
      const refMatch = currentURL.match(/[?&]ref=([^&]+)/);
      if (refMatch) refCode = decodeURIComponent(refMatch[1]);
    }
    if (refCode) {
      setReferralCodeFromUrl(refCode);
      registerForm.setValue('referralCode', refCode);
      setActiveTab('register');
    }
  }, [registerForm]);

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
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to send reset email.", variant: "destructive" }),
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
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to reset password.", variant: "destructive" }),
  });

  const onLogin = (data: LoginFormData) => { setError(""); loginMutation.mutate(data); };
  const onRegister = (data: RegisterFormData) => { setError(""); registerMutation.mutate(data); };
  const onForgotPassword = (data: ForgotPasswordFormData) => { forgotPasswordMutation.mutate(data); };
  const onResetPassword = (data: ResetPasswordFormData) => { resetPasswordMutation.mutate(data); };

  const submitBtn = "w-full h-12 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold rounded-xl border-0 shadow-lg shadow-violet-900/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-violet-800/60 mt-2 text-sm tracking-wide";

  return (
    <div className="rwg-page-bg min-h-screen flex items-center justify-center px-4 py-8">
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="rwg-grid-overlay" />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-violet-500/40 transition-all">
              <img src={rwgLogo} alt="RWG" className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-bold text-white/60 group-hover:text-white/90 transition-colors">
              Reborn Wave Group
            </span>
          </a>
          <LanguageSelector />
        </div>

        {/* Card */}
        <div className="rwg-card p-7">
          {/* Header icon */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-900/60">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {activeTab === "login" && (
              <>
                <h1 className="text-2xl font-bold text-white">{t('auth.title')}</h1>
                <p className="text-white/40 text-sm mt-1">{t('auth.subtitle')}</p>
              </>
            )}
            {activeTab === "register" && (
              <>
                <h1 className="text-2xl font-bold text-white">{t('auth.signUp')}</h1>
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

          {/* Tab switcher */}
          {(activeTab === "login" || activeTab === "register") && (
            <div className="rwg-tab-switcher mb-5">
              <button
                type="button"
                onClick={() => { setActiveTab("login"); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "login" ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow" : "text-white/40 hover:text-white/70"}`}
              >
                {t('auth.login')}
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("register"); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "register" ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow" : "text-white/40 hover:text-white/70"}`}
              >
                {t('auth.signUp')}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rwg-error-alert mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* ── LOGIN FORM ── */}
          {activeTab === "login" && (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <FormField label={t('auth.email')} icon={Mail} error={loginForm.formState.errors.email?.message}>
                <Input
                  placeholder={t('auth.enterEmail')}
                  className={inputBase}
                  autoComplete="email"
                  {...loginForm.register("email")}
                />
              </FormField>

              <FormField
                label={t('auth.password')}
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
                  placeholder={t('auth.enterPassword')}
                  className={`${inputBase} pr-10`}
                  autoComplete="current-password"
                  {...loginForm.register("password")}
                />
              </FormField>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/20 accent-violet-500" />
                  <span className="text-xs text-white/40">{t('auth.rememberMe') || 'Remember me'}</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setActiveTab("forgot"); setError(""); }}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>

              <Button type="submit" disabled={loginMutation.isPending} className={submitBtn}>
                {loginMutation.isPending ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {activeTab === "register" && (
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-3.5">
              {referralCodeFromUrl && (
                <div className="rwg-referral-banner">
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Referral code applied from your invitation link
                </div>
              )}

              {/* First + Last name */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label={t('auth.firstName')} icon={User} error={registerForm.formState.errors.firstName?.message}>
                  <Input placeholder="First name" className={inputBase} {...registerForm.register("firstName")} />
                </FormField>
                <FormField label={t('auth.lastName')} icon={User} error={registerForm.formState.errors.lastName?.message}>
                  <Input placeholder="Last name" className={inputBase} {...registerForm.register("lastName")} />
                </FormField>
              </div>

              <FormField label={t('auth.email')} icon={Mail} error={registerForm.formState.errors.email?.message}>
                <Input placeholder={t('auth.enterEmail')} className={inputBase} autoComplete="email" {...registerForm.register("email")} />
              </FormField>

              <FormField label="Username" icon={User} error={registerForm.formState.errors.username?.message}>
                <Input placeholder="Choose a username" className={inputBase} autoComplete="username" {...registerForm.register("username")} />
              </FormField>

              <FormField
                label={t('auth.password')}
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

              {/* Phone number — country code + number in one row */}
              <div>
                <label className="text-violet-200/80 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  {t('auth.phoneNumber')}
                </label>
                <div className="flex gap-2 items-stretch">
                  {/* Country code — fixed width, no w-full */}
                  <div className="relative flex-shrink-0 w-[120px]">
                    <select
                      className={`${selectBase} w-full`}
                      {...registerForm.register("countryCode")}
                    >
                      <option value="+62">🇮🇩 +62</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+86">🇨🇳 +86</option>
                      <option value="+81">🇯🇵 +81</option>
                      <option value="+82">🇰🇷 +82</option>
                      <option value="+65">🇸🇬 +65</option>
                      <option value="+60">🇲🇾 +60</option>
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
                      <option value="+20">🇪🇬 +20</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+966">🇸🇦 +966</option>
                      <option value="+351">🇵🇹 +351</option>
                      <option value="+31">🇳🇱 +31</option>
                      <option value="+46">🇸🇪 +46</option>
                      <option value="+47">🇳🇴 +47</option>
                      <option value="+45">🇩🇰 +45</option>
                      <option value="+358">🇫🇮 +358</option>
                      <option value="+41">🇨🇭 +41</option>
                      <option value="+43">🇦🇹 +43</option>
                      <option value="+32">🇧🇪 +32</option>
                      <option value="+353">🇮🇪 +353</option>
                      <option value="+48">🇵🇱 +48</option>
                      <option value="+420">🇨🇿 +420</option>
                      <option value="+36">🇭🇺 +36</option>
                      <option value="+30">🇬🇷 +30</option>
                      <option value="+90">🇹🇷 +90</option>
                      <option value="+972">🇮🇱 +972</option>
                      <option value="+234">🇳🇬 +234</option>
                      <option value="+254">🇰🇪 +254</option>
                      <option value="+56">🇨🇱 +56</option>
                      <option value="+54">🇦🇷 +54</option>
                      <option value="+57">🇨🇴 +57</option>
                      <option value="+51">🇵🇪 +51</option>
                      <option value="+58">🇻🇪 +58</option>
                      <option value="+92">🇵🇰 +92</option>
                      <option value="+880">🇧🇩 +880</option>
                      <option value="+94">🇱🇰 +94</option>
                      <option value="+95">🇲🇲 +95</option>
                      <option value="+977">🇳🇵 +977</option>
                    </select>
                  </div>
                  {/* Phone number input — fills remaining space */}
                  <div className="relative flex-1">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400/50 pointer-events-none z-10" />
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

              {/* Date of birth + Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-violet-200/80 text-xs font-semibold uppercase tracking-wider mb-2 block">
                    {t('auth.dateOfBirth')}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400/50 pointer-events-none z-10" />
                    <Input
                      type="date"
                      className={`${inputBase} pl-10`}
                      {...registerForm.register("dateOfBirth")}
                    />
                  </div>
                  <FieldError msg={registerForm.formState.errors.dateOfBirth?.message} />
                </div>
                <div>
                  <label className="text-violet-200/80 text-xs font-semibold uppercase tracking-wider mb-2 block">
                    {t('auth.gender')}
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400/50 pointer-events-none z-10" />
                    <select
                      className={`${selectBase} w-full pl-10`}
                      {...registerForm.register("gender")}
                    >
                      <option value="">{t('auth.gender')}</option>
                      <option value="male">{t('auth.male')}</option>
                      <option value="female">{t('auth.female')}</option>
                    </select>
                  </div>
                  <FieldError msg={registerForm.formState.errors.gender?.message} />
                </div>
              </div>

              {/* Referral code */}
              <div>
                <label className="text-violet-200/80 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  {t('auth.referralCodeOptional')}
                  {referralCodeFromUrl && <span className="text-emerald-400 normal-case font-normal ml-2">(from invite link)</span>}
                </label>
                <Input
                  placeholder={t('auth.referralCodeOptional')}
                  className={`rwg-input w-full h-11 rounded-xl text-sm text-white placeholder:text-white/25 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${referralCodeFromUrl ? "border border-emerald-500/30" : ""}`}
                  {...registerForm.register("referralCode")}
                  readOnly={!!referralCodeFromUrl}
                />
                {!referralCodeFromUrl && (
                  <p className="text-xs text-white/25 mt-1.5">{t('auth.referralCodeInfo')}</p>
                )}
              </div>

              <Button type="submit" disabled={registerMutation.isPending} className={submitBtn}>
                {registerMutation.isPending ? t('auth.creatingAccount') : t('auth.createAccount')}
              </Button>
            </form>
          )}

          {/* ── FORGOT PASSWORD ── */}
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
                className="w-full flex items-center justify-center gap-1.5 text-sm text-white/35 hover:text-white/60 transition-colors py-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Login
              </button>
            </form>
          )}

          {/* ── RESET EMAIL SENT ── */}
          {activeTab === "forgot" && resetEmailSent && (
            <div className="space-y-5">
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-white mb-1">Reset Email Sent!</h3>
                <p className="text-sm text-white/40">Check your inbox. The link expires in 1 hour.</p>
              </div>

              <div className="rwg-divider" />
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
                className="w-full flex items-center justify-center gap-1.5 text-sm text-white/35 hover:text-white/60 transition-colors py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Login
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-6">
          © 2025 Reborn Wave Group · All rights reserved
        </p>
      </div>
    </div>
  );
}
