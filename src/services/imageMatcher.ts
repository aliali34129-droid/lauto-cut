import { Scene } from '../types/editor';
import { STOCK_IMAGES } from '../data/stockLibrary';

// Curated high-resolution fallback library across popular YouTube automation niches
const TOPIC_COLLECTIONS: { keywords: string[]; urls: string[] }[] = [
  {
    keywords: ['wealth', 'money', 'rich', 'dollar', 'gold', 'finance', 'millionaire', 'billionaire', 'cash', 'invest', 'bank', 'crypto', 'stocks', 'wall street', 'profit'],
    urls: [
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1600&auto=format&fit=crop&q=80', // skyline penthouse
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&auto=format&fit=crop&q=80', // trading charts
      'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1600&auto=format&fit=crop&q=80', // gold bars
      'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1600&auto=format&fit=crop&q=80', // dollar bills
      'https://images.unsplash.com/photo-1565372195458-9de0b320ef04?w=1600&auto=format&fit=crop&q=80', // modern bank architecture
    ],
  },
  {
    keywords: ['ai', 'artificial intelligence', 'robot', 'technology', 'code', 'computer', 'future', 'chip', 'cyber', 'matrix', 'algorithm', 'software', 'neural', 'machine'],
    urls: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&auto=format&fit=crop&q=80', // microchip
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1600&auto=format&fit=crop&q=80', // humanoid robot
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1600&auto=format&fit=crop&q=80', // server rack
      'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1600&auto=format&fit=crop&q=80', // cyberpunk neon
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&auto=format&fit=crop&q=80', // matrix code
    ],
  },
  {
    keywords: ['space', 'galaxy', 'planet', 'earth', 'stars', 'cosmos', 'universe', 'alien', 'moon', 'orbit', 'nasa', 'astronaut', 'telescope'],
    urls: [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80', // nebula
      'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1600&auto=format&fit=crop&q=80', // planet earth
      'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80', // Milky Way
      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&auto=format&fit=crop&q=80', // space orbit
    ],
  },
  {
    keywords: ['mindset', 'success', 'strategy', 'chess', 'win', 'power', 'motivation', 'discipline', 'hustle', 'focus', 'goals', 'leader', 'champion'],
    urls: [
      'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=1600&auto=format&fit=crop&q=80', // chess king
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&auto=format&fit=crop&q=80', // mountain peak sunrise
      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1600&auto=format&fit=crop&q=80', // fitness discipline
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&auto=format&fit=crop&q=80', // stage spotlight
    ],
  },
  {
    keywords: ['secret', 'mystery', 'dark', 'conspiracy', 'classified', 'danger', 'crime', 'shadow', 'truth', 'lie', 'fbi', 'cia', 'vault', 'hidden'],
    urls: [
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80', // moody archives
      'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600&auto=format&fit=crop&q=80', // silhouette fog
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1600&auto=format&fit=crop&q=80', // steel vault
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1600&auto=format&fit=crop&q=80', // vintage map
    ],
  },
  {
    keywords: ['nature', 'forest', 'mountain', 'water', 'ocean', 'river', 'landscape', 'earth', 'green', 'sky', 'clouds', 'island'],
    urls: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&auto=format&fit=crop&q=80', // mountain
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&auto=format&fit=crop&q=80', // misty forest
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80', // tropical beach
      'https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?w=1600&auto=format&fit=crop&q=80', // waterfall
    ],
  },
  {
    keywords: ['car', 'speed', 'luxury', 'supercar', 'driving', 'road', 'lifestyle', 'jet', 'plane', 'yacht'],
    urls: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&auto=format&fit=crop&q=80', // sports car
      'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?w=1600&auto=format&fit=crop&q=80', // luxury interior
      'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&auto=format&fit=crop&q=80', // city highway night
    ],
  },
  {
    keywords: ['history', 'ancient', 'war', 'army', 'king', 'throne', 'battle', 'sword', 'castle', 'monument'],
    urls: [
      'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1600&auto=format&fit=crop&q=80', // ancient ruins
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80', // medieval castle
      'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=1600&auto=format&fit=crop&q=80', // epic storm
    ],
  },
];

/**
 * Matches the most relevant stock image URL based on narration text and keywords
 */
export function matchImageForNarration(
  narration: string,
  searchKeywords: string[] = [],
  usedUrls: Set<string> = new Set()
): string {
  const combinedText = `${narration} ${searchKeywords.join(' ')}`.toLowerCase();

  // 1. Try matching against stock library with keyword scoring
  let bestStockUrl: string | null = null;
  let highestScore = 0;

  for (const item of STOCK_IMAGES) {
    let score = 0;
    for (const kw of item.keywords) {
      if (combinedText.includes(kw.toLowerCase())) {
        score += 2;
      }
    }
    if (combinedText.includes(item.title.toLowerCase())) {
      score += 3;
    }
    // Penalize already used images to give variety
    if (usedUrls.has(item.url)) {
      score -= 3;
    }

    if (score > highestScore) {
      highestScore = score;
      bestStockUrl = item.url;
    }
  }

  if (bestStockUrl && highestScore > 0) {
    usedUrls.add(bestStockUrl);
    return bestStockUrl;
  }

  // 2. Try topic collections
  for (const col of TOPIC_COLLECTIONS) {
    const hasKeyword = col.keywords.some((kw) => combinedText.includes(kw));
    if (hasKeyword) {
      const unused = col.urls.filter((u) => !usedUrls.has(u));
      const chosen = unused.length > 0 ? unused[Math.floor(Math.random() * unused.length)] : col.urls[0];
      usedUrls.add(chosen);
      return chosen;
    }
  }

  // 3. Fallback: cycle through curated stock images to guarantee visual variety
  const fallbackUnused = STOCK_IMAGES.filter((item) => !usedUrls.has(item.url));
  const fallbackItem =
    fallbackUnused.length > 0
      ? fallbackUnused[Math.floor(Math.random() * fallbackUnused.length)]
      : STOCK_IMAGES[Math.floor(Math.random() * STOCK_IMAGES.length)];

  usedUrls.add(fallbackItem.url);
  return fallbackItem.url;
}

/**
 * Auto-matches relevant, high-resolution imagery for all scenes according to their voiceover narration
 */
export function autoMatchImagesToScenes(scenes: Scene[]): Scene[] {
  const usedUrls = new Set<string>();

  return scenes.map((scene) => {
    const matchedUrl = matchImageForNarration(
      scene.narration || scene.title,
      scene.searchKeywords || [],
      usedUrls
    );

    return {
      ...scene,
      imageUrl: matchedUrl,
    };
  });
}
