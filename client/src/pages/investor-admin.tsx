import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function usd(value: any) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InvestorAdmin() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/investor/admin/overview"] });
  const [walletAddress, setWalletAddress] = useState("");
  const [pkg, setPkg] = useState({ name: "", amountUsdt: "", description: "", isActive: true });
  const [qr, setQr] = useState({ qrCode: "", amountUsdt: "", description: "" });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/investor/admin/overview"] });

  const walletMutation = useMutation({
    mutationFn: async () => (await apiRequest("PATCH", "/api/investor/admin/settings/wallet", { address: walletAddress })).json(),
    onSuccess: () => { toast({ title: "Admin wallet saved" }); refresh(); },
  });

  const packageMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/investor/admin/packages", pkg)).json(),
    onSuccess: () => { toast({ title: "Package created" }); setPkg({ name: "", amountUsdt: "", description: "", isActive: true }); refresh(); },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, updates }: any) => (await apiRequest("PATCH", `/api/investor/admin/packages/${id}`, updates)).json(),
    onSuccess: refresh,
  });

  const qrMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/investor/qr-payments", qr)).json(),
    onSuccess: () => { toast({ title: "Spending wallet charged" }); setQr({ qrCode: "", amountUsdt: "", description: "" }); refresh(); },
    onError: (error: any) => toast({ title: "QR payment failed", description: error.message, variant: "destructive" }),
  });

  const withdrawalMutation = useMutation({
    mutationFn: async ({ id, status }: any) => (await apiRequest("PATCH", `/api/investor/admin/withdrawals/${id}`, { status })).json(),
    onSuccess: refresh,
  });

  if (isLoading) return <div className="grid min-h-screen place-items-center bg-[#090d12] text-white">Loading investor admin...</div>;

  return (
    <main className="min-h-screen bg-[#090d12] text-white">
      <div className="mx-auto max-w-7xl px-5 py-6">
        <header className="mb-6">
          <h1 className="text-4xl font-black">Investor Admin</h1>
          <p className="mt-1 text-white/50">Manage packages, BEP20 wallet, spending QR payments, withdrawals, and pool history.</p>
        </header>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Metric title="Global pool" value={usd(data?.pool?.poolBalance)} />
          <Metric title="Active tokens" value={Number(data?.pool?.activeTokens || 0).toFixed(2)} />
          <Metric title="Token price" value={`$${Number(data?.pool?.tokenPrice || 0).toFixed(4)}`} />
        </div>

        <Tabs defaultValue="packages">
          <TabsList className="bg-slate-950/80">
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="qr">QR Spend</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="pool">Pool</TabsTrigger>
          </TabsList>

          <TabsContent value="packages" className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <Panel title="Create package">
              <Label>Name</Label>
              <Input className="mt-2 border-white/10 bg-slate-950/70 text-white" value={pkg.name} onChange={(e) => setPkg({ ...pkg, name: e.target.value })} />
              <Label className="mt-4 block">Amount USDT</Label>
              <Input className="mt-2 border-white/10 bg-slate-950/70 text-white" value={pkg.amountUsdt} onChange={(e) => setPkg({ ...pkg, amountUsdt: e.target.value })} />
              <Label className="mt-4 block">Description</Label>
              <Input className="mt-2 border-white/10 bg-slate-950/70 text-white" value={pkg.description} onChange={(e) => setPkg({ ...pkg, description: e.target.value })} />
              <div className="mt-4 flex items-center gap-3"><Switch checked={pkg.isActive} onCheckedChange={(isActive) => setPkg({ ...pkg, isActive })} /> Active</div>
              <Button className="mt-4 w-full bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={() => packageMutation.mutate()}>Create package</Button>
            </Panel>
            <Panel title="Editable packages">
              <div className="space-y-3">
                {(data?.packages || []).map((item: any) => (
                  <div key={item.id} className="grid gap-3 rounded-2xl bg-slate-950/54 p-4 md:grid-cols-[1fr_130px_90px]">
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-xs text-white/45">{item.description}</div>
                    </div>
                    <div className="font-black text-amber-300">{usd(item.amount_usdt)}</div>
                    <Button size="sm" variant="outline" className="border-white/15 bg-white/5 text-white" onClick={() => updatePackageMutation.mutate({ id: item.id, updates: { isActive: !item.is_active } })}>
                      {item.is_active ? "Disable" : "Enable"}
                    </Button>
                  </div>
                ))}
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="wallet" className="mt-5">
            <Panel title="BEP20 admin wallet">
              <div className="text-sm text-white/45">Current: {data?.adminWallet?.address || "Not set"}</div>
              <Input className="mt-3 border-white/10 bg-slate-950/70 text-white" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="0x..." />
              <Button className="mt-4 bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={() => walletMutation.mutate()}>Save wallet</Button>
            </Panel>
          </TabsContent>

          <TabsContent value="qr" className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel title="Merchant scan charge">
              <Label>Investor QR code</Label>
              <Input className="mt-2 border-white/10 bg-slate-950/70 text-white" value={qr.qrCode} onChange={(e) => setQr({ ...qr, qrCode: e.target.value })} />
              <Label className="mt-4 block">Amount</Label>
              <Input className="mt-2 border-white/10 bg-slate-950/70 text-white" value={qr.amountUsdt} onChange={(e) => setQr({ ...qr, amountUsdt: e.target.value })} />
              <Label className="mt-4 block">Description</Label>
              <Input className="mt-2 border-white/10 bg-slate-950/70 text-white" value={qr.description} onChange={(e) => setQr({ ...qr, description: e.target.value })} />
              <Button className="mt-4 bg-cyan-300 text-slate-950 hover:bg-cyan-200" onClick={() => qrMutation.mutate()}>Charge spending wallet</Button>
            </Panel>
            <Panel title="Recent QR payments">
              <RecordList items={data?.qrPayments || []} primary="description" amount="amount_usdt" />
            </Panel>
          </TabsContent>

          <TabsContent value="withdrawals" className="mt-5">
            <Panel title="Cash wallet withdrawals">
              <div className="space-y-3">
                {(data?.withdrawals || []).map((item: any) => (
                  <div key={item.id} className="grid gap-3 rounded-2xl bg-slate-950/54 p-4 md:grid-cols-[1fr_120px_110px_190px]">
                    <div className="truncate">
                      <div className="font-mono text-xs text-white/50">{item.wallet_address}</div>
                      <div className="mt-1 text-xs text-white/35">{item.user_id}</div>
                    </div>
                    <div className="font-black text-amber-300">{usd(item.amount_usdt)}</div>
                    <Badge className="w-fit bg-white/10 text-white">{item.status}</Badge>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-emerald-500 text-white" onClick={() => withdrawalMutation.mutate({ id: item.id, status: "approved" })}>Approve</Button>
                      <Button size="sm" variant="outline" className="border-white/15 bg-white/5 text-white" onClick={() => withdrawalMutation.mutate({ id: item.id, status: "rejected" })}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="pool" className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel title="Pool events"><RecordList items={data?.poolEvents || []} primary="description" amount="amount_usdt" /></Panel>
            <Panel title="Top-ups"><RecordList items={data?.topups || []} primary="tx_hash" amount="amount_usdt" /></Panel>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function Metric({ title, value }: any) {
  return <Card className="border-white/10 bg-white/[0.055] text-white"><CardContent className="p-5"><div className="text-sm text-white/45">{title}</div><div className="mt-2 text-2xl font-black">{value}</div></CardContent></Card>;
}

function Panel({ title, children }: any) {
  return <Card className="border-white/10 bg-white/[0.055] text-white"><CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>;
}

function RecordList({ items, primary, amount }: any) {
  return <div className="space-y-2">{items.length === 0 ? <div className="text-sm text-white/40">No records.</div> : items.slice(0, 12).map((item: any) => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-950/54 p-3 text-sm"><span className="max-w-[70%] truncate text-white/70">{item[primary]}</span><span className="font-semibold text-amber-300">{usd(item[amount])}</span></div>)}</div>;
}
