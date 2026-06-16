import type { Language } from "@/lib/i18n";

type Copy = Record<string, Record<Language, string>>;

export const investorCopy: Copy = {
  "investor.portal": { en: "Investor Portal", zh: "投资人入口", id: "Portal Investor" },
  "investor.login": { en: "Investor Login", zh: "投资人登录", id: "Login Investor" },
  "investor.start": { en: "Start investor access", zh: "开始投资人账户", id: "Mulai akses investor" },
  "investor.dashboard.open": { en: "Open dashboard", zh: "打开后台", id: "Buka dashboard" },
  "investor.hero.title": {
    en: "Choose the project. Earn the project token.",
    zh: "选择项目，赚取项目 Token。",
    id: "Pilih proyek. Dapatkan token proyek.",
  },
  "investor.hero.body": {
    en: "A separate investor system for Reborn Wave Group: USDT BEP20 top-up, $500 to $10,000 packages, project allocation units, referral rewards, live pool pricing, daily tokens, and club QR spending.",
    zh: "Reborn Wave Group 独立投资人系统：USDT BEP20 充值、$500 到 $10,000 投资配套、项目单位分配、推荐奖励、实时资金池价格、每日 Token 与俱乐部 QR 消费。",
    id: "Sistem investor khusus Reborn Wave Group: top-up USDT BEP20, paket $500 sampai $10.000, unit alokasi proyek, reward referral, harga pool live, token harian, dan belanja QR di klub.",
  },
  "investor.badge.usdt": { en: "USDT BEP20", zh: "USDT BEP20", id: "USDT BEP20" },
  "investor.badge.pool": { en: "Global token pool", zh: "全局 Token 池", id: "Pool token global" },
  "investor.badge.withdrawals": { en: "Admin-controlled withdrawals", zh: "管理员审核提现", id: "Penarikan dikontrol admin" },
  "investor.livePoolPrice": { en: "Live pool price", zh: "实时资金池价格", id: "Harga pool live" },
  "investor.every500": { en: "Every $500 = 1 project unit", zh: "每 $500 = 1 个项目单位", id: "Setiap $500 = 1 unit proyek" },
  "investor.assignUnits": {
    en: "Buy packages from cash wallet, then assign units your way.",
    zh: "用现金钱包购买配套，然后自由分配单位。",
    id: "Beli paket dari dompet cash, lalu alokasikan unit sesuai pilihan.",
  },
  "investor.legalNote": {
    en: "Profit-pool, token value, and referral terms require qualified legal and financial review before public launch.",
    zh: "利润池、Token 价值与推荐条款在公开推出前需要专业法律与财务审核。",
    id: "Profit pool, nilai token, dan referral perlu ditinjau legal dan finansial sebelum diluncurkan publik.",
  },
  "investor.packages.title": { en: "Investor packages", zh: "投资配套", id: "Paket investor" },
  "investor.packages.body": {
    en: "Admin controls active packages. Investors choose businesses and allocate units themselves.",
    zh: "管理员控制可用配套。投资人自行选择业务并分配单位。",
    id: "Admin mengatur paket aktif. Investor memilih bisnis dan mengalokasikan unit sendiri.",
  },
  "investor.units": { en: "allocation units", zh: "分配单位", id: "unit alokasi" },

  "investor.login.title": { en: "Separate investor login.", zh: "独立投资人登录。", id: "Login investor terpisah." },
  "investor.login.body": {
    en: "This area is for investment packages, project tokens, cash wallet, spending wallet, referrals, and QR club payments.",
    zh: "这里用于投资配套、项目 Token、现金钱包、消费钱包、推荐与俱乐部 QR 支付。",
    id: "Area ini untuk paket investasi, token proyek, dompet cash, dompet belanja, referral, dan pembayaran QR klub.",
  },
  "investor.access": { en: "Investor access", zh: "投资人账户", id: "Akses investor" },
  "investor.register": { en: "Register", zh: "注册", id: "Daftar" },
  "investor.email": { en: "Email", zh: "邮箱", id: "Email" },
  "investor.password": { en: "Password", zh: "密码", id: "Password" },
  "investor.firstName": { en: "First name", zh: "名字", id: "Nama depan" },
  "investor.lastName": { en: "Last name", zh: "姓氏", id: "Nama belakang" },
  "investor.referralCode": { en: "Referral code", zh: "推荐码", id: "Kode referral" },
  "investor.signingIn": { en: "Signing in...", zh: "登录中...", id: "Sedang login..." },
  "investor.loginDashboard": { en: "Login to dashboard", zh: "登录后台", id: "Login ke dashboard" },
  "investor.creating": { en: "Creating account...", zh: "创建账户中...", id: "Membuat akun..." },
  "investor.createAccount": { en: "Create investor account", zh: "创建投资人账户", id: "Buat akun investor" },
  "investor.loginFailed": { en: "Login failed", zh: "登录失败", id: "Login gagal" },
  "investor.registerFailed": { en: "Registration failed", zh: "注册失败", id: "Pendaftaran gagal" },

  "investor.dashboard": { en: "Investor Dashboard", zh: "投资人后台", id: "Dashboard Investor" },
  "investor.home": { en: "Investor home", zh: "投资首页", id: "Beranda investor" },
  "investor.refresh": { en: "Refresh", zh: "刷新", id: "Refresh" },
  "investor.cashWallet": { en: "Cash wallet", zh: "现金钱包", id: "Dompet cash" },
  "investor.spendingWallet": { en: "Spending wallet", zh: "消费钱包", id: "Dompet belanja" },
  "investor.globalPool": { en: "Global pool", zh: "全局资金池", id: "Pool global" },
  "investor.tokenPrice": { en: "Token price", zh: "Token 价格", id: "Harga token" },
  "investor.topupBuy": { en: "Top-up & Buy", zh: "充值与购买", id: "Top-up & Beli" },
  "investor.tokens": { en: "Tokens", zh: "Token", id: "Token" },
  "investor.qrSpend": { en: "QR Spend", zh: "QR 消费", id: "Belanja QR" },
  "investor.history": { en: "History", zh: "历史记录", id: "Riwayat" },
  "investor.selectTopup": { en: "1. Select package and top up with USDT", zh: "1. 选择配套并用 USDT 充值", id: "1. Pilih paket dan top-up USDT" },
  "investor.choosePackage": { en: "Choose package", zh: "选择配套", id: "Pilih paket" },
  "investor.packageUnitsNote": {
    en: "allocation unit(s). Top-up sends USDT to admin wallet, then credits your cash wallet.",
    zh: "个分配单位。充值会把 USDT 转到管理员钱包，然后入账到现金钱包。",
    id: "unit alokasi. Top-up mengirim USDT ke dompet admin, lalu masuk ke dompet cash.",
  },
  "investor.connectPay": { en: "Connect wallet and pay USDT", zh: "连接钱包并支付 USDT", id: "Hubungkan wallet dan bayar USDT" },
  "investor.manualTx": { en: "Manual tx hash fallback", zh: "手动交易哈希备用", id: "Fallback hash transaksi manual" },
  "investor.credit": { en: "Credit", zh: "入账", id: "Kredit" },
  "investor.allocateBuy": { en: "2. Allocate units and buy package", zh: "2. 分配单位并购买配套", id: "2. Alokasi unit dan beli paket" },
  "investor.allocated": { en: "Allocated", zh: "已分配", id: "Dialokasikan" },
  "investor.buyCash": { en: "Buy from cash wallet", zh: "用现金钱包购买", id: "Beli dari dompet cash" },
  "investor.projectBalances": { en: "Project token balances", zh: "项目 Token 余额", id: "Saldo token proyek" },
  "investor.claimedToday": { en: "Claimed today", zh: "今日已领取", id: "Sudah klaim hari ini" },
  "investor.claimDaily": { en: "Claim daily project tokens", zh: "领取每日项目 Token", id: "Klaim token proyek harian" },
  "investor.sold": { en: "Sold", zh: "已售", id: "Terjual" },
  "investor.sellTokensPanel": { en: "Sell tokens to cash wallet", zh: "出售 Token 到现金钱包", id: "Jual token ke dompet cash" },
  "investor.project": { en: "Project", zh: "项目", id: "Proyek" },
  "investor.chooseProjectToken": { en: "Choose project token", zh: "选择项目 Token", id: "Pilih token proyek" },
  "investor.tokensToSell": { en: "Tokens to sell", zh: "出售 Token 数量", id: "Token yang dijual" },
  "investor.currentPrice": { en: "Current price", zh: "当前价格", id: "Harga saat ini" },
  "investor.perToken": { en: "per token", zh: "每个 Token", id: "per token" },
  "investor.sellTokens": { en: "Sell tokens", zh: "出售 Token", id: "Jual token" },
  "investor.showQr": { en: "Show this QR to merchant", zh: "向商家出示此 QR", id: "Tunjukkan QR ini ke merchant" },
  "investor.qrNote": {
    en: "Merchant scans this QR and deducts from spending wallet. Spending wallet cannot be withdrawn.",
    zh: "商家扫描此 QR 后从消费钱包扣款。消费钱包不可提现。",
    id: "Merchant scan QR ini dan memotong dompet belanja. Dompet belanja tidak bisa ditarik.",
  },
  "investor.withdrawal": { en: "Cash wallet withdrawal", zh: "现金钱包提现", id: "Penarikan dompet cash" },
  "investor.amount": { en: "Amount", zh: "金额", id: "Jumlah" },
  "investor.payoutWallet": { en: "Payout wallet", zh: "收款钱包", id: "Wallet payout" },
  "investor.requestWithdrawal": { en: "Request withdrawal", zh: "申请提现", id: "Minta penarikan" },
  "investor.purchases": { en: "Purchases", zh: "购买记录", id: "Pembelian" },
  "investor.referralRewards": { en: "Referral rewards", zh: "推荐奖励", id: "Reward referral" },
  "investor.topups": { en: "Top-ups", zh: "充值记录", id: "Top-up" },
  "investor.withdrawals": { en: "Withdrawals", zh: "提现记录", id: "Penarikan" },
  "investor.noRecords": { en: "No records yet.", zh: "暂无记录。", id: "Belum ada catatan." },
  "investor.loadingDashboard": { en: "Loading investor dashboard...", zh: "投资人后台加载中...", id: "Memuat dashboard investor..." },

  "investor.admin.title": { en: "Investor Admin", zh: "投资管理后台", id: "Admin Investor" },
  "investor.admin.body": {
    en: "Manage packages, BEP20 wallet, spending QR payments, withdrawals, and pool history.",
    zh: "管理投资配套、BEP20 钱包、QR 消费、提现与资金池历史。",
    id: "Kelola paket, wallet BEP20, pembayaran QR, penarikan, dan riwayat pool.",
  },
  "investor.admin.loading": { en: "Loading investor admin...", zh: "投资管理后台加载中...", id: "Memuat admin investor..." },
  "investor.admin.activeTokens": { en: "Active tokens", zh: "活跃 Token", id: "Token aktif" },
  "investor.admin.packages": { en: "Packages", zh: "配套", id: "Paket" },
  "investor.admin.wallet": { en: "Wallet", zh: "钱包", id: "Wallet" },
  "investor.admin.withdrawals": { en: "Withdrawals", zh: "提现", id: "Penarikan" },
  "investor.admin.pool": { en: "Pool", zh: "资金池", id: "Pool" },
  "investor.admin.createPackage": { en: "Create package", zh: "创建配套", id: "Buat paket" },
  "investor.admin.editablePackages": { en: "Editable packages", zh: "可编辑配套", id: "Paket dapat diedit" },
  "investor.admin.name": { en: "Name", zh: "名称", id: "Nama" },
  "investor.admin.amountUsdt": { en: "Amount USDT", zh: "USDT 金额", id: "Jumlah USDT" },
  "investor.admin.description": { en: "Description", zh: "说明", id: "Deskripsi" },
  "investor.admin.active": { en: "Active", zh: "启用", id: "Aktif" },
  "investor.admin.disable": { en: "Disable", zh: "停用", id: "Nonaktifkan" },
  "investor.admin.enable": { en: "Enable", zh: "启用", id: "Aktifkan" },
  "investor.admin.bep20Wallet": { en: "BEP20 admin wallet", zh: "BEP20 管理员钱包", id: "Wallet admin BEP20" },
  "investor.admin.current": { en: "Current", zh: "当前", id: "Saat ini" },
  "investor.admin.notSet": { en: "Not set", zh: "未设置", id: "Belum diset" },
  "investor.admin.saveWallet": { en: "Save wallet", zh: "保存钱包", id: "Simpan wallet" },
  "investor.admin.merchantCharge": { en: "Merchant scan charge", zh: "商家扫码扣款", id: "Tagihan scan merchant" },
  "investor.admin.investorQr": { en: "Investor QR code", zh: "投资人 QR 码", id: "Kode QR investor" },
  "investor.admin.chargeSpending": { en: "Charge spending wallet", zh: "扣消费钱包", id: "Potong dompet belanja" },
  "investor.admin.recentQr": { en: "Recent QR payments", zh: "最近 QR 支付", id: "Pembayaran QR terbaru" },
  "investor.admin.cashWithdrawals": { en: "Cash wallet withdrawals", zh: "现金钱包提现", id: "Penarikan dompet cash" },
  "investor.admin.approve": { en: "Approve", zh: "批准", id: "Setujui" },
  "investor.admin.reject": { en: "Reject", zh: "拒绝", id: "Tolak" },
  "investor.admin.poolEvents": { en: "Pool events", zh: "资金池记录", id: "Event pool" },
};

export function investorT(language: Language, key: string) {
  return investorCopy[key]?.[language] || investorCopy[key]?.en || key;
}

export function investorProjectName(language: Language, code: string, fallback: string) {
  const names: Record<string, Record<Language, string>> = {
    ktv_lounge: { en: "KTV Lounge", zh: "KTV 大厅", id: "KTV Lounge" },
    beauty: { en: "Beauty", zh: "美容", id: "Beauty" },
    game_house: { en: "Game House", zh: "游戏屋", id: "Game House" },
    live_house: { en: "Live House", zh: "Live House 现场音乐", id: "Live House" },
    pet_cafe: { en: "Pet Cafe", zh: "宠物咖啡厅", id: "Pet Cafe" },
  };
  return names[code]?.[language] || fallback;
}

export function investorProjectDescription(language: Language, code: string, fallback: string) {
  const descriptions: Record<string, Record<Language, string>> = {
    ktv_lounge: {
      en: "Private rooms, hosting, bottles, birthdays, singing competitions.",
      zh: "包厢、接待、酒水、生日派对、唱歌比赛。",
      id: "Ruang privat, hosting, botol, ulang tahun, kompetisi nyanyi.",
    },
    beauty: {
      en: "Salon services, glow-up packages, appointment traffic.",
      zh: "美容服务、妆造配套、预约客流。",
      id: "Layanan salon, paket glow-up, trafik appointment.",
    },
    game_house: {
      en: "Family-friendly games, kids traffic, tournaments, redemption play.",
      zh: "家庭游戏、儿童客流、比赛、兑换玩法。",
      id: "Game keluarga, trafik anak, turnamen, permainan redemption.",
    },
    live_house: {
      en: "Sea-view music, live band, dance floor, premium table nights.",
      zh: "海景音乐、现场乐队、舞池、高端桌位夜场。",
      id: "Musik sea-view, live band, dance floor, malam meja premium.",
    },
    pet_cafe: {
      en: "Doluruu-powered pet cafe, food, drinks, content, community.",
      zh: "Doluruu 宠物咖啡、餐饮、内容、社群。",
      id: "Pet cafe Doluruu, makanan, minuman, konten, komunitas.",
    },
  };
  return descriptions[code]?.[language] || fallback;
}

export function investorPackageName(language: Language, name: string) {
  const names: Record<string, Record<Language, string>> = {
    "Starter Unit": { en: "Starter Unit", zh: "入门单位", id: "Starter Unit" },
    "Builder Pack": { en: "Builder Pack", zh: "建设配套", id: "Builder Pack" },
    "Growth Pack": { en: "Growth Pack", zh: "成长配套", id: "Growth Pack" },
    "Founder Pack": { en: "Founder Pack", zh: "创始配套", id: "Founder Pack" },
    "Anchor Pack": { en: "Anchor Pack", zh: "核心配套", id: "Anchor Pack" },
  };
  return names[name]?.[language] || name;
}
