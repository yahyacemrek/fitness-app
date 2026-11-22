import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DAYS } from './utils';

const STORAGE_KEY = 'fittakip-data-v1';

const emptyDays = (factory) => Object.fromEntries(DAYS.map((d) => [d.key, factory()]));

export const defaultData = () => ({
  // Haftalık antrenman şablonu
  program: emptyDays(() => ({ name: '', exercises: [] })), // exercises: [{id, name, sets, reps}]
  // Yapılan antrenmanlar
  workouts: [], // [{id, date, title, note, exercises: [{id, name, sets: [{kg, reps}]}]}]
  // Günlük kilo
  weights: [], // [{date, kg}]
  // Kalori hedefi geçmişi (tarihten itibaren geçerli)
  calorieGoals: [], // [{date, kcal, protein, carb, fat}]
  // Haftalık beslenme programı
  mealPlan: emptyDays(() => []), // [{id, name, items: [{id, name, kcal, protein, carb, fat}]}]
  // Günlük beslenme kaydı
  dailyLogs: {}, // { 'YYYY-MM-DD': { eaten: {itemId: true}, extras: [...] } }
});

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    return { ...defaultData(), ...JSON.parse(raw) };
  } catch {
    return defaultData();
  }
};

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [data, setData] = useState(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  /** update(draft => newPartial) – fonksiyon mevcut veriyi alır, değişen alanları döndürür */
  const update = useCallback((fn) => setData((d) => ({ ...d, ...fn(d) })), []);
  const replaceAll = useCallback((newData) => setData({ ...defaultData(), ...newData }), []);

  return <StoreContext.Provider value={{ data, update, replaceAll }}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);

/** Belirli bir tarihte geçerli kalori hedefi */
export const goalFor = (calorieGoals, date) => {
  const sorted = [...calorieGoals].sort((a, b) => a.date.localeCompare(b.date));
  let current = null;
  for (const g of sorted) if (g.date <= date) current = g;
  return current;
};
