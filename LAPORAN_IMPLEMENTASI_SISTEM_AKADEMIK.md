# Laporan Implementasi Sistem Informasi Akademik (SIAKAD)
## Transformasi Penilaian Akademik, KHS, Transkrip Nilai, & Portal Dosen Pengajar

**Universitas Internasional Semen Indonesia (UISI)**  
*Dokumen Rangkuman & Spesifikasi Teknis Implementasi*

---

## 1. Ringkasan Eksekutif

Sistem Informasi Akademik (SIAKAD) sebelumnya memiliki keterbatasan di mana modul **Kartu Hasil Studi (KHS)**, **Transkrip Nilai**, dan **Riwayat Studi** masih menggunakan data tiruan (dummy mockup hardcoded) serta belum terintegrasi dengan basis data relasional dan logika bisnis penilaian perguruan tinggi.

Implementasi ini mentransformasikan SIAKAD menjadi sistem akademik terintegrasi secara *full-stack*, meliputi:
1. **Model Relasional & Migrasi Database PostgreSQL**: Penambahan skema penilaian akademik berbobot pada tabel `krs`.
2. **Formula Akademik Terstandarisasi**: Perhitungan Nilai Akhir, Konversi Nilai Huruf, Bobot IP, IPS, IPK, dan Ambang Batas Beban SKS Semester Depan secara dinamis.
3. **Layanan Backend (Golang & Chi)**: Penyediaan endpoint RESTful untuk KHS, Transkrip Kumulatif, Daftar Semester, serta Penilaian Mahasiswa oleh Dosen Pengajar.
4. **Antarmuka Mahasiswa (React, TypeScript & TailwindCSS)**: Tampilan KHS dan Transkrip interaktif dengan filter semester dinamis, lencana predikat nilai, serta tata letak cetak dokumen resmi (*print-ready layout*).
5. **Portal Penilaian Dosen Pengajar**: Modul input nilai kelas dengan perhitungan kalkulasi instan di sisi klien (*real-time preview*) serta alur publikasi nilai (*draft* vs *published*).

---

## 2. Struktur Formula & Kebijakan Akademik

### 2.1 Formula Nilai Akhir
Nilai akhir mata kuliah dihitung dengan pembobotan standar akademik UISI:
$$\text{Nilai Akhir} = (0.30 \times \text{Nilai Tugas}) + (0.35 \times \text{Nilai UTS}) + (0.35 \times \text{Nilai UAS})$$

### 2.2 Tabel Konversi Nilai Huruf dan Bobot
| Rentang Nilai Akhir | Nilai Huruf | Bobot | Keterangan Kelulusan |
| :---: | :---: | :---: | :---: |
| $\ge 85.00$ | **A** | 4.00 | Lulus (Sangat Memuaskan) |
| $75.00 - 84.99$ | **AB** | 3.50 | Lulus (Antara Baik & Sangat Baik) |
| $65.00 - 74.99$ | **B** | 3.00 | Lulus (Baik) |
| $60.00 - 64.99$ | **BC** | 2.50 | Lulus (Antara Cukup & Baik) |
| $55.00 - 59.99$ | **C** | 2.00 | Lulus (Cukup / Batas Kelulusan) |
| $40.00 - 54.99$ | **D** | 1.00 | Tidak Lulus (Kurang) |
| $< 40.00$ | **E** | 0.00 | Tidak Lulus (Gagal) |

> **Catatan Kelulusan**: Mata kuliah dinyatakan **Lulus** dan SKS-nya diakui ke dalam Total SKS Lulus jika memperoleh predikat minimal **C** (Bobot $\ge 2.00$).

### 2.3 Perhitungan Indeks Prestasi (IPS & IPK)
- **Indeks Prestasi Semester (IPS)**:
  $$\text{IPS} = \frac{\sum (\text{SKS}_i \times \text{Bobot}_i)}{\sum \text{SKS}_i} \quad \text{(untuk semester terpilih)}$$
- **Indeks Prestasi Kumulatif (IPK)**:
  $$\text{IPK} = \frac{\sum_{\text{semua semester}} (\text{SKS}_j \times \text{Bobot}_j)}{\sum_{\text{semua semester}} \text{SKS}_j}$$

### 2.4 Ambang Batas Pengambilan SKS Semester Berikutnya
Berdasarkan perolehan IPS mahasiswa pada semester terakhir:
- $\text{IPS} < 2.00 \longrightarrow$ Maksimal **18 SKS**
- $2.00 \le \text{IPS} < 2.50 \longrightarrow$ Maksimal **20 SKS**
- $2.50 \le \text{IPS} < 3.00 \longrightarrow$ Maksimal **22 SKS**
- $\text{IPS} \ge 3.00 \longrightarrow$ Maksimal **24 SKS**

---

## 3. Rincian Perubahan & Implementasi Teknis

### 3.1 Basis Data (PostgreSQL)
- **File**: `backend/db/migrations/000017_add_grading_system_to_krs.up.sql`
- **Tabel**: `krs`
- **Kolom Baru**:
  - `nilai_tugas` (`NUMERIC(5,2)`): Nilai tugas/formatif skala 0–100.
  - `nilai_uts` (`NUMERIC(5,2)`): Nilai Ujian Tengah Semester.
  - `nilai_uas` (`NUMERIC(5,2)`): Nilai Ujian Akhir Semester.
  - `nilai_akhir` (`NUMERIC(5,2)`): Hasil perhitungan terbobot.
  - `nilai_huruf` (`VARCHAR(5)`): Predikat mutu (A, AB, B, BC, C, D, E).
  - `bobot` (`NUMERIC(4,2)`): Angka bobot mutu (0.00 s.d 4.00).
  - `status_nilai` (`VARCHAR(20)`): Status publikasi (`draft` atau `published`).
- **Indeks**: `idx_krs_status_nilai` untuk akselerasi query filter nilai resmi.

### 3.2 Lapisan Model & Data Transfer Object (Golang)
- **File**: `backend/internal/model/academic.go`
- **Entitas yang Diperbarui / Ditambahkan**:
  - `KRS`: Menambahkan field grading dan alias join nama mata kuliah, kode kelas, SKS, jadwal.
  - `KHSItem` & `KHSResponse`: DTO representasi Kartu Hasil Studi per semester.
  - `TranskripItem`, `TranskripSemester`, `TranskripResponse`: DTO transkrip kumulatif lengkap.
  - `MahasiswaNilaiKelasItem`: DTO daftar nilai mahasiswa per kelas untuk portal dosen.
  - `InputNilaiRequest`: Payload input & publikasi nilai dosen.

### 3.3 Lapisan Repository (Golang)
- **File**: `backend/internal/akademik/repository.go`
- **Metode yang Diimplementasikan**:
  - `GetKHSMahasiswa(ctx, mahasiswaID, semester)`: Mengambil seluruh KRS berstatus disetujui, mengagregasi SKS dan bobot, serta memanggil fungsi penentuan batas SKS depan.
  - `GetTranskripMahasiswa(ctx, mahasiswaID)`: Mengambil seluruh riwayat studi, mengelompokkan per semester, dan menghitung SKS tempuh vs SKS lulus.
  - `GetSemestersMahasiswa(ctx, mahasiswaID)`: Mengambil daftar semester unik yang pernah diikuti mahasiswa.
  - `GetProfilKRS(ctx, mahasiswaID)`: Menghitung nilai riil akumulasi SKS kumulatif, SKS lulus, dan IPK aktif mahasiswa.
  - `GetMahasiswaNilaiByKelas(ctx, kelasID)`: Query join KRS dan User/Mahasiswa untuk antarmuka dosen pengajar.
  - `UpdateNilaiKRS(ctx, krsID, tugas, uts, uas, akhir, huruf, bobot, statusNilai)`: Eksekusi update nilai per baris KRS secara terisolasi.

### 3.4 Lapisan Service & Logika Bisnis (Golang)
- **File**: `backend/internal/akademik/service.go`
- **Fungsi Utama**:
  - `HitungNilaiAkhirDanHuruf(tugas, uts, uas)`: Helper kalkulasi otomatis nilai akhir dan konversi huruf mutu.
  - `HitungBatasSKS(ips)`: Helper kalkulasi beban SKS semester depan.
  - `InputNilaiKelas(ctx, req)`: Memvalidasi rentang nilai (0–100), menghitung skor akhir, dan menyimpan sebagai draft atau published.
  - `PublishNilaiKelas(ctx, kelasID)`: Mempublikasikan seluruh nilai mahasiswa di suatu kelas secara sekaligus.

### 3.5 Lapisan Router & Handler API (Golang)
- **File**: `backend/cmd/api/main.go` & `backend/internal/akademik/handler.go`
- **Daftar Endpoint Baru**:
  | Metode | Rute Endpoint | Akses Hak | Keterangan |
  | :--- | :--- | :--- | :--- |
  | `GET` | `/api/akademik/khs?semester=...` | Mahasiswa / Auth | Mengambil data KHS resmi per semester |
  | `GET` | `/api/akademik/transkrip` | Mahasiswa / Auth | Mengambil transkrip nilai kumulatif |
  | `GET` | `/api/akademik/semesters` | Mahasiswa / Auth | Mengambil daftar semester mahasiswa |
  | `GET` | `/api/dosen/kelas/{id}/nilai` | Dosen | Mengambil daftar mahasiswa dan nilai di kelas |
  | `POST` | `/api/dosen/kelas/nilai` | Dosen | Menginput / menyimpan draft nilai kelas |
  | `POST` | `/api/dosen/kelas/{id}/publish-nilai` | Dosen | Mempublikasikan nilai kelas secara resmi |

### 3.6 Antarmuka Pengguna & Frontend (React & TypeScript)
- **File**: `frontend/app/lib/api.ts`
  - Menyediakan kontrak antarmuka TypeScript (`KHSResponse`, `TranskripResponse`, `MahasiswaNilaiKelasItem`, `InputNilaiRequest`, `ProfilKRS`).
  - Fungsi pemanggil REST API terpadu (`fetchKHS`, `fetchTranskrip`, `fetchAcademicSemesters`, `fetchMahasiswaNilaiKelas`, `inputNilaiKelas`, `publishNilaiKelas`).
- **File**: `frontend/app/components/siakad/KHSView.tsx`
  - Menghapus mock data.
  - Dropdown dinamis pemilihan semester akademik dari database.
  - Tabel rincian mata kuliah dengan badge predikat mutu, nilai tugas/UTS/UAS, dan total kredit.
  - Rangkuman kinerja: Card IPS, IPK, Total SKS Kumulatif, dan Beban Maks SKS Semester Depan.
  - Fitur cetak (`window.print()`) berstandar dokumen resmi perguruan tinggi.
- **File**: `frontend/app/components/siakad/TranskripView.tsx`
  - Menghapus mock data.
  - Rincian riwayat akademik dikelompokkan per semester lengkap dengan status kelulusan.
  - Ringkasan total SKS tempuh, total SKS lulus, kredit bobot, dan IPK kumulatif.
  - Kop surat resmi Universitas Internasional Semen Indonesia dengan kolom pengesahan pimpinan akademik.
- **File**: `frontend/app/components/siakad/RiwayatStudiView.tsx`
  - Terintegrasi dengan profil dan riwayat transkrip nilai dinamis.
  - Tab riwayat reguler dan transfer/ekuivalensi.
- **File**: `frontend/app/components/siakad/DashboardHome.tsx`
  - IPK dan total SKS kini mengambil langsung dari `profil.ipk` dan `profil.total_sks_kumulatif`.
  - Tombol dan kartu statistik terhubung langsung ke tampilan Transkrip (`?view=transkrip`).
- **File**: `frontend/app/components/dosen/DosenWaliPortal.tsx`
  - Penambahan tab navigasi **Input Nilai Kelas** bagi Dosen Pengajar.
  - Pemilihan kelas perkuliahan yang diampu.
  - Form input dinamis nilai Tugas (30%), UTS (35%), dan UAS (35%) dengan preview real-time nilai akhir dan grade huruf.
  - Tombol "Simpan Draft" dan "Publikasikan Nilai Resmi".
- **File**: `frontend/app/routes/dashboard.krs.tsx`
  - Perbaikan bug duplikasi rendering tag `<DosenWaliPortal />`.

---

## 4. Hasil Pengujian & Verifikasi

1. **Pemeriksaan Kode Go (`go vet ./...`)**:
   - Status: **Lolos (Exit code 0)** tanpa *vet issue* atau kesalahan *interface*.
2. **Kompilasi Backend Binary (`go build ./cmd/api`)**:
   - Status: **Berhasil (18.4 MB binary)** tanpa kesalahan tautan atau ketergantungan.
3. **Pemeriksaan Statis TypeScript Frontend (`npx tsc --noEmit`)**:
   - Status: **Lolos (Exit code 0)** tanpa error *type mismatch*, *undefined variable*, atau *syntax error*.
4. **Verifikasi Database & Migrasi**:
   - Skema `siakad_migrations` berhasil menerapkan `000017_add_grading_system_to_krs.up.sql`.
   - Backend aktif berjalan di port `8080` dan Frontend aktif di port `5173`.

---

*Laporan ini disusun secara otomatis sebagai dokumentasi penyelesaian siklus implementasi modul akademik terintegrasi SIAKAD UISI.*
