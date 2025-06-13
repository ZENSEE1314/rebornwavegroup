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

  // Pet Care
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
  'loyalty.title': {
    en: 'Loyalty',
    zh: '忠诚度',
    id: 'Loyalitas'
  },
  'marketplace.title': {
    en: 'Marketplace',
    zh: '市场',
    id: 'Pasar'
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
  'profile.title': {
    en: 'Profile Settings',
    zh: '个人资料设置',
    id: 'Pengaturan Profil'
  },
  'profile.personalInfo': {
    en: 'Personal Information',
    zh: '个人信息',
    id: 'Informasi Pribadi'
  },
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
  'rewards.redeem': {
    en: 'Redeem',
    zh: '兑换',
    id: 'Tukar'
  },
  'rewards.pointsRequired': {
    en: 'Points Required',
    zh: '所需积分',
    id: 'Poin yang Diperlukan'
  },

  // Referrals
  'referrals.title': {
    en: 'Referral Program',
    zh: '推荐计划',
    id: 'Program Rujukan'
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
  'referrals.earnings': {
    en: 'Total Earnings',
    zh: '总收入',
    id: 'Total Pendapatan'
  },
  'referrals.totalReferrals': {
    en: 'Total Referrals',
    zh: '总推荐数',
    id: 'Total Rujukan'
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