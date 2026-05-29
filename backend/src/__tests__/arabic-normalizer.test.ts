import { normalizeArabic } from '../utils/arabic-normalizer';

describe('normalizeArabic', () => {
  test('normalizes Arabic Alef variants to bare Alef', () => {
    expect(normalizeArabic('أحمد')).toBe('احمد');
    expect(normalizeArabic('إحسان')).toBe('احسان');
    expect(normalizeArabic('آدم')).toBe('ادم');
  });

  test('normalizes Taa Marbouta to Haa', () => {
    expect(normalizeArabic('مدرسة')).toBe('مدرسه');
    expect(normalizeArabic('سيارة')).toBe('سياره');
  });

  test('removes Arabic diacritics (tashkeel)', () => {
    expect(normalizeArabic('مُحَمَّد')).toBe('محمد');
    expect(normalizeArabic('كِتاب')).toBe('كتاب');
  });

  test('normalizes Yaa and Waw variants', () => {
    expect(normalizeArabic('قاضي')).toBe('قاضي');
    expect(normalizeArabic('مؤمن')).toBe('مومن');
    expect(normalizeArabic('ئن')).toBe('ين');
  });

  test('converts Arabic-Indic numerals to Latin', () => {
    expect(normalizeArabic('١٢٣')).toBe('123');
    expect(normalizeArabic('٤٥٦')).toBe('456');
    expect(normalizeArabic('٧٨٩٠')).toBe('7890');
  });

  test('trims whitespace and lowercases', () => {
    const result = normalizeArabic('  TEST ');
    expect(result).toBe('test');
  });

  test('handles mixed Arabic and English text', () => {
    const result = normalizeArabic('شاشة عرض ٤ك');
    expect(result).toContain('شاشه');
    expect(result).toContain('4ك');
  });
});
