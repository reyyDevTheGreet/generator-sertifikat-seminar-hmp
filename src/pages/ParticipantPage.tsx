import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { CONFIG, normalizeDesignId, normalizeJenis } from '../config';
import { Participant, SignerInfo } from '../types';
import { CertificateCanvas } from '../components/CertificateCanvas';

export const ParticipantPage: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form search states
  const [selectedSeminar, setSelectedSeminar] = useState<string>('');
  const [inputNim, setInputNim] = useState<string>('');
  const [inputEmail, setInputEmail] = useState<string>('');

  // Results
  const [matchedResults, setMatchedResults] = useState<Participant[]>([]);
  const [activeParticipantIndex, setActiveParticipantIndex] = useState<number>(0);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Zoom scale
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  const certRef = useRef<HTMLDivElement>(null);

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

  // Load CSV data on mount
  useEffect(() => {
    loadCsvData();
  }, []);

  const loadCsvData = () => {
    setIsLoading(true);
    setLoadError(null);

    const targetUrl = CONFIG.csvUrl.trim() || CONFIG.fallbackCsvUrl;

    Papa.parse<Record<string, string>>(targetUrl, {
      download: true,
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        setIsLoading(false);
        if (!results.data || results.data.length === 0) {
          setLoadError('Data CSV kosong.');
          return;
        }

        const normalized: Participant[] = [];
        results.data.forEach((row) => {
          const item = normalizeRow(row);
          if (item.nama && item.nim && item.seminar) {
            normalized.push(item);
          }
        });

        if (normalized.length === 0) {
          setLoadError('Kolom wajib (nama, nim, seminar) tidak ditemukan dalam CSV.');
          return;
        }

        setParticipants(normalized);
      },
      error: (err) => {
        setIsLoading(false);
        // Fallback to local demo data if primary failed
        if (CONFIG.csvUrl && CONFIG.fallbackCsvUrl && targetUrl !== CONFIG.fallbackCsvUrl) {
          Papa.parse<Record<string, string>>(CONFIG.fallbackCsvUrl, {
            download: true,
            header: true,
            skipEmptyLines: 'greedy',
            complete: (res) => {
              const normalized: Participant[] = [];
              res.data.forEach((r) => {
                const item = normalizeRow(r);
                if (item.nama && item.nim && item.seminar) normalized.push(item);
              });
              setParticipants(normalized);
            },
            error: () => {
              setLoadError('Gagal memuat data CSV Google Sheets maupun data demo.');
            },
          });
        } else {
          setLoadError('Gagal memuat file CSV: ' + (err.message || 'Koneksi terputus.'));
        }
      },
    });
  };

  const normalizeRow = (row: Record<string, string>): Participant => {
    const res: Participant = {
      nama: '',
      nim: '',
      email: '',
      jenis: 'peserta',
      desain: 'klasik',
      seminar: '',
      tanggal: '',
      nomor_sertifikat: '',
      metode: 'cetak',
    };

    for (const [k, v] of Object.entries(row)) {
      if (!k || v === undefined) continue;
      const key = k.trim().toLowerCase().replace(/[\s_-]+/g, '');
      const val = String(v).trim();

      if (key === 'nama' || key === 'namalengkap' || key === 'namapeserta') res.nama = val;
      else if (key === 'nim' || key === 'nomorindukmahasiswa' || key === 'nomhs') res.nim = val;
      else if (key === 'email' || key === 'surel' || key === 'alamatemail') res.email = val;
      else if (key === 'jenis' || key === 'peran' || key === 'role') res.jenis = normalizeJenis(val);
      else if (key === 'desain' || key === 'tema' || key === 'design') res.desain = normalizeDesignId(val);
      else if (key === 'seminar' || key === 'namaseminar' || key === 'judulseminar') res.seminar = val;
      else if (key === 'tanggal' || key === 'tgl' || key === 'date') res.tanggal = val;
      else if (key === 'nomorsertifikat' || key === 'nosertifikat' || key === 'nosertif') res.nomor_sertifikat = val;
      else if (key === 'metode') res.metode = val.toLowerCase();
    }
    return res;
  };

  // Unique seminars for dropdown
  const uniqueSeminars = useMemo(() => {
    return Array.from(new Set(participants.map((p) => p.seminar))).filter(Boolean);
  }, [participants]);

  // Set default seminar if only 1 exists
  useEffect(() => {
    if (uniqueSeminars.length === 1 && !selectedSeminar) {
      setSelectedSeminar(uniqueSeminars[0]);
    }
  }, [uniqueSeminars, selectedSeminar]);

  // Handle Search Submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeminar || !inputNim.trim() || !inputEmail.trim()) {
      alert('Silakan lengkapi pilihan seminar, NIM, dan email terdaftar.');
      return;
    }

    const cleanNim = inputNim.trim();
    const cleanEmail = inputEmail.trim().toLowerCase();

    // Exact match verification on seminar, nim, and email
    const matches = participants.filter((p) => {
      const pSem = (p.seminar || '').trim();
      const pNim = (p.nim || '').toString().trim();
      const pEmail = (p.email || '').toString().trim().toLowerCase();
      return pSem === selectedSeminar && pNim === cleanNim && pEmail === cleanEmail;
    });

    setMatchedResults(matches);
    setActiveParticipantIndex(0);
    setHasSearched(true);
  };

  const currentParticipant = matchedResults[activeParticipantIndex] || null;

  // Single PDF Download via html2canvas + jsPDF
  const handleDownloadPdf = async () => {
    if (!currentParticipant || !certRef.current) return;
    setIsDownloadingPdf(true);

    try {
      const canvasEl = certRef.current;
      const prevTransform = canvasEl.style.transform;
      canvasEl.style.transform = 'none';

      const canvas = await html2canvas(canvasEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });

      canvasEl.style.transform = prevTransform;

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);

      const cleanName = (currentParticipant.nama || 'Peserta').replace(/[^a-zA-Z0-9]/g, '_');
      const cleanRole = (currentParticipant.jenis || 'Sertifikat').toUpperCase();
      const cleanNim = (currentParticipant.nim || 'NIM').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Sertifikat_${cleanRole}_${cleanName}_${cleanNim}.pdf`);
    } catch (err) {
      console.error('Gagal membuat PDF:', err);
      alert('Gagal mendownload PDF otomatis. Silakan gunakan tombol "Cetak (A4)" lalu pilih "Save as PDF".');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header Publik */}
      <header className="bg-white border-b border-slate-200 py-4 shadow-xs mb-8 no-print">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-900 to-blue-700 text-white flex items-center justify-center shadow-md">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
                <path d="M18 18h.01" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                {CONFIG.organizationName}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {CONFIG.divisionName} • Portal Sertifikat Mandiri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading ? 'Memuat database...' : `Database Siap (${participants.length} data)`}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4">
        {/* Form Pencarian & Verifikasi */}
        <section className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-md mb-8 relative overflow-hidden no-print">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-900 via-amber-500 to-blue-700" />

          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Cari & Unduh Sertifikat</h2>
            <p className="text-sm text-slate-600">
              Pilih seminar yang Anda ikuti, lalu masukkan NIM dan email yang terdaftar saat presensi seminar.
            </p>
          </div>

          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
            {/* Seminar */}
            <div className="flex flex-col gap-1.5 md:col-span-1 lg:col-span-1.5">
              <label htmlFor="seminar-select" className="text-xs font-semibold text-slate-700">
                Pilih Seminar <span className="text-red-500">*</span>
              </label>
              <select
                id="seminar-select"
                value={selectedSeminar}
                onChange={(e) => setSelectedSeminar(e.target.value)}
                disabled={isLoading || uniqueSeminars.length === 0}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
              >
                <option value="">-- Pilih Seminar yang Diikuti --</option>
                {uniqueSeminars.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* NIM */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nim-input" className="text-xs font-semibold text-slate-700">
                NIM Mahasiswa <span className="text-red-500">*</span>
              </label>
              <input
                id="nim-input"
                type="text"
                placeholder="Contoh: 2101001"
                value={inputNim}
                onChange={(e) => setInputNim(e.target.value)}
                required
                autoComplete="off"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email-input" className="text-xs font-semibold text-slate-700">
                Email Terdaftar <span className="text-red-500">*</span>
              </label>
              <input
                id="email-input"
                type="email"
                placeholder="nama@example.com"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-900 text-white font-semibold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Cari Sertifikat</span>
              </button>
            </div>
          </form>

          {loadError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
              <span>{loadError}</span>
              <button onClick={loadCsvData} className="underline font-semibold cursor-pointer">
                Coba Muat Ulang
              </button>
            </div>
          )}
        </section>

        {/* Not Found State */}
        {hasSearched && matchedResults.length === 0 && (
          <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center mb-8 no-print">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Data Tidak Ditemukan</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-4">
              Data tidak ditemukan. Cek kembali NIM dan email, atau hubungi panitia dengan pesan otomatis di bawah.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => document.getElementById('nim-input')?.focus()}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Periksa Input
              </button>
              {CONFIG.contactWhatsapp && (
                <a
                  href={`https://wa.me/${CONFIG.contactWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Halo Panitia Divisi Akademik HMP,\n\nSaya mencoba mencari sertifikat seminar tapi data tidak ditemukan.\n\nDetail:\n- Seminar: ${selectedSeminar || 'Belum dipilih'}\n- NIM: ${inputNim || 'Belum diisi'}\n- Email: ${inputEmail || 'Belum diisi'}\n\nMohon bantuannya untuk cek kembali data saya. Terima kasih banyak!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  Hubungi Panitia via WhatsApp
                </a>
              )}
            </div>
          </section>
        )}

        {/* Found State: Certificate Preview */}
        {currentParticipant && (
          <section className="mb-12 cert-print-wrapper">
            {/* Toolbar Aksi */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-xs flex items-center justify-between flex-wrap gap-3 no-print">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Terverifikasi: {currentParticipant.nama}
                </span>

                {/* Multi-role switcher if multiple roles exist in same seminar */}
                {matchedResults.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-600">Pilih Peran:</span>
                    {matchedResults.map((m, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveParticipantIndex(idx)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                          activeParticipantIndex === idx
                            ? 'bg-blue-900 text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {m.jenis.toUpperCase()} ({m.desain})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Zoom controls (50%, 60%, 80%, 100%, 150%) */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold px-1">Zoom:</span>
                  {[0.5, 0.6, 0.8, 1.0, 1.5].map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => setZoomScale(scale)}
                      className={`px-2 py-1 text-xs font-semibold rounded cursor-pointer transition-all ${
                        zoomScale === scale ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-700 hover:bg-white'
                      }`}
                    >
                      {Math.round(scale * 100)}%
                    </button>
                  ))}
                </div>

                {/* Download PDF button (html2canvas + jsPDF) */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>{isDownloadingPdf ? 'Menyiapkan PDF...' : 'Download PDF'}</span>
                </button>

                {/* Print button (window.print) */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition-all cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect width="12" height="8" x="6" y="14" />
                  </svg>
                  <span>Cetak (A4)</span>
                </button>
              </div>
            </div>

            {/* Viewport Sertifikat Berpusat */}
            <div className="w-full p-6 md:p-10 bg-slate-800 rounded-2xl shadow-xl">
              <div className="cert-screen-container w-full overflow-auto flex justify-center items-center min-h-[500px]">
                <div
                  className="cert-scale-box"
                  style={{
                    width: `${980 * zoomScale}px`,
                    height: `${693 * zoomScale}px`,
                    position: 'relative',
                    flexShrink: 0,
                    margin: '0 auto',
                    transition: 'width 0.2s ease, height 0.2s ease',
                  }}
                >
                  <CertificateCanvas
                    ref={certRef}
                    data={currentParticipant}
                    signatoriesOverride={signatories}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      transform: `scale(${zoomScale})`,
                      transformOrigin: 'top left',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Petunjuk Penggunaan bagi Peserta */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 no-print">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 font-bold flex items-center justify-center mb-2 text-sm">
              1
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Pilih Seminar</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pilih seminar dari basis data kegiatan akademik HMP yang telah selesai diaudit oleh panitia.
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 font-bold flex items-center justify-center mb-2 text-sm">
              2
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Verifikasi Ganda</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ketik NIM dan email yang Anda gunakan saat mengisi form presensi untuk memvalidasi kepemilikan sertifikat.
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 font-bold flex items-center justify-center mb-2 text-sm">
              3
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Unduh PDF A4</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sertifikat siap diunduh dalam format PDF standar A4 Landscape sesuai tema resmi pilihan panitia.
            </p>
          </div>
        </section>
      </main>

      {/* Footer Publik */}
      <footer className="mt-12 text-center text-xs text-slate-500 border-t border-slate-200 pt-6 no-print">
        <p className="mb-3">© 2026 {CONFIG.organizationName} - {CONFIG.divisionName}.</p>
        {CONFIG.contactWhatsapp && (
          <a
            href={`https://wa.me/${CONFIG.contactWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
              `Halo Panitia Divisi Akademik HMP,\n\nSaya ingin bertanya terkait sertifikat seminar.\n\nMohon bantuannya. Terima kasih banyak!`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Hubungi Panitia via WhatsApp
          </a>
        )}
      </footer>
    </div>
  );
};
