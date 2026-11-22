import { useRef } from 'react';
import { useStore, defaultData } from '../store';
import { today } from '../utils';

export default function Settings() {
  const { data, replaceAll } = useStore();
  const fileRef = useRef(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fittakip-yedek-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (typeof parsed !== 'object' || !parsed.program) throw new Error('Geçersiz dosya');
        if (confirm('Mevcut tüm verilerin yedekteki verilerle değiştirilecek. Devam edilsin mi?')) {
          replaceAll(parsed);
          alert('Veriler içe aktarıldı.');
        }
      } catch (err) {
        alert('Dosya okunamadı: ' + err.message);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const reset = () => {
    if (confirm('TÜM veriler silinecek (antrenmanlar, kilolar, programlar). Emin misin?') && confirm('Bu işlem geri alınamaz. Son kez onaylıyor musun?')) {
      replaceAll(defaultData());
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Ayarlar</h1>
          <p>Verilerin bu tarayıcıda saklanır. Düzenli yedek almanı öneririm.</p>
        </div>
      </div>
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="stat"><div className="stat-label">Antrenman kaydı</div><div className="stat-value">{data.workouts.length}</div></div>
        <div className="stat"><div className="stat-label">Kilo kaydı</div><div className="stat-value">{data.weights.length}</div></div>
        <div className="stat"><div className="stat-label">Günlük beslenme kaydı</div><div className="stat-value">{Object.keys(data.dailyLogs).length}</div></div>
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 6 }}>Yedekleme</h2>
        <p className="small muted">Tüm verilerini JSON dosyası olarak indir veya daha önce aldığın bir yedeği geri yükle.</p>
        <div className="row">
          <button className="btn btn-primary" onClick={exportData}>⬇️ Dışa aktar (JSON)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>⬆️ İçe aktar</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importData} />
        </div>
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 6 }}>Tehlikeli Bölge</h2>
        <p className="small muted">Tüm verileri kalıcı olarak siler.</p>
        <button className="btn btn-danger" onClick={reset}>🗑 Tüm verileri sıfırla</button>
      </div>
    </div>
  );
}
