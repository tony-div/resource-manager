const arabicCharMap: Record<string, string> = {
  'أ': 'ا',
  'إ': 'ا',
  'آ': 'ا',
  'ٱ': 'ا',
  'ؤ': 'و',
  'ئ': 'ي',
  'ى': 'ي',
  'ة': 'ه',
  'َ': '',
  'ُ': '',
  'ِ': '',
  'ّ': '',
  'ْ': '',
  'ً': '',
  'ٌ': '',
  'ٍ': '',
};

const arabicNumbers: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

export function normalizeArabic(text: string): string {
  let normalized = text.normalize('NFC');

  for (const [arabic, latin] of Object.entries(arabicNumbers)) {
    normalized = normalized.replace(new RegExp(arabic, 'g'), latin);
  }

  for (const [char, replacement] of Object.entries(arabicCharMap)) {
    normalized = normalized.replace(new RegExp(char, 'g'), replacement);
  }

  normalized = normalized.replace(/\s+/g, ' ').trim().toLowerCase();

  return normalized;
}
