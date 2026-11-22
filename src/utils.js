export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Yerel saate göre YYYY-MM-DD */
export const toISODate = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const today = () => toISODate(new Date());

export const parseISODate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const formatDate = (s, opts = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  parseISODate(s).toLocaleDateString('tr-TR', opts);

export const formatShort = (s) => parseISODate(s).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });

export const DAYS = [
  { key: 'mon', label: 'Pazartesi', short: 'Pzt' },
  { key: 'tue', label: 'Salı', short: 'Sal' },
  { key: 'wed', label: 'Çarşamba', short: 'Çar' },
  { key: 'thu', label: 'Perşembe', short: 'Per' },
  { key: 'fri', label: 'Cuma', short: 'Cum' },
  { key: 'sat', label: 'Cumartesi', short: 'Cmt' },
  { key: 'sun', label: 'Pazar', short: 'Paz' },
];

/** ISO tarihten gün anahtarı (mon..sun) */
export const dayKeyOf = (iso) => {
  const js = parseISODate(iso).getDay(); // 0 = Pazar
  return DAYS[(js + 6) % 7].key;
};

export const dayLabel = (key) => DAYS.find((d) => d.key === key)?.label ?? key;

export const num = (v) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export const round1 = (n) => Math.round(n * 10) / 10;

export const sumMacros = (items) =>
  items.reduce(
    (a, i) => ({
      kcal: a.kcal + num(i.kcal),
      protein: a.protein + num(i.protein),
      carb: a.carb + num(i.carb),
      fat: a.fat + num(i.fat),
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0 }
  );

export const workoutVolume = (w) =>
  w.exercises.reduce((t, e) => t + e.sets.reduce((s, set) => s + num(set.kg) * num(set.reps), 0), 0);
