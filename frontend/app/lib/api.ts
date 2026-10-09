// api.ts
// Helper terpusat untuk semua request ke backend API
// Menggunakan access token dari auth.ts secara otomatis

import { getAccessToken } from "./auth";

const BASE_URL = "http://localhost:8080";

// Helper dasar — otomatis sisipkan Authorization header
async function apiFetch(path: string, options?: RequestInit) {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "omit",
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    throw new Error(data.error || data.message || "Terjadi kesalahan");
  }
  return data;
}

// =============================================
// ADMIN STATS
// =============================================
export interface AdminStats {
  total_mahasiswa: number;
  total_dosen: number;
  total_matkul: number;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await apiFetch("/api/admin/stats");
  return res.data as AdminStats;
}

// =============================================
// PENCARIAN USER
// =============================================
export interface SearchResult {
  tipe: "mahasiswa" | "dosen";
  nama_lengkap: string;
  identifier: string; // NIM atau NIDN
  email: string;
  detail: string;     // Prodi atau Departemen
}

export async function searchUsers(q: string): Promise<SearchResult[]> {
  const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`);
  return res.data as SearchResult[];
}

// =============================================
// DATA DOSEN (untuk Cari User / halaman dosen)
// =============================================
export interface Dosen {
  id: string;
  nidn: string;
  nama_lengkap: string;
  gelar_depan: string | null;
  gelar_belakang: string | null;
  departemen: string;
  email?: string;
}

export async function fetchAllDosen(): Promise<Dosen[]> {
  const res = await apiFetch("/api/users/dosen");
  return (res.data as Dosen[]) || [];
}

// =============================================
// PESAN (MESSAGES)
// =============================================
export async function kirimPesan(isi_pesan: string) {
  const res = await apiFetch("/api/pesan", {
    method: "POST",
    body: JSON.stringify({ isi_pesan }),
  });
  return res.data;
}

export async function fetchAdminPesan() {
  const res = await apiFetch("/api/admin/pesan");
  return res.data;
}

export async function markPesanAsRead(id: string) {
  const res = await apiFetch(`/api/admin/pesan/${id}/read`, {
    method: "PUT",
  });
  return res.data;
}

// =============================================
// DATA MAHASISWA (untuk Admin - Kelola Mahasiswa)
// =============================================
export interface Mahasiswa {
  id: string;
  nim: string;
  nama_lengkap: string;
  program_studi: string;
  angkatan: number;
  jalur_masuk: string | null;
  status_ukt: boolean;
  status_bip: boolean;
  izin_krs: boolean;
}

export async function fetchAllMahasiswa(): Promise<Mahasiswa[]> {
  const res = await apiFetch("/api/admin/mahasiswa");
  return (res.data as Mahasiswa[]) || [];
}

export async function createMahasiswa(payload: Record<string, any>) {
  const res = await apiFetch("/api/admin/mahasiswa", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateMahasiswa(id: string, payload: Record<string, any>) {
  const res = await apiFetch(`/api/admin/mahasiswa/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteMahasiswa(id: string) {
  const res = await apiFetch(`/api/admin/mahasiswa/${id}`, {
    method: "DELETE",
  });
  return res.data;
}

export async function createDosen(payload: Record<string, any>) {
  const res = await apiFetch("/api/admin/dosen", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateDosen(id: string, payload: Record<string, any>) {
  const res = await apiFetch(`/api/admin/dosen/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteDosen(id: string) {
  const res = await apiFetch(`/api/admin/dosen/${id}`, {
    method: "DELETE",
  });
  return res.data;
}

// =============================================
// DATA MATA KULIAH
// =============================================
export interface MataKuliah {
  id: string;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  semester: number;
  program_studi: string;
}

export async function fetchAllMataKuliah(): Promise<MataKuliah[]> {
  const res = await apiFetch("/api/admin/mata-kuliah");
  return (res.data as MataKuliah[]) || [];
}

export async function createMataKuliah(payload: Record<string, any>) {
  const res = await apiFetch("/api/admin/mata-kuliah", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateMataKuliah(id: string, payload: Record<string, any>) {
  const res = await apiFetch(`/api/admin/mata-kuliah/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteMataKuliah(id: string) {
  const res = await apiFetch(`/api/admin/mata-kuliah/${id}`, {
    method: "DELETE",
  });
  return res.data;
}

// Pagination
export interface PaginatedResult<T> {
  items: T[];
  total_items: number;
  total_pages: number;
  page: number;
  limit: number;
}

export async function fetchMataKuliahPaginated(
  page: number = 1,
  limit: number = 20,
  prodi?: string,
  search?: string
): Promise<PaginatedResult<MataKuliah>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (prodi && prodi !== "Semua") {
    params.append("prodi", prodi);
  }
  if (search && search.trim() !== "") {
    params.append("search", search.trim());
  }
  const res = await apiFetch(`/api/admin/mata-kuliah/paginated?${params.toString()}`);
  return res.data as PaginatedResult<MataKuliah>;
}

// =============================================
// BERITA / PENGUMUMAN
// =============================================
export interface Berita {
  id: string;
  judul: string;
  isi: string;
  kategori: string;
  created_at: string;
}

export async function fetchBerita(): Promise<Berita[]> {
  const res = await apiFetch("/api/berita");
  return (res.data as Berita[]) || [];
}

export async function createBerita(payload: Record<string, any>) {
  const res = await apiFetch("/api/admin/berita", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteBerita(id: string) {
  const res = await apiFetch(`/api/admin/berita/${id}`, {
    method: "DELETE",
  });
  return res.data;
}

// =============================================
// AKADEMIK (KRS & KELAS)
// =============================================
export interface Kelas {
  id: string;
  mata_kuliah_id: string;
  dosen_id: string;
  kode_kelas: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  ruangan: string;
  kapasitas: number;
  terisi: number;
  semester_akademik: string;
  nama_mata_kuliah: string;
  nama_dosen: string;
  sks: number;
}

export interface KRS {
  id: string;
  mahasiswa_id: string;
  kelas_id: string;
  semester_akademik: string;
  status: "pending" | "disetujui" | "ditolak";
  catatan?: string;
  nilai_tugas?: number;
  nilai_uts?: number;
  nilai_uas?: number;
  nilai_akhir?: number;
  nilai_huruf?: string;
  bobot?: number;
  status_nilai?: string;
  kode_mk?: string;
  nama_mata_kuliah: string;
  kode_kelas: string;
  sks: number;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  nama_dosen: string;
}

export async function fetchAvailableKelas(semester: string = "Ganjil 2024/2025"): Promise<Kelas[]> {
  const res = await apiFetch(`/api/akademik/kelas/tersedia?semester=${encodeURIComponent(semester)}`);
  return (res.data as Kelas[]) || [];
}

export async function fetchKRS(semester: string = "Ganjil 2024/2025"): Promise<KRS[]> {
  const res = await apiFetch(`/api/akademik/krs?semester=${encodeURIComponent(semester)}`);
  return (res.data as KRS[]) || [];
}

export async function enrollKelas(kelasId: string, semester: string) {
  const res = await apiFetch("/api/akademik/krs/ambil", {
    method: "POST",
    body: JSON.stringify({ kelas_id: kelasId, semester }),
  });
  return res.data;
}

export async function dropKelas(krsId: string) {
  const res = await apiFetch(`/api/akademik/krs/batal/${krsId}`, {
    method: "DELETE",
  });
  return res.data;
}

export interface ProfilKRS {
  nim: string;
  nama_lengkap: string;
  program_studi: string;
  angkatan: number;
  semester_sekarang: number;
  semester_akademik: string;
  ips_semester_lalu: number;
  total_sks_kumulatif: number;
  total_sks_lulus: number;
  ipk: number;
  nama_dosen_wali: string;
  max_sks: number;
  status_ukt: boolean;
  status_bip: boolean;
  izin_krs: boolean;
}

export async function fetchProfilKRS(): Promise<ProfilKRS> {
  const res = await apiFetch("/api/akademik/profil-krs");
  return res.data as ProfilKRS;
}

// =============================================
// KHS, TRANSKRIP, & PENILAIAN AKADEMIK
// =============================================
export interface KHSItem {
  krs_id: string;
  kode_mk: string;
  nama_mk: string;
  kode_kelas: string;
  sks: number;
  nilai_tugas?: number;
  nilai_uts?: number;
  nilai_uas?: number;
  nilai_akhir?: number;
  nilai_huruf: string;
  bobot: number;
  total_sks_bobot: number;
  status_nilai: string;
}

export interface KHSResponse {
  nim: string;
  nama_lengkap: string;
  program_studi: string;
  semester_akademik: string;
  items: KHSItem[];
  total_sks_semester: number;
  total_bobot_semester: number;
  ips: number;
  total_sks_kumulatif: number;
  ipk: number;
  max_sks_depan: number;
}

export interface TranskripItem {
  kode_mk: string;
  nama_mk: string;
  sks: number;
  nilai_huruf: string;
  bobot: number;
  total_bobot: number;
  semester_akademik: string;
  lulus: boolean;
}

export interface TranskripSemester {
  semester_akademik: string;
  items: TranskripItem[];
  total_sks: number;
  ips: number;
}

export interface TranskripResponse {
  nim: string;
  nama_lengkap: string;
  program_studi: string;
  semesters: TranskripSemester[];
  total_sks_tempuh: number;
  total_sks_lulus: number;
  total_bobot: number;
  ipk: number;
}

export async function fetchKHS(semester?: string): Promise<KHSResponse> {
  const url = semester ? `/api/akademik/khs?semester=${encodeURIComponent(semester)}` : "/api/akademik/khs";
  const res = await apiFetch(url);
  return res.data as KHSResponse;
}

export async function fetchTranskrip(): Promise<TranskripResponse> {
  const res = await apiFetch("/api/akademik/transkrip");
  return res.data as TranskripResponse;
}

export async function fetchAcademicSemesters(): Promise<string[]> {
  const res = await apiFetch("/api/akademik/semesters");
  return (res.data as string[]) || [];
}

// Penilaian Dosen Pengajar
export interface MahasiswaNilaiKelasItem {
  krs_id: string;
  mahasiswa_id: string;
  nim: string;
  nama_lengkap: string;
  nilai_tugas?: number;
  nilai_uts?: number;
  nilai_uas?: number;
  nilai_akhir?: number;
  nilai_huruf?: string;
  bobot?: number;
  status_nilai: string;
}

export interface InputNilaiItem {
  krs_id: string;
  nilai_tugas: number;
  nilai_uts: number;
  nilai_uas: number;
}

export interface InputNilaiRequest {
  kelas_id: string;
  nilai: InputNilaiItem[];
  publish: boolean;
}

export async function fetchMahasiswaNilaiKelas(kelasId: string): Promise<MahasiswaNilaiKelasItem[]> {
  const res = await apiFetch(`/api/dosen/kelas/${kelasId}/nilai`);
  return (res.data as MahasiswaNilaiKelasItem[]) || [];
}

export async function inputNilaiKelas(payload: InputNilaiRequest): Promise<void> {
  await apiFetch("/api/dosen/kelas/nilai", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function publishNilaiKelas(kelasId: string): Promise<void> {
  await apiFetch(`/api/dosen/kelas/${kelasId}/publish-nilai`, {
    method: "POST",
  });
}



// --- KELAS ADMIN API ---
export async function fetchAllKelas(): Promise<Kelas[]> {
  const res = await apiFetch('/api/admin/kelas');
  return res.data || [];
}

export async function createKelas(payload: Partial<Kelas>): Promise<Kelas> {
  const res = await apiFetch('/api/admin/kelas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateKelas(id: string, payload: Partial<Kelas>): Promise<Kelas> {
  const res = await apiFetch(`/api/admin/kelas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteKelas(id: string): Promise<void> {
  await apiFetch(`/api/admin/kelas/${id}`, {
    method: 'DELETE',
  });
}

// =============================================
// PAYMENT / UISI PAY (MAHASISWA)
// =============================================
export interface Tagihan {
  id: string;
  type: string;
  amount: number;
  dueDate: string;
  status: "Belum Bayar" | "Lunas" | "Menunggu Verifikasi";
}

export interface Transaksi {
  id: string;
  order_id: string;
  jenis_tagihan: string;
  jumlah: number;
  status: string;
  metode_pembayaran?: string;
  snap_token?: string;
  va_number?: string;
  bank?: string;
  bill_key?: string;
  biller_code?: string;
  payment_type?: string;
  expiry_time?: string;
  settlement_time?: string;
  pdf_url?: string;
  created_at: string;
}

export interface PaymentConfig {
  client_key: string;
  is_production: boolean;
  snap_url: string;
}

export async function fetchPaymentConfig(): Promise<PaymentConfig> {
  const res = await apiFetch("/api/payment/config");
  return res.data;
}

export async function fetchTagihan(): Promise<Tagihan[]> {
  const res = await apiFetch("/api/payment/tagihan");
  return res.data || [];
}

export async function fetchTransaksi(): Promise<Transaksi[]> {
  const res = await apiFetch("/api/payment/transaksi");
  return res.data || [];
}

export async function fetchActivePendingTransaksi(): Promise<Transaksi | null> {
  const res = await apiFetch("/api/payment/active-pending");
  return res.data || null;
}

export async function checkoutPayment(jenis_tagihan: string, amount: number): Promise<Transaksi> {
  const res = await apiFetch("/api/payment/checkout", {
    method: "POST",
    body: JSON.stringify({ jenis_tagihan, amount }),
  });
  return res.data;
}

export async function syncPaymentStatus(orderId: string): Promise<Transaksi> {
  const res = await apiFetch(`/api/payment/sync/${orderId}`, {
    method: "POST",
  });
  return res.data;
}

export async function cancelPayment(orderId: string): Promise<Transaksi> {
  const res = await apiFetch(`/api/payment/cancel/${orderId}`, {
    method: "POST",
  });
  return res.data;
}

// =============================================
// PERPUSTAKAAN (LIBRARY)
// =============================================
export interface Buku {
  id: string;
  judul: string;
  penulis: string;
  penerbit: string;
  tahun_terbit: number;
  isbn: string;
  stok: number;
  cover_url: string;
}

export interface PeminjamanBuku {
  id: string;
  user_id: string;
  buku_id: string;
  tanggal_pinjam: string;
  tenggat_waktu: string;
  tanggal_kembali: string | null;
  status: string;
  buku?: Buku;
}

export async function fetchAllBuku(): Promise<Buku[]> {
  const res = await apiFetch("/api/perpustakaan/buku");
  return res.data || [];
}

export async function pinjamBuku(buku_id: string): Promise<PeminjamanBuku> {
  const res = await apiFetch("/api/perpustakaan/pinjam", {
    method: "POST",
    body: JSON.stringify({ buku_id }),
  });
  return res.data;
}

export async function fetchPeminjamanSaya(): Promise<PeminjamanBuku[]> {
  const res = await apiFetch("/api/perpustakaan/peminjaman/me");
  return res.data || [];
}

export async function createBukuAdmin(payload: Partial<Buku>): Promise<Buku> {
  const res = await apiFetch("/api/admin/perpustakaan/buku", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function kembalikanBukuAdmin(id: string): Promise<void> {
  await apiFetch(`/api/admin/perpustakaan/kembali/${id}`, {
    method: "PUT",
  });
}
