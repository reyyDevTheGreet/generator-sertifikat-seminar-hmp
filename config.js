/**
 * =========================================================================
 * KONFIGURASI GENERATOR SERTIFIKAT SEMINAR HMP - DIVISI AKADEMIK
 * =========================================================================
 * 
 * Pusat pengaturan sistem sertifikat:
 * 1. Daftar 15 desain resmi & metadata suasana.
 * 2. Teks spesifik per jenis (peserta, panitia, pemateri).
 * 3. Identitas organisasi & kontak panitia.
 * 4. Sumber data CSV (Google Sheets Tab Final atau fallback demo).
 */

const CONFIG = {
  // -----------------------------------------------------------------------
  // 1. DATA SOURCE (GOOGLE SHEETS CSV - TAB FINAL)
  // -----------------------------------------------------------------------
  // Masukkan link CSV hasil publish tab Final di sini:
  csvUrl: "", 

  // File fallback data demo untuk pengujian lokal:
  fallbackCsvUrl: "./data-dummy-sertifikat-v3.csv",

  // -----------------------------------------------------------------------
  // 2. IDENTITAS ORGANISASI & KONTAK
  // -----------------------------------------------------------------------
  organizationName: "HIMPUNAN MAHASISWA PROGRAM STUDI (HMP)",
  divisionName: "Divisi Akademik & Keilmuan",
  universityName: "Fakultas Ilmu Komputer & Teknologi Informasi",
  contactPerson: "Panitia Divisi Akademik",
  contactEmail: "akademik.hmp@example.ac.id",
  contactWhatsapp: "6281234567890", // Ganti no WA diawali kode negara 62

  // -----------------------------------------------------------------------
  // 3. DAFTAR 15 DESAIN SERTIFIKAT RESMI
  // -----------------------------------------------------------------------
  // Menambah desain baru cukup dengan menambah objek di daftar ini dan
  // membuat blok tema di themes.css [data-desain="id-desain"].
  designs: [
    {
      id: "klasik",
      nama: "Klasik",
      suasana: ["formal", "terang"],
      palet: { latar: "#FBF7EE", utama: "#1B2A49", aksen: "#B8923A", teks: "#1B2A49" },
      ciri: "Border ganda navy dan emas, font serif, ornamen sudut sederhana. Desain bawaan (fallback)."
    },
    {
      id: "modern",
      nama: "Modern",
      suasana: ["santai", "terang"],
      palet: { latar: "#FFFFFF", utama: "#1D4ED8", aksen: "#0EA5E9", teks: "#0F172A" },
      ciri: "Banyak ruang kosong, garis aksen tipis di tepi, font sans-serif bersih."
    },
    {
      id: "elegan-emas",
      nama: "Elegan Emas",
      suasana: ["formal", "terang"],
      palet: { latar: "#FAF6EC", utama: "#1A1A1A", aksen: "#C9A227", teks: "#1A1A1A" },
      ciri: "Garis emas tipis, ornamen sudut, nama peserta memakai font script atau serif display."
    },
    {
      id: "ceria",
      nama: "Ceria",
      suasana: ["santai", "terang"],
      palet: { latar: "#FFF8E1", utama: "#F97316", aksen: "#EC4899", teks: "#3B2A12" },
      ciri: "Hiasan bulat dan confetti dari CSS, font rounded, warna hangat."
    },
    {
      id: "akademik",
      nama: "Akademik",
      suasana: ["formal", "terang"],
      palet: { latar: "#F5F7FA", utama: "#12355B", aksen: "#8A98A8", teks: "#1B2733" },
      ciri: "Pita biru tua di bagian atas, logo di tengah atas, serif formal."
    },
    {
      id: "hijau-alam",
      nama: "Hijau Alam",
      suasana: ["santai", "terang"],
      palet: { latar: "#F4F1E8", utama: "#3E6B4F", aksen: "#A3B18A", teks: "#24352B" },
      ciri: "Motif daun garis sederhana di sudut, nuansa tenang."
    },
    {
      id: "royal-biru",
      nama: "Royal Biru",
      suasana: ["formal", "terang"],
      palet: { latar: "#FFFFFF", utama: "#1E3A8A", aksen: "#D4AF37", teks: "#111C44" },
      ciri: "Segel emas bundar dan pita di bagian bawah, border biru royal."
    },
    {
      id: "maroon",
      nama: "Maroon",
      suasana: ["formal", "terang"],
      palet: { latar: "#FFF9F2", utama: "#7A1F2B", aksen: "#D9B382", teks: "#3B0F15" },
      ciri: "Border tebal maroon dengan garis krem emas di dalam, serif tegas."
    },
    {
      id: "minimalis",
      nama: "Minimalis",
      suasana: ["santai", "terang"],
      palet: { latar: "#FFFFFF", utama: "#111111", aksen: "#111111", teks: "#111111" },
      ciri: "Hitam putih, tipografi besar, satu garis tipis, ruang kosong luas."
    },
    {
      id: "geometris",
      nama: "Geometris",
      suasana: ["santai", "terang"],
      palet: { latar: "#FFFFFF", utama: "#0F766E", aksen: "#F97316", teks: "#134E4A" },
      ciri: "Segitiga dan bidang diagonal di sudut (clip-path), kombinasi teal dan oranye."
    },
    {
      id: "pastel",
      nama: "Pastel Lembut",
      suasana: ["santai", "terang"],
      palet: { latar: "#FFF5F7", utama: "#B185DB", aksen: "#A0E7E5", teks: "#4A3F5C" },
      ciri: "Warna pastel lembut, sudut membulat, hiasan awan atau lingkaran."
    },
    {
      id: "gelap",
      nama: "Gelap Elegan",
      suasana: ["formal", "gelap"],
      palet: { latar: "#1F2328", utama: "#F3E9DC", aksen: "#C57B57", teks: "#F3E9DC" },
      ciri: "Latar arang, teks krem, garis tembaga. Pastikan kontras tinggi."
    },
    {
      id: "batik",
      nama: "Nuansa Batik",
      suasana: ["formal", "terang"],
      palet: { latar: "#F3E6CC", utama: "#5C3A21", aksen: "#A0522D", teks: "#3E2415" },
      ciri: "Pola batik sederhana dari CSS/SVG inline di tepi, warna sogan."
    },
    {
      id: "senja",
      nama: "Senja",
      suasana: ["santai", "terang"],
      palet: { latar: "#FFFFFF", utama: "#7C3AED", aksen: "#FB923C", teks: "#2E1065" },
      ciri: "Pita atas dengan gradasi lembut oranye ke ungu, selebihnya bersih."
    },
    {
      id: "retro",
      nama: "Retro",
      suasana: ["santai", "terang"],
      palet: { latar: "#F4E9D8", primary: "#0F766E", utama: "#0F766E", aksen: "#E4572E", teks: "#2B2D42" },
      ciri: "Tepi bergerigi (scalloped), serif tebal, kombinasi krem, teal, dan oranye bata."
    }
  ],

  // -----------------------------------------------------------------------
  // 4. KONTEN & TEKS PER JENIS (PESERTA, PANITIA, PEMATERI)
  // -----------------------------------------------------------------------
  roleTexts: {
    peserta: {
      title: "SERTIFIKAT PESERTA",
      englishSub: "CERTIFICATE OF PARTICIPATION",
      presentedTo: "DIBERIKAN DENGAN BANGGA KEPADA:",
      roleBadge: "PESERTA",
      paragraph: "Atas partisipasi aktif, dedikasi, dan kontribusinya sebagai PESERTA dalam menyukseskan kegiatan seminar akademik:"
    },
    panitia: {
      title: "SERTIFIKAT PANITIA",
      englishSub: "CERTIFICATE OF ORGANIZING COMMITTEE",
      presentedTo: "DIBERIKAN DENGAN APRESIASI TERTINGGI KEPADA:",
      roleBadge: "PANITIA PELAKSANA",
      paragraph: "Atas kerja keras, dedikasi penuh, dan kontribusinya sebagai PANITIA dalam menyelenggarakan kegiatan akademik:"
    },
    pemateri: {
      title: "SERTIFIKAT PEMATERI",
      englishSub: "CERTIFICATE OF APPRECIATION - SPEAKER",
      presentedTo: "DIBERIKAN DENGAN RASA HORMAT KEPADA:",
      roleBadge: "PEMATERI / NARASUMBER",
      paragraph: "Atas dedikasi keilmuan, transfer pengetahuan, dan kontribusi wawasan berharga sebagai PEMATERI pada seminar:"
    }
  },

  // -----------------------------------------------------------------------
  // 5. PENANDATANGAN BAWAAN (DEFAULT 1 ORANG)
  // -----------------------------------------------------------------------
  // Dipakai jika ttd1 dan ttd2 di baris data CSV kosong.
  // Jika nama dikosongkan (""), area tanda tangan TIDAK AKAN ditampilkan (0 penandatangan).
  defaultSignatory: {
    title: "Ketua Divisi Akademik",
    jabatan: "Ketua Divisi Akademik",
    nama: "Aditya Pratama, S.Kom.",
    idNumber: "NIM. 2108561050",
    gambar: "" // URL gambar jika ada
  },

  // Kompatibilitas lama jika dipanggil signatories
  signatories: [
    {
      title: "Ketua Divisi Akademik",
      jabatan: "Ketua Divisi Akademik",
      name: "Aditya Pratama, S.Kom.",
      nama: "Aditya Pratama, S.Kom.",
      idNumber: "NIM. 2108561050",
      gambar: ""
    }
  ]
};

/**
 * Memeriksa apakah path/URL gambar tanda tangan aman dan valid.
 * Menolak path traversal (../), ekstensi berbahaya (.js, .json, .html, dsb.)
 */
function sanitizeSignatureImg(imgRaw) {
  if (!imgRaw || typeof imgRaw !== "string") return "";
  const cleaned = imgRaw.trim();
  if (!cleaned) return "";

  // Tolak jika ada path traversal atau karakter injeksi
  if (cleaned.includes("..") || cleaned.includes("\\") || cleaned.includes("<") || cleaned.includes(">")) {
    return "";
  }

  // Tolak ekstensi file non-gambar yang mencurigakan
  const forbiddenExts = [".js", ".json", ".html", ".htm", ".php", ".sh", ".exe", ".ts", ".css"];
  const lower = cleaned.toLowerCase();
  for (const ext of forbiddenExts) {
    if (lower.endsWith(ext) || lower.includes(ext + "?") || lower.includes(ext + "#")) {
      return "";
    }
  }

  const isDataUri = lower.startsWith("data:image/");
  const isHttp = lower.startsWith("http://") || lower.startsWith("https://");
  const isLocalImg = lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".svg") || lower.endsWith(".webp");

  if (isDataUri || isHttp || isLocalImg) {
    return cleaned;
  }

  return "";
}

/**
 * resolveSigners(row, config)
 * Fungsi murni penentu penandatangan: mengembalikan array 0-2 objek:
 * [ { nama, jabatan, gambarValid } ]
 *
 * Algoritma:
 * 1. Slot dianggap TERISI hanya jika nama (setelah trim) tidak kosong. Jabatan dan gambar hanya pelengkap.
 * 2. Jika nama kosong tetapi jabatan atau gambar terisi, slot itu DIABAIKAN sepenuhnya.
 * 3. Kumpulkan slot terisi berurutan. Jika ttd1 kosong dan ttd2 terisi, ttd2 NAIK menjadi penandatangan pertama.
 * 4. Jika jumlah slot terisi = 0, pakai penandatangan bawaan dari config.js (hanya 1 orang).
 * 5. Jika nama bawaan dikosongkan di config.js, kembalikan array kosong (0 penandatangan).
 * 6. DILARANG mencampur: tidak ada kombinasi 'ttd1 dari baris + ttd2 dari bawaan'.
 * 7. Slot terisi tetapi gambar kosong / ditolak: gambarValid bernilai "".
 */
function resolveSigners(row, config) {
  const cfg = config || (typeof window !== "undefined" ? window.CONFIG : {}) || {};
  const r = row || {};

  // Ekstrak slot 1
  const ttd1Nama = (r.ttd1_nama !== undefined ? r.ttd1_nama : (r.ttd1nama !== undefined ? r.ttd1nama : (r.ttd1 || ""))).toString().trim();
  const ttd1Jabatan = (r.ttd1_jabatan !== undefined ? r.ttd1_jabatan : (r.ttd1jabatan !== undefined ? r.ttd1jabatan : "")).toString().trim();
  const ttd1GambarRaw = (r.ttd1_gambar !== undefined ? r.ttd1_gambar : (r.ttd1gambar !== undefined ? r.ttd1gambar : "")).toString().trim();

  // Ekstrak slot 2
  const ttd2Nama = (r.ttd2_nama !== undefined ? r.ttd2_nama : (r.ttd2nama !== undefined ? r.ttd2nama : (r.ttd2 || ""))).toString().trim();
  const ttd2Jabatan = (r.ttd2_jabatan !== undefined ? r.ttd2_jabatan : (r.ttd2jabatan !== undefined ? r.ttd2jabatan : "")).toString().trim();
  const ttd2GambarRaw = (r.ttd2_gambar !== undefined ? r.ttd2_gambar : (r.ttd2gambar !== undefined ? r.ttd2gambar : "")).toString().trim();

  // Evaluasi slot
  const slot1 = ttd1Nama ? {
    nama: ttd1Nama,
    jabatan: ttd1Jabatan,
    gambarValid: sanitizeSignatureImg(ttd1GambarRaw)
  } : null;

  const slot2 = ttd2Nama ? {
    nama: ttd2Nama,
    jabatan: ttd2Jabatan,
    gambarValid: sanitizeSignatureImg(ttd2GambarRaw)
  } : null;

  const filledSlots = [];
  if (slot1) filledSlots.push(slot1);
  if (slot2) filledSlots.push(slot2);

  // Jika baris memiliki slot penandatangan valid, gunakan baris saja
  if (filledSlots.length > 0) {
    return filledSlots;
  }

  // Jika baris kosong, pakai bawaan config.js (hanya 1 orang)
  const def = cfg.defaultSignatory || (Array.isArray(cfg.signatories) && cfg.signatories.length > 0 ? cfg.signatories[0] : null);
  const defNama = def && (def.nama || def.name) ? String(def.nama || def.name).trim() : "";
  const defJabatan = def && (def.jabatan || def.title) ? String(def.jabatan || def.title).trim() : "";
  const defGambarRaw = def && (def.gambar || def.signatureImage) ? String(def.gambar || def.signatureImage).trim() : "";

  // Jika nama bawaan dikosongkan, area TTD tidak ditampilkan (0 penandatangan)
  if (!defNama) {
    return [];
  }

  return [{
    nama: defNama,
    jabatan: defJabatan,
    gambarValid: sanitizeSignatureImg(defGambarRaw)
  }];
}

/**
 * Normalisasi Metode Tanda Tangan:
 * 'digital' atau 'basah'. Jika kosong/tidak dikenal, kembalikan 'digital'.
 */
function normalizeMetode(rawMetode) {
  if (!rawMetode || typeof rawMetode !== "string") return "digital";
  const cleaned = rawMetode.trim().toLowerCase();
  if (cleaned === "basah") return "basah";
  return "digital";
}

/**
 * Normalisasi ID desain:
 * Mengabaikan case dan spasi di pinggir, mengubah spasi menjadi tanda hubung (-).
 * Fallback: Jika kosong atau tidak cocok di daftar 15 desain, kembalikan 'klasik'.
 */
function normalizeDesignId(rawId) {
  if (!rawId || typeof rawId !== "string") return "klasik";

  const cleaned = rawId.trim().toLowerCase().replace(/\s+/g, "-");
  if (!cleaned) return "klasik";

  const found = CONFIG.designs.some(d => d.id === cleaned);
  return found ? cleaned : "klasik";
}

/**
 * Normalisasi Jenis peran (peserta, panitia, pemateri)
 * Fallback: 'peserta'
 */
function normalizeJenis(rawJenis) {
  if (!rawJenis || typeof rawJenis !== "string") return "peserta";
  const cleaned = rawJenis.trim().toLowerCase();
  if (cleaned.includes("panitia")) return "panitia";
  if (cleaned.includes("pemateri") || cleaned.includes("narasumber") || cleaned.includes("speaker")) return "pemateri";
  return "peserta";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * renderSignaturesHtml(signers, metode)
 * Menghasilkan markup HTML untuk .cert-footer-section berdasarkan hasil resolveSigners.
 * Digunakan secara identik di website peserta, galeri, dan alat cetak massal.
 */
function renderSignaturesHtml(signers, metode) {
  const isBasah = (metode === "basah");
  const sealHtml = `
    <div class="cert-seal">
      <div class="seal-circle">
        <span class="seal-text-top">HMP AKADEMIK</span>
        <div class="seal-icon">★</div>
        <span class="seal-text-bottom">EXCELLENCE</span>
      </div>
    </div>
  `;

  if (!signers || signers.length === 0) {
    return `<div class="cert-footer-section signers-0" style="display: none;"></div>`;
  }

  function renderSingleSigner(signer) {
    const hasImage = !isBasah && Boolean(signer.gambarValid);
    let sigAreaInner = "";

    if (hasImage) {
      sigAreaInner = `
        <img src="${escapeHtml(signer.gambarValid)}" alt="Tanda Tangan" class="cert-signature-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
        <div class="wet-signature-space" style="display: none;"></div>
      `;
    } else {
      sigAreaInner = `<div class="wet-signature-space"></div>`;
    }

    return `
      <div class="cert-signer">
        <div class="cert-signer-role">${escapeHtml(signer.jabatan || "")}</div>
        <div class="cert-signature-area">
          ${sigAreaInner}
        </div>
        <div class="cert-signer-name">${escapeHtml(signer.nama || "")}</div>
        <div class="cert-signer-id">${escapeHtml(signer.idNumber || "")}</div>
      </div>
    `;
  }

  if (signers.length === 1) {
    return `
      <div class="cert-footer-section signers-1">
        ${sealHtml}
        ${renderSingleSigner(signers[0])}
      </div>
    `;
  }

  // 2 signers
  return `
    <div class="cert-footer-section signers-2">
      ${renderSingleSigner(signers[0])}
      ${sealHtml}
      ${renderSingleSigner(signers[1])}
    </div>
  `;
}

// Pastikan CONFIG dan helper tersedia di scope window browser
if (typeof window !== "undefined") {
  window.CONFIG = CONFIG;
  window.escapeHtml = escapeHtml;
  window.sanitizeSignatureImg = sanitizeSignatureImg;
  window.resolveSigners = resolveSigners;
  window.renderSignaturesHtml = renderSignaturesHtml;
  window.normalizeMetode = normalizeMetode;
  window.normalizeDesignId = normalizeDesignId;
  window.normalizeJenis = normalizeJenis;
}
