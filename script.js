/**
 * =========================================================================
 * SCRIPT LOGIKA GENERATOR SERTIFIKAT SEMINAR HMP - DIVISI AKADEMIK
 * =========================================================================
 * 
 * Fitur:
 * 1. Mengambil CSV dari Google Sheets (Tab Final) atau fallback data demo.
 * 2. Normalisasi 8 kolom: nama, nim, email, jenis, desain, seminar, tanggal, nomor_sertifikat.
 * 3. Verifikasi 3 kunci sekaligus: Seminar + NIM + Email.
 * 4. Mendukung 15 desain sertifikat resmi melalui atribut data-desain dan themes.css.
 * 5. Mendukung 3 jenis (peserta, panitia, pemateri) dengan judul dan peran yang tepat.
 * 6. Penanganan cerdas jika 1 orang memiliki lebih dari 1 peran di seminar yang sama.
 * 7. Zoom presisi (50%, 60%, 80%, 100%, 150%) tanpa bug potongan atas atau samping.
 * 8. Ekspor PDF A4 Landscape kualitas tinggi via html2canvas + jsPDF.
 */

let participantsData = [];
let currentParticipant = null;
let currentMatches = [];
let currentZoomScale = 1.0;

document.addEventListener("DOMContentLoaded", () => {
  initUIFromConfig();
  setupEventListeners();
  loadData();
});

/**
 * Inisialisasi teks UI dari CONFIG
 */
function initUIFromConfig() {
  const config = window.CONFIG || {};

  const orgNameEl = document.getElementById("ui-org-name");
  if (orgNameEl && config.organizationName) {
    orgNameEl.textContent = config.organizationName;
  }

  const appSubEl = document.getElementById("ui-app-subtitle");
  if (appSubEl && config.divisionName) {
    appSubEl.textContent = `${config.divisionName} • Portal Sertifikat Mandiri`;
  }

  if (config.organizationName) {
    setSafeText("cert-org-name", config.organizationName);
  }
  if (config.divisionName || config.universityName) {
    const subtitle = [config.divisionName, config.universityName].filter(Boolean).join(" • ");
    setSafeText("cert-univ-name", subtitle.toUpperCase());
  }

  // Tanda tangan awal
  if (Array.isArray(config.signatories) && config.signatories.length >= 2) {
    const s1 = config.signatories[0];
    const s2 = config.signatories[1];

    setSafeText("cert-signer1-role", s1.title || "Ketua Divisi Akademik");
    setSafeText("cert-signer1-name", s1.name || "Nama Penandatangan 1");
    setSafeText("cert-signer1-id", s1.idNumber || "");
    setSafeText("cert-sig1-script", s1.name ? s1.name.split(" ")[0] : "Aditya");

    setSafeText("cert-signer2-role", s2.title || "Ketua Umum HMP");
    setSafeText("cert-signer2-name", s2.name || "Nama Penandatangan 2");
    setSafeText("cert-signer2-id", s2.idNumber || "");
    setSafeText("cert-sig2-script", s2.name ? s2.name.split(" ")[0] : "Nabila");
  }

  updateContactLinks(config);
}

/**
 * Update link bantuan kontak panitia
 */
function updateContactLinks(config) {
  const contactHelpBtn = document.getElementById("link-contact-help");
  const footerContactLink = document.getElementById("footer-contact-link");

  let helpUrl = "#";
  if (config.contactWhatsapp) {
    const cleanWa = config.contactWhatsapp.replace(/\D/g, "");
    const waMsg = encodeURIComponent("Halo Panitia Divisi Akademik HMP, saya butuh bantuan terkait sertifikat seminar saya.");
    helpUrl = `https://wa.me/${cleanWa}?text=${waMsg}`;
  } else if (config.contactEmail) {
    helpUrl = `mailto:${config.contactEmail}?subject=Bantuan%20Sertifikat%20Seminar%20HMP`;
  }

  if (contactHelpBtn) contactHelpBtn.href = helpUrl;
  if (footerContactLink) {
    footerContactLink.href = helpUrl;
    if (helpUrl !== "#") {
      footerContactLink.target = "_blank";
      footerContactLink.rel = "noopener noreferrer";
    }
  }
}

/**
 * Event Listeners
 */
function setupEventListeners() {
  const searchForm = document.getElementById("certificate-search-form");
  if (searchForm) {
    searchForm.addEventListener("submit", handleSearchSubmit);
  }

  const btnReload = document.getElementById("btn-reload-data");
  if (btnReload) {
    btnReload.addEventListener("click", () => loadData(true));
  }

  const btnRetry = document.getElementById("btn-retry-load");
  if (btnRetry) {
    btnRetry.addEventListener("click", () => loadData(false));
  }

  const btnUseFallback = document.getElementById("btn-use-fallback");
  if (btnUseFallback) {
    btnUseFallback.addEventListener("click", () => loadFallbackData());
  }

  const btnFocusSearch = document.getElementById("btn-focus-search");
  if (btnFocusSearch) {
    btnFocusSearch.addEventListener("click", () => {
      const nimInput = document.getElementById("nim-input");
      if (nimInput) {
        nimInput.focus();
        nimInput.select();
      }
    });
  }

  // Tombol Download PDF
  const btnDownloadPdf = document.getElementById("btn-download-pdf");
  if (btnDownloadPdf) {
    btnDownloadPdf.addEventListener("click", downloadCertificatePdf);
  }

  // Tombol Cetak Browser
  const btnPrintCert = document.getElementById("btn-print-cert");
  if (btnPrintCert) {
    btnPrintCert.addEventListener("click", () => {
      window.print();
    });
  }

  // Tombol Reset
  const btnResetSearch = document.getElementById("btn-reset-search");
  if (btnResetSearch) {
    btnResetSearch.addEventListener("click", resetSearchForm);
  }

  // Zoom Controls (50%, 60%, 80%, 100%, 150%)
  const zoomBtns = document.querySelectorAll(".zoom-controls button");
  zoomBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      zoomBtns.forEach(b => b.classList.remove("active"));
      const targetBtn = e.currentTarget;
      targetBtn.classList.add("active");
      const zoomValue = parseFloat(targetBtn.dataset.zoom || "1.0");
      currentZoomScale = zoomValue;
      applyZoom(zoomValue);
    });
  });

  // Modal Admin Guide
  const btnAdminGuide = document.getElementById("btn-admin-guide");
  const modalAdmin = document.getElementById("admin-modal");
  const btnCloseModal = document.getElementById("btn-close-modal");

  if (btnAdminGuide && modalAdmin) {
    btnAdminGuide.addEventListener("click", () => modalAdmin.classList.add("active"));
  }
  if (btnCloseModal && modalAdmin) {
    btnCloseModal.addEventListener("click", () => modalAdmin.classList.remove("active"));
  }
  if (modalAdmin) {
    modalAdmin.addEventListener("click", (e) => {
      if (e.target === modalAdmin) modalAdmin.classList.remove("active");
    });
  }
}

/**
 * Terapkan Skala Zoom pada Container Sertifikat
 * Menghitung dimensi container secara proporsional sehingga di 50%, 60%, 80%, 100%, 150%
 * sertifikat selalu centered, tidak terpotong, dan margin atas tetap ada.
 */
function applyZoom(scale) {
  const zoomContainer = document.getElementById("cert-zoom-container");
  const certTarget = document.getElementById("certificate-target");
  if (!zoomContainer || !certTarget) return;

  const baseWidth = 980;
  const baseHeight = 693;

  zoomContainer.style.width = `${baseWidth * scale}px`;
  zoomContainer.style.height = `${baseHeight * scale}px`;
  certTarget.style.transform = `scale(${scale})`;
}

/**
 * Memuat Data CSV (Google Sheets Tab Final atau Fallback)
 */
function loadData(forceReload = false) {
  const config = window.CONFIG || {};
  const primaryUrl = (config.csvUrl || "").trim();
  const fallbackUrl = (config.fallbackCsvUrl || "./data-dummy-sertifikat-v3.csv").trim();

  const targetUrl = primaryUrl ? primaryUrl : fallbackUrl;
  const isUsingFallback = !primaryUrl || primaryUrl === fallbackUrl;

  showLoadingState(true);
  hideAllFeedbackStates();

  const statusLabel = document.getElementById("data-status-text");
  const datasourceName = document.getElementById("datasource-name");

  if (statusLabel) statusLabel.textContent = "Mengunduh database...";
  if (datasourceName) {
    datasourceName.textContent = isUsingFallback ? "Data Sampel Lokal (data-dummy-sertifikat-v3.csv)" : "Google Sheets Terpublikasi (Tab Final)";
  }

  Papa.parse(targetUrl, {
    download: true,
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    complete: (results) => {
      showLoadingState(false);
      handleParsedCsv(results, isUsingFallback);
    },
    error: (err) => {
      console.warn("Gagal memuat CSV utama:", err);
      if (!isUsingFallback && fallbackUrl) {
        loadFallbackData("Gagal mengakses link Google Sheets. Dialihkan ke data demo lokal.");
      } else {
        showLoadingState(false);
        showErrorState("Tidak dapat mengambil file CSV. Periksa link publish Google Sheets di config.js.");
      }
    }
  });
}

function loadFallbackData(customMessage = null) {
  const config = window.CONFIG || {};
  const fallbackUrl = (config.fallbackCsvUrl || "./data-dummy-sertifikat-v3.csv").trim();

  showLoadingState(true);
  hideAllFeedbackStates();

  const datasourceName = document.getElementById("datasource-name");
  if (datasourceName) datasourceName.textContent = "Data Sampel Lokal (data-dummy-sertifikat-v3.csv)";

  Papa.parse(fallbackUrl, {
    download: true,
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    complete: (results) => {
      showLoadingState(false);
      handleParsedCsv(results, true);
      if (customMessage) console.info(customMessage);
    },
    error: (err) => {
      showLoadingState(false);
      showErrorState("Gagal memuat data fallback lokal: " + (err.message || "File tidak ditemukan"));
    }
  });
}

/**
 * Menangani Hasil Parsing CSV dan Normalisasi Kolom
 */
function handleParsedCsv(results, isFallback) {
  if (!results || !results.data || results.data.length === 0) {
    showErrorState("File CSV tidak memiliki baris data.");
    return;
  }

  const rawRows = results.data;
  const normalizedRows = [];

  rawRows.forEach((row) => {
    const normalized = normalizeRowKeys(row);
    if (normalized.nama && normalized.nim && normalized.seminar) {
      normalizedRows.push(normalized);
    }
  });

  if (normalizedRows.length === 0) {
    showErrorState("Kolom wajib (nama, nim, seminar) tidak ditemukan. Pastikan header sesuai format.");
    return;
  }

  participantsData = normalizedRows;

  const statusLabel = document.getElementById("data-status-text");
  if (statusLabel) {
    statusLabel.textContent = `Siap (${participantsData.length} data)`;
  }

  populateSeminarDropdown(participantsData);

  const btnSearch = document.getElementById("btn-search");
  if (btnSearch) btnSearch.disabled = false;
}

/**
 * Normalisasi Header Kolom & Data Row
 */
function normalizeRowKeys(row) {
  const result = {
    nama: "",
    nim: "",
    email: "",
    jenis: "peserta",
    desain: "klasik",
    seminar: "",
    tanggal: "",
    nomor_sertifikat: ""
  };

  for (const [key, rawValue] of Object.entries(row)) {
    if (!key || rawValue === undefined || rawValue === null) continue;

    const cleanKey = key.trim().toLowerCase().replace(/[\s_-]+/g, "");
    const value = String(rawValue).trim();

    if (cleanKey === "nama" || cleanKey === "namapeserta" || cleanKey === "namalengkap" || cleanKey === "name") {
      result.nama = value;
    } else if (cleanKey === "nim" || cleanKey === "nomorindukmahasiswa" || cleanKey === "nomhs" || cleanKey === "id") {
      result.nim = value;
    } else if (cleanKey === "email" || cleanKey === "surel" || cleanKey === "alamatemail" || cleanKey === "e-mail") {
      result.email = value;
    } else if (cleanKey === "jenis" || cleanKey === "peran" || cleanKey === "role" || cleanKey === "kategori") {
      result.jenis = window.normalizeJenis ? window.normalizeJenis(value) : (value.toLowerCase().includes("panitia") ? "panitia" : value.toLowerCase().includes("pemateri") ? "pemateri" : "peserta");
    } else if (cleanKey === "desain" || cleanKey === "design" || cleanKey === "tema" || cleanKey === "template") {
      result.desain = window.normalizeDesignId ? window.normalizeDesignId(value) : (value.trim().toLowerCase().replace(/\s+/g, "-") || "klasik");
    } else if (cleanKey === "seminar" || cleanKey === "namaseminar" || cleanKey === "judulseminar" || cleanKey === "kegiatan" || cleanKey === "event") {
      result.seminar = value;
    } else if (cleanKey === "tanggal" || cleanKey === "tgl" || cleanKey === "date" || cleanKey === "tanggalseminar") {
      result.tanggal = value;
    } else if (cleanKey === "nomorsertifikat" || cleanKey === "nosertifikat" || cleanKey === "nosertif" || cleanKey === "nomor" || cleanKey === "no") {
      result.nomor_sertifikat = value;
    }
  }

  return result;
}

/**
 * Mengisi Dropdown Seminar
 */
function populateSeminarDropdown(rows) {
  const seminarSelect = document.getElementById("seminar-select");
  if (!seminarSelect) return;

  const uniqueSeminars = Array.from(new Set(rows.map(r => r.seminar))).filter(Boolean);
  seminarSelect.innerHTML = "";

  if (uniqueSeminars.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- Tidak ada seminar aktif --";
    seminarSelect.appendChild(opt);
    seminarSelect.disabled = true;
    return;
  }

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "-- Pilih Seminar yang Diikuti --";
  seminarSelect.appendChild(defaultOpt);

  uniqueSeminars.forEach((semName) => {
    const opt = document.createElement("option");
    opt.value = semName;
    opt.textContent = semName;
    seminarSelect.appendChild(opt);
  });

  seminarSelect.disabled = false;
  if (uniqueSeminars.length === 1) {
    seminarSelect.selectedIndex = 1;
  }
}

/**
 * Handle Verifikasi Seminar + NIM + Email
 */
function handleSearchSubmit(e) {
  e.preventDefault();

  const seminarSelect = document.getElementById("seminar-select");
  const nimInput = document.getElementById("nim-input");
  const emailInput = document.getElementById("email-input");

  const selectedSeminar = (seminarSelect ? seminarSelect.value : "").trim();
  const inputNim = (nimInput ? nimInput.value : "").trim();
  const inputEmail = (emailInput ? emailInput.value : "").trim().toLowerCase();

  if (!selectedSeminar) {
    alert("Silakan pilih seminar terlebih dahulu.");
    if (seminarSelect) seminarSelect.focus();
    return;
  }
  if (!inputNim) {
    alert("Silakan masukkan NIM Anda.");
    if (nimInput) nimInput.focus();
    return;
  }
  if (!inputEmail) {
    alert("Silakan masukkan email terdaftar Anda.");
    if (emailInput) emailInput.focus();
    return;
  }

  // Filter semua baris yang cocok persis pada ketiga kunci
  const matched = participantsData.filter((row) => {
    const rowSeminar = (row.seminar || "").trim();
    const rowNim = (row.nim || "").toString().trim();
    const rowEmail = (row.email || "").toString().trim().toLowerCase();

    return rowSeminar === selectedSeminar && rowNim === inputNim && rowEmail === inputEmail;
  });

  if (matched.length > 0) {
    currentMatches = matched;
    currentParticipant = matched[0];
    setupRoleSwitcher(matched);
    renderCertificate(currentParticipant);
    showFoundState();
  } else {
    // ATURAN PRIVASI: Pesan kegagalan selalu seragam
    currentParticipant = null;
    currentMatches = [];
    showNotFoundState();
  }
}

/**
 * Mengatur switcher peran jika satu orang memiliki peran ganda di seminar yang sama
 */
function setupRoleSwitcher(matches) {
  const container = document.getElementById("role-switcher-container");
  const btnGroup = document.getElementById("role-buttons-group");
  if (!container || !btnGroup) return;

  if (matches.length <= 1) {
    container.style.display = "none";
    btnGroup.innerHTML = "";
    return;
  }

  container.style.display = "inline-flex";
  btnGroup.innerHTML = "";

  matches.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = index === 0 ? "btn-icon-small active" : "btn-icon-small";
    const roleCapital = item.jenis.charAt(0).toUpperCase() + item.jenis.slice(1);
    btn.textContent = `${roleCapital} (${item.desain})`;
    btn.addEventListener("click", () => {
      btnGroup.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentParticipant = item;
      renderCertificate(currentParticipant);
    });
    btnGroup.appendChild(btn);
  });
}

/**
 * Render Data ke Template Sertifikat
 * Mengatur data-desain dan data-jenis pada elemen sertifikat
 */
function renderCertificate(p) {
  const config = window.CONFIG || {};
  const certTarget = document.getElementById("certificate-target");
  if (!certTarget) return;

  const validDesign = window.normalizeDesignId ? window.normalizeDesignId(p.desain) : (p.desain || "klasik");
  const validJenis = window.normalizeJenis ? window.normalizeJenis(p.jenis) : (p.jenis || "peserta");

  // Set atribut CSS Theme & Role
  certTarget.setAttribute("data-desain", validDesign);
  certTarget.setAttribute("data-jenis", validJenis);

  // Ambil teks spesifik untuk jenis ini
  const roleConfig = (config.roleTexts && config.roleTexts[validJenis]) || {
    title: "SERTIFIKAT PENGHARGAAN",
    englishSub: "CERTIFICATE OF APPRECIATION",
    presentedTo: "DIBERIKAN DENGAN BANGGA KEPADA:",
    roleBadge: validJenis.toUpperCase(),
    paragraph: "Atas partisipasi dan kontribusinya dalam kegiatan:"
  };

  // Render teks secara aman dengan textContent
  setSafeText("cert-num-val", p.nomor_sertifikat || "000/HMP-AKAD/SEM/2026");
  setSafeText("cert-header-title", roleConfig.title);
  setSafeText("cert-sub-title", roleConfig.englishSub);
  setSafeText("cert-presented-label", roleConfig.presentedTo);
  setSafeText("cert-recipient-name", p.nama || "Nama Mahasiswa");
  setSafeText("cert-recipient-nim", `NIM. ${p.nim}`);
  setSafeText("cert-role-tag", roleConfig.roleBadge);
  setSafeText("cert-role-highlight", roleConfig.roleBadge);
  setSafeText("cert-seminar-title", p.seminar || "Seminar Nasional");
  setSafeText("cert-seminar-date", p.tanggal || "12 November 2026");

  const descEl = document.getElementById("cert-desc-paragraph");
  if (descEl) {
    descEl.innerHTML = `${roleConfig.paragraph.replace(roleConfig.roleBadge, `<span class="cert-event-role">${roleConfig.roleBadge}</span>`)}`;
  }

  // Info meta di toolbar
  setSafeText("cert-found-meta", `No: ${p.nomor_sertifikat || "-"} | Desain: ${validDesign} | Peran: ${validJenis}`);

  fitRecipientNameFont(p.nama || "");
}

/**
 * Auto-fit Font Size Nama Peserta agar tidak terpotong
 */
function fitRecipientNameFont(nameString) {
  const nameEl = document.getElementById("cert-recipient-name");
  if (!nameEl) return;

  const len = nameString.length;
  if (len > 52) {
    nameEl.style.fontSize = "1.2rem";
  } else if (len > 38) {
    nameEl.style.fontSize = "1.45rem";
  } else if (len > 28) {
    nameEl.style.fontSize = "1.65rem";
  } else {
    nameEl.style.fontSize = "1.85rem";
  }
}

/**
 * Download Sertifikat sebagai PDF A4 Landscape via html2canvas + jsPDF
 */
async function downloadCertificatePdf() {
  if (!currentParticipant) {
    alert("Tidak ada sertifikat aktif untuk diunduh.");
    return;
  }

  const certElement = document.getElementById("certificate-target");
  const zoomContainer = document.getElementById("cert-zoom-container");
  if (!certElement) return;

  const btnDownload = document.getElementById("btn-download-pdf");
  const originalHtml = btnDownload ? btnDownload.innerHTML : "";

  if (btnDownload) {
    btnDownload.disabled = true;
    btnDownload.innerHTML = `
      <svg class="spinner" style="width:16px;height:16px;margin:0 4px 0 0;display:inline-block;vertical-align:-2px;" viewBox="0 0 24 24"></svg>
      <span>Merender PDF...</span>
    `;
  }

  // Simpan nilai zoom & skala saat ini
  const prevTransform = certElement.style.transform;
  const prevWidth = zoomContainer ? zoomContainer.style.width : "";
  const prevHeight = zoomContainer ? zoomContainer.style.height : "";

  // Reset sementara ke ukuran kanvas murni 980x693 tanpa zoom agar tangkapan html2canvas tajam & presisi
  certElement.style.transform = "none";
  if (zoomContainer) {
    zoomContainer.style.width = "980px";
    zoomContainer.style.height = "693px";
  }

  try {
    if (typeof window.html2canvas !== "function" || !window.jspdf) {
      throw new Error("Library PDF (html2canvas/jsPDF) belum termuat.");
    }

    const canvas = await window.html2canvas(certElement, {
      scale: 2, // 2x resolusi tajam
      useCORS: true,
      logging: false,
      backgroundColor: null
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    // Masukkan ke A4 Landscape: 297mm x 210mm
    pdf.addImage(imgData, "JPEG", 0, 0, 297, 210);

    const safeName = (currentParticipant.nama || "Peserta").replace(/[^a-zA-Z0-9]/g, "_");
    const safeRole = (currentParticipant.jenis || "Sertifikat").toUpperCase();
    const safeNim = (currentParticipant.nim || "NIM").replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `Sertifikat_${safeRole}_${safeName}_${safeNim}.pdf`;

    pdf.save(filename);
  } catch (err) {
    console.error("Gagal membuat PDF via html2canvas + jsPDF:", err);
    alert("Gagal mengunduh PDF secara otomatis. Silakan gunakan tombol 'Cetak (A4)' lalu pilih 'Save as PDF'.");
  } finally {
    // Kembalikan skala zoom aktif
    certElement.style.transform = prevTransform;
    if (zoomContainer) {
      zoomContainer.style.width = prevWidth;
      zoomContainer.style.height = prevHeight;
    }
    if (btnDownload) {
      btnDownload.disabled = false;
      btnDownload.innerHTML = originalHtml;
    }
  }
}

/**
 * Reset Form
 */
function resetSearchForm() {
  currentParticipant = null;
  currentMatches = [];
  const nimInput = document.getElementById("nim-input");
  const emailInput = document.getElementById("email-input");

  if (nimInput) nimInput.value = "";
  if (emailInput) emailInput.value = "";

  hideAllFeedbackStates();
  if (nimInput) nimInput.focus();
}

function setSafeText(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = text;
}

function hideAllFeedbackStates() {
  const sError = document.getElementById("state-error");
  const sNotFound = document.getElementById("state-not-found");
  const sFound = document.getElementById("state-found");

  if (sError) sError.style.display = "none";
  if (sNotFound) sNotFound.style.display = "none";
  if (sFound) sFound.style.display = "none";
}

function showLoadingState(show) {
  const sLoading = document.getElementById("state-loading");
  if (sLoading) sLoading.style.display = show ? "block" : "none";
}

function showErrorState(msg) {
  hideAllFeedbackStates();
  const sError = document.getElementById("state-error");
  const errorMsg = document.getElementById("error-message");
  if (errorMsg && msg) errorMsg.textContent = msg;
  if (sError) sError.style.display = "block";
}

function showNotFoundState() {
  hideAllFeedbackStates();
  const sNotFound = document.getElementById("state-not-found");
  if (sNotFound) {
    sNotFound.style.display = "block";
    sNotFound.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function showFoundState() {
  hideAllFeedbackStates();
  const sFound = document.getElementById("state-found");
  if (sFound) {
    sFound.style.display = "block";
    sFound.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
