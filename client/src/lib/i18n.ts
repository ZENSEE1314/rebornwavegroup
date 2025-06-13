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
    en: 'Welcome to Reborn Wave Group',
    zh: '欢迎来到重生波浪集团',
    id: 'Selamat Datang di Reborn Wave Group'
  },
  'landing.subtitle': {
    en: 'Your Digital Pet Care Adventure Awaits',
    zh: '您的数字宠物护理冒险等待着您',
    id: 'Petualangan Perawatan Hewan Digital Anda Menanti'
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
  'auth.login': {
    en: 'Login',
    zh: '登录',
    id: 'Masuk'
  },
  'auth.register': {
    en: 'Register',
    zh: '注册',
    id: 'Daftar'
  },
  'auth.forgotPassword': {
    en: 'Forgot Password?',
    zh: '忘记密码？',
    id: 'Lupa Kata Sandi?'
  },
  'auth.resetPassword': {
    en: 'Reset Password',
    zh: '重置密码',
    id: 'Reset Kata Sandi'
  },
  'auth.loginWith': {
    en: 'Login with',
    zh: '使用以下方式登录',
    id: 'Masuk dengan'
  },
  'auth.orContinueWith': {
    en: 'Or continue with',
    zh: '或继续使用',
    id: 'Atau lanjutkan dengan'
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
  'common.all': {
    en: 'All',
    zh: '全部',
    id: 'Semua'
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
  'rewards.insufficientPoints': {
    en: 'Insufficient Points',
    zh: '积分不足',
    id: 'Poin Tidak Cukup'
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
  'commission.structure': {
    en: 'Commission Structure',
    zh: '佣金结构',
    id: 'Struktur Komisi'
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