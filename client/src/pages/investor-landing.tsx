import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Gamepad2, Music2, Scissors, PawPrint, WalletCards, ArrowRight, ShieldCheck } from "lucide-react";
import rwgLogo from "@assets/rwg-logo.png";
import doluruuBoy from "@assets/Doluruu Boy_1749664545355.png";

const projectIcons: Record<string, any> = {
  ktv_lounge: Music2,
  beauty: Scissors,
  game_house: Gamepad2,
  live_house: Building2,
  pet_cafe: PawPrint,
};

export default function InvestorLanding() {
  const { data } = useQuery<any>({ queryKey: ["/api/investor/public"] });
  const projects = data?.projects || [];
  const packages = data?.packages || [];

  return (
    <main className="min-h-screen bg-[#090d12] text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(245,177,64,0.24),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(20,184,166,0.18),transparent_30%),linear-gradient(135deg,#090d12,#101923_58%,#0b1217)]" />
        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={rwgLogo} alt="Reborn Wave Group" className="h-11 w-11 rounded-lg object-contain" />
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">Reborn Wave Group</div>
                <div className="text-xs text-white/50">Investor Portal</div>
              </div>
            </div>
            <Link href="/investor/login">
              <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300">Investor Login</Button>
            </Link>
          </header>

          <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-normal text-white md:text-7xl">
                Choose the project. Earn the project token.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/68">
                A separate investor system for Reborn Wave Group: BEP20 USDT wallet top-up, editable packages, project allocation units, referral rewards, live pool pricing, and club QR spending.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/investor/login">
                  <Button size="lg" className="bg-amber-400 text-slate-950 hover:bg-amber-300">
                    Start investor access <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/investor/dashboard">
                  <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                    Open dashboard
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/60">
                <Badge className="border-emerald-400/25 bg-emerald-400/10 text-emerald-200">USDT BEP20</Badge>
                <Badge className="border-amber-400/25 bg-amber-400/10 text-amber-200">Global token pool</Badge>
                <Badge className="border-cyan-400/25 bg-cyan-400/10 text-cyan-200">Admin-controlled withdrawals</Badge>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.06] p-6 shadow-2xl shadow-black/40">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div>
                    <div className="text-sm text-white/45">Live pool price</div>
                    <div className="mt-1 text-3xl font-black text-amber-300">
                      ${Number(data?.pool?.tokenPrice || 0).toFixed(4)}
                    </div>
                  </div>
                  <WalletCards className="h-11 w-11 text-cyan-300" />
                </div>
                <div className="grid gap-3 py-5">
                  {projects.map((project: any) => {
                    const Icon = projectIcons[project.code] || Building2;
                    return (
                      <div key={project.code} className="flex items-center gap-3 rounded-2xl bg-slate-950/54 p-4">
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-400/15 text-amber-300">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold">{project.name}</div>
                          <div className="line-clamp-1 text-xs text-white/45">{project.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-cyan-300 p-4 text-slate-950">
                  <div className="flex items-center gap-3">
                    <img src={doluruuBoy} alt="Doluruu" className="h-16 w-16 object-contain" />
                    <div>
                      <div className="font-black">Every $500 = 1 project unit</div>
                      <div className="text-sm text-slate-900/70">Buy packages from cash wallet, then assign units your way.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="pb-8 text-xs text-white/35">
            <ShieldCheck className="mr-2 inline h-4 w-4" />
            ROI and profit-pool terms require qualified legal and financial review before public launch.
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">Editable investor packages</h2>
            <p className="mt-2 text-white/55">Admin controls active packages. Investors choose and allocate units themselves.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {packages.map((pkg: any) => (
            <Card key={pkg.id} className="border-white/10 bg-white/[0.05] text-white">
              <CardContent className="p-5">
                <div className="text-sm text-white/45">{pkg.name}</div>
                <div className="mt-2 text-3xl font-black text-amber-300">${Number(pkg.amount_usdt).toLocaleString()}</div>
                <div className="mt-1 text-sm text-white/55">{Math.floor(Number(pkg.amount_usdt) / 500)} allocation units</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
