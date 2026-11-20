const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PromotionInput {
  name: string;
  code: string | null;
  type: 'PERCENT' | 'FIXED';
  value: number;
  categoryId: string | null;
  minTotal: number;
  days: number[];
  startHour: number | null;
  endHour: number | null;
  active: boolean;
}

/** Valida los datos de una promoción del formulario del admin. */
export function parsePromotion(b: Record<string, unknown>): { data: PromotionInput } | { error: string } {
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 60) : '';
  if (!name) return { error: 'Ponle un nombre a la promoción' };
  const code = typeof b.code === 'string' && b.code.trim() ? b.code.trim().toUpperCase().replace(/\s+/g, '').slice(0, 20) : null;
  if (code && !/^[A-Z0-9_-]{3,20}$/.test(code)) return { error: 'El código solo puede tener letras, números, - y _' };
  const type = b.type === 'FIXED' ? 'FIXED' : 'PERCENT';
  const value = Number(b.value);
  if (!Number.isFinite(value) || value <= 0 || (type === 'PERCENT' && value > 100) || value > 100000) return { error: 'Valor del descuento inválido' };
  const categoryId = typeof b.categoryId === 'string' && UUID_RE.test(b.categoryId) ? b.categoryId : null;
  const minTotal = Math.max(0, Number(b.minTotal) || 0);
  const days = Array.isArray(b.days) ? [...new Set(b.days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [];
  const hour = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 24 ? Number(v) : NaN);
  const startHour = hour(b.startHour);
  const endHour = hour(b.endHour);
  if (Number.isNaN(startHour) || Number.isNaN(endHour)) return { error: 'Horas inválidas (0 a 24)' };
  if ((startHour === null) !== (endHour === null)) return { error: 'Indica hora de inicio y de fin, o deja ambas vacías' };
  return { data: { name, code, type, value, categoryId, minTotal, days, startHour, endHour, active: b.active !== false } };
}
