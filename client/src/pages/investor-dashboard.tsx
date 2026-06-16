import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Banknote, Gift, QrCode, RefreshCw, Send, Wallet, Zap } from "lucide-react";
import { InvestorLanguageToggle } from "@/components/InvestorLanguageToggle";
import { useTranslation } from "@/lib/i18n";
import { investorPackageName, investorProjectDescription, investorProjectName, investorT } from "@/lib/investor-copy";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const USDT_BEP20 = "0x55d398326f99059fF775485246999027B3197955";

function formatUsd(value: any) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function decimalToHex(decimal: string) {
  let digits = decimal.replace(/^0+/, "") || "0";
  if (digits === "0") return "0";
  let hex = "";
  while (digits !== "0") {
    let carry = 0;
    let next = "";
    for (const char of digits) {
      const value = carry * 10 + Number(char);
      const quotient = Math.floor(value / 16);
      carry = value % 16;
      if (next || quotient) next += String(quotient);
    }
    hex = carry.toString(16) + hex;
    digits = next || "0";
  }
  return hex;
}

function parseUnits18(amount: string) {
  const [whole, fraction = ""] = String(amount).split(".");
  return `${whole || "0"}${(fraction + "0".repeat(18)).slice(0, 18)}`.replace(/^0+/, "") || "0";
}

function encodeTransfer(to: string, amount: string) {
  const selector = "a9059cbb";
  const address = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const value = decimalToHex(parseUnits18(amount)).padStart(64, "0");
  return `0x${selector}${address}${value}`;
}

export default function InvestorDashboard() {
  const { toast } = useToast();
  const { language } = useTranslation();
  const t = (key: string) => investorT(language, key);
  const { data: publicData } = useQuery<any>({ queryKey: ["/api/investor/public"] });
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/investor/me"] });
  const packages = publicData?.packages || [];
  const projects = publicData?.projects || [];
  const wallet = data?.wallet;
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const selectedPackage = packages.find((pkg: any) => String(pkg.id) === selectedPackageId);
  const units = selectedPackage ? Math.floor(Number(selectedPackage.amount_usdt) / 500) : 0;
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [sell, setSell] = useState({ projectCode: "", tokens: "" });
  const [withdrawal, setWithdrawal] = useState({ amountUsdt: "", walletAddress: "" });
  const [manualTx, setManualTx] = useState("");

  const allocatedUnits = useMemo(() => Object.values(allocations).reduce((sum, value) => sum + Number(value || 0), 0), [allocations]);
  const adminWallet = publicData?.adminWallet?.address || "";

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/investor/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/investor/public"] });
  };

  const topupMutation = useMutation({
    mutationFn: async ({ txHash, amountUsdt, walletAddress }: any) => (await apiRequest("POST", "/api/investor/topups/confirm", { txHash, amountUsdt, walletAddress })).json(),
    onSuccess: () => {
      toast({ title: "Top-up credited", description: "Your cash wallet has been updated." });
      refresh();
    },
    onError: (error: any) => toast({ title: "Top-up failed", description: error.message, variant: "destructive" }),
  });

  const connectAndPay = async () => {
    if (!window.ethereum) {
      toast({ title: "Wallet not found", description: "Install MetaMask or another BEP20-compatible wallet.", variant: "destructive" });
      return;
    }
    if (!selectedPackage || !adminWallet) {
      toast({ title: "Select package", description: "Choose a package and make sure admin wallet is configured.", variant: "destructive" });
      return;
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const from = accounts?.[0];
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] }).catch(async (error: any) => {
      if (error?.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{ chainId: "0x38", chainName: "BNB Smart Chain", nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }, rpcUrls: ["https://bsc-dataseed.binance.org/"], blockExplorerUrls: ["https://bscscan.com"] }],
        });
      } else {
        throw error;
      }
    });
    await apiRequest("POST", "/api/investor/wallet/connect", { walletAddress: from });
    const amount = String(selectedPackage.amount_usdt);
    const txHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [{ from, to: USDT_BEP20, data: encodeTransfer(adminWallet, amount) }],
    });
    topupMutation.mutate({ txHash, amountUsdt: amount, walletAddress: from });
  };

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const payload = Object.entries(allocations).filter(([, unit]) => Number(unit) > 0).map(([projectCode, unit]) => ({ projectCode, units: Number(unit) }));
      return (await apiRequest("POST", "/api/investor/purchases", { packageId: Number(selectedPackageId), allocations: payload })).json();
    },
    onSuccess: () => {
      toast({ title: "Package purchased", description: "Referral rewards and pool allocation were processed." });
      setAllocations({});
      refresh();
    },
    onError: (error: any) => toast({ title: "Purchase failed", description: error.message, variant: "destructive" }),
  });

  const claimMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/investor/tokens/claim-daily", {})).json(),
    onSuccess: () => {
      toast({ title: "Daily tokens claimed" });
      refresh();
    },
    onError: (error: any) => toast({ title: "Claim failed", description: error.message, variant: "destructive" }),
  });

  const sellMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/investor/tokens/sell", sell)).json(),
    onSuccess: (result: any) => {
      toast({ title: "Tokens sold", description: `${formatUsd(result.payout)} added to cash wallet.` });
      setSell({ projectCode: "", tokens: "" });
      refresh();
    },
    onError: (error: any) => toast({ title: "Sell failed", description: error.message, variant: "destructive" }),
  });

  const withdrawalMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/investor/withdrawals", withdrawal)).json(),
    onSuccess: () => {
      toast({ title: "Withdrawal requested", description: "Admin will review and pay manually." });
      setWithdrawal({ amountUsdt: "", walletAddress: "" });
      refresh();
    },
    onError: (error: any) => toast({ title: "Withdrawal failed", description: error.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="grid min-h-screen place-items-center bg-[#090d12] text-white">{t("investor.loadingDashboard")}</div>;

  return (
    <main className="min-h-screen bg-[#090d12] text-white">
      <div className="mx-auto max-w-7xl px-5 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/investor" className="mb-2 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"><ArrowLeft className="h-4 w-4" /> {t("investor.home")}</Link>
            <h1 className="text-4xl font-black">{t("investor.dashboard")}</h1>
            <p className="mt-1 text-white/50">{t("investor.referralCode")}: <span className="font-mono text-amber-300">{data?.user?.referralCode}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <InvestorLanguageToggle />
            <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={refresh}>
              <RefreshCw className="mr-2 h-4 w-4" /> {t("investor.refresh")}
            </Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric title={t("investor.cashWallet")} value={formatUsd(wallet?.cash_balance)} icon={Wallet} />
          <Metric title={t("investor.spendingWallet")} value={formatUsd(wallet?.spending_balance)} icon={QrCode} />
          <Metric title={t("investor.globalPool")} value={formatUsd(data?.pool?.poolBalance)} icon={Banknote} />
          <Metric title={t("investor.tokenPrice")} value={`$${Number(data?.pool?.tokenPrice || 0).toFixed(4)}`} icon={Zap} />
        </div>

        <Tabs defaultValue="buy" className="mt-6">
          <TabsList className="bg-slate-950/80">
            <TabsTrigger value="buy">{t("investor.topupBuy")}</TabsTrigger>
            <TabsTrigger value="tokens">{t("investor.tokens")}</TabsTrigger>
            <TabsTrigger value="spend">{t("investor.qrSpend")}</TabsTrigger>
            <TabsTrigger value="history">{t("investor.history")}</TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <Panel title={t("investor.selectTopup")}>
              <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                <SelectTrigger className="border-white/10 bg-slate-950/70 text-white"><SelectValue placeholder={t("investor.choosePackage")} /></SelectTrigger>
                <SelectContent>
                  {packages.map((pkg: any) => <SelectItem key={pkg.id} value={String(pkg.id)}>{investorPackageName(language, pkg.name)} - {formatUsd(pkg.amount_usdt)}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedPackage && (
                <div className="mt-4 rounded-2xl bg-amber-400/10 p-4 text-sm text-amber-100">
                  {investorPackageName(language, selectedPackage.name)}: {units} {t("investor.packageUnitsNote")}
                </div>
              )}
              <Button className="mt-4 w-full bg-amber-400 text-slate-950 hover:bg-amber-300" disabled={!selectedPackage || topupMutation.isPending} onClick={connectAndPay}>
                <Send className="mr-2 h-4 w-4" /> {t("investor.connectPay")}
              </Button>
              <div className="mt-5 border-t border-white/10 pt-4">
                <Label>{t("investor.manualTx")}</Label>
                <div className="mt-2 flex gap-2">
                  <Input className="border-white/10 bg-slate-950/70 text-white" value={manualTx} onChange={(e) => setManualTx(e.target.value)} placeholder="0x transaction hash" />
                  <Button variant="outline" className="border-white/15 bg-white/5 text-white" disabled={!selectedPackage} onClick={() => topupMutation.mutate({ txHash: manualTx, amountUsdt: selectedPackage?.amount_usdt, walletAddress: wallet?.connected_wallet || "manual" })}>{t("investor.credit")}</Button>
                </div>
              </div>
            </Panel>

            <Panel title={t("investor.allocateBuy")}>
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-white/50">{t("investor.allocated")}</span>
                <span className={allocatedUnits === units ? "text-emerald-300" : "text-amber-300"}>{allocatedUnits} / {units}</span>
              </div>
              <div className="grid gap-3">
                {projects.map((project: any) => (
                  <div key={project.code} className="rounded-2xl bg-slate-950/54 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{investorProjectName(language, project.code, project.name)}</div>
                        <div className="text-xs text-white/42">{investorProjectDescription(language, project.code, project.description)}</div>
                      </div>
                      <Input type="number" min="0" className="w-24 border-white/10 bg-black/30 text-white" value={allocations[project.code] || ""} onChange={(e) => setAllocations({ ...allocations, [project.code]: Number(e.target.value) })} />
                    </div>
                  </div>
                ))}
              </div>
              <Button className="mt-4 w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200" disabled={!selectedPackage || allocatedUnits !== units || purchaseMutation.isPending} onClick={() => purchaseMutation.mutate()}>
                {t("investor.buyCash")}
              </Button>
            </Panel>
          </TabsContent>

          <TabsContent value="tokens" className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel title={t("investor.projectBalances")}>
              <Button className="mb-4 bg-amber-400 text-slate-950 hover:bg-amber-300" disabled={data?.dailyClaimed || claimMutation.isPending} onClick={() => claimMutation.mutate()}>
                <Gift className="mr-2 h-4 w-4" /> {data?.dailyClaimed ? t("investor.claimedToday") : t("investor.claimDaily")}
              </Button>
              <div className="space-y-3">
                {(data?.balances || []).map((balance: any) => (
                  <div key={balance.id} className="flex items-center justify-between rounded-2xl bg-slate-950/54 p-4">
                    <div>
                      <div className="font-semibold">{investorProjectName(language, balance.project_code, balance.project_code.replace(/_/g, " "))}</div>
                      <div className="text-xs text-white/45">{t("investor.sold")}: {Number(balance.sold_tokens).toFixed(2)}</div>
                    </div>
                    <div className="text-right text-xl font-black text-cyan-300">{Number(balance.active_tokens).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title={t("investor.sellTokensPanel")}>
              <Label>{t("investor.project")}</Label>
              <Select value={sell.projectCode} onValueChange={(projectCode) => setSell({ ...sell, projectCode })}>
                <SelectTrigger className="mt-2 border-white/10 bg-slate-950/70 text-white"><SelectValue placeholder={t("investor.chooseProjectToken")} /></SelectTrigger>
                <SelectContent>
                  {(data?.balances || []).map((balance: any) => <SelectItem key={balance.project_code} value={balance.project_code}>{investorProjectName(language, balance.project_code, balance.project_code.replace(/_/g, " "))} ({Number(balance.active_tokens).toFixed(2)})</SelectItem>)}
                </SelectContent>
              </Select>
              <Label className="mt-4 block">{t("investor.tokensToSell")}</Label>
              <Input className="mt-2 border-white/10 bg-slate-950/70 text-white" value={sell.tokens} onChange={(e) => setSell({ ...sell, tokens: e.target.value })} />
              <div className="mt-3 text-sm text-white/50">{t("investor.currentPrice")}: ${Number(data?.pool?.tokenPrice || 0).toFixed(4)} {t("investor.perToken")}</div>
              <Button className="mt-4 w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200" onClick={() => sellMutation.mutate()} disabled={sellMutation.isPending}>{t("investor.sellTokens")}</Button>
            </Panel>
          </TabsContent>

          <TabsContent value="spend" className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel title={t("investor.showQr")}>
              <div className="mx-auto grid aspect-square max-w-xs place-items-center rounded-3xl bg-white p-5 text-center text-slate-950">
                <QrCode className="h-28 w-28" />
                <div className="mt-4 break-all font-mono text-sm">{wallet?.qr_code}</div>
              </div>
              <p className="mt-4 text-sm text-white/48">{t("investor.qrNote")}</p>
            </Panel>
            <Panel title={t("investor.withdrawal")}>
              <Label>{t("investor.amount")}</Label>
              <Input className="mt-2 border-white/10 bg-slate-950/70 text-white" value={withdrawal.amountUsdt} onChange={(e) => setWithdrawal({ ...withdrawal, amountUsdt: e.target.value })} />
              <Label className="mt-4 block">{t("investor.payoutWallet")}</Label>
              <Input className="mt-2 border-white/10 bg-slate-950/70 text-white" value={withdrawal.walletAddress} onChange={(e) => setWithdrawal({ ...withdrawal, walletAddress: e.target.value })} />
              <Button className="mt-4 w-full bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={() => withdrawalMutation.mutate()} disabled={withdrawalMutation.isPending}>{t("investor.requestWithdrawal")}</Button>
            </Panel>
          </TabsContent>

          <TabsContent value="history" className="mt-5 grid gap-5 lg:grid-cols-2">
            <HistoryList title={t("investor.purchases")} items={data?.purchases || []} primary="package_name" amount="amount_usdt" emptyText={t("investor.noRecords")} />
            <HistoryList title={t("investor.referralRewards")} items={data?.referralRewards || []} primary="wallet_type" amount="amount_usdt" emptyText={t("investor.noRecords")} />
            <HistoryList title={t("investor.topups")} items={data?.topups || []} primary="tx_hash" amount="amount_usdt" emptyText={t("investor.noRecords")} />
            <HistoryList title={t("investor.withdrawals")} items={data?.withdrawals || []} primary="status" amount="amount_usdt" emptyText={t("investor.noRecords")} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function Metric({ title, value, icon: Icon }: any) {
  return (
    <Card className="border-white/10 bg-white/[0.055] text-white">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm text-white/45">{title}</div>
          <div className="mt-2 text-2xl font-black">{value}</div>
        </div>
        <Icon className="h-8 w-8 text-amber-300" />
      </CardContent>
    </Card>
  );
}

function Panel({ title, children }: any) {
  return (
    <Card className="border-white/10 bg-white/[0.055] text-white">
      <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function HistoryList({ title, items, primary, amount, emptyText = "No records yet." }: any) {
  return (
    <Panel title={title}>
      <div className="space-y-2">
        {items.length === 0 ? <div className="text-sm text-white/40">{emptyText}</div> : items.slice(0, 8).map((item: any) => (
          <div key={`${title}-${item.id}`} className="flex items-center justify-between rounded-xl bg-slate-950/54 p-3 text-sm">
            <span className="max-w-[70%] truncate text-white/70">{item[primary]}</span>
            <Badge className="bg-amber-400/15 text-amber-200">{formatUsd(item[amount])}</Badge>
          </div>
        ))}
      </div>
    </Panel>
  );
}
