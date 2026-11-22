import { useMemo, useState } from 'react';
import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useStore, goalFor } from '../store';
import { DAYS, uid, today, dayKeyOf, dayLabel, formatDate, formatShort, num, round1, sumMacros, toISODate } from '../utils';

const tabClass = ({ isActive }) => 'tab' + (isActive ? ' active' : '');

export default function Nutrition() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Beslenme & Kilo</h1>
          <p>Kilonu takip et, kalori hedefini belirle, beslenme programını yaz.</p>
        </div>
      </div>
      <div className="tabs">
        <NavLink to="gunluk" className={tabClass}>🍽️ Günlük</NavLink>
        <NavLink to="program" className={tabClass}>🗓️ Haftalık Program</NavLink>
        <NavLink to="kilo" className={tabClass}>⚖️ Kilo</NavLink>
        <NavLink to="hedef" className={tabClass}>🎯 Kalori Hedefi</NavLink>
      </div>
      <Routes>
        <Route index element={<Navigate to="gunluk" replace />} />
        <Route path="gunluk" element={<DailyTab />} />
        <Route path="program" element={<MealPlanTab />} />
        <Route path="kilo" element={<WeightTab />} />
        <Route path="hedef" element={<GoalTab />} />
      </Routes>
    </div>
  );
}

/* ---------- Ortak: yiyecek satırları ---------- */
const emptyFood = () => ({ id: uid(), name: '', kcal: '', protein: '', carb: '', fat: '' });

function FoodEditor({ items, onChange }) {
  const set = (id, field, value) => onChange(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  return (
    <div>
      <div className="food-row food-head">
        <span>Yiyecek / miktar</span><span>Kalori</span>
        <span className="macro-input">Protein</span><span className="macro-input">Karb.</span><span className="macro-input">Yağ</span><span />
      </div>
      {items.map((i) => (
        <div className="food-row" key={i.id}>
          <input placeholder="ör. 3 yumurta" value={i.name} onChange={(e) => set(i.id, 'name', e.target.value)} />
          <input type="number" min="0" placeholder="kcal" value={i.kcal} onChange={(e) => set(i.id, 'kcal', e.target.value)} />
          <input className="macro-input" type="number" min="0" placeholder="g" value={i.protein} onChange={(e) => set(i.id, 'protein', e.target.value)} />
          <input className="macro-input" type="number" min="0" placeholder="g" value={i.carb} onChange={(e) => set(i.id, 'carb', e.target.value)} />
          <input className="macro-input" type="number" min="0" placeholder="g" value={i.fat} onChange={(e) => set(i.id, 'fat', e.target.value)} />
          <button className="icon-btn" onClick={() => onChange(items.filter((x) => x.id !== i.id))}>✕</button>
        </div>
      ))}
      <button className="btn btn-sm" onClick={() => onChange([...items, emptyFood()])}>+ Yiyecek ekle</button>
    </div>
  );
}

const MacroLine = ({ m, goal }) => (
  <div className="macro-bar">
    <span>🔥 <b>{Math.round(m.kcal)}</b>{goal?.kcal ? ` / ${goal.kcal}` : ''} kcal</span>
    <span>P <b>{round1(m.protein)}</b>{goal?.protein ? ` / ${goal.protein}` : ''} g</span>
    <span>K <b>{round1(m.carb)}</b>{goal?.carb ? ` / ${goal.carb}` : ''} g</span>
    <span>Y <b>{round1(m.fat)}</b>{goal?.fat ? ` / ${goal.fat}` : ''} g</span>
  </div>
);

const Progress = ({ value, max }) => {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={'progress' + (max && value > max ? ' over' : '')}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
};

/* ---------- Günlük ---------- */
function DailyTab() {
  const { data, update } = useStore();
  const [date, setDate] = useState(today());
  const dayKey = dayKeyOf(date);
  const meals = data.mealPlan[dayKey];
  const log = data.dailyLogs[date] ?? { eaten: {}, extras: [] };
  const goal = goalFor(data.calorieGoals, date);
  const weight = data.weights.find((w) => w.date === date);
  const [weightInput, setWeightInput] = useState('');

  const setLog = (fn) => update((d) => ({ dailyLogs: { ...d.dailyLogs, [date]: fn(d.dailyLogs[date] ?? { eaten: {}, extras: [] }) } }));
  const toggle = (id) => setLog((l) => ({ ...l, eaten: { ...l.eaten, [id]: !l.eaten[id] } }));

  const planItems = meals.flatMap((m) => m.items);
  const eatenItems = [...planItems.filter((i) => log.eaten[i.id]), ...log.extras];
  const eaten = sumMacros(eatenItems);
  const planned = sumMacros(planItems);

  const saveWeight = () => {
    const kg = num(weightInput);
    if (!kg) return;
    update((d) => ({ weights: [...d.weights.filter((w) => w.date !== date), { date, kg }] }));
    setWeightInput('');
  };

  const shift = (days) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setDate(toISODate(d));
  };

  return (
    <div className="stack">
      <div className="card">
        <div className="row">
          <button className="btn btn-sm" onClick={() => shift(-1)}>◀</button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn btn-sm" onClick={() => shift(1)}>▶</button>
          <b>{formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
          <div className="spacer" />
          {date !== today() && <button className="btn btn-sm" onClick={() => setDate(today())}>Bugün</button>}
        </div>
      </div>

      <div className="grid grid-3">
        <div className="stat">
          <div className="stat-label">Alınan kalori</div>
          <div className="stat-value">{Math.round(eaten.kcal)} <span className="muted small">/ {goal?.kcal ?? '—'} kcal</span></div>
          <div style={{ marginTop: 10 }}><Progress value={eaten.kcal} max={goal?.kcal} /></div>
          <div className="stat-sub">
            {goal?.kcal ? (eaten.kcal <= goal.kcal ? `Kalan: ${Math.round(goal.kcal - eaten.kcal)} kcal` : `Aşım: ${Math.round(eaten.kcal - goal.kcal)} kcal`) : 'Kalori hedefi belirlenmemiş'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Makrolar (alınan)</div>
          <div style={{ marginTop: 10 }} className="stack">
            {[['Protein', 'protein'], ['Karbonhidrat', 'carb'], ['Yağ', 'fat']].map(([l, k]) => (
              <div key={k}>
                <div className="row small"><span>{l}</span><div className="spacer" /><span className="muted">{round1(eaten[k])}{goal?.[k] ? ` / ${goal[k]}` : ''} g</span></div>
                <Progress value={eaten[k]} max={num(goal?.[k])} />
              </div>
            ))}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Günün kilosu</div>
          <div className="stat-value">{weight ? `${weight.kg} kg` : '—'}</div>
          <div className="row" style={{ marginTop: 10 }}>
            <input type="number" step="0.1" placeholder="kg" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveWeight()} />
            <button className="btn btn-primary btn-sm" onClick={saveWeight}>{weight ? 'Güncelle' : 'Kaydet'}</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>{dayLabel(dayKey)} Beslenme Programı</h2>
          <span className="small muted">Planlanan: {Math.round(planned.kcal)} kcal</span>
        </div>
        {meals.length === 0 && <div className="empty">Bu gün için beslenme programı yok. "Haftalık Program" sekmesinden ekleyebilirsin.</div>}
        {meals.map((m) => {
          const t = sumMacros(m.items);
          const done = m.items.length > 0 && m.items.every((i) => log.eaten[i.id]);
          return (
            <div className="meal-card" key={m.id}>
              <div className="row" style={{ marginBottom: 6 }}>
                <h3>{done ? '✅ ' : ''}{m.name || 'Öğün'}</h3>
                <div className="spacer" />
                <span className="small muted">{Math.round(t.kcal)} kcal</span>
              </div>
              {m.items.map((i) => (
                <label key={i.id} className={'check-row' + (log.eaten[i.id] ? ' done' : '')}>
                  <input type="checkbox" checked={!!log.eaten[i.id]} onChange={() => toggle(i.id)} />
                  <span className="food-name">{i.name || '—'}</span>
                  <div className="spacer" />
                  <span className="small muted">{num(i.kcal)} kcal · P{num(i.protein)} K{num(i.carb)} Y{num(i.fat)}</span>
                </label>
              ))}
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Ekstra Yenilenler</h2>
          <span className="small muted">Program dışı yediklerin</span>
        </div>
        <FoodEditor items={log.extras} onChange={(extras) => setLog((l) => ({ ...l, extras }))} />
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Gün Toplamı</h3>
        <MacroLine m={eaten} goal={goal} />
      </div>
    </div>
  );
}

/* ---------- Haftalık program ---------- */
const MEAL_PRESETS = ['Kahvaltı', 'Ara Öğün', 'Öğle Yemeği', 'Antrenman Öncesi', 'Antrenman Sonrası', 'Akşam Yemeği', 'Gece'];

function MealPlanTab() {
  const { data, update } = useStore();
  const [day, setDay] = useState(dayKeyOf(today()));
  const meals = data.mealPlan[day];
  const goal = goalFor(data.calorieGoals, today());

  const setMeals = (fn) => update((d) => ({ mealPlan: { ...d.mealPlan, [day]: fn(d.mealPlan[day]) } }));
  const setMeal = (id, patch) => setMeals((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const addMeal = (name = '') => setMeals((ms) => [...ms, { id: uid(), name, items: [emptyFood()] }]);
  const move = (idx, dir) =>
    setMeals((ms) => {
      const j = idx + dir;
      if (j < 0 || j >= ms.length) return ms;
      const xs = [...ms];
      [xs[idx], xs[j]] = [xs[j], xs[idx]];
      return xs;
    });

  const copyTo = (target) => {
    if (!target) return;
    const targets = target === 'all' ? DAYS.map((d) => d.key).filter((k) => k !== day) : [target];
    if (!confirm(`${target === 'all' ? 'Tüm diğer günlerin' : dayLabel(target) + ' gününün'} programının üzerine yazılsın mı?`)) return;
    update((d) => {
      const mp = { ...d.mealPlan };
      targets.forEach((t) => {
        mp[t] = meals.map((m) => ({ ...m, id: uid(), items: m.items.map((i) => ({ ...i, id: uid() })) }));
      });
      return { mealPlan: mp };
    });
  };

  const dayTotal = sumMacros(meals.flatMap((m) => m.items));

  return (
    <div className="stack">
      <div className="card">
        <div className="card-header">
          <h2>Haftalık Görünüm</h2>
          {goal?.kcal && <span className="small muted">Hedef: {goal.kcal} kcal/gün</span>}
        </div>
        <div className="week-grid">
          {DAYS.map((d) => {
            const ms = data.mealPlan[d.key];
            const t = sumMacros(ms.flatMap((m) => m.items));
            return (
              <div key={d.key} className="week-col" style={{ cursor: 'pointer', borderColor: d.key === day ? 'var(--accent)' : undefined }} onClick={() => setDay(d.key)}>
                <h4>{d.label}</h4>
                <div className={'small ' + (goal?.kcal && t.kcal > goal.kcal ? '' : 'accent')} style={{ marginBottom: 8 }}>{Math.round(t.kcal)} kcal</div>
                {ms.length === 0 && <div className="meal-mini">—</div>}
                {ms.map((m) => (
                  <div className="meal-mini" key={m.id}>
                    <b>{m.name || 'Öğün'}:</b> {m.items.map((i) => i.name).filter(Boolean).join(', ') || '—'}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="day-pills">
          {DAYS.map((d) => (
            <button key={d.key} className={'day-pill' + (d.key === day ? ' active' : '')} onClick={() => setDay(d.key)}>
              {d.label}
              {data.mealPlan[d.key].length > 0 && <span className="dot" />}
            </button>
          ))}
        </div>
        <div className="card-header">
          <div>
            <h2>{dayLabel(day)} Programı</h2>
            <div style={{ marginTop: 6 }}><MacroLine m={dayTotal} goal={goal} /></div>
          </div>
          <select value="" onChange={(e) => copyTo(e.target.value)}>
            <option value="">Bu günü kopyala...</option>
            <option value="all">→ Tüm diğer günlere</option>
            {DAYS.filter((d) => d.key !== day).map((d) => <option key={d.key} value={d.key}>→ {d.label}</option>)}
          </select>
        </div>

        {meals.length === 0 && <div className="empty">Henüz öğün yok. Aşağıdan öğün ekle.</div>}
        {meals.map((m, idx) => {
          const t = sumMacros(m.items);
          return (
            <div className="meal-card" key={m.id}>
              <div className="row" style={{ marginBottom: 10 }}>
                <input list="meal-presets" style={{ flex: 1, fontWeight: 600 }} placeholder="Öğün adı" value={m.name} onChange={(e) => setMeal(m.id, { name: e.target.value })} />
                <span className="small muted">{Math.round(t.kcal)} kcal</span>
                <button className="btn btn-ghost btn-sm" onClick={() => move(idx, -1)}>▲</button>
                <button className="btn btn-ghost btn-sm" onClick={() => move(idx, 1)}>▼</button>
                <button className="icon-btn" onClick={() => confirm('Öğün silinsin mi?') && setMeals((ms) => ms.filter((x) => x.id !== m.id))}>🗑</button>
              </div>
              <FoodEditor items={m.items} onChange={(items) => setMeal(m.id, { items })} />
            </div>
          );
        })}
        <datalist id="meal-presets">{MEAL_PRESETS.map((p) => <option key={p} value={p} />)}</datalist>
        <div className="row" style={{ marginTop: 14 }}>
          <span className="small muted">Öğün ekle:</span>
          {MEAL_PRESETS.map((p) => (
            <button key={p} className="btn btn-sm" onClick={() => addMeal(p)}>+ {p}</button>
          ))}
          <button className="btn btn-sm" onClick={() => addMeal('')}>+ Diğer</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Kilo ---------- */
function WeightTab() {
  const { data, update } = useStore();
  const [date, setDate] = useState(today());
  const [kg, setKg] = useState('');

  const sorted = useMemo(() => [...data.weights].sort((a, b) => a.date.localeCompare(b.date)), [data.weights]);
  const chart = useMemo(
    () =>
      sorted.map((w, i) => {
        const win = sorted.slice(Math.max(0, i - 6), i + 1);
        return { label: formatShort(w.date), kg: w.kg, avg: round1(win.reduce((t, x) => t + x.kg, 0) / win.length) };
      }),
    [sorted]
  );

  const save = () => {
    const v = num(kg);
    if (!v) return;
    update((d) => ({ weights: [...d.weights.filter((w) => w.date !== date), { date, kg: v }] }));
    setKg('');
  };
  const remove = (d0) => update((d) => ({ weights: d.weights.filter((w) => w.date !== d0) }));

  const first = sorted[0];
  const last = sorted.at(-1);
  const weekAgo = sorted.filter((w) => w.date <= shiftDate(last?.date, -7)).at(-1);

  return (
    <div className="stack">
      <div className="grid grid-4">
        <div className="stat"><div className="stat-label">Güncel</div><div className="stat-value">{last ? `${last.kg} kg` : '—'}</div><div className="stat-sub">{last ? formatDate(last.date) : ''}</div></div>
        <div className="stat"><div className="stat-label">Başlangıç</div><div className="stat-value">{first ? `${first.kg} kg` : '—'}</div><div className="stat-sub">{first ? formatDate(first.date) : ''}</div></div>
        <div className="stat"><div className="stat-label">Toplam değişim</div><div className="stat-value">{first && last ? signed(last.kg - first.kg) : '—'}</div></div>
        <div className="stat"><div className="stat-label">Son 7 gün</div><div className="stat-value">{weekAgo && last ? signed(last.kg - weekAgo.kg) : '—'}</div></div>
      </div>

      <div className="card">
        <div className="card-header"><h2>Kilo Gir</h2></div>
        <div className="row">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input type="number" step="0.1" placeholder="kg" value={kg} onChange={(e) => setKg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
          <button className="btn btn-primary" onClick={save}>Kaydet</button>
          <span className="small muted">Aynı tarihe tekrar girersen güncellenir.</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2>Kilo Grafiği</h2></div>
        {chart.length < 2 ? (
          <div className="empty">Grafik için en az 2 kayıt gir.</div>
        ) : (
          <div className="chart-box">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke="#2a3245" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#8b94a8" fontSize={12} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#8b94a8" fontSize={12} />
                <Tooltip contentStyle={{ background: '#181e2b', border: '1px solid #2a3245', borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="kg" name="Kilo" stroke="#4ade80" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="avg" name="7 günlük ort." stroke="#60a5fa" strokeWidth={2} dot={false} strokeDasharray="5 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header"><h2>Kayıtlar</h2></div>
        {sorted.length === 0 ? (
          <div className="empty">Henüz kilo kaydı yok.</div>
        ) : (
          <table>
            <thead><tr><th>Tarih</th><th>Kilo</th><th>Fark</th><th /></tr></thead>
            <tbody>
              {[...sorted].reverse().map((w, i, arr) => {
                const prev = arr[i + 1];
                return (
                  <tr key={w.date}>
                    <td>{formatDate(w.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</td>
                    <td><b>{w.kg} kg</b></td>
                    <td className="muted">{prev ? signed(w.kg - prev.kg) : '—'}</td>
                    <td style={{ textAlign: 'right' }}><button className="icon-btn" onClick={() => remove(w.date)}>🗑</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const signed = (v) => `${v > 0 ? '+' : ''}${round1(v)} kg`;
const shiftDate = (iso, days) => {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

/* ---------- Kalori hedefi ---------- */
function GoalTab() {
  const { data, update } = useStore();
  const current = goalFor(data.calorieGoals, today());
  const [form, setForm] = useState({
    date: today(),
    kcal: current?.kcal ?? '',
    protein: current?.protein ?? '',
    carb: current?.carb ?? '',
    fat: current?.fat ?? '',
  });
  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const macroKcal = num(form.protein) * 4 + num(form.carb) * 4 + num(form.fat) * 9;

  const save = () => {
    if (!num(form.kcal)) return alert('Kalori hedefi gir.');
    const g = { date: form.date, kcal: num(form.kcal), protein: num(form.protein), carb: num(form.carb), fat: num(form.fat) };
    update((d) => ({ calorieGoals: [...d.calorieGoals.filter((x) => x.date !== g.date), g] }));
  };

  const history = [...data.calorieGoals].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="stack">
      <div className="grid grid-4">
        <div className="stat"><div className="stat-label">Güncel hedef</div><div className="stat-value accent">{current?.kcal ?? '—'} <span className="small muted">kcal</span></div></div>
        <div className="stat"><div className="stat-label">Protein</div><div className="stat-value">{current?.protein || '—'} <span className="small muted">g</span></div></div>
        <div className="stat"><div className="stat-label">Karbonhidrat</div><div className="stat-value">{current?.carb || '—'} <span className="small muted">g</span></div></div>
        <div className="stat"><div className="stat-label">Yağ</div><div className="stat-value">{current?.fat || '—'} <span className="small muted">g</span></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h2>Hedef Belirle / Güncelle</h2></div>
        <div className="grid grid-4" style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr))' }}>
          <label className="field">Geçerlilik tarihi<input type="date" value={form.date} onChange={f('date')} /></label>
          <label className="field">Günlük kalori (kcal)<input type="number" value={form.kcal} onChange={f('kcal')} style={{ width: '100%' }} /></label>
          <label className="field">Protein (g)<input type="number" value={form.protein} onChange={f('protein')} style={{ width: '100%' }} /></label>
          <label className="field">Karbonhidrat (g)<input type="number" value={form.carb} onChange={f('carb')} style={{ width: '100%' }} /></label>
          <label className="field">Yağ (g)<input type="number" value={form.fat} onChange={f('fat')} style={{ width: '100%' }} /></label>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <span className="small muted">
            Makrolardan hesaplanan: <b>{Math.round(macroKcal)}</b> kcal
            {num(form.kcal) > 0 && macroKcal > 0 && ` (hedeften ${signedKcal(macroKcal - num(form.kcal))})`}
          </span>
          <div className="spacer" />
          <button className="btn btn-primary" onClick={save}>Kaydet</button>
        </div>
        <p className="small muted">Hedef, seçtiğin tarihten itibaren geçerli olur. Eski günler eski hedefle değerlendirilir.</p>
      </div>

      <div className="card">
        <div className="card-header"><h2>Hedef Geçmişi</h2></div>
        {history.length === 0 ? (
          <div className="empty">Henüz hedef girilmedi.</div>
        ) : (
          <table>
            <thead><tr><th>Başlangıç</th><th>Kalori</th><th>P / K / Y (g)</th><th /></tr></thead>
            <tbody>
              {history.map((g) => (
                <tr key={g.date}>
                  <td>{formatDate(g.date)}</td>
                  <td><b>{g.kcal}</b> kcal</td>
                  <td className="muted">{g.protein} / {g.carb} / {g.fat}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-btn" onClick={() => update((d) => ({ calorieGoals: d.calorieGoals.filter((x) => x.date !== g.date) }))}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const signedKcal = (v) => `${v > 0 ? '+' : ''}${Math.round(v)} kcal`;
