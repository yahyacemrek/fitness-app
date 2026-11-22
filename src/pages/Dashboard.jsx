import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { useStore, goalFor } from '../store';
import { today, dayKeyOf, dayLabel, formatDate, formatShort, sumMacros, round1, workoutVolume, parseISODate } from '../utils';

export default function Dashboard() {
  const { data } = useStore();
  const date = today();
  const dayKey = dayKeyOf(date);
  const plan = data.program[dayKey];
  const goal = goalFor(data.calorieGoals, date);

  const weights = useMemo(() => [...data.weights].sort((a, b) => a.date.localeCompare(b.date)), [data.weights]);
  const lastWeight = weights.at(-1);
  const recentWeights = weights.slice(-30).map((w) => ({ label: formatShort(w.date), kg: w.kg }));

  const workouts = useMemo(() => [...data.workouts].sort((a, b) => b.date.localeCompare(a.date)), [data.workouts]);
  const lastWorkout = workouts[0];
  const doneToday = workouts.some((w) => w.date === date);

  // Bu hafta (Pazartesi'den itibaren) yapılan antrenman sayısı
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const thisWeek = workouts.filter((w) => parseISODate(w.date) >= monday).length;
  const plannedDays = Object.values(data.program).filter((d) => d.exercises.length).length;

  const meals = data.mealPlan[dayKey];
  const log = data.dailyLogs[date] ?? { eaten: {}, extras: [] };
  const eaten = sumMacros([...meals.flatMap((m) => m.items).filter((i) => log.eaten[i.id]), ...log.extras]);
  const pct = goal?.kcal ? Math.min(100, (eaten.kcal / goal.kcal) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Merhaba 👋</h1>
          <p>{formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <Link to="/antrenman/kayit" className="btn btn-primary">➕ Antrenman Kaydet</Link>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="stat">
          <div className="stat-label">Güncel kilo</div>
          <div className="stat-value">{lastWeight ? `${lastWeight.kg} kg` : '—'}</div>
          <div className="stat-sub">{lastWeight ? formatDate(lastWeight.date, { day: 'numeric', month: 'long' }) : 'Kayıt yok'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Bugünkü kalori</div>
          <div className="stat-value">{Math.round(eaten.kcal)} <span className="small muted">/ {goal?.kcal ?? '—'}</span></div>
          <div className={'progress' + (goal?.kcal && eaten.kcal > goal.kcal ? ' over' : '')} style={{ marginTop: 10 }}><div style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="stat">
          <div className="stat-label">Bu hafta antrenman</div>
          <div className="stat-value">{thisWeek} <span className="small muted">/ {plannedDays || '—'}</span></div>
          <div className="stat-sub">Planlanan gün sayısına göre</div>
        </div>
        <div className="stat">
          <div className="stat-label">Toplam antrenman</div>
          <div className="stat-value">{data.workouts.length}</div>
          <div className="stat-sub">{lastWorkout ? `Son: ${formatDate(lastWorkout.date, { day: 'numeric', month: 'long' })}` : 'Henüz yok'}</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h2>Bugünün Antrenmanı <span className="muted small">({dayLabel(dayKey)})</span></h2>
            {doneToday && <span className="chip green">✅ Tamamlandı</span>}
          </div>
          {plan.exercises.length === 0 ? (
            <div className="empty">Bugün programda antrenman yok. <Link to="/antrenman/program" className="accent">Programı düzenle</Link></div>
          ) : (
            <>
              <h3 style={{ marginBottom: 8 }}>{plan.name || 'Antrenman'}</h3>
              <table>
                <tbody>
                  {plan.exercises.map((e) => (
                    <tr key={e.id}><td>{e.name}</td><td className="muted" style={{ textAlign: 'right' }}>{e.sets} × {e.reps}</td></tr>
                  ))}
                </tbody>
              </table>
              {!doneToday && <Link to="/antrenman/kayit" className="btn btn-primary" style={{ marginTop: 12 }}>Başla →</Link>}
            </>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Kilo (son 30 kayıt)</h2>
            <Link to="/beslenme/kilo" className="btn btn-sm">Kilo gir</Link>
          </div>
          {recentWeights.length < 2 ? (
            <div className="empty">Grafik için en az 2 kilo kaydı gir.</div>
          ) : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer>
                <AreaChart data={recentWeights}>
                  <defs>
                    <linearGradient id="kg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" stroke="#8b94a8" fontSize={11} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#8b94a8" fontSize={11} width={36} />
                  <Tooltip contentStyle={{ background: '#181e2b', border: '1px solid #2a3245', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="kg" stroke="#4ade80" strokeWidth={2} fill="url(#kg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Bugünün Beslenmesi</h2>
            <Link to="/beslenme/gunluk" className="btn btn-sm">Detay</Link>
          </div>
          {meals.length === 0 ? (
            <div className="empty">Bugün için beslenme programı yok. <Link to="/beslenme/program" className="accent">Program yaz</Link></div>
          ) : (
            meals.map((m) => {
              const done = m.items.length > 0 && m.items.every((i) => log.eaten[i.id]);
              return (
                <div key={m.id} className="row" style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{done ? '✅' : '⬜'}</span>
                  <b>{m.name || 'Öğün'}</b>
                  <span className="small muted">{m.items.map((i) => i.name).filter(Boolean).join(', ')}</span>
                  <div className="spacer" />
                  <span className="small muted">{Math.round(sumMacros(m.items).kcal)} kcal</span>
                </div>
              );
            })
          )}
          <div className="macro-bar" style={{ marginTop: 12 }}>
            <span>P <b>{round1(eaten.protein)}</b>{goal?.protein ? `/${goal.protein}` : ''}g</span>
            <span>K <b>{round1(eaten.carb)}</b>{goal?.carb ? `/${goal.carb}` : ''}g</span>
            <span>Y <b>{round1(eaten.fat)}</b>{goal?.fat ? `/${goal.fat}` : ''}g</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Son Antrenmanlar</h2>
            <Link to="/antrenman/gecmis" className="btn btn-sm">Tümü</Link>
          </div>
          {workouts.length === 0 ? (
            <div className="empty">Henüz antrenman kaydı yok.</div>
          ) : (
            workouts.slice(0, 5).map((w) => (
              <div key={w.id} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <b>{w.title || 'Antrenman'}</b>
                  <div className="small muted">{formatDate(w.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {w.exercises.length} hareket</div>
                </div>
                <div className="spacer" />
                <span className="chip green">{Math.round(workoutVolume(w)).toLocaleString('tr-TR')} kg</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
