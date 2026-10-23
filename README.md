# Panduan Generator Sertifikat Seminar HMP - Divisi Akademik

Aplikasi website resmi Divisi Akademik HMP untuk mempermudah peserta mengunduh sertifikat seminar secara mandiri, sekaligus menyediakan alat cetak massal khusus panitia yang dilindungi oleh sistem login Supabase Auth.

---

## 📌 Ringkasan Halaman Aplikasi

1. **Halaman Publik Peserta (`/`)**:
   - Peserta memilih nama seminar, memasukkan NIM dan Email terdaftar.
   - Sertifikat langsung muncul dan bisa diunduh sebagai PDF A4 atau dicetak.
   - Bebas login dan tidak ada tautan ke halaman panitia.
2. **Halaman Katalog Desain (`/galeri`)**:
   - Panitia dapat melihat 15 contoh desain sertifikat, memilih jenis peran, dan menyalin ID desain untuk ditempelkan ke Google Sheets.
3. **Halaman Panitia Cetak Massal (`/panitia-x7k2`)**:
   - Alamat rahasia (*unlisted slug*) yang dilindungi sistem login Supabase Auth.
   - Digunakan panitia untuk mencetak sertifikat sekaligus banyak (hingga 50 lembar per kelompok cetak).
   - Dilengkapi saklar tanda tangan basah (tinta pulpen asli).

---

## 🔐 Panduan Lengkap Menyiapkan Login Panitia (Supabase Auth)

Panduan ini ditulis langkah demi langkah untuk orang awam. Anda tidak perlu paham bahasa pemrograman untuk mengikutinya.

### Langkah 1: Membuat Akun & Project di Supabase (Gratis)
1. Buka situs [supabase.com](https://supabase.com) di browser Anda.
2. Klik tombol hijau **"Start your project"** atau **"Sign In"**.
   > 💡 **Saran Penting:** Disarankan mendaftar menggunakan email resmi organisasi HMP dengan password yang kuat, bukan akun pribadi milik salah satu panitia, agar kepengurusan berikutnya tetap bisa mengaksesnya.
3. Setelah masuk, klik tombol **"New Project"**.
4. Isi data project:
   - **Name**: Beri nama project, misalnya `Sertifikat HMP Akademik`.
   - **Database Password**: Buat password yang kuat (simpan di catatan panitia).
   - **Region**: Pilih wilayah terdekat (misalnya `Singapore`).
   - **Pricing Plan**: Pilih **Free** (Gratis).
5. Klik **"Create new project"** dan tunggu sekitar 1-2 menit hingga proses pembuatan selesai.

---

### Langkah 2: Mengatur Pengamanan Autentikasi (Wajib)
Secara bawaan, Supabase mengizinkan siapa saja mendaftar. Kita harus mematikannya agar **hanya panitia** yang bisa masuk:

1. Di menu sebelah kiri dashboard Supabase, klik menu **Authentication** (ikon gembok) &gt; pilih **Providers**.
2. Klik bagian **Email** dan pastikan statusnya **Active** (ON).
3. Cari opsi bertuliskan **"Allow new users to sign up"** lalu geser tombolnya ke posisi **NONAKTIF (OFF)**.
   *(Ini mencegah orang luar atau mahasiswa mendaftar sendiri).*
4. Klik tombol **Save** di bagian bawah.

---

### Langkah 3: Menambah Akun Panitia Pertama Kali
1. Di menu **Authentication**, klik submenu **Users**.
2. Klik tombol hijau **"Add user"** lalu pilih **"Create user"**.
3. Masukkan:
   - **Email**: Masukkan email panitia (misalnya: `panitia.akademik@hmp.org`).
   - **Password**: Masukkan password sementara yang aman.
   - **Auto Confirm User**: **Centang** kotak ini agar akun langsung aktif tanpa perlu membuka link verifikasi email.
4. Klik **"Create user"**. Akun panitia Anda sekarang sudah siap digunakan untuk login!

---

### Langkah 4: Mengambil Project URL dan Anon Key
1. Di menu sebelah kiri paling bawah, klik ikon gerigi **Project Settings** (Pengaturan Proyek).
2. Pilih submenu **API** (pada beberapa versi dashboard baru bernama **API Keys**).
3. Anda akan melihat dua informasi penting:
   - **Project URL**: Bentuknya seperti `https://abcdefghijklm.supabase.co`.
   - **Project API Keys**: Cari kunci yang berlabel **`anon`** atau **`public`** (dimulai dengan `eyJhbGci...`).
4. Salin kedua nilai tersebut.

> ⚠️ **PERINGATAN KERAS KEAMANAN:**
> Di halaman API tersebut terdapat kunci lain bernama **`service_role` (secret)**.
> **JANGAN PERNAH** menyalin, menempel, atau membagikan kunci `service_role` ke file kode, file `.env`, atau ke orang lain! Kunci `service_role` memiliki kuasa penuh untuk menghapus data project. Aplikasi ini **hanya membutuhkan Project URL dan anon key**.

---

### Langkah 5: Memasukkan Kunci ke Laptop (File `.env`)
1. Buka folder proyek ini di laptop Anda.
2. Cari file bernama **`.env`** (jika belum ada, buat file baru bernama `.env`).
3. Buka file `.env` dengan Notepad atau editor teks, lalu isi kedua baris berikut dengan nilai yang Anda salin dari Langkah 4:
   ```env
   VITE_SUPABASE_URL="https://abcdefghijklm.supabase.co"
   VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
   ```
4. Simpan file (`Ctrl + S`).
5. Jalankan aplikasi atau refresh browser laptop Anda. Sekarang halaman panitia sudah bisa digunakan untuk login!

---

### Langkah 6: PENTING! Mengisi Kunci di Layanan Hosting Web
Ketika Anda mengunggah (*hosting*) website ini ke internet (misalnya di **Netlify**, **Vercel**, atau **Cloudflare Pages**), file `.env` di laptop **tidak ikut ter-upload** demi alasan keamanan.

Oleh karena itu, Anda wajib memasukkannya ke panel hosting:
1. Buka dashboard hosting Anda (misalnya Netlify / Vercel).
2. Masuk ke menu **Site settings** &gt; pilih **Environment variables**.
3. Tambahkan dua variabel yang sama persis seperti di laptop:
   - Variabel 1:
     - Key: `VITE_SUPABASE_URL`
     - Value: `https://abcdefghijklm.supabase.co`
   - Variabel 2:
     - Key: `VITE_SUPABASE_ANON_KEY`
     - Value: `eyJhbGciOi...`
4. Klik **Save**, lalu lakukan **Deploy Ulang (Redeploy)** website.
> ⚠️ **Catatan Penting:** Jika Anda lupa mengisi Environment variables di hosting, website di internet akan menampilkan pesan *"Login belum dikonfigurasi, hubungi admin"*.

---

## 👥 Cara Mengelola Akun Panitia di Kemudian Hari

Semua pengelolaan akun dilakukan melalui dashboard resmi Supabase:

1. **Menambah Akun Panitia Baru**:
   - Buka Supabase &gt; **Authentication** &gt; **Users** &gt; klik **Add user** &gt; **Create user** &gt; Centang *Auto Confirm*.
2. **Menghapus Akun Panitia**:
   - Pada daftar **Users**, klik tanda titik tiga `...` di sebelah email panitia yang ingin dihapus &gt; pilih **Delete user**.
3. **Mereset Password**:
   - Panitia bisa mengklik tombol **"Lupa password?"** langsung di layar login aplikasi web. Tautan reset password akan otomatis dikirim ke email panitia tersebut.
   - Atau admin bisa mengirim tautan reset manual lewat dashboard Supabase: klik tanda titik tiga `...` pada user &gt; pilih **Send password recovery**.

---

## ⏸️ Catatan Penting: Project Supabase Gratis yang Ter-Pause

Pada paket gratis (*Free plan*), jika dalam waktu 7 hari berturut-turut tidak ada aktivitas di dashboard maupun login, Supabase akan menonaktifkan sementara project Anda (*Paused*) untuk menghemat server:

- **Cara Mengaktifkannya Kembali (Sangat Mudah):**
  1. Buka [supabase.com/dashboard](https://supabase.com/dashboard).
  2. Anda akan melihat tulisan kuning **"Project is paused"**.
  3. Cukup klik tombol hijau **"Restore project"**.
  4. Tunggu sekitar 1 menit, dan project akan aktif normal kembali tanpa ada data yang hilang!

---

## 🔍 Penjelasan Jujur Mengenai Batas Keamanan

- **Yang Dilindungi:** Sistem login Supabase Auth ini melindungi **halaman dan antarmuka alat cetak massal**. Orang yang tidak memiliki email dan password panitia tidak akan bisa membuka antarmuka cetak massal maupun memicu proses cetak.
- **Yang Belum Dilindungi (Link CSV):** Data peserta bersumber dari link CSV Google Sheets yang dipublikasikan ke web (*Publish to web*). Link CSV tersebut secara teknis bisa diakses siapa saja yang mengetahui URL pastinya.
  - Untuk perlindungan penuh data CSV di masa depan, dibutuhkan sistem backend proxy (fase berikutnya).
  - Oleh karena itu, pastikan tab Google Sheets yang dipublikasikan **hanya tab 'Final'** (berisi nama, NIM, email, jenis, desain, seminar, tanggal, nomor_sertifikat), dan **jangan pernah mempublikasikan tab data mentah presensi**.

---

## 🛠️ Cara Menguji Semua Kriteria Penerimaan

1. **Uji Tanpa Login (Route Guard)**:
   - Buka alamat panitia: `/panitia-x7k2`.
   - Yang tampil hanyalah kotak formulir login. Tidak ada data CSV yang diunduh dan tidak ada tabel peserta yang bocor.
2. **Uji Login Gagal (Pesan Kesalahan Seragam)**:
   - Masukkan email asal atau password yang salah.
   - Sistem selalu menampilkan pesan umum: *"Email atau password salah"*.
3. **Uji Login Berhasil**:
   - Masukkan email dan password panitia yang dibuat di Langkah 3.
   - Antarmuka alat cetak massal terbuka lengkap dengan tabel data, filter, dan tombol cetak.
4. **Uji Cetak Massal A4 Landscape**:
   - Centang beberapa peserta pada tabel (maksimal 50 lembar per kelompok).
   - Klik tombol **"Cetak Massal"**.
   - Dialog cetak browser akan terbuka dengan format A4 Landscape pas 1 halaman per sertifikat tanpa elemen tombol atau navigasi website.
5. **Uji Tombol Keluar (Logout)**:
   - Klik tombol merah **"Keluar"** di pojok kanan atas.
   - Anda langsung dikeluarkan dari sesi dan tidak bisa mengakses alat cetak lagi tanpa login ulang.
