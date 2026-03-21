import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Mail, User, Lock, Eye, EyeOff, AlertCircle, Phone, Calendar, Users, Sparkles, ArrowLeft, CheckCircle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useSearch } from "wouter";
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

// Reusable dark input wrapper
function DarkInput({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {msg}
    </p>
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

  const inputCls = "h-11 bg-white/8 border-white/15 text-white placeholder:text-white/30 rounded-xl focus:border-violet-500/60 focus:ring-violet-500/20 focus:bg-white/10 transition-all duration-200";
  const labelCls = "text-white/70 text-sm font-medium mb-1.5 block";
  const iconCls = "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none";

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
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Login successful!", description: "Welcome back to your pet care journey." });
      setTimeout(() => { window.location.href = "/"; }, 500);
    },
    onError: (error: any) => setError(error.message || "Login failed. Please try again."),
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
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Registration successful!", description: "Welcome to your new pet care adventure!" });
      window.location.href = "/";
    },
    onError: (error: any) => setError(error.message || "Registration failed. Please try again."),
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send reset email");
      }
      return response.json();
    },
    onSuccess: () => {
      setResetEmailSent(true);
      toast({ title: "Reset email sent!", description: "Check your email for password reset instructions." });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to send reset email.", variant: "destructive" }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset password");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Password reset successful!", description: "You can now login with your new password." });
      setActiveTab("login");
      setResetEmailSent(false);
      resetPasswordForm.reset();
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to reset password.", variant: "destructive" }),
  });

  const onLogin = (data: LoginFormData) => { setError(""); loginMutation.mutate(data); };
  const onRegister = (data: RegisterFormData) => { setError(""); registerMutation.mutate(data); };
  const onForgotPassword = (data: ForgotPasswordFormData) => { forgotPasswordMutation.mutate(data); };
  const onResetPassword = (data: ResetPasswordFormData) => { resetPasswordMutation.mutate(data); };

  const selectCls = "flex h-11 w-full rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200";

  return (
    <div className="rwg-page-bg min-h-screen flex items-center justify-center px-4 py-8">
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="rwg-grid-overlay" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo + Language */}
        <div className="flex items-center justify-between mb-8">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl overflow-hidden">
              <img src={rwgLogo} alt="RWG" className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-bold text-white/70 group-hover:text-white/90 transition-colors">
              Reborn Wave Group
            </span>
          </a>
          <LanguageSelector />
        </div>

        {/* Card */}
        <div className="rwg-card p-7">
          {/* Header */}
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-900/50">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {activeTab === "login" && (
              <>
                <h1 className="text-2xl font-bold text-white">{t('auth.title')}</h1>
                <p className="text-white/45 text-sm mt-1">{t('auth.subtitle')}</p>
              </>
            )}
            {activeTab === "register" && (
              <>
                <h1 className="text-2xl font-bold text-white">{t('auth.signUp')}</h1>
                <p className="text-white/45 text-sm mt-1">Create your account to get started</p>
              </>
            )}
            {(activeTab === "forgot" || activeTab === "reset") && (
              <>
                <h1 className="text-2xl font-bold text-white">Reset Password</h1>
                <p className="text-white/45 text-sm mt-1">We'll help you get back in</p>
              </>
            )}
          </div>

          {/* Tab switcher (login/register only) */}
          {(activeTab === "login" || activeTab === "register") && (
            <div className="rwg-tab-switcher">
              <button
                type="button"
                onClick={() => { setActiveTab("login"); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "login" ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow" : "text-white/50 hover:text-white/80"}`}
              >
                {t('auth.login')}
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("register"); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "register" ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow" : "text-white/50 hover:text-white/80"}`}
              >
                {t('auth.signUp')}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rwg-error-alert">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* ── LOGIN FORM ── */}
          {activeTab === "login" && (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <div>
                <label className={labelCls}>{t('auth.email')}</label>
                <DarkInput>
                  <Mail className={iconCls} />
                  <Input id="login-email" placeholder={t('auth.enterEmail')} className={`${inputCls} pl-10`} {...loginForm.register("email")} />
                </DarkInput>
                <FieldError msg={loginForm.formState.errors.email?.message} />
              </div>

              <div>
                <label className={labelCls}>{t('auth.password')}</label>
                <DarkInput>
                  <Lock className={iconCls} />
                  <Input id="login-password" type={showPassword ? "text" : "password"} placeholder={t('auth.enterPassword')} className={`${inputCls} pl-10 pr-10`} {...loginForm.register("password")} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </DarkInput>
                <FieldError msg={loginForm.formState.errors.password?.message} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-white/20 accent-violet-500" />
                  <span className="text-xs text-white/50">{t('auth.rememberMe') || 'Remember me'}</span>
                </label>
                <button type="button" onClick={() => { setActiveTab("forgot"); setError(""); }} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                  {t('auth.forgotPassword')}
                </button>
              </div>

              <Button type="submit" disabled={loginMutation.isPending} className="w-full h-11 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl font-semibold shadow-lg shadow-violet-900/40 transition-all duration-200 hover:-translate-y-0.5 mt-2">
                {loginMutation.isPending ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {activeTab === "register" && (
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-3">
              {referralCodeFromUrl && (
                <div className="rwg-referral-banner">
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Referral code applied from your invitation link
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t('auth.firstName')}</label>
                  <DarkInput>
                    <User className={iconCls} />
                    <Input id="firstName" placeholder={t('auth.firstName')} className={`${inputCls} pl-10`} {...registerForm.register("firstName")} />
                  </DarkInput>
                  <FieldError msg={registerForm.formState.errors.firstName?.message} />
                </div>
                <div>
                  <label className={labelCls}>{t('auth.lastName')}</label>
                  <DarkInput>
                    <User className={iconCls} />
                    <Input id="lastName" placeholder={t('auth.lastName')} className={`${inputCls} pl-10`} {...registerForm.register("lastName")} />
                  </DarkInput>
                  <FieldError msg={registerForm.formState.errors.lastName?.message} />
                </div>
              </div>

              <div>
                <label className={labelCls}>{t('auth.email')}</label>
                <DarkInput>
                  <Mail className={iconCls} />
                  <Input id="register-email" placeholder={t('auth.enterEmail')} className={`${inputCls} pl-10`} {...registerForm.register("email")} />
                </DarkInput>
                <FieldError msg={registerForm.formState.errors.email?.message} />
              </div>

              <div>
                <label className={labelCls}>Username</label>
                <DarkInput>
                  <User className={iconCls} />
                  <Input id="username" placeholder="Choose a display username" className={`${inputCls} pl-10`} {...registerForm.register("username")} />
                </DarkInput>
                <FieldError msg={registerForm.formState.errors.username?.message} />
              </div>

              <div>
                <label className={labelCls}>{t('auth.password')}</label>
                <DarkInput>
                  <Lock className={iconCls} />
                  <Input id="register-password" type={showPassword ? "text" : "password"} placeholder={t('auth.enterPassword')} className={`${inputCls} pl-10 pr-10`} {...registerForm.register("password")} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </DarkInput>
                <FieldError msg={registerForm.formState.errors.password?.message} />
              </div>

              <div>
                <label className={labelCls}>{t('auth.phoneNumber')}</label>
                <div className="flex gap-2">
                  <select className={`${selectCls} w-40 flex-shrink-0`} {...registerForm.register("countryCode")}>
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
                  <DarkInput>
                    <Phone className={iconCls} />
                    <Input id="phoneNumber" placeholder={t('auth.phoneNumber')} className={`${inputCls} pl-10`} {...registerForm.register("phoneNumber")} />
                  </DarkInput>
                </div>
                <FieldError msg={registerForm.formState.errors.phoneNumber?.message} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t('auth.dateOfBirth')}</label>
                  <DarkInput>
                    <Calendar className={iconCls} />
                    <Input id="dateOfBirth" type="date" className={`${inputCls} pl-10`} {...registerForm.register("dateOfBirth")} />
                  </DarkInput>
                  <FieldError msg={registerForm.formState.errors.dateOfBirth?.message} />
                </div>
                <div>
                  <label className={labelCls}>{t('auth.gender')}</label>
                  <DarkInput>
                    <Users className={iconCls} />
                    <select id="gender" className={`${selectCls} pl-10`} {...registerForm.register("gender")}>
                      <option value="">{t('auth.gender')}</option>
                      <option value="male">{t('auth.male')}</option>
                      <option value="female">{t('auth.female')}</option>
                    </select>
                  </DarkInput>
                  <FieldError msg={registerForm.formState.errors.gender?.message} />
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  {t('auth.referralCodeOptional')}
                  {referralCodeFromUrl && <span className="text-emerald-400 text-xs ml-2">(from link)</span>}
                </label>
                <Input
                  id="referralCode"
                  placeholder={t('auth.referralCodeOptional')}
                  className={`${inputCls} ${referralCodeFromUrl ? "border-emerald-500/40 bg-emerald-500/8" : ""}`}
                  {...registerForm.register("referralCode")}
                  readOnly={!!referralCodeFromUrl}
                />
                {!referralCodeFromUrl && <p className="text-xs text-white/30 mt-1">{t('auth.referralCodeInfo')}</p>}
              </div>

              <Button type="submit" disabled={registerMutation.isPending} className="w-full h-11 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl font-semibold shadow-lg shadow-violet-900/40 transition-all duration-200 hover:-translate-y-0.5 mt-1">
                {registerMutation.isPending ? t('auth.creatingAccount') : t('auth.createAccount')}
              </Button>
            </form>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {activeTab === "forgot" && !resetEmailSent && (
            <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPassword)} className="space-y-4">
              <div>
                <label className={labelCls}>Email address</label>
                <DarkInput>
                  <Mail className={iconCls} />
                  <Input id="forgot-email" placeholder="Enter your email" className={`${inputCls} pl-10`} {...forgotPasswordForm.register("email")} />
                </DarkInput>
                <FieldError msg={forgotPasswordForm.formState.errors.email?.message} />
              </div>

              <Button type="submit" disabled={forgotPasswordMutation.isPending} className="w-full h-11 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl font-semibold transition-all duration-200 hover:-translate-y-0.5">
                {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Email"}
              </Button>

              <button type="button" onClick={() => setActiveTab("login")} className="w-full flex items-center justify-center gap-1.5 text-sm text-white/45 hover:text-white/70 transition-colors py-2">
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
                <p className="text-sm text-white/45">Check your inbox. The link expires in 1 hour.</p>
              </div>

              <div className="rwg-divider" />
              <p className="text-xs text-white/40 text-center">Have your reset token? Enter it below:</p>

              <form onSubmit={resetPasswordForm.handleSubmit(onResetPassword)} className="space-y-3">
                <div>
                  <label className={labelCls}>Reset Token</label>
                  <Input id="reset-token" placeholder="Paste token from email" className={inputCls} {...resetPasswordForm.register("token")} />
                  <FieldError msg={resetPasswordForm.formState.errors.token?.message} />
                </div>
                <div>
                  <label className={labelCls}>New Password</label>
                  <DarkInput>
                    <Lock className={iconCls} />
                    <Input id="new-password" type={showNewPassword ? "text" : "password"} placeholder="Enter new password" className={`${inputCls} pl-10 pr-10`} {...resetPasswordForm.register("newPassword")} />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </DarkInput>
                  <FieldError msg={resetPasswordForm.formState.errors.newPassword?.message} />
                </div>
                <div>
                  <label className={labelCls}>Confirm Password</label>
                  <DarkInput>
                    <Lock className={iconCls} />
                    <Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm new password" className={`${inputCls} pl-10 pr-10`} {...resetPasswordForm.register("confirmPassword")} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </DarkInput>
                  <FieldError msg={resetPasswordForm.formState.errors.confirmPassword?.message} />
                </div>
                <Button type="submit" disabled={resetPasswordMutation.isPending} className="w-full h-11 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl font-semibold transition-all duration-200">
                  {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </form>

              <button type="button" onClick={() => { setResetEmailSent(false); setActiveTab("login"); forgotPasswordForm.reset(); }} className="w-full flex items-center justify-center gap-1.5 text-sm text-white/45 hover:text-white/70 transition-colors py-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Login
              </button>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-white/25 text-xs mt-6">
          © 2025 Reborn Wave Group · All rights reserved
        </p>
      </div>
    </div>
  );
}
