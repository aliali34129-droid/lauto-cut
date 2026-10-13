export interface StockImageItem {
  id: string;
  category: string;
  title: string;
  url: string;
  keywords: string[];
}

export const STOCK_CATEGORIES = [
  'All',
  'Finance & Wealth',
  'AI & Future Tech',
  'Dark Secrets & Mystery',
  'Space & Science',
  'Psychology & Mindset',
  'Cinematic Atmosphere',
];

export const STOCK_IMAGES: StockImageItem[] = [
  // Finance & Wealth
  {
    id: 'stock-fin-1',
    category: 'Finance & Wealth',
    title: 'Manhattan Skyline Penthouse Sunset',
    url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1600&auto=format&fit=crop&q=80',
    keywords: ['wealth', 'luxury', 'billionaire', 'skyline', 'business'],
  },
  {
    id: 'stock-fin-2',
    category: 'Finance & Wealth',
    title: 'Wall Street Financial Trading Screens',
    url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&auto=format&fit=crop&q=80',
    keywords: ['stocks', 'crypto', 'charts', 'trading', 'money'],
  },
  {
    id: 'stock-fin-3',
    category: 'Finance & Wealth',
    title: 'Gold Bullion Bars Stacked',
    url: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1600&auto=format&fit=crop&q=80',
    keywords: ['gold', 'investment', 'rich', 'wealth', 'treasure'],
  },
  {
    id: 'stock-fin-4',
    category: 'Finance & Wealth',
    title: 'Luxury Sports Car Cockpit',
    url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&auto=format&fit=crop&q=80',
    keywords: ['luxury', 'supercar', 'speed', 'wealth', 'lifestyle'],
  },

  // AI & Future Tech
  {
    id: 'stock-tech-1',
    category: 'AI & Future Tech',
    title: 'Microchip Neural Network Cyber Circuit',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&auto=format&fit=crop&q=80',
    keywords: ['ai', 'microchip', 'technology', 'processor', 'matrix'],
  },
  {
    id: 'stock-tech-2',
    category: 'AI & Future Tech',
    title: 'Humanoid Robot Artificial Intelligence',
    url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1600&auto=format&fit=crop&q=80',
    keywords: ['robot', 'cyborg', 'future', 'automation', 'intelligence'],
  },
  {
    id: 'stock-tech-3',
    category: 'AI & Future Tech',
    title: 'Server Rack Data Center Matrix Lights',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1600&auto=format&fit=crop&q=80',
    keywords: ['server', 'cloud', 'database', 'internet', 'tech'],
  },
  {
    id: 'stock-tech-4',
    category: 'AI & Future Tech',
    title: 'Neon Cyberpunk Futuristic City',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1600&auto=format&fit=crop&q=80',
    keywords: ['cyberpunk', 'futuristic', 'neon', 'city', 'dystopia'],
  },

  // Dark Secrets & Mystery
  {
    id: 'stock-dark-1',
    category: 'Dark Secrets & Mystery',
    title: 'Dark Moody Detective Archives with Candlelight',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
    keywords: ['mystery', 'investigation', 'secret', 'documentary', 'crime'],
  },
  {
    id: 'stock-dark-2',
    category: 'Dark Secrets & Mystery',
    title: 'Dramatic Silhouette in Misty Fog',
    url: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600&auto=format&fit=crop&q=80',
    keywords: ['silhouette', 'fog', 'danger', 'secret', 'shadow'],
  },
  {
    id: 'stock-dark-3',
    category: 'Dark Secrets & Mystery',
    title: 'Secret Vault Steel Security Door',
    url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1600&auto=format&fit=crop&q=80',
    keywords: ['vault', 'security', 'classified', 'lock', 'bunker'],
  },
  {
    id: 'stock-dark-4',
    category: 'Dark Secrets & Mystery',
    title: 'Antique Magnifying Glass on World Map',
    url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1600&auto=format&fit=crop&q=80',
    keywords: ['map', 'history', 'conspiracy', 'clues', 'journey'],
  },

  // Space & Science
  {
    id: 'stock-space-1',
    category: 'Space & Science',
    title: 'Deep Cosmic Nebula Galaxy Hubble',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80',
    keywords: ['space', 'galaxy', 'universe', 'stars', 'cosmos'],
  },
  {
    id: 'stock-space-2',
    category: 'Space & Science',
    title: 'Planet Earth from Orbital Space',
    url: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1600&auto=format&fit=crop&q=80',
    keywords: ['earth', 'globe', 'orbit', 'atmosphere', 'planet'],
  },
  {
    id: 'stock-space-3',
    category: 'Space & Science',
    title: 'Futuristic Quantum Physics Laser Lab',
    url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=1600&auto=format&fit=crop&q=80',
    keywords: ['science', 'laser', 'physics', 'experiment', 'lab'],
  },

  // Psychology & Mindset
  {
    id: 'stock-psy-1',
    category: 'Psychology & Mindset',
    title: 'Chess Board King Victory Checkmate',
    url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=1600&auto=format&fit=crop&q=80',
    keywords: ['chess', 'strategy', 'mastermind', 'game', 'tactics'],
  },
  {
    id: 'stock-psy-2',
    category: 'Psychology & Mindset',
    title: 'Solitary Figure on Mountain Summit Sunrise',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&auto=format&fit=crop&q=80',
    keywords: ['mountain', 'peak', 'success', 'mindset', 'freedom'],
  },
  {
    id: 'stock-psy-3',
    category: 'Psychology & Mindset',
    title: 'Vintage Pocket Watch Mechanism Time Passing',
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1600&auto=format&fit=crop&q=80',
    keywords: ['time', 'clock', 'urgency', 'deadline', 'passing'],
  },

  // Cinematic Atmosphere
  {
    id: 'stock-cine-1',
    category: 'Cinematic Atmosphere',
    title: 'Epic Lightning Storm Clouds Thunder',
    url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=1600&auto=format&fit=crop&q=80',
    keywords: ['storm', 'thunder', 'lightning', 'drama', 'power'],
  },
  {
    id: 'stock-cine-2',
    category: 'Cinematic Atmosphere',
    title: 'Rain Drops on Black Window at Night',
    url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=1600&auto=format&fit=crop&q=80',
    keywords: ['rain', 'night', 'moody', 'reflection', 'melancholy'],
  },
  {
    id: 'stock-cine-3',
    category: 'Cinematic Atmosphere',
    title: 'Ancient Stone Temple Columns Ruin',
    url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1600&auto=format&fit=crop&q=80',
    keywords: ['ancient', 'rome', 'temple', 'history', 'ruins'],
  },
];
