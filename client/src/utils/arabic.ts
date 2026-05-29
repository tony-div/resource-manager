export function normalizeArabic(text: string): string {
  const arabicCharMap: Record<string, string> = {
    '\u0623': '\u0627',
    '\u0625': '\u0627',
    '\u0622': '\u0627',
    '\u0671': '\u0627',
    '\u0624': '\u0648',
    '\u0626': '\u064A',
    '\u0649': '\u064A',
    '\u0629': '\u0647',
    '\u064E': '',
    '\u064F': '',
    '\u0650': '',
    '\u0651': '',
    '\u0652': '',
    '\u064B': '',
    '\u064C': '',
    '\u064D': '',
  };

  const arabicNumbers: Record<string, string> = {
    '\u0660': '0',
    '\u0661': '1',
    '\u0662': '2',
    '\u0663': '3',
    '\u0664': '4',
    '\u0665': '5',
    '\u0666': '6',
    '\u0667': '7',
    '\u0668': '8',
    '\u0669': '9',
  };

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
