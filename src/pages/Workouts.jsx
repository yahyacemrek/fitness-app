import { useMemo, useState } from 'react';
import { NavLink, Route, Routes, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useStore } from '../store';
import WorkoutEditor from '../components/WorkoutEditor';
import { DAYS, uid, formatDate, formatShort, workoutVolume, num, round1, dayKeyOf, dayLabel, today } from '../utils';

export default function Workouts() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Antrenman</h1>
          <p>Programını oluştur, her antrenmanını set set kaydet.</p>
        </div>
      </div>
      <div className="tabs">
        <NavLink to="kayit" className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>➕ Yeni Kayıt</NavLink>
        <NavLink to="gecmis" className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>📅 Geçmiş</NavLink>
        <NavLink to="program" className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>📋 Program</NavLink>
        <NavLink to="ilerleme" className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>📈 İlerleme</NavLink>
      </div>
      <Routes>
        <Route index element={<Navigate to="kayit" replace />} />
        <Route path="kayit" element={<LogTab />} />
        <Route path="gecmis" element={<HistoryTab />} />
        <Route path="program" element={<ProgramTab />} />
        <Route path="ilerleme" element={<ProgressTab />} />
      </Routes>
    </div>
  );
}

/* ---------------- Yeni kayıt / düzenleme ---------------- */
function LogTab() {
  const { data } = useStore();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const editId = params.get('id');
  const initial = editId ? data.workouts.find((w) => w.id === editId) : null;

  return (
    <WorkoutEditor
      key={editId ?? 'new'}
      initial={initial}
      onSaved={() => navigate('/antrenman/gecmis')}
      onCancel={initial ? () => navigate('/antrenman/gecmis') : undefined}
    />
  );
}

/* ---------------- Geçmiş ---------------- */
function HistoryTab() {
  const { data, update } = useStore();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...data.workouts]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((w) => !q || w.title.toLowerCase().includes(q) || w.exercises.some((e) => e.name.toLowerCase().includes(q)));
  }, [data.workouts, query]);

  const remove = (id) => {
    if (!confirm('Bu antrenman silinsin mi?')) return;
    update((d) => ({ workouts: d.workouts.filter((w) => w.id !== id) }));
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Antrenman Geçmişi <span className="muted small">({data.workouts.length})</span></h2>
        <input placeholder="Ara (hareket / antrenman adı)" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {list.length === 0 && <div className="empty">Kayıtlı antrenman yok.</div>}
      {list.map((w) => {
        const open = openId === w.id;
        const totalSets = w.exercises.reduce((t, e) => t + e.sets.length, 0);
        return (
          <div className="history-item" key={w.id} style={{ flexDirection: 'column' }}>
            <div className="row" style={{ cursor: 'pointer' }} onClick={() => setOpenId(open ? null : w.id)}>
              <div>
                <h3>{w.title || 'Antrenman'}</h3>
                <div className="small muted">{formatDate(w.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
              <div className="spacer" />
              <span className="chip">{w.exercises.length} hareket</span>
              <span className="chip">{totalSets} set</span>
              <span className="chip green">{Math.round(workoutVolume(w)).toLocaleString('tr-TR')} kg hacim</span>
              <span className="muted">{open ? '▲' : '▼'}</span>
            </div>
            {open && (
              <div style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr><th>Hareket</th><th>Setler (kg × tekrar)</th><th>Set</th></tr>
                  </thead>
                  <tbody>
                    {w.exercises.map((e) => (
                      <tr key={e.id}>
                        <td><b>{e.name}</b></td>
                        <td>{e.sets.map((s, i) => <span className="chip" key={i}>{s.kg || 0}kg × {s.reps || 0}</span>)}</td>
                        <td>{e.sets.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {w.note && <p className="small muted">📝 {w.note}</p>}
                <div className="row" style={{ marginTop: 10 }}>
                  <div className="spacer" />
                  <button className="btn btn-sm" onClick={() => navigate(`/antrenman/kayit?id=${w.id}`)}>✏️ Düzenle</button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(w.id)}>🗑 Sil</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Program ---------------- */
function ProgramTab() {
  const { data, update } = useStore();
  const [day, setDay] = useState(dayKeyOf(today()));
  const plan = data.program[day];

  const setPlan = (fn) => update((d) => ({ program: { ...d.program, [day]: fn(d.program[day]) } }));
  const setExercise = (id, field, value) =>
    setPlan((p) => ({ ...p, exercises: p.exercises.map((e) => (e.id === id ? { ...e, [field]: value } : e)) }));
  const move = (idx, dir) =>
    setPlan((p) => {
      const j = idx + dir;
      if (j < 0 || j >= p.exercises.length) return p;
      const xs = [...p.exercises];
      [xs[idx], xs[j]] = [xs[j], xs[idx]];
      return { ...p, exercises: xs };
    });
  const copyTo = (target) => {
    if (!target) return;
    if (data.program[target].exercises.length && !confirm(`${dayLabel(target)} programının üzerine yazılsın mı?`)) return;
    update((d) => ({
      program: { ...d.program, [target]: { name: plan.name, exercises: plan.exercises.map((e) => ({ ...e, id: uid() })) } },
    }));
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Haftalık Antrenman Programı</h2>
      </div>
      <div className="day-pills">
        {DAYS.map((d) => (
          <button key={d.key} className={'day-pill' + (d.key === day ? ' active' : '')} onClick={() => setDay(d.key)}>
            {d.label}
            {data.program[d.key].exercises.length > 0 && <span className="dot" />}
          </button>
        ))}
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <label className="field" style={{ flex: 1 }}>
          {dayLabel(day)} – antrenman adı
          <input placeholder="ör. Push, Pull, Bacak, Dinlenme..." value={plan.name} onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))} />
        </label>
        <label className="field">
          Bu günü kopyala
          <select value="" onChange={(e) => copyTo(e.target.value)}>
            <option value="">Gün seç...</option>
            {DAYS.filter((d) => d.key !== day).map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        </label>
      </div>

      {plan.exercises.length === 0 ? (
        <div className="empty">Bu gün için hareket yok (dinlenme günü?).</div>
      ) : (
        <table>
          <thead>
            <tr><th>#</th><th>Hareket</th><th>Hedef set</th><th>Hedef tekrar</th><th /></tr>
          </thead>
          <tbody>
            {plan.exercises.map((e, i) => (
              <tr key={e.id}>
                <td className="muted">{i + 1}</td>
                <td><input style={{ width: '100%' }} placeholder="Hareket adı" value={e.name} onChange={(ev) => setExercise(e.id, 'name', ev.target.value)} /></td>
                <td><input type="number" min="1" value={e.sets} onChange={(ev) => setExercise(e.id, 'sets', ev.target.value)} /></td>
                <td><input placeholder="ör. 8-12" style={{ width: 90 }} value={e.reps} onChange={(ev) => setExercise(e.id, 'reps', ev.target.value)} /></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => move(i, -1)}>▲</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => move(i, 1)}>▼</button>
                  <button className="icon-btn" onClick={() => setPlan((p) => ({ ...p, exercises: p.exercises.filter((x) => x.id !== e.id) }))}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button
        className="btn"
        style={{ marginTop: 12 }}
        onClick={() => setPlan((p) => ({ ...p, exercises: [...p.exercises, { id: uid(), name: '', sets: 3, reps: '10' }] }))}
      >
        + Hareket ekle
      </button>
      <p className="small muted" style={{ marginTop: 14 }}>
        Değişiklikler otomatik kaydedilir. "Yeni Kayıt" sekmesinde <b>Programdan yükle</b> ile o günün programını tek tıkla doldurabilirsin.
      </p>
    </div>
  );
}

/* ---------------- İlerleme ---------------- */
function ProgressTab() {
  const { data } = useStore();
  const names = useMemo(() => {
    const s = new Set();
    data.workouts.forEach((w) => w.exercises.forEach((e) => s.add(e.name)));
    return [...s].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [data.workouts]);
  const [selected, setSelected] = useState('');
  const name = selected || names[0] || '';

  const points = useMemo(() => {
    const key = name.toLowerCase();
    return [...data.workouts]
      .sort((a, b) => a.date.localeCompare(b.date))
      .flatMap((w) => {
        const ex = w.exercises.find((e) => e.name.toLowerCase() === key);
        if (!ex || !ex.sets.length) return [];
        const maxKg = Math.max(...ex.sets.map((s) => num(s.kg)));
        const volume = ex.sets.reduce((t, s) => t + num(s.kg) * num(s.reps), 0);
        // Epley formülü ile tahmini 1 tekrar maksimum
        const e1rm = Math.max(...ex.sets.map((s) => num(s.kg) * (1 + num(s.reps) / 30)));
        return [{ date: w.date, label: formatShort(w.date), maxKg, volume: Math.round(volume), e1rm: round1(e1rm), sets: ex.sets }];
      });
  }, [data.workouts, name]);

  if (!names.length) return <div className="empty">İlerleme görmek için önce antrenman kaydet.</div>;

  const best = points.reduce((m, p) => (p.maxKg > m ? p.maxKg : m), 0);
  const first = points[0];
  const last = points.at(-1);

  return (
    <div className="stack">
      <div className="card">
        <div className="card-header">
          <h2>Hareket İlerlemesi</h2>
          <select value={name} onChange={(e) => setSelected(e.target.value)}>
            {names.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div className="grid grid-4" style={{ marginBottom: 16 }}>
          <div className="stat"><div className="stat-label">Seans</div><div className="stat-value">{points.length}</div></div>
          <div className="stat"><div className="stat-label">En yüksek kg</div><div className="stat-value accent">{best} kg</div></div>
          <div className="stat"><div className="stat-label">Tahmini 1RM (son)</div><div className="stat-value">{last?.e1rm ?? 0} kg</div></div>
          <div className="stat">
            <div className="stat-label">Değişim (max kg)</div>
            <div className="stat-value">{first && last ? `${last.maxKg - first.maxKg >= 0 ? '+' : ''}${round1(last.maxKg - first.maxKg)} kg` : '-'}</div>
          </div>
        </div>
        <div className="chart-box">
          <ResponsiveContainer>
            <LineChart data={points}>
              <CartesianGrid stroke="#2a3245" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#8b94a8" fontSize={12} />
              <YAxis yAxisId="kg" stroke="#8b94a8" fontSize={12} />
              <YAxis yAxisId="vol" orientation="right" stroke="#8b94a8" fontSize={12} />
              <Tooltip contentStyle={{ background: '#181e2b', border: '1px solid #2a3245', borderRadius: 8 }} />
              <Legend />
              <Line yAxisId="kg" type="monotone" dataKey="maxKg" name="Max kg" stroke="#4ade80" strokeWidth={2} dot />
              <Line yAxisId="kg" type="monotone" dataKey="e1rm" name="Tahmini 1RM" stroke="#60a5fa" strokeWidth={2} dot={false} strokeDasharray="5 4" />
              <Line yAxisId="vol" type="monotone" dataKey="volume" name="Hacim (kg×tekrar)" stroke="#fb923c" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Seans Detayları</h3>
        <table>
          <thead><tr><th>Tarih</th><th>Setler</th><th>Max</th><th>Hacim</th></tr></thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.date + p.volume}>
                <td>{formatDate(p.date)}</td>
                <td>{p.sets.map((s, i) => <span className="chip" key={i}>{s.kg}kg × {s.reps}</span>)}</td>
                <td>{p.maxKg} kg</td>
                <td>{p.volume.toLocaleString('tr-TR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
