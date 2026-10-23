/**
 * =========================================================================
 * GALERI.JS - LOGIKA HALAMAN KATALOG 15 DESAIN SERTIFIKAT PANITIA
 * =========================================================================
 * 
 * Khusus untuk panitia:
 * - Menampilkan 15 desain siap pakai dengan data contoh (dummy).
 * - Mengubah semua preview sekaligus berdasarkan jenis (peserta, panitia, pemateri).
 * - Filter cepat suasana (semua, formal, santai, terang, gelap).
 * - Modal preview besar yang pas di layar HP & tombol salin ID desain ke clipboard.
 */

const DUMMY_DATA = {
  nama: "Muhammad Abdurrahman Al-Fatih",
  seminar: "Seminar Contoh Divisi Akademik",
  tanggal: "12 November 2026",
  nomor: "001/PST/SEM-AKD/XI/2026"
};

let activeJenis = "peserta";
let activeFilter = "semua";
let activeModalDesignId = null;

document.addEventListener("DOMContentLoaded", () => {
  renderGalleryCards();
  setupGalleryControls();
  setupModalEvents();
  setupResizeObserver();
});

/**
 * Render 15 Kartu Desain ke Grid
 */
function renderGalleryCards() {
  const grid = document.getElementById("designs-grid");
  if (!grid) return;

  const designs = (window.CONFIG && window.CONFIG.designs) || [];
  grid.innerHTML = "";

  designs.forEach((design) => {
    const card = document.createElement("div");
    card.className = "design-card";
    card.dataset.designId = design.id;
    card.dataset.suasana = (design.suasana || []).join(" ");

    // Suasana badges HTML
    const suasanaBadgesHtml = (design.suasana || [])
      .map(s => `<span class="badge-suasana ${s}">${s}</span>`)
      .join("");

    card.innerHTML = `
      <div class="card-preview-holder" title="Klik untuk memperbesar">
        <div class="card-preview-inner" data-preview-id="${design.id}">
          ${generateCertificateHTML(design.id, activeJenis, DUMMY_DATA)}
        </div>
      </div>
      <div class="card-info">
        <div>
          <div class="card-header-line">
            <h3 class="card-title">${escapeHtml(design.nama)}</h3>
            <span class="card-id-badge">${escapeHtml(design.id)}</span>
          </div>
          <div class="card-suasana-badges">
            ${suasanaBadgesHtml}
          </div>
          <p class="card-desc">${escapeHtml(design.ciri)}</p>
        </div>
        <div class="card-actions">
          <button type="button" class="btn btn-primary btn-copy-card" data-id="${design.id}" style="padding: 0.5rem 0.75rem; font-size: 0.8125rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
            </svg>
            <span>Salin ID Desain</span>
          </button>
          <button type="button" class="btn btn-secondary btn-zoom-card" data-id="${design.id}" style="padding: 0.5rem 0.75rem; font-size: 0.8125rem;" title="Lihat ukuran besar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Event klik preview untuk buka modal
    const previewHolder = card.querySelector(".card-preview-holder");
    previewHolder.addEventListener("click", () => openModal(design.id));

    // Event klik tombol zoom
    const zoomBtn = card.querySelector(".btn-zoom-card");
    zoomBtn.addEventListener("click", () => openModal(design.id));

    // Event tombol salin
    const copyBtn = card.querySelector(".btn-copy-card");
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyToClipboard(design.id);
    });

    grid.appendChild(card);
  });

  // Skalakan semua mini preview agar pas dalam kartu
  scaleAllMiniPreviews();
  applySuasanaFilter();
}

/**
 * Menghasilkan komponen HTML Sertifikat standar untuk satu tema & peran
 */
function generateCertificateHTML(designId, jenis, data) {
  const config = window.CONFIG || {};
  const roleConfig = (config.roleTexts && config.roleTexts[jenis]) || {
    title: "SERTIFIKAT PESERTA",
    englishSub: "CERTIFICATE OF PARTICIPATION",
    presentedTo: "DIBERIKAN DENGAN BANGGA KEPADA:",
    roleBadge: jenis.toUpperCase(),
    paragraph: "Atas partisipasi aktif dan kontribusinya dalam kegiatan:"
  };

  const orgName = config.organizationName || "HIMPUNAN MAHASISWA PROGRAM STUDI";
  const univName = [config.divisionName || "DIVISI AKADEMIK", config.universityName || "FAKULTAS ILMU KOMPUTER"].join(" • ").toUpperCase();

  const signer1 = (config.signatories && config.signatories[0]) || { title: "Ketua Divisi Akademik", name: "Aditya Pratama, S.Kom.", idNumber: "NIM. 2108561050" };
  const signer2 = (config.signatories && config.signatories[1]) || { title: "Ketua Umum HMP", name: "Nabila Zahra Khairunnisa", idNumber: "NIM. 2108561012" };

  return `
    <div class="certificate-canvas" data-desain="${escapeHtml(designId)}" data-jenis="${escapeHtml(jenis)}">
      <div class="cert-outer-border">
        <div class="cert-corner cert-corner-tl"></div>
        <div class="cert-corner cert-corner-tr"></div>
        <div class="cert-corner cert-corner-bl"></div>
        <div class="cert-corner cert-corner-br"></div>

        <div class="cert-watermark" aria-hidden="true">
          <svg viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 5 L85 20 L85 55 C85 75 50 95 50 95 C50 95 15 75 15 55 L15 20 Z" />
          </svg>
        </div>

        <div class="cert-inner-border">
          <div class="cert-content">
            <!-- Header -->
            <div class="cert-header">
              <div class="cert-logo-left">
                <svg width="52" height="52" viewBox="0 0 100 100" fill="none">
                  <polygon points="50,5 92,26 92,74 50,95 8,74 8,26" stroke="currentColor" stroke-width="4" fill="rgba(0,0,0,0.03)" />
                  <path d="M50 18 L76 32 L50 46 L24 32 Z" fill="currentColor" />
                  <polygon points="50,50 70,62 70,72 50,82 30,72 30,62" fill="var(--aksen)" />
                  <circle cx="50" cy="46" r="4" fill="#ffffff" />
                </svg>
              </div>
              <div class="cert-org-details">
                <div class="cert-org-name">${escapeHtml(orgName)}</div>
                <div class="cert-univ-name">${escapeHtml(univName)}</div>
              </div>
              <div class="cert-logo-right">
                <svg width="52" height="52" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="44" stroke="var(--aksen)" stroke-width="3" stroke-dasharray="3 3" />
                  <circle cx="50" cy="50" r="38" stroke="currentColor" stroke-width="2" />
                  <path d="M50 20 L58 38 L78 38 L62 50 L68 68 L50 56 L32 68 L38 50 L22 38 L42 38 Z" fill="var(--aksen)" />
                </svg>
              </div>
            </div>

            <!-- Title -->
            <div class="cert-title-group">
              <h2 class="cert-main-title">${escapeHtml(roleConfig.title)}</h2>
              <div class="cert-sub-title">${escapeHtml(roleConfig.englishSub)}</div>
              <div class="cert-number"><span>No: </span>${escapeHtml(data.nomor)}</div>
            </div>

            <!-- Recipient -->
            <div class="cert-recipient-section">
              <div class="cert-presented-to">${escapeHtml(roleConfig.presentedTo)}</div>
              <div class="cert-name-container">
                <div class="cert-recipient-name" style="font-size: 1.55rem;">${escapeHtml(data.nama)}</div>
              </div>
              <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; flex-wrap: wrap;">
                <span class="cert-nim-badge">NIM. 2101005</span>
                <span class="cert-role-tag">${escapeHtml(roleConfig.roleBadge)}</span>
              </div>
            </div>

            <!-- Event -->
            <div class="cert-event-section">
              <p class="cert-event-desc">
                ${escapeHtml(roleConfig.paragraph)}
              </p>
              <h3 class="cert-seminar-title">${escapeHtml(data.seminar)}</h3>
              <div class="cert-seminar-date">
                <span>Dilaksanakan pada: </span><strong>${escapeHtml(data.tanggal)}</strong>
              </div>
            </div>

            <!-- Footer Signatures -->
            <div class="cert-footer-section">
              <div class="cert-signer">
                <div class="cert-signer-role">${escapeHtml(signer1.title)}</div>
                <div class="cert-signature-area">
                  <span class="cert-signature-script">Aditya Pratama</span>
                </div>
                <div class="cert-signer-name">${escapeHtml(signer1.name)}</div>
                <div class="cert-signer-id">${escapeHtml(signer1.idNumber)}</div>
              </div>

              <div class="cert-seal">
                <div class="seal-circle">
                  <span class="seal-text-top">HMP AKADEMIK</span>
                  <div class="seal-icon">★</div>
                  <span class="seal-text-bottom">EXCELLENCE</span>
                </div>
              </div>

              <div class="cert-signer">
                <div class="cert-signer-role">${escapeHtml(signer2.title)}</div>
                <div class="cert-signature-area">
                  <span class="cert-signature-script">Nabila Zahra</span>
                </div>
                <div class="cert-signer-name">${escapeHtml(signer2.name)}</div>
                <div class="cert-signer-id">${escapeHtml(signer2.idNumber)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Menghitung Skala Preview Mini agar pas di dalam Kartu
 */
function scaleAllMiniPreviews() {
  const holders = document.querySelectorAll(".card-preview-holder");
  holders.forEach(holder => {
    const cardWidth = holder.clientWidth;
    if (cardWidth > 0) {
      const scale = cardWidth / 980;
      const inner = holder.querySelector(".card-preview-inner");
      if (inner) {
        inner.style.transform = `scale(${scale})`;
      }
    }
  });
}

/**
 * Filter Suasana (Semua, Formal, Santai, Terang, Gelap)
 */
function applySuasanaFilter() {
  const cards = document.querySelectorAll(".design-card");
  cards.forEach(card => {
    const suasanaList = (card.dataset.suasana || "").toLowerCase().split(" ");
    if (activeFilter === "semua" || suasanaList.includes(activeFilter)) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
}

/**
 * Event Controls (Peran & Suasana)
 */
function setupGalleryControls() {
  // Pilihan Jenis (Peserta, Panitia, Pemateri)
  const roleButtons = document.querySelectorAll('[data-jenis]');
  roleButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      roleButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeJenis = btn.dataset.jenis;

      // Update semua 15 kartu secara cepat
      document.querySelectorAll(".card-preview-inner").forEach(inner => {
        const dId = inner.dataset.previewId;
        inner.innerHTML = generateCertificateHTML(dId, activeJenis, DUMMY_DATA);
      });

      // Update modal jika sedang terbuka
      if (activeModalDesignId) {
        updateModalContent(activeModalDesignId);
      }
    });
  });

  // Filter Suasana
  const filterButtons = document.querySelectorAll('[data-filter]');
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      applySuasanaFilter();
    });
  });
}

/**
 * Setup Modal Preview Besar
 */
function setupModalEvents() {
  const modal = document.getElementById("gallery-preview-modal");
  const closeBtn = document.getElementById("btn-close-gallery-modal");
  const copyBtn = document.getElementById("btn-modal-copy-id");

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Tombol Esc menutup modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      if (activeModalDesignId) {
        copyToClipboard(activeModalDesignId);
      }
    });
  }
}

function openModal(designId) {
  activeModalDesignId = designId;
  const modal = document.getElementById("gallery-preview-modal");
  if (!modal) return;

  updateModalContent(designId);
  modal.classList.add("active");
}

function updateModalContent(designId) {
  const config = window.CONFIG || {};
  const design = (config.designs || []).find(d => d.id === designId) || { nama: designId, id: designId };

  const titleEl = document.getElementById("modal-design-title");
  const idEl = document.getElementById("modal-design-id");
  const zoomContainer = document.getElementById("modal-zoom-container");
  const viewport = document.getElementById("modal-viewport");

  if (titleEl) titleEl.textContent = `Desain: ${design.nama}`;
  if (idEl) idEl.textContent = `ID: ${design.id} (Salin ke kolom 'desain' di Sheets)`;

  if (zoomContainer && viewport) {
    zoomContainer.innerHTML = generateCertificateHTML(designId, activeJenis, DUMMY_DATA);
    
    // Sesuaikan skala agar pas di layar HP maupun desktop
    const viewportWidth = viewport.clientWidth - 32;
    const scale = Math.min(1.0, Math.max(0.32, viewportWidth / 980));

    zoomContainer.style.width = `${980 * scale}px`;
    zoomContainer.style.height = `${693 * scale}px`;

    const certCanvas = zoomContainer.querySelector(".certificate-canvas");
    if (certCanvas) {
      certCanvas.style.transform = `scale(${scale})`;
      certCanvas.style.transformOrigin = "top left";
    }
  }
}

function closeModal() {
  activeModalDesignId = null;
  const modal = document.getElementById("gallery-preview-modal");
  if (modal) modal.classList.remove("active");
}

/**
 * Salin ID Desain ke Clipboard dengan Fallback
 */
function copyToClipboard(text) {
  if (!text) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showCopyToast(`Tersalin: ${text}`))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand("copy");
    showCopyToast(`Tersalin: ${text}`);
  } catch (err) {
    alert(`ID Desain: ${text}\n(Silakan salin teks ini secara manual)`);
  }
  document.body.removeChild(textarea);
}

/**
 * Menampilkan Toast Umpan Balik Salin
 */
function showCopyToast(message) {
  const toast = document.getElementById("copy-toast");
  const textEl = document.getElementById("copy-toast-text");
  if (!toast || !textEl) return;

  textEl.textContent = message;
  toast.classList.add("show");

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

/**
 * Observer Resize agar preview mini selalu responsif saat jendela diubah
 */
function setupResizeObserver() {
  window.addEventListener("resize", () => {
    scaleAllMiniPreviews();
    if (activeModalDesignId) {
      updateModalContent(activeModalDesignId);
    }
  });
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
