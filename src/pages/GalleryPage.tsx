import React, { useState, useEffect } from 'react';
import { CONFIG } from '../config';
import { RoleType, SuasanaType, SignerInfo } from '../types';
import { CertificateCanvas } from '../components/CertificateCanvas';

const DUMMY_DATA = {
  nama: 'Muhammad Abdurrahman Al-Fatih',
  seminar: 'Seminar Contoh Divisi Akademik',
  tanggal: '12 November 2026',
  nomor_sertifikat: '001/PST/SEM-AKD/XI/2026',
  nim: '2101005',
};

export const GalleryPage: React.FC = () => {
  const [activeJenis, setActiveJenis] = useState<RoleType>('peserta');
  const [activeFilter, setActiveFilter] = useState<string>('semua');
  const [modalDesignId, setModalDesignId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load signatories dari localStorage (disimpan dari PanitiaPage)
  const [signatories, setSignatories] = useState<SignerInfo[]>(() => {
    const saved = localStorage.getItem('hmp_signatories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return CONFIG.signatories;
      }
    }
    return CONFIG.signatories;
  });

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalDesignId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const copyToClipboard = (id: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(id)
        .then(() => showToast(`Tersalin: ${id}`))
        .catch(() => fallbackCopy(id));
    } else {
      fallbackCopy(id);
    }
  };

  const fallbackCopy = (text: string) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      showToast(`Tersalin: ${text}`);
    } catch {
      alert(`ID Desain: ${text}`);
    }
    document.body.removeChild(el);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const filteredDesigns = CONFIG.designs.filter((d) => {
    if (activeFilter === 'semua') return true;
    return d.suasana.includes(activeFilter as SuasanaType);
  });

  return (
    <div className="min-h-screen pb-16">
      {/* Header Galeri */}
      <header className="bg-white border-b border-slate-200 py-4 shadow-xs mb-8">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-800 to-teal-600 text-white flex items-center justify-center shadow-md">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Katalog 15 Desain Sertifikat
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Halaman Panitia • Pilih Desain untuk Seminar Anda
              </p>
            </div>
          </div>

          <a
            href="/"
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            ← Kembali ke Halaman Peserta
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4">
        {/* Panduan 3 Langkah */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-8">
          <h2 className="text-base font-bold text-slate-900 mb-3">Panduan Memilih Desain Seminar</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border-l-4 border-blue-900">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block mb-1">
                Langkah 1
              </span>
              <p className="text-xs text-slate-700 font-medium">
                Pilih salah satu dari 15 desain di bawah yang cocok dengan tema seminar Anda.
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border-l-4 border-blue-900">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block mb-1">
                Langkah 2
              </span>
              <p className="text-xs text-slate-700 font-medium">
                Klik tombol <strong>"Salin ID Desain"</strong> (misalnya: <code className="bg-white px-1 py-0.5 rounded border border-slate-200">modern</code> atau <code className="bg-white px-1 py-0.5 rounded border border-slate-200">elegan-emas</code>).
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border-l-4 border-blue-900">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block mb-1">
                Langkah 3
              </span>
              <p className="text-xs text-slate-700 font-medium">
                Tempelkan ID tersebut pada kolom <code className="bg-white px-1 py-0.5 rounded border border-slate-200">desain</code> di Google Sheets tab <strong>Final</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-xs mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Jenis Peran */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-800 mr-1">Jenis Sertifikat:</span>
            {(['peserta', 'panitia', 'pemateri'] as RoleType[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setActiveJenis(r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeJenis === r
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          {/* Filter Suasana */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-800 mr-1">Suasana:</span>
            {['semua', 'formal', 'santai', 'terang', 'gelap'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeFilter === f
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'semua' && ` (${CONFIG.designs.length})`}
              </button>
            ))}
          </div>
        </section>

        {/* Grid 15 Desain */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDesigns.map((design) => (
            <div
              key={design.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col"
            >
              {/* Mini Preview Box */}
              <div
                onClick={() => setModalDesignId(design.id)}
                className="w-full relative aspect-[980/693] bg-slate-900 overflow-hidden cursor-pointer group"
                title="Klik untuk memperbesar"
              >
                <div className="absolute top-0 left-0 w-[980px] h-[693px] origin-top-left pointer-events-none scale-[0.38] sm:scale-[0.34] lg:scale-[0.37]">
                  <CertificateCanvas
                    data={{
                      ...DUMMY_DATA,
                      desain: design.id,
                      jenis: activeJenis,
                    }}
                    signatoriesOverride={signatories}
                  />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="px-3 py-1.5 rounded-lg bg-black/75 text-white text-xs font-bold shadow-md">
                    Lihat Besar
                  </span>
                </div>
              </div>

              {/* Info Card */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h3 className="text-base font-bold text-slate-900">{design.nama}</h3>
                    <code className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-900 text-xs font-mono font-bold">
                      {design.id}
                    </code>
                  </div>

                  <div className="flex gap-1.5 mb-2.5 flex-wrap">
                    {design.suasana.map((s) => (
                      <span
                        key={s}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                          s === 'formal'
                            ? 'bg-blue-50 text-blue-800'
                            : s === 'santai'
                            ? 'bg-pink-50 text-pink-800'
                            : s === 'terang'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-slate-800 text-white'
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{design.ciri}</p>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(design.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                    <span>Salin ID Desain</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalDesignId(design.id)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                    title="Lihat ukuran besar"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal Preview Besar */}
      {modalDesignId && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setModalDesignId(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Desain:{' '}
                  {CONFIG.designs.find((d) => d.id === modalDesignId)?.nama || modalDesignId}
                </h3>
                <span className="font-mono text-xs text-slate-500">
                  ID: {modalDesignId} (Salin ke kolom 'desain' di Sheets)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalDesignId(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer p-1"
                aria-label="Tutup"
              >
                &times;
              </button>
            </div>

            <div className="p-4 overflow-auto flex-1 bg-slate-900 flex justify-center items-center">
              <div className="w-[980px] h-[693px] origin-center scale-[0.34] sm:scale-[0.55] md:scale-[0.75] lg:scale-[0.88] my-[-180px] sm:my-[-120px] md:my-[-60px] lg:my-[-30px]">
                <CertificateCanvas
                  data={{
                    ...DUMMY_DATA,
                    desain: modalDesignId,
                    jenis: activeJenis,
                  }}
                  signatoriesOverride={signatories}
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-slate-500 m-0">
                Pilihan peran aktif: <strong className="uppercase">{activeJenis}</strong>
              </p>
              <button
                type="button"
                onClick={() => copyToClipboard(modalDesignId)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                <span>Salin ID Desain ({modalDesignId})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 z-50 animate-bounce">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer dengan tombol hubungi panitia */}
      <footer className="mt-12 text-center text-xs text-slate-500 border-t border-slate-200 pt-6">
        <p className="mb-3">© 2026 {CONFIG.organizationName} - {CONFIG.divisionName}.</p>
        {CONFIG.contactWhatsapp && (
          <a
            href={`https://wa.me/${CONFIG.contactWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
              `Halo Panitia Divisi Akademik HMP,\n\nSaya ingin bertanya terkait desain sertifikat.\n\nMohon bantuannya. Terima kasih banyak!`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Hubungi Panitia via WhatsApp
          </a>
        )}
      </footer>
    </div>
  );
};
