/** Clamp string value for controlled number inputs — floor at 0, no negatives. */
export function nonNegativeInputValue(raw: string): string {
  if (raw === '') return '';
  if (raw === '-' || raw.startsWith('-')) return '0';
  const n = Number(raw);
  if (!Number.isNaN(n) && n < 0) return '0';
  return raw;
}

/** Parse a numeric field with a minimum of 0. */
export function nonNegativeNumber(raw: string | number, fallback = 0): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, n);
}
