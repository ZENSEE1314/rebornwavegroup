import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Mail, User, Lock, Eye, EyeOff, AlertCircle, Phone, Calendar, Users } from "lucide-react";
import { FaGoogle, FaFacebook, FaInstagram } from "react-icons/fa";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
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

export default function Login() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      countryCode: "+1",
      phoneNumber: "",
      dateOfBirth: "",
      gender: "",
      referralCode: "",
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetPasswordForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Login successful!",
        description: "Welcome back to your pet care journey.",
      });
      window.location.href = "/";
    },
    onError: (error: any) => {
      setError(error.message || "Login failed. Please try again.");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      // Combine country code and phone number
      const fullPhoneNumber = `${data.countryCode}${data.phoneNumber}`;
      const registrationData = {
        ...data,
        phoneNumber: fullPhoneNumber
      };
      delete (registrationData as any).countryCode; // Remove countryCode as it's now part of phoneNumber
      
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration successful!",
        description: "Welcome to your new pet care adventure!",
      });
      window.location.href = "/";
    },
    onError: (error: any) => {
      setError(error.message || "Registration failed. Please try again.");
    },
  });

  const onLogin = (data: LoginFormData) => {
    setError("");
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterFormData) => {
    setError("");
    registerMutation.mutate(data);
  };

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      toast({
        title: "Reset email sent!",
        description: "Check your email for password reset instructions.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset password");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset successful!",
        description: "You can now login with your new password.",
      });
      setActiveTab("login");
      setResetEmailSent(false);
      setResetToken("");
      resetPasswordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onForgotPassword = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(data);
  };

  const onResetPassword = (data: ResetPasswordFormData) => {
    resetPasswordMutation.mutate(data);
  };

  const handleOAuthLogin = (provider: "google" | "facebook" | "instagram") => {
    // Store referral code from registration form in localStorage before OAuth redirect
    const referralCodeValue = registerForm.getValues("referralCode");
    if (referralCodeValue) {
      localStorage.setItem("pendingReferralCode", referralCodeValue);
    }
    
    if (provider === "google") {
      window.location.href = "/api/auth/google";
    } else if (provider === "facebook") {
      window.location.href = "/api/auth/facebook";
    } else if (provider === "instagram") {
      toast({
        title: "OAuth Setup Required",
        description: "Instagram authentication requires additional configuration. Please use email/password login for now.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-pink-50 to-indigo-100 dark:from-purple-900 dark:via-pink-900 dark:to-indigo-900 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center relative">
          <div className="absolute top-4 right-4">
            <LanguageSelector />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800 dark:text-white">
            {t('auth.title')}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            {t('auth.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${activeTab === "forgot-password" || activeTab === "reset-password" ? "grid-cols-3" : "grid-cols-2"}`}>
              <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
              <TabsTrigger value="register">{t('auth.signUp')}</TabsTrigger>
              {(activeTab === "forgot-password" || activeTab === "reset-password") && (
                <TabsTrigger value="forgot-password">{t('auth.reset')}</TabsTrigger>
              )}
            </TabsList>
            
            {activeTab === "register" && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
                  <strong>Have a referral code?</strong> Enter it in the form below before choosing your sign-up method
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-email"
                      placeholder={t('auth.enterEmail')}
                      className="pl-10"
                      {...loginForm.register("email")}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t('auth.enterPassword')}
                      className="pl-10 pr-10"
                      {...loginForm.register("password")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-500">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800"
                    onClick={() => setActiveTab("forgot-password")}
                  >
                    {t('auth.forgotPassword')}
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? t('auth.signingIn') : t('auth.signIn')}
                </Button>
              </form>

              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t('auth.orContinueWith')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleOAuthLogin("google")}
                    className="w-full"
                  >
                    <FaGoogle className="mr-2 h-4 w-4" />
                    Google
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleOAuthLogin("facebook")}
                    className="w-full"
                  >
                    <FaFacebook className="mr-2 h-4 w-4" />
                    Facebook
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => handleOAuthLogin("instagram")}
                  className="w-full"
                >
                  <FaInstagram className="mr-2 h-4 w-4" />
                  Instagram
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('auth.firstName')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="firstName"
                        placeholder={t('auth.firstName')}
                        className="pl-10"
                        {...registerForm.register("firstName")}
                      />
                    </div>
                    {registerForm.formState.errors.firstName && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="lastName"
                        placeholder="Last name"
                        className="pl-10"
                        {...registerForm.register("lastName")}
                      />
                    </div>
                    {registerForm.formState.errors.lastName && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-email"
                      placeholder="Enter your email"
                      className="pl-10"
                      {...registerForm.register("email")}
                    />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      className="pl-10 pr-10"
                      {...registerForm.register("password")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <div className="flex gap-2">
                    <div className="relative w-56">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...registerForm.register("countryCode")}
                      >
                        <option value="+1">United States (+1)</option>
                        <option value="+44">United Kingdom (+44)</option>
                        <option value="+86">China (+86)</option>
                        <option value="+81">Japan (+81)</option>
                        <option value="+82">South Korea (+82)</option>
                        <option value="+65">Singapore (+65)</option>
                        <option value="+60">Malaysia (+60)</option>
                        <option value="+62">Indonesia (+62)</option>
                        <option value="+63">Philippines (+63)</option>
                        <option value="+66">Thailand (+66)</option>
                        <option value="+84">Vietnam (+84)</option>
                        <option value="+91">India (+91)</option>
                        <option value="+61">Australia (+61)</option>
                        <option value="+33">France (+33)</option>
                        <option value="+49">Germany (+49)</option>
                        <option value="+39">Italy (+39)</option>
                        <option value="+34">Spain (+34)</option>
                        <option value="+7">Russia (+7)</option>
                        <option value="+55">Brazil (+55)</option>
                        <option value="+52">Mexico (+52)</option>
                        <option value="+27">South Africa (+27)</option>
                        <option value="+20">Egypt (+20)</option>
                        <option value="+971">United Arab Emirates (+971)</option>
                        <option value="+966">Saudi Arabia (+966)</option>
                        <option value="+1">Canada (+1)</option>
                        <option value="+351">Portugal (+351)</option>
                        <option value="+31">Netherlands (+31)</option>
                        <option value="+46">Sweden (+46)</option>
                        <option value="+47">Norway (+47)</option>
                        <option value="+45">Denmark (+45)</option>
                        <option value="+358">Finland (+358)</option>
                        <option value="+41">Switzerland (+41)</option>
                        <option value="+43">Austria (+43)</option>
                        <option value="+32">Belgium (+32)</option>
                        <option value="+353">Ireland (+353)</option>
                        <option value="+48">Poland (+48)</option>
                        <option value="+420">Czech Republic (+420)</option>
                        <option value="+36">Hungary (+36)</option>
                        <option value="+30">Greece (+30)</option>
                        <option value="+90">Turkey (+90)</option>
                        <option value="+972">Israel (+972)</option>
                        <option value="+234">Nigeria (+234)</option>
                        <option value="+254">Kenya (+254)</option>
                        <option value="+56">Chile (+56)</option>
                        <option value="+54">Argentina (+54)</option>
                        <option value="+57">Colombia (+57)</option>
                        <option value="+51">Peru (+51)</option>
                        <option value="+58">Venezuela (+58)</option>
                        <option value="+92">Pakistan (+92)</option>
                        <option value="+880">Bangladesh (+880)</option>
                        <option value="+94">Sri Lanka (+94)</option>
                        <option value="+95">Myanmar (+95)</option>
                        <option value="+977">Nepal (+977)</option>
                      </select>
                    </div>
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phoneNumber"
                        placeholder="Enter phone number"
                        className="pl-10"
                        {...registerForm.register("phoneNumber")}
                      />
                    </div>
                  </div>
                  {registerForm.formState.errors.phoneNumber && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.phoneNumber.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="dateOfBirth"
                        type="date"
                        className="pl-10"
                        {...registerForm.register("dateOfBirth")}
                      />
                    </div>
                    {registerForm.formState.errors.dateOfBirth && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.dateOfBirth.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <select
                        id="gender"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...registerForm.register("gender")}
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    {registerForm.formState.errors.gender && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.gender.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referralCode" className="text-sm font-medium">
                    Referral Code (Optional)
                  </Label>
                  <Input
                    id="referralCode"
                    placeholder="Enter referral code"
                    {...registerForm.register("referralCode")}
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    💡 Enter your referral code here before signing up with email or Google/Facebook
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Creating account..." : "Create Account"}
                </Button>
              </form>

              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or sign up with (referral code above will be applied)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleOAuthLogin("google")}
                    className="w-full"
                  >
                    <FaGoogle className="mr-2 h-4 w-4" />
                    Google
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleOAuthLogin("facebook")}
                    className="w-full"
                  >
                    <FaFacebook className="mr-2 h-4 w-4" />
                    Facebook
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => handleOAuthLogin("instagram")}
                  className="w-full"
                >
                  <FaInstagram className="mr-2 h-4 w-4" />
                  Instagram
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="forgot-password" className="space-y-4">
              {!resetEmailSent ? (
                <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPassword)} className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      Reset Your Password
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Enter your email address and we'll send you a reset link
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="forgot-email"
                        placeholder="Enter your email"
                        className="pl-10"
                        {...forgotPasswordForm.register("email")}
                      />
                    </div>
                    {forgotPasswordForm.formState.errors.email && (
                      <p className="text-sm text-red-500">
                        {forgotPasswordForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={forgotPasswordMutation.isPending}
                  >
                    {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Email"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setActiveTab("login")}
                  >
                    Back to Login
                  </Button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                      Reset Email Sent!
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Check your email for password reset instructions. The link will expire in 1 hour.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Have your reset token? Enter it below:
                    </div>
                    
                    <form onSubmit={resetPasswordForm.handleSubmit(onResetPassword)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-token">Reset Token</Label>
                        <Input
                          id="reset-token"
                          placeholder="Enter reset token from email"
                          {...resetPasswordForm.register("token")}
                        />
                        {resetPasswordForm.formState.errors.token && (
                          <p className="text-sm text-red-500">
                            {resetPasswordForm.formState.errors.token.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            className="pl-10 pr-10"
                            {...resetPasswordForm.register("newPassword")}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                        {resetPasswordForm.formState.errors.newPassword && (
                          <p className="text-sm text-red-500">
                            {resetPasswordForm.formState.errors.newPassword.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            className="pl-10 pr-10"
                            {...resetPasswordForm.register("confirmPassword")}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                        {resetPasswordForm.formState.errors.confirmPassword && (
                          <p className="text-sm text-red-500">
                            {resetPasswordForm.formState.errors.confirmPassword.message}
                          </p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={resetPasswordMutation.isPending}
                      >
                        {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                      </Button>
                    </form>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setResetEmailSent(false);
                        setActiveTab("login");
                        forgotPasswordForm.reset();
                      }}
                    >
                      Back to Login
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Enhanced container with improved background
function LoginContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-cyan-900/30"></div>
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}