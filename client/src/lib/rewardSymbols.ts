// 100 different symbols/icons for reward items
export const rewardSymbols = [
  // Money & Credits (1-15)
  "💰", "🏆", "💎", "🎁", "🏅", "💳", "💵", "💸", "🪙", "🎟️", 
  "🎫", "💴", "💷", "💶", "🏛️",
  
  // Beauty & Spa (16-25)
  "💄", "💅", "🧴", "🧼", "🛁", "🌸", "🌺", "🌷", "🌹", "💆",
  
  // Entertainment & Gaming (26-35)
  "🎮", "🕹️", "🎲", "🃏", "🎯", "🎪", "🎨", "🎭", "🎵", "🎶",
  
  // Food & Dining (36-45)
  "🍕", "🍔", "🍟", "🍗", "🍖", "🥘", "🍜", "🍱", "🍣", "🍰",
  
  // Drinks & Beverages (46-55)
  "☕", "🥤", "🧋", "🍺", "🍷", "🥂", "🍾", "🍸", "🍹", "🧃",
  
  // Technology & Gadgets (56-65)
  "📱", "💻", "⌚", "🎧", "📸", "🔋", "🖥️", "⌨️", "🖱️", "💾",
  
  // Travel & Transport (66-75)
  "✈️", "🚗", "🚕", "🚌", "🚊", "🛵", "🚲", "🗺️", "🧳", "🏖️",
  
  // Health & Fitness (76-85)
  "🏃", "💪", "🧘", "🏋️", "🤸", "⚽", "🏀", "🎾", "🏓", "🥊",
  
  // Fashion & Style (86-95)
  "👕", "👔", "👗", "👠", "👜", "👑", "💍", "🕶️", "👒", "🧥",
  
  // Special & Premium (96-100)
  "⭐", "🌟", "✨", "🔥", "🎊",

  // Animals & Nature (101-120)
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
  "🦁", "🐮", "🐷", "🐸", "🐵", "🐧", "🐦", "🐤", "🐣", "🐥",

  // Flowers & Plants (121-140) 
  "🌻", "🌼", "🌿", "☘️", "🍀", "🌱", "🌲", "🌳", "🌴", "🌵",
  "🌾", "🌽", "🥕", "🍄", "🌰", "🥜", "🍇", "🍈", "🍉", "🍊",

  // Weather & Sky (141-160)
  "☀️", "🌤️", "⛅", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☄️",
  "🌙", "🌛", "🌜", "🌚", "🌕", "🌖", "🌗", "🌘", "🌑", "🌒",

  // Objects & Tools (161-180)
  "🔧", "🔨", "⚒️", "🛠️", "⚙️", "🔩", "⚡", "🔌", "💡", "🔦",
  "🕯️", "🧯", "🛢️", "💈", "⚗️", "🔬", "🧪", "🩹", "💊", "🩺",

  // Sports & Activities (181-200)
  "⚾", "🥎", "🏐", "🏈", "🏉", "🎱", "🏓", "🏸", "🥅", "⛳",
  "🪃", "🥍", "🏑", "🏒", "🥌", "🛷", "⛷️", "🏂", "🪂", "🏋️‍♀️"
];

// Category mappings for different reward types
export const getCategorySymbol = (category: string, index: number = 0): string => {
  const symbolIndex = index % rewardSymbols.length;
  
  switch (category?.toLowerCase()) {
    case 'credit':
    case 'money':
    case 'cash':
      return rewardSymbols[symbolIndex % 15]; // Money symbols
    case 'beauty':
    case 'spa':
      return rewardSymbols[15 + (symbolIndex % 10)]; // Beauty symbols
    case 'entertainment':
    case 'gaming':
    case 'game':
      return rewardSymbols[25 + (symbolIndex % 10)]; // Entertainment symbols
    case 'food':
    case 'dining':
    case 'restaurant':
      return rewardSymbols[35 + (symbolIndex % 10)]; // Food symbols
    case 'drink':
    case 'beverage':
      return rewardSymbols[45 + (symbolIndex % 10)]; // Drink symbols
    case 'technology':
    case 'tech':
    case 'gadget':
      return rewardSymbols[55 + (symbolIndex % 10)]; // Tech symbols
    case 'travel':
    case 'transport':
      return rewardSymbols[65 + (symbolIndex % 10)]; // Travel symbols
    case 'health':
    case 'fitness':
    case 'sport':
      return rewardSymbols[75 + (symbolIndex % 10)]; // Health symbols
    case 'fashion':
    case 'style':
    case 'clothing':
      return rewardSymbols[85 + (symbolIndex % 10)]; // Fashion symbols
    case 'premium':
    case 'vip':
    case 'special':
      return rewardSymbols[95 + (symbolIndex % 5)]; // Premium symbols
    default:
      return rewardSymbols[symbolIndex]; // Any symbol
  }
};

// Get random symbol for variety
export const getRandomSymbol = (): string => {
  return rewardSymbols[Math.floor(Math.random() * rewardSymbols.length)];
};

// Get symbol by ID for consistency
export const getSymbolById = (id: number): string => {
  return rewardSymbols[id % rewardSymbols.length];
};