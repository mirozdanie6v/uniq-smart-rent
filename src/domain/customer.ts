export function normalizeContactKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.startsWith('@')) return normalized.replace(/\s+/g, '');
  const compact = normalized.replace(/[\s().-]+/g, '');
  return compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
}
