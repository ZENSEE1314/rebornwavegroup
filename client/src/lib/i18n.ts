import { useState, useEffect } from 'react';

export type Language = 'en' | 'zh' | 'id';

interface Translations {
  [key: string]: {
    en: string;
    zh: string;
    id: string;
  };
}

export const translations: Translations = {
  // Navigation & Common
  'nav.home': {
    en: 'Home',
    zh: '首页',
    id: 'Beranda'
  },
  'nav.pets': {
    en: 'My Pets',
    zh: '我的宠物',
    id: 'Hewan Peliharaan Saya'
  },
  'nav.profile': {
    en: 'Profile',
    zh: '个人资料',
    id: 'Profil'
  },
  'nav.shop': {
    en: 'Shop',
    zh: '商店',
    id: 'Toko'
  },
  'nav.rewards': {
    en: 'Rewards',
    zh: '奖励',
    id: 'Hadiah'
  },
  'nav.referrals': {
    en: 'Referrals',
    zh: '推荐',
    id: 'Rujukan'
  },
  'nav.admin': {
    en: 'Admin',
    zh: '管理员',
    id: 'Admin'
  },
  'nav.logout': {
    en: 'Logout',
    zh: '退出登录',
    id: 'Keluar'
  },
  'dashboard.logout': {
    en: 'Logout',
    zh: '退出登录',
    id: 'Keluar'
  },
  'dashboard.welcome': {
    en: 'Welcome back',
    zh: '欢迎回来',
    id: 'Selamat datang kembali'
  },
  'dashboard.points': {
    en: 'points',
    zh: '积分',
    id: 'poin'
  },
  'dashboard.credits': {
    en: 'Credits',
    zh: '积分',
    id: 'Kredit'
  },
  'dashboard.loyaltyPoints': {
    en: 'Loyalty Points',
    zh: '忠诚积分',
    id: 'Poin Loyalitas'
  },
  'dashboard.tokens': {
    en: 'Tokens',
    zh: '代币',
    id: 'Token'
  },
  'dashboard.referralEarnings': {
    en: 'Referral Earnings',
    zh: '推荐收益',
    id: 'Pendapatan Rujukan'
  },
  'dashboard.addCredits': {
    en: 'Add Credits',
    zh: '添加积分',
    id: 'Top Up Kredit'
  },
  'dashboard.cashOut': {
    en: 'Cash Out to Bank',
    zh: '提现到银行',
    id: 'Tarik ke Bank'
  },
  'dashboard.viewCredits': {
    en: 'View Credits',
    zh: '查看积分',
    id: 'Lihat Riwayat'
  },
  'dashboard.viewRewards': {
    en: 'View Rewards',
    zh: '查看奖励',
    id: 'Lihat Reward'
  },
  'dashboard.claimTokens': {
    en: 'Claim Tokens',
    zh: '领取代币',
    id: 'Klaim Token'
  },
  'dashboard.viewHistory': {
    en: 'View History',
    zh: '查看历史',
    id: 'Lihat Riwayat'
  },
  // Pet Care Section
  'petCare.title': {
    en: 'Pet Care',
    zh: '宠物护理',
    id: 'Perawatan Hewan'
  },
  'petCare.feeding': {
    en: 'Feed Pet',
    zh: '喂养宠物',
    id: 'Beri Makan'
  },
  'petCare.bathing': {
    en: 'Bathe Pet',
    zh: '给宠物洗澡',
    id: 'Mandikan Hewan'
  },
  'petCare.playing': {
    en: 'Play with Pet',
    zh: '和宠物玩耍',
    id: 'Bermain'
  },
  'petCare.exercising': {
    en: 'Exercise Pet',
    zh: '锻炼宠物',
    id: 'Olahraga'
  },
  'petCare.sleeping': {
    en: 'Put to Sleep',
    zh: '让宠物睡觉',
    id: 'Tidur'
  },
  'petCare.cleaning': {
    en: 'Clean Pet',
    zh: '清洁宠物',
    id: 'Bersihkan'
  },
  // Purchase Verification
  'purchase.title': {
    en: 'Purchase Verification',
    zh: '购买验证',
    id: 'Verifikasi Pembelian'
  },
  'purchase.description': {
    en: 'Upload purchase receipts to earn loyalty points',
    zh: '上传购买收据以获得忠诚度积分',
    id: 'Upload bukti pembelian untuk mendapatkan poin loyalitas'
  },
  'purchase.uploadReceipt': {
    en: 'Upload Receipt',
    zh: '上传收据',
    id: 'Upload Struk'
  },
  'purchase.pendingVerification': {
    en: 'Pending Verification',
    zh: '等待验证',
    id: 'Menunggu Verifikasi'
  },
  'purchase.status.approved': {
    en: 'Approved',
    zh: '已批准',
    id: 'Disetujui'
  },
  'purchase.status.rejected': {
    en: 'Rejected',
    zh: '已拒绝',
    id: 'Ditolak'
  },
  'purchase.status.pending': {
    en: 'Pending',
    zh: '等待中',
    id: 'Menunggu'
  },
  'purchase.submitError': {
    en: 'Failed to submit verification',
    zh: '提交验证失败',
    id: 'Gagal mengirim verifikasi'
  },
  'purchase.pointsEarned': {
    en: 'Points earned: ',
    zh: '获得积分：',
    id: 'Poin diperoleh: '
  },
  'purchase.adminNotes': {
    en: 'Admin notes: ',
    zh: '管理员备注：',
    id: 'Catatan admin: '
  },
  'pagination.previous': {
    en: 'Previous',
    zh: '上一页',
    id: 'Sebelumnya'
  },
  'pagination.next': {
    en: 'Next',
    zh: '下一页',
    id: 'Selanjutnya'
  },
  'pagination.showing': {
    en: 'Showing',
    zh: '显示',
    id: 'Menampilkan'
  },
  'pagination.to': {
    en: ' to ',
    zh: ' 至 ',
    id: ' sampai '
  },
  'pagination.of': {
    en: ' of ',
    zh: ' 共 ',
    id: ' dari '
  },
  'pagination.verifications': {
    en: ' verifications',
    zh: ' 验证',
    id: ' verifikasi'
  },
  // Loyalty Program
  'loyalty.redeemPoints': {
    en: 'Redeem Points',
    zh: '兑换积分',
    id: 'Tukar Poin'
  },
  'loyalty.availableRewards': {
    en: 'Available Rewards',
    zh: '可用奖励',
    id: 'Reward Tersedia'
  },
  // Booking Management
  'booking.title': {
    en: 'Booking Management',
    zh: '预订管理',
    id: 'Manajemen Booking'
  },
  'booking.quickBooking': {
    en: 'Quick Booking',
    zh: '快速预订',
    id: 'Reservasi Cepat'
  },
  'booking.selectCategory': {
    en: 'Select Category',
    zh: '选择类别',
    id: 'Pilih Kategori'
  },
  'booking.selectService': {
    en: 'Select Service',
    zh: '选择服务',
    id: 'Pilih Layanan'
  },
  'booking.bookNow': {
    en: 'Book Now',
    zh: '立即预订',
    id: 'Booking Sekarang'
  },
  // Toy Marketplace
  'marketplace.buyToys': {
    en: 'Buy Toys',
    zh: '购买玩具',
    id: 'Beli Mainan'
  },
  'marketplace.noToysAvailable': {
    en: 'No toys available',
    zh: '暂无玩具',
    id: 'Tidak ada mainan tersedia'
  },
  // My Toy Collection
  'collection.title': {
    en: 'My Toy Collection',
    zh: '我的玩具收藏',
    id: 'Koleksi Mainan Saya'
  },
  'collection.noToys': {
    en: 'No toys in your collection',
    zh: '您的收藏中没有玩具',
    id: 'Tidak ada mainan di koleksi Anda'
  },
  // Referral Program
  'referral.title': {
    en: 'Referral Program',
    zh: '推荐计划',
    id: 'Program Rujukan'
  },
  'referral.yourCode': {
    en: 'Your Referral Code',
    zh: '您的推荐码',
    id: 'Kode Rujukan Anda'
  },
  'referral.shareCode': {
    en: 'Share Code',
    zh: '分享代码',
    id: 'Bagikan Kode'
  },
  'referral.totalReferrals': {
    en: 'Total Referrals',
    zh: '总推荐数',
    id: 'Total Rujukan'
  },
  // Profile
  'profile.title': {
    en: 'Your Profile',
    zh: '您的资料',
    id: 'Profil Anda'
  },
  'profile.personalInfo': {
    en: 'Personal Information',
    zh: '个人信息',
    id: 'Informasi Pribadi'
  },
  'profile.updateProfile': {
    en: 'Update Profile',
    zh: '更新资料',
    id: 'Update Profil'
  },
  'common.save': {
    en: 'Save',
    zh: '保存',
    id: 'Simpan'
  },
  'common.cancel': {
    en: 'Cancel',
    zh: '取消',
    id: 'Batal'
  },
  'common.delete': {
    en: 'Delete',
    zh: '删除',
    id: 'Hapus'
  },
  'common.edit': {
    en: 'Edit',
    zh: '编辑',
    id: 'Edit'
  },
  'common.loading': {
    en: 'Loading...',
    zh: '加载中...',
    id: 'Memuat...'
  },
  'common.error': {
    en: 'Error',
    zh: '错误',
    id: 'Error'
  },
  'common.success': {
    en: 'Success',
    zh: '成功',
    id: 'Berhasil'
  },
  'common.confirm': {
    en: 'Confirm',
    zh: '确认',
    id: 'Konfirmasi'
  },
  'common.close': {
    en: 'Close',
    zh: '关闭',
    id: 'Tutup'
  },
  
  // Landing Page
  'landing.title': {
    en: 'Reborn Wave Group',
    zh: '重生波浪集团',
    id: 'Reborn Wave Group'
  },
  'landing.description': {
    en: 'Care for virtual dragons, earn tokens, and build your collection in this immersive pet care experience.',
    zh: '照顾虚拟龙，赚取代币，在这个身临其境的宠物护理体验中建立您的收藏。',
    id: 'Rawat naga virtual, dapatkan token, dan bangun koleksi Anda dalam pengalaman perawatan hewan yang imersif ini.'
  },
  'landing.getStarted': {
    en: 'Get Started',
    zh: '开始使用',
    id: 'Mulai'
  },
  'landing.login': {
    en: 'Login',
    zh: '登录',
    id: 'Masuk'
  },
  'landing.features.title': {
    en: 'Amazing Features',
    zh: '惊人功能',
    id: 'Fitur Menakjubkan'
  },
  'landing.features.petCare': {
    en: 'Pet Care System',
    zh: '宠物护理系统',
    id: 'Sistem Perawatan Hewan'
  },
  'landing.features.petCareDesc': {
    en: 'Feed, bathe, play, and train your virtual dragons',
    zh: '喂养、洗澡、玩耍和训练您的虚拟龙',
    id: 'Beri makan, mandikan, bermain, dan latih naga virtual Anda'
  },
  'landing.features.evolution': {
    en: 'Evolution System',
    zh: '进化系统',
    id: 'Sistem Evolusi'
  },
  'landing.features.evolutionDesc': {
    en: 'Watch your pets grow through 6 unique life stages',
    zh: '观看您的宠物通过6个独特的生命阶段成长',
    id: 'Saksikan hewan peliharaan Anda tumbuh melalui 6 tahap kehidupan yang unik'
  },
  'landing.features.rewards': {
    en: 'Token Rewards',
    zh: '代币奖励',
    id: 'Hadiah Token'
  },
  'landing.features.rewardsDesc': {
    en: 'Earn daily tokens and redeem for exclusive rewards',
    zh: '赚取每日代币并兑换独家奖励',
    id: 'Dapatkan token harian dan tukarkan dengan hadiah eksklusif'
  },

  // Landing Page
  'landing.platformSubtitle': {
    en: 'Premium Digital Platform',
    zh: '优质数字平台',
    id: 'Platform Digital Premium'
  },
  'landing.subtitle': {
    en: 'The Future of Beauty, Food & Beverage & Entertainment',
    zh: '美容、餐饮和娱乐的未来',
    id: 'Masa Depan Kecantikan, Makanan & Minuman & Hiburan'
  },
  'landing.aboutCompany': {
    en: 'About Reborn Wave Group',
    zh: '关于重生浪潮集团',
    id: 'Tentang Reborn Wave Group'
  },
  'landing.aboutDescription': {
    en: "The world's first 5-in-1 business concept revolutionizing lifestyle experiences",
    zh: '世界首个5合1商业概念，革新生活方式体验',
    id: 'Konsep bisnis 5-in-1 pertama di dunia yang merevolusi pengalaman gaya hidup'
  },
  'landing.ourVision': {
    en: 'Our Vision',
    zh: '我们的愿景',
    id: 'Visi Kami'
  },
  'landing.visionText1': {
    en: 'Based in Singapore, Reborn Wave Group is pioneering the world\'s first 5-in-1 business concept that seamlessly integrates beauty, food & beverage, gaming, KTV, and cutting-edge IT solutions into one extraordinary destination.',
    zh: '总部位于新加坡，重生浪潮集团开创了世界首个5合1商业概念，将美容、餐饮、游戏、KTV和前沿IT解决方案无缝整合为一个非凡目的地。',
    id: 'Bermarkas di Singapura, Reborn Wave Group memelopori konsep bisnis 5-in-1 pertama di dunia yang mengintegrasikan kecantikan, makanan & minuman, gaming, KTV, dan solusi IT canggih menjadi satu destinasi luar biasa.'
  },
  'landing.enterFuture': {
    en: 'Enter the Future',
    zh: '进入未来',
    id: 'Masuki Masa Depan'
  },
  'landing.exploreServices': {
    en: 'Explore Services',
    zh: '探索服务',
    id: 'Jelajahi Layanan'
  },
  'landing.fourSectors': {
    en: 'Four Revolutionary Sectors',
    zh: '四大革命性领域',
    id: 'Empat Sektor Revolusioner'
  },
  'landing.sectorsDescription': {
    en: 'Discover premium services designed for the modern lifestyle',
    zh: '发现为现代生活方式设计的优质服务',
    id: 'Temukan layanan premium yang dirancang untuk gaya hidup modern'
  },
  'landing.beautyWellness': {
    en: 'Beauty & Wellness',
    zh: '美容与健康',
    id: 'Kecantikan & Kesehatan'
  },
  'landing.beautyDescription': {
    en: 'Professional beauty treatments, wellness consultations, and premium spa services. Experience luxury skincare, rejuvenating therapies, and personalized beauty solutions.',
    zh: '专业美容护理、健康咨询和优质水疗服务。体验奢华护肤、焕活疗法和个性化美容解决方案。',
    id: 'Perawatan kecantikan profesional, konsultasi kesehatan, dan layanan spa premium. Rasakan perawatan kulit mewah, terapi peremajaan, dan solusi kecantikan yang dipersonalisasi.'
  },
  'landing.foodBeverage': {
    en: 'Food & Beverage',
    zh: '餐饮',
    id: 'Makanan & Minuman'
  },
  'landing.foodDescription': {
    en: 'Premium culinary experiences, artisan coffee, craft beverages, and gourmet dining services. Savor exceptional flavors and enjoy memorable dining moments with friends and family.',
    zh: '优质烹饪体验、精品咖啡、精酿饮品和美食餐饮服务。品味非凡口味，与朋友和家人享受难忘的用餐时光。',
    id: 'Pengalaman kuliner premium, kopi artisan, minuman craft, dan layanan fine dining. Nikmati rasa istimewa dan momen makan berkesan bersama teman dan keluarga.'
  },
  'landing.entertainment': {
    en: 'Entertainment & Gaming',
    zh: '娱乐与游戏',
    id: 'Hiburan & Gaming'
  },
  'landing.entertainmentDescription': {
    en: 'Premium entertainment experiences, gaming lounges, collectible trading, and exclusive events. Immerse yourself in cutting-edge entertainment technology and community experiences.',
    zh: '优质娱乐体验、游戏休息室、收藏品交易和独家活动。沉浸在前沿娱乐技术和社区体验中。',
    id: 'Pengalaman hiburan premium, gaming lounge, perdagangan koleksi, dan acara eksklusif. Nikmati teknologi hiburan canggih dan pengalaman komunitas.'
  },
  'landing.corporateEvents': {
    en: 'Corporate Events',
    zh: '企业活动',
    id: 'Acara Korporat'
  },
  'landing.corporateDescription': {
    en: 'Professional event planning, corporate retreats, team building activities, and business conferences. Create memorable corporate experiences that strengthen relationships and drive success.',
    zh: '专业活动策划、企业度假、团队建设活动和商务会议。创造难忘的企业体验，加强关系并推动成功。',
    id: 'Perencanaan acara profesional, corporate retreat, kegiatan team building, dan konferensi bisnis. Ciptakan pengalaman korporat berkesan yang memperkuat hubungan dan mendorong kesuksesan.'
  },
  'landing.inviteFriends': {
    en: 'Invite Friends & Gain More Rewards',
    zh: '邀请朋友获得更多奖励',
    id: 'Undang Teman & Dapatkan Lebih Banyak Hadiah'
  },
  'landing.shareWithFriends': {
    en: 'Share with Friends',
    zh: '与朋友分享',
    id: 'Bagikan dengan Teman'
  },
  'landing.referralDescription': {
    en: 'Invite your friends and earn 10% commission every time they spend on our platform.',
    zh: '邀请您的朋友，每次他们在我们平台消费时获得10%佣金。',
    id: 'Undang teman Anda dan dapatkan komisi 10% setiap kali mereka berbelanja di platform kami.'
  },

  'landing.visionText2': {
    en: 'Our venue features breathtaking scenery including a sky bar with stunning sea views, beautiful night lighting, and Instagram-worthy photo spots throughout the facility.',
    zh: '我们的场地拥有令人叹为观止的景色，包括带有令人惊叹海景的天空酒吧、美丽的夜间照明，以及遍布整个设施的Instagram风格拍照点。',
    id: 'Venue kami menampilkan pemandangan menakjubkan termasuk sky bar dengan pemandangan laut yang menawan, pencahayaan malam yang indah, dan spot foto yang layak untuk Instagram di seluruh fasilitas.'
  },
  'landing.conceptTitle': {
    en: '5-in-1 Concept',
    zh: '五合一概念',
    id: 'Konsep 5-in-1'
  },
  'landing.conceptDescription': {
    en: 'Beauty • F&B • Gaming • KTV • IT Solutions',
    zh: '美容 • 餐饮 • 游戏 • KTV • IT解决方案',
    id: 'Kecantikan • F&B • Gaming • KTV • Solusi IT'
  },
  'landing.globalFirstTitle': {
    en: 'Global First',
    zh: '全球首创',
    id: 'Pertama Global'
  },
  'landing.globalFirstDescription': {
    en: 'World\'s first integrated lifestyle destination',
    zh: '世界首个综合生活方式目的地',
    id: 'Destinasi gaya hidup terintegrasi pertama di dunia'
  },
  'landing.visitUs': {
    en: 'Visit Us',
    zh: '拜访我们',
    id: 'Kunjungi Kami'
  },
  'landing.ourLocation': {
    en: 'Our Location',
    zh: '我们的位置',
    id: 'Lokasi Kami'
  },
  'landing.beautyFeature1': {
    en: 'Advanced Skincare Treatments',
    zh: '先进护肤治疗',
    id: 'Perawatan Kulit Lanjutan'
  },
  'landing.beautyFeature2': {
    en: 'Luxury Spa Experiences',
    zh: '奢华水疗体验',
    id: 'Pengalaman Spa Mewah'
  },
  'landing.beautyFeature3': {
    en: 'Personal Beauty Consultations',
    zh: '个人美容咨询',
    id: 'Konsultasi Kecantikan Personal'
  },

  'landing.inviteFriendsTitle': {
    en: 'Invite Friends',
    zh: '邀请朋友',
    id: 'Undang Teman'
  },
  'landing.foodFeature1': {
    en: 'Gourmet Dining Experiences',
    zh: '美食用餐体验',
    id: 'Pengalaman Bersantap Gourmet'
  },
  'landing.foodFeature2': {
    en: 'Artisan Coffee & Beverages',
    zh: '手工咖啡和饮品',
    id: 'Kopi & Minuman Artisan'
  },
  'landing.foodFeature3': {
    en: 'Catering & Event Services',
    zh: '餐饮和活动服务',
    id: 'Layanan Katering & Acara'
  },
  'landing.entertainmentFeature1': {
    en: 'Gaming Lounge Access',
    zh: '游戏休息室通道',
    id: 'Akses Gaming Lounge'
  },
  'landing.entertainmentFeature2': {
    en: 'Collectible Trading Platform',
    zh: '收藏品交易平台',
    id: 'Platform Trading Koleksi'
  },
  'landing.entertainmentFeature3': {
    en: 'Exclusive Entertainment Events',
    zh: '独家娱乐活动',
    id: 'Acara Hiburan Eksklusif'
  },
  'landing.corporateFeature1': {
    en: 'Business Conferences',
    zh: '商务会议',
    id: 'Konferensi Bisnis'
  },
  'landing.corporateFeature2': {
    en: 'Team Building Events',
    zh: '团队建设活动',
    id: 'Acara Team Building'
  },
  'landing.corporateFeature3': {
    en: 'Corporate Retreats',
    zh: '企业聚会',
    id: 'Retret Korporat'
  },
  'landing.commissionText': {
    en: 'Earn 10% commission every time your friends spend on our platform',
    zh: '每次朋友在我们平台消费时获得10%佣金',
    id: 'Dapatkan komisi 10% setiap kali teman Anda berbelanja di platform kami'
  },
  'landing.lifetimeEarnings': {
    en: 'Lifetime Earnings',
    zh: '终身收益',
    id: 'Penghasilan Seumur Hidup'
  },
  'landing.simpleRewarding': {
    en: 'Simple & Rewarding',
    zh: '简单且有奖励',
    id: 'Sederhana & Menguntungkan'
  },
  'landing.shareEarnText': {
    en: 'Share with friends and earn 10% commission from every purchase they make',
    zh: '与朋友分享，从他们的每次购买中获得10%佣金',
    id: 'Bagikan dengan teman dan dapatkan komisi 10% dari setiap pembelian yang mereka lakukan'
  },
  'landing.passiveIncome': {
    en: 'Passive Income',
    zh: '被动收入',
    id: 'Penghasilan Pasif'
  },
  'landing.passiveIncomeDesc': {
    en: 'Earn money while you sleep from your network\'s activities',
    zh: '从您网络的活动中赚取睡觉时的收入',
    id: 'Dapatkan uang saat Anda tidur dari aktivitas jaringan Anda'
  },
  'landing.exclusiveBonuses': {
    en: 'Exclusive Bonuses',
    zh: '独家奖励',
    id: 'Bonus Eksklusif'
  },
  'landing.exclusiveBonusesDesc': {
    en: 'Unlock special rewards and VIP benefits as your network grows',
    zh: '随着您网络的增长解锁特殊奖励和VIP福利',
    id: 'Buka kunci hadiah khusus dan manfaat VIP saat jaringan Anda berkembang'
  },
  'landing.loyaltyPoints': {
    en: 'Loyalty Points',
    zh: '忠诚积分',
    id: 'Poin Loyalitas'
  },
  'landing.loyaltyPointsDesc': {
    en: 'Earn points with every transaction and level up your status',
    zh: '每次交易都能获得积分并提升您的状态',
    id: 'Dapatkan poin dengan setiap transaksi dan tingkatkan status Anda'
  },
  'landing.joinRevolution': {
    en: 'Join the Revolution',
    zh: '加入革命',
    id: 'Bergabung dengan Revolusi'
  },
  'landing.readyTransform': {
    en: 'Ready to Transform',
    zh: '准备改变',
    id: 'Siap untuk Mengubah'
  },
  'landing.yourExperience': {
    en: 'Your Experience?',
    zh: '您的体验？',
    id: 'Pengalaman Anda?'
  },
  'landing.joinThousands': {
    en: 'Join thousands of users who are already experiencing the future of beauty, food & beverage, and entertainment. Start sharing with friends and earning 10% from their spending today.',
    zh: '加入成千上万已经体验美容、餐饮和娱乐未来的用户。今天就开始与朋友分享，从他们的消费中获得10%收益。',
    id: 'Bergabunglah dengan ribuan pengguna yang sudah merasakan masa depan kecantikan, makanan & minuman, dan hiburan. Mulai berbagi dengan teman dan mendapat 10% dari pengeluaran mereka hari ini.'
  },
  'landing.accessPlatform': {
    en: 'Access the Platform',
    zh: '访问平台',
    id: 'Akses Platform'
  },
  'landing.learnMore': {
    en: 'Learn More',
    zh: '了解更多',
    id: 'Pelajari Lebih Lanjut'
  },
  'landing.allRightsReserved': {
    en: '© 2025 Reborn Wave Group. All rights reserved.',
    zh: '© 2025 重生波浪集团。保留所有权利。',
    id: '© 2025 Reborn Wave Group. Semua hak dilindungi.'
  },
  'landing.footerTagline': {
    en: 'The future of beauty, food & beverage, entertainment & corporate events',
    zh: '美容、餐饮、娱乐和企业活动的未来',
    id: 'Masa depan kecantikan, makanan & minuman, hiburan & acara korporat'
  },

  // Authentication
  'auth.email': {
    en: 'Email',
    zh: '电子邮件',
    id: 'Email'
  },
  'auth.password': {
    en: 'Password',
    zh: '密码',
    id: 'Kata Sandi'
  },
  'auth.confirmPassword': {
    en: 'Confirm Password',
    zh: '确认密码',
    id: 'Konfirmasi Kata Sandi'
  },
  'auth.login': {
    en: 'Login',
    zh: '登录',
    id: 'Masuk'
  },
  'auth.signUp': {
    en: 'Sign Up',
    zh: '注册',
    id: 'Daftar'
  },
  'auth.signIn': {
    en: 'Sign In',
    zh: '登录',
    id: 'Masuk'
  },
  'auth.signingIn': {
    en: 'Signing in...',
    zh: '登录中...',
    id: 'Sedang masuk...'
  },
  'auth.forgotPassword': {
    en: 'Forgot password?',
    zh: '忘记密码？',
    id: 'Lupa kata sandi?'
  },
  'auth.orContinueWith': {
    en: 'Or continue with',
    zh: '或继续使用',
    id: 'Atau lanjutkan dengan'
  },
  'auth.welcomeTitle': {
    en: 'Reborn Wave Pet Care',
    zh: '重生浪潮宠物护理',
    id: 'Perawatan Hewan Peliharaan Reborn Wave'
  },
  'auth.welcomeDescription': {
    en: 'Your digital pet adventure awaits',
    zh: '您的数字宠物冒险在等待',
    id: 'Petualangan hewan peliharaan digital Anda menanti'
  },
  'auth.referralCodeInfo': {
    en: 'Have a referral code? Enter it in the form below before choosing your sign-up method',
    zh: '有推荐码？在选择注册方式之前在下面的表格中输入',
    id: 'Punya kode referral? Masukkan di formulir di bawah sebelum memilih metode pendaftaran'
  },
  'auth.enterEmail': {
    en: 'Enter your email',
    zh: '输入您的电子邮件',
    id: 'Masukkan email Anda'
  },
  'auth.enterPassword': {
    en: 'Enter your password',
    zh: '输入您的密码',
    id: 'Masukkan kata sandi Anda'
  },
  'auth.firstName': {
    en: 'First Name',
    zh: '名',
    id: 'Nama Depan'
  },
  'auth.lastName': {
    en: 'Last Name',
    zh: '姓',
    id: 'Nama Belakang'
  },
  'auth.phoneNumber': {
    en: 'Phone Number',
    zh: '电话号码',
    id: 'Nomor Telepon'
  },
  'auth.gender': {
    en: 'Gender',
    zh: '性别',
    id: 'Jenis Kelamin'
  },
  'auth.gender.male': {
    en: 'Male',
    zh: '男',
    id: 'Laki-laki'
  },
  'auth.gender.female': {
    en: 'Female',
    zh: '女',
    id: 'Perempuan'
  },
  'auth.dateOfBirth': {
    en: 'Date of Birth',
    zh: '出生日期',
    id: 'Tanggal Lahir'
  },
  'auth.referralCode': {
    en: 'Referral Code (Optional)',
    zh: '推荐码（可选）',
    id: 'Kode Referral (Opsional)'
  },
  'auth.alreadyAccount': {
    en: 'Already have an account?',
    zh: '已有账户？',
    id: 'Sudah punya akun?'
  },
  'auth.noAccount': {
    en: "Don't have an account?",
    zh: '没有账户？',
    id: 'Belum punya akun?'
  },

  // Dashboard Quick Booking
  'dashboard.quickBooking': {
    en: 'Quick Booking',
    zh: '快速预约',
    id: 'Reservasi Cepat'
  },
  'dashboard.selectCategory': {
    en: 'Select Category',
    zh: '选择类别',
    id: 'Pilih Kategori'
  },
  'dashboard.selectTime': {
    en: 'Select Time',
    zh: '选择时间',
    id: 'Pilih Waktu'
  },
  'dashboard.bookAppointment': {
    en: 'Book Appointment',
    zh: '预约',
    id: 'Buat Janji'
  },

  // Pet Care
  'pet.care.title': {
    en: 'Pet Care',
    zh: '宠物护理',
    id: 'Perawatan Hewan'
  },
  'pet.care.noToys': {
    en: "You don't have any toys to turn into pets yet. Purchase toys first!",
    zh: '您还没有任何玩具可以变成宠物。请先购买玩具！',
    id: 'Anda belum memiliki mainan untuk dijadikan hewan peliharaan. Beli mainan terlebih dahulu!'
  },
  'pet.care.activate': {
    en: 'Activate your toys to become virtual pets',
    zh: '激活您的玩具成为虚拟宠物',
    id: 'Aktifkan mainan Anda untuk menjadi hewan peliharaan virtual'
  },
  'pet.care.feed': {
    en: 'Feed',
    zh: '喂食',
    id: 'Beri Makan'
  },
  'pet.care.bathe': {
    en: 'Bathe',
    zh: '洗澡',
    id: 'Mandikan'
  },
  'pet.care.play': {
    en: 'Play',
    zh: '玩耍',
    id: 'Bermain'
  },
  'pet.care.train': {
    en: 'Train',
    zh: '训练',
    id: 'Latih'
  },
  'pet.care.sleep': {
    en: 'Sleep',
    zh: '睡觉',
    id: 'Tidur'
  },
  'pet.care.heal': {
    en: 'Heal',
    zh: '治疗',
    id: 'Sembuhkan'
  },

  // Points Calculator
  'points.calculator.title': {
    en: 'Points Calculator',
    zh: '积分计算器',
    id: 'Kalkulator Poin'
  },
  'points.calculator.calculate': {
    en: 'Calculate Points',
    zh: '计算积分',
    id: 'Hitung Poin'
  },
  'points.calculator.currentPoints': {
    en: 'Current Points',
    zh: '当前积分',
    id: 'Poin Saat Ini'
  },
  'points.calculator.targetPoints': {
    en: 'Target Points',
    zh: '目标积分',
    id: 'Target Poin'
  },
  'points.calculator.enterAmount': {
    en: 'Enter amount to calculate points',
    zh: '输入金额以计算积分',
    id: 'Masukkan jumlah untuk menghitung poin'
  },
  'points.calculator.purchaseAmount': {
    en: 'Purchase Amount (RP)',
    zh: '购买金额 (RP)',
    id: 'Jumlah Pembelian (RP)'
  },
  'points.calculator.pointsEarned': {
    en: 'Points to be earned:',
    zh: '将获得的积分：',
    id: 'Poin yang akan diperoleh:'
  },
  'points.calculator.serviceCategory': {
    en: 'Service Category',
    zh: '服务类别',
    id: 'Kategori Layanan'
  },
  'points.calculator.selectCategory': {
    en: 'Select service category',
    zh: '选择服务类别',
    id: 'Pilih kategori layanan'
  },

  // Loyalty Program
  'loyalty.title': {
    en: 'Loyalty Program',
    zh: '忠诚度计划',
    id: 'Program Loyalitas'
  },
  'loyalty.description': {
    en: 'Earn points, unlock levels, and claim amazing rewards!',
    zh: '赚取积分，解锁等级，获得丰厚奖励！',
    id: 'Dapatkan poin, buka level, dan klaim hadiah menarik!'
  },
  'loyalty.availablePoints': {
    en: 'Available Points',
    zh: '可用积分',
    id: 'Poin Tersedia'
  },
  'loyalty.progressTo': {
    en: 'Progress to',
    zh: '进度到',
    id: 'Progress ke'
  },
  'loyalty.pointsToNext': {
    en: 'points to next level',
    zh: '积分到下一级',
    id: 'poin ke level berikutnya'
  },
  'loyalty.pointsNeeded': {
    en: 'points needed',
    zh: '积分需要',
    id: 'poin dibutuhkan'
  },

  // Booking Management
  'booking.viewAppointments': {
    en: 'View and manage your service appointments',
    zh: '查看和管理您的服务预约',
    id: 'Lihat dan kelola janji layanan Anda'
  },
  'booking.pastAppointments': {
    en: 'Past Appointments',
    zh: '过往预约',
    id: 'Janji Masa Lalu'
  },
  'booking.upcomingAppointments': {
    en: 'Upcoming Appointments',
    zh: '即将到来的预约',
    id: 'Janji Mendatang'
  },
  'booking.noAppointments': {
    en: 'No appointments found',
    zh: '未找到预约',
    id: 'Tidak ada janji yang ditemukan'
  },

  // Toy Marketplace
  'toys.marketplace': {
    en: 'Toy Marketplace',
    zh: '玩具市场',
    id: 'Pasar Mainan'
  },
  'toys.browseAndBuy': {
    en: 'Browse and buy toys for your pets',
    zh: '浏览并购买宠物玩具',
    id: 'Jelajahi dan beli mainan untuk hewan peliharaan Anda'
  },
  'toys.myCollection': {
    en: 'My Toy Collection',
    zh: '我的玩具收藏',
    id: 'Koleksi Mainan Saya'
  },
  'toys.viewCollection': {
    en: 'View and manage your purchased toys',
    zh: '查看和管理您购买的玩具',
    id: 'Lihat dan kelola mainan yang telah dibeli'
  },
  'toys.noToys': {
    en: 'No toys found',
    zh: '未找到玩具',
    id: 'Tidak ada mainan yang ditemukan'
  },
  'toys.buyNow': {
    en: 'Buy Now',
    zh: '立即购买',
    id: 'Beli Sekarang'
  },

  // Referral Program
  'referrals.description': {
    en: 'Earn 10% commission on verified purchases',
    zh: '从验证购买中赚取10%佣金',
    id: 'Dapatkan komisi 10% dari pembelian terverifikasi'
  },
  'referrals.yourCode': {
    en: 'Your Referral Code',
    zh: '您的推荐码',
    id: 'Kode Rujukan Anda'
  },
  'referrals.shareCode': {
    en: 'Share this code with friends to earn 10% commission on their purchases',
    zh: '与朋友分享此代码，从他们的购买中赚取10%的佣金',
    id: 'Bagikan kode ini dengan teman untuk mendapatkan komisi 10% dari pembelian mereka'
  },
  'referrals.totalEarnings': {
    en: 'Total Earnings',
    zh: '总收入',
    id: 'Total Pendapatan'
  },
  'referrals.totalReferrals': {
    en: 'Total Referrals',
    zh: '总推荐数',
    id: 'Total Rujukan'
  },

  // Payment Verification
  'payment.uploadReceipt': {
    en: 'Upload Receipt Image',
    zh: '上传收据图片',
    id: 'Unggah Gambar Struk'
  },
  'payment.clickToUpload': {
    en: 'Click to upload receipt image',
    zh: '点击上传收据图片',
    id: 'Klik untuk mengunggah gambar struk'
  },
  'payment.chooseFile': {
    en: 'Choose File',
    zh: '选择文件',
    id: 'Pilih File'
  },
  'payment.supported': {
    en: 'Supported: JPG, PNG, max 10MB',
    zh: '支持格式：JPG，PNG，最大10MB',
    id: 'Didukung: JPG, PNG, maks 10MB'
  },
  'payment.submitVerification': {
    en: 'Submit Verification',
    zh: '提交验证',
    id: 'Kirim Verifikasi'
  },
  'payment.verificationHistory': {
    en: 'Verification History',
    zh: '验证历史',
    id: 'Riwayat Verifikasi'
  },

  // Loyalty Levels
  'loyalty.allLevels': {
    en: 'All Loyalty Levels',
    zh: '所有忠诚度等级',
    id: 'Semua Level Loyalitas'
  },
  'loyalty.bronze': {
    en: 'Bronze',
    zh: '青铜',
    id: 'Perunggu'
  },
  'loyalty.silver': {
    en: 'Silver',
    zh: '银牌',
    id: 'Perak'
  },
  'loyalty.gold': {
    en: 'Gold',
    zh: '金牌',
    id: 'Emas'
  },
  'loyalty.platinum': {
    en: 'Platinum',
    zh: '白金',
    id: 'Platinum'
  },
  'loyalty.diamond': {
    en: 'Diamond',
    zh: '钻石',
    id: 'Berlian'
  },
  'loyalty.level': {
    en: 'Level',
    zh: '等级',
    id: 'Level'
  },
  'loyalty.discount': {
    en: 'discount',
    zh: '折扣',
    id: 'diskon'
  },
  'loyalty.discountOnServices': {
    en: 'discount on all services',
    zh: '所有服务折扣',
    id: 'diskon untuk semua layanan'
  },
  'loyalty.platformAccess': {
    en: 'Platform access',
    zh: '平台访问',
    id: 'Akses platform'
  },
  'loyalty.basicReferral': {
    en: 'Basic referral program',
    zh: '基础推荐计划',
    id: 'Program rujukan dasar'
  },
  'loyalty.priorityBooking': {
    en: 'Priority booking',
    zh: '优先预订',
    id: 'Pemesanan prioritas'
  },
  'loyalty.exclusiveAccess': {
    en: 'Exclusive service access',
    zh: '独家服务访问',
    id: 'Akses layanan eksklusif'
  },
  'loyalty.vipAccess': {
    en: 'VIP room access',
    zh: 'VIP房间访问',
    id: 'Akses ruang VIP'
  },
  'loyalty.personalConcierge': {
    en: 'Personal concierge service',
    zh: '个人礼宾服务',
    id: 'Layanan concierge pribadi'
  },
  'loyalty.more': {
    en: 'more',
    zh: '更多',
    id: 'lainnya'
  },

  // Rewards
  'rewards.available': {
    en: 'Available Rewards',
    zh: '可用奖励',
    id: 'Hadiah Tersedia'
  },
  'rewards.pointsOnly': {
    en: 'Points can only be added by admin',
    zh: '积分只能由管理员添加',
    id: 'Poin hanya dapat ditambahkan oleh admin'
  },
  'rewards.clawToken': {
    en: '1 Claw Machine Token',
    zh: '1个抓娃娃机代币',
    id: '1 Token Mesin Cakar'
  },
  'rewards.item': {
    en: 'item',
    zh: '物品',
    id: 'item'
  },
  'rewards.serviceCredits': {
    en: 'RP 5,000 Service Credits',
    zh: 'RP 5,000 服务积分',
    id: 'RP 5,000 Kredit Layanan'
  },
  'rewards.credit': {
    en: 'credit',
    zh: '积分',
    id: 'kredit'
  },
  'rewards.addCredits': {
    en: 'add 5,000 credits',
    zh: '添加5,000积分',
    id: 'tambah 5,000 kredit'
  },
  'rewards.needMorePoints': {
    en: 'Need more points',
    zh: '需要更多积分',
    id: 'Butuh lebih banyak poin'
  },

  // History and Benefits
  'history.point': {
    en: 'Point History',
    zh: '积分历史',
    id: 'Riwayat Poin'
  },
  'benefits.your': {
    en: 'Your Level Benefits',
    zh: '您的等级福利',
    id: 'Manfaat Level Anda'
  },
  'benefits.bonusPoints': {
    en: '5% bonus points',
    zh: '5%奖励积分',
    id: '5% poin bonus'
  },
  'benefits.birthdayDiscount': {
    en: 'Birthday discount 10%',
    zh: '生日折扣10%',
    id: 'Diskon ulang tahun 10%'
  },
  'benefits.freeShipping': {
    en: 'Free shipping',
    zh: '免费送货',
    id: 'Gratis ongkir'
  },
  'history.redemption': {
    en: 'Redemption History',
    zh: '兑换历史',
    id: 'Riwayat Penukaran'
  },
  'history.noRedemption': {
    en: 'No redemption history yet',
    zh: '暂无兑换历史',
    id: 'Belum ada riwayat penukaran'
  },
  'history.rewardAppear': {
    en: 'Your reward redemptions will appear here',
    zh: '您的奖励兑换将显示在这里',
    id: 'Penukaran hadiah Anda akan muncul di sini'
  },
  'common.submitting': {
    en: 'Submitting...',
    zh: '提交中...',
    id: 'Mengirim...'
  },
  'payment.noVerifications': {
    en: 'No verifications yet',
    zh: '暂无验证记录',
    id: 'Belum ada verifikasi'
  },
  'payment.uploadToGetStarted': {
    en: 'Upload purchase receipts to get started',
    zh: '上传购买收据开始使用',
    id: 'Upload bukti pembelian untuk memulai'
  },

  'loyalty.discount2Percent': {
    en: '2% discount on all services',
    zh: '所有服务2%折扣',
    id: 'Diskon 2% semua layanan'
  },
  'loyalty.bonusReferralPoints': {
    en: 'Bonus referral points',
    zh: '奖励推荐积分',
    id: 'Bonus poin referral'
  },
  'loyalty.discount4Percent': {
    en: '4% discount on all services',
    zh: '所有服务4%折扣',
    id: 'Diskon 4% semua layanan'
  },
  'loyalty.exclusiveServiceAccess': {
    en: 'Exclusive service access',
    zh: '专属服务访问',
    id: 'Akses layanan eksklusif'
  },
  'loyalty.prioritySupport': {
    en: 'Priority support',
    zh: '优先支持',
    id: 'Dukungan prioritas'
  },
  'loyalty.birthdayRewards': {
    en: 'Birthday rewards',
    zh: '生日奖励',
    id: 'Hadiah ulang tahun'
  },
  'loyalty.discount6Percent': {
    en: '6% discount on all services',
    zh: '所有服务6%折扣',
    id: 'Diskon 6% semua layanan'
  },
  'loyalty.vipRoomAccess': {
    en: 'VIP room access',
    zh: 'VIP房间访问',
    id: 'Akses VIP room'
  },
  'loyalty.personalAccountManager': {
    en: 'Personal account manager',
    zh: '专属客户经理',
    id: 'Personal account manager'
  },
  'loyalty.freeUpgrades': {
    en: 'Free upgrades',
    zh: '免费升级',
    id: 'Upgrade gratis'
  },
  'loyalty.exclusiveEvents': {
    en: 'Exclusive events',
    zh: '专属活动',
    id: 'Event eksklusif'
  },

  'loyalty.discount10Percent': {
    en: '10% discount on all services',
    zh: '所有服务10%折扣',
    id: 'Diskon 10% semua layanan'
  },
  'loyalty.unlimitedAccess': {
    en: 'Unlimited access to all facilities',
    zh: '无限制访问所有设施',
    id: 'Akses unlimited ke semua fasilitas'
  },
  'loyalty.vipEventInvitations': {
    en: 'VIP event invitations',
    zh: 'VIP活动邀请',
    id: 'Undangan acara VIP'
  },
  'loyalty.exclusiveAnnualGifts': {
    en: 'Exclusive annual gifts',
    zh: '专属年度礼品',
    id: 'Hadiah tahunan eksklusif'
  },

  'loyalty.pointsLeft': {
    en: 'points left',
    zh: '积分剩余',
    id: 'poin tersisa'
  },

  // Achievements
  'achievements.firstInviter': {
    en: 'First Inviter',
    zh: '首次邀请者',
    id: 'Pengundang Pertama'
  },
  'achievements.inviteFirstFriend': {
    en: 'Invite your first friend!',
    zh: '邀请您的第一个朋友！',
    id: 'Undang teman pertama Anda!'
  },
  'achievements.50Points': {
    en: '50 Points',
    zh: '50分',
    id: '50 Poin'
  },
  'achievements.socialButterfly': {
    en: 'Social Butterfly',
    zh: '社交蝴蝶',
    id: 'Kupu-kupu Sosial'
  },
  'achievements.invite5Friends': {
    en: 'Invite 5 friends to join!',
    zh: '邀请5位朋友加入！',
    id: 'Undang 5 teman bergabung!'
  },
  'achievements.250PointsBonus': {
    en: '250 Points + 150 Bonus',
    zh: '250分 + 150奖励',
    id: '250 Poin + 150 Bonus'
  },
  'achievements.networkBuilder': {
    en: 'Network Builder',
    zh: '网络建设者',
    id: 'Pembangun Jaringan'
  },
  'achievements.build10Referrals': {
    en: 'Build a network of 10 referrals!',
    zh: '建立10个推荐的网络！',
    id: 'Bangun jaringan 10 referral!'
  },
  'achievements.500PointsBonus': {
    en: '500 Points + 300 Bonus',
    zh: '500分 + 300奖励',
    id: '500 Poin + 300 Bonus'
  },
  'achievements.resetSuccessful': {
    en: 'Reset Successful',
    zh: '重置成功',
    id: 'Reset Berhasil'
  },
  'achievements.trackingReset': {
    en: 'Achievement tracking has been reset',
    zh: '成就跟踪已重置',
    id: 'Tracking pencapaian telah direset'
  },
  'toys.activationSuccess': {
    en: 'Success!',
    zh: '成功！',
    id: 'Berhasil!'
  },
  'toys.activationSuccessMessage': {
    en: 'Doluruu toy successfully activated and added to collection!',
    zh: 'Doluruu玩具成功激活并添加到收藏！',
    id: 'Mainan Doluruu berhasil diaktifkan dan ditambahkan ke koleksi!'
  },
  'toys.activationError': {
    en: 'Failed to activate toy',
    zh: '激活玩具失败',
    id: 'Gagal mengaktifkan mainan'
  },
  'marketplace.selectToyAndPrice': {
    en: 'Please select toy and enter price',
    zh: '请选择玩具并输入价格',
    id: 'Harap pilih mainan dan masukkan harga'
  },
  'rewards.outOfStock': {
    en: 'Out of Stock',
    zh: '库存不足',
    id: 'Stok Habis'
  },
  'rewards.unavailable': {
    en: 'This reward is currently unavailable',
    zh: '此奖励目前不可用',
    id: 'Reward ini sedang tidak tersedia'
  },
  'rewards.redeemed': {
    en: 'Reward Redeemed!',
    zh: '奖励已兑换！',
    id: 'Reward Ditukar!'
  },
  'rewards.redeemedWithCredit': {
    en: '{{name}} successfully redeemed! +RP {{credit}} added',
    zh: '{{name}}兑换成功！+RP {{credit}}已添加',
    id: '{{name}} berhasil ditukar! +RP {{credit}} ditambahkan'
  },
  'rewards.redeemedSuccess': {
    en: '{{name}} successfully redeemed',
    zh: '{{name}}兑换成功',
    id: '{{name}} berhasil ditukar'
  },
  'rewards.redeemError': {
    en: 'Failed to redeem reward',
    zh: '兑换奖励失败',
    id: 'Gagal menukar reward'
  },

  // Game Section
  'game.gameOver': {
    en: 'Game Over!',
    zh: '游戏结束！',
    id: 'Permainan Selesai!'
  },
  'game.finalScore': {
    en: 'Final Score: {score}',
    zh: '最终得分：{score}',
    id: 'Skor Akhir: {score}'
  },
  'game.playAgain': {
    en: 'Play Again',
    zh: '再玩一次',
    id: 'Main Lagi'
  },
  'game.done': {
    en: 'Done',
    zh: '完成',
    id: 'Selesai'
  },
  'game.viewLeaderboard': {
    en: 'View Leaderboard',
    zh: '查看排行榜',
    id: 'Lihat Peringkat'
  },

  // Marketplace Empty States
  'marketplace.noToysForSale': {
    en: 'No toys for sale yet',
    zh: '暂无玩具出售',
    id: 'Belum ada mainan dijual'
  },
  'marketplace.beFirstToSell': {
    en: 'Be the first to sell a toy!',
    zh: '成为第一个出售玩具的人！',
    id: 'Jadilah yang pertama menjual mainan!'
  },

  // Redemption History
  'redemption.noHistoryYet': {
    en: 'No redemption history yet',
    zh: '暂无兑换历史',
    id: 'Belum ada riwayat penukaran'
  },
  'redemption.rewardsWillAppear': {
    en: 'Your reward redemptions will appear here',
    zh: '您的奖励兑换将显示在这里',
    id: 'Penukaran reward Anda akan muncul di sini'
  },

  // Daily Reward Status
  'daily.loadingStatus': {
    en: 'Loading reward status...',
    zh: '加载奖励状态...',
    id: 'Memuat status hadiah...'
  },
  'daily.tokenReward': {
    en: 'Daily Token Reward',
    zh: '每日代币奖励',
    id: 'Hadiah Token Harian'
  },
  'daily.earnTokens': {
    en: 'Earn 1 token every 24 hours if all pets are healthy!',
    zh: '如果所有宠物都健康，每24小时获得1个代币！',
    id: 'Dapatkan 1 token setiap 24 jam jika semua hewan sehat!'
  },

  // Pet Activation States
  'activation.howToActivateToys': {
    en: 'How to Activate Toys:',
    zh: '如何激活玩具：',
    id: 'Cara Mengaktifkan Mainan:'
  },
  'activation.step1': {
    en: 'Purchase Doluruu toy from physical store',
    zh: '从实体店购买多鲁鲁玩具',
    id: 'Beli mainan Doluruu dari toko fisik'
  },
  'activation.step2': {
    en: 'Find unique QR code on toy packaging',
    zh: '在玩具包装上找到唯一的二维码',
    id: 'Temukan QR code unik di kemasan mainan'
  },
  'activation.step3': {
    en: 'Enter secure QR code above to activate',
    zh: '在上方输入安全二维码以激活',
    id: 'Masukkan kode QR yang aman di atas untuk mengaktifkan'
  },
  'activation.step4': {
    en: 'Toy will be added to your digital collection!',
    zh: '玩具将被添加到您的数字收藏中！',
    id: 'Mainan akan ditambahkan ke koleksi digital Anda!'
  },
  'activation.securitySystem': {
    en: '🔒 Security System:',
    zh: '🔒 安全系统：',
    id: '🔒 Sistem Keamanan:'
  },
  'activation.encryptionProtection': {
    en: 'Each QR code is unique and unpredictable to prevent unauthorized toy additions.',
    zh: '每个二维码都是独特且不可预测的，以防止未授权的玩具添加。',
    id: 'Setiap QR code adalah unik dan tidak dapat ditebak untuk mencegah penambahan mainan tanpa izin.'
  },
  'pet.active': {
    en: 'Pet Active',
    zh: '宠物活跃',
    id: 'Hewan Peliharaan Aktif'
  },
  'pet.notActivated': {
    en: 'Not Activated',
    zh: '未激活',
    id: 'Belum Diaktifkan'
  },
  'pet.activateToy': {
    en: 'Activate Toy',
    zh: '激活玩具',
    id: 'Aktifkan Mainan'
  },
  'pet.processing': {
    en: 'Processing...',
    zh: '处理中...',
    id: 'Memproses...'
  },
  'pet.submitClaim': {
    en: 'Submit Claim',
    zh: '提交申请',
    id: 'Ajukan Klaim'
  },

  // Points and History Section
  'points.history': {
    en: 'Point History',
    zh: '积分历史',
    id: 'Riwayat Poin'
  },
  'points.noHistoryYet': {
    en: 'No points history yet',
    zh: '暂无积分历史',
    id: 'Belum ada riwayat poin'
  },
  'points.earningsWillAppear': {
    en: 'Your point earnings and redemptions will appear here',
    zh: '您的积分收入和兑换记录将显示在这里',
    id: 'Penghasilan dan penukaran poin Anda akan muncul di sini'
  },
  'redemption.history': {
    en: 'Redemption History',
    zh: '兑换历史',
    id: 'Riwayat Penukaran'
  },


  // Loyalty Benefits
  'loyalty.bonusPoints': {
    en: '5% bonus points',
    zh: '5%奖励积分',
    id: '5% bonus poin'
  },
  'loyalty.birthdayDiscount': {
    en: 'Birthday discount 10%',
    zh: '生日折扣10%',
    id: 'Diskon ulang tahun 10%'
  },
  'loyalty.freeShipping': {
    en: 'Free shipping',
    zh: '免费配送',
    id: 'Gratis ongkir'
  },

  // Booking Section
  'booking.beautyServices': {
    en: 'Beauty Services',
    zh: '美容服务',
    id: 'Layanan Kecantikan'
  },
  'booking.hairSpaNails': {
    en: 'Hair Spa, Facials, Nails',
    zh: '发型、面部护理、美甲',
    id: 'Hair Spa, Facial, Kuku'
  },
  'booking.entertainment': {
    en: 'Entertainment',
    zh: '娱乐',
    id: 'Hiburan'
  },
  'booking.clawMachineKTV': {
    en: 'Claw Machine, KTV Rooms',
    zh: '抓娃娃机、KTV包房',
    id: 'Claw Machine, Ruang KTV'
  },
  'booking.cafeRestaurant': {
    en: 'Cafe & Restaurant',
    zh: '咖啡厅和餐厅',
    id: 'Kafe & Restoran'
  },
  'booking.mealsDescription': {
    en: 'Breakfast, Lunch, Dinner',
    zh: '早餐、午餐、晚餐',
    id: 'Sarapan, Makan Siang, Makan Malam'
  },
  'booking.startingFrom': {
    en: 'Starting from RP 0',
    zh: '起价 RP 0',
    id: 'Mulai dari RP 0'
  },



  'rewards.availableRewards': {
    en: 'Available Rewards',
    zh: '可用奖励',
    id: 'Reward Tersedia'
  },
  'loyalty.yourLevelBenefits': {
    en: 'Your Level Benefits',
    zh: '您的等级福利',
    id: 'Benefit Level Anda'
  },
  'rewards.redeem': {
    en: 'Redeem',
    zh: '兑换',
    id: 'Tukar'
  },
  'loyalty.adminOnlyPoints': {
    en: 'Points can only be added by admin',
    zh: '积分只能由管理员添加',
    id: 'Poin hanya dapat ditambahkan oleh admin'
  },
  'loyalty.currentLevel': {
    en: 'Current Level',
    zh: '当前等级',
    id: 'Level Saat Ini'
  },
  'loyalty.totalPoints': {
    en: 'Total Points',
    zh: '总积分',
    id: 'Total Poin'
  },
  'pet.stats.happiness': {
    en: 'Happiness',
    zh: '快乐度',
    id: 'Kebahagiaan'
  },
  'pet.stats.health': {
    en: 'Health',
    zh: '健康度',
    id: 'Kesehatan'
  },
  'pet.stats.cleanliness': {
    en: 'Cleanliness',
    zh: '清洁度',
    id: 'Kebersihan'
  },
  'pet.stats.energy': {
    en: 'Energy',
    zh: '能量',
    id: 'Energi'
  },
  'pet.stats.intelligence': {
    en: 'Intelligence',
    zh: '智力',
    id: 'Kecerdasan'
  },
  'pet.stats.fitness': {
    en: 'Fitness',
    zh: '体能',
    id: 'Kebugaran'
  },
  'pet.evolution.baby': {
    en: 'Baby Dragon',
    zh: '幼龙',
    id: 'Naga Bayi'
  },
  'pet.evolution.child': {
    en: 'Young Dragon',
    zh: '小龙',
    id: 'Naga Muda'
  },
  'pet.evolution.teenager': {
    en: 'Teen Dragon',
    zh: '少年龙',
    id: 'Naga Remaja'
  },
  'pet.evolution.adult': {
    en: 'Adult Dragon',
    zh: '成年龙',
    id: 'Naga Dewasa'
  },
  'pet.evolution.elder': {
    en: 'Elder Dragon',
    zh: '长老龙',
    id: 'Naga Tua'
  },
  'pet.evolution.death': {
    en: 'Memorial',
    zh: '纪念',
    id: 'Memorial'
  },
  'tabs.dashboard': {
    en: 'Dashboard',
    zh: '仪表板',
    id: 'Dasbor'
  },
  'tabs.pets': {
    en: 'My Pets',
    zh: '我的宠物',
    id: 'Hewan Peliharaan'
  },
  'tabs.profile': {
    en: 'Profile',
    zh: '个人资料',
    id: 'Profil'
  },
  'tabs.shop': {
    en: 'Shop',
    zh: '商店',
    id: 'Toko'
  },
  'tabs.rewards': {
    en: 'Rewards',
    zh: '奖励',
    id: 'Hadiah'
  },
  'tabs.referrals': {
    en: 'Referrals',
    zh: '推荐',
    id: 'Rujukan'
  },
  'tabs.admin': {
    en: 'Admin',
    zh: '管理员',
    id: 'Admin'
  },
  'petcare.title': {
    en: 'Pet Care',
    zh: '宠物护理',
    id: 'Perawatan Hewan'
  },
  'purchase.verification': {
    en: 'Purchase Verification',
    zh: '购买验证',
    id: 'Verifikasi Pembelian'
  },
  'bookings.title': {
    en: 'Bookings',
    zh: '预约',
    id: 'Reservasi'
  },
  'inventory.title': {
    en: 'Collections',
    zh: '收藏',
    id: 'Koleksi'
  },
  'dashboard.myPets': {
    en: 'My Pets',
    zh: '我的宠物',
    id: 'Hewan Peliharaan Saya'
  },
  'dashboard.stats': {
    en: 'Your Stats',
    zh: '您的统计',
    id: 'Statistik Anda'
  },

  'dashboard.dailyReward': {
    en: 'Daily Reward',
    zh: '每日奖励',
    id: 'Hadiah Harian'
  },
  'dashboard.claimReward': {
    en: 'Claim Reward',
    zh: '领取奖励',
    id: 'Klaim Hadiah'
  },
  'dashboard.rewardClaimed': {
    en: 'Reward Claimed!',
    zh: '奖励已领取！',
    id: 'Hadiah Diklaim!'
  },

  // Profile
  'profile.accountSettings': {
    en: 'Account Settings',
    zh: '账户设置',
    id: 'Pengaturan Akun'
  },
  'profile.changePassword': {
    en: 'Change Password',
    zh: '更改密码',
    id: 'Ubah Kata Sandi'
  },
  'profile.currentPassword': {
    en: 'Current Password',
    zh: '当前密码',
    id: 'Kata Sandi Saat Ini'
  },
  'profile.newPassword': {
    en: 'New Password',
    zh: '新密码',
    id: 'Kata Sandi Baru'
  },
  'profile.updateSuccess': {
    en: 'Profile updated successfully',
    zh: '个人资料更新成功',
    id: 'Profil berhasil diperbarui'
  },

  // Shop & Rewards
  'shop.title': {
    en: 'Pet Shop',
    zh: '宠物商店',
    id: 'Toko Hewan'
  },
  'shop.buyPet': {
    en: 'Buy Pet',
    zh: '购买宠物',
    id: 'Beli Hewan'
  },
  'shop.price': {
    en: 'Price',
    zh: '价格',
    id: 'Harga'
  },
  'rewards.title': {
    en: 'Rewards Center',
    zh: '奖励中心',
    id: 'Pusat Hadiah'
  },
  'rewards.pointsRequired': {
    en: 'Points Required',
    zh: '所需积分',
    id: 'Poin yang Diperlukan'
  },



  // Admin
  'admin.title': {
    en: 'Admin Dashboard',
    zh: '管理员控制台',
    id: 'Dasbor Admin'
  },
  'admin.users': {
    en: 'Users',
    zh: '用户',
    id: 'Pengguna'
  },
  'admin.pets': {
    en: 'Pets',
    zh: '宠物',
    id: 'Hewan Peliharaan'
  },
  'admin.transactions': {
    en: 'Transactions',
    zh: '交易',
    id: 'Transaksi'
  },
  'admin.settings': {
    en: 'Settings',
    zh: '设置',
    id: 'Pengaturan'
  },

  // Error Messages
  'error.invalidCredentials': {
    en: 'Invalid email or password',
    zh: '电子邮件或密码无效',
    id: 'Email atau kata sandi tidak valid'
  },
  'error.emailExists': {
    en: 'Email already exists',
    zh: '电子邮件已存在',
    id: 'Email sudah ada'
  },
  'error.networkError': {
    en: 'Network error. Please try again.',
    zh: '网络错误。请重试。',
    id: 'Kesalahan jaringan. Silakan coba lagi.'
  },
  'error.petNotFound': {
    en: 'Pet not found',
    zh: '找不到宠物',
    id: 'Hewan peliharaan tidak ditemukan'
  },
  'error.insufficientTokens': {
    en: 'Insufficient tokens',
    zh: '代币不足',
    id: 'Token tidak cukup'
  },
  'error.careAlreadyDone': {
    en: 'Care activity already completed today',
    zh: '今天已完成护理活动',
    id: 'Aktivitas perawatan sudah selesai hari ini'
  },

  // Success Messages
  'success.petFed': {
    en: 'Pet fed successfully! +5 points',
    zh: '成功喂养宠物！+5积分',
    id: 'Hewan berhasil diberi makan! +5 poin'
  },
  'success.petBathed': {
    en: 'Pet bathed successfully! +5 points',
    zh: '成功给宠物洗澡！+5积分',
    id: 'Hewan berhasil dimandikan! +5 poin'
  },
  'success.petPlayed': {
    en: 'Played with pet successfully! +5 points',
    zh: '成功与宠物玩耍！+5积分',
    id: 'Berhasil bermain dengan hewan! +5 poin'
  },
  'success.petTrained': {
    en: 'Pet trained successfully! +5 points',
    zh: '成功训练宠物！+5积分',
    id: 'Hewan berhasil dilatih! +5 poin'
  },
  'success.petSlept': {
    en: 'Pet rested successfully! +5 points',
    zh: '宠物成功休息！+5积分',
    id: 'Hewan berhasil beristirahat! +5 poin'
  },
  'success.petHealed': {
    en: 'Pet healed successfully! +5 points',
    zh: '成功治疗宠物！+5积分',
    id: 'Hewan berhasil disembuhkan! +5 poin'
  },
  'success.profileUpdated': {
    en: 'Profile updated successfully',
    zh: '个人资料更新成功',
    id: 'Profil berhasil diperbarui'
  },
  'success.passwordChanged': {
    en: 'Password changed successfully',
    zh: '密码更改成功',
    id: 'Kata sandi berhasil diubah'
  },

  // Voice Feedback Messages
  'voice.petFed': {
    en: 'Your dragon is now well fed and happy!',
    zh: '您的龙现在吃得很饱，很开心！',
    id: 'Naga Anda sekarang kenyang dan bahagia!'
  },
  'voice.petBathed': {
    en: 'Your dragon is now clean and sparkling!',
    zh: '您的龙现在干净闪闪发光！',
    id: 'Naga Anda sekarang bersih dan berkilau!'
  },
  'voice.petPlayed': {
    en: 'Your dragon had so much fun playing!',
    zh: '您的龙玩得很开心！',
    id: 'Naga Anda sangat senang bermain!'
  },
  'voice.petTrained': {
    en: 'Your dragon is getting stronger and smarter!',
    zh: '您的龙变得更强壮更聪明！',
    id: 'Naga Anda menjadi lebih kuat dan pintar!'
  },
  'voice.petEvolved': {
    en: 'Congratulations! Your dragon has evolved!',
    zh: '恭喜！您的龙已经进化了！',
    id: 'Selamat! Naga Anda telah berevolusi!'
  },
  'voice.dailyReward': {
    en: 'Daily reward claimed! Keep caring for your pets!',
    zh: '每日奖励已领取！继续照顾您的宠物！',
    id: 'Hadiah harian diklaim! Terus rawat hewan peliharaan Anda!'
  },
  'voice.petSlept': {
    en: 'Your dragon is now well rested and energized!',
    zh: '您的龙现在休息得很好，精力充沛！',
    id: 'Naga Anda sekarang beristirahat dengan baik dan berenergi!'
  },
  'voice.petHealed': {
    en: 'Your dragon is now healthy and strong!',
    zh: '您的龙现在健康强壮！',
    id: 'Naga Anda sekarang sehat dan kuat!'
  },

  // Appointments
  'appointments.beautyServices': {
    en: 'Beauty Services',
    zh: '美容服务',
    id: 'Layanan Kecantikan'
  },
  'appointments.entertainment': {
    en: 'Entertainment',
    zh: '娱乐',
    id: 'Hiburan'
  },
  'appointments.cafeRestaurant': {
    en: 'Cafe & Restaurant',
    zh: '咖啡厅和餐厅',
    id: 'Kafe & Restoran'
  },
  'appointments.hairSpaFacialsNails': {
    en: 'Hair Spa, Facials, Nails',
    zh: '头发水疗，面部护理，美甲',
    id: 'Spa Rambut, Facial, Kuku'
  },
  'appointments.clawMachineKtvRooms': {
    en: 'Claw Machine, KTV Rooms',
    zh: '夹娃娃机，KTV包间',
    id: 'Mesin Cakar, Ruang KTV'
  },
  'appointments.breakfastLunchDinner': {
    en: 'Breakfast, Lunch, Dinner',
    zh: '早餐，午餐，晚餐',
    id: 'Sarapan, Makan Siang, Makan Malam'
  },
  'appointments.startingFrom': {
    en: 'Starting from',
    zh: '起价',
    id: 'Mulai dari'
  },
  'appointments.createNewBooking': {
    en: 'Create New Booking',
    zh: '创建新预订',
    id: 'Buat Pemesanan Baru'
  },
  'appointments.selectCategory': {
    en: 'Select Category',
    zh: '选择类别',
    id: 'Pilih Kategori'
  },
  'appointments.selectTime': {
    en: 'Select Time',
    zh: '选择时间',
    id: 'Pilih Waktu'
  },
  'appointments.bookAppointment': {
    en: 'Book Appointment',
    zh: '预约',
    id: 'Buat Janji'
  },
  'appointments.yourAppointments': {
    en: 'Your Appointments',
    zh: '您的预约',
    id: 'Janji Temu Anda'
  },

  // Marketplace
  'marketplace.title': {
    en: 'Toy Marketplace',
    zh: '玩具市场',
    id: 'Pasar Mainan'
  },
  'marketplace.browse': {
    en: 'Browse and purchase pet toys',
    zh: '浏览并购买宠物玩具',
    id: 'Jelajahi dan beli mainan hewan'
  },
  'marketplace.sellMyToy': {
    en: 'Sell My Toy',
    zh: '出售我的玩具',
    id: 'Jual Mainan Saya'
  },


  // Toy Activation
  'toyActivation.title': {
    en: 'Activate Doluruu Toy',
    zh: '激活Doluruu玩具',
    id: 'Aktifkan Mainan Doluruu'
  },
  'toyActivation.enterQrCode': {
    en: 'Enter toy QR Code (e.g. QR-87b4a03b003a-07377ac9-53d8fd)',
    zh: '输入玩具二维码（例如：QR-87b4a03b003a-07377ac9-53d8fd）',
    id: 'Masukkan Kode QR mainan (mis. QR-87b4a03b003a-07377ac9-53d8fd)'
  },
  'toyActivation.camera': {
    en: 'Camera',
    zh: '相机',
    id: 'Kamera'
  },
  'toyActivation.activate': {
    en: 'Activate',
    zh: '激活',
    id: 'Aktifkan'
  },
  'toyActivation.howToActivate': {
    en: 'How to Activate Toys:',
    zh: '如何激活玩具：',
    id: 'Cara Mengaktifkan Mainan:'
  },
  'toyActivation.step1': {
    en: 'Purchase Doluruu toy from physical store',
    zh: '从实体店购买Doluruu玩具',
    id: 'Beli mainan Doluruu dari toko fisik'
  },
  'toyActivation.step2': {
    en: 'Find unique QR code on toy packaging',
    zh: '在玩具包装上找到独特的二维码',
    id: 'Temukan kode QR unik pada kemasan mainan'
  },
  'toyActivation.step3': {
    en: 'Enter secure QR code above to activate',
    zh: '在上方输入安全二维码以激活',
    id: 'Masukkan kode QR aman di atas untuk mengaktifkan'
  },
  'toyActivation.step4': {
    en: 'Toy will be added to your digital collection!',
    zh: '玩具将添加到您的数字收藏中！',
    id: 'Mainan akan ditambahkan ke koleksi digital Anda!'
  },
  'toyActivation.securitySystem': {
    en: 'Security System: Each QR code is unique and unpredictable to prevent unauthorized toy additions.',
    zh: '安全系统：每个二维码都是独特且不可预测的，以防止未经授权的玩具添加。',
    id: 'Sistem Keamanan: Setiap kode QR unik dan tidak dapat diprediksi untuk mencegah penambahan mainan yang tidak sah.'
  },
  'toyActivation.seasonCollection': {
    en: 'Season 1 Collection - 7,000 toys available',
    zh: '第一季收藏 - 7,000个玩具可用',
    id: 'Koleksi Musim 1 - 7.000 mainan tersedia'
  },
  'toyActivation.rarityInfo': {
    en: '1,000 secret rarity • 6,000 common rarity',
    zh: '1,000个秘密稀有度 • 6,000个普通稀有度',
    id: '1.000 kelangkaan rahasia • 6.000 kelangkaan umum'
  },

  // Referral Program
  'referral.subtitle': {
    en: 'Invite friends and earn commissions',
    zh: '邀请朋友并赚取佣金',
    id: 'Undang teman dan dapatkan komisi'
  },
  'referral.directReferrals': {
    en: 'Direct Referrals',
    zh: '直接推荐',
    id: 'Rujukan Langsung'
  },
  'referral.totalEarnings': {
    en: 'Total Earnings',
    zh: '总收入',
    id: 'Total Penghasilan'
  },
  'referral.referrerLevel': {
    en: 'Referrer Level',
    zh: '推荐者等级',
    id: 'Level Perujuk'
  },
  'referral.commissionRate': {
    en: 'Commission Rate',
    zh: '佣金率',
    id: 'Tingkat Komisi'
  },
  'referral.shareReferralCode': {
    en: 'Share Your Referral Code',
    zh: '分享您的推荐码',
    id: 'Bagikan Kode Rujukan Anda'
  },
  'referral.shareToEarnCommission': {
    en: 'Share to earn 10% commission',
    zh: '分享赚取10%佣金',
    id: 'Bagikan untuk mendapat komisi 10%'
  },
  'referral.copyCode': {
    en: 'Copy Code',
    zh: '复制代码',
    id: 'Salin Kode'
  },

  // Account Settings
  'accountSettings.title': {
    en: 'Account Settings',
    zh: '账户设置',
    id: 'Pengaturan Akun'
  },
  'accountSettings.personalInformation': {
    en: 'Personal Information',
    zh: '个人信息',
    id: 'Informasi Pribadi'
  },
  'accountSettings.firstName': {
    en: 'First Name',
    zh: '名',
    id: 'Nama Depan'
  },
  'accountSettings.lastName': {
    en: 'Last Name',
    zh: '姓',
    id: 'Nama Belakang'
  },
  'accountSettings.email': {
    en: 'Email',
    zh: '电子邮件',
    id: 'Email'
  },
  'accountSettings.phoneNumber': {
    en: 'Phone Number',
    zh: '电话号码',
    id: 'Nomor Telepon'
  },
  'accountSettings.gender': {
    en: 'Gender',
    zh: '性别',
    id: 'Jenis Kelamin'
  },
  'accountSettings.dateOfBirth': {
    en: 'Date of Birth',
    zh: '出生日期',
    id: 'Tanggal Lahir'
  },
  'accountSettings.male': {
    en: 'Male',
    zh: '男',
    id: 'Laki-laki'
  },
  'accountSettings.female': {
    en: 'Female',
    zh: '女',
    id: 'Perempuan'
  },
  'accountSettings.preferences': {
    en: 'Preferences',
    zh: '偏好设置',
    id: 'Preferensi'
  },
  'accountSettings.emailNotifications': {
    en: 'Email Notifications',
    zh: '电子邮件通知',
    id: 'Notifikasi Email'
  },
  'accountSettings.receiveUpdatesAbout': {
    en: 'Receive updates about appointments and promotions',
    zh: '接收关于预约和促销的更新',
    id: 'Terima pembaruan tentang janji temu dan promosi'
  },
  'accountSettings.manage': {
    en: 'Manage',
    zh: '管理',
    id: 'Kelola'
  },
  'accountSettings.accountActions': {
    en: 'Account Actions',
    zh: '账户操作',
    id: 'Tindakan Akun'
  },
  'accountSettings.editProfile': {
    en: 'Edit Profile',
    zh: '编辑个人资料',
    id: 'Edit Profil'
  },
  'accountSettings.changePassword': {
    en: 'Change Password',
    zh: '更改密码',
    id: 'Ubah Kata Sandi'
  },
  'accountSettings.accountStatistics': {
    en: 'Account Statistics',
    zh: '账户统计',
    id: 'Statistik Akun'
  },
  'accountSettings.currentCredits': {
    en: 'Current Credits',
    zh: '当前信用',
    id: 'Kredit Saat Ini'
  },
  'accountSettings.loyaltyPoints': {
    en: 'Loyalty Points',
    zh: '忠诚积分',
    id: 'Poin Loyalitas'
  },
  'accountSettings.totalBookings': {
    en: 'Total Bookings',
    zh: '总预订',
    id: 'Total Pemesanan'
  },
  'accountSettings.referralEarnings': {
    en: 'Referral Earnings',
    zh: '推荐收入',
    id: 'Penghasilan Rujukan'
  },

  // Additional translations for screenshots
  'rewards.serviceCredits5000': {
    en: 'RP 5,000 Service Credits',
    zh: 'RP 5,000 服务积分',
    id: 'RP 5,000 Kredit Layanan'
  },
  'rewards.add5000Credits': {
    en: 'add 5,000 credits',
    zh: '添加5,000积分',
    id: 'tambah 5,000 kredit'
  },
  'history.dateFormat': {
    en: 'dd/mm/yyyy',
    zh: 'dd/mm/yyyy',
    id: 'dd/mm/yyyy'
  },
  'loyalty.progressToSilver': {
    en: 'Progress to Silver',
    zh: '进度到银牌',
    id: 'Kemajuan ke Perak'
  },
  'loyalty.allLoyaltyLevels': {
    en: 'All Loyalty Levels',
    zh: '所有忠诚度等级',
    id: 'Semua Level Loyalitas'
  },
  'history.pointHistory': {
    en: 'Point History',
    zh: '积分历史',
    id: 'Riwayat Poin'
  },
  'booking.createNewBooking': {
    en: 'Create New Booking',
    zh: '创建新预订',
    id: 'Buat Pemesanan Baru'
  },
  'toyActivation.enterQRCode': {
    en: 'Enter toy QR Code (e.g. QR-87b4a03b003a-07377ac9-53d8fd)',
    zh: '输入玩具二维码（例如 QR-87b4a03b003a-07377ac9-53d8fd）',
    id: 'Masukkan kode QR mainan (misal QR-87b4a03b003a-07377ac9-53d8fd)'
  },
  'booking.selectTime': {
    en: 'Select Time',
    zh: '选择时间',
    id: 'Pilih Waktu'
  },
  'booking.bookAppointment': {
    en: 'Book Appointment',
    zh: '预约',
    id: 'Buat Janji Temu'
  },
  'booking.yourAppointments': {
    en: 'Your Appointments',
    zh: '您的预约',
    id: 'Janji Temu Anda'
  },
  'filter.all': {
    en: 'All',
    zh: '全部',
    id: 'Semua'
  },
  'filter.pending': {
    en: 'Pending',
    zh: '待处理',
    id: 'Menunggu'
  },
  'filter.scheduled': {
    en: 'Scheduled',
    zh: '已安排',
    id: 'Terjadwal'
  },
  'filter.completed': {
    en: 'Completed',
    zh: '已完成',
    id: 'Selesai'
  },
  'filter.cancelled': {
    en: 'Cancelled',
    zh: '已取消',
    id: 'Dibatalkan'
  },
  'filter.clearFilters': {
    en: 'Clear Filters',
    zh: '清除筛选',
    id: 'Hapus Filter'
  },
  'filter.filterByDate': {
    en: 'Filter by date',
    zh: '按日期筛选',
    id: 'Filter tanggal'
  },
  'appointments.noAppointments': {
    en: 'No appointments yet',
    zh: '暂无预约',
    id: 'Belum ada janji temu'
  },
  'appointments.bookingsWillAppear': {
    en: 'Your bookings and appointments will appear here',
    zh: '您的预订和预约将显示在这里',
    id: 'Pemesanan dan janji temu Anda akan muncul di sini'
  },
  'referralProgram.title': {
    en: 'Referral Program',
    zh: '推荐计划',
    id: 'Program Rujukan'
  },
  'referralProgram.inviteFriends': {
    en: 'Invite friends and earn commissions',
    zh: '邀请朋友并赚取佣金',
    id: 'Undang teman dan dapatkan komisi'
  },
  'referralProgram.directReferrals': {
    en: 'Direct Referrals',
    zh: '直接推荐',
    id: 'Rujukan Langsung'
  },
  'referralProgram.totalEarnings': {
    en: 'Total Earnings',
    zh: '总收入',
    id: 'Total Pendapatan'
  },
  'referralProgram.referrerLevel': {
    en: 'Referrer Level',
    zh: '推荐者级别',
    id: 'Level Rujukan'
  },
  'referralProgram.commissionRate': {
    en: 'Commission Rate',
    zh: '佣金率',
    id: 'Tingkat Komisi'
  },
  'referralProgram.shareCode': {
    en: 'Share Your Referral Code',
    zh: '分享您的推荐码',
    id: 'Bagikan Kode Rujukan Anda'
  },
  'referralProgram.shareToEarn': {
    en: 'Share to earn 10% commission',
    zh: '分享即可获得10%佣金',
    id: 'Bagikan untuk mendapat komisi 10%'
  },
  'referralProgram.copyCode': {
    en: 'Copy Code',
    zh: '复制代码',
    id: 'Salin Kode'
  },
  'referralProgram.noNetwork': {
    en: 'No Referral Network Yet',
    zh: '暂无推荐网络',
    id: 'Belum Ada Jaringan Rujukan'
  },
  'referralProgram.shareLink': {
    en: 'Share your referral link to start building your network and earning commissions.',
    zh: '分享您的推荐链接，开始建立您的网络并赚取佣金。',
    id: 'Bagikan tautan rujukan Anda untuk mulai membangun jaringan dan mendapatkan komisi.'
  },
  'profilePage.title': {
    en: 'Your Profile',
    zh: '您的资料',
    id: 'Profil Anda'
  },
  'profilePage.manageAccount': {
    en: 'Manage your account settings and preferences',
    zh: '管理您的账户设置和偏好',
    id: 'Kelola pengaturan dan preferensi akun Anda'
  },
  'profilePage.memberSince': {
    en: 'Member Since:',
    zh: '注册时间：',
    id: 'Anggota Sejak:'
  },
  'profilePage.personalInfo': {
    en: 'Personal Information',
    zh: '个人信息',
    id: 'Informasi Pribadi'
  },
  'profilePage.firstName': {
    en: 'First Name',
    zh: '名字',
    id: 'Nama Depan'
  },
  'profilePage.lastName': {
    en: 'Last Name',
    zh: '姓氏',
    id: 'Nama Belakang'
  },
  'profilePage.email': {
    en: 'Email',
    zh: '邮箱',
    id: 'Email'
  },
  'profilePage.phoneNumber': {
    en: 'Phone Number',
    zh: '电话号码',
    id: 'Nomor Telepon'
  },
  'profilePage.gender': {
    en: 'Gender',
    zh: '性别',
    id: 'Jenis Kelamin'
  },
  'profilePage.dateOfBirth': {
    en: 'Date of Birth',
    zh: '出生日期',
    id: 'Tanggal Lahir'
  },
  'profilePage.male': {
    en: 'Male',
    zh: '男',
    id: 'Laki-laki'
  },
  'profilePage.preferences': {
    en: 'Preferences',
    zh: '偏好设置',
    id: 'Preferensi'
  },
  'profilePage.emailNotifications': {
    en: 'Email Notifications',
    zh: '邮件通知',
    id: 'Notifikasi Email'
  },
  'profilePage.receiveUpdates': {
    en: 'Receive updates about appointments and promotions',
    zh: '接收预约和促销的更新',
    id: 'Terima update tentang janji temu dan promosi'
  },
  'profilePage.manage': {
    en: 'Manage',
    zh: '管理',
    id: 'Kelola'
  },
  'profilePage.accountActions': {
    en: 'Account Actions',
    zh: '账户操作',
    id: 'Tindakan Akun'
  },
  'profilePage.editProfile': {
    en: 'Edit Profile',
    zh: '编辑资料',
    id: 'Edit Profil'
  },
  'profilePage.changePassword': {
    en: 'Change Password',
    zh: '更改密码',
    id: 'Ubah Kata Sandi'
  },
  'toyColors.red': {
    en: 'Red',
    zh: '红色',
    id: 'Merah'
  },
  'toyColors.blue': {
    en: 'Blue',
    zh: '蓝色',
    id: 'Biru'
  },
  'toyColors.orange': {
    en: 'Orange',
    zh: '橙色',
    id: 'Oranye'
  },
  'toyColors.green': {
    en: 'Green',
    zh: '绿色',
    id: 'Hijau'
  },
  'toyColors.white': {
    en: 'White',
    zh: '白色',
    id: 'Putih'
  },
  'toyColors.purple': {
    en: 'Purple',
    zh: '紫色',
    id: 'Ungu'
  },
  'toyColors.secret': {
    en: 'Secret',
    zh: '神秘',
    id: 'Rahasia'
  },
  'seasonCollection.title': {
    en: 'Season 1 Collection - 7,000 toys available',
    zh: '第一季收藏 - 7,000个玩具可用',
    id: 'Koleksi Musim 1 - 7,000 mainan tersedia'
  },
  'seasonCollection.rarity': {
    en: '1,000 secret rarity • 6,000 common rarity',
    zh: '1,000个神秘稀有度 • 6,000个普通稀有度',
    id: '1,000 kelangkaan rahasia • 6,000 kelangkaan umum'
  },
  'commission.totalReferrals': {
    en: 'Total Referrals:',
    zh: '总推荐数：',
    id: 'Total Rujukan:'
  },
  'commission.noReferralNetwork': {
    en: 'No Referral Network Yet',
    zh: '暂无推荐网络',
    id: 'Belum Ada Jaringan Rujukan'
  },
  'commission.shareReferralLink': {
    en: 'Share your referral link to start building your network and earning commissions.',
    zh: '分享您的推荐链接开始建立您的网络并赚取佣金。',
    id: 'Bagikan tautan rujukan Anda untuk mulai membangun jaringan dan mendapatkan komisi.'
  },
  'account.manage': {
    en: 'Manage',
    zh: '管理',
    id: 'Kelola'
  },
  'account.actions': {
    en: 'Account Actions',
    zh: '账户操作',
    id: 'Tindakan Akun'
  },
  'account.editProfile': {
    en: 'Edit Profile',
    zh: '编辑个人资料',
    id: 'Edit Profil'
  },
  'account.changePassword': {
    en: 'Change Password',
    zh: '更改密码',
    id: 'Ubah Kata Sandi'
  },
  'stats.accountStatistics': {
    en: 'Account Statistics',
    zh: '账户统计',
    id: 'Statistik Akun'
  },
  'stats.currentCredits': {
    en: 'Current Credits',
    zh: '当前积分',
    id: 'Kredit Saat Ini'
  },
  'stats.loyaltyPoints': {
    en: 'Loyalty Points',
    zh: '忠诚积分',
    id: 'Poin Loyalitas'
  },
  'stats.totalBookings': {
    en: 'Total Bookings',
    zh: '总预订数',
    id: 'Total Pemesanan'
  },
  'stats.referralEarnings': {
    en: 'Referral Earnings',
    zh: '推荐收益',
    id: 'Pendapatan Rujukan'
  },

  // Additional daily reward and game translations
  'tokens.current': {
    en: 'Current Tokens',
    zh: '当前代币',
    id: 'Token Saat Ini'
  },
  'dailyReward.title': {
    en: 'Daily Reward',
    zh: '每日奖励',
    id: 'Hadiah Harian'
  },
  'dailyReward.readyToClaim': {
    en: 'Ready to Claim!',
    zh: '准备领取！',
    id: 'Siap Diklaim!'
  },
  'dailyReward.notAvailable': {
    en: 'Not Available',
    zh: '不可用',
    id: 'Belum Tersedia'
  },
  'petHealth.status': {
    en: 'Pet Health Status',
    zh: '宠物健康状态',
    id: 'Status Kesehatan Hewan'
  },
  'petHealth.allHealthy': {
    en: 'pets are healthy! ✓',
    zh: '只宠物都很健康！✓',
    id: 'hewan sehat! ✓'
  },
  'petHealth.needCare': {
    en: 'Some pets need care',
    zh: '一些宠物需要照顾',
    id: 'Beberapa hewan memerlukan perawatan'
  },
  'dailyReward.claiming': {
    en: 'Claiming...',
    zh: '领取中...',
    id: 'Mengklaim...'
  },
  'dailyReward.claimToken': {
    en: 'Claim 1 Token',
    zh: '领取1个代币',
    id: 'Klaim 1 Token'
  },
  'dailyReward.nextAvailable': {
    en: 'Next reward available in:',
    zh: '下一个奖励可用时间：',
    id: 'Hadiah berikutnya tersedia dalam:'
  },
  'dailyReward.requirements': {
    en: 'Requirements:',
    zh: '要求：',
    id: 'Persyaratan:'
  },
  'dailyReward.wait24Hours': {
    en: 'Wait 24 hours since last claim',
    zh: '自上次领取后等待24小时',
    id: 'Tunggu 24 jam sejak klaim terakhir'
  },
  'dailyReward.allPetsHealthy': {
    en: 'All pets must be healthy (no 0% stats)',
    zh: '所有宠物必须健康（没有0%统计）',
    id: 'Semua hewan harus sehat (tidak ada stat 0%)'
  },
  'game.over': {
    en: 'Game Over!',
    zh: '游戏结束！',
    id: 'Permainan Selesai!'
  },
  'game.error': {
    en: 'Error',
    zh: '错误',
    id: 'Error'
  },
  'game.failedToSave': {
    en: 'Failed to save score',
    zh: '保存分数失败',
    id: 'Gagal menyimpan skor'
  },
  'game.coinCatching': {
    en: 'Coin Catching Game',
    zh: '抓硬币游戏',
    id: 'Permainan Coin Catching'
  },
  'game.startGame': {
    en: 'Start Game',
    zh: '开始游戏',
    id: 'Mulai Permainan'
  },
  'game.scoreMessage': {
    en: 'Score: {score}. Score saved to leaderboard!',
    zh: '分数：{score}。分数已保存到排行榜！',
    id: 'Skor: {score}. Skor tersimpan di papan peringkat!'
  },
  'game.instructions': {
    en: 'Catch falling coins to earn points! Click coins to catch them.',
    zh: '抓住下落的硬币来赚取分数！点击硬币来抓住它们。',
    id: 'Tangkap koin yang jatuh untuk mendapatkan poin! Klik koin untuk menangkapnya.'
  },
  'game.leaderboard': {
    en: 'Leaderboard',
    zh: '排行榜',
    id: 'Papan Peringkat'
  },
  'game.score': {
    en: 'Score',
    zh: '分数',
    id: 'Skor'
  },
  'game.time': {
    en: 'Time',
    zh: '时间',
    id: 'Waktu'
  },
  'game.back': {
    en: 'Back',
    zh: '返回',
    id: 'Kembali'
  },
  'game.pet': {
    en: 'Pet:',
    zh: '宠物：',
    id: 'Pet:'
  },
  'game.tokens': {
    en: 'tokens',
    zh: '代币',
    id: 'token'
  },
  'game.noScores': {
    en: 'No scores recorded yet. Be the first!',
    zh: '还没有记录分数。成为第一个！',
    id: 'Belum ada skor yang tercatat. Jadilah yang pertama!'
  },
  'pet.autoWoke': {
    en: 'Pet Auto-Woke!',
    zh: '宠物自动醒来！',
    id: 'Pet Bangun Otomatis!'
  },
  'pet.energyFull': {
    en: "Pet's energy is now full (100%)!",
    zh: '宠物的能量现在已满（100%）！',
    id: 'Energi pet sudah penuh (100%)!'
  },
  'pet.nameUpdateSuccess': {
    en: 'Pet name updated successfully! (-5 tokens)',
    zh: '宠物名称更新成功！（-5代币）',
    id: 'Nama pet berhasil diubah! (-5 token)'
  },
  'pet.nameUpdateError': {
    en: 'Failed to update pet name',
    zh: '更新宠物名称失败',
    id: 'Gagal mengubah nama pet'
  },
  'petCare.activitySuccess': {
    en: 'Care activity completed!',
    zh: '护理活动完成！',
    id: 'Aktivitas perawatan berhasil!'
  },
  'petCare.activityError': {
    en: 'Failed to perform care activity',
    zh: '执行护理活动失败',
    id: 'Gagal melakukan aktivitas perawatan'
  },
  'dailyToken.claimed': {
    en: 'Daily Token Claimed!',
    zh: '每日代币已领取！',
    id: 'Token Harian Diklaim!'
  },
  'dailyToken.received': {
    en: "You've received 1 token!",
    zh: '您已收到1个代币！',
    id: 'Anda telah menerima 1 token!'
  },
  'dailyToken.claimFailed': {
    en: 'Failed to Claim Token',
    zh: '领取代币失败',
    id: 'Gagal Mengklaim Token'
  },
  'dailyToken.claimError': {
    en: 'An error occurred while claiming daily token',
    zh: '领取每日代币时发生错误',
    id: 'Terjadi kesalahan saat mengklaim token harian'
  },
  'energyPotion.success': {
    en: 'Energy Potion Success!',
    zh: '能量药水成功！',
    id: 'Ramuan Energi Berhasil!'
  },
  'energyPotion.restored': {
    en: 'Pet energy restored to 100%! Tokens: ',
    zh: '宠物能量恢复到100%！代币：',
    id: 'Energi pet dipulihkan ke 100%! Token: '
  },
  'energyPotion.failed': {
    en: 'Failed to Use Potion',
    zh: '使用药水失败',
    id: 'Gagal Menggunakan Ramuan'
  },
  'energyPotion.error': {
    en: 'Failed to use energy potion',
    zh: '使用能量药水失败',
    id: 'Gagal menggunakan ramuan energi'
  },
  'session.expired': {
    en: 'Session Expired',
    zh: '会话已过期',
    id: 'Sesi Berakhir'
  },
  'session.loginAgain': {
    en: 'Please log in again',
    zh: '请重新登录',
    id: 'Silakan login ulang'
  },
  'verification.failed': {
    en: 'Failed to submit verification',
    zh: '提交验证失败',
    id: 'Gagal mengirim verifikasi'
  },
  'file.tooLarge': {
    en: 'File Too Large',
    zh: '文件过大',
    id: 'File Terlalu Besar'
  },
  'file.maxSize': {
    en: 'Maximum file size is 10MB',
    zh: '最大文件大小为10MB',
    id: 'Ukuran maksimal 10MB'
  },
  'referral.copied': {
    en: 'Copied!',
    zh: '已复制！',
    id: 'Disalin!'
  },
  'referral.linkCopied': {
    en: 'Referral link copied',
    zh: '推荐链接已复制',
    id: 'Link rujukan disalin'
  },
  'appointments.fillAllFields': {
    en: 'Please fill in all fields',
    zh: '请填写所有字段',
    id: 'Harap isi semua field'
  },
  'appointments.twoHourNotice': {
    en: 'Appointments must be booked at least 2 hours in advance',
    zh: '预约必须至少提前2小时',
    id: 'Janji temu harus dipesan setidaknya 2 jam sebelumnya'
  },
  'petCare.failedSleep': {
    en: 'Failed to put pet to sleep',
    zh: '无法让宠物睡觉',
    id: 'Gagal menidurkan hewan'
  },
  'petCare.failedWakeUp': {
    en: 'Failed to wake up pet',
    zh: '无法让宠物醒来',
    id: 'Gagal membangunkan hewan'
  },
  'petCare.awake': {
    en: 'Pet is now awake',
    zh: '宠物现在醒了',
    id: 'Hewan peliharaan sudah bangun'
  },
  'toy.activated': {
    en: 'Toy successfully activated!',
    zh: '玩具成功激活！',
    id: 'Mainan berhasil diaktifkan!'
  },
  'toy.activationFailed': {
    en: 'Failed to activate toy',
    zh: '激活玩具失败',
    id: 'Gagal mengaktifkan mainan'
  },
  'petCare.system': {
    en: 'Pet Care System',
    zh: '宠物护理系统',
    id: 'Sistem Perawatan Hewan'
  },
  'petCare.description': {
    en: 'Take care of your digital pets to earn daily tokens!',
    zh: '照顾您的数字宠物以获得每日代币！',
    id: 'Rawat hewan digital Anda untuk mendapatkan token harian!'
  },
  'navigation.previous': {
    en: 'Previous',
    zh: '上一个',
    id: 'Sebelumnya'
  },
  'navigation.next': {
    en: 'Next',
    zh: '下一个',
    id: 'Selanjutnya'
  },
  'petCounter.text': {
    en: 'Pet {current} of {total}',
    zh: '宠物 {current} 共 {total}',
    id: 'Hewan {current} dari {total}'
  },
  'toy.failedActivation': {
    en: 'Failed to activate toy',
    zh: '无法激活玩具',
    id: 'Gagal mengaktifkan mainan'
  },
  'petCare.systemTitle': {
    en: 'Pet Care System',
    zh: '宠物护理系统',
    id: 'Sistem Perawatan Hewan'
  },
  'petCare.careDescription': {
    en: 'Take care of your digital pets to earn daily tokens!',
    zh: '照顾您的数字宠物以获得每日代币！',
    id: 'Rawat hewan digital Anda untuk mendapatkan token harian!'
  },
  'pet.count': {
    en: 'Pet {current} of {total}',
    zh: '宠物 {current} / {total}',
    id: 'Hewan {current} dari {total}'
  },
  'petStage.grandTurtleDragon': {
    en: 'Grand Turtle Dragon',
    zh: '巨龙龟',
    id: 'Grand Turtle Dragon'
  },
  'petStage.adultTurtleDragon': {
    en: 'Adult Turtle Dragon',
    zh: '成年龙龟',
    id: 'Adult Turtle Dragon'
  },
  'petStage.teenagerTurtleDragon': {
    en: 'Teenager Turtle Dragon',
    zh: '青年龙龟',
    id: 'Teenager Turtle Dragon'
  },
  'petStage.youthTurtleDragon': {
    en: 'Youth Turtle Dragon',
    zh: '幼年龙龟',
    id: 'Youth Turtle Dragon'
  },
  'petStage.babyTurtleDragon': {
    en: 'Baby Turtle Dragon',
    zh: '婴儿龙龟',
    id: 'Baby Turtle Dragon'
  },
  'petStage.deceased': {
    en: 'Deceased',
    zh: '已故',
    id: 'Meninggal'
  },
  'petStatus.lifetime': {
    en: 'Lifetime:',
    zh: '生命周期：',
    id: 'Waktu Hidup:'
  },
  'petStatus.age': {
    en: 'Age:',
    zh: '年龄：',
    id: 'Umur:'
  },
  'petStatus.yearsOld': {
    en: 'years old',
    zh: '岁',
    id: 'tahun'
  },
  'petStatus.diedAt100': {
    en: 'Died at age 100',
    zh: '100岁时死亡',
    id: 'Meninggal pada usia 100 tahun'
  },
  'petStatus.approachingMax': {
    en: 'Approaching maximum age!',
    zh: '接近最大年龄！',
    id: 'Mendekati usia maksimal!'
  },
  'petStatus.stage': {
    en: 'Stage:',
    zh: '阶段：',
    id: 'Tahap:'
  },
  'petStatus.starving': {
    en: 'Starving',
    zh: '饥饿',
    id: 'Lapar'
  },
  'petStatus.tooYoung': {
    en: 'Too young for tokens',
    zh: '太小无法获得代币',
    id: 'Terlalu muda untuk token'
  },
  'petStats.happiness': {
    en: 'Happiness',
    zh: '快乐度',
    id: 'Kebahagiaan'
  },
  'petStats.hunger': {
    en: 'Hunger',
    zh: '饥饿度',
    id: 'Lapar'
  },
  'petStats.cleanliness': {
    en: 'Cleanliness',
    zh: '清洁度',
    id: 'Kebersihan'
  },
  'petStats.energy': {
    en: 'Energy',
    zh: '能量',
    id: 'Energi'
  },
  'petEvolution.progress': {
    en: 'Evolution Progress',
    zh: '进化进度',
    id: 'Perkembangan Evolusi'
  },
  'petEvolution.currentStage': {
    en: 'Current Stage:',
    zh: '当前阶段：',
    id: 'Tahap Saat Ini:'
  },
  'petEvolution.petAge': {
    en: 'Pet Age:',
    zh: '宠物年龄：',
    id: 'Umur Pet:'
  },
  'timeUnits.years': {
    en: 'years',
    zh: '年',
    id: 'tahun'
  },
  'petEvolution.nextEvolution': {
    en: 'Next Evolution:',
    zh: '下一次进化：',
    id: 'Evolusi Berikutnya:'
  },
  'petStages.child': {
    en: 'Child',
    zh: '儿童',
    id: 'Anak'
  },
  'petStages.teen': {
    en: 'Teen',
    zh: '青少年',
    id: 'Remaja'
  },
  'petStages.adult': {
    en: 'Adult',
    zh: '成人',
    id: 'Dewasa'
  },
  'petStages.elder': {
    en: 'Elder',
    zh: '长者',
    id: 'Lansia'
  },
  'petStages.maximum': {
    en: 'Maximum',
    zh: '最大',
    id: 'Maksimal'
  },
  'petEvolution.endOfLife': {
    en: 'Pet has reached the end of its loving life.',
    zh: '宠物已经到达了充满爱的生命终点。',
    id: 'Pet telah mencapai akhir hidupnya dengan penuh kasih.'
  },
  'petEvolution.careToAccelerate': {
    en: 'Care for your pet to accelerate development!',
    zh: '照顾您的宠物以加速发展！',
    id: 'Rawat pet Anda untuk mempercepat perkembangan!'
  },
  'dailyActivities.title': {
    en: 'Daily Activities',
    zh: '日常活动',
    id: 'Aktivitas Harian'
  },
  'energyNotEnough.title': {
    en: 'Not Enough Energy!',
    zh: '能量不足！',
    id: 'Energi Tidak Cukup!'
  },
  'energyNotEnough.description': {
    en: 'Pet needs to rest or sleep to gain energy.',
    zh: '宠物需要休息或睡觉来获得能量。',
    id: 'Pet perlu istirahat atau tidur untuk mendapatkan energi.'
  },
  'careButtons.feed': {
    en: 'Feed',
    zh: '喂食',
    id: 'Beri Makan'
  },
  'careButtons.bathe': {
    en: 'Bathe',
    zh: '洗澡',
    id: 'Mandikan'
  },
  'careButtons.play': {
    en: 'Play',
    zh: '玩耍',
    id: 'Bermain'
  },
  'careButtons.wakeUp': {
    en: 'Wake Up',
    zh: '唤醒',
    id: 'Bangunkan'
  },
  'careButtons.sleep': {
    en: 'Sleep',
    zh: '睡觉',
    id: 'Tidurkan'
  },
  'careButtons.energy': {
    en: 'Energy',
    zh: '能量',
    id: 'Energi'
  },
  'petStates.sleeping': {
    en: 'Sleeping',
    zh: '睡觉中',
    id: 'Sedang Tidur'
  },
  'petStates.fullEnergy': {
    en: 'Full Energy',
    zh: '能量满满',
    id: 'Penuh Energi'
  },
  'happiness.full.title': {
    en: 'Happiness Full!',
    zh: '快乐满满！',
    id: 'Happiness Penuh!'
  },
  'happiness.full.description': {
    en: 'Pet is already very happy!',
    zh: '宠物已经很开心了！',
    id: 'Pet sudah sangat bahagia!'
  },
  'petInfo.sleeping': {
    en: 'Pet is Sleeping',
    zh: '宠物正在睡觉',
    id: 'Pet Sedang Tidur'
  },
  'petInfo.energyRestore': {
    en: 'Energy restores automatically every 5 minutes',
    zh: '能量每5分钟自动恢复',
    id: 'Energi akan pulih secara otomatis setiap 5 menit'
  },
  'games.feedingTime': {
    en: '🎮 Mini Game: Feeding Time',
    zh: '🎮 小游戏：喂食时间',
    id: '🎮 Mini Game: Feeding Time'
  },
  'games.coinCatching': {
    en: 'Start Coin Catching Game',
    zh: '开始接金币游戏',
    id: 'Mulai Coin Catching Game'
  },
  'petInfo.title': {
    en: 'Pet Information',
    zh: '宠物信息',
    id: 'Informasi Hewan Peliharaan'
  },
  'petInfo.born': {
    en: 'Born:',
    zh: '出生：',
    id: 'Lahir:'
  },
  'petInfo.age': {
    en: 'Age:',
    zh: '年龄：',
    id: 'Umur:'
  },
  'petInfo.status': {
    en: 'Status:',
    zh: '状态：',
    id: 'Status:'
  },
  'common.years': {
    en: 'years',
    zh: '年',
    id: 'tahun'
  },
  'petStatus.deceased': {
    en: 'Deceased',
    zh: '已故',
    id: 'Meninggal'
  },
  'petStatus.healthy': {
    en: 'Healthy',
    zh: '健康',
    id: 'Sehat'
  },
  'petStatus.great': {
    en: 'Great',
    zh: '很好',
    id: 'Bagus'
  },
  'petStatus.good': {
    en: 'Good',
    zh: '好',
    id: 'Baik'
  },
  'petStatus.bad': {
    en: 'Bad',
    zh: '差',
    id: 'Buruk'
  },
  'petInfo.tokens': {
    en: 'Tokens:',
    zh: '代币：',
    id: 'Token:'
  },
  'petCareSystem.title': {
    en: 'Pet Care System',
    zh: '宠物护理系统',
    id: 'Sistem Perawatan Hewan'
  },
  'petCareSystem.buyToys': {
    en: 'Buy toys from the marketplace to create pets!',
    zh: '从市场购买玩具来创建宠物！',
    id: 'Beli mainan terlebih dahulu untuk membuat hewan peliharaan!'
  },
  'toys.visitMarketplace': {
    en: 'Visit Marketplace tab to buy toys',
    zh: '访问市场选项卡购买玩具',
    id: 'Kunjungi tab Marketplace untuk membeli mainan'
  },
  'toys.awaiting': {
    en: 'Toys Awaiting Activation',
    zh: '等待激活的玩具',
    id: 'Mainan yang Perlu Diaktivasi'
  },
  'toys.activateDescription': {
    en: 'Activate your toys to turn them into pets',
    zh: '激活您的玩具将其变成宠物',
    id: 'Aktivasi mainan untuk mengubahnya menjadi hewan peliharaan'
  },
  'toys.active': {
    en: 'Active Toys - Create Pets',
    zh: '活跃玩具 - 创建宠物',
    id: 'Mainan Aktif - Buat Hewan Peliharaan'
  },
  'toys.createDescription': {
    en: 'Turn active toys into virtual pets',
    zh: '将活跃玩具变成虚拟宠物',
    id: 'Ubah mainan aktif menjadi hewan peliharaan virtual'
  },
  'common.active': {
    en: 'Active',
    zh: '活跃',
    id: 'Aktif'
  },
  'common.born': {
    en: 'Born',
    zh: '出生',
    id: 'Lahirkan'
  },
  'common.createPet': {
    en: 'Create Pet',
    zh: '创建宠物',
    id: 'Buat Pet'
  },
  'success.title': {
    en: 'Success!',
    zh: '成功！',
    id: 'Berhasil!'
  },
  'success.petCreated': {
    en: 'Pet successfully created!',
    zh: '宠物创建成功！',
    id: 'Hewan peliharaan berhasil dibuat!'
  },
  'error.title': {
    en: 'Error',
    zh: '错误',
    id: 'Error'
  },
  'error.petCreationFailed': {
    en: 'Failed to create pet',
    zh: '创建宠物失败',
    id: 'Gagal membuat hewan peliharaan'
  },
  'dailyActivities.completeAll': {
    en: 'Complete all activities to earn 1 token today!',
    zh: '完成所有活动即可获得今日1个代币！',
    id: 'Selesaikan semua aktivitas untuk mendapatkan 1 token hari ini!'
  },
  'energy.currentEnergy': {
    en: 'Current energy: ',
    zh: '当前能量：',
    id: 'Energi saat ini: '
  },
  'energy.fullCanWake': {
    en: 'Energy full! Can wake up now',
    zh: '能量满满！现在可以唤醒',
    id: 'Energi penuh! Bisa bangun sekarang'
  },
  'wakeUp.button': {
    en: 'Wake Pet',
    zh: '唤醒宠物',
    id: 'Bangunkan Pet'
  },
  'petCareSystem.description': {
    en: 'Take care of your digital pets to earn daily tokens!',
    zh: '照顾您的数字宠物以获得每日代币！',
    id: 'Rawat hewan digital Anda untuk mendapatkan token harian!'
  },
  'booking.incompleteData': {
    en: 'Incomplete Data',
    zh: '数据不完整',
    id: 'Data Tidak Lengkap'
  },
  'booking.fillAllFields': {
    en: 'Please fill all fields, select service category, and upload receipt image',
    zh: '请填写所有字段，选择服务类别，并上传收据图片',
    id: 'Mohon isi semua field dan upload bukti pembayaran'
  },
  'profile.notificationSettings': {
    en: 'Notification Settings',
    zh: '通知设置',
    id: 'Pengaturan Notifikasi'
  },
  'profile.emailNotifications': {
    en: 'Email Notifications',
    zh: '邮件通知',
    id: 'Notifikasi Email'
  },
  'profile.receiveEmailUpdates': {
    en: 'Receive updates via email',
    zh: '通过邮件接收更新',
    id: 'Terima update melalui email'
  },
  'profile.smsNotifications': {
    en: 'SMS Notifications',
    zh: '短信通知',
    id: 'Notifikasi SMS'
  },
  'profile.receiveSmsUpdates': {
    en: 'Receive updates via SMS',
    zh: '通过短信接收更新',
    id: 'Terima update melalui SMS'
  },
  'achievements.activeAgent': {
    en: 'Active Agent',
    zh: '活跃代理',
    id: 'Agen Aktif'
  },
  'achievements.activeAgentDesc': {
    en: 'Reach 15 active referrals!',
    zh: '达到15个活跃推荐！',
    id: 'Capai 15 referral aktif!'
  },
  'achievements.activeAgentReward': {
    en: '750 Points + 450 Bonus',
    zh: '750积分 + 450奖励',
    id: '750 Poin + 450 Bonus'
  },
  'achievements.referralChampion': {
    en: 'Referral Champion',
    zh: '推荐冠军',
    id: 'Juara Rujukan'
  },
  'achievements.referralChampionDesc': {
    en: 'Achieve 20 successful invites!',
    zh: '完成20个成功邀请！',
    id: 'Mencapai 20 undangan sukses!'
  },
  'achievements.referralChampionReward': {
    en: '1,000 Points + 600 Bonus',
    zh: '1,000积分 + 600奖励',
    id: '1,000 Poin + 600 Bonus'
  },
  'achievements.masterNetworker': {
    en: 'Master Networker',
    zh: '网络大师',
    id: 'Master Networker'
  },
  'achievements.masterNetworkerDesc': {
    en: 'Invitation king with 25 referrals!',
    zh: '邀请之王，拥有25个推荐！',
    id: 'Raja undangan dengan 25 rujukan!'
  },
  'loyaltyTier.bronze': {
    en: 'Bronze',
    zh: '青铜',
    id: 'Perunggu'
  },
  'achievements.legendaryStatus': {
    en: 'Legendary status with 50 referrals!',
    zh: '50个推荐的传奇地位！',
    id: 'Status legendaris dengan 50 rujukan!'
  },
  'achievements.spendRequirement': {
    en: '5 of your referrals spend 10,000,000 RP each',
    zh: '您的5个推荐人每人消费10,000,000 RP',
    id: '5 referral Anda menghabiskan 10,000,000 RP masing-masing'
  },
  'referral.eachSuccessful': {
    en: 'Each successful referral:',
    zh: '每个成功推荐：',
    id: 'Setiap rujukan berhasil:'
  },
  'referral.bonusEvery5': {
    en: 'Bonus every 5 referrals:',
    zh: '每5个推荐的奖励：',
    id: 'Bonus setiap 5 rujukan:'
  },
  'common.referrals': {
    en: 'referrals',
    zh: '推荐',
    id: 'rujukan'
  },
  'referral.autoPoints': {
    en: 'Points are earned automatically when referrals are successful',
    zh: '推荐成功时自动获得积分',
    id: 'Poin diperoleh otomatis saat rujukan berhasil'
  },
  'referral.milestoneBonus': {
    en: 'Milestone bonuses are given every 5 referrals',
    zh: '每5个推荐给予里程碑奖励',
    id: 'Bonus milestone diberikan setiap kelipatan 5 rujukan'
  },
  'collection.toyAdded': {
    en: 'Toy has been added to your collection',
    zh: '玩具已添加到您的收藏',
    id: 'Mainan telah ditambahkan ke koleksi Anda'
  },
  'qr.scanForReferral': {
    en: 'Scan QR Code for referral',
    zh: '扫描二维码进行推荐',
    id: 'Pindai QR Code untuk rujukan'
  },
  'profile.manageSettings': {
    en: 'Manage your account settings and preferences',
    zh: '管理您的账户设置和偏好',
    id: 'Kelola pengaturan akun dan preferensi'
  },
  'pet.sleeping': {
    en: 'Pet is Sleeping',
    zh: '宠物正在睡觉',
    id: 'Pet Sedang Tidur'
  },
  'pet.energyRestore': {
    en: 'Energy restores automatically every 5 minutes',
    zh: '能量每5分钟自动恢复',
    id: 'Energi akan pulih secara otomatis setiap 5 menit'
  },
  'form.incompleteData': {
    en: 'Incomplete Data',
    zh: '数据不完整',
    id: 'Data Tidak Lengkap'
  },
  'form.fillAllFields': {
    en: 'Please fill all fields, select service category, and upload receipt image',
    zh: '请填写所有字段，选择服务类别，并上传收据图片',
    id: 'Mohon isi semua field dan upload bukti pembayaran'
  },
  'achievements.legendaryReward': {
    en: '2,500 Points + 1,500 Bonus',
    zh: '2,500积分 + 1,500奖励',
    id: '2,500 Poin + 1,500 Bonus'
  },
  'achievements.legendaryAmbassador': {
    en: 'Legendary Ambassador',
    zh: '传奇大使',
    id: 'Duta Legendaris'
  },
  'achievements.shoppingMentor': {
    en: 'Shopping Mentor',
    zh: '购物导师',
    id: 'Mentor Belanja'
  },
  'achievements.firstReward': {
    en: '1,250 Points + 750 Bonus',
    zh: '1,250积分 + 750奖励',
    id: '1,250 Poin + 750 Bonus'
  },
  'achievements.bonusPoints': {
    en: '100 Bonus Points',
    zh: '100奖励积分',
    id: '100 Poin Bonus'
  },
  'camera.notAvailable': {
    en: 'Camera Not Available',
    zh: '摄像头不可用',
    id: 'Kamera Tidak Tersedia'
  },
  'camera.useManual': {
    en: 'Cannot access camera. Please use manual input.',
    zh: '无法访问摄像头。请使用手动输入。',
    id: 'Tidak dapat mengakses kamera. Gunakan input manual.'
  },
  'account.creditsRefunded': {
    en: 'Credits refunded to your account',
    zh: '积分已退还到您的账户',
    id: 'Kredit dikembalikan ke akun Anda'
  },
  'account.creditsAdded': {
    en: 'Credits have been added to your account',
    zh: '积分已添加到您的账户',
    id: 'Kredit telah ditambahkan ke akun Anda'
  },

  'settings.saveFailed': {
    en: 'Failed to save settings',
    zh: '保存设置失败',
    id: 'Gagal menyimpan pengaturan'
  },
  'seasonCollection.season1': {
    en: 'Season 1 Collection - 7,000 toys available',
    zh: '第1季收藏 - 7,000个玩具可用',
    id: 'Koleksi Musim 1 - 7,000 mainan tersedia'
  },
  'seasonCollection.rarityInfo': {
    en: '1,000 secret rarity • 6,000 common rarity',
    zh: '1,000个秘密稀有度 • 6,000个普通稀有度',
    id: '1,000 kelangkaan rahasia • 6,000 kelangkaan umum'
  },
  'camera.button': {
    en: 'Camera',
    zh: '相机',
    id: 'Kamera'
  },
  'activation.activateButton': {
    en: 'Activate',
    zh: '激活',
    id: 'Aktifkan'
  },
  'pet.nextEnergyBoost': {
    en: 'Time until next energy boost',
    zh: '距离下次能量提升时间',
    id: 'Waktu hingga energi berikutnya'
  },
  'pet.lifeRemaining': {
    en: 'Life remaining: {{days}} days ({{years}} years)',
    zh: '剩余生命：{{days}}天（{{years}}年）',
    id: 'Sisa hidup: {{days}} hari ({{years}} tahun)'
  },
  'pet.sleepingFor': {
    en: 'Sleeping for {{time}}',
    zh: '已睡眠{{time}}',
    id: 'Telah tidur selama {{time}}'
  },
  'qr.featureUnderDevelopment': {
    en: 'Feature Under Development',
    zh: '功能开发中',
    id: 'Fitur Dalam Pengembangan'
  },
  'qr.autoDetectionComingSoon': {
    en: 'Automatic QR code detection coming soon. Please use manual input.',
    zh: '自动二维码检测即将推出。请使用手动输入。',
    id: 'Deteksi QR code otomatis akan segera tersedia. Silakan gunakan input manual.'
  },
  'tokens.claimSubmittedSuccess': {
    en: 'Token claim request submitted successfully!',
    zh: '代币申请提交成功！',
    id: 'Permintaan klaim token berhasil diajukan!'
  },
  'tokens.claimSubmitFailed': {
    en: 'Failed to submit token claim',
    zh: '提交代币申请失败',
    id: 'Gagal mengajukan klaim token'
  },
  'appointments.bookingSuccess': {
    en: 'Appointment booked! Waiting for admin approval',
    zh: '预约已创建！等待管理员批准',
    id: 'Reservasi berhasil dibuat! Menunggu persetujuan admin'
  },
  'appointments.rescheduleSuccess': {
    en: 'Appointment rescheduled successfully',
    zh: '预约重新安排成功',
    id: 'Jadwal berhasil diubah'
  },
  'appointments.deleteSuccess': {
    en: 'Appointment deleted successfully',
    zh: '预约删除成功',
    id: 'Reservasi berhasil dihapus'
  },
  'credits.addSuccess': {
    en: 'RP {{amount}} added successfully',
    zh: 'RP {{amount}} 添加成功',
    id: 'RP {{amount}} berhasil ditambahkan'
  },
  'cashout.minimumAmount': {
    en: 'Minimum cash-out RP 50,000',
    zh: '最低提现 RP 50,000',
    id: 'Minimal penarikan RP 50,000'
  },
  'credits.insufficient': {
    en: 'Insufficient credits',
    zh: '积分不足',
    id: 'Kredit tidak mencukupi'
  },
  'cashout.requestSubmitted': {
    en: 'Cash-out request submitted successfully',
    zh: '提现申请提交成功',
    id: 'Permintaan penarikan berhasil diajukan'
  },
  'cashout.processingFailed': {
    en: 'Failed to process cash-out',
    zh: '处理提现失败',
    id: 'Gagal memproses penarikan'
  },
  'toys.enterQrCode': {
    en: 'Enter toy QR code',
    zh: '输入玩具二维码',
    id: 'Masukkan kode QR mainan'
  },
  'marketplace.saleCanceled': {
    en: 'Sale Canceled',
    zh: '销售已取消',
    id: 'Penjualan Dibatalkan'
  },
  'marketplace.toyReturnedToInventory': {
    en: 'Toy returned to your inventory',
    zh: '玩具已返回您的库存',
    id: 'Mainan dikembalikan ke inventori Anda'
  },
  'marketplace.saleCancelled': {
    en: 'Sale Cancelled',
    zh: '销售已取消',
    id: 'Penjualan Dibatalkan'
  },
  'marketplace.itemReturnedWithRefund': {
    en: 'Item returned to marketplace and credits refunded',
    zh: '商品已退回市场并退还积分',
    id: 'Item dikembalikan ke marketplace dan kredit dikembalikan'
  },
  'marketplace.purchaseCancelled': {
    en: 'Purchase Cancelled',
    zh: '购买已取消',
    id: 'Pembelian Dibatalkan'
  },
  'marketplace.cannotBuyOwnItem': {
    en: 'Cannot buy your own item',
    zh: '不能购买自己的商品',
    id: 'Tidak bisa membeli item sendiri'
  },
  'marketplace.purchaseSuccessful': {
    en: 'Purchase Successful!',
    zh: '购买成功！',
    id: 'Pembelian Berhasil!'
  },
  'marketplace.creditsDeductedWaitingConfirmation': {
    en: 'Credits deducted. Waiting for seller confirmation to earn {{points}} points.',
    zh: '积分已扣除。等待卖家确认以获得 {{points}} 积分。',
    id: 'Kredit telah dipotong. Menunggu penjual konfirmasi untuk mendapat {{points}} poin.'
  },
  'marketplace.confirmationSuccessful': {
    en: 'Confirmation Successful!',
    zh: '确认成功！',
    id: 'Konfirmasi Berhasil!'
  },
  'marketplace.saleConfirmedWaitingBuyer': {
    en: 'Sale confirmed, waiting for buyer confirmation',
    zh: '销售已确认，等待买家确认',
    id: 'Penjualan dikonfirmasi, menunggu konfirmasi penerima'
  },
  'marketplace.saleConfirmed': {
    en: 'Sale Confirmed!',
    zh: '销售确认！',
    id: 'Penjualan Dikonfirmasi!'
  },
  'profile.passwordMismatch': {
    en: "New passwords don't match",
    zh: '新密码不匹配',
    id: 'Password baru tidak cocok'
  },
  'profile.passwordMinLength': {
    en: 'Password must be at least 6 characters',
    zh: '密码至少需要6个字符',
    id: 'Password minimal 6 karakter'
  },
  'account.invalidAccountNumber': {
    en: 'Invalid Account Number',
    zh: '无效的账户号码',
    id: 'Nomor Rekening Tidak Valid'
  },
  'account.accountNumberDigits': {
    en: '{{bankName}} account number must be {{minDigits}}-{{maxDigits}} digits',
    zh: '{{bankName}} 账户号码必须为 {{minDigits}}-{{maxDigits}} 位数字',
    id: 'Nomor rekening {{bankName}} harus {{minDigits}}-{{maxDigits}} digit'
  },
  'profile.passwordChangedSuccessfully': {
    en: 'Password changed successfully',
    zh: '密码修改成功',
    id: 'Password berhasil diubah'
  },
  'profile.passwordChangeFailed': {
    en: 'Failed to change password',
    zh: '密码修改失败',
    id: 'Gagal mengubah password'
  },
  'common.errorOccurred': {
    en: 'An error occurred',
    zh: '发生错误',
    id: 'Terjadi kesalahan'
  },
  'credits.topUp': {
    en: 'Top Up Credits',
    zh: '充值积分',
    id: 'Top Up Kredit'
  },
  'credits.customAmount': {
    en: 'Custom amount',
    zh: '自定义金额',
    id: 'Jumlah custom'
  },
  'cashout.withdrawToBank': {
    en: '💰 Cash Out to Bank',
    zh: '💰 提现到银行',
    id: '💰 Tarik Kredit ke Bank'
  },
  'cashout.withdrawalAmount': {
    en: 'Withdrawal Amount',
    zh: '提现金额',
    id: 'Jumlah Penarikan'
  },
  'cashout.availableBalance': {
    en: 'Available balance: RP {{amount}}',
    zh: '可用余额：RP {{amount}}',
    id: 'Saldo tersedia: RP {{amount}}'
  },
  'cashout.bankName': {
    en: 'Bank Name',
    zh: '银行名称',
    id: 'Nama Bank'
  },
  'cashout.accountNumber': {
    en: 'Account Number',
    zh: '账户号码',
    id: 'Nomor Rekening'
  },
  'common.submitRequest': {
    en: 'Submit Request',
    zh: '提交请求',
    id: 'Kirim Permintaan'
  },
  'cashout.selectBank': {
    en: 'Select bank or e-wallet',
    zh: '选择银行或电子钱包',
    id: 'Pilih bank atau e-wallet'
  },
  'cashout.enterAccountNumber': {
    en: 'Enter account number',
    zh: '输入账户号码',
    id: 'Masukkan nomor rekening'
  },
  'cashout.selectBankFirst': {
    en: 'Select bank first',
    zh: '请先选择银行',
    id: 'Pilih bank terlebih dahulu'
  },
  'cashout.accountHolderName': {
    en: 'Account Holder Name',
    zh: '账户持有人姓名',
    id: 'Nama Pemilik Rekening'
  },
  'cashout.nameAsPerBank': {
    en: 'Name as per bank account',
    zh: '银行账户姓名',
    id: 'Nama sesuai rekening bank'
  },
  'cashout.submitWithdrawal': {
    en: 'Submit Withdrawal',
    zh: '提交提现',
    id: 'Ajukan Penarikan'
  },
  'marketplace.selectToyToSell': {
    en: 'Select toy to sell',
    zh: '选择要出售的玩具',
    id: 'Pilih mainan untuk dijual'
  },
  'marketplace.sellingPrice': {
    en: 'Selling Price (RP)',
    zh: '售价 (RP)',
    id: 'Harga Jual (RP)'
  },
  'marketplace.enterPrice': {
    en: 'Enter price',
    zh: '输入价格',
    id: 'Masukkan harga'
  },
  'marketplace.createListing': {
    en: 'Create Listing',
    zh: '创建列表',
    id: 'Buat Listing'
  },
  'navigation.referrals': {
    en: 'Referrals',
    zh: '推荐',
    id: 'Rujukan'
  },
  'navigation.achievement': {
    en: 'Achievement',
    zh: '成就',
    id: 'Pencapaian'
  },
  'cashout.bankValidation': {
    en: '{{bankName}}: {{digits}} digits {{status}}',
    zh: '{{bankName}}: {{digits}} 位数字 {{status}}',
    id: '{{bankName}}: {{digits}} digit {{status}}'
  },
  'cashout.withdrawalNotice': {
    en: '⚠️ Withdrawal process takes 1-3 business days. Please ensure bank details are correct.',
    zh: '⚠️ 提现过程需要1-3个工作日。请确保银行详细信息正确。',
    id: '⚠️ Proses penarikan membutuhkan 1-3 hari kerja. Pastikan data bank sudah benar.'
  },
  'referral.shareToEarn': {
    en: 'Share to earn 10% commission',
    zh: '分享以获得10%佣金',
    id: 'Bagikan untuk dapat komisi 10%'
  },
  'qr.scanCode': {
    en: 'Scan QR Code',
    zh: '扫描二维码',
    id: 'Pindai QR Code'
  },
  'loyalty.discountActive': {
    en: 'discount active',
    zh: '折扣活跃',
    id: 'diskon aktif'
  },
  'security.enterPin': {
    en: 'Enter PIN Code',
    zh: '输入密码',
    id: 'Masukkan Kode Pin'
  },
  'common.points': {
    en: 'points',
    zh: '积分',
    id: 'poin'
  },
  'common.discount': {
    en: 'discount',
    zh: '折扣',
    id: 'diskon'
  },
  'common.more': {
    en: 'more',
    zh: '更多',
    id: 'lainnya'
  },
  'stock.left': {
    en: 'Stock left',
    zh: '剩余库存',
    id: 'Stok tersisa'
  },
  'filters.all': {
    en: 'All',
    zh: '全部',
    id: 'Semua'
  },
  'filters.earned': {
    en: 'Earned',
    zh: '获得',
    id: 'Diperoleh'
  },
  'filters.redeemed': {
    en: 'Redeemed',
    zh: '兑换',
    id: 'Ditukar'
  },
  'filters.filterByDate': {
    en: 'Filter by date',
    zh: '按日期筛选',
    id: 'Filter tanggal'
  },
  'filters.clearFilters': {
    en: 'Clear Filters',
    zh: '清除筛选',
    id: 'Hapus Filter'
  },
  'pagination.items': {
    en: 'items',
    zh: '项目',
    id: 'item'
  },
  'common.noData': {
    en: 'No data',
    zh: '无数据',
    id: 'Tidak ada data'
  },
  'common.noHistory': {
    en: 'No history',
    zh: '无历史记录',
    id: 'Tidak ada riwayat'
  },
  'common.next': {
    en: 'Next',
    zh: '下一个',
    id: 'Selanjutnya'
  },
  'status.completed': {
    en: 'Completed',
    zh: '已完成',
    id: 'Selesai'
  },
  'status.used': {
    en: 'Used',
    zh: '已使用',
    id: 'Digunakan'
  },
  'achievements.rulesAndPoints': {
    en: 'Achievement Rules & Points',
    zh: '成就规则和积分',
    id: 'Aturan Pencapaian & Poin'
  },
  'referral.points': {
    en: 'Referral Points',
    zh: '推荐积分',
    id: 'Poin Rujukan'
  },
  'referral.milestones': {
    en: 'Referral Milestones',
    zh: '推荐里程碑',
    id: 'Target Rujukan'
  },
  'achievements.spending': {
    en: 'Spending Achievement',
    zh: '消费成就',
    id: 'Pencapaian Belanja'
  },
  'commission.store': {
    en: 'Commission Store',
    zh: '佣金商店',
    id: 'Toko Komisi'
  },
  'digital.store': {
    en: 'Digital Store',
    zh: '数字商店',
    id: 'Toko Digital'
  },
  'navigation.gifts': {
    en: 'Gifts',
    zh: '礼品',
    id: 'Hadiah'
  },
  'navigation.collection': {
    en: 'Collection',
    zh: '收藏',
    id: 'Koleksi'
  },
  'shopping.mentor': {
    en: 'Shopping Mentor',
    zh: '购物导师',
    id: 'Mentor Belanja'
  },
  'progress.current': {
    en: 'Current Progress',
    zh: '当前进度',
    id: 'Progres Saat Ini'
  },

  'referral.nextMilestone': {
    en: 'Next Milestone:',
    zh: '下一个里程碑：',
    id: 'Target Berikutnya:'
  },
  'achievement.allCompleted': {
    en: 'All completed!',
    zh: '全部完成！',
    id: 'Semua tercapai!'
  },
  'points.howTheyWork': {
    en: 'How Points Work',
    zh: '积分如何运作',
    id: 'Cara Kerja Poin'
  },
  'points.exchangeInfo': {
    en: 'Points can be exchanged for credits or rewards',
    zh: '积分可以兑换积分或奖励',
    id: 'Poin dapat ditukar dengan kredit atau hadiah'
  },
  'points.noTimeLimit': {
    en: 'No time limit for using points',
    zh: '使用积分没有时间限制',
    id: 'Tidak ada batas waktu untuk menggunakan poin'
  },
  'common.startingFrom': {
    en: 'Starting from',
    zh: '起价',
    id: 'Mulai dari'
  },
  'appointment.reschedule': {
    en: 'Reschedule',
    zh: '重新安排',
    id: 'Ubah'
  },
  'pagination.perPage': {
    en: '10 per page',
    zh: '每页10项',
    id: '10 per halaman'
  },
  'listing.soldBy': {
    en: 'Sold by',
    zh: '销售者',
    id: 'Dijual oleh'
  },
  'purchase.awaitingConfirmation': {
    en: 'Awaiting Your Confirmation',
    zh: '等待您的确认',
    id: 'Menunggu Konfirmasi Anda'
  },

  'listing.yourItem': {
    en: 'Your Item',
    zh: '您的物品',
    id: 'Milik Anda'
  },
  'sale.cancelled': {
    en: 'Sale Cancelled',
    zh: '销售已取消',
    id: 'Penjualan Dibatalkan'
  },
  'listing.removed': {
    en: 'Listing removed from marketplace',
    zh: '商品已从市场移除',
    id: 'Listing dihapus dari marketplace'
  },
  'sale.cancel': {
    en: 'Cancel Sale',
    zh: '取消销售',
    id: 'Batalkan Penjualan'
  },
  'purchase.pendingSeller': {
    en: 'Pending Seller Confirmation',
    zh: '等待卖家确认',
    id: 'Menunggu Konfirmasi Penjual'
  },
  'purchase.cancel': {
    en: 'Cancel Purchase',
    zh: '取消购买',
    id: 'Batalkan Pembelian'
  },
  'purchase.awaitingDelivery': {
    en: 'Awaiting Delivery Confirmation',
    zh: '等待交付确认',
    id: 'Menunggu Konfirmasi Diterima'
  },
  'common.buy': {
    en: 'Buy',
    zh: '购买',
    id: 'Beli'
  },

  'history.complete': {
    en: 'Complete History',
    zh: '完整历史记录',
    id: 'Riwayat Lengkap'
  },
  'history.manage': {
    en: 'Manage all your activity history',
    zh: '管理您的所有活动历史记录',
    id: 'Kelola semua riwayat aktivitas Anda'
  },

  'common.credits': {
    en: 'Credits',
    zh: '积分',
    id: 'Kredit'
  },
  'common.tokens': {
    en: 'Tokens',
    zh: '代币',
    id: 'Token'
  },
  'common.bookings': {
    en: 'Bookings',
    zh: '预订',
    id: 'Booking'
  },
  'common.redemptions': {
    en: 'Redemptions',
    zh: '兑换',
    id: 'Penukaran'
  },
  'history.filtersSearch': {
    en: 'Filters & Search',
    zh: '筛选和搜索',
    id: 'Filter & Pencarian'
  },
  'date.startDate': {
    en: 'Start Date',
    zh: '开始日期',
    id: 'Tanggal Mulai'
  },
  'date.endDate': {
    en: 'End Date',
    zh: '结束日期',
    id: 'Tanggal Akhir'
  },
  'common.type': {
    en: 'Type',
    zh: '类型',
    id: 'Tipe'
  },
  'common.search': {
    en: 'Search',
    zh: '搜索',
    id: 'Cari'
  },
  'status.pending': {
    en: 'Pending',
    zh: '待处理',
    id: 'Menunggu'
  },
  'status.approved': {
    en: 'Approved',
    zh: '已批准',
    id: 'Disetujui'
  },
  'status.rejected': {
    en: 'Rejected',
    zh: '已拒绝',
    id: 'Ditolak'
  },
  'filter.reset': {
    en: 'Reset Filters',
    zh: '重置筛选',
    id: 'Reset Filter'
  },
  'history.points': {
    en: 'Points History',
    zh: '积分历史记录',
    id: 'Riwayat Poin'
  },
  'history.credits': {
    en: 'Credits History',
    zh: '积分历史记录',
    id: 'Riwayat Kredit'
  },
  'history.tokens': {
    en: 'Tokens History',
    zh: '代币历史记录',
    id: 'Riwayat Token'
  },
  'history.appointments': {
    en: 'Appointment History',
    zh: '预约历史记录',
    id: 'Riwayat Booking'
  },
  'history.redemptions': {
    en: 'Redemption History',
    zh: '兑换历史记录',
    id: 'Riwayat Penukaran'
  },
  'common.page': {
    en: 'Page',
    zh: '页',
    id: 'Halaman'
  },
  'common.noDataFound': {
    en: 'No data found',
    zh: '未找到数据',
    id: 'Tidak ada data ditemukan'
  },
  'common.notes': {
    en: 'Notes: ',
    zh: '备注：',
    id: 'Catatan: '
  },
  'history.empty': {
    en: 'No history available',
    zh: '没有历史记录',
    id: 'Tidak ada riwayat tersedia'
  },
  'commission.empty': {
    en: 'No commission history',
    zh: '没有佣金历史记录',
    id: 'Tidak ada riwayat komisi'
  },
  'commission.noData': {
    en: 'No commission data available',
    zh: '没有佣金数据',
    id: 'Tidak ada data komisi tersedia'
  },
  'status.cancelled': {
    en: 'Cancelled',
    zh: '已取消',
    id: 'Dibatalkan'
  },
  'status.unknown': {
    en: 'Unknown',
    zh: '未知',
    id: 'Tidak diketahui'
  },
  'toy.activate': {
    en: 'Activate Doluruu Toy',
    zh: '激活Doluruu玩具',
    id: 'Aktifkan Mainan Doluruu'
  },
  'toy.qrPlaceholder': {
    en: 'Enter toy QR Code (e.g. QR-87b4a03b003a-07377ac9-53d8fd)',
    zh: '输入玩具二维码（例如：QR-87b4a03b003a-07377ac9-53d8fd）',
    id: 'Masukkan QR Code mainan (contoh: QR-87b4a03b003a-07377ac9-53d8fd)'
  },
  'purchase.waitingSeller': {
    en: 'Waiting for Seller',
    zh: '等待卖家',
    id: 'Menunggu Konfirmasi Penjual'
  },
  'purchase.purchased': {
    en: 'Purchased',
    zh: '已购买',
    id: 'Dibeli'
  },
  'purchase.waitingShipment': {
    en: 'Waiting for seller to confirm shipment',
    zh: '等待卖家确认发货',
    id: 'Menunggu penjual mengkonfirmasi pengiriman'
  },
  'transaction.complete': {
    en: 'Transaction Complete!',
    zh: '交易完成！',
    id: 'Transaksi Selesai!'
  },
  'purchase.confirmReceived': {
    en: 'Confirm Received',
    zh: '确认收货',
    id: 'Konfirmasi Diterima'
  },
  'purchase.waitingBuyer': {
    en: 'Waiting for buyer confirmation',
    zh: '等待买家确认',
    id: 'Menunggu konfirmasi pembeli'
  },
  'purchase.waitingSellerConfirm': {
    en: 'Waiting for seller confirmation',
    zh: '等待卖家确认',
    id: 'Menunggu konfirmasi penjual'
  },
  'pet.stage1': {
    en: 'Stage 1',
    zh: '第1阶段',
    id: 'Tahap 1'
  },
  'pet.stage2': {
    en: 'Stage 2',
    zh: '第2阶段',
    id: 'Tahap 2'
  },
  'pet.stage3': {
    en: 'Stage 3',
    zh: '第3阶段',
    id: 'Tahap 3'
  },
  'pet.stage4': {
    en: 'Stage 4',
    zh: '第4阶段',
    id: 'Tahap 4'
  },
  'pet.stage5': {
    en: 'Stage 5',
    zh: '第5阶段',
    id: 'Tahap 5'
  },
  'pet.stage6': {
    en: 'Stage 6',
    zh: '第6阶段',
    id: 'Tahap 6'
  },
  'pet.currentStage': {
    en: 'Current Stage:',
    zh: '当前阶段：',
    id: 'Tahap Saat Ini:'
  },
  'pet.alive': {
    en: 'Alive',
    zh: '存活',
    id: 'Hidup'
  },
  'pet.dead': {
    en: 'Dead',
    zh: '死亡',
    id: 'Mati'
  },
  'pet.status': {
    en: 'Status:',
    zh: '状态：',
    id: 'Status:'
  },
  'transaction.inProgress': {
    en: 'Transaction in progress',
    zh: '交易进行中',
    id: 'Transaksi sedang berlangsung'
  },
  'marketplace.listed': {
    en: 'Listed in marketplace',
    zh: '在市场中列出',
    id: 'Sedang dijual di marketplace'
  },
  'toy.acquired': {
    en: 'Acquired',
    zh: '获得',
    id: 'Diperoleh'
  },
  'referral.program': {
    en: 'Referral Program',
    zh: '推荐计划',
    id: 'Program Rujukan'
  },
  'referral.inviteEarn': {
    en: 'Invite friends and earn commissions',
    zh: '邀请朋友并赚取佣金',
    id: 'Undang teman dan dapatkan komisi'
  },

  'referral.direct': {
    en: 'Direct Referrals',
    zh: '直接推荐',
    id: 'Rujukan Langsung'
  },

  'referral.level': {
    en: 'Referrer Level',
    zh: '推荐等级',
    id: 'Level Rujukan'
  },
  'commission.rate': {
    en: 'Commission Rate',
    zh: '佣金率',
    id: 'Tingkat Komisi'
  },

  'common.copyCode': {
    en: 'Copy Code',
    zh: '复制代码',
    id: 'Salin Kode'
  },
  'commission.structure': {
    en: 'Commission Structure',
    zh: '佣金结构',
    id: 'Struktur Komisi'
  },

  'form.lastName': {
    en: 'Last Name',
    zh: '姓氏',
    id: 'Nama Belakang'
  },
  'form.gender': {
    en: 'Gender',
    zh: '性别',
    id: 'Jenis Kelamin'
  },
  'form.dateOfBirth': {
    en: 'Date of Birth',
    zh: '出生日期',
    id: 'Tanggal Lahir'
  },
  'form.phoneNumber': {
    en: 'Phone Number',
    zh: '电话号码',
    id: 'Nomor Telepon'
  },
  'form.firstName': {
    en: 'First Name',
    zh: '名字',
    id: 'Nama Depan'
  },
  'gender.male': {
    en: 'Male',
    zh: '男',
    id: 'Laki-laki'
  },
  'gender.female': {
    en: 'Female',
    zh: '女',
    id: 'Perempuan'
  },
  'form.selectDate': {
    en: 'Select Date',
    zh: '选择日期',
    id: 'Pilih Tanggal'
  },
  'admin.role': {
    en: 'Administrator',
    zh: '管理员',
    id: 'Administrator'
  },
  'auth.logout': {
    en: 'Logout',
    zh: '退出',
    id: 'Keluar'
  },
  'common.yes': {
    en: 'Yes',
    zh: '是',
    id: 'Ya'
  },
  'common.no': {
    en: 'No',
    zh: '否',
    id: 'Tidak'
  },
  'auth.signUpNow': {
    en: 'Sign Up Now',
    zh: '立即注册',
    id: 'Daftar Sekarang'
  },
  'auth.loginNow': {
    en: 'Login Now',
    zh: '立即登录',
    id: 'Masuk Sekarang'
  },
  'common.viewDetails': {
    en: 'View Details',
    zh: '查看详情',
    id: 'Lihat Detail'
  },


  'common.select': {
    en: 'Select',
    zh: '选择',
    id: 'Pilih'
  },
  'common.open': {
    en: 'Open',
    zh: '打开',
    id: 'Buka'
  },
  'date.format': {
    en: 'en-US',
    zh: 'zh-CN',
    id: 'id-ID'
  },
  'price.format': {
    en: 'Price: Rp ',
    zh: '价格：Rp ',
    id: 'Harga: Rp '
  },
  'profile.memberSince': {
    en: 'Member Since:',
    zh: '注册时间：',
    id: 'Member Sejak:'
  },
  'account.settings': {
    en: 'Account Settings',
    zh: '账户设置',
    id: 'Pengaturan Akun'
  },
  'time.day': {
    en: 'Day',
    zh: '天',
    id: 'Hari'
  },
  'time.month': {
    en: 'Month',
    zh: '月',
    id: 'Bulan'
  },
  'time.year': {
    en: 'Year',
    zh: '年',
    id: 'Tahun'
  },
  'time.hour': {
    en: 'Hour',
    zh: '小时',
    id: 'Jam'
  },
  'time.minute': {
    en: 'Minute',
    zh: '分钟',
    id: 'Menit'
  },
  'time.week': {
    en: 'Week',
    zh: '周',
    id: 'Minggu'
  },
  'time.second': {
    en: 'Second',
    zh: '秒',
    id: 'Detik'
  },
  'time.today': {
    en: 'Today',
    zh: '今天',
    id: 'Hari ini'
  },
  'time.yesterday': {
    en: 'Yesterday',
    zh: '昨天',
    id: 'Kemarin'
  },
  'time.tomorrow': {
    en: 'Tomorrow',
    zh: '明天',
    id: 'Besok'
  },
  'form.name': {
    en: 'Name',
    zh: '姓名',
    id: 'Nama'
  },
  'form.phone': {
    en: 'Phone',
    zh: '电话',
    id: 'Telepon'
  },
  'form.address': {
    en: 'Address',
    zh: '地址',
    id: 'Alamat'
  },
  'form.description': {
    en: 'Description',
    zh: '描述',
    id: 'Deskripsi'
  },
  'form.category': {
    en: 'Category',
    zh: '类别',
    id: 'Kategori'
  },
  'form.amount': {
    en: 'Amount',
    zh: '金额',
    id: 'Jumlah'
  },
  'form.price': {
    en: 'Price',
    zh: '价格',
    id: 'Harga'
  },
  'form.status': {
    en: 'Status',
    zh: '状态',
    id: 'Status'
  },
  'form.date': {
    en: 'Date',
    zh: '日期',
    id: 'Tanggal'
  },
  'form.time': {
    en: 'Time',
    zh: '时间',
    id: 'Waktu'
  },
  'form.type': {
    en: 'Type',
    zh: '类型',
    id: 'Tipe'
  },
  'form.city': {
    en: 'City',
    zh: '城市',
    id: 'Kota'
  },
  'form.country': {
    en: 'Country',
    zh: '国家',
    id: 'Negara'
  },
  'footer.privacy': {
    en: 'Privacy Policy',
    zh: '隐私政策',
    id: 'Kebijakan Privasi'
  },
  'footer.terms': {
    en: 'Terms of Service',
    zh: '服务条款',
    id: 'Syarat Layanan'
  },
  'footer.contact': {
    en: 'Contact Us',
    zh: '联系我们',
    id: 'Hubungi Kami'
  },
  'footer.about': {
    en: 'About Us',
    zh: '关于我们',
    id: 'Tentang Kami'
  },

  'common.less': {
    en: 'Less',
    zh: '较少',
    id: 'Lebih Sedikit'
  },
  'common.show': {
    en: 'Show',
    zh: '显示',
    id: 'Tampilkan'
  },
  'common.hide': {
    en: 'Hide',
    zh: '隐藏',
    id: 'Sembunyikan'
  },
  'common.add': {
    en: 'Add',
    zh: '添加',
    id: 'Tambah'
  },
  'common.remove': {
    en: 'Remove',
    zh: '移除',
    id: 'Hapus'
  },
  'common.create': {
    en: 'Create',
    zh: '创建',
    id: 'Buat'
  },
  'common.update': {
    en: 'Update',
    zh: '更新',
    id: 'Perbarui'
  },
  'common.continue': {
    en: 'Continue',
    zh: '继续',
    id: 'Lanjutkan'
  },
  'common.complete': {
    en: 'Complete',
    zh: '完成',
    id: 'Selesai'
  },
  'common.back': {
    en: 'Back',
    zh: '返回',
    id: 'Kembali'
  },

  'common.previous': {
    en: 'Previous',
    zh: '上一步',
    id: 'Sebelumnya'
  },
  'common.enable': {
    en: 'Enable',
    zh: '启用',
    id: 'Aktifkan'
  },
  'common.disable': {
    en: 'Disable',
    zh: '禁用',
    id: 'Nonaktifkan'
  },
  'common.refresh': {
    en: 'Refresh',
    zh: '刷新',
    id: 'Refresh'
  },
  'common.loadMore': {
    en: 'Load More',
    zh: '加载更多',
    id: 'Muat Lebih Banyak'
  },
  'search.results': {
    en: 'Search Results',
    zh: '搜索结果',
    id: 'Hasil Pencarian'
  },
  'search.noResults': {
    en: 'No Results',
    zh: '没有结果',
    id: 'Tidak Ada Hasil'
  },
  'search.placeholder': {
    en: 'Search...',
    zh: '搜索...',
    id: 'Cari...'
  },
  'referral.totalEarningsLabel': {
    en: 'Total Referral Earnings',
    zh: '总推荐收益',
    id: 'Total Pendapatan Referral'
  },
  'referral.totalCount': {
    en: 'Total Referrals',
    zh: '总推荐数',
    id: 'Total Referral'
  },
  'referral.network': {
    en: 'Referral Network',
    zh: '推荐网络',
    id: 'Jaringan Referral'
  },
  'referral.shareDescription': {
    en: 'Share your referral link to start building your network and earning commissions',
    zh: '分享您的推荐链接开始建立网络并赚取佣金',
    id: 'Bagikan link referral Anda untuk mulai membangun jaringan dan mendapatkan komisi'
  },
  'referral.noNetworkYet': {
    en: 'No Referral Network Yet',
    zh: '没有推荐网络',
    id: 'Tidak Ada Jaringan Referral'
  },
  'common.copyLink': {
    en: 'Copy Link',
    zh: '复制链接',
    id: 'Salin Link'
  },
  'toast.linkCopied': {
    en: 'Link copied',
    zh: '链接已复制',
    id: 'Link Disalin'
  },
  'common.viewMore': {
    en: 'View More',
    zh: '查看更多',
    id: 'Lihat Lebih'
  },
  'common.showLess': {
    en: 'Show Less',
    zh: '显示较少',
    id: 'Tampilkan Lebih Sedikit'
  },
  'rewards.redeemNow': {
    en: 'Redeem Now',
    zh: '立即兑换',
    id: 'Tukar Sekarang'
  },
  'rewards.confirmRedemption': {
    en: 'Confirm Redemption',
    zh: '确认兑换',
    id: 'Konfirmasi Penukaran'
  },
  'rewards.redemptionSuccessful': {
    en: 'Redemption Successful',
    zh: '兑换成功',
    id: 'Penukaran Berhasil'
  },
  'rewards.redemptionFailed': {
    en: 'Redemption Failed',
    zh: '兑换失败',
    id: 'Penukaran Gagal'
  },
  'rewards.insufficientPoints': {
    en: 'Insufficient Points',
    zh: '积分不足',
    id: 'Poin Tidak Cukup'
  },
  'payment.selectBank': {
    en: 'Select Bank',
    zh: '选择银行',
    id: 'Pilih Bank'
  },
  'payment.accountNumber': {
    en: 'Account Number',
    zh: '账户号码',
    id: 'Nomor Rekening'
  },
  'payment.withdraw': {
    en: 'Withdraw',
    zh: '提现',
    id: 'Tarik Tunai'
  },
  'payment.minimumWithdrawal': {
    en: 'Minimum Withdrawal',
    zh: '最低提现金额',
    id: 'Minimum Penarikan'
  },
  'payment.withdrawalSuccessful': {
    en: 'Withdrawal Successful',
    zh: '提现成功',
    id: 'Penarikan Berhasil'
  },
  'payment.withdrawalFailed': {
    en: 'Withdrawal Failed',
    zh: '提现失败',
    id: 'Penarikan Gagal'
  },
  'purchase.confirmPurchase': {
    en: 'Confirm Purchase',
    zh: '确认购买',
    id: 'Konfirmasi Pembelian'
  },
  'purchase.purchaseSuccessful': {
    en: 'Purchase Successful',
    zh: '购买成功',
    id: 'Pembelian Berhasil'
  },
  'purchase.purchaseFailed': {
    en: 'Purchase Failed',
    zh: '购买失败',
    id: 'Pembelian Gagal'
  },
  'order.cancel': {
    en: 'Cancel Order',
    zh: '取消订单',
    id: 'Batalkan Pesanan'
  },
  'order.details': {
    en: 'Order Details',
    zh: '订单详情',
    id: 'Detail Pesanan'
  },
  'order.status': {
    en: 'Order Status',
    zh: '订单状态',
    id: 'Status Pesanan'
  },
  'order.number': {
    en: 'Order Number',
    zh: '订单编号',
    id: 'Nomor Pesanan'
  },
  'common.help': {
    en: 'Help',
    zh: '帮助',
    id: 'Bantuan'
  },
  'common.about': {
    en: 'About',
    zh: '关于',
    id: 'Tentang'
  },
  'common.contactUs': {
    en: 'Contact Us',
    zh: '联系我们',
    id: 'Hubungi Kami'
  },
  'common.privacyPolicy': {
    en: 'Privacy Policy',
    zh: '隐私政策',
    id: 'Kebijakan Privasi'
  },
  'common.termsOfService': {
    en: 'Terms of Service',
    zh: '服务条款',
    id: 'Syarat Layanan'
  },
  'common.version': {
    en: 'Version',
    zh: '版本',
    id: 'Versi'
  },
  'common.language': {
    en: 'Language',
    zh: '语言',
    id: 'Bahasa'
  },
  'common.theme': {
    en: 'Theme',
    zh: '主题',
    id: 'Tema'
  },
  'theme.dark': {
    en: 'Dark',
    zh: '深色',
    id: 'Gelap'
  },
  'theme.light': {
    en: 'Light',
    zh: '浅色',
    id: 'Terang'
  },
  'theme.auto': {
    en: 'Auto',
    zh: '自动',
    id: 'Otomatis'
  },
  'common.notifications': {
    en: 'Notifications',
    zh: '通知',
    id: 'Notifikasi'
  },
  'common.email': {
    en: 'Email',
    zh: '邮件',
    id: 'Email'
  },
  'common.sms': {
    en: 'SMS',
    zh: '短信',
    id: 'SMS'
  },
  'common.push': {
    en: 'Push',
    zh: '推送',
    id: 'Push'
  },
  'common.all': {
    en: 'All',
    zh: '全部',
    id: 'Semua'
  },
  'common.none': {
    en: 'None',
    zh: '无',
    id: 'Tidak Ada'
  },
  'common.clear': {
    en: 'Clear',
    zh: '清除',
    id: 'Hapus'
  },
  'common.reset': {
    en: 'Reset',
    zh: '重置',
    id: 'Reset'
  },
  'common.apply': {
    en: 'Apply',
    zh: '申请',
    id: 'Terapkan'
  },
  'common.ok': {
    en: 'OK',
    zh: '确定',
    id: 'OK'
  },
  'common.done': {
    en: 'Done',
    zh: '完成',
    id: 'Selesai'
  },
  'common.start': {
    en: 'Start',
    zh: '开始',
    id: 'Mulai'
  },
  'common.stop': {
    en: 'Stop',
    zh: '停止',
    id: 'Berhenti'
  },
  'common.pause': {
    en: 'Pause',
    zh: '暂停',
    id: 'Jeda'
  },
  'common.restart': {
    en: 'Restart',
    zh: '重新开始',
    id: 'Mulai Ulang'
  },
  'common.exit': {
    en: 'Exit',
    zh: '退出',
    id: 'Keluar'
  },
  'common.play': {
    en: 'Play',
    zh: '播放',
    id: 'Putar'
  },
  'common.game': {
    en: 'Game',
    zh: '游戏',
    id: 'Game'
  },
  'common.music': {
    en: 'Music',
    zh: '音乐',
    id: 'Musik'
  },
  'common.video': {
    en: 'Video',
    zh: '视频',
    id: 'Video'
  },
  'common.data': {
    en: 'Data',
    zh: '数据',
    id: 'Data'
  },
  'common.image': {
    en: 'Image',
    zh: '图像',
    id: 'Gambar'
  },
  'common.sound': {
    en: 'Sound',
    zh: '声音',
    id: 'Suara'
  },
  'common.tools': {
    en: 'Tools',
    zh: '工具',
    id: 'Alat'
  },
  'common.contact': {
    en: 'Contact',
    zh: '联系',
    id: 'Kontak'
  },
  'common.send': {
    en: 'Send',
    zh: '发送',
    id: 'Kirim'
  },
  'common.manage': {
    en: 'Manage',
    zh: '管理',
    id: 'Kelola'
  },
  'preferences.title': {
    en: 'Preferences',
    zh: '偏好设置',
    id: 'Preferensi'
  },
  'preferences.emailNotifications': {
    en: 'Email Notifications',
    zh: '邮件通知',
    id: 'Notifikasi Email'
  },
  'preferences.emailDescription': {
    en: 'Receive updates about appointments and promotions',
    zh: '接收关于预约和促销的更新',
    id: 'Terima update tentang janji dan promosi'
  },

  'account.currentCredits': {
    en: 'Current Credits',
    zh: '当前积分',
    id: 'Kredit Saat Ini'
  },
  'account.loyaltyPoints': {
    en: 'Loyalty Points',
    zh: '忠诚度积分',
    id: 'Poin Loyalitas'
  },
  'account.totalBookings': {
    en: 'Total Bookings',
    zh: '总预订数',
    id: 'Total Reservasi'
  },
  'account.referralEarnings': {
    en: 'Referral Earnings',
    zh: '推荐收益',
    id: 'Pendapatan Rujukan'
  },
  'petCare.loading': {
    en: 'Loading pet care...',
    zh: '正在加载宠物护理...',
    id: 'Memuat perawatan hewan peliharaan...'
  },
  'loyaltyProgram.diamondRequirement': {
    en: '5 referrals each spending RP 10,000,000',
    zh: '5个推荐人，每人消费RP 10,000,000',
    id: '5 rujukan yang masing-masing belanja RP 10,000,000'
  },
  'profile.selectGender': {
    en: 'Select gender',
    zh: '选择性别',
    id: 'Pilih jenis kelamin'
  },
  'profile.male': {
    en: 'Male',
    zh: '男性',
    id: 'Laki-laki'
  },
  'profile.female': {
    en: 'Female',
    zh: '女性',
    id: 'Perempuan'
  },
  'common.saveChanges': {
    en: 'Save Changes',
    zh: '保存更改',
    id: 'Simpan Perubahan'
  },

  'marketplace.confirmPurchase': {
    en: 'Confirm Purchase',
    zh: '确认购买',
    id: 'Konfirmasi Pembelian'
  },
  'marketplace.confirmPurchaseQuestion': {
    en: 'Are you sure you want to buy',
    zh: '您确定要购买吗',
    id: 'Apakah Anda yakin ingin membeli'
  },
  'common.note': {
    en: 'Note',
    zh: '注意',
    id: 'Catatan'
  },
  'marketplace.adminFeeNote': {
    en: 'Includes 10% admin fee. Seller receives 90% of the sale price.',
    zh: '包含10%管理费。卖家收到售价的90%。',
    id: 'Termasuk biaya admin 10%. Penjual menerima 90% dari harga jual.'
  },
  'marketplace.creditDeductionNote': {
    en: 'Credits will be deducted now. Seller must confirm to complete the transaction.',
    zh: '积分将立即扣除。卖家必须确认完成交易。',
    id: 'Kredit akan dipotong sekarang. Penjual harus mengkonfirmasi untuk menyelesaikan transaksi.'
  },
  'marketplace.yesBuy': {
    en: 'Yes, Buy',
    zh: '是的，购买',
    id: 'Ya, Beli'
  },
  'account.financialHistory': {
    en: 'Financial History',
    zh: '财务历史',
    id: 'Riwayat Keuangan'
  },
  'account.rpCredits': {
    en: 'RP Credits',
    zh: 'RP积分',
    id: 'Kredit RP'
  },
  'filters.spent': {
    en: 'Spent',
    zh: '已花费',
    id: 'Digunakan'
  },
  'achievements.unlocked': {
    en: '🎉 Achievement Unlocked!',
    zh: '🎉 成就解锁！',
    id: '🎉 Pencapaian Baru!'
  },
  'achievements.yourReward': {
    en: '🏆 Your Reward:',
    zh: '🏆 您的奖励：',
    id: '🏆 Hadiah Anda:'
  },
  'referral.progress': {
    en: 'Referral Progress:',
    zh: '推荐进度：',
    id: 'Progres Rujukan:'
  },
  'achievements.awesome': {
    en: 'Awesome!',
    zh: '太棒了！',
    id: 'Luar Biasa!'
  },
  'achievements.waiting': {
    en: '{{count}} more achievements waiting...',
    zh: '还有 {{count}} 个成就在等待...',
    id: '{{count}} pencapaian lagi menunggu...'
  },
  'password.change': {
    en: 'Change Password',
    zh: '更改密码',
    id: 'Ubah Password'
  },
  'password.current': {
    en: 'Current Password',
    zh: '当前密码',
    id: 'Password Saat Ini'
  },
  'password.currentPlaceholder': {
    en: 'Enter current password',
    zh: '输入当前密码',
    id: 'Masukkan password saat ini'
  },
  'password.new': {
    en: 'New Password',
    zh: '新密码',
    id: 'Password Baru'
  },
  'password.newPlaceholder': {
    en: 'Enter new password',
    zh: '输入新密码',
    id: 'Masukkan password baru'
  },
  'password.confirm': {
    en: 'Confirm New Password',
    zh: '确认新密码',
    id: 'Konfirmasi Password Baru'
  },
  'password.confirmPlaceholder': {
    en: 'Confirm new password',
    zh: '确认新密码',
    id: 'Konfirmasi password baru'
  },
  'tokens.claimMessage': {
    en: 'You have {{count}} tokens. How many would you like to claim for redemption at approved locations?',
    zh: '您有 {{count}} 个代币。您想要申请多少个代币在指定地点兑换？',
    id: 'Anda memiliki {{count}} token. Berapa yang ingin diklaim untuk ditukar di lokasi yang disetujui?'
  },
  'tokens.redemptionInfo': {
    en: 'Tokens will be redeemed at approved locations. No shipping required.',
    zh: '代币将在指定地点兑换。无需运费。',
    id: 'Token akan ditukar di lokasi yang disetujui. Tidak ada pengiriman diperlukan.'
  },
  'admin.dashboard': {
    en: 'Admin Dashboard',
    zh: '管理员仪表板',
    id: 'Dashboard Admin'
  },
  'admin.manageSystem': {
    en: 'Manage system and users',
    zh: '管理系统和用户',
    id: 'Kelola sistem dan pengguna'
  },
  'admin.accessFeatures': {
    en: 'Access to system administration features',
    zh: '访问系统管理功能',
    id: 'Akses ke fitur administrasi sistem'
  },
  'admin.openDashboard': {
    en: 'Open Admin Dashboard',
    zh: '打开管理员仪表板',
    id: 'Buka Dashboard Admin'
  },
  'camera.accessing': {
    en: 'Accessing camera...',
    zh: '正在访问摄像头...',
    id: 'Mengakses kamera...'
  },
  'qr.instructions': {
    en: 'Point your camera at the QR code on the Doluruu toy packaging',
    zh: '将摄像头对准 Doluruu 玩具包装上的二维码',
    id: 'Arahkan kamera ke QR code pada kemasan mainan Doluruu'
  },
  'qr.detect': {
    en: 'Detect QR',
    zh: '检测二维码',
    id: 'Deteksi QR'
  },
  'qr.tips': {
    en: '💡 Tips:',
    zh: '💡 提示：',
    id: '💡 Tips:'
  },
  'qr.tipsMessage': {
    en: ' Ensure QR code is clearly visible and not cut off within the white frame',
    zh: ' 确保二维码在白色框内清晰可见且不被截断',
    id: ' Pastikan QR code terlihat jelas dan tidak terpotong dalam bingkai putih'
  },

  'common.receive': {
    en: 'Receive',
    zh: '接收',
    id: 'Terima'
  },
  'common.view': {
    en: 'View',
    zh: '查看',
    id: 'Lihat'
  },
  'common.toggle': {
    en: 'Toggle',
    zh: '切换',
    id: 'Ganti'
  },
  'common.deselect': {
    en: 'Deselect',
    zh: '取消选中',
    id: 'Batal Pilih'
  },
  'common.enabled': {
    en: 'Enabled',
    zh: '已启用',
    id: 'Diaktifkan'
  },
  'common.disabled': {
    en: 'Disabled',
    zh: '已禁用',
    id: 'Dinonaktifkan'
  },
  'common.filter': {
    en: 'Filter',
    zh: '过滤',
    id: 'Filter'
  },
  'common.sort': {
    en: 'Sort',
    zh: '排序',
    id: 'Urutkan'
  },
  'common.ascending': {
    en: 'Ascending',
    zh: '升序',
    id: 'Naik'
  },
  'common.descending': {
    en: 'Descending',
    zh: '降序',
    id: 'Turun'
  },
  'common.date': {
    en: 'Date',
    zh: '日期',
    id: 'Tanggal'
  },
  'common.time': {
    en: 'Time',
    zh: '时间',
    id: 'Waktu'
  },
  'common.user': {
    en: 'User',
    zh: '用户',
    id: 'Pengguna'
  },
  'common.admin': {
    en: 'Admin',
    zh: '管理员',
    id: 'Admin'
  },
  'common.system': {
    en: 'System',
    zh: '系统',
    id: 'Sistem'
  },
  'common.configuration': {
    en: 'Configuration',
    zh: '配置',
    id: 'Konfigurasi'
  },
  'common.permission': {
    en: 'Permission',
    zh: '权限',
    id: 'Izin'
  },
  'common.role': {
    en: 'Role',
    zh: '角色',
    id: 'Peran'
  },
  'common.organization': {
    en: 'Organization',
    zh: '组织',
    id: 'Organisasi'
  },
  'common.project': {
    en: 'Project',
    zh: '项目',
    id: 'Proyek'
  },
  'common.task': {
    en: 'Task',
    zh: '任务',
    id: 'Tugas'
  },
  'common.event': {
    en: 'Event',
    zh: '事件',
    id: 'Acara'
  },
  'common.log': {
    en: 'Log',
    zh: '日志',
    id: 'Log'
  },
  'common.report': {
    en: 'Report',
    zh: '报告',
    id: 'Laporan'
  },
  'common.statistics': {
    en: 'Statistics',
    zh: '统计',
    id: 'Statistik'
  },
  'common.analytics': {
    en: 'Analytics',
    zh: '分析',
    id: 'Analisis'
  },
  'common.dashboard': {
    en: 'Dashboard',
    zh: '仪表板',
    id: 'Dashboard'
  },
  'common.profile': {
    en: 'Profile',
    zh: '个人资料',
    id: 'Profil'
  },
  'common.account': {
    en: 'Account',
    zh: '账户',
    id: 'Akun'
  },
  'common.failed': {
    en: 'Failed',
    zh: '失败',
    id: 'Gagal'
  },
  'common.warning': {
    en: 'Warning',
    zh: '警告',
    id: 'Peringatan'
  },
  'common.info': {
    en: 'Info',
    zh: '信息',
    id: 'Informasi'
  },
  'common.result': {
    en: 'Result',
    zh: '结果',
    id: 'Hasil'
  },
  'common.status': {
    en: 'Status',
    zh: '状态',
    id: 'Status'
  },
  'common.inactive': {
    en: 'Inactive',
    zh: '非活动',
    id: 'Tidak Aktif'
  },
  'common.online': {
    en: 'Online',
    zh: '在线',
    id: 'Online'
  },
  'common.offline': {
    en: 'Offline',
    zh: '离线',
    id: 'Offline'
  },
  'common.available': {
    en: 'Available',
    zh: '可用',
    id: 'Tersedia'
  },
  'common.unavailable': {
    en: 'Unavailable',
    zh: '不可用',
    id: 'Tidak Tersedia'
  },
  'common.connect': {
    en: 'Connect',
    zh: '连接',
    id: 'Hubungkan'
  },
  'common.disconnect': {
    en: 'Disconnect',
    zh: '断开',
    id: 'Putuskan'
  },
  'common.connected': {
    en: 'Connected',
    zh: '已连接',
    id: 'Terhubung'
  },
  'common.disconnected': {
    en: 'Disconnected',
    zh: '已断开',
    id: 'Terputus'
  },
  'common.settings': {
    en: 'Settings',
    zh: '设置',
    id: 'Pengaturan'
  },
  'common.preferences': {
    en: 'Preferences',
    zh: '偏好',
    id: 'Preferensi'
  },
  'common.order': {
    en: 'Order',
    zh: '订单',
    id: 'Pesanan'
  },
  'common.product': {
    en: 'Product',
    zh: '产品',
    id: 'Produk'
  },
  'common.service': {
    en: 'Service',
    zh: '服务',
    id: 'Layanan'
  },
  'common.customer': {
    en: 'Customer',
    zh: '客户',
    id: 'Pelanggan'
  },
  'common.supplier': {
    en: 'Supplier',
    zh: '供应商',
    id: 'Pemasok'
  },
  'common.stock': {
    en: 'Stock',
    zh: '库存',
    id: 'Stok'
  },
  'common.sales': {
    en: 'Sales',
    zh: '销售',
    id: 'Penjualan'
  },
  'common.revenue': {
    en: 'Revenue',
    zh: '收入',
    id: 'Pendapatan'
  },
  'common.expense': {
    en: 'Expense',
    zh: '支出',
    id: 'Pengeluaran'
  },
  'common.profit': {
    en: 'Profit',
    zh: '利润',
    id: 'Keuntungan'
  },
  'common.loss': {
    en: 'Loss',
    zh: '损失',
    id: 'Kerugian'
  },
  'common.balance': {
    en: 'Balance',
    zh: '余额',
    id: 'Saldo'
  },
  'common.budget': {
    en: 'Budget',
    zh: '预算',
    id: 'Anggaran'
  },
  'common.cost': {
    en: 'Cost',
    zh: '成本',
    id: 'Biaya'
  },
  'common.investment': {
    en: 'Investment',
    zh: '投资',
    id: 'Investasi'
  },
  'common.return': {
    en: 'Return',
    zh: '回报',
    id: 'Hasil'
  },
  'common.risk': {
    en: 'Risk',
    zh: '风险',
    id: 'Risiko'
  },
  'common.opportunity': {
    en: 'Opportunity',
    zh: '机会',
    id: 'Peluang'
  },
  'common.target': {
    en: 'Target',
    zh: '目标',
    id: 'Target'
  },
  'common.goal': {
    en: 'Goal',
    zh: '目标',
    id: 'Tujuan'
  },
  'common.quantity': {
    en: 'Quantity',
    zh: '数量',
    id: 'Jumlah'
  },
  'common.price': {
    en: 'Price',
    zh: '价格',
    id: 'Harga'
  },
  'common.total': {
    en: 'Total',
    zh: '总计',
    id: 'Total'
  },
  'common.subtotal': {
    en: 'Subtotal',
    zh: '小计',
    id: 'Subtotal'
  },
  'common.tax': {
    en: 'Tax',
    zh: '税费',
    id: 'Pajak'
  },
  'common.shipping': {
    en: 'Shipping',
    zh: '运费',
    id: 'Ongkir'
  },
  'common.payment': {
    en: 'Payment',
    zh: '付款',
    id: 'Pembayaran'
  },
  'common.invoice': {
    en: 'Invoice',
    zh: '发票',
    id: 'Invoice'
  },
  'common.receipt': {
    en: 'Receipt',
    zh: '收据',
    id: 'Kwitansi'
  },
  'personal.information': {
    en: 'Personal Information',
    zh: '个人信息',
    id: 'Informasi Pribadi'
  },
  'settings.notifications': {
    en: 'Notification Settings',
    zh: '通知设置',
    id: 'Pengaturan Notifikasi'
  },
  'profile.edit': {
    en: 'Edit Profile',
    zh: '编辑个人资料',
    id: 'Edit Profil'
  },
  'account.statistics': {
    en: 'Account Statistics',
    zh: '账户统计',
    id: 'Statistik Akun'
  },
  'credits.current': {
    en: 'Current Credits',
    zh: '当前积分',
    id: 'Kredit Saat Ini'
  },
  'loyalty.points': {
    en: 'Loyalty Points',
    zh: '忠诚积分',
    id: 'Poin Loyalitas'
  },
  'bookings.total': {
    en: 'Total Bookings',
    zh: '总预订',
    id: 'Total Booking'
  },
  'referral.earnings': {
    en: 'Referral Earnings',
    zh: '推荐收益',
    id: 'Pendapatan Rujukan'
  },
  'referral.network.empty': {
    en: 'No Referral Network Yet',
    zh: '没有推荐网络',
    id: 'Belum Ada Jaringan Rujukan'
  },
  'referral.share.message': {
    en: 'Share your referral link to start building your network and earning commissions',
    zh: '分享您的推荐链接以开始构建您的网络并赚取佣金',
    id: 'Bagikan tautan rujukan Anda untuk mulai membangun jaringan dan mendapatkan komisi'
  },
  'email.notifications': {
    en: 'Email Notifications',
    zh: '邮件通知',
    id: 'Notifikasi Email'
  },
  'notifications.manage': {
    en: 'Manage',
    zh: '管理',
    id: 'Kelola'
  },
  'notifications.description': {
    en: 'Receive updates about appointments and promotions',
    zh: '接收关于预约和促销的更新',
    id: 'Terima pembaruan tentang janji temu dan promosi'
  }

};

// Language context and hook
let currentLanguage: Language = 'en';
let languageChangeListeners: ((lang: Language) => void)[] = [];

export function getCurrentLanguage(): Language {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('language') as Language;
    if (stored && (stored === 'en' || stored === 'zh' || stored === 'id')) {
      currentLanguage = stored;
    }
  }
  return currentLanguage;
}

export function setLanguage(language: Language): void {
  currentLanguage = language;
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', language);
  }
  languageChangeListeners.forEach(listener => listener(language));
}

export function useTranslation() {
  const [language, setCurrentLanguage] = useState<Language>(getCurrentLanguage());

  useEffect(() => {
    const listener = (lang: Language) => setCurrentLanguage(lang);
    languageChangeListeners.push(listener);
    
    return () => {
      languageChangeListeners = languageChangeListeners.filter(l => l !== listener);
    };
  }, []);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language] || translation.en || key;
  };

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };

  return { t, language, changeLanguage };
}