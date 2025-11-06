// Uzbekistan location utilities
// All data in Uzbek (Latin script)

export const UZBEK_STATES = [
  'Toshkent viloyati',
  'Samarqand viloyati',
  'Buxoro viloyati',
  'Farg\'ona viloyati',
  'Andijon viloyati',
  'Namangan viloyati',
  'Qashqadaryo viloyati',
  'Surxondaryo viloyati',
  'Jizzax viloyati',
  'Sirdaryo viloyati',
  'Xorazm viloyati',
  'Navoiy viloyati',
  'Qoraqalpog\'iston Respublikasi',
  'Toshkent shahri'
];

export const UZBEK_CITIES = [
  'Toshkent',
  'Samarqand',
  'Buxoro',
  'Farg\'ona',
  'Andijon',
  'Namangan',
  'Qarshi',
  'Nukus',
  'Urganch',
  'Jizzax',
  'Navoiy',
  'Termiz',
  'Guliston'
];

/**
 * Get all states in Uzbek
 */
export function getAllStates() {
  return UZBEK_STATES;
}

/**
 * Get all cities in Uzbek
 */
export function getAllCities() {
  return UZBEK_CITIES;
}
