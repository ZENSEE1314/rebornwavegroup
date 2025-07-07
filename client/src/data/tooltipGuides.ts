// Predefined tooltip guide configurations for different app sections

export const dashboardGuide = [
  {
    id: 'welcome-card',
    element: '[data-tooltip="welcome-card"]',
    title: 'tooltip.dashboard.welcome.title',
    content: 'tooltip.dashboard.welcome.content',
    position: 'bottom' as const,
    category: 'navigation' as const
  },
  {
    id: 'credits-card',
    element: '[data-tooltip="credits-card"]',
    title: 'tooltip.dashboard.credits.title',
    content: 'tooltip.dashboard.credits.content',
    position: 'bottom' as const,
    category: 'feature' as const
  },
  {
    id: 'loyalty-points-card',
    element: '[data-tooltip="loyalty-points-card"]',
    title: 'tooltip.dashboard.loyalty.title',
    content: 'tooltip.dashboard.loyalty.content',
    position: 'bottom' as const,
    category: 'feature' as const
  },
  {
    id: 'tokens-card',
    element: '[data-tooltip="tokens-card"]',
    title: 'tooltip.dashboard.tokens.title',
    content: 'tooltip.dashboard.tokens.content',
    position: 'bottom' as const,
    category: 'feature' as const
  },
  {
    id: 'navigation-tabs',
    element: '[data-tooltip="navigation-tabs"]',
    title: 'tooltip.dashboard.navigation.title',
    content: 'tooltip.dashboard.navigation.content',
    position: 'bottom' as const,
    category: 'navigation' as const
  },
  {
    id: 'quick-actions',
    element: '[data-tooltip="quick-actions"]',
    title: 'tooltip.dashboard.actions.title',
    content: 'tooltip.dashboard.actions.content',
    position: 'top' as const,
    category: 'action' as const
  }
];

export const petCareGuide = [
  {
    id: 'pet-selection',
    element: '[data-tooltip="pet-grid"]',
    title: 'tooltip.petcare.selection.title',
    content: 'tooltip.petcare.selection.content',
    position: 'bottom' as const,
    category: 'navigation' as const
  },
  {
    id: 'pet-stats',
    element: '[data-tooltip="pet-stats"]',
    title: 'tooltip.petcare.stats.title',
    content: 'tooltip.petcare.stats.content',
    position: 'bottom' as const,
    category: 'feature' as const
  },
  {
    id: 'care-actions',
    element: '[data-tooltip="care-actions"]',
    title: 'tooltip.petcare.actions.title',
    content: 'tooltip.petcare.actions.content',
    position: 'top' as const,
    category: 'action' as const
  },
  {
    id: 'evolution-progress',
    element: '[data-tooltip="evolution-progress"]',
    title: 'tooltip.petcare.evolution.title',
    content: 'tooltip.petcare.evolution.content',
    position: 'bottom' as const,
    category: 'tip' as const
  }
];

export const marketplaceGuide = [
  {
    id: 'marketplace-tabs',
    element: '[data-tooltip="marketplace-tabs"]',
    title: 'tooltip.marketplace.tabs.title',
    content: 'tooltip.marketplace.tabs.content',
    position: 'bottom' as const,
    category: 'navigation' as const
  },
  {
    id: 'season-selection',
    element: '[data-tooltip="season-selection"]',
    title: 'tooltip.marketplace.seasons.title',
    content: 'tooltip.marketplace.seasons.content',
    position: 'bottom' as const,
    category: 'feature' as const
  },
  {
    id: 'purchase-button',
    element: '[data-tooltip="purchase-button"]',
    title: 'tooltip.marketplace.purchase.title',
    content: 'tooltip.marketplace.purchase.content',
    position: 'top' as const,
    category: 'action' as const
  },
  {
    id: 'toy-rarity',
    element: '[data-tooltip="toy-rarity"]',
    title: 'tooltip.marketplace.rarity.title',
    content: 'tooltip.marketplace.rarity.content',
    position: 'bottom' as const,
    category: 'tip' as const
  }
];

export const loyaltyGuide = [
  {
    id: 'rewards-grid',
    element: '[data-tooltip="rewards-grid"]',
    title: 'tooltip.loyalty.rewards.title',
    content: 'tooltip.loyalty.rewards.content',
    position: 'bottom' as const,
    category: 'feature' as const
  },
  {
    id: 'point-cost',
    element: '[data-tooltip="point-cost"]',
    title: 'tooltip.loyalty.points.title',
    content: 'tooltip.loyalty.points.content',
    position: 'bottom' as const,
    category: 'tip' as const
  },
  {
    id: 'redeem-button',
    element: '[data-tooltip="redeem-button"]',
    title: 'tooltip.loyalty.redeem.title',
    content: 'tooltip.loyalty.redeem.content',
    position: 'top' as const,
    category: 'action' as const
  },
  {
    id: 'history-tab',
    element: '[data-tooltip="history-tab"]',
    title: 'tooltip.loyalty.history.title',
    content: 'tooltip.loyalty.history.content',
    position: 'bottom' as const,
    category: 'navigation' as const
  }
];

export const paymentGuide = [
  {
    id: 'payment-form',
    element: '[data-tooltip="payment-form"]',
    title: 'tooltip.payment.form.title',
    content: 'tooltip.payment.form.content',
    position: 'bottom' as const,
    category: 'feature' as const
  },
  {
    id: 'upload-receipt',
    element: '[data-tooltip="upload-receipt"]',
    title: 'tooltip.payment.upload.title',
    content: 'tooltip.payment.upload.content',
    position: 'top' as const,
    category: 'action' as const
  },
  {
    id: 'verification-status',
    element: '[data-tooltip="verification-status"]',
    title: 'tooltip.payment.status.title',
    content: 'tooltip.payment.status.content',
    position: 'bottom' as const,
    category: 'tip' as const
  }
];

export const bookingGuide = [
  {
    id: 'service-selection',
    element: '[data-tooltip="service-selection"]',
    title: 'tooltip.booking.service.title',
    content: 'tooltip.booking.service.content',
    position: 'bottom' as const,
    category: 'navigation' as const
  },
  {
    id: 'datetime-picker',
    element: '[data-tooltip="datetime-picker"]',
    title: 'tooltip.booking.datetime.title',
    content: 'tooltip.booking.datetime.content',
    position: 'bottom' as const,
    category: 'feature' as const
  },
  {
    id: 'booking-confirm',
    element: '[data-tooltip="booking-confirm"]',
    title: 'tooltip.booking.confirm.title',
    content: 'tooltip.booking.confirm.content',
    position: 'top' as const,
    category: 'action' as const
  }
];

// Guide trigger configurations
export const guideConfigs = {
  dashboard: dashboardGuide,
  petcare: petCareGuide,
  marketplace: marketplaceGuide,
  loyalty: loyaltyGuide,
  payment: paymentGuide,
  booking: bookingGuide
};

// Helper function to get guide by section
export function getGuideBySection(section: keyof typeof guideConfigs) {
  return guideConfigs[section];
}