import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  Crown,
  Gift,
  HeartHandshake,
  Landmark,
  MapPin,
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
import doluruuFemale from "@assets/doluruu-female-transparent.png";
import doluruuBlindboxBox from "@assets/doluruu-blindbox-box.jpeg";

type Floor = {
  level: string;
  icon: typeof Music2;
  tone: string;
  scene: "ktv" | "private" | "vip" | "pet" | "live";
};

const floorMeta: Floor[] = [
  {
    level: "1F",
    icon: Trophy,
    tone: "#22d3ee",
    scene: "ktv",
  },
  {
    level: "2F",
    icon: Scissors,
    tone: "#f472b6",
    scene: "private",
  },
  {
    level: "3F",
    icon: Crown,
    tone: "#facc15",
    scene: "vip",
  },
  {
    level: "4F",
    icon: PawPrint,
    tone: "#34d399",
    scene: "pet",
  },
  {
    level: "5F",
    icon: Music2,
    tone: "#a78bfa",
    scene: "live",
  },
];

const stepIcons = [WalletCards, BadgeDollarSign, Landmark, Users];
const audienceIcons = [Sparkles, HeartHandshake, Building2];
const clubAddress =
  "Ruko Oceanic Bliss, Jl. Pasir Putih Harbourfront - Batam Centre.49 blok A. 51, Sadai, Bengkong, Batam City, Riau Islands 29444";
const googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clubAddress)}`;

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
      "Each friend who invests $5,000 pays the inviter $500. That $500 is deducted from the inviter's remaining ROI target. After 20 successful investor invites, the $10,000 ROI target is fully cleared and the contract finishes unless the investor joins again.",
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
    locationTitle: "Find us in Batam, Indonesia.",
    locationIntro:
      "The club sits near Harbourfront Batam Centre, giving visitors a clear destination for KTV, beauty, pet cafe, live house events, investor hosting, and member rewards.",
    locationCta: "Open Google Maps",
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
      "每成功介绍一位朋友投资 $5,000，介绍人获得 $500。该 $500 会从介绍人的剩余回报目标中扣减。成功介绍 20 位投资者后，$10,000 回报目标完成，合约结束，除非再次投资。",
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
    locationTitle: "欢迎来到印度尼西亚巴淡岛。",
    locationIntro:
      "俱乐部位于 Batam Centre Harbourfront 附近，方便顾客、会员、投资者和合作伙伴到店体验 KTV、美容、宠物咖啡厅、Live House 活动和盲盒奖励。",
    locationCta: "打开 Google 地图",
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
      "Setiap teman yang invest $5,000 memberi bonus $500 kepada pengundang. Bonus $500 itu dipotong dari sisa target ROI pengundang. Setelah 20 teman berhasil invest, target ROI $10,000 selesai dan kontrak berakhir kecuali investor masuk lagi.",
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
    locationTitle: "Kunjungi kami di Batam, Indonesia.",
    locationIntro:
      "Klub berada dekat Harbourfront Batam Centre, menjadi destinasi jelas untuk KTV, beauty, pet cafe, live house, investor hosting, dan reward member.",
    locationCta: "Buka Google Maps",
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
  const referralBonus = invites * 500;
  const roiLeft = Math.max(10000 - referralBonus, 0);
  const complete = invites >= 20;

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
        max={20}
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

function FloorMiniScene({
  floor,
  index,
}: {
  floor: Floor & { title: string; units: string; detail: string };
  index: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    let animationFrame = 0;
    let renderer: any;
    let resizeObserver: ResizeObserver | undefined;

    async function createScene() {
      const THREE = await import("three");
      const mount = mountRef.current;
      if (!mount || !isMounted) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(4.8, 3.8, 6.2);
      camera.lookAt(0, 0.2, 0);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
      renderer.shadowMap.enabled = true;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      const accent = new THREE.Color(floor.tone);
      const group = new THREE.Group();
      scene.add(group);

      const mat = (color: string | number, roughness = 0.55, metalness = 0.1) =>
        new THREE.MeshStandardMaterial({ color, roughness, metalness });
      const accentMat = new THREE.MeshStandardMaterial({
        color: accent,
        roughness: 0.38,
        metalness: 0.18,
        emissive: accent.clone().multiplyScalar(0.18),
      });
      const glassMat = new THREE.MeshStandardMaterial({
        color: "#7dd3fc",
        transparent: true,
        opacity: 0.34,
        roughness: 0.2,
        metalness: 0.05,
      });

      const addBox = (
        size: [number, number, number],
        pos: [number, number, number],
        material: any,
        rotation: [number, number, number] = [0, 0, 0],
      ) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
        mesh.position.set(...pos);
        mesh.rotation.set(...rotation);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
      };

      const addCylinder = (
        radius: number,
        depth: number,
        pos: [number, number, number],
        material: any,
        rotation: [number, number, number] = [0, 0, 0],
      ) => {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 32), material);
        mesh.position.set(...pos);
        mesh.rotation.set(...rotation);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
      };

      const addSphere = (radius: number, pos: [number, number, number], material: any) => {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 18), material);
        mesh.position.set(...pos);
        mesh.castShadow = true;
        group.add(mesh);
        return mesh;
      };

      addBox([5.3, 0.18, 3.7], [0, -0.1, 0], mat("#0e2a31", 0.72, 0.05));
      addBox([5.3, 2.4, 0.14], [0, 1.04, -1.85], mat("#122f37", 0.68, 0.05));
      addBox([0.14, 2.4, 3.7], [-2.65, 1.04, 0], mat("#10252d", 0.72, 0.05));
      addBox([5.4, 0.035, 3.8], [0, 0.01, 0], accentMat);

      if (floor.scene === "ktv") {
        addBox([2.2, 0.28, 0.78], [-0.9, 0.08, -1.1], accentMat);
        addBox([1.24, 0.72, 0.08], [-0.9, 0.75, -1.76], mat("#101827"));
        addCylinder(0.06, 0.9, [0.7, 0.48, -0.72], mat("#f8fafc"), [0.2, 0, 0]);
        addSphere(0.15, [0.79, 0.97, -0.62], mat("#fbbf24", 0.35, 0.22));
        for (let i = 0; i < 4; i += 1) addBox([0.34, 0.34, 0.34], [0.2 + i * 0.42, 0.16, 0.95], mat(i % 2 ? "#fb7185" : "#38bdf8"));
        addCylinder(0.42, 0.14, [-1.85, 0.05, 0.86], mat("#f59e0b", 0.48, 0.15));
      }

      if (floor.scene === "private") {
        for (let i = 0; i < 4; i += 1) {
          addBox([0.72, 0.9, 0.68], [-1.65 + i * 0.86, 0.39, -0.9], mat("#172d3a"));
          addBox([0.44, 0.48, 0.05], [-1.65 + i * 0.86, 0.52, -1.26], accentMat);
        }
        addCylinder(0.55, 0.08, [1.42, 0.58, 0.64], glassMat, [Math.PI / 2, 0, 0]);
        addBox([0.9, 0.18, 0.36], [1.42, 0.18, 0.78], mat("#f9a8d4", 0.42, 0.1));
        addCylinder(0.2, 0.5, [1.42, 0.18, 1.24], accentMat);
      }

      if (floor.scene === "vip") {
        addBox([1.4, 0.7, 1], [-1.05, 0.27, -0.68], mat("#2b1f0b", 0.42, 0.22));
        addBox([1.4, 0.7, 1], [1.05, 0.27, -0.68], mat("#2b1f0b", 0.42, 0.22));
        addBox([2.8, 0.28, 0.68], [0, 0.09, 0.72], accentMat);
        addCylinder(0.28, 0.18, [0, 0.16, 0.1], mat("#fef3c7", 0.36, 0.18));
        addCylinder(0.08, 0.72, [-1.92, 0.72, -1.15], accentMat);
        addCylinder(0.08, 0.72, [1.92, 0.72, -1.15], accentMat);
      }

      if (floor.scene === "pet") {
        addBox([1.7, 0.46, 0.54], [-1.25, 0.14, -0.86], mat("#164e63", 0.48, 0.12));
        for (let i = 0; i < 3; i += 1) {
          addCylinder(0.28, 0.12, [-1.2 + i * 1.1, 0.08, 0.56], mat("#fde68a", 0.55, 0.08));
          addSphere(0.18, [-1.2 + i * 1.1, 0.34, 0.56], mat(i === 1 ? "#111827" : "#f8fafc"));
        }
        addBox([0.66, 0.66, 0.66], [1.52, 0.28, -0.72], accentMat, [0, 0.45, 0]);
        addCylinder(0.08, 0.72, [2.05, 0.34, 0.85], mat("#22c55e"));
        addSphere(0.34, [2.05, 0.78, 0.85], mat("#16a34a"));
      }

      if (floor.scene === "live") {
        addBox([2.8, 0.34, 0.92], [0, 0.08, -1.12], accentMat);
        addBox([2.2, 1.08, 0.06], [0, 0.9, -1.82], glassMat);
        for (let i = 0; i < 5; i += 1) addBox([0.36, 0.04, 1.08], [-1.1 + i * 0.55, 0.03, 0.88], mat(i % 2 ? "#f8fafc" : "#111827"));
        addCylinder(0.13, 0.78, [-0.72, 0.52, -0.86], mat("#d1d5db"), [0.1, 0, 0]);
        addCylinder(0.18, 0.18, [0.04, 0.38, -0.82], mat("#f43f5e"));
        addCylinder(0.13, 0.82, [0.78, 0.55, -0.88], mat("#d1d5db"), [-0.1, 0, 0]);
      }

      scene.add(new THREE.AmbientLight("#bfefff", 1.15));
      const keyLight = new THREE.DirectionalLight("#ffffff", 2.1);
      keyLight.position.set(4, 6, 4);
      keyLight.castShadow = true;
      scene.add(keyLight);
      const rimLight = new THREE.PointLight(floor.tone, 18, 9);
      rimLight.position.set(-2.2, 2.2, 2.8);
      scene.add(rimLight);

      const resize = () => {
        const { width, height } = mount.getBoundingClientRect();
        const nextWidth = Math.max(240, width);
        const nextHeight = Math.max(230, height);
        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(nextWidth, nextHeight, false);
      };

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      resize();

      const animate = (time: number) => {
        group.rotation.y = Math.sin(time * 0.00035 + index) * 0.16 - 0.42;
        group.rotation.x = Math.sin(time * 0.00024 + index) * 0.035;
        group.position.y = Math.sin(time * 0.001 + index) * 0.06;
        rimLight.intensity = 14 + Math.sin(time * 0.002 + index) * 5;
        renderer.render(scene, camera);
        animationFrame = requestAnimationFrame(animate);
      };
      animate(0);

      return () => {
        cancelAnimationFrame(animationFrame);
        resizeObserver?.disconnect();
        scene.traverse((object: any) => {
          object.geometry?.dispose?.();
          if (Array.isArray(object.material)) object.material.forEach((item: any) => item.dispose?.());
          else object.material?.dispose?.();
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    }

    let cleanup: (() => void) | undefined;
    createScene().then((dispose) => {
      cleanup = dispose;
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [floor.level, floor.scene, floor.tone, index]);

  return (
    <div className="rwg-floor-mini-scene" ref={mountRef} aria-label={`${floor.level} animated 3D ${floor.title} scene`}>
      <span>{floor.level}</span>
    </div>
  );
}

function FloorShowcaseScene({
  floors,
  activeIndex,
}: {
  floors: Array<Floor & { title: string; units: string; detail: string }>;
  activeIndex: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const activeFloor = floors[activeIndex] || floors[0];

  useEffect(() => {
    let isMounted = true;
    let frame = 0;
    let renderer: any;
    let resizeObserver: ResizeObserver | undefined;

    async function createScene() {
      const THREE = await import("three");
      const mount = mountRef.current;
      if (!mount || !isMounted || !activeFloor) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(6.8, 6.1, 7.8);
      camera.lookAt(0, 0.15, 0);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
      renderer.shadowMap.enabled = true;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      const accent = new THREE.Color(activeFloor.tone);
      const group = new THREE.Group();
      scene.add(group);

      const mat = (color: string | number, roughness = 0.55, metalness = 0.08) =>
        new THREE.MeshStandardMaterial({ color, roughness, metalness });
      const zoneMat = (color: string) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.42,
          metalness: 0.12,
          emissive: new THREE.Color(color).multiplyScalar(0.1),
        });
      const wallMat = mat("#c7f9d2", 0.5, 0.08);
      const floorMat = mat("#0e2d35", 0.7, 0.04);
      const accentMat = zoneMat(activeFloor.tone);
      const glassMat = new THREE.MeshStandardMaterial({ color: "#93c5fd", transparent: true, opacity: 0.32, roughness: 0.18 });
      const goldMat = zoneMat("#f8c84c");
      const pinkMat = zoneMat("#f472b6");
      const cyanMat = zoneMat("#22d3ee");
      const greenMat = zoneMat("#34d399");
      const violetMat = zoneMat("#a78bfa");

      const addBox = (
        size: [number, number, number],
        pos: [number, number, number],
        material: any,
        rotation: [number, number, number] = [0, 0, 0],
      ) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
        mesh.position.set(...pos);
        mesh.rotation.set(...rotation);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
      };
      const addCyl = (radius: number, depth: number, pos: [number, number, number], material: any, rot: [number, number, number] = [0, 0, 0]) => {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 36), material);
        mesh.position.set(...pos);
        mesh.rotation.set(...rot);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
      };

      const addWall = (x: number, z: number, w: number, d: number) => addBox([w, 0.42, d], [x, 0.36, z], wallMat);
      const addZone = (x: number, z: number, w: number, d: number, material: any) => addBox([w, 0.08, d], [x, 0.03, z], material);
      const addLabelBlock = (x: number, z: number, material: any) => {
        addBox([0.48, 0.28, 0.48], [x, 0.21, z], material);
        addBox([0.34, 0.54, 0.08], [x, 0.57, z - 0.24], material);
      };
      const addStairs = (x: number, z: number, material: any) => {
        for (let i = 0; i < 9; i += 1) addBox([0.9, 0.05 + i * 0.018, 0.12], [x, 0.08 + i * 0.018, z + i * 0.14], material);
      };
      const addSofa = (x: number, z: number, material: any) => {
        addBox([0.95, 0.24, 0.32], [x, 0.18, z], material);
        addBox([0.95, 0.38, 0.12], [x, 0.32, z - 0.2], material);
      };
      const addVanity = (x: number, z: number) => {
        addBox([0.8, 0.16, 0.3], [x, 0.16, z], pinkMat);
        addCyl(0.22, 0.06, [x, 0.48, z - 0.17], glassMat, [Math.PI / 2, 0, 0]);
        addCyl(0.14, 0.28, [x, 0.18, z + 0.35], pinkMat);
      };
      const addPetTable = (x: number, z: number) => {
        addCyl(0.28, 0.12, [x, 0.13, z], goldMat);
        addCyl(0.1, 0.28, [x - 0.28, 0.28, z + 0.25], greenMat);
        addCyl(0.1, 0.28, [x + 0.28, 0.28, z + 0.25], greenMat);
      };

      addBox([6.3, 0.1, 5.5], [0, -0.03, 0], floorMat);
      addWall(0, -2.75, 6.25, 0.08);
      addWall(0, 2.75, 6.25, 0.08);
      addWall(-3.12, 0, 0.08, 5.5);
      addWall(3.12, 0, 0.08, 5.5);
      addBox([0.72, 0.24, 0.72], [-0.45, 0.12, 0.55], mat("#1f2937", 0.5, 0.12));
      addStairs(2.35, -1.85, accentMat);

      if (activeFloor.scene === "ktv") {
        addZone(-1.7, -0.35, 2.65, 4.25, cyanMat);
        addZone(1.35, -0.5, 2.1, 3.5, goldMat);
        addWall(-0.1, -0.3, 0.08, 4.25);
        addWall(1.35, 1.25, 2.1, 0.08);
        addBox([1.5, 0.34, 0.65], [-1.7, 0.18, -1.92], cyanMat);
        addBox([0.95, 0.64, 0.08], [-1.7, 0.68, -2.26], mat("#0f172a"));
        addLabelBlock(1.1, -0.4, goldMat);
        addLabelBlock(1.75, 0.2, goldMat);
        addCyl(0.08, 0.85, [-0.65, 0.52, -1.55], mat("#f8fafc"), [0.15, 0, 0]);
      }

      if (activeFloor.scene === "private") {
        addZone(-1.85, -1.02, 2.35, 2.92, cyanMat);
        addZone(1.16, -1.02, 2.75, 2.92, pinkMat);
        addZone(0.1, 1.6, 5.6, 1.65, mat("#12323a"));
        for (let i = 0; i < 4; i += 1) {
          const x = -1.9 + i * 0.9;
          addWall(x + 0.44, -1.02, 0.06, 2.5);
          addSofa(x, -1.65, cyanMat);
        }
        addVanity(1.1, -1.55);
        addVanity(1.95, -0.65);
        addWall(0, 0.38, 5.6, 0.08);
      }

      if (activeFloor.scene === "vip") {
        addZone(-1.55, -0.95, 2.9, 2.95, goldMat);
        addZone(1.58, -0.95, 2.6, 2.95, violetMat);
        addZone(0.08, 1.58, 5.6, 1.62, pinkMat);
        addWall(0.05, -0.95, 0.08, 2.86);
        addWall(0.08, 0.55, 5.6, 0.08);
        addSofa(-1.55, -1.55, goldMat);
        addSofa(1.55, -1.55, violetMat);
        addCyl(0.3, 0.18, [-1.55, 0.18, -0.75], mat("#fef3c7"));
        addCyl(0.3, 0.18, [1.55, 0.18, -0.75], mat("#fef3c7"));
        addVanity(-2.25, 1.55);
        addVanity(-1.35, 1.55);
      }

      if (activeFloor.scene === "pet") {
        addZone(0, -0.8, 5.8, 3.25, greenMat);
        addZone(-1.85, 1.55, 2.3, 1.75, goldMat);
        addZone(1.55, 1.55, 2.75, 1.75, cyanMat);
        addWall(0, 0.85, 5.8, 0.08);
        addWall(0.12, 1.55, 0.08, 1.75);
        for (let i = 0; i < 6; i += 1) addPetTable(-2.1 + i * 0.85, -0.75 + (i % 2) * 0.95);
        addBox([0.7, 0.7, 0.7], [2.15, 0.36, 1.48], pinkMat, [0, 0.55, 0]);
      }

      if (activeFloor.scene === "live") {
        addZone(0, -0.82, 5.7, 3.28, violetMat);
        addZone(0, 1.62, 5.8, 1.55, glassMat);
        addWall(0, 0.75, 5.7, 0.08);
        addBox([2.45, 0.34, 0.9], [0, 0.2, -2.02], violetMat);
        for (let i = 0; i < 6; i += 1) addBox([0.48, 0.04, 0.48], [-1.25 + (i % 3) * 1.25, 0.08, -0.38 + Math.floor(i / 3) * 0.65], i % 2 ? mat("#f8fafc") : mat("#111827"));
        addCyl(0.1, 0.82, [-0.75, 0.55, -1.88], mat("#e5e7eb"), [0.12, 0, 0]);
        addCyl(0.18, 0.2, [0, 0.42, -1.78], mat("#fb7185"));
        addCyl(0.1, 0.82, [0.75, 0.55, -1.88], mat("#e5e7eb"), [-0.12, 0, 0]);
      }

      scene.add(new THREE.AmbientLight("#c7f9ff", 1.25));
      const key = new THREE.DirectionalLight("#ffffff", 2.25);
      key.position.set(4, 7, 5);
      key.castShadow = true;
      scene.add(key);
      const glow = new THREE.PointLight(activeFloor.tone, 18, 9);
      glow.position.set(-2.3, 2.2, 2.5);
      scene.add(glow);

      const resize = () => {
        const { width, height } = mount.getBoundingClientRect();
        const nextWidth = Math.max(280, width);
        const nextHeight = Math.max(320, height);
        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(nextWidth, nextHeight, false);
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      resize();

      const animate = (time: number) => {
        group.rotation.y = -0.72 + Math.sin(time * 0.00035) * 0.08;
        group.rotation.x = 0.12 + Math.sin(time * 0.00025) * 0.025;
        group.position.y = Math.sin(time * 0.0011) * 0.05;
        glow.intensity = 14 + Math.sin(time * 0.002) * 4;
        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);
      };
      animate(0);

      return () => {
        cancelAnimationFrame(frame);
        resizeObserver?.disconnect();
        scene.traverse((object: any) => {
          object.geometry?.dispose?.();
          if (Array.isArray(object.material)) object.material.forEach((item: any) => item.dispose?.());
          else object.material?.dispose?.();
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    }

    let cleanup: (() => void) | undefined;
    createScene().then((dispose) => {
      cleanup = dispose;
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [activeFloor, activeIndex]);

  return (
    <div className="rwg-floor-showcase-scene" ref={mountRef}>
      <div className="rwg-floor-showcase-label">
        <span>{activeFloor?.level}</span>
        <strong>{activeFloor?.title}</strong>
      </div>
    </div>
  );
}

function RenovatedFloorPlanShowcase({
  floors,
  activeIndex,
}: {
  floors: Array<Floor & { title: string; units: string; detail: string }>;
  activeIndex: number;
}) {
  const activeFloor = floors[activeIndex] || floors[0];
  const roomSets: Record<Floor["scene"], Array<{ label: string; className: string }>> = {
    ktv: [
      { label: "KTV Lounge", className: "large cyan left" },
      { label: "Competition Stage", className: "wide gold bottom" },
      { label: "Kids Game House", className: "medium pink right" },
    ],
    private: [
      { label: "Private Room 1", className: "small cyan left" },
      { label: "Private Room 2", className: "small cyan mid" },
      { label: "Private Room 3", className: "small cyan upper" },
      { label: "Private Room 4", className: "small cyan right" },
      { label: "Beauty Salon", className: "wide pink bottom" },
    ],
    vip: [
      { label: "VIP KTV Suite", className: "large gold left" },
      { label: "VIP KTV Suite", className: "large violet right" },
      { label: "Beauty Lounge", className: "wide pink bottom" },
    ],
    pet: [
      { label: "Pet Cafe Hall", className: "large green left" },
      { label: "Dining", className: "medium gold right" },
      { label: "Blindbox Corner", className: "small pink upper" },
      { label: "Pet Play Area", className: "wide cyan bottom" },
    ],
    live: [
      { label: "Live Stage", className: "wide violet upper" },
      { label: "Dance Floor", className: "large gold left" },
      { label: "Sea View Lounge", className: "wide cyan bottom" },
    ],
  };

  return (
    <div className="rwg-renovated-plan" style={{ "--tone": activeFloor?.tone } as React.CSSProperties}>
      <div className="rwg-renovated-plan-head">
        <span>{activeFloor?.level}</span>
        <strong>{activeFloor?.title}</strong>
      </div>
      <div className={`rwg-renovated-plan-body scene-${activeFloor?.scene}`}>
        <div className="rwg-plan-core lift">Lift</div>
        <div className="rwg-plan-core stair stair-a">Stairs</div>
        <div className="rwg-plan-core stair stair-b">Stairs</div>
        {(roomSets[activeFloor?.scene || "ktv"] || []).map((room) => (
          <div className={`rwg-plan-room ${room.className}`} key={`${activeFloor?.level}-${room.label}`}>
            <span>{room.label}</span>
          </div>
        ))}
      </div>
      <div className="rwg-renovated-plan-foot">
        <span>15.2m frontage concept</span>
        <span>Renovated layout preview</span>
      </div>
    </div>
  );
}

function FloorScrollStory({ floors }: { floors: Array<Floor & { title: string; units: string; detail: string }> }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const stepRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const nextIndex = Number((visible.target as HTMLElement).dataset.floorIndex || 0);
        setActiveIndex(nextIndex);
      },
      { root: null, threshold: [0.35, 0.55, 0.75], rootMargin: "-18% 0px -34% 0px" },
    );

    stepRefs.current.forEach((item) => {
      if (item) observer.observe(item);
    });

    return () => observer.disconnect();
  }, [floors]);

  return (
      <div className="rwg-floor-story">
      <div className="rwg-floor-visual" aria-label="Scroll activated renovated 3D floor plan">
        <RenovatedFloorPlanShowcase floors={floors} activeIndex={activeIndex} />
        <div className="rwg-floor-tower">
          {floors
            .slice()
            .reverse()
            .map((floor, index) => {
              const originalIndex = floors.length - 1 - index;
              return (
              <div
                className={`rwg-floor-slab ${activeIndex === originalIndex ? "is-active" : ""}`}
                key={floor.level}
                style={
                  {
                    "--floor-tone": floor.tone,
                    "--floor-index": index,
                  } as React.CSSProperties
                }
              >
                <span>{floor.level}</span>
              </div>
              );
            })}
        </div>
        <div className="rwg-floor-glow" />
      </div>
      <div className="rwg-floor-copy">
        {floors.map((floor, index) => {
          const Icon = floor.icon;
          return (
            <article
              className={`rwg-floor-step ${activeIndex === index ? "is-active" : ""}`}
              key={floor.level}
              data-floor-index={index}
              ref={(node) => {
                stepRefs.current[index] = node;
              }}
              style={
                {
                  "--tone": floor.tone,
                  "--step-index": index,
                } as React.CSSProperties
              }
            >
              <div className="rwg-floor-step-number">{floor.level}</div>
              <div>
                <Icon />
                <h3>{floor.title}</h3>
                <small>{floor.units}</small>
                <p>{floor.detail}</p>
              </div>
            </article>
          );
        })}
      </div>
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
        .rwg-floor-story{display:grid;grid-template-columns:minmax(320px,460px) minmax(0,1fr);gap:34px;align-items:start}
        .rwg-floor-visual{position:sticky;top:92px;min-height:620px;border-radius:24px;display:grid;grid-template-rows:minmax(0,1fr) auto;gap:18px;padding:20px;overflow:hidden;background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.11);box-shadow:0 24px 80px rgba(0,0,0,.28);perspective:1200px}
        .rwg-floor-visual:before{content:"";position:absolute;inset:28px;border-radius:22px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px);background-size:34px 34px;mask-image:radial-gradient(circle at center,#000,transparent 76%)}
        .rwg-floor-showcase-scene{position:relative;z-index:2;min-height:430px;border-radius:22px;overflow:hidden;background:radial-gradient(circle at 34% 24%,rgba(34,211,238,.16),transparent 34%),linear-gradient(145deg,rgba(3,21,26,.82),rgba(10,54,64,.42));border:1px solid rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 26px 70px rgba(0,0,0,.32)}
        .rwg-floor-showcase-scene:before{content:"";position:absolute;inset:16px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px);background-size:30px 30px;opacity:.62;pointer-events:none}
        .rwg-floor-showcase-scene canvas{position:relative;z-index:1;width:100%;height:100%;display:block}
        .rwg-floor-showcase-label{position:absolute;left:18px;right:18px;top:18px;z-index:3;display:flex;align-items:center;gap:12px;pointer-events:none}
        .rwg-floor-showcase-label span{width:52px;aspect-ratio:1;border-radius:16px;display:grid;place-items:center;background:#f8d477;color:#061316;font-weight:950;box-shadow:0 16px 36px rgba(248,212,119,.28)}
        .rwg-floor-showcase-label strong{font-size:clamp(18px,2vw,24px);line-height:1.1;color:#fff;text-shadow:0 12px 30px rgba(0,0,0,.38)}
        .rwg-renovated-plan{position:relative;z-index:2;min-height:430px;border-radius:22px;overflow:hidden;background:radial-gradient(circle at 34% 24%,color-mix(in srgb,var(--tone),transparent 74%),transparent 34%),linear-gradient(145deg,rgba(3,21,26,.82),rgba(10,54,64,.42));border:1px solid color-mix(in srgb,var(--tone),rgba(255,255,255,.16) 35%);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 26px 70px rgba(0,0,0,.32);display:grid;grid-template-rows:auto minmax(0,1fr) auto;padding:18px;transition:border-color .35s ease,background .35s ease}
        .rwg-renovated-plan:before{content:"";position:absolute;inset:16px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px);background-size:30px 30px;opacity:.62;pointer-events:none}
        .rwg-renovated-plan-head,.rwg-renovated-plan-foot{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px}
        .rwg-renovated-plan-head span{width:52px;aspect-ratio:1;border-radius:16px;display:grid;place-items:center;background:var(--tone);color:#061316;font-weight:950;box-shadow:0 16px 36px color-mix(in srgb,var(--tone),transparent 62%)}
        .rwg-renovated-plan-head strong{font-size:clamp(18px,2vw,24px);line-height:1.1;color:#fff;text-align:right}
        .rwg-renovated-plan-foot{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.48);font-weight:900}
        .rwg-renovated-plan-body{position:relative;z-index:1;margin:18px 0;border-radius:18px;border:2px solid rgba(199,249,210,.62);background:linear-gradient(145deg,rgba(8,47,56,.64),rgba(3,21,26,.38));box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);transform:perspective(900px) rotateX(55deg) rotateZ(-34deg) translateY(20px);transform-origin:center;animation:rwg-plan-breathe 7s ease-in-out infinite}
        .rwg-renovated-plan-body:before,.rwg-renovated-plan-body:after{content:"";position:absolute;background:rgba(199,249,210,.72);box-shadow:0 0 18px rgba(74,222,128,.26)}
        .rwg-renovated-plan-body:before{left:8%;right:8%;top:34%;height:3px}
        .rwg-renovated-plan-body:after{top:10%;bottom:10%;left:52%;width:3px}
        .rwg-plan-room{position:absolute;border:1px solid color-mix(in srgb,var(--tone),white 18%);border-radius:10px;background:linear-gradient(135deg,rgba(255,255,255,.18),rgba(255,255,255,.05));box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 14px 28px rgba(0,0,0,.22);display:grid;place-items:center;padding:8px;text-align:center;color:#061316;font-weight:950;font-size:11px;line-height:1.2;overflow:hidden}
        .rwg-plan-room span{position:relative;z-index:1}
        .rwg-plan-room.cyan{background:linear-gradient(135deg,#22d3ee,#0e7490);color:#031316}.rwg-plan-room.gold{background:linear-gradient(135deg,#f8d477,#b7791f);color:#1b1300}.rwg-plan-room.pink{background:linear-gradient(135deg,#f472b6,#be185d);color:#190310}.rwg-plan-room.green{background:linear-gradient(135deg,#34d399,#047857);color:#03170e}.rwg-plan-room.violet{background:linear-gradient(135deg,#a78bfa,#6d28d9);color:#100522}
        .rwg-plan-room.large{width:42%;height:44%}.rwg-plan-room.medium{width:30%;height:32%}.rwg-plan-room.small{width:20%;height:22%}.rwg-plan-room.wide{width:58%;height:22%}
        .rwg-plan-room.left{left:8%;top:12%}.rwg-plan-room.mid{left:31%;top:12%}.rwg-plan-room.upper{right:9%;top:10%}.rwg-plan-room.right{right:8%;top:18%}.rwg-plan-room.bottom{left:20%;bottom:9%}
        .rwg-plan-core{position:absolute;z-index:2;border:1px solid rgba(255,255,255,.22);background:rgba(3,21,26,.86);color:#f8d477;border-radius:8px;display:grid;place-items:center;font-size:10px;font-weight:950;text-transform:uppercase;box-shadow:0 12px 24px rgba(0,0,0,.28)}
        .rwg-plan-core.lift{width:13%;height:13%;left:44%;top:43%}.rwg-plan-core.stair{width:15%;height:28%;right:7%;top:46%;background:repeating-linear-gradient(0deg,rgba(248,212,119,.92) 0 3px,rgba(3,21,26,.88) 3px 9px)}.rwg-plan-core.stair-b{left:8%;right:auto;top:62%;height:24%}
        .rwg-floor-tower{position:relative;z-index:3;width:min(300px,70vw);justify-self:center;transform-style:preserve-3d;transform:rotateX(58deg) rotateZ(-30deg);animation:rwg-floor-float 8s ease-in-out infinite}
        .rwg-floor-slab{height:46px;margin:-2px 0;border-radius:14px;background:linear-gradient(135deg,color-mix(in srgb,var(--floor-tone),#03151a 70%),rgba(255,255,255,.12));border:1px solid color-mix(in srgb,var(--floor-tone),white 20%);box-shadow:0 12px 0 color-mix(in srgb,var(--floor-tone),#020617 72%),0 22px 42px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.2);transform:translateZ(calc(var(--floor-index) * 16px));display:flex;align-items:center;padding:0 18px;position:relative;overflow:hidden;opacity:.52;transition:opacity .35s ease,filter .35s ease}
        .rwg-floor-slab.is-active{opacity:1;filter:saturate(1.3) brightness(1.18)}
        .rwg-floor-slab:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);transform:translateX(-130%);animation:rwg-eco-shine 4.5s ease-in-out infinite;animation-delay:calc(var(--floor-index) * .35s)}
        .rwg-floor-slab span{font-size:28px;font-weight:950;color:var(--floor-tone);text-shadow:0 0 20px color-mix(in srgb,var(--floor-tone),transparent 55%)}
        .rwg-floor-glow{position:absolute;inset:auto 12% 8%;height:28%;border-radius:50%;background:radial-gradient(circle,rgba(34,211,238,.24),transparent 65%);filter:blur(18px);animation:rwg-eco-pulse 4s ease-in-out infinite}
        .rwg-floor-copy{display:grid;gap:24px}
        .rwg-floor-step{min-height:420px;border-radius:24px;padding:28px;display:grid;grid-template-columns:78px minmax(0,1fr);gap:22px;align-items:center;background:linear-gradient(135deg,rgba(255,255,255,.085),rgba(255,255,255,.035));border:1px solid rgba(255,255,255,.11);box-shadow:0 24px 80px rgba(0,0,0,.24);position:relative;overflow:hidden;animation:rwg-floor-rise both linear;animation-timeline:view();animation-range:entry 8% cover 42%;transition:border-color .35s ease,box-shadow .35s ease,transform .35s ease}
        .rwg-floor-step.is-active{border-color:color-mix(in srgb,var(--tone),white 18%);box-shadow:0 28px 90px color-mix(in srgb,var(--tone),transparent 78%),0 24px 80px rgba(0,0,0,.24)}
        .rwg-floor-step:before{content:"";position:absolute;inset:auto -60px -90px auto;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,var(--tone),transparent 68%);opacity:.2}
        .rwg-floor-step-number{width:76px;aspect-ratio:1;border-radius:22px;display:grid;place-items:center;color:#071316;background:var(--tone);font-weight:950;font-size:26px;box-shadow:0 20px 46px color-mix(in srgb,var(--tone),transparent 68%)}
        .rwg-floor-step svg{width:38px;height:38px;color:var(--tone);margin-bottom:18px}
        .rwg-floor-step h3{font-size:clamp(26px,3vw,38px);line-height:1.05;margin:0 0 12px;color:#fff;letter-spacing:0}
        .rwg-floor-step small{display:block;color:#f8d477;font-size:14px;line-height:1.5;font-weight:900;margin-bottom:14px}
        .rwg-floor-step p{font-size:17px;line-height:1.65;color:rgba(255,255,255,.68);margin:0;max-width:620px}
        .rwg-floor-mini-scene{position:relative;z-index:1;grid-column:1 / -1;min-height:300px;aspect-ratio:1.75;border-radius:22px;overflow:hidden;background:radial-gradient(circle at 35% 25%,color-mix(in srgb,var(--tone),transparent 62%),transparent 35%),linear-gradient(145deg,rgba(4,21,27,.72),rgba(8,47,56,.46));border:1px solid color-mix(in srgb,var(--tone),rgba(255,255,255,.12) 36%);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 24px 64px rgba(0,0,0,.28)}
        .rwg-floor-mini-scene:before{content:"";position:absolute;inset:12px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px);background-size:28px 28px;opacity:.55;pointer-events:none}
        .rwg-floor-mini-scene:after{content:"";position:absolute;inset:auto 14% 10%;height:22%;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--tone),transparent 38%),transparent 68%);filter:blur(18px);opacity:.7;pointer-events:none}
        .rwg-floor-mini-scene canvas{position:relative;z-index:1;width:100%;height:100%;display:block}
        .rwg-floor-mini-scene span{position:absolute;left:16px;top:14px;z-index:2;width:44px;aspect-ratio:1;border-radius:15px;display:grid;place-items:center;background:var(--tone);color:#061316;font-size:14px;font-weight:950;box-shadow:0 14px 34px color-mix(in srgb,var(--tone),transparent 58%)}
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
        .rwg-eco-location{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,420px);gap:18px;align-items:stretch}
        .rwg-eco-address{min-height:220px;display:flex;flex-direction:column;justify-content:space-between;gap:18px}
        .rwg-eco-address-row{display:grid;grid-template-columns:44px 1fr;gap:12px;align-items:start}
        .rwg-eco-address-row svg{width:30px;height:30px;color:#f8d477;margin-top:3px}
        .rwg-eco-address strong{display:block;color:#fff;font-size:18px;margin-bottom:8px}
        .rwg-eco-address span{display:block;color:rgba(255,255,255,.66);line-height:1.6}
        .rwg-eco-map-card{position:relative;min-height:220px;border-radius:22px;overflow:hidden;border:1px solid rgba(34,211,238,.18);background:linear-gradient(135deg,rgba(34,211,238,.18),rgba(248,212,119,.1)),rgba(255,255,255,.055);box-shadow:0 24px 80px rgba(0,0,0,.28);display:grid;place-items:center;text-decoration:none;color:#fff}
        .rwg-eco-map-card:before{content:"";position:absolute;inset:22px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px);background-size:38px 38px;mask-image:radial-gradient(circle at center,#000,transparent 74%)}
        .rwg-eco-map-pin{position:relative;z-index:1;width:88px;height:88px;border-radius:50%;display:grid;place-items:center;background:rgba(248,212,119,.16);border:1px solid rgba(248,212,119,.42);box-shadow:0 0 44px rgba(248,212,119,.22);animation:rwg-eco-pulse 2.8s ease-in-out infinite}
        .rwg-eco-map-pin svg{width:44px;height:44px;color:#f8d477}
        .rwg-eco-map-card span{position:absolute;left:18px;right:18px;bottom:18px;z-index:1;font-weight:900;color:#fff;text-align:center}
        .rwg-eco-disclaimer{max-width:1180px;margin:0 auto 42px;padding:18px;border-radius:18px;border:1px solid rgba(248,212,119,.25);background:rgba(248,212,119,.07);display:grid;grid-template-columns:32px 1fr;gap:12px;color:rgba(255,255,255,.72);font-size:12px;line-height:1.55}
        .rwg-eco-disclaimer svg{width:26px;height:26px;color:#f8d477}
        .rwg-eco-footer{border-top:1px solid rgba(255,255,255,.08);padding:26px 18px 90px;color:rgba(255,255,255,.5)}
        .rwg-eco-footer-inner{max-width:1180px;margin:0 auto;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;font-size:12px}
        .rwg-eco-mobile-bar{display:none}
        @keyframes rwg-eco-hover{0%,100%{transform:rotateX(58deg) rotateZ(-28deg) translateY(0)}50%{transform:rotateX(58deg) rotateZ(-28deg) translateY(-12px)}}
        @keyframes rwg-eco-shine{0%,35%{transform:translateX(-120%)}65%,100%{transform:translateX(120%)}}
        @keyframes rwg-eco-spin{to{rotate:360deg}}
        @keyframes rwg-eco-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes rwg-eco-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes rwg-floor-float{0%,100%{transform:rotateX(58deg) rotateZ(-30deg) translateY(0)}50%{transform:rotateX(58deg) rotateZ(-30deg) translateY(-14px)}}
        @keyframes rwg-floor-rise{0%{opacity:.35;transform:translateY(48px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes rwg-plan-breathe{0%,100%{transform:perspective(900px) rotateX(55deg) rotateZ(-34deg) translateY(20px)}50%{transform:perspective(900px) rotateX(57deg) rotateZ(-31deg) translateY(8px)}}
        @media(max-width:1020px){.rwg-eco-links{display:none}.rwg-eco-hero,.rwg-eco-split,.rwg-eco-blindbox,.rwg-eco-location,.rwg-floor-story{grid-template-columns:1fr}.rwg-eco-hero{padding-top:42px}.rwg-eco-stage{min-height:500px;order:-1}.rwg-floor-visual{position:relative;top:auto;min-height:430px}.rwg-floor-step{grid-template-columns:76px minmax(0,1fr);}.rwg-floor-mini-scene{min-height:320px}.rwg-eco-invest-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rwg-eco-pets{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:680px){.rwg-eco-nav-inner{padding:10px 14px}.rwg-eco-brand span{display:none}.rwg-eco-actions{display:none}.rwg-eco-hero{display:flex;flex-direction:column;padding:26px 14px 28px;gap:18px;overflow:hidden;width:100%;max-width:100vw}.rwg-eco-hero>div{width:100%;min-width:0}.rwg-eco-hero h1{font-size:clamp(36px,12vw,46px);max-width:100%;overflow-wrap:normal}.rwg-eco-hero p{font-size:15px;max-width:100%;overflow-wrap:break-word}.rwg-eco-hero-ctas{display:grid;grid-template-columns:1fr;width:100%}.rwg-eco-proof{grid-template-columns:1fr;width:100%}.rwg-eco-stage{min-height:390px;width:100%;max-width:100%;min-width:0;overflow:hidden}.rwg-eco-building{width:260px;transform:rotateX(58deg) rotateZ(-24deg)}.rwg-eco-floor{height:64px;border-radius:14px;padding:0 16px}.rwg-eco-floor span{font-size:20px}.rwg-eco-floor strong{font-size:11px}.rwg-eco-floor small{display:none}.rwg-eco-pet-boy{width:86px;right:8px;top:54px}.rwg-eco-pet-baby{width:82px;left:4px;bottom:54px}.rwg-eco-box{width:118px;right:8px;bottom:36px;border-radius:14px}.orbit-one{width:286px;height:110px}.orbit-two{width:210px;height:80px}.rwg-eco-section{padding:40px 14px;overflow:hidden;width:100%;max-width:100vw}.rwg-eco-section-head{display:block}.rwg-eco-section-head p{margin-top:10px}.rwg-eco-invest-grid,.rwg-eco-audience,.rwg-eco-pets,.rwg-eco-calc-grid,.rwg-eco-location{grid-template-columns:1fr}.rwg-floor-visual{min-height:330px}.rwg-floor-tower{width:246px}.rwg-floor-slab{height:54px;border-radius:14px;padding:0 16px}.rwg-floor-slab span{font-size:20px}.rwg-floor-step{min-height:auto;grid-template-columns:1fr;padding:20px}.rwg-floor-step-number{width:58px;border-radius:16px;font-size:20px}.rwg-floor-step p{font-size:14px}.rwg-floor-mini-scene{min-height:250px;aspect-ratio:1}.rwg-eco-panel,.rwg-eco-calculator{padding:18px}.rwg-eco-mobile-bar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:50;padding:10px 12px 18px;background:rgba(3,21,26,.94);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.12);gap:10px}.rwg-eco-mobile-bar button{flex:1;min-width:0;padding-left:8px;padding-right:8px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rwg-eco-footer{padding-bottom:105px}}
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
        <FloorScrollStory floors={floors} />
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

      <section className="rwg-eco-section" id="location">
        <div className="rwg-eco-section-head">
          <h2>{copy.locationTitle}</h2>
          <p>{copy.locationIntro}</p>
        </div>
        <div className="rwg-eco-location">
          <div className="rwg-eco-panel rwg-eco-address">
            <div className="rwg-eco-address-row">
              <MapPin />
              <div>
                <strong>Ruko Oceanic Bliss</strong>
                <span>{clubAddress}</span>
              </div>
            </div>
            <a className="rwg-eco-primary" href={googleMapUrl} rel="noreferrer" target="_blank">
              {copy.locationCta} <ArrowRight size={17} />
            </a>
          </div>
          <a className="rwg-eco-map-card" href={googleMapUrl} rel="noreferrer" target="_blank">
            <div className="rwg-eco-map-pin">
              <MapPin />
            </div>
            <span>{copy.locationCta}</span>
          </a>
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
