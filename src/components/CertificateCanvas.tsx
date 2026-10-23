import React, { forwardRef, useMemo } from 'react';
import { CONFIG, normalizeDesignId, normalizeJenis } from '../config';
import { Participant, SignerInfo } from '../types';

interface CertificateCanvasProps {
  data: Partial<Participant>;
  isWetSignature?: boolean;
  signatoriesOverride?: SignerInfo[];
  className?: string;
  style?: React.CSSProperties;
}

export const CertificateCanvas = forwardRef<HTMLDivElement, CertificateCanvasProps>(
  ({ data, isWetSignature = false, signatoriesOverride, className = '', style }, ref) => {
    const rawDesign = data.desain || 'klasik';
    const rawJenis = data.jenis || 'peserta';

    const designId = normalizeDesignId(rawDesign);
    const jenis = normalizeJenis(rawJenis);

    const roleConfig = CONFIG.roleTexts[jenis] || CONFIG.roleTexts.peserta;
    const signers = signatoriesOverride || CONFIG.signatories;

    const signer1 = signers[0] || {
      title: 'Ketua Divisi Akademik',
      name: 'Aditya Pratama, S.Kom.',
      idNumber: 'NIM. 2108561050',
    };
    const signer2 = signers[1] || {
      title: 'Ketua Umum HMP',
      name: 'Nabila Zahra Khairunnisa',
      idNumber: 'NIM. 2108561012',
    };

    // Auto-fit ukuran font nama peserta agar nama bergelar panjang tidak keluar batas
    const recipientName = data.nama || 'Nama Peserta Lengkap';
    const nameFontSize = useMemo(() => {
      const len = recipientName.length;
      if (len > 52) return '1.15rem';
      if (len > 38) return '1.4rem';
      if (len > 28) return '1.65rem';
      return '1.85rem';
    }, [recipientName]);

    return (
      <div
        ref={ref}
        className={`certificate-canvas ${className}`}
        data-desain={designId}
        data-jenis={jenis}
        style={style}
      >
        <div className="cert-outer-border">
          {/* Corner Ornaments */}
          <div className="cert-corner cert-corner-tl" />
          <div className="cert-corner cert-corner-tr" />
          <div className="cert-corner cert-corner-bl" />
          <div className="cert-corner cert-corner-br" />

          {/* Watermark Lambang */}
          <div className="cert-watermark" aria-hidden="true">
            <svg viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 5 L85 20 L85 55 C85 75 50 95 50 95 C50 95 15 75 15 55 L15 20 Z" />
            </svg>
          </div>

          <div className="cert-inner-border">
            <div className="cert-content">
              {/* 1. Header Lembaga & Logo */}
              <div className="cert-header">
                <div className="w-[52px] h-[52px] flex items-center justify-center">
                  <svg width="48" height="48" viewBox="0 0 100 100" fill="none">
                    <polygon
                      points="50,5 92,26 92,74 50,95 8,74 8,26"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="rgba(0,0,0,0.03)"
                    />
                    <path d="M50 18 L76 32 L50 46 L24 32 Z" fill="currentColor" />
                    <polygon
                      points="50,50 70,62 70,72 50,82 30,72 30,62"
                      fill="var(--aksen, #c59b27)"
                    />
                    <circle cx="50" cy="46" r="4" fill="#ffffff" />
                  </svg>
                </div>

                <div className="flex-1 px-3">
                  <div className="cert-org-name">{CONFIG.organizationName}</div>
                  <div className="cert-univ-name">
                    {[CONFIG.divisionName, CONFIG.universityName].filter(Boolean).join(' • ')}
                  </div>
                </div>

                <div className="w-[52px] h-[52px] flex items-center justify-center">
                  <svg width="48" height="48" viewBox="0 0 100 100" fill="none">
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      stroke="var(--aksen, #c59b27)"
                      strokeWidth="3"
                      strokeDasharray="3 3"
                    />
                    <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="2" />
                    <path
                      d="M50 20 L58 38 L78 38 L62 50 L68 68 L50 56 L32 68 L38 50 L22 38 L42 38 Z"
                      fill="var(--aksen, #c59b27)"
                    />
                  </svg>
                </div>
              </div>

              {/* 2. Judul Sertifikat */}
              <div>
                <h2 className="cert-main-title">{roleConfig.title}</h2>
                <div className="cert-sub-title">{roleConfig.englishSub}</div>
                <div className="cert-number">
                  <span>No: </span>
                  <span>{data.nomor_sertifikat || '---/HMP-AKAD/---/2026'}</span>
                </div>
              </div>

              {/* 3. Penerima Sertifikat */}
              <div>
                <div className="cert-presented-to">{roleConfig.presentedTo}</div>
                <div className="cert-name-container">
                  <div className="cert-recipient-name" style={{ fontSize: nameFontSize }}>
                    {recipientName}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 flex-wrap mt-1">
                  <span className="cert-nim-badge">
                    {data.nim ? `NIM. ${data.nim}` : 'NIM. ------------'}
                  </span>
                  <span className="cert-role-tag">{roleConfig.roleBadge}</span>
                </div>
              </div>

              {/* 4. Deskripsi Partisipasi & Nama Seminar */}
              <div className="px-5">
                <p className="cert-event-desc">
                  {roleConfig.paragraph.split(roleConfig.roleBadge).map((part, idx, arr) => (
                    <React.Fragment key={idx}>
                      {part}
                      {idx < arr.length - 1 && (
                        <span className="cert-role-tag mx-1 text-[0.7rem] px-2 py-0.5">
                          {roleConfig.roleBadge}
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </p>
                <h3 className="cert-seminar-title">{data.seminar || 'Nama Seminar Nasional'}</h3>
                <div className="cert-seminar-date">
                  <span>Dilaksanakan pada: </span>
                  <strong>{data.tanggal || '12 November 2026'}</strong>
                </div>
              </div>

              {/* 5. Tanda Tangan & Ornamen Segel */}
              <div className="cert-footer-section">
                {/* Penandatangan 1 */}
                <div className="cert-signer">
                  <div className="cert-signer-role">{signer1.title}</div>
                  <div className="cert-signature-area">
                    {isWetSignature ? (
                      /* Saklar TTD Basah Aktif: Kosongkan untuk tanda tangan basah tinta */
                      <div className="w-32 border-b border-dashed border-gray-400 opacity-60 h-4" />
                    ) : signer1.signatureImage ? (
                      <img
                        src={signer1.signatureImage}
                        alt="TTD 1"
                        className="cert-signature-img signature-img-loadable"
                      />
                    ) : (
                      <span className="cert-signature-script">
                        {signer1.name ? signer1.name.split(' ')[0] : 'Aditya'}
                      </span>
                    )}
                  </div>
                  <div className="cert-signer-name">{signer1.name}</div>
                  <div className="cert-signer-id">{signer1.idNumber}</div>
                </div>

                {/* Segel Emas Resmi */}
                <div className="cert-seal">
                  <div className="seal-circle">
                    <span className="seal-text-top">HMP AKADEMIK</span>
                    <div className="seal-icon">★</div>
                    <span className="seal-text-bottom">EXCELLENCE</span>
                  </div>
                </div>

                {/* Penandatangan 2 */}
                <div className="cert-signer">
                  <div className="cert-signer-role">{signer2.title}</div>
                  <div className="cert-signature-area">
                    {isWetSignature ? (
                      /* Saklar TTD Basah Aktif: Kosongkan untuk tanda tangan basah tinta */
                      <div className="w-32 border-b border-dashed border-gray-400 opacity-60 h-4" />
                    ) : signer2.signatureImage ? (
                      <img
                        src={signer2.signatureImage}
                        alt="TTD 2"
                        className="cert-signature-img signature-img-loadable"
                      />
                    ) : (
                      <span className="cert-signature-script">
                        {signer2.name ? signer2.name.split(' ')[0] : 'Nabila'}
                      </span>
                    )}
                  </div>
                  <div className="cert-signer-name">{signer2.name}</div>
                  <div className="cert-signer-id">{signer2.idNumber}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CertificateCanvas.displayName = 'CertificateCanvas';
