// Location translations for Uzbekistan regions and cities
// This maps between Uzbek (Latin), Russian (Cyrillic), and English for matching

export const LOCATION_TRANSLATIONS = {
  // States/Regions
  states: {
    'Tashkent Region': {
      uz: 'Toshkent viloyati',
      ru: 'Ташкентская область',
      en: 'Tashkent Region'
    },
    'Samarkand Region': {
      uz: 'Samarqand viloyati',
      ru: 'Самаркандская область',
      en: 'Samarkand Region'
    },
    'Bukhara Region': {
      uz: 'Buxoro viloyati',
      ru: 'Бухарская область',
      en: 'Bukhara Region'
    },
    'Fergana Region': {
      uz: 'Farg\'ona viloyati',
      ru: 'Ферганская область',
      en: 'Fergana Region'
    },
    'Andijan Region': {
      uz: 'Andijon viloyati',
      ru: 'Андижанская область',
      en: 'Andijan Region'
    },
    'Namangan Region': {
      uz: 'Namangan viloyati',
      ru: 'Наманганская область',
      en: 'Namangan Region'
    },
    'Kashkadarya Region': {
      uz: 'Qashqadaryo viloyati',
      ru: 'Кашкадарьинская область',
      en: 'Kashkadarya Region'
    },
    'Surkhandarya Region': {
      uz: 'Surxondaryo viloyati',
      ru: 'Сурхандарьинская область',
      en: 'Surkhandarya Region'
    },
    'Jizzakh Region': {
      uz: 'Jizzax viloyati',
      ru: 'Джизакская область',
      en: 'Jizzakh Region'
    },
    'Sirdaryo Region': {
      uz: 'Sirdaryo viloyati',
      ru: 'Сырдарьинская область',
      en: 'Sirdaryo Region'
    },
    'Khorezm Region': {
      uz: 'Xorazm viloyati',
      ru: 'Хорезмская область',
      en: 'Khorezm Region'
    },
    'Navoi Region': {
      uz: 'Navoiy viloyati',
      ru: 'Навоийская область',
      en: 'Navoi Region'
    },
    'Karakalpakstan': {
      uz: 'Qoraqalpog\'iston Respublikasi',
      ru: 'Республика Каракалпакстан',
      en: 'Karakalpakstan'
    },
    'Tashkent': {
      uz: 'Toshkent shahri',
      ru: 'город Ташкент',
      en: 'Tashkent'
    }
  },

  // Major Cities
  cities: {
    'Tashkent': {
      uz: 'Toshkent',
      ru: 'Ташкент',
      en: 'Tashkent'
    },
    'Samarkand': {
      uz: 'Samarqand',
      ru: 'Самарканд',
      en: 'Samarkand'
    },
    'Bukhara': {
      uz: 'Buxoro',
      ru: 'Бухара',
      en: 'Bukhara'
    },
    'Fergana': {
      uz: 'Farg\'ona',
      ru: 'Фергана',
      en: 'Fergana'
    },
    'Andijan': {
      uz: 'Andijon',
      ru: 'Андижан',
      en: 'Andijan'
    },
    'Namangan': {
      uz: 'Namangan',
      ru: 'Наманган',
      en: 'Namangan'
    },
    'Karshi': {
      uz: 'Qarshi',
      ru: 'Карши',
      en: 'Karshi'
    },
    'Nukus': {
      uz: 'Nukus',
      ru: 'Нукус',
      en: 'Nukus'
    },
    'Urgench': {
      uz: 'Urganch',
      ru: 'Ургенч',
      en: 'Urgench'
    },
    'Jizzakh': {
      uz: 'Jizzax',
      ru: 'Джизак',
      en: 'Jizzakh'
    },
    'Navoi': {
      uz: 'Navoiy',
      ru: 'Навои',
      en: 'Navoi'
    },
    'Termez': {
      uz: 'Termiz',
      ru: 'Термез',
      en: 'Termez'
    },
    'Gulistan': {
      uz: 'Guliston',
      ru: 'Гулистан',
      en: 'Gulistan'
    }
  }
};

/**
 * Normalize location name to English for matching with shipping rates
 * Works with Uzbek, Russian, or English input
 * Case-insensitive and handles variations (e.g., "region" vs "Region", "viloyat" vs "viloyati")
 */
export function normalizeLocationToEnglish(locationName, type = 'state') {
  if (!locationName) return null;

  const locations = LOCATION_TRANSLATIONS[type === 'state' ? 'states' : 'cities'];
  const lowerName = locationName.toLowerCase();

  // Normalize variations for fuzzy matching
  const normalizedInput = lowerName
    .replace(/viloyati?/g, '') // Remove viloyat/viloyati
    .replace(/region/g, '')     // Remove region
    .replace(/область/g, '')    // Remove область (Russian for region)
    .replace(/shahri/g, '')     // Remove shahri (city)
    .replace(/город/g, '')      // Remove город (Russian for city)
    .replace(/q/g, 'k')         // Uzbek spelling: Samarqand → Samarkand
    .trim();

  // Check if it's already in English and exists (exact match)
  if (locations[locationName]) {
    return locationName;
  }

  // Search through all translations to find matching Uzbek or Russian
  for (const [englishName, translations] of Object.entries(locations)) {
    // Exact match first
    if (translations.uz === locationName || translations.ru === locationName || translations.en === locationName) {
      return englishName;
    }

    // Case-insensitive exact match
    const uzLower = translations.uz.toLowerCase();
    const ruLower = translations.ru.toLowerCase();
    const enLower = translations.en.toLowerCase();

    if (uzLower === lowerName || ruLower === lowerName || enLower === lowerName) {
      return englishName;
    }

    // Fuzzy match by removing common suffixes
    const normalizedUz = uzLower.replace(/viloyati?/g, '').replace(/region/g, '').replace(/shahri/g, '').replace(/q/g, 'k').trim();
    const normalizedRu = ruLower.replace(/область/g, '').replace(/регион/g, '').replace(/город/g, '').trim();
    const normalizedEn = enLower.replace(/region/g, '').trim();

    if (normalizedInput === normalizedUz || normalizedInput === normalizedRu || normalizedInput === normalizedEn) {
      return englishName;
    }
  }

  // If no match found, return original (might be a new location)
  return locationName;
}

/**
 * Translate location from English to target language
 */
export function translateLocation(englishName, targetLang, type = 'state') {
  if (!englishName) return englishName;

  const locations = LOCATION_TRANSLATIONS[type === 'state' ? 'states' : 'cities'];
  const translation = locations[englishName];

  if (translation && translation[targetLang]) {
    return translation[targetLang];
  }

  // Return original if no translation found
  return englishName;
}

/**
 * Get all states in a specific language
 */
export function getAllStates(language = 'uz') {
  return Object.entries(LOCATION_TRANSLATIONS.states).map(([_, translations]) =>
    translations[language] || translations.en
  );
}

/**
 * Get all cities in a specific language
 */
export function getAllCities(language = 'uz') {
  return Object.entries(LOCATION_TRANSLATIONS.cities).map(([_, translations]) =>
    translations[language] || translations.en
  );
}
