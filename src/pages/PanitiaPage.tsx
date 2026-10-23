import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { CONFIG, normalizeDesignId, normalizeJenis } from '../config';
import { Participant, RoleType, SignerInfo } from '../types';
import { CertificateCanvas } from '../components/CertificateCanvas';
import { PrintPortal } from '../components/PrintPortal';

export const PanitiaPage: React.FC = () => {
  // Inject meta robots noindex,nofollow
  useEffect(() => {
    let metaTag = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    let created = false;
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'robots';
      document.head.appendChild(metaTag);
      created = true;
    }
    metaTag.content = 'noindex,nofollow';

    return () => {
      if (created && metaTag) {
        document.head.removeChild(metaTag);
      } else if (metaTag) {
        metaTag.content = 'index,follow';
      }
    };
  }, []);

  // Auth State
  const [session, setSession] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Login Form States
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [resetSentNotice, setResetSentNotice] = useState<string | null>(null);

  // Print Tool Data & Filters
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataSourceName, setDataSourceName] = useState<string>('Memeriksa...');

  const [filterSeminar, setFilterSeminar] = useState<string>('');
  const [filterJenis, setFilterJenis] = useState<string>('semua');
  const [filterMetode, setFilterMetode] = useState<string>('cetak'); // Bawaan 'cetak'
  const [searchNimManual, setSearchNimManual] = useState<string>(''); // Pencarian NIM Manual

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'nama' | 'nim' | 'nomor_sertifikat'>('nim');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // -------------------------------------------------------------------------
  // PENGATURAN KUSTOM PENANDATANGAN & TTD DIGITAL OTOMATIS
  // -------------------------------------------------------------------------
  const [signatories, setSignatories] = useState<SignerInfo[]>(() => {
    // Load dari localStorage saat mount
    const saved = localStorage.getItem('hmp_signatories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [
          {
            title: 'Ketua Divisi Akademik',
            name: 'Aditya Pratama, S.Kom.',
            idNumber: 'NIM. 2108561050',
            signatureImage: '',
          },
          {
            title: 'Ketua Umum HMP',
            name: 'Nabila Zahra Khairunnisa',
            idNumber: 'NIM. 2108561012',
            signatureImage: '',
          },
        ];
      }
    }
    return [
      {
        title: 'Ketua Divisi Akademik',
        name: 'Aditya Pratama, S.Kom.',
        idNumber: 'NIM. 2108561050',
        signatureImage: '',
      },
      {
        title: 'Ketua Umum HMP',
        name: 'Nabila Zahra Khairunnisa',
        idNumber: 'NIM. 2108561012',
        signatureImage: '',
      },
    ];
  });
  const [isProcessingSig1, setIsProcessingSig1] = useState<boolean>(false);
  const [isProcessingSig2, setIsProcessingSig2] = useState<boolean>(false);
  const [showSignerSettings, setShowSignerSettings] = useState<boolean>(true);
  const [signatureInkColor, setSignatureInkColor] = useState<'black' | 'blue'>(() => {
    const saved = localStorage.getItem('hmp_signature_ink_color');
    return (saved === 'black' || saved === 'blue') ? saved : 'black';
  });
  const rawSigFile1Ref = useRef<File | null>(null);
  const rawSigFile2Ref = useRef<File | null>(null);

  // Settings
  const [isWetSignature, setIsWetSignature] = useState<boolean>(false);
  const [previewSample, setPreviewSample] = useState<Participant | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // -------------------------------------------------------------------------
  // TTD LANGSUNG DI LAYAR (tanpa backend, hasil masuk ke signatories)
  // -------------------------------------------------------------------------
  const [sigPadOpen, setSigPadOpen] = useState<boolean>(false);
  const [sigPadTarget, setSigPadTarget] = useState<0 | 1>(0);
  const [sigPadHasInk, setSigPadHasInk] = useState<boolean>(false);
  const sigPadCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigPadDrawingRef = useRef<boolean>(false);
  const sigPadLastRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const sigPadWidthRef = useRef<number>(2.5);

  // Modal Tambah Peserta Manual
  const [showAddManualModal, setShowAddManualModal] = useState<boolean>(false);
  const [manualForm, setManualForm] = useState<Participant>({
    nama: '',
    nim: '',
    email: '',
    jenis: 'peserta',
    desain: 'klasik',
    seminar: '',
    tanggal: '12 November 2026',
    nomor_sertifikat: '',
    metode: 'cetak',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef1 = useRef<HTMLInputElement>(null);
  const sigInputRef2 = useRef<HTMLInputElement>(null);

  // Simpan signatories ke localStorage setiap kali berubah
  useEffect(() => {
    localStorage.setItem('hmp_signatories', JSON.stringify(signatories));
  }, [signatories]);

  // Simpan warna tinta ke localStorage
  useEffect(() => {
    localStorage.setItem('hmp_signature_ink_color', signatureInkColor);
  }, [signatureInkColor]);

  // Check Supabase session
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthChecking(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setAuthChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setAuthChecking(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch CSV ONLY after session is authenticated
  useEffect(() => {
    if (session) {
      fetchCsvData();
    }
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setAuthError(null);
    setResetSentNotice(null);
    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.trim(),
      password: passwordInput,
    });

    setAuthLoading(false);

    if (error) {
      setAuthError('Email atau password salah');
    }
  };

  const handleResetPassword = async () => {
    if (!supabase) return;
    if (!emailInput.trim()) {
      alert('Silakan ketik email Anda pada kolom di atas terlebih dahulu.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    try {
      await supabase.auth.resetPasswordForEmail(emailInput.trim());
      setResetSentNotice(`Tautan reset password telah dikirim ke ${emailInput.trim()} (cek folder Spam/Inbox).`);
    } catch {
      setResetSentNotice(`Jika email terdaftar, tautan reset password akan dikirim.`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setParticipants([]);
    setSelectedIndices(new Set());
  };

  // -------------------------------------------------------------------------
  // PROSES SCAN GAMBAR TTD OTOMATIS (MENGHAPUS BACKGROUND KERTAS SECARA ADAPTIF)
  // Mengubah foto kertas apa pun menjadi goresan tinta digital murni & transparan
  // -------------------------------------------------------------------------
  const processAndSetSignature = async (
    file: File,
    signerIndex: number,
    colorOverride?: 'black' | 'blue'
  ) => {
    const colorToUse = colorOverride || signatureInkColor;
    if (signerIndex === 0) rawSigFile1Ref.current = file;
    else rawSigFile2Ref.current = file;

    const setLoader = signerIndex === 0 ? setIsProcessingSig1 : setIsProcessingSig2;
    setLoader(true);

    try {
      const transparentDataUrl = await cleanSignatureBackground(file, colorToUse);
      setSignatories((prev) => {
        const next = [...prev];
        next[signerIndex] = {
          ...next[signerIndex],
          signatureImage: transparentDataUrl,
        };
        return next;
      });
    } catch (err) {
      console.error('Gagal memproses gambar tanda tangan:', err);
      alert('Gagal memproses gambar tanda tangan. Pastikan format gambar berupa JPG, PNG, atau WEBP.');
    } finally {
      setLoader(false);
    }
  };

  const handleChangeInkColor = (newColor: 'black' | 'blue') => {
    setSignatureInkColor(newColor);
    if (rawSigFile1Ref.current) {
      processAndSetSignature(rawSigFile1Ref.current, 0, newColor);
    }
    if (rawSigFile2Ref.current) {
      processAndSetSignature(rawSigFile2Ref.current, 1, newColor);
    }
  };

  const cleanSignatureBackground = (
    file: File,
    inkColor: 'black' | 'blue' = 'black'
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          // 1. Batasi resolusi maksimal agar foto kamera HP 12MP-50MP cepat diproses tanpa lag
          const maxDimension = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const imgData = ctx.getImageData(0, 0, width, height);
          const d = imgData.data;

          // 2. Hitung luminansi grayscale tiap pixel dan temukan nilai terang global
          const totalPixels = width * height;
          const lum = new Float32Array(totalPixels);
          let globalMaxLum = 0;

          for (let i = 0; i < totalPixels; i++) {
            const idx = i * 4;
            // Rumus luminansi persepsi mata manusia
            const l = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
            lum[i] = l;
            if (l > globalMaxLum) globalMaxLum = l;
          }

          // 3. Grid Adaptif 16x16: Mendeteksi warna dasar kertas di setiap sudut foto
          // (Mampu mengatasi bayangan tangan/HP, lampu redup, atau kertas yang tampak abu-abu)
          const gridCols = 16;
          const gridRows = 16;
          const cellW = width / gridCols;
          const cellH = height / gridRows;
          const bgGrid = new Float32Array(gridCols * gridRows);

          for (let gy = 0; gy < gridRows; gy++) {
            for (let gx = 0; gx < gridCols; gx++) {
              const startX = Math.floor(gx * cellW);
              const endX = Math.floor((gx + 1) * cellW);
              const startY = Math.floor(gy * cellH);
              const endY = Math.floor((gy + 1) * cellH);

              let maxCellLum = 0;
              // Sampling titik dalam cell
              for (let y = startY; y < endY; y += 2) {
                for (let x = startX; x < endX; x += 2) {
                  const val = lum[y * width + x];
                  if (val > maxCellLum) maxCellLum = val;
                }
              }
              // Jika cell terisi penuh tinta, fallback ke globalMaxLum
              bgGrid[gy * gridCols + gx] = maxCellLum > 40 ? maxCellLum : globalMaxLum;
            }
          }

          // Target Warna Tinta Digital (Hitam Pekat Elegan #0f172a atau Biru Pulpen Resmi #1d4ed8)
          const targetInkR = inkColor === 'blue' ? 29 : 15;
          const targetInkG = inkColor === 'blue' ? 78 : 23;
          const targetInkB = inkColor === 'blue' ? 216 : 42;

          let minX = width;
          let minY = height;
          let maxX = 0;
          let maxY = 0;
          let hasInk = false;

          // 4. Transformasi: Hapus 100% background kertas dan ubah goresan menjadi tinta hitam murni
          for (let y = 0; y < height; y++) {
            const gy = Math.min(gridRows - 1, Math.floor(y / cellH));
            for (let x = 0; x < width; x++) {
              const gx = Math.min(gridCols - 1, Math.floor(x / cellW));
              const localBg = bgGrid[gy * gridCols + gx];
              const pLum = lum[y * width + x];
              const diff = localBg - pLum; // Perbedaan kecerahan antara kertas dan tinta

              const i = (y * width + x) * 4;

              // Jika perbedaan < 18, ini murni kertas putih/abu-abu -> buang jadi 100% transparan
              if (diff < 18) {
                d[i + 3] = 0;
              } else {
                // Ini goresan pulpen tanda tangan
                hasInk = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;

                // Terapkan warna tinta digital pekat dengan anti-aliasing halus di pinggir garis
                const alphaFactor = Math.min(1, (diff - 18) / 26);
                d[i] = targetInkR;
                d[i + 1] = targetInkG;
                d[i + 2] = targetInkB;
                d[i + 3] = Math.round(alphaFactor * 255);
              }
            }
          }

          ctx.putImageData(imgData, 0, 0);

          // 5. Auto-crop Bounding Box: Pangkas sisa kertas kosong di luar tanda tangan
          if (hasInk && maxX > minX && maxY > minY) {
            const pad = 14;
            const cropX = Math.max(0, minX - pad);
            const cropY = Math.max(0, minY - pad);
            const cropW = Math.min(width - cropX, (maxX - minX) + pad * 2);
            const cropH = Math.min(height - cropY, (maxY - minY) + pad * 2);

            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = cropW;
            croppedCanvas.height = cropH;
            const croppedCtx = croppedCanvas.getContext('2d');
            if (croppedCtx) {
              croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
              resolve(croppedCanvas.toDataURL('image/png'));
              return;
            }
          }

          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = rawUrl;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const resetSignatureToDefault = (signerIndex: number) => {
    setSignatories((prev) => {
      const next = [...prev];
      next[signerIndex] = {
        ...next[signerIndex],
        signatureImage: '',
      };
      return next;
    });
    // Jika kedua tanda tangan sudah kosong, hapus dari localStorage
    const updated = [...signatories];
    updated[signerIndex] = { ...updated[signerIndex], signatureImage: '' };
    if (!updated[0].signatureImage && !updated[1].signatureImage) {
      localStorage.removeItem('hmp_signatories');
    }
  };

  // -------------------------------------------------------------------------
  // KANVAS TTD LANGSUNG: tinta hitam, background transparan, hasil = PNG
  // -------------------------------------------------------------------------
  const sizeSigPadCanvas = () => {
    const canvas = sigPadCanvasRef.current;
    if (!canvas || !sigPadOpen) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
    }
  };

  // Pas modal kebuka -> ukur kanvas (harus setelah elemen ter-mount)
  useEffect(() => {
    if (sigPadOpen) {
      setSigPadHasInk(false);
      const t = setTimeout(sizeSigPadCanvas, 50);
      return () => clearTimeout(t);
    }
  }, [sigPadOpen]);

  const sigPadPos = (e: React.PointerEvent) => {
    const canvas = sigPadCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY, t: performance.now() };
  };

  const sigPadDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    sigPadDrawingRef.current = true;
    sigPadLastRef.current = sigPadPos(e);
    sigPadWidthRef.current = 3.0;
    setSigPadHasInk(true);
  };

  const sigPadMove = (e: React.PointerEvent) => {
    if (!sigPadDrawingRef.current) return;
    e.preventDefault();
    const canvas = sigPadCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    const p1 = sigPadLastRef.current;
    if (!canvas || !ctx || !p1) return;
    const p2 = sigPadPos(e);

    // Tebal garis dinamis: gerakan cepat -> tipis, lambat -> tebal
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const dt = Math.max(p2.t - p1.t, 1);
    const speed = dist / dt;
    const target = Math.min(5.0, Math.max(2.0, 5.0 - speed * 2.0));
    sigPadWidthRef.current = sigPadWidthRef.current * 0.7 + target * 0.3;

    ctx.lineWidth = sigPadWidthRef.current;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    sigPadLastRef.current = p2;
  };

  const sigPadUp = (e: React.PointerEvent) => {
    sigPadDrawingRef.current = false;
    sigPadLastRef.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const sigPadClear = () => {
    const canvas = sigPadCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigPadHasInk(false);
  };

  const sigPadSave = () => {
    const canvas = sigPadCanvasRef.current;
    if (!canvas || !sigPadHasInk) return;

    // Buat canvas baru yang lebih besar untuk sertifikat
    const outputCanvas = document.createElement('canvas');
    const scale = 1.5; // Scale 1.5x untuk sertifikat
    outputCanvas.width = canvas.width * scale;
    outputCanvas.height = canvas.height * scale;
    const outputCtx = outputCanvas.getContext('2d');
    if (outputCtx) {
      outputCtx.imageSmoothingEnabled = true;
      outputCtx.imageSmoothingQuality = 'high';
      outputCtx.drawImage(canvas, 0, 0, outputCanvas.width, outputCanvas.height);
    }

    const dataUrl = outputCanvas.toDataURL('image/png'); // transparan, tinta hitam, lebih besar
    setSignatories((prev) => {
      const next = [...prev];
      next[sigPadTarget] = { ...next[sigPadTarget], signatureImage: dataUrl };
      return next;
    });
    sigPadClear();
    setSigPadOpen(false);
  };


  // -------------------------------------------------------------------------
  // CSV FETCHING & DATA PROCESSING
  // -------------------------------------------------------------------------
  const fetchCsvData = (file?: File) => {
    setDataLoading(true);

    if (file) {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          processCsvResults(results.data, `File Lokal: ${file.name}`);
        },
        error: () => {
          setDataLoading(false);
          alert('Gagal membaca file CSV.');
        },
      });
      return;
    }

    const url = CONFIG.csvUrl.trim() || CONFIG.fallbackCsvUrl;
    const isFallback = !CONFIG.csvUrl.trim() || url === CONFIG.fallbackCsvUrl;

    Papa.parse<Record<string, string>>(url, {
      download: true,
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        processCsvResults(
          results.data,
          isFallback ? 'Data Sampel Demo (data-dummy-sertifikat-v3.csv)' : 'Google Sheets Tab Final'
        );
      },
      error: () => {
        if (!isFallback && CONFIG.fallbackCsvUrl) {
          fetchCsvDataFallback();
        } else {
          setDataLoading(false);
          alert('Gagal memuat link CSV Google Sheets. Silakan gunakan tombol "Pilih file CSV".');
        }
      },
    });
  };

  const fetchCsvDataFallback = () => {
    Papa.parse<Record<string, string>>(CONFIG.fallbackCsvUrl, {
      download: true,
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        processCsvResults(results.data, 'Data Sampel Demo (data-dummy-sertifikat-v3.csv)');
      },
      error: () => {
        setDataLoading(false);
        alert('Gagal memuat CSV cadangan.');
      },
    });
  };

  const processCsvResults = (rows: Record<string, string>[], sourceName: string) => {
    setDataLoading(false);
    setDataSourceName(sourceName);

    const normalized: Participant[] = [];
    rows.forEach((row) => {
      const p = normalizeRow(row);
      if (p.nama && p.nim && p.seminar) {
        normalized.push(p);
      }
    });

    setParticipants(normalized);
    setSelectedIndices(new Set());
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

  const seminarsList = useMemo(() => {
    return Array.from(new Set(participants.map((p) => p.seminar))).filter(Boolean);
  }, [participants]);

  // Set default seminar if none chosen
  useEffect(() => {
    if (seminarsList.length > 0 && !filterSeminar) {
      setFilterSeminar(seminarsList[0]);
    }
  }, [seminarsList, filterSeminar]);

  // Filtered participants list (termasuk filter pencarian NIM manual)
  const filteredParticipants = useMemo(() => {
    const cleanSearchNim = searchNimManual.trim().toLowerCase();

    return participants
      .filter((p) => {
        if (filterSeminar && p.seminar !== filterSeminar) return false;
        if (filterJenis !== 'semua' && p.jenis !== filterJenis) return false;

        const met = (p.metode || '').toLowerCase();
        if (filterMetode === 'cetak') {
          if (met !== 'cetak' && met !== '') return false;
        } else if (filterMetode === 'digital') {
          if (met !== 'digital') return false;
        } else if (filterMetode === 'kosong') {
          if (met !== '') return false;
        }

        // Pencarian NIM Manual
        if (cleanSearchNim) {
          if (!p.nim.toLowerCase().includes(cleanSearchNim)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = a[sortBy] || '';
        let valB = b[sortBy] || '';
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
  }, [participants, filterSeminar, filterJenis, filterMetode, searchNimManual, sortBy, sortAsc]);

  // Selection handlers
  const toggleSelect = (originalIndex: number) => {
    const next = new Set(selectedIndices);
    if (next.has(originalIndex)) {
      next.delete(originalIndex);
    } else {
      if (next.size >= 50) {
        alert('Maksimal 50 sertifikat per kelompok cetak untuk menjaga performa cetak browser.');
        return;
      }
      next.add(originalIndex);
    }
    setSelectedIndices(next);
  };

  const selectBatch = (startIndex: number, count: number = 50) => {
    const next = new Set<number>();
    const slice = filteredParticipants.slice(startIndex, startIndex + count);
    slice.forEach((p) => {
      const idx = participants.indexOf(p);
      if (idx !== -1) next.add(idx);
    });
    setSelectedIndices(next);
  };

  const selectAllFiltered = () => {
    const next = new Set<number>();
    const maxItems = Math.min(filteredParticipants.length, 50);
    filteredParticipants.slice(0, maxItems).forEach((p) => {
      const idx = participants.indexOf(p);
      if (idx !== -1) next.add(idx);
    });
    setSelectedIndices(next);
  };

  const clearSelection = () => {
    setSelectedIndices(new Set());
  };

  // Selected participant objects for print
  const selectedParticipants = useMemo(() => {
    return Array.from(selectedIndices)
      .map((i) => participants[i])
      .filter(Boolean);
  }, [selectedIndices, participants]);

  // Tambah Peserta Manual ke Tabel
  const handleAddManualParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.nama || !manualForm.nim || !manualForm.seminar) {
      alert('Nama, NIM, dan Seminar wajib diisi.');
      return;
    }

    const newP: Participant = {
      ...manualForm,
      desain: normalizeDesignId(manualForm.desain),
      jenis: normalizeJenis(manualForm.jenis),
      nomor_sertifikat: manualForm.nomor_sertifikat || `MANUAL-${Date.now().toString().slice(-4)}`,
    };

    setParticipants((prev) => [newP, ...prev]);
    setShowAddManualModal(false);
    alert(`Peserta "${newP.nama}" berhasil ditambahkan ke tabel!`);
  };

  // Trigger Bulk Print Langsung tanpa merusak atau menggeser UI layar
  const handleBulkPrint = async () => {
    if (selectedParticipants.length === 0) {
      alert('Pilih minimal satu sertifikat pada tabel sebelum mencetak.');
      return;
    }

    if (selectedParticipants.length > 50) {
      alert('Batas maksimal cetak adalah 50 lembar per kelompok. Silakan kurangi pilihan Anda.');
      return;
    }

    setIsPrinting(true);
    document.body.classList.add('printing-bulk');

    // Beri waktu sejenak agar React me-mount portal cetak & semua gambar/tanda tangan ter-decode
    await new Promise((resolve) => setTimeout(resolve, 300));
    const imgs = document.querySelectorAll('#print-portal-root img');
    await Promise.all(
      Array.from(imgs).map((img) => (img as HTMLImageElement).decode?.().catch(() => null))
    );

    // Buka dialog print browser
    window.print();

    // Cleanup otomatis saat dialog cetak ditutup (afterprint)
    const cleanup = () => {
      document.body.classList.remove('printing-bulk');
      setIsPrinting(false);
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup, { once: true });
  };

  // -------------------------------------------------------------------------
  // RENDER 1: JIKA SUPABASE BELUM DIKONFIGURASI
  // -------------------------------------------------------------------------
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 border border-slate-200 shadow-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Login Belum Dikonfigurasi</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Login belum dikonfigurasi, hubungi admin.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl text-left text-xs text-slate-600 border border-slate-200 mb-6 space-y-2">
            <p className="font-semibold text-slate-800">Petunjuk untuk Admin/Developer:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Buat project Supabase di <code>supabase.com</code>.</li>
              <li>Salin <strong>Project URL</strong> & <strong>anon key</strong>.</li>
              <li>Isi di file <code>.env</code> atau panel Environment Variables hosting:</li>
            </ol>
            <code className="block bg-slate-200 p-2 rounded text-[11px] font-mono break-all text-slate-800">
              VITE_SUPABASE_URL="https://xxx.supabase.co"<br />
              VITE_SUPABASE_ANON_KEY="eyJhbGci..."
            </code>
          </div>
          <a
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800"
          >
            ← Kembali ke Halaman Peserta
          </a>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER 2: LOADING CHECKING SESSION
  // -------------------------------------------------------------------------
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Memeriksa sesi panitia...</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER 3: FORM LOGIN JIKA BELUM ADA SESI
  // -------------------------------------------------------------------------
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-slate-100">
        <div className="w-full max-w-md mb-4 bg-blue-950 text-blue-200 text-xs px-4 py-2.5 rounded-xl border border-blue-900 flex items-center gap-2 shadow-xs">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="font-medium">Halaman panitia. Khusus pengguna yang sudah login.</span>
        </div>

        <div className="bg-white rounded-2xl max-w-md w-full p-8 border border-slate-200 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Masuk Akun Panitia</h2>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan akun resmi panitia yang telah didaftarkan oleh admin HMP.
            </p>
          </div>

          {authError && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>{authError}</span>
            </div>
          )}

          {resetSentNotice && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              {resetSentNotice}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Panitia
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="panitia@hmp.org"
                autoComplete="username"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-lg focus:outline-none cursor-pointer transition-colors"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={authLoading}
                className="text-xs text-blue-900 hover:underline font-semibold cursor-pointer"
              >
                Lupa password?
              </button>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {authLoading ? 'Memeriksa kredensial...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <a href="/" className="text-xs text-slate-500 hover:underline">
              ← Kembali ke Halaman Peserta
            </a>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER 4: DASHBOARD ALAT CETAK MASSAL PANITIA (SESI AKTIF)
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen pb-16">
      {/* Banner Wajib Panitia */}
      <div className="bg-blue-950 text-blue-100 py-2.5 px-4 text-xs border-b border-blue-900 flex items-center justify-between no-print">
        <div className="flex items-center gap-2 max-w-6xl mx-auto w-full">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="font-bold">Halaman panitia. Khusus pengguna yang sudah login.</span>
        </div>
      </div>

      {/* Top Header Panitia */}
      <header className="bg-white border-b border-slate-200 py-3.5 shadow-xs mb-6 no-print">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold shadow-xs">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect width="12" height="8" x="6" y="14" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Alat Cetak Massal & TTD Digital</h1>
              <p className="text-xs text-slate-500">Divisi Akademik HMP • Khusus Panitia Pelaksana</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
              Login: <strong>{session?.user?.email}</strong>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 text-xs font-bold transition-all cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 no-print space-y-6">
        {/* ================================================================= */}
        {/* PANEL KUSTOMISASI PENANDATANGAN & SCAN TTD DIGITAL OTOMATIS */}
        {/* ================================================================= */}
        <section className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 text-white flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold">
                ✍️
              </div>
              <div>
                <h2 className="text-sm font-bold">Pengaturan Pejabat & Tanda Tangan Digital Otomatis</h2>
                <p className="text-[11px] text-blue-200">
                  Ganti nama ketua, jabatan, NIM/NIP, dan upload scan tanda tangan tanpa perlu edit kodingan!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSignerSettings(!showSignerSettings)}
              className="px-3 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            >
              {showSignerSettings ? 'Sembunyikan Panel ▲' : 'Buka Pengaturan ▼'}
            </button>
          </div>

          {showSignerSettings && (
            <div className="p-6 bg-slate-50/50">
              {/* Pilihan Warna Tinta Digital */}
              <div className="mb-5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-800">Warna Tinta Digital:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleChangeInkColor('black')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                        signatureInkColor === 'black'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-950 inline-block border border-white"></span>
                      <span>Hitam Pekat (Standar)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeInkColor('blue')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                        signatureInkColor === 'blue'
                          ? 'bg-blue-800 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block border border-white"></span>
                      <span>Biru Pulpen</span>
                    </button>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  ⚡ Scanner otomatis membuang warna kertas & bayangan, menyisakan tinta tanda tangan transparan
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PENANDATANGAN 1 (KIRI) */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-[10px]">1</span>
                        Penandatangan Kiri (Misal: Ketua Divisi / Pelaksana)
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Jabatan / Posisi</label>
                        <input
                          type="text"
                          value={signatories[0].title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSignatories((prev) => [{ ...prev[0], title: val }, prev[1]]);
                          }}
                          placeholder="Contoh: Ketua Divisi Akademik"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                        <input
                          type="text"
                          value={signatories[0].name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSignatories((prev) => [{ ...prev[0], name: val }, prev[1]]);
                          }}
                          placeholder="Contoh: Aditya Pratama, S.Kom."
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">NIM / NIP Manual</label>
                        <input
                          type="text"
                          value={signatories[0].idNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSignatories((prev) => [{ ...prev[0], idNumber: val }, prev[1]]);
                          }}
                          placeholder="Contoh: NIM. 2108561050 atau NIP. 1985..."
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Upload Gambar Scan TTD 1 */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Upload Gambar Tanda Tangan (Foto Kertas / Scan)
                    </label>

                    <input
                      type="file"
                      ref={sigInputRef1}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          processAndSetSignature(e.target.files[0], 0);
                        }
                      }}
                    />

                    {/* Preview Kotak TTD 1 */}
                    <div className="h-16 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center p-2 mb-2 relative overflow-hidden bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:8px_8px]">
                      {isProcessingSig1 ? (
                        <span className="text-[11px] text-blue-900 font-semibold animate-pulse flex items-center gap-1.5">
                          <span>✨</span>
                          <span>Memindai goresan tinta & menghapus background...</span>
                        </span>
                      ) : signatories[0].signatureImage ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src={signatories[0].signatureImage}
                            alt="Preview TTD 1"
                            className="max-h-12 max-w-[170px] object-contain drop-shadow-xs"
                          />
                          <span className="absolute bottom-0 right-0 text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold shadow-2xs">
                            ✓ Tinta Transparan
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-serif italic">
                          (Menggunakan tanda tangan latin default)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSigPadTarget(0);
                          setSigPadOpen(true);
                        }}
                        className="flex-1 min-w-[130px] py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>✍️</span>
                        <span>TTD Langsung</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => sigInputRef1.current?.click()}
                        className="flex-1 min-w-[130px] py-1.5 px-3 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>Pilih Gambar TTD</span>
                      </button>

                      {signatories[0].signatureImage && (
                        <button
                          type="button"
                          onClick={() => resetSignatureToDefault(0)}
                          className="py-1.5 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                          title="Hapus gambar & kembali ke tulisan latin"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* PENANDATANGAN 2 (KANAN) */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-[10px]">2</span>
                        Penandatangan Kanan (Misal: Ketua Umum HMP / Dekan)
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Jabatan / Posisi</label>
                        <input
                          type="text"
                          value={signatories[1].title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSignatories((prev) => [prev[0], { ...prev[1], title: val }]);
                          }}
                          placeholder="Contoh: Ketua Umum HMP"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                        <input
                          type="text"
                          value={signatories[1].name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSignatories((prev) => [prev[0], { ...prev[1], name: val }]);
                          }}
                          placeholder="Contoh: Nabila Zahra Khairunnisa"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">NIM / NIP Manual</label>
                        <input
                          type="text"
                          value={signatories[1].idNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSignatories((prev) => [prev[0], { ...prev[1], idNumber: val }]);
                          }}
                          placeholder="Contoh: NIM. 2108561012 atau NIP. 1978..."
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Upload Gambar Scan TTD 2 */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Upload Gambar Tanda Tangan (Foto Kertas / Scan)
                    </label>

                    <input
                      type="file"
                      ref={sigInputRef2}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          processAndSetSignature(e.target.files[0], 1);
                        }
                      }}
                    />

                    {/* Preview Kotak TTD 2 */}
                    <div className="h-16 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center p-2 mb-2 relative overflow-hidden bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:8px_8px]">
                      {isProcessingSig2 ? (
                        <span className="text-[11px] text-blue-900 font-semibold animate-pulse flex items-center gap-1.5">
                          <span>✨</span>
                          <span>Memindai goresan tinta & menghapus background...</span>
                        </span>
                      ) : signatories[1].signatureImage ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src={signatories[1].signatureImage}
                            alt="Preview TTD 2"
                            className="max-h-12 max-w-[170px] object-contain drop-shadow-xs"
                          />
                          <span className="absolute bottom-0 right-0 text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold shadow-2xs">
                            ✓ Tinta Transparan
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-serif italic">
                          (Menggunakan tanda tangan latin default)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSigPadTarget(1);
                          setSigPadOpen(true);
                        }}
                        className="flex-1 min-w-[130px] py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>✍️</span>
                        <span>TTD Langsung</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => sigInputRef2.current?.click()}
                        className="flex-1 min-w-[130px] py-1.5 px-3 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>Pilih Gambar TTD</span>
                      </button>

                      {signatories[1].signatureImage && (
                        <button
                          type="button"
                          onClick={() => resetSignatureToDefault(1)}
                          className="py-1.5 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                          title="Hapus gambar & kembali ke tulisan latin"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                <div className="font-bold flex items-center gap-1.5 mb-1.5 text-blue-950">
                  <span>💡</span>
                  <span>Cara Kerja Pemindai Tanda Tangan Digital:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-blue-800">
                  <li><strong>Bukan Tempel Foto Biasa:</strong> Foto kertas Anda tidak akan ditempel mentah-mentah. Web otomatis membaca goresan pulpen Anda dan mengubahnya menjadi <strong>tinta digital murni (hitam/biru)</strong>.</li>
                  <li><strong>Background & Bayangan Hilang Total:</strong> Sistem menggunakan algoritma adaptif untuk menghapus 100% warna kertas putih/abu-abu dan bayangan HP.</li>
                  <li><strong>Ukuran Pas Otomatis:</strong> Kertas kosong di sekeliling tanda tangan dipotong rapi (auto-crop) sehingga posisinya langsung pas dan proporsional di atas nama penandatangan sertifikat!</li>
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* Status Sumber Data & Fallback File Picker */}
        <section className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Sumber Data Aktif:</span>
            <strong className="text-xs text-slate-900">{dataSourceName}</strong>
            <span className="text-xs bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-mono font-bold">
              {participants.length} data
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setManualForm({
                  nama: '',
                  nim: '',
                  email: '',
                  jenis: 'peserta',
                  desain: 'klasik',
                  seminar: filterSeminar || (seminarsList[0] || 'Seminar Akademik'),
                  tanggal: '12 November 2026',
                  nomor_sertifikat: '',
                  metode: 'cetak',
                });
                setShowAddManualModal(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
            >
              <span>+ Tambah Peserta Manual</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  fetchCsvData(e.target.files[0]);
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Pilih file CSV Lokal
            </button>
            <button
              type="button"
              onClick={() => fetchCsvData()}
              disabled={dataLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {dataLoading ? 'Memuat...' : 'Muat Ulang'}
            </button>
          </div>
        </section>

        {/* Filter Controls, Search NIM Manual, & Wet Signature Switch */}
        <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            {/* Filter Seminar */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Seminar</label>
              <select
                value={filterSeminar}
                onChange={(e) => {
                  setFilterSeminar(e.target.value);
                  setSelectedIndices(new Set());
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                {seminarsList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Jenis */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Jenis Peran</label>
              <select
                value={filterJenis}
                onChange={(e) => {
                  setFilterJenis(e.target.value);
                  setSelectedIndices(new Set());
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                <option value="semua">Semua Peran</option>
                <option value="peserta">Peserta</option>
                <option value="panitia">Panitia</option>
                <option value="pemateri">Pemateri</option>
              </select>
            </div>

            {/* Filter Metode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Metode Distribusi</label>
              <select
                value={filterMetode}
                onChange={(e) => {
                  setFilterMetode(e.target.value);
                  setSelectedIndices(new Set());
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                <option value="cetak">Hanya Cetak (Bawaan)</option>
                <option value="digital">Hanya Digital</option>
                <option value="kosong">Metode Kosong</option>
                <option value="semua">Semua Metode</option>
              </select>
            </div>

            {/* Input Pencarian NIM Manual */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Cari / Filter NIM Manual</label>
              <input
                type="text"
                value={searchNimManual}
                onChange={(e) => setSearchNimManual(e.target.value)}
                placeholder="Ketik NIM peserta..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-mono"
              />
            </div>

            {/* Saklar TTD Basah */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Saklar TTD Basah</label>
              <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={isWetSignature}
                  onChange={(e) => setIsWetSignature(e.target.checked)}
                  className="w-4 h-4 text-blue-900 rounded"
                />
                <span className="text-[11px] text-slate-700 font-semibold leading-tight">
                  {isWetSignature ? 'Aktif (Kosong untuk pulpen)' : 'Nonaktif (Pakai TTD Digital)'}
                </span>
              </label>
            </div>
          </div>
        </section>

        {/* Action Bar Cetak & Batching 50 */}
        <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Terpilih: <strong className="text-blue-900">{selectedParticipants.length}</strong> dari {filteredParticipants.length} (Maks 50 per cetak)
            </span>

            <button
              type="button"
              onClick={selectAllFiltered}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 cursor-pointer"
            >
              Pilih 50 Pertama
            </button>

            {filteredParticipants.length > 50 && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                <span className="px-1 text-slate-500 font-bold">Kelompok:</span>
                {Array.from({ length: Math.ceil(filteredParticipants.length / 50) }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectBatch(i * 50, 50)}
                    className="px-2 py-0.5 bg-white text-slate-700 hover:bg-blue-900 hover:text-white rounded font-bold cursor-pointer transition-all"
                  >
                    {i * 50 + 1}-{Math.min((i + 1) * 50, filteredParticipants.length)}
                  </button>
                ))}
              </div>
            )}

            {selectedParticipants.length > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-red-600 hover:underline font-semibold cursor-pointer"
              >
                Batal Pilih
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isPrinting && (
              <button
                type="button"
                onClick={() => {
                  document.body.classList.remove('printing-bulk');
                  setIsPrinting(false);
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Selesai Cetak
              </button>
            )}
            <button
              type="button"
              onClick={handleBulkPrint}
              disabled={selectedParticipants.length === 0 || isPrinting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect width="12" height="8" x="6" y="14" />
              </svg>
              <span>{isPrinting ? 'Menyiapkan Lembar Cetak...' : `Cetak Massal (${selectedParticipants.length} A4)`}</span>
            </button>
          </div>
        </section>

        {/* Tabel Data Peserta dengan Checkbox */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedParticipants.length > 0 &&
                        selectedParticipants.length === Math.min(filteredParticipants.length, 50)
                      }
                      onChange={(e) => {
                        if (e.target.checked) selectAllFiltered();
                        else clearSelection();
                      }}
                      className="w-4 h-4 text-blue-900 rounded"
                    />
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:bg-slate-100"
                    onClick={() => {
                      setSortBy('nama');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    Nama Peserta {sortBy === 'nama' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:bg-slate-100"
                    onClick={() => {
                      setSortBy('nim');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    NIM {sortBy === 'nim' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th className="p-3">Peran</th>
                  <th className="p-3">Desain</th>
                  <th
                    className="p-3 cursor-pointer hover:bg-slate-100"
                    onClick={() => {
                      setSortBy('nomor_sertifikat');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    No. Sertifikat {sortBy === 'nomor_sertifikat' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th className="p-3">Metode</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {searchNimManual
                        ? `Tidak ada peserta dengan NIM "${searchNimManual}".`
                        : 'Tidak ada peserta yang cocok dengan filter yang dipilih.'}
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((p) => {
                    const originalIdx = participants.indexOf(p);
                    const isSelected = selectedIndices.has(originalIdx);

                    return (
                      <tr
                        key={originalIdx}
                        className={`hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(originalIdx)}
                            className="w-4 h-4 text-blue-900 rounded"
                          />
                        </td>
                        <td className="p-3 font-semibold text-slate-900">{p.nama}</td>
                        <td className="p-3 font-mono">{p.nim}</td>
                        <td className="p-3">
                          <span className="capitalize px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-800">
                            {p.jenis}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px]">{p.desain}</td>
                        <td className="p-3 font-mono text-[11px]">{p.nomor_sertifikat}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              (p.metode || 'cetak') === 'cetak'
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {p.metode || 'cetak'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setPreviewSample(p)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                          >
                            Lihat Contoh
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* MODAL TAMBAH PESERTA MANUAL (TANPA CSV) */}
      {showAddManualModal && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print"
          onClick={() => setShowAddManualModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Tambah Peserta Manual</h3>
                <p className="text-xs text-slate-500">Untuk peserta susulan atau tes cetak cepat</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddManualModal(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddManualParticipant} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  value={manualForm.nama}
                  onChange={(e) => setManualForm({ ...manualForm, nama: e.target.value })}
                  placeholder="Contoh: Budi Santoso, S.Kom."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NIM Mahasiswa</label>
                  <input
                    type="text"
                    required
                    value={manualForm.nim}
                    onChange={(e) => setManualForm({ ...manualForm, nim: e.target.value })}
                    placeholder="Contoh: 2101001"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={manualForm.email}
                    onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                    placeholder="budi@example.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Peran (Jenis)</label>
                  <select
                    value={manualForm.jenis}
                    onChange={(e) => setManualForm({ ...manualForm, jenis: e.target.value as RoleType })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="peserta">Peserta</option>
                    <option value="panitia">Panitia</option>
                    <option value="pemateri">Pemateri</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pilihan Desain</label>
                  <select
                    value={manualForm.desain}
                    onChange={(e) => setManualForm({ ...manualForm, desain: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    {CONFIG.designs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nama} ({d.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Seminar</label>
                <input
                  type="text"
                  required
                  value={manualForm.seminar}
                  onChange={(e) => setManualForm({ ...manualForm, seminar: e.target.value })}
                  placeholder="Nama kegiatan seminar..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="text"
                    value={manualForm.tanggal}
                    onChange={(e) => setManualForm({ ...manualForm, tanggal: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No. Sertifikat (Opsional)</label>
                  <input
                    type="text"
                    value={manualForm.nomor_sertifikat}
                    onChange={(e) => setManualForm({ ...manualForm, nomor_sertifikat: e.target.value })}
                    placeholder="Otomatis jika kosong"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddManualModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 cursor-pointer shadow-sm"
                >
                  Tambahkan ke Tabel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LIHAT CONTOH SERTIFIKAT (REALTIME DENGAN PEJABAT & TTD KUSTOM) */}
      {previewSample && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print"
          onClick={() => setPreviewSample(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Contoh Sertifikat: {previewSample.nama} ({previewSample.jenis.toUpperCase()})
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Desain: {previewSample.desain} | No: {previewSample.nomor_sertifikat}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSample(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-4 overflow-auto flex-1 bg-slate-900 flex justify-center items-center">
              <div className="w-[980px] h-[693px] origin-center scale-[0.38] sm:scale-[0.6] md:scale-[0.8] my-[-160px] sm:my-[-100px] md:my-[-50px]">
                <CertificateCanvas
                  data={previewSample}
                  isWetSignature={isWetSignature}
                  signatoriesOverride={signatories}
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Mode TTD Basah: <strong>{isWetSignature ? 'Aktif' : 'Nonaktif'}</strong>
              </span>
              <button
                type="button"
                onClick={() => setPreviewSample(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL TTD LANGSUNG DI LAYAR (HASIL MASUK KE PANEL PENANDATANGAN)  */}
      {/* ================================================================= */}
      {sigPadOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[60] flex items-center justify-center p-3 sm:p-6"
          onClick={() => setSigPadOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header + status tinta */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Tanda Tangan Langsung — Penandatangan {sigPadTarget + 1}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tanda tangani di area putih. Hasil otomatis jadi tinta hitam transparan.
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  sigPadHasInk
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {sigPadHasInk ? '● Ada Goresan' : '○ Masih Kosong'}
              </span>
            </div>

            {/* Kanvas */}
            <div className="relative flex-1 min-h-[300px] sm:min-h-[380px] bg-white">
              <canvas
                ref={sigPadCanvasRef}
                className="absolute inset-0 cursor-crosshair touch-none select-none"
                style={{ touchAction: 'none' }}
                onPointerDown={sigPadDown}
                onPointerMove={sigPadMove}
                onPointerUp={sigPadUp}
                onPointerCancel={sigPadUp}
                onPointerLeave={sigPadUp}
              />
              {!sigPadHasInk && (
                <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-[28%]">
                  <span className="text-slate-300 text-xs italic font-serif">Tanda tangan di sini</span>
                </div>
              )}
              <div className="absolute left-[12%] right-[12%] bottom-[22%] pointer-events-none border-b-2 border-slate-200" />
            </div>

            {/* Tombol aksi */}
            <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
              <button
                type="button"
                onClick={sigPadClear}
                disabled={!sigPadHasInk}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all disabled:opacity-40 cursor-pointer"
              >
                🧹 Bersihkan
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSigPadOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={sigPadSave}
                  disabled={!sigPadHasInk}
                  className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-md transition-all disabled:opacity-40 cursor-pointer"
                >
                  💾 Simpan TTD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PORTAL CETAK MASSAL: Terisolasi ke luar #root ke #print-portal-root */}
      {/* HANYA di-mount saat proses cetak aktif (isPrinting = true) agar tampilan UI layar 100% stabil & tidak bergeser */}
      {isPrinting && selectedParticipants.length > 0 && (
        <PrintPortal>
          <div className="print-portal-container">
            {selectedParticipants.map((p, idx) => (
              <div key={idx} className="print-page-sheet">
                <CertificateCanvas
                  data={p}
                  isWetSignature={isWetSignature}
                  signatoriesOverride={signatories}
                />
              </div>
            ))}
          </div>
        </PrintPortal>
      )}
    </div>
  );
};