import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import rwgLogo from "@assets/rwg-logo.png";

export default function InvestorLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const referralCode = useMemo(() => new URLSearchParams(window.location.search).get("ref") || "", []);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [register, setRegister] = useState({ email: "", password: "", firstName: "", lastName: "", referralCode });

  const loginMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/investor/auth/login", login)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/investor/dashboard");
    },
    onError: (error: any) => toast({ title: "Login failed", description: error.message, variant: "destructive" }),
  });

  const registerMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/investor/auth/register", register)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/investor/dashboard");
    },
    onError: (error: any) => toast({ title: "Registration failed", description: error.message, variant: "destructive" }),
  });

  return (
    <main className="min-h-screen bg-[#090d12] px-5 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-center">
            <Link href="/investor" className="mb-8 flex items-center gap-3">
              <img src={rwgLogo} alt="Reborn Wave Group" className="h-12 w-12 rounded-xl object-contain" />
              <div>
                <div className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Reborn Wave</div>
                <div className="text-xs text-white/45">Investor access</div>
              </div>
            </Link>
            <h1 className="text-5xl font-black leading-tight">Separate investor login.</h1>
            <p className="mt-5 max-w-lg text-white/60">
              This area is for investment packages, project tokens, cash wallet, spending wallet, referrals, and QR club payments.
            </p>
          </div>

          <Card className="border-white/10 bg-white/[0.06] text-white shadow-2xl shadow-black/30">
            <CardHeader>
              <CardTitle>Investor Portal</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2 bg-slate-950/70">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                <TabsContent value="login" className="mt-6 space-y-4">
                  <div>
                    <Label>Email</Label>
                    <Input className="mt-2 border-white/10 bg-slate-950/60 text-white" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input type="password" className="mt-2 border-white/10 bg-slate-950/60 text-white" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} />
                  </div>
                  <Button className="w-full bg-amber-400 text-slate-950 hover:bg-amber-300" disabled={loginMutation.isPending} onClick={() => loginMutation.mutate()}>
                    {loginMutation.isPending ? "Signing in..." : "Login to dashboard"}
                  </Button>
                </TabsContent>
                <TabsContent value="register" className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>First name</Label>
                      <Input className="mt-2 border-white/10 bg-slate-950/60 text-white" value={register.firstName} onChange={(e) => setRegister({ ...register, firstName: e.target.value })} />
                    </div>
                    <div>
                      <Label>Last name</Label>
                      <Input className="mt-2 border-white/10 bg-slate-950/60 text-white" value={register.lastName} onChange={(e) => setRegister({ ...register, lastName: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input className="mt-2 border-white/10 bg-slate-950/60 text-white" value={register.email} onChange={(e) => setRegister({ ...register, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input type="password" className="mt-2 border-white/10 bg-slate-950/60 text-white" value={register.password} onChange={(e) => setRegister({ ...register, password: e.target.value })} />
                  </div>
                  <div>
                    <Label>Referral code</Label>
                    <Input className="mt-2 border-white/10 bg-slate-950/60 text-white" value={register.referralCode} onChange={(e) => setRegister({ ...register, referralCode: e.target.value })} />
                  </div>
                  <Button className="w-full bg-amber-400 text-slate-950 hover:bg-amber-300" disabled={registerMutation.isPending} onClick={() => registerMutation.mutate()}>
                    {registerMutation.isPending ? "Creating account..." : "Create investor account"}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
