import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { uid, today, dayKeyOf, dayLabel, num, formatDate } from '../utils';

const emptySet = (kg = '', reps = '') => ({ kg, reps });

/** Bir hareketin son kaydedilmiş setlerini bulur (kg önerisi için) */
const lastSetsFor = (workouts, name, beforeDate) => {
  const key = name.trim().toLowerCase();
  const sorted = [...workouts].filter((w) => w.date <= beforeDate).sort((a, b) => b.date.localeCompare(a.date));
  for (const w of sorted) {
    const ex = w.exercises.find((e) => e.name.trim().toLowerCase() === key);
    if (ex && ex.sets.length) return { date: w.date, sets: ex.sets };
  }
  return null;
};

export default function WorkoutEditor({ initial, onSaved, onCancel }) {
  const { data, update } = useStore();
  const [date, setDate] = useState(initial?.date ?? today());
  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [exercises, setExercises] = useState(
    initial?.exercises ? structuredClone(initial.exercises) : []
  );

  const dayKey = dayKeyOf(date);
  const planDay = data.program[dayKey];

  const knownNames = useMemo(() => {
    const s = new Set();
    Object.values(data.program).forEach((d) => d.exercises.forEach((e) => e.name && s.add(e.name)));
    data.workouts.forEach((w) => w.exercises.forEach((e) => e.name && s.add(e.name)));
    return [...s].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [data]);

  const loadFromProgram = () => {
    if (!planDay.exercises.length) return;
    if (exercises.length && !confirm('Mevcut hareketler programla değiştirilsin mi?')) return;
    setTitle(planDay.name || title);
    setExercises(
      planDay.exercises.map((pe) => {
        const last = lastSetsFor(data.workouts, pe.name, date);
        const count = Math.max(1, num(pe.sets) || 3);
        return {
          id: uid(),
          name: pe.name,
          sets: Array.from({ length: count }, (_, i) =>
            emptySet(last?.sets[i]?.kg ?? last?.sets.at(-1)?.kg ?? '', pe.reps ?? '')
          ),
        };
      })
    );
  };

  const setEx = (id, fn) => setExercises((xs) => xs.map((e) => (e.id === id ? fn(e) : e)));
  const addExercise = () => setExercises((xs) => [...xs, { id: uid(), name: '', sets: [emptySet()] }]);
  const removeExercise = (id) => setExercises((xs) => xs.filter((e) => e.id !== id));
  const moveExercise = (idx, dir) =>
    setExercises((xs) => {
      const j = idx + dir;
      if (j < 0 || j >= xs.length) return xs;
      const copy = [...xs];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });

  const addSet = (id) =>
    setEx(id, (e) => {
      const last = e.sets.at(-1);
      return { ...e, sets: [...e.sets, emptySet(last?.kg ?? '', last?.reps ?? '')] };
    });
  const updateSet = (id, i, field, value) =>
    setEx(id, (e) => ({ ...e, sets: e.sets.map((s, k) => (k === i ? { ...s, [field]: value } : s)) }));
  const removeSet = (id, i) => setEx(id, (e) => ({ ...e, sets: e.sets.filter((_, k) => k !== i) }));

  const save = () => {
    const cleaned = exercises
      .filter((e) => e.name.trim())
      .map((e) => ({ ...e, name: e.name.trim(), sets: e.sets.filter((s) => s.kg !== '' || s.reps !== '') }));
    if (!cleaned.length) {
      alert('En az bir hareket ekle.');
      return;
    }
    const workout = { id: initial?.id ?? uid(), date, title: title.trim(), note: note.trim(), exercises: cleaned };
    update((d) => ({
      workouts: initial?.id ? d.workouts.map((w) => (w.id === initial.id ? workout : w)) : [...d.workouts, workout],
    }));
    onSaved?.(workout);
  };

  return (
    <div className="stack">
      <div className="card">
        <div className="grid grid-3">
          <label className="field">
            Tarih
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            Antrenman adı
            <input placeholder="ör. Push / Göğüs-Omuz" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="field" style={{ justifyContent: 'flex-end', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="small muted">
              {dayLabel(dayKey)} programı: {planDay.exercises.length ? `${planDay.name || 'İsimsiz'} (${planDay.exercises.length} hareket)` : 'yok'}
            </span>
            <button className="btn" onClick={loadFromProgram} disabled={!planDay.exercises.length}>
              📋 Programdan yükle
            </button>
          </div>
        </div>
      </div>

      <datalist id="exercise-names">
        {knownNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {exercises.length === 0 && (
        <div className="empty">Henüz hareket yok. "Programdan yükle" ile başla ya da hareket ekle.</div>
      )}

      {exercises.map((ex, idx) => {
        const last = ex.name ? lastSetsFor(data.workouts.filter((w) => w.id !== initial?.id), ex.name, date) : null;
        return (
          <div className="exercise-card" key={ex.id}>
            <div className="exercise-head">
              <input
                list="exercise-names"
                placeholder="Hareket adı (ör. Bench Press)"
                value={ex.name}
                onChange={(e) => setEx(ex.id, (x) => ({ ...x, name: e.target.value }))}
              />
              <button className="btn btn-ghost btn-sm" onClick={() => moveExercise(idx, -1)} title="Yukarı">▲</button>
              <button className="btn btn-ghost btn-sm" onClick={() => moveExercise(idx, 1)} title="Aşağı">▼</button>
              <button className="icon-btn" onClick={() => removeExercise(ex.id)} title="Hareketi sil">🗑</button>
            </div>
            {last && (
              <div className="small muted" style={{ marginBottom: 8 }}>
                Son ({formatDate(last.date, { day: 'numeric', month: 'short' })}):{' '}
                {last.sets.map((s) => `${s.kg}kg×${s.reps}`).join(', ')}
              </div>
            )}
            <div className="set-row set-head">
              <span style={{ textAlign: 'center' }}>Set</span>
              <span>Kg</span>
              <span>Tekrar</span>
              <span />
            </div>
            {ex.sets.map((s, i) => (
              <div className="set-row" key={i}>
                <span className="set-num">{i + 1}</span>
                <input type="number" inputMode="decimal" step="0.5" min="0" placeholder="kg" value={s.kg} onChange={(e) => updateSet(ex.id, i, 'kg', e.target.value)} />
                <input type="number" inputMode="numeric" min="0" placeholder="tekrar" value={s.reps} onChange={(e) => updateSet(ex.id, i, 'reps', e.target.value)} />
                <button className="icon-btn" onClick={() => removeSet(ex.id, i)} title="Seti sil">✕</button>
              </div>
            ))}
            <button className="btn btn-sm" onClick={() => addSet(ex.id)} style={{ marginTop: 4 }}>+ Set ekle</button>
          </div>
        );
      })}

      <div className="row">
        <button className="btn" onClick={addExercise}>+ Hareket ekle</button>
      </div>

      <div className="card">
        <label className="field">
          Not
          <textarea placeholder="Nasıl geçti? Enerji, ağrı, vs." value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>

      <div className="row">
        <div className="spacer" />
        {onCancel && <button className="btn" onClick={onCancel}>İptal</button>}
        <button className="btn btn-primary" onClick={save}>💾 Antrenmanı kaydet</button>
      </div>
    </div>
  );
}
