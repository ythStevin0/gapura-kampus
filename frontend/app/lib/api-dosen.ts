// api-dosen.ts
// Helper terpusat untuk semua request Dosen Wali ke backend API

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
    throw new Error(data.error || data.message || "Terjadi kesalahan");
  }
  return data;
}

// =============================================
// DOSEN PROFIL
// =============================================
export interface DosenInfo {
  nama_lengkap: string;
  nidn: string;
  departemen: string;
  gelar_depan?: string;
  gelar_belakang?: string;
}

export async function fetchDosenProfil(): Promise<DosenInfo> {
  const res = await apiFetch("/api/dosen/profil");
  return res.data as DosenInfo;
}

// =============================================
// DOSEN DASHBOARD SUMMARY
// =============================================
export interface DosenSummary {
  total_asuhan: number;
  total_pending: number;
  total_disetujui: number;
  total_ditolak: number;
}

export async function fetchDosenDashboard(): Promise<DosenSummary> {
  const res = await apiFetch("/api/dosen/dashboard");
  return res.data as DosenSummary;
}

// =============================================
// MAHASISWA ASUHAN
// =============================================
export interface MahasiswaAsuhan {
  id: string;
  nim: string;
  nama_lengkap: string;
  program_studi: string;
  angkatan: number;
  status_ukt: boolean;
  status_bip: boolean;
  dosen_wali_id?: string;
  krs_pending: number;
  krs_disetujui: number;
}

export async function fetchMahasiswaAsuhan(): Promise<MahasiswaAsuhan[]> {
  const res = await apiFetch("/api/dosen/wali/mahasiswa");
  return (res.data as MahasiswaAsuhan[]) || [];
}

// =============================================
// KRS MAHASISWA (untuk Dosen Wali)
// =============================================
export interface KRSItem {
  id: string;
  nama_mata_kuliah: string;
  kode_kelas: string;
  sks: number;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  nama_dosen: string;
  status: "pending" | "disetujui" | "ditolak";
  catatan?: string;
}

export async function fetchKRSMahasiswa(mahasiswaId: string): Promise<KRSItem[]> {
  const res = await apiFetch(`/api/dosen/wali/mahasiswa/${mahasiswaId}/krs`);
  return (res.data as KRSItem[]) || [];
}

export async function approveKRS(krsId: string): Promise<void> {
  await apiFetch(`/api/dosen/wali/krs/${krsId}/approve`, { method: "PUT" });
}

export async function rejectKRS(krsId: string, catatan: string): Promise<void> {
  await apiFetch(`/api/dosen/wali/krs/${krsId}/reject`, {
    method: "PUT",
    body: JSON.stringify({ catatan: catatan || "Ditolak oleh Dosen Wali" }),
  });
}

export async function approveAllKRS(mahasiswaId: string): Promise<{ approved: number }> {
  const res = await apiFetch(`/api/dosen/wali/mahasiswa/${mahasiswaId}/krs/approve-all`, {
    method: "PUT",
  });
  return res.data as { approved: number };
}

// =============================================
// MAHAKARYA REVIEW (untuk Dosen Wali)
// =============================================
export interface MahakaryaSubmission {
  id: string;
  title: string;
  category: string;
  description: string;
  portfolio_url: string;
  status: "pending" | "approved" | "rejected";
  reason?: string;
  mahasiswa_nama: string;
  mahasiswa_nim: string;
  created_at: string;
  updated_at: string;
}

export async function fetchMahakaryaToReview(): Promise<MahakaryaSubmission[]> {
  const res = await apiFetch("/api/dosen/wali/mahakarya");
  return (res.data as MahakaryaSubmission[]) || [];
}

export async function reviewMahakarya(
  id: string,
  status: "approved" | "rejected",
  reason?: string
): Promise<void> {
  await apiFetch(`/api/dosen/wali/mahakarya/${id}/review`, {
    method: "PUT",
    body: JSON.stringify({ status, reason: reason || "" }),
  });
}
