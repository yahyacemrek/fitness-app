import { useRef, useState, useEffect } from 'react';
import { useStore, defaultData } from '../store';
import { today } from '../utils';

export default function Settings() {
  const { data, replaceAll } = useStore();
  const fileRef = useRef(null);

  const [isPersisted, setIsPersisted] = useState(null);
  const [storageEstimate, setStorageEstimate] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  // Depolama durumunu ve kotayı kontrol et
  const checkStorage = async () => {
    if (!navigator.storage || !navigator.storage.persist) {
      setIsSupported(false);
      return;
    }
    try {
      const persisted = await navigator.storage.persisted();
      setIsPersisted(persisted);

      if (navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        setStorageEstimate(est);
      }
    } catch (err) {
      console.error('Depolama kontrolü hatası:', err);
    }
  };

  useEffect(() => {
    checkStorage();
  }, []);

  const requestPersistence = async () => {
    if (!navigator.storage || !navigator.storage.persist) {
      alert('Tarayıcınız Storage API kalıcı depolama özelliğini desteklemiyor.');
      return;
    }
    try {
      const granted = await navigator.storage.persist();
      setIsPersisted(granted);
      await checkStorage();

      if (granted) {
        alert('Harika! Tarayıcınız FitTakip verilerini kalıcı depolama listesine aldı. Disk dolsa bile verileriniz otomatik silinmeyecek.');
      } else {
        alert(
          'Tarayıcı henüz kalıcı depolama iznini onaylamadı.\n\nChrome/Edge: Siteyi telefonunuzun veya bilgisayarınızın "Ana Ekranına Ekle" (veya Yer İmlerine Ekle) yaptığınızda ve düzenli kullandığınızda izin otomatik olarak verilir.'
        );
      }
    } catch (err) {
      alert('İzin istenirken hata oluştu: ' + err.message);
    }
  };

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

      {/* Kalıcı Depolama Kartı */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2>🛡️ Kalıcı Depolama Güvenliği</h2>
            <p className="small muted">Tarayıcının disk temizliği sırasında verilerini otomatik silmesini engelle.</p>
          </div>
          {isSupported && (
            isPersisted ? (
              <span className="chip green" style={{ fontSize: '0.85rem', padding: '5px 12px' }}>
                ✓ Kalıcı Mod Aktif (Korunuyor)
              </span>
            ) : (
              <span className="chip" style={{ color: 'var(--yellow)', borderColor: 'rgba(250, 204, 21, 0.4)', background: 'rgba(250, 204, 21, 0.1)', fontSize: '0.85rem', padding: '5px 12px' }}>
                ⚠️ Standart Mod (Geçici)
              </span>
            )
          )}
        </div>

        <div className="stack" style={{ marginTop: 12 }}>
          {isSupported ? (
            <>
              <div className="row">
                {!isPersisted ? (
                  <button className="btn btn-primary" onClick={requestPersistence}>
                    🛡️ Kalıcı Depolama İzni İste
                  </button>
                ) : (
                  <div className="small accent">
                    Harika! Tarayıcınız FitTakip'i korumalı olarak işaretledi. Verileriniz disk temizliklerinde silinmez.
                  </div>
                )}
                <button className="btn btn-sm" onClick={checkStorage}>Yenile</button>
              </div>

              {storageEstimate && (
                <div className="small muted">
                  Tarayıcı depolama alanı kullanımı: <b>{(storageEstimate.usage / 1024 / 1024).toFixed(2)} MB</b> / Toplam ayrılan kota: <b>{(storageEstimate.quota / 1024 / 1024).toFixed(0)} MB</b>
                </div>
              )}

              <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
                💡 <b>İpucu:</b> Chrome ve Edge gibi modern tarayıcılarda siteyi sık kullandığınızda veya telefonda/bilgisayarda <b>"Ana Ekrana Ekle" (Uygulama Olarak Yükle)</b> yaptığınızda tarayıcı bu koruma iznini otomatik olarak verir.
              </p>
            </>
          ) : (
            <p className="small muted">Kullandığınız tarayıcı Storage API kalıcı depolama özelliğini desteklemiyor.</p>
          )}
        </div>
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
