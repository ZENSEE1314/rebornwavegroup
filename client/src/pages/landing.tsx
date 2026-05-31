import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  Crown,
  Gift,
  HeartHandshake,
  Landmark,
  Music2,
  PawPrint,
  Scissors,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  WalletCards,
} from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation, type Language } from "@/lib/i18n";
import rwgLogo from "@assets/rwg-logo.png";
import doluruuBoy from "@assets/Doluruu Boy_1749664545355.png";
import doluruuBaby from "@assets/Doluruu Baby_1749663725243.png";
import doluruuFemale from "@assets/doluruu-female.jpeg";
import doluruuBlindboxBox from "@assets/doluruu-blindbox-box.jpeg";

type Floor = {
  level: string;
  icon: typeof Music2;
  tone: string;
};

const floorMeta: Floor[] = [
  {
    level: "1F",
    icon: Trophy,
    tone: "#22d3ee",
  },
  {
    level: "2F",
    icon: Scissors,
    tone: "#f472b6",
  },
  {
    level: "3F",
    icon: Crown,
    tone: "#facc15",
  },
  {
    level: "4F",
    icon: PawPrint,
    tone: "#34d399",
  },
  {
    level: "5F",
    icon: Music2,
    tone: "#a78bfa",
  },
];

const stepIcons = [WalletCards, BadgeDollarSign, Landmark, Users];
const audienceIcons = [Sparkles, HeartHandshake, Building2];

const landingCopy: Record<Language, any> = {
  en: {
    nav: ["Ecosystem", "Investors", "Blindbox", "Join"],
    login: "Log In",
    investorPackage: "Investor Package",
    heroTitle: "Reborn Wave Group",
    heroAccent: "Club Economy",
    heroText:
      "A 5-story, 3-unit waterfront club built to bring in customers, investors, sales partners, and workers through one connected ecosystem: KTV, kids game house, beauty salons, pet cafe, live band, dance floor, sea view, membership credits, and blindbox pet rewards.",
    explore: "Explore Ecosystem",
    seeBlindbox: "See Blindbox Rewards",
    proof: [
      ["5 floors", "Each floor has a different reason for people to visit and spend."],
      ["$200K cap", "Total investor allocation is capped for this package plan."],
      ["Live members", "Live member interest counter for waitlist and launch campaigns."],
    ],
    floorsTitle: "Five floors that feed one another.",
    floorsIntro:
      "The club is designed like a loop: daytime families, beauty customers, private KTV groups, pet lovers, nightlife guests, and investor-hosted visitors all create traffic for each other.",
    floors: [
      ["KTV Lounge + Game House", "2 units KTV lounges, 1 unit kids game house", "Open singing, competitions, family play, and daily customer traffic from morning to night."],
      ["Private KTV + Beauty Salon", "2 units with 4 private KTV rooms, 1 unit beauty salon", "Private celebrations, customer hosting, beauty services, and repeat booking packages."],
      ["VIP KTV + Beauty Salon", "2 units with 2 VIP private rooms, 1 unit beauty salon", "Premium rooms for investor guests, birthday events, business hosting, and higher spend per visit."],
      ["Pet Cafe", "All 3 units connected as a pet cafe", "Food, drinks, pet-themed community, blindbox tie-ins, and content-friendly social traffic."],
      ["Sea-View Live House", "Live band, dance floor, and rooftop sea view", "Nightlife anchor with live music, special events, dance floor energy, and premium table sales."],
    ],
    investorTitle: "Investor package made simple.",
    investorIntro:
      "The message is direct: invest $5,000, receive $5,000 club credits, target $10,000 ROI over 2 years, and earn referral bonuses that reduce the remaining ROI balance.",
    packageFlow: "$5,000 package flow",
    packageText:
      "Investor credits can be used to bring friends, customers, and potential business partners into the club. Monthly payouts come from business performance and new investor package allocation.",
    steps: [
      ["Invest $5,000", "Investor receives $5,000 club spending credits for friends, customers, and private hosting."],
      ["$10,000 ROI Target", "Target return is paid across 24 months based on the official contract and payout rules."],
      ["20% Profit Pool", "Each month, 20% of business profit is allocated and divided among active investors."],
      ["10% New Investor Pool", "10% of every new $5,000 investor package is shared with earlier active investors."],
    ],
    capProgress: "Investment cap progress",
    calcTitle: "Referral deduction simulator",
    friends: "friends",
    referralPaid: "Referral bonus paid",
    roiBalance: "ROI balance target",
    calcText:
      "Each friend who invests $5,000 pays the inviter $1,000. That $1,000 is deducted from the inviter's remaining ROI target. After 10 successful investor invites, the $10,000 ROI target is fully cleared and the contract finishes unless the investor joins again.",
    calcComplete: "Contract completed by referral bonuses.",
    audienceTitle: "One ecosystem for sales, customers, and workers.",
    audienceIntro:
      "The club needs more than investors. It needs customers who return, promoters who bring people, and workers who can grow inside the business.",
    audience: [
      ["Customers", "Spend credits across KTV, beauty, pet cafe, game house, events, and live house nights."],
      ["Investors", "Enter with a clear $5,000 package, referral upside, capped allocation, and transparent monthly pool logic."],
      ["Workers", "A multi-floor club creates roles for hosts, singers, stylists, pet cafe crew, event staff, and promoters."],
    ],
    blindboxTitle: "Blindbox pets turn members into daily users.",
    blindboxIntro:
      "The blindbox is not just a doll. It is a digital pet companion that members feed daily to earn tokens, exchange prizes, and come back to the Reborn Wave ecosystem.",
    pets: [["Male pet", "1 token daily"], ["Female pet", "1 token daily"], ["Baby pet", "1 token daily"], ["Blindbox package", "Investor gift box"]],
    rules: [
      ["Investor bonus", "Every investor receives 1 blindbox free as part of the $5,000 package."],
      ["Male + female = baby", "If a user owns both male and female pets, they receive 1 baby pet free."],
      ["3 pets = 3 daily tokens", "Feeding male, female, and baby pets gives 3 tokens per day for prize exchange."],
      ["Tokens drive repeat visits", "Tokens can be used for rewards, upgrades, prizes, and club spending campaigns."],
    ],
    disclaimer:
      "This homepage draft explains the package in customer-friendly language. ROI references are targets, not guaranteed returns. Actual investor contracts, payout rules, profit calculation, referral deductions, compliance requirements, and risk disclosures should be reviewed by a qualified legal and financial professional before launch.",
    footerLeft: "Reborn Wave Group - Waterfront Lifestyle Club, Batam",
    footerRight: "KTV - Game House - Beauty - Pet Cafe - Live House - Blindbox Rewards",
  },
  zh: {
    nav: ["生态", "投资者", "盲盒", "加入"],
    login: "登录",
    investorPackage: "投资配套",
    heroTitle: "Reborn Wave Group",
    heroAccent: "俱乐部经济",
    heroText:
      "一个位于海边的五层、三单位综合俱乐部，把顾客、投资者、销售伙伴和员工连接在同一个生态里：KTV、儿童游戏屋、美容院、宠物咖啡厅、现场乐队、舞池、海景、会员积分和盲盒宠物奖励。",
    explore: "探索生态",
    seeBlindbox: "查看盲盒奖励",
    proof: [
      ["5 层空间", "每一层都有不同的到店理由和消费场景。"],
      ["20 万美元上限", "本投资配套的总投资额度设有上限。"],
      ["实时会员", "用于等候名单和上线活动的会员兴趣计数。"],
    ],
    floorsTitle: "五层空间互相带动客流。",
    floorsIntro:
      "俱乐部被设计成一个循环：白天家庭客、美容客、私人 KTV 聚会、宠物爱好者、夜生活客人和投资者带来的客人互相带动消费。",
    floors: [
      ["KTV 大厅 + 游戏屋", "2 个单位为 KTV 大厅，1 个单位为儿童游戏屋", "开放式唱歌、歌唱比赛、家庭娱乐和全天候客流。"],
      ["私人 KTV + 美容院", "2 个单位设有 4 间私人 KTV，1 个单位为美容院", "私人庆祝、客户招待、美容服务和重复预约配套。"],
      ["VIP KTV + 美容院", "2 个单位设有 2 间 VIP 私人房，1 个单位为美容院", "适合投资者招待、生日活动、商务聚会和更高消费。"],
      ["宠物咖啡厅", "第 4 层三个单位全部打通为宠物咖啡厅", "餐饮、宠物主题社群、盲盒联动和适合社交媒体传播的客流。"],
      ["海景 Live House", "现场乐队、舞池和屋顶海景", "夜生活核心，包含现场音乐、特别活动、舞池氛围和高端桌位销售。"],
    ],
    investorTitle: "投资配套简单清楚。",
    investorIntro:
      "投资 5,000 美元，获得 5,000 美元俱乐部消费额度，目标 2 年内回报 10,000 美元，并通过推荐奖金扣减剩余回报目标。",
    packageFlow: "5,000 美元配套流程",
    packageText:
      "投资者可用消费额度带朋友、客户和潜在合作伙伴到店体验。每月派发来自业务利润表现和新投资者配套分配。",
    steps: [
      ["投资 $5,000", "投资者获得 $5,000 俱乐部消费额度，可用于朋友、客户和私人招待。"],
      ["$10,000 回报目标", "目标回报根据正式合同和派发规则，在 24 个月内支付。"],
      ["20% 利润池", "每月将业务利润的 20% 分配到活跃投资者池。"],
      ["10% 新投资者池", "每位新投资者的 $5,000 配套中，10% 分享给较早加入的活跃投资者。"],
    ],
    capProgress: "投资上限进度",
    calcTitle: "推荐扣减模拟器",
    friends: "位朋友",
    referralPaid: "已支付推荐奖金",
    roiBalance: "剩余回报目标",
    calcText:
      "每成功介绍一位朋友投资 $5,000，介绍人获得 $1,000。该 $1,000 会从介绍人的剩余回报目标中扣减。成功介绍 10 位投资者后，$10,000 回报目标完成，合约结束，除非再次投资。",
    calcComplete: "合约已通过推荐奖金完成。",
    audienceTitle: "同一个生态吸引销售、顾客和员工。",
    audienceIntro:
      "俱乐部不只需要投资者，也需要会回来的顾客、能带人的推广伙伴，以及能在业务里成长的员工。",
    audience: [
      ["顾客", "可在 KTV、美容、宠物咖啡厅、游戏屋、活动和 Live House 消费额度。"],
      ["投资者", "清楚的 $5,000 配套、推荐收益、投资上限和透明月度分配逻辑。"],
      ["员工", "多层俱乐部创造主持、歌手、美容师、宠物咖啡厅员工、活动人员和推广员岗位。"],
    ],
    blindboxTitle: "盲盒宠物让会员每天回来。",
    blindboxIntro:
      "盲盒不只是公仔，也是数字宠物伙伴。会员每天喂养可获得代币，用来兑换奖品，并持续回到 Reborn Wave 生态。",
    pets: [["公宠物", "每天 1 个代币"], ["母宠物", "每天 1 个代币"], ["宝宝宠物", "每天 1 个代币"], ["盲盒包装", "投资者礼盒"]],
    rules: [
      ["投资者奖励", "每位投资者在 $5,000 配套中免费获得 1 个盲盒。"],
      ["公 + 母 = 宝宝", "用户同时拥有公宠物和母宠物时，可免费获得 1 个宝宝宠物。"],
      ["3 只宠物 = 每天 3 个代币", "喂养公、母、宝宝三只宠物，每天可获得 3 个代币兑换奖品。"],
      ["代币带动复访", "代币可用于奖励、升级、奖品和俱乐部消费活动。"],
    ],
    disclaimer:
      "此首页草稿以顾客容易理解的方式说明配套。ROI 为目标说明，并非保证收益。正式投资合约、派发规则、利润计算、推荐扣减、合规要求和风险披露，应在上线前交由合资格法律和财务专业人士审核。",
    footerLeft: "Reborn Wave Group - 巴淡海边生活娱乐俱乐部",
    footerRight: "KTV - 游戏屋 - 美容 - 宠物咖啡厅 - Live House - 盲盒奖励",
  },
  id: {
    nav: ["Ekosistem", "Investor", "Blindbox", "Gabung"],
    login: "Masuk",
    investorPackage: "Paket Investor",
    heroTitle: "Reborn Wave Group",
    heroAccent: "Ekonomi Klub",
    heroText:
      "Klub waterfront 5 lantai dengan 3 unit bangunan yang menghubungkan pelanggan, investor, partner sales, dan pekerja dalam satu ekosistem: KTV, game house anak, salon kecantikan, pet cafe, live band, dance floor, sea view, kredit membership, dan hadiah blindbox pet.",
    explore: "Jelajahi Ekosistem",
    seeBlindbox: "Lihat Hadiah Blindbox",
    proof: [
      ["5 lantai", "Setiap lantai punya alasan berbeda untuk orang datang dan belanja."],
      ["Batas $200K", "Total alokasi investor dibatasi untuk paket ini."],
      ["Member live", "Counter minat member untuk waitlist dan campaign launching."],
    ],
    floorsTitle: "Lima lantai yang saling membawa traffic.",
    floorsIntro:
      "Klub dirancang seperti loop: keluarga siang hari, pelanggan salon, grup KTV privat, pecinta pet cafe, tamu nightlife, dan tamu investor saling membantu menciptakan traffic.",
    floors: [
      ["KTV Lounge + Game House", "2 unit KTV lounge, 1 unit kids game house", "Nyanyi terbuka, kompetisi menyanyi, hiburan keluarga, dan traffic pelanggan dari pagi sampai malam."],
      ["Private KTV + Beauty Salon", "2 unit dengan 4 ruang private KTV, 1 unit salon kecantikan", "Perayaan privat, entertainment pelanggan, layanan kecantikan, dan paket booking berulang."],
      ["VIP KTV + Beauty Salon", "2 unit dengan 2 ruang VIP private, 1 unit salon kecantikan", "Ruangan premium untuk tamu investor, ulang tahun, business hosting, dan spending lebih tinggi."],
      ["Pet Cafe", "Semua 3 unit lantai 4 menjadi pet cafe", "Makanan, minuman, komunitas pet, koneksi blindbox, dan konten yang mudah dibagikan."],
      ["Sea-View Live House", "Live band, dance floor, dan rooftop sea view", "Anchor nightlife dengan live music, event spesial, dance floor, dan penjualan meja premium."],
    ],
    investorTitle: "Paket investor dibuat mudah dipahami.",
    investorIntro:
      "Invest $5,000, dapat $5,000 kredit klub, target ROI $10,000 dalam 2 tahun, dan bonus referral yang mengurangi sisa target ROI.",
    packageFlow: "Alur paket $5,000",
    packageText:
      "Kredit investor bisa digunakan untuk membawa teman, pelanggan, dan calon partner bisnis ke klub. Payout bulanan berasal dari performa bisnis dan alokasi paket investor baru.",
    steps: [
      ["Invest $5,000", "Investor menerima $5,000 kredit belanja klub untuk teman, pelanggan, dan private hosting."],
      ["Target ROI $10,000", "Target return dibayarkan selama 24 bulan berdasarkan kontrak resmi dan aturan payout."],
      ["20% Profit Pool", "Setiap bulan, 20% profit bisnis dialokasikan dan dibagi kepada investor aktif."],
      ["10% New Investor Pool", "10% dari setiap paket investor baru $5,000 dibagikan kepada investor aktif yang lebih awal bergabung."],
    ],
    capProgress: "Progress batas investasi",
    calcTitle: "Simulator potongan referral",
    friends: "teman",
    referralPaid: "Bonus referral dibayar",
    roiBalance: "Sisa target ROI",
    calcText:
      "Setiap teman yang invest $5,000 memberi bonus $1,000 kepada pengundang. Bonus $1,000 itu dipotong dari sisa target ROI pengundang. Setelah 10 teman berhasil invest, target ROI $10,000 selesai dan kontrak berakhir kecuali investor masuk lagi.",
    calcComplete: "Kontrak selesai melalui bonus referral.",
    audienceTitle: "Satu ekosistem untuk sales, pelanggan, dan pekerja.",
    audienceIntro:
      "Klub membutuhkan lebih dari investor. Klub butuh pelanggan yang kembali, promoter yang membawa orang, dan pekerja yang bisa tumbuh di dalam bisnis.",
    audience: [
      ["Pelanggan", "Gunakan kredit di KTV, beauty, pet cafe, game house, event, dan live house night."],
      ["Investor", "Masuk dengan paket $5,000 yang jelas, upside referral, alokasi terbatas, dan logika pool bulanan yang transparan."],
      ["Pekerja", "Klub multi-lantai membuka peran untuk host, singer, stylist, crew pet cafe, staff event, dan promoter."],
    ],
    blindboxTitle: "Blindbox pet membuat member aktif setiap hari.",
    blindboxIntro:
      "Blindbox bukan hanya boneka. Ini adalah digital pet companion yang bisa diberi makan setiap hari untuk mendapatkan token, menukar hadiah, dan kembali ke ekosistem Reborn Wave.",
    pets: [["Male pet", "1 token per hari"], ["Female pet", "1 token per hari"], ["Baby pet", "1 token per hari"], ["Box blindbox", "Gift box investor"]],
    rules: [
      ["Bonus investor", "Setiap investor mendapat 1 blindbox gratis sebagai bagian dari paket $5,000."],
      ["Male + female = baby", "Jika user memiliki pet male dan female, user mendapat 1 baby pet gratis."],
      ["3 pet = 3 token harian", "Memberi makan male, female, dan baby pet memberi 3 token per hari untuk tukar hadiah."],
      ["Token mendorong repeat visit", "Token dapat digunakan untuk reward, upgrade, hadiah, dan campaign spending klub."],
    ],
    disclaimer:
      "Draft homepage ini menjelaskan paket dengan bahasa yang mudah dipahami pelanggan. ROI adalah target, bukan jaminan return. Kontrak investor, aturan payout, perhitungan profit, potongan referral, compliance, dan disclosure risiko harus ditinjau oleh profesional hukum dan keuangan sebelum launching.",
    footerLeft: "Reborn Wave Group - Waterfront Lifestyle Club, Batam",
    footerRight: "KTV - Game House - Beauty - Pet Cafe - Live House - Blindbox Rewards",
  },
};

function useLiveNumber(base: number, maxLift: number) {
  const [value, setValue] = useState(base);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setValue(base + Math.floor(Math.random() * maxLift));
    }, 4000);
    return () => window.clearInterval(timer);
  }, [base, maxLift]);

  return value;
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function InvestorCalculator({ copy }: { copy: (typeof landingCopy)["en"] }) {
  const [invites, setInvites] = useState(3);
  const referralBonus = invites * 1000;
  const roiLeft = Math.max(10000 - referralBonus, 0);
  const complete = invites >= 10;

  return (
    <div className="rwg-eco-calculator">
      <div className="rwg-eco-panel-head">
        <span>{copy.calcTitle}</span>
        <strong>
          {invites} {copy.friends}
        </strong>
      </div>
      <input
        aria-label="Friends invited"
        className="rwg-eco-range"
        max={10}
        min={0}
        onChange={(event) => setInvites(Number(event.target.value))}
        type="range"
        value={invites}
      />
      <div className="rwg-eco-calc-grid">
        <div>
          <small>{copy.referralPaid}</small>
          <strong>${referralBonus.toLocaleString()}</strong>
        </div>
        <div>
          <small>{copy.roiBalance}</small>
          <strong>${roiLeft.toLocaleString()}</strong>
        </div>
      </div>
      <p>{copy.calcText}</p>
      {complete && <div className="rwg-eco-complete">{copy.calcComplete}</div>}
    </div>
  );
}

function BuildingStack({ floors }: { floors: Array<Floor & { title: string; units: string; detail: string }> }) {
  return (
    <div className="rwg-eco-stage" aria-label="Animated 3D five floor club model">
      <div className="rwg-eco-orbit orbit-one" />
      <div className="rwg-eco-orbit orbit-two" />
      <div className="rwg-eco-building">
        {floors
          .slice()
          .reverse()
          .map((floor, index) => (
            <div
              className="rwg-eco-floor"
              key={floor.level}
              style={
                {
                  "--floor-tone": floor.tone,
                  "--floor-index": index,
                } as React.CSSProperties
              }
            >
              <span>{floor.level}</span>
              <strong>{floor.title}</strong>
              <small>{floor.units}</small>
            </div>
          ))}
      </div>
      <img className="rwg-eco-pet rwg-eco-pet-boy" src={doluruuBoy} alt="Male blindbox pet" />
      <img className="rwg-eco-pet rwg-eco-pet-baby" src={doluruuBaby} alt="Baby blindbox pet" />
      <img className="rwg-eco-box" src={doluruuBlindboxBox} alt="Doluruu blindbox packaging" />
    </div>
  );
}

function Landing() {
  const { language } = useTranslation();
  const copy = landingCopy[language] || landingCopy.en;
  const members = useLiveNumber(2341, 28);
  const raised = 65000;
  const cap = 200000;
  const capPct = useMemo(() => Math.round((raised / cap) * 100), [raised]);
  const floors = useMemo(
    () =>
      floorMeta.map((floor, index) => ({
        ...floor,
        title: copy.floors[index][0],
        units: copy.floors[index][1],
        detail: copy.floors[index][2],
      })),
    [copy],
  );
  const investorSteps = useMemo(
    () =>
      copy.steps.map((step: string[], index: number) => ({
        title: step[0],
        detail: step[1],
        icon: stepIcons[index],
      })),
    [copy],
  );
  const audienceCards = useMemo(
    () =>
      copy.audience.map((card: string[], index: number) => ({
        title: card[0],
        text: card[1],
        icon: audienceIcons[index],
      })),
    [copy],
  );

  const handleLogin = () => {
    window.location.href = "/login";
  };

  return (
    <main className="rwg-eco-page">
      <style>{`
        .rwg-eco-page{min-height:100vh;width:100%;max-width:100vw;background:#03151a;color:#f8fafc;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden;position:relative}
        .rwg-eco-page *{box-sizing:border-box}
        .rwg-eco-page:before{content:"";position:fixed;inset:0;background:radial-gradient(circle at 15% 15%,rgba(34,211,238,.18),transparent 28%),radial-gradient(circle at 78% 5%,rgba(250,204,21,.13),transparent 26%),linear-gradient(135deg,#03151a 0%,#05252a 48%,#080f1f 100%);pointer-events:none;z-index:0}
        .rwg-eco-page:after{content:"";position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:56px 56px;mask-image:linear-gradient(to bottom,rgba(0,0,0,.75),transparent 80%);pointer-events:none;z-index:0}
        .rwg-eco-page>*{position:relative;z-index:1}
        .rwg-eco-nav{position:sticky;top:0;z-index:40;background:rgba(3,21,26,.78);backdrop-filter:blur(22px);border-bottom:1px solid rgba(255,255,255,.09)}
        .rwg-eco-nav-inner{max-width:1180px;margin:0 auto;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .rwg-eco-brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:.02em}
        .rwg-eco-brand img{width:38px;height:38px;object-fit:contain;border-radius:11px;background:rgba(255,255,255,.06)}
        .rwg-eco-links{display:flex;align-items:center;gap:8px}
        .rwg-eco-links button{border:0;background:transparent;color:rgba(255,255,255,.68);font-size:13px;font-weight:700;padding:9px 10px;border-radius:10px;cursor:pointer}
        .rwg-eco-links button:hover{background:rgba(255,255,255,.08);color:#fff}
        .rwg-eco-actions{display:flex;align-items:center;gap:10px}
        .rwg-eco-primary,.rwg-eco-secondary{border-radius:14px;padding:12px 16px;font-weight:800;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform .2s ease,box-shadow .2s ease,background .2s ease}
        .rwg-eco-primary{border:0;color:#071316;background:linear-gradient(135deg,#fde68a,#f59e0b);box-shadow:0 16px 36px rgba(245,158,11,.24)}
        .rwg-eco-primary:hover,.rwg-eco-secondary:hover{transform:translateY(-2px)}
        .rwg-eco-secondary{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff}
        .rwg-eco-hero{max-width:1180px;margin:0 auto;padding:70px 18px 44px;display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,520px);gap:44px;align-items:center}
        .rwg-eco-hero>div{min-width:0}
        .rwg-eco-hero h1{font-size:clamp(44px,7vw,86px);line-height:.94;margin:0 0 22px;font-weight:950;letter-spacing:0;color:#fff}
        .rwg-eco-gold{color:#f8d477}
        .rwg-eco-hero p{max-width:620px;color:rgba(255,255,255,.72);font-size:18px;line-height:1.7;margin:0 0 26px}
        .rwg-eco-hero-ctas{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:28px}
        .rwg-eco-proof{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;max-width:650px}
        .rwg-eco-proof div,.rwg-eco-card,.rwg-eco-panel,.rwg-eco-calculator{background:rgba(255,255,255,.065);border:1px solid rgba(255,255,255,.11);box-shadow:0 24px 80px rgba(0,0,0,.28);backdrop-filter:blur(20px)}
        .rwg-eco-proof div{border-radius:16px;padding:16px}
        .rwg-eco-proof strong{display:block;font-size:22px;color:#f8d477}
        .rwg-eco-proof span{display:block;font-size:12px;line-height:1.45;color:rgba(255,255,255,.62);margin-top:4px}
        .rwg-eco-stage{min-height:600px;position:relative;display:grid;place-items:center;perspective:1200px}
        .rwg-eco-building{width:min(390px,82vw);transform:rotateX(58deg) rotateZ(-28deg);transform-style:preserve-3d;animation:rwg-eco-hover 7s ease-in-out infinite}
        .rwg-eco-floor{height:78px;margin:-4px 0;border:1px solid color-mix(in srgb,var(--floor-tone),white 15%);border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--floor-tone),#03151a 72%),rgba(255,255,255,.08));box-shadow:0 18px 0 color-mix(in srgb,var(--floor-tone),#020617 72%),0 30px 55px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.18);display:flex;flex-direction:column;justify-content:center;padding:0 22px;transform:translateZ(calc(var(--floor-index) * 18px));position:relative;overflow:hidden}
        .rwg-eco-floor:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);transform:translateX(-120%);animation:rwg-eco-shine 4s ease-in-out infinite;animation-delay:calc(var(--floor-index) * .3s)}
        .rwg-eco-floor span{font-size:24px;font-weight:950;color:var(--floor-tone);line-height:1}
        .rwg-eco-floor strong{font-size:15px;line-height:1.1;color:#fff;margin-top:4px}
        .rwg-eco-floor small{font-size:10px;color:rgba(255,255,255,.58);margin-top:4px}
        .rwg-eco-orbit{position:absolute;border:1px solid rgba(34,211,238,.25);border-radius:50%;filter:drop-shadow(0 0 18px rgba(34,211,238,.25));animation:rwg-eco-spin 16s linear infinite}
        .orbit-one{width:480px;height:160px;transform:rotate(-18deg)}
        .orbit-two{width:330px;height:110px;transform:rotate(38deg);animation-duration:11s;border-color:rgba(250,204,21,.24)}
        .rwg-eco-pet{position:absolute;object-fit:contain;filter:drop-shadow(0 24px 30px rgba(0,0,0,.45));animation:rwg-eco-bob 4.5s ease-in-out infinite}
        .rwg-eco-pet-boy{width:145px;right:0;top:72px}
        .rwg-eco-pet-baby{width:116px;left:8px;bottom:80px;animation-delay:1s}
        .rwg-eco-box{position:absolute;width:170px;right:34px;bottom:54px;border-radius:18px;object-fit:cover;box-shadow:0 24px 54px rgba(0,0,0,.38);border:1px solid rgba(255,255,255,.18);animation:rwg-eco-bob 5s ease-in-out infinite;animation-delay:.4s}
        .rwg-eco-section{max-width:1180px;margin:0 auto;padding:54px 18px}
        .rwg-eco-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:22px}
        .rwg-eco-section h2{font-size:clamp(28px,4vw,48px);line-height:1.04;margin:0;color:#fff;letter-spacing:0}
        .rwg-eco-section-head p{max-width:540px;color:rgba(255,255,255,.62);line-height:1.65;margin:0}
        .rwg-eco-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}
        .rwg-eco-card{border-radius:18px;padding:18px;min-height:220px;position:relative;overflow:hidden}
        .rwg-eco-card:before{content:"";position:absolute;inset:auto -30px -50px auto;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,var(--tone),transparent 70%);opacity:.16}
        .rwg-eco-card svg{width:28px;height:28px;color:var(--tone);margin-bottom:16px}
        .rwg-eco-card b{display:block;color:var(--tone);font-size:24px;margin-bottom:6px}
        .rwg-eco-card h3{font-size:16px;line-height:1.2;margin:0 0 10px;color:#fff}
        .rwg-eco-card small{display:block;color:rgba(255,255,255,.58);font-weight:700;line-height:1.4;margin-bottom:14px}
        .rwg-eco-card p{font-size:13px;line-height:1.55;color:rgba(255,255,255,.62);margin:0}
        .rwg-eco-split{display:grid;grid-template-columns:1.05fr .95fr;gap:18px;align-items:stretch}
        .rwg-eco-panel{border-radius:22px;padding:24px}
        .rwg-eco-panel h3{font-size:24px;margin:0 0 12px;color:#fff}
        .rwg-eco-panel p{color:rgba(255,255,255,.66);line-height:1.65;margin:0}
        .rwg-eco-invest-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:20px}
        .rwg-eco-invest-step{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.055);border-radius:16px;padding:16px}
        .rwg-eco-invest-step svg{color:#f8d477;width:24px;height:24px;margin-bottom:12px}
        .rwg-eco-invest-step strong{display:block;color:#fff;font-size:15px;margin-bottom:7px}
        .rwg-eco-invest-step span{display:block;color:rgba(255,255,255,.58);font-size:12px;line-height:1.5}
        .rwg-eco-cap{margin-top:20px;padding:18px;border-radius:18px;background:rgba(3,21,26,.72);border:1px solid rgba(248,212,119,.18)}
        .rwg-eco-cap-row{display:flex;justify-content:space-between;gap:12px;color:#fff;font-weight:800;margin-bottom:10px}
        .rwg-eco-cap-track{height:12px;border-radius:20px;background:rgba(255,255,255,.09);overflow:hidden}
        .rwg-eco-cap-fill{height:100%;width:var(--cap-pct);border-radius:20px;background:linear-gradient(90deg,#22d3ee,#f8d477);box-shadow:0 0 22px rgba(34,211,238,.35)}
        .rwg-eco-calculator{border-radius:22px;padding:24px;display:flex;flex-direction:column;gap:16px}
        .rwg-eco-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;color:rgba(255,255,255,.66);font-size:13px}
        .rwg-eco-panel-head strong{font-size:18px;color:#f8d477}
        .rwg-eco-range{width:100%;accent-color:#f8d477}
        .rwg-eco-calc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .rwg-eco-calc-grid div{padding:15px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}
        .rwg-eco-calc-grid small{display:block;color:rgba(255,255,255,.55);font-size:11px;margin-bottom:6px}
        .rwg-eco-calc-grid strong{font-size:22px;color:#fff}
        .rwg-eco-complete{padding:12px 14px;border-radius:14px;background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.32);color:#86efac;font-weight:800;font-size:13px}
        .rwg-eco-audience{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .rwg-eco-audience .rwg-eco-panel svg{width:30px;height:30px;color:#22d3ee;margin-bottom:14px}
        .rwg-eco-blindbox{display:grid;grid-template-columns:.9fr 1.1fr;gap:18px;align-items:center}
        .rwg-eco-pets{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .rwg-eco-pet-card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:14px;text-align:center}
        .rwg-eco-pet-card img{height:145px;width:100%;object-fit:contain;filter:drop-shadow(0 16px 20px rgba(0,0,0,.38));animation:rwg-eco-bob 4s ease-in-out infinite}
        .rwg-eco-pet-card:nth-child(2) img{animation-delay:.7s}
        .rwg-eco-pet-card:nth-child(3) img{animation-delay:1.2s}
        .rwg-eco-pet-card strong{display:block;color:#fff;margin-top:8px}
        .rwg-eco-pet-card span{display:block;color:#f8d477;font-size:12px;margin-top:5px;font-weight:800}
        .rwg-eco-rules{display:grid;gap:10px}
        .rwg-eco-rule{display:grid;grid-template-columns:44px 1fr;gap:12px;align-items:start;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:14px}
        .rwg-eco-rule svg{width:26px;height:26px;color:#f8d477;margin-top:2px}
        .rwg-eco-rule strong{display:block;color:#fff;margin-bottom:4px}
        .rwg-eco-rule span{display:block;color:rgba(255,255,255,.62);font-size:13px;line-height:1.5}
        .rwg-eco-disclaimer{max-width:1180px;margin:0 auto 42px;padding:18px;border-radius:18px;border:1px solid rgba(248,212,119,.25);background:rgba(248,212,119,.07);display:grid;grid-template-columns:32px 1fr;gap:12px;color:rgba(255,255,255,.72);font-size:12px;line-height:1.55}
        .rwg-eco-disclaimer svg{width:26px;height:26px;color:#f8d477}
        .rwg-eco-footer{border-top:1px solid rgba(255,255,255,.08);padding:26px 18px 90px;color:rgba(255,255,255,.5)}
        .rwg-eco-footer-inner{max-width:1180px;margin:0 auto;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;font-size:12px}
        .rwg-eco-mobile-bar{display:none}
        @keyframes rwg-eco-hover{0%,100%{transform:rotateX(58deg) rotateZ(-28deg) translateY(0)}50%{transform:rotateX(58deg) rotateZ(-28deg) translateY(-12px)}}
        @keyframes rwg-eco-shine{0%,35%{transform:translateX(-120%)}65%,100%{transform:translateX(120%)}}
        @keyframes rwg-eco-spin{to{rotate:360deg}}
        @keyframes rwg-eco-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @media(max-width:1020px){.rwg-eco-links{display:none}.rwg-eco-hero,.rwg-eco-split,.rwg-eco-blindbox{grid-template-columns:1fr}.rwg-eco-hero{padding-top:42px}.rwg-eco-stage{min-height:500px;order:-1}.rwg-eco-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rwg-eco-invest-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rwg-eco-pets{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:680px){.rwg-eco-nav-inner{padding:10px 14px}.rwg-eco-brand span{display:none}.rwg-eco-actions{display:none}.rwg-eco-hero{display:flex;flex-direction:column;padding:26px 14px 28px;gap:18px;overflow:hidden;width:100%;max-width:100vw}.rwg-eco-hero>div{width:100%;min-width:0}.rwg-eco-hero h1{font-size:clamp(36px,12vw,46px);max-width:100%;overflow-wrap:normal}.rwg-eco-hero p{font-size:15px;max-width:100%;overflow-wrap:break-word}.rwg-eco-hero-ctas{display:grid;grid-template-columns:1fr;width:100%}.rwg-eco-proof{grid-template-columns:1fr;width:100%}.rwg-eco-stage{min-height:390px;width:100%;max-width:100%;min-width:0;overflow:hidden}.rwg-eco-building{width:260px;transform:rotateX(58deg) rotateZ(-24deg)}.rwg-eco-floor{height:64px;border-radius:14px;padding:0 16px}.rwg-eco-floor span{font-size:20px}.rwg-eco-floor strong{font-size:11px}.rwg-eco-floor small{display:none}.rwg-eco-pet-boy{width:86px;right:8px;top:54px}.rwg-eco-pet-baby{width:82px;left:4px;bottom:54px}.rwg-eco-box{width:118px;right:8px;bottom:36px;border-radius:14px}.orbit-one{width:286px;height:110px}.orbit-two{width:210px;height:80px}.rwg-eco-section{padding:40px 14px;overflow:hidden;width:100%;max-width:100vw}.rwg-eco-section-head{display:block}.rwg-eco-section-head p{margin-top:10px}.rwg-eco-grid,.rwg-eco-invest-grid,.rwg-eco-audience,.rwg-eco-pets,.rwg-eco-calc-grid{grid-template-columns:1fr}.rwg-eco-card{min-height:auto}.rwg-eco-panel,.rwg-eco-calculator{padding:18px}.rwg-eco-mobile-bar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:50;padding:10px 12px 18px;background:rgba(3,21,26,.94);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.12);gap:10px}.rwg-eco-mobile-bar button{flex:1;min-width:0;padding-left:8px;padding-right:8px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rwg-eco-footer{padding-bottom:105px}}
        @media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;scroll-behavior:auto!important;transition:none!important}}
      `}</style>

      <nav className="rwg-eco-nav">
        <div className="rwg-eco-nav-inner">
          <a className="rwg-eco-brand" href="/">
            <img src={rwgLogo} alt="Reborn Wave Group logo" />
            <span>Reborn Wave Group</span>
          </a>
          <div className="rwg-eco-links">
            <button onClick={() => scrollTo("ecosystem")}>{copy.nav[0]}</button>
            <button onClick={() => scrollTo("investor")}>{copy.nav[1]}</button>
            <button onClick={() => scrollTo("blindbox")}>{copy.nav[2]}</button>
            <button onClick={() => scrollTo("join")}>{copy.nav[3]}</button>
          </div>
          <div className="rwg-eco-actions">
            <div className="rwg-language-wrap">
              <LanguageSelector />
            </div>
            <button className="rwg-eco-secondary" onClick={handleLogin}>
              {copy.login}
            </button>
            <button className="rwg-eco-primary" onClick={() => scrollTo("investor")}>
              {copy.investorPackage}
            </button>
          </div>
        </div>
      </nav>

      <section className="rwg-eco-hero">
        <div>
          <h1>
            {copy.heroTitle} <span className="rwg-eco-gold">{copy.heroAccent}</span>
          </h1>
          <p>{copy.heroText}</p>
          <div className="rwg-eco-hero-ctas">
            <button className="rwg-eco-primary" onClick={() => scrollTo("ecosystem")}>
              {copy.explore} <ArrowRight size={17} />
            </button>
            <button className="rwg-eco-secondary" onClick={() => scrollTo("blindbox")}>
              {copy.seeBlindbox} <Gift size={17} />
            </button>
          </div>
          <div className="rwg-eco-proof">
            <div>
              <strong>{copy.proof[0][0]}</strong>
              <span>{copy.proof[0][1]}</span>
            </div>
            <div>
              <strong>{copy.proof[1][0]}</strong>
              <span>{copy.proof[1][1]}</span>
            </div>
            <div>
              <strong>{members.toLocaleString()}</strong>
              <span>{copy.proof[2][1]}</span>
            </div>
          </div>
        </div>
        <BuildingStack floors={floors} />
      </section>

      <section className="rwg-eco-section" id="ecosystem">
        <div className="rwg-eco-section-head">
          <h2>{copy.floorsTitle}</h2>
          <p>{copy.floorsIntro}</p>
        </div>
        <div className="rwg-eco-grid">
          {floors.map((floor) => {
            const Icon = floor.icon;
            return (
              <article
                className="rwg-eco-card"
                key={floor.level}
                style={{ "--tone": floor.tone } as React.CSSProperties}
              >
                <Icon />
                <b>{floor.level}</b>
                <h3>{floor.title}</h3>
                <small>{floor.units}</small>
                <p>{floor.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rwg-eco-section" id="investor">
        <div className="rwg-eco-section-head">
          <h2>{copy.investorTitle}</h2>
          <p>{copy.investorIntro}</p>
        </div>
        <div className="rwg-eco-split">
          <div className="rwg-eco-panel">
            <h3>{copy.packageFlow}</h3>
            <p>{copy.packageText}</p>
            <div className="rwg-eco-invest-grid">
              {investorSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div className="rwg-eco-invest-step" key={step.title}>
                    <Icon />
                    <strong>{step.title}</strong>
                    <span>{step.detail}</span>
                  </div>
                );
              })}
            </div>
            <div className="rwg-eco-cap">
              <div className="rwg-eco-cap-row">
                <span>{copy.capProgress}</span>
                <span>${raised.toLocaleString()} / ${cap.toLocaleString()}</span>
              </div>
              <div className="rwg-eco-cap-track">
                <div className="rwg-eco-cap-fill" style={{ "--cap-pct": `${capPct}%` } as React.CSSProperties} />
              </div>
            </div>
          </div>
          <InvestorCalculator copy={copy} />
        </div>
      </section>

      <section className="rwg-eco-section" id="join">
        <div className="rwg-eco-section-head">
          <h2>{copy.audienceTitle}</h2>
          <p>{copy.audienceIntro}</p>
        </div>
        <div className="rwg-eco-audience">
          {audienceCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="rwg-eco-panel" key={card.title}>
                <Icon />
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rwg-eco-section" id="blindbox">
        <div className="rwg-eco-section-head">
          <h2>{copy.blindboxTitle}</h2>
          <p>{copy.blindboxIntro}</p>
        </div>
        <div className="rwg-eco-blindbox">
          <div className="rwg-eco-pets">
            <div className="rwg-eco-pet-card">
              <img src={doluruuBoy} alt="Male blindbox pet" />
              <strong>{copy.pets[0][0]}</strong>
              <span>{copy.pets[0][1]}</span>
            </div>
            <div className="rwg-eco-pet-card">
              <img src={doluruuFemale} alt="Female blindbox pet" />
              <strong>{copy.pets[1][0]}</strong>
              <span>{copy.pets[1][1]}</span>
            </div>
            <div className="rwg-eco-pet-card">
              <img src={doluruuBaby} alt="Baby blindbox pet" />
              <strong>{copy.pets[2][0]}</strong>
              <span>{copy.pets[2][1]}</span>
            </div>
            <div className="rwg-eco-pet-card">
              <img src={doluruuBlindboxBox} alt="Doluruu blindbox box" />
              <strong>{copy.pets[3][0]}</strong>
              <span>{copy.pets[3][1]}</span>
            </div>
          </div>
          <div className="rwg-eco-rules">
            <div className="rwg-eco-rule">
              <Gift />
              <div>
                <strong>{copy.rules[0][0]}</strong>
                <span>{copy.rules[0][1]}</span>
              </div>
            </div>
            <div className="rwg-eco-rule">
              <HeartHandshake />
              <div>
                <strong>{copy.rules[1][0]}</strong>
                <span>{copy.rules[1][1]}</span>
              </div>
            </div>
            <div className="rwg-eco-rule">
              <PawPrint />
              <div>
                <strong>{copy.rules[2][0]}</strong>
                <span>{copy.rules[2][1]}</span>
              </div>
            </div>
            <div className="rwg-eco-rule">
              <Trophy />
              <div>
                <strong>{copy.rules[3][0]}</strong>
                <span>{copy.rules[3][1]}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="rwg-eco-disclaimer">
        <ShieldCheck />
        <div>{copy.disclaimer}</div>
      </div>

      <footer className="rwg-eco-footer">
        <div className="rwg-eco-footer-inner">
          <span>{copy.footerLeft}</span>
          <span>{copy.footerRight}</span>
        </div>
      </footer>

      <div className="rwg-eco-mobile-bar">
        <button className="rwg-eco-secondary" onClick={handleLogin}>
          {copy.login}
        </button>
        <button className="rwg-eco-primary" onClick={() => scrollTo("investor")}>
          {copy.investorPackage}
        </button>
      </div>
    </main>
  );
}

export default Landing;
