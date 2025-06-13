import { useState, useEffect } from 'react';

export type Language = 'en' | 'zh';

interface Translations {
  [key: string]: {
    en: string;
    zh: string;
  };
}

export const translations: Translations = {
  // Navigation & Common
  'nav.home': {
    en: 'Home',
    zh: '首页'
  },
  'nav.pets': {
    en: 'My Pets',
    zh: '我的宠物'
  },
  'nav.profile': {
    en: 'Profile',
    zh: '个人资料'
  },
  'nav.shop': {
    en: 'Shop',
    zh: '商店'
  },
  'nav.rewards': {
    en: 'Rewards',
    zh: '奖励'
  },
  'nav.referrals': {
    en: 'Referrals',
    zh: '推荐'
  },
  'nav.admin': {
    en: 'Admin',
    zh: '管理员'
  },
  'nav.logout': {
    en: 'Logout',
    zh: '退出登录'
  },
  'common.save': {
    en: 'Save',
    zh: '保存'
  },
  'common.cancel': {
    en: 'Cancel',
    zh: '取消'
  },
  'common.delete': {
    en: 'Delete',
    zh: '删除'
  },
  'common.edit': {
    en: 'Edit',
    zh: '编辑'
  },
  'common.loading': {
    en: 'Loading...',
    zh: '加载中...'
  },
  'common.error': {
    en: 'Error',
    zh: '错误'
  },
  'common.success': {
    en: 'Success',
    zh: '成功'
  },
  'common.confirm': {
    en: 'Confirm',
    zh: '确认'
  },
  'common.close': {
    en: 'Close',
    zh: '关闭'
  },
  
  // Landing Page
  'landing.title': {
    en: 'Welcome to Reborn Wave Group',
    zh: '欢迎来到重生波浪集团'
  },
  'landing.subtitle': {
    en: 'Your Digital Pet Care Adventure Awaits',
    zh: '您的数字宠物护理冒险等待着您'
  },
  'landing.description': {
    en: 'Care for virtual dragons, earn tokens, and build your collection in this immersive pet care experience.',
    zh: '照顾虚拟龙，赚取代币，在这个身临其境的宠物护理体验中建立您的收藏。'
  },
  'landing.getStarted': {
    en: 'Get Started',
    zh: '开始使用'
  },
  'landing.login': {
    en: 'Login',
    zh: '登录'
  },
  'landing.features.title': {
    en: 'Amazing Features',
    zh: '惊人功能'
  },
  'landing.features.petCare': {
    en: 'Pet Care System',
    zh: '宠物护理系统'
  },
  'landing.features.petCareDesc': {
    en: 'Feed, bathe, play, and train your virtual dragons',
    zh: '喂养、洗澡、玩耍和训练您的虚拟龙'
  },
  'landing.features.evolution': {
    en: 'Evolution System',
    zh: '进化系统'
  },
  'landing.features.evolutionDesc': {
    en: 'Watch your pets grow through 6 unique life stages',
    zh: '观看您的宠物通过6个独特的生命阶段成长'
  },
  'landing.features.rewards': {
    en: 'Token Rewards',
    zh: '代币奖励'
  },
  'landing.features.rewardsDesc': {
    en: 'Earn daily tokens and redeem for exclusive rewards',
    zh: '赚取每日代币并兑换独家奖励'
  },

  // Authentication
  'auth.email': {
    en: 'Email',
    zh: '电子邮件'
  },
  'auth.password': {
    en: 'Password',
    zh: '密码'
  },
  'auth.confirmPassword': {
    en: 'Confirm Password',
    zh: '确认密码'
  },
  'auth.firstName': {
    en: 'First Name',
    zh: '名'
  },
  'auth.lastName': {
    en: 'Last Name',
    zh: '姓'
  },
  'auth.phoneNumber': {
    en: 'Phone Number',
    zh: '电话号码'
  },
  'auth.gender': {
    en: 'Gender',
    zh: '性别'
  },
  'auth.gender.male': {
    en: 'Male',
    zh: '男'
  },
  'auth.gender.female': {
    en: 'Female',
    zh: '女'
  },
  'auth.dateOfBirth': {
    en: 'Date of Birth',
    zh: '出生日期'
  },
  'auth.referralCode': {
    en: 'Referral Code (Optional)',
    zh: '推荐码（可选）'
  },
  'auth.login': {
    en: 'Login',
    zh: '登录'
  },
  'auth.register': {
    en: 'Register',
    zh: '注册'
  },
  'auth.forgotPassword': {
    en: 'Forgot Password?',
    zh: '忘记密码？'
  },
  'auth.resetPassword': {
    en: 'Reset Password',
    zh: '重置密码'
  },
  'auth.loginWith': {
    en: 'Login with',
    zh: '使用以下方式登录'
  },
  'auth.orContinueWith': {
    en: 'Or continue with',
    zh: '或继续使用'
  },
  'auth.alreadyAccount': {
    en: 'Already have an account?',
    zh: '已有账户？'
  },
  'auth.noAccount': {
    en: "Don't have an account?",
    zh: '没有账户？'
  },

  // Pet Care
  'pet.care.feed': {
    en: 'Feed',
    zh: '喂食'
  },
  'pet.care.bathe': {
    en: 'Bathe',
    zh: '洗澡'
  },
  'pet.care.play': {
    en: 'Play',
    zh: '玩耍'
  },
  'pet.care.train': {
    en: 'Train',
    zh: '训练'
  },
  'pet.care.sleep': {
    en: 'Sleep',
    zh: '睡觉'
  },
  'pet.care.heal': {
    en: 'Heal',
    zh: '治疗'
  },
  'pet.stats.happiness': {
    en: 'Happiness',
    zh: '快乐度'
  },
  'pet.stats.health': {
    en: 'Health',
    zh: '健康度'
  },
  'pet.stats.cleanliness': {
    en: 'Cleanliness',
    zh: '清洁度'
  },
  'pet.stats.energy': {
    en: 'Energy',
    zh: '能量'
  },
  'pet.stats.intelligence': {
    en: 'Intelligence',
    zh: '智力'
  },
  'pet.stats.fitness': {
    en: 'Fitness',
    zh: '体能'
  },
  'pet.evolution.baby': {
    en: 'Baby Dragon',
    zh: '幼龙'
  },
  'pet.evolution.child': {
    en: 'Young Dragon',
    zh: '小龙'
  },
  'pet.evolution.teenager': {
    en: 'Teen Dragon',
    zh: '少年龙'
  },
  'pet.evolution.adult': {
    en: 'Adult Dragon',
    zh: '成年龙'
  },
  'pet.evolution.elder': {
    en: 'Elder Dragon',
    zh: '长老龙'
  },
  'pet.evolution.death': {
    en: 'Memorial',
    zh: '纪念'
  },

  // Dashboard
  'dashboard.welcome': {
    en: 'Welcome Back',
    zh: '欢迎回来'
  },
  'dashboard.myPets': {
    en: 'My Pets',
    zh: '我的宠物'
  },
  'dashboard.stats': {
    en: 'Your Stats',
    zh: '您的统计'
  },
  'dashboard.credits': {
    en: 'Credits',
    zh: '信用点'
  },
  'dashboard.loyaltyPoints': {
    en: 'Loyalty Points',
    zh: '忠诚度积分'
  },
  'dashboard.tokens': {
    en: 'Tokens',
    zh: '代币'
  },
  'dashboard.referralEarnings': {
    en: 'Referral Earnings',
    zh: '推荐收入'
  },
  'dashboard.dailyReward': {
    en: 'Daily Reward',
    zh: '每日奖励'
  },
  'dashboard.claimReward': {
    en: 'Claim Reward',
    zh: '领取奖励'
  },
  'dashboard.rewardClaimed': {
    en: 'Reward Claimed!',
    zh: '奖励已领取！'
  },

  // Profile
  'profile.title': {
    en: 'Profile Settings',
    zh: '个人资料设置'
  },
  'profile.personalInfo': {
    en: 'Personal Information',
    zh: '个人信息'
  },
  'profile.accountSettings': {
    en: 'Account Settings',
    zh: '账户设置'
  },
  'profile.changePassword': {
    en: 'Change Password',
    zh: '更改密码'
  },
  'profile.currentPassword': {
    en: 'Current Password',
    zh: '当前密码'
  },
  'profile.newPassword': {
    en: 'New Password',
    zh: '新密码'
  },
  'profile.updateSuccess': {
    en: 'Profile updated successfully',
    zh: '个人资料更新成功'
  },

  // Shop & Rewards
  'shop.title': {
    en: 'Pet Shop',
    zh: '宠物商店'
  },
  'shop.buyPet': {
    en: 'Buy Pet',
    zh: '购买宠物'
  },
  'shop.price': {
    en: 'Price',
    zh: '价格'
  },
  'rewards.title': {
    en: 'Rewards Center',
    zh: '奖励中心'
  },
  'rewards.redeem': {
    en: 'Redeem',
    zh: '兑换'
  },
  'rewards.pointsRequired': {
    en: 'Points Required',
    zh: '所需积分'
  },

  // Referrals
  'referrals.title': {
    en: 'Referral Program',
    zh: '推荐计划'
  },
  'referrals.yourCode': {
    en: 'Your Referral Code',
    zh: '您的推荐码'
  },
  'referrals.shareCode': {
    en: 'Share this code with friends to earn 10% commission on their purchases',
    zh: '与朋友分享此代码，从他们的购买中赚取10%的佣金'
  },
  'referrals.earnings': {
    en: 'Total Earnings',
    zh: '总收入'
  },
  'referrals.totalReferrals': {
    en: 'Total Referrals',
    zh: '总推荐数'
  },

  // Admin
  'admin.title': {
    en: 'Admin Dashboard',
    zh: '管理员控制台'
  },
  'admin.users': {
    en: 'Users',
    zh: '用户'
  },
  'admin.pets': {
    en: 'Pets',
    zh: '宠物'
  },
  'admin.transactions': {
    en: 'Transactions',
    zh: '交易'
  },
  'admin.settings': {
    en: 'Settings',
    zh: '设置'
  },

  // Error Messages
  'error.invalidCredentials': {
    en: 'Invalid email or password',
    zh: '电子邮件或密码无效'
  },
  'error.emailExists': {
    en: 'Email already exists',
    zh: '电子邮件已存在'
  },
  'error.networkError': {
    en: 'Network error. Please try again.',
    zh: '网络错误。请重试。'
  },
  'error.petNotFound': {
    en: 'Pet not found',
    zh: '找不到宠物'
  },
  'error.insufficientTokens': {
    en: 'Insufficient tokens',
    zh: '代币不足'
  },
  'error.careAlreadyDone': {
    en: 'Care activity already completed today',
    zh: '今天已完成护理活动'
  },

  // Success Messages
  'success.petFed': {
    en: 'Pet fed successfully! +5 points',
    zh: '成功喂养宠物！+5积分'
  },
  'success.petBathed': {
    en: 'Pet bathed successfully! +5 points',
    zh: '成功给宠物洗澡！+5积分'
  },
  'success.petPlayed': {
    en: 'Played with pet successfully! +5 points',
    zh: '成功与宠物玩耍！+5积分'
  },
  'success.petTrained': {
    en: 'Pet trained successfully! +5 points',
    zh: '成功训练宠物！+5积分'
  },
  'success.petSlept': {
    en: 'Pet rested successfully! +5 points',
    zh: '宠物成功休息！+5积分'
  },
  'success.petHealed': {
    en: 'Pet healed successfully! +5 points',
    zh: '成功治疗宠物！+5积分'
  },
  'success.profileUpdated': {
    en: 'Profile updated successfully',
    zh: '个人资料更新成功'
  },
  'success.passwordChanged': {
    en: 'Password changed successfully',
    zh: '密码更改成功'
  },

  // Voice Feedback Messages
  'voice.petFed': {
    en: 'Your dragon is now well fed and happy!',
    zh: '您的龙现在吃得很饱，很开心！'
  },
  'voice.petBathed': {
    en: 'Your dragon is now clean and sparkling!',
    zh: '您的龙现在干净闪闪发光！'
  },
  'voice.petPlayed': {
    en: 'Your dragon had so much fun playing!',
    zh: '您的龙玩得很开心！'
  },
  'voice.petTrained': {
    en: 'Your dragon is getting stronger and smarter!',
    zh: '您的龙变得更强壮更聪明！'
  },
  'voice.petEvolved': {
    en: 'Congratulations! Your dragon has evolved!',
    zh: '恭喜！您的龙已经进化了！'
  },
  'voice.dailyReward': {
    en: 'Daily reward claimed! Keep caring for your pets!',
    zh: '每日奖励已领取！继续照顾您的宠物！'
  }
};

// Language context and hook
let currentLanguage: Language = 'en';
let languageChangeListeners: ((lang: Language) => void)[] = [];

export function getCurrentLanguage(): Language {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('language') as Language;
    if (stored && (stored === 'en' || stored === 'zh')) {
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