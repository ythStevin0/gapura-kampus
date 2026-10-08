import React, { useMemo } from "react";
import { useNavigate } from "react-router";
import { 
  fetchAvailableKelas, 
  fetchMahasiswaNilaiKelas, 
  inputNilaiKelas, 
  type Kelas, 
  type MahasiswaNilaiKelasItem, 
  type InputNilaiRequest 
} from "../../lib/api";

const API_BASE = "http://localhost:8080";

interface KRS {
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

interface MahasiswaAsuhan {
  id: string;
  nim: string;
  nama_lengkap: string;
  program_studi: string;
  angkatan: number;
  status_ukt: boolean;
  status_bip: boolean;
  krs_pending: number;
  krs_disetujui: number;
}

interface DosenSummary {
  total_asuhan: number;
  total_pending: number;
  total_disetujui: number;
  total_ditolak: number;
}

interface DosenInfo {
  nama_lengkap: string;
  nidn: string;
  departemen: string;
  gelar_depan?: string;
  gelar_belakang?: string;
}

function hitungNilaiPreview(tugas: number, uts: number, uas: number) {
  const akhir = (0.30 * tugas) + (0.35 * uts) + (0.35 * uas);
  let huruf = "E";
  let bobot = 0.0;
  if (akhir >= 85) { huruf = "A"; bobot = 4.0; }
  else if (akhir >= 75) { huruf = "AB"; bobot = 3.5; }
  else if (akhir >= 65) { huruf = "B"; bobot = 3.0; }
  else if (akhir >= 60) { huruf = "BC"; bobot = 2.5; }
  else if (akhir >= 55) { huruf = "C"; bobot = 2.0; }
  else if (akhir >= 40) { huruf = "D"; bobot = 1.0; }
  else { huruf = "E"; bobot = 0.0; }
  return { akhir, huruf, bobot };
}

export function DosenWaliPortal({ token }: { token: string }) {
  const [view, setView] = React.useState<"dashboard" | "persetujuan" | "nilai">("dashboard");
  const [summary, setSummary] = React.useState<DosenSummary | null>(null);
  const [dosen, setDosen] = React.useState<DosenInfo | null>(null);
  const [mahasiswaList, setMahasiswaList] = React.useState<MahasiswaAsuhan[]>([]);
  const [selectedMahasiswa, setSelectedMahasiswa] = React.useState<MahasiswaAsuhan | null>(null);
  const [krsList, setKrsList] = React.useState<KRS[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [rejectModal, setRejectModal] = React.useState<{ krsId: string; namaMK: string } | null>(null);
  const [rejectCatatan, setRejectCatatan] = React.useState("");
  const [toast, setToast] = React.useState<{ type: "success" | "error"; msg: string } | null>(null);
  const navigate = useNavigate();

  // State untuk Input Nilai Kelas
  const [kelasList, setKelasList] = React.useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = React.useState<Kelas | null>(null);
  const [mahasiswaNilaiList, setMahasiswaNilaiList] = React.useState<MahasiswaNilaiKelasItem[]>([]);
  const [nilaiInputs, setNilaiInputs] = React.useState<Record<string, { tugas: number; uts: number; uas: number }>>({});
  const [savingNilai, setSavingNilai] = React.useState(false);
  const [loadingNilai, setLoadingNilai] = React.useState(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const authHeaders = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

  React.useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dosen/profil`, { headers: authHeaders }).then(r => r.json()),
      fetch(`${API_BASE}/api/dosen/dashboard`, { headers: authHeaders }).then(r => r.json()),
      fetch(`${API_BASE}/api/dosen/wali/mahasiswa`, { headers: authHeaders }).then(r => r.json()),
    ]).then(([profilRes, dashRes, mhsRes]) => {
      if (profilRes.success) setDosen(profilRes.data);
      if (dashRes.success) setSummary(dashRes.data);
      if (mhsRes.success) setMahasiswaList(mhsRes.data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Fetch kelas saat tab nilai diaktifkan
  React.useEffect(() => {
    if (view === "nilai" && kelasList.length === 0) {
      fetchAvailableKelas()
        .then(k => {
          setKelasList(k || []);
          if (k && k.length > 0 && !selectedKelas) {
            handleSelectKelas(k[0]);
          }
        })
        .catch(console.error);
    }
  }, [view]);

  const handleSelectKelas = (k: Kelas) => {
    setSelectedKelas(k);
    setLoadingNilai(true);
    fetchMahasiswaNilaiKelas(k.id)
      .then(items => {
        setMahasiswaNilaiList(items || []);
        const inps: Record<string, { tugas: number; uts: number; uas: number }> = {};
        for (const item of items) {
          inps[item.krs_id] = {
            tugas: item.nilai_tugas ?? 0,
            uts: item.nilai_uts ?? 0,
            uas: item.nilai_uas ?? 0,
          };
        }
        setNilaiInputs(inps);
      })
      .catch(err => {
        showToast("error", err.message || "Gagal memuat peserta kelas");
      })
      .finally(() => {
        setLoadingNilai(false);
      });
  };

  const handleInputChange = (krsId: string, field: "tugas" | "uts" | "uas", valStr: string) => {
    const num = Math.min(100, Math.max(0, parseFloat(valStr) || 0));
    setNilaiInputs(prev => ({
      ...prev,
      [krsId]: {
        ...(prev[krsId] || { tugas: 0, uts: 0, uas: 0 }),
        [field]: num,
      }
    }));
  };

  const handleSaveNilai = async (publish: boolean) => {
    if (!selectedKelas) return;
    setSavingNilai(true);
    try {
      const payload: InputNilaiRequest = {
        kelas_id: selectedKelas.id,
        publish: publish,
        nilai: mahasiswaNilaiList.map(m => {
          const inp = nilaiInputs[m.krs_id] || { tugas: 0, uts: 0, uas: 0 };
          return {
            krs_id: m.krs_id,
            nilai_tugas: inp.tugas,
            nilai_uts: inp.uts,
            nilai_uas: inp.uas,
          };
        }),
      };
      await inputNilaiKelas(payload);
      showToast("success", publish ? "Nilai resmi berhasil dipublikasikan ke KHS & Transkrip!" : "Draft nilai berhasil disimpan");
      handleSelectKelas(selectedKelas);
    } catch (err: any) {
      showToast("error", err.message || "Gagal menyimpan nilai");
    } finally {
      setSavingNilai(false);
    }
  };

  const loadKRS = (mahasiswa: MahasiswaAsuhan) => {
    setSelectedMahasiswa(mahasiswa);
    setView("persetujuan");
    setKrsList([]);
    fetch(`${API_BASE}/api/dosen/wali/mahasiswa/${mahasiswa.id}/krs`, { headers: authHeaders })
      .then(r => r.json())
      .then(data => { if (data.success) setKrsList(data.data || []); })
      .catch(console.error);
  };

  const handleApprove = async (krsId: string) => {
    setActionLoading(krsId);
    try {
      const res = await fetch(`${API_BASE}/api/dosen/wali/krs/${krsId}/approve`, { method: "PUT", headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setKrsList(prev => prev.map(k => k.id === krsId ? { ...k, status: "disetujui" as const } : k));
        setMahasiswaList(prev => prev.map(m => m.id === selectedMahasiswa?.id ? { ...m, krs_pending: Math.max(0, m.krs_pending - 1), krs_disetujui: m.krs_disetujui + 1 } : m));
        setSummary(prev => prev ? { ...prev, total_pending: Math.max(0, prev.total_pending - 1), total_disetujui: prev.total_disetujui + 1 } : prev);
        showToast("success", "KRS berhasil disetujui");
      } else {
        showToast("error", data.message || "Gagal menyetujui KRS");
      }
    } catch { showToast("error", "Terjadi kesalahan jaringan"); }
    finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.krsId);
    try {
      const res = await fetch(`${API_BASE}/api/dosen/wali/krs/${rejectModal.krsId}/reject`, {
        method: "PUT", headers: authHeaders,
        body: JSON.stringify({ catatan: rejectCatatan || "Ditolak oleh Dosen Wali" }),
      });
      const data = await res.json();
      if (data.success) {
        setKrsList(prev => prev.map(k => k.id === rejectModal.krsId ? { ...k, status: "ditolak" as const, catatan: rejectCatatan } : k));
        setMahasiswaList(prev => prev.map(m => m.id === selectedMahasiswa?.id ? { ...m, krs_pending: Math.max(0, m.krs_pending - 1) } : m));
        setSummary(prev => prev ? { ...prev, total_pending: Math.max(0, prev.total_pending - 1), total_ditolak: prev.total_ditolak + 1 } : prev);
        showToast("success", "KRS berhasil ditolak");
      } else {
        showToast("error", data.message || "Gagal menolak KRS");
      }
    } catch { showToast("error", "Terjadi kesalahan jaringan"); }
    finally { setActionLoading(null); setRejectModal(null); setRejectCatatan(""); }
  };

  const handleApproveAll = async () => {
    if (!selectedMahasiswa) return;
    setActionLoading("all");
    try {
      const res = await fetch(`${API_BASE}/api/dosen/wali/mahasiswa/${selectedMahasiswa.id}/krs/approve-all`, { method: "PUT", headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setKrsList(prev => prev.map(k => k.status === "pending" ? { ...k, status: "disetujui" as const } : k));
        const pendingCount = krsList.filter(k => k.status === "pending").length;
        setMahasiswaList(prev => prev.map(m => m.id === selectedMahasiswa.id ? { ...m, krs_pending: 0, krs_disetujui: m.krs_disetujui + pendingCount } : m));
        setSummary(prev => prev ? { ...prev, total_pending: Math.max(0, prev.total_pending - pendingCount), total_disetujui: prev.total_disetujui + pendingCount } : prev);
        showToast("success", `${data.data?.approved || pendingCount} KRS berhasil disetujui semua`);
      } else {
        showToast("error", data.message || "Gagal menyetujui semua KRS");
      }
    } catch { showToast("error", "Terjadi kesalahan jaringan"); }
    finally { setActionLoading(null); }
  };

  const getStatusBadge = (status: string) => {
    if (status === "disetujui") return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ Disetujui</span>;
    if (status === "ditolak") return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30">✗ Ditolak</span>;
    return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">⏳ Pending</span>;
  };

  const namaLengkap = dosen ? `${dosen.gelar_depan || ""} ${dosen.nama_lengkap} ${dosen.gelar_belakang || ""}`.trim() : "...";
  const pendingKRS = useMemo(() => krsList.filter(k => k.status === "pending"), [krsList]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-black text-white mb-1">Tolak Mata Kuliah</h3>
            <p className="text-xs text-zinc-400 mb-4">{rejectModal.namaMK}</p>
            <textarea
              className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-sm text-zinc-200 resize-none focus:outline-none focus:border-red-500/50 transition-colors"
              rows={3}
              placeholder="Catatan alasan penolakan (opsional)..."
              value={rejectCatatan}
              onChange={e => setRejectCatatan(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setRejectModal(null); setRejectCatatan(""); }} className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-black text-zinc-400 transition-all">Batal</button>
              <button onClick={handleReject} disabled={actionLoading === rejectModal.krsId} className="flex-1 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-xs font-black text-white transition-all disabled:opacity-50">
                {actionLoading === rejectModal.krsId ? "Menolak..." : "Konfirmasi Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          Portal Dosen <span className="text-zinc-500 font-normal text-lg">Akademik & Perwalian</span>
        </h1>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <span>›</span>
          <span className="text-zinc-400">Dosen</span>
          <span>›</span>
          <span className="text-[#1ea39e]">
            {view === "dashboard" ? "Dashboard" : view === "persetujuan" ? "Persetujuan KRS" : "Penilaian Kelas"}
          </span>
        </div>
      </div>

      {/* Profil Card */}
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900/40 border border-white/10 p-6 backdrop-blur-md shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-2xl font-black shrink-0">
            {dosen?.nama_lengkap?.charAt(0)?.toUpperCase() || "D"}
          </div>
          <div>
            <p className="text-lg font-black text-white">{namaLengkap}</p>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">NIDN: {dosen?.nidn || "..."} • {dosen?.departemen || "..."}</p>
          </div>
          <div className="md:ml-auto flex flex-wrap gap-2 pt-2 md:pt-0">
            <button 
              onClick={() => setView("dashboard")} 
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${view === "dashboard" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setView("persetujuan")} 
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${view === "persetujuan" ? "bg-[#1ea39e] text-white shadow-lg shadow-[#1ea39e]/30" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"}`}
            >
              Persetujuan KRS
            </button>
            <button 
              onClick={() => setView("nilai")} 
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${view === "nilai" ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"}`}
            >
              Input Nilai Kelas
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      </div>

      {/* === DASHBOARD VIEW === */}
      {view === "dashboard" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Mahasiswa Asuhan", value: summary?.total_asuhan ?? "-", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
              { label: "KRS Menunggu ACC", value: summary?.total_pending ?? "-", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
              { label: "KRS Disetujui", value: summary?.total_disetujui ?? "-", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              { label: "KRS Ditolak", value: summary?.total_ditolak ?? "-", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
            ].map((c, i) => (
              <div key={i} className={`rounded-2xl border p-5 ${c.bg} backdrop-blur-md`}>
                <p className={`text-3xl font-black ${c.color}`}>{c.value}</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Tabel Mahasiswa Asuhan */}
          <div className="rounded-2xl bg-zinc-900/40 border border-white/10 overflow-hidden backdrop-blur-md shadow-xl">
            <div className="px-5 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Mahasiswa Asuhan</h3>
              <span className="text-[10px] text-zinc-500">{mahasiswaList.length} mahasiswa</span>
            </div>
            {loading ? (
              <div className="p-12 text-center text-zinc-500 text-sm">Memuat data...</div>
            ) : mahasiswaList.length === 0 ? (
              <div className="p-12 text-center text-zinc-600 italic text-sm">Belum ada mahasiswa asuhan yang ditugaskan.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-black/20">
                      <th className="px-5 py-3">NIM</th>
                      <th className="px-5 py-3">Nama</th>
                      <th className="px-5 py-3">Prodi</th>
                      <th className="px-5 py-3 text-center">Angkatan</th>
                      <th className="px-5 py-3 text-center">KRS Pending</th>
                      <th className="px-5 py-3 text-center">KRS Disetujui</th>
                      <th className="px-5 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {mahasiswaList.map((m) => (
                      <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-5 py-3 font-mono text-xs text-zinc-400">{m.nim}</td>
                        <td className="px-5 py-3 font-bold text-sm text-zinc-200 group-hover:text-white">{m.nama_lengkap}</td>
                        <td className="px-5 py-3 text-xs text-zinc-400">{m.program_studi}</td>
                        <td className="px-5 py-3 text-center text-xs text-zinc-400">{m.angkatan}</td>
                        <td className="px-5 py-3 text-center">
                          {m.krs_pending > 0
                            ? <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black">{m.krs_pending} pending</span>
                            : <span className="text-zinc-600 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black">{m.krs_disetujui}</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button onClick={() => loadKRS(m)} className="px-3 py-1.5 rounded-lg bg-[#1ea39e]/10 hover:bg-[#1ea39e]/20 border border-[#1ea39e]/20 text-[10px] font-black text-[#1ea39e] transition-all">
                            Lihat KRS
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === PERSETUJUAN VIEW === */}
      {view === "persetujuan" && (
        <div className="space-y-4">
          {!selectedMahasiswa ? (
            <div className="rounded-2xl bg-zinc-900/40 border border-white/10 overflow-hidden backdrop-blur-md shadow-xl">
              <div className="px-5 py-3 border-b border-white/5 bg-white/5">
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Pilih Mahasiswa Asuhan</h3>
              </div>
              <div className="divide-y divide-white/5">
                {mahasiswaList.map(m => (
                  <div key={m.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div>
                      <p className="font-bold text-sm text-white">{m.nama_lengkap}</p>
                      <p className="text-xs text-zinc-400 font-mono">NIM: {m.nim} • {m.program_studi} ({m.angkatan})</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {m.krs_pending > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black">
                          {m.krs_pending} menunggu persetujuan
                        </span>
                      )}
                      <button onClick={() => loadKRS(m)} className="px-3.5 py-1.5 rounded-xl bg-[#1ea39e] hover:bg-[#188f88] text-white text-xs font-bold transition-all">
                        Periksa KRS
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button onClick={() => setSelectedMahasiswa(null)} className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-bold transition-all">
                  ← Kembali ke Daftar Mahasiswa
                </button>
                {pendingKRS.length > 0 && (
                  <button onClick={handleApproveAll} disabled={actionLoading === "all"} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20">
                    {actionLoading === "all" ? "Memproses..." : `✓ Setujui Semua (${pendingKRS.length} MK)`}
                  </button>
                )}
              </div>

              <div className="rounded-2xl bg-zinc-900/40 border border-white/10 overflow-hidden backdrop-blur-md shadow-xl">
                <div className="px-5 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">KRS: {selectedMahasiswa.nama_lengkap}</h3>
                    <p className="text-[10px] text-zinc-400 font-mono">NIM: {selectedMahasiswa.nim}</p>
                  </div>
                  <span className="text-[10px] text-zinc-500">{krsList.length} mata kuliah</span>
                </div>

                {krsList.length === 0 ? (
                  <div className="p-12 text-center text-zinc-500 text-sm italic">Mahasiswa belum mengambil mata kuliah pada semester ini.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-black/20">
                          <th className="px-5 py-3">Mata Kuliah</th>
                          <th className="px-5 py-3">Kelas</th>
                          <th className="px-5 py-3 text-center">SKS</th>
                          <th className="px-5 py-3">Jadwal</th>
                          <th className="px-5 py-3">Dosen Pengajar</th>
                          <th className="px-5 py-3 text-center">Status</th>
                          <th className="px-5 py-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {krsList.map((k) => (
                          <tr key={k.id} className={`hover:bg-white/5 transition-colors ${k.status !== "pending" ? "opacity-60" : ""}`}>
                            <td className="px-5 py-3 font-bold text-sm text-zinc-200">{k.nama_mata_kuliah}</td>
                            <td className="px-5 py-3 font-mono text-xs text-zinc-400">{k.kode_kelas}</td>
                            <td className="px-5 py-3 text-center font-black text-zinc-300">{k.sks}</td>
                            <td className="px-5 py-3 text-xs text-zinc-400">{k.hari}, {k.jam_mulai?.slice(0,5)}–{k.jam_selesai?.slice(0,5)}</td>
                            <td className="px-5 py-3 text-xs text-zinc-400">{k.nama_dosen}</td>
                            <td className="px-5 py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {getStatusBadge(k.status)}
                                {k.catatan && k.status === "ditolak" && (
                                  <span className="text-[8px] text-red-400 italic max-w-30 text-center">{k.catatan}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-center">
                              {k.status === "pending" ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => handleApprove(k.id)} disabled={actionLoading === k.id} className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-600/30 text-[9px] font-black text-emerald-400 transition-all disabled:opacity-50">
                                    {actionLoading === k.id ? "..." : "✓ ACC"}
                                  </button>
                                  <button onClick={() => setRejectModal({ krsId: k.id, namaMK: k.nama_mata_kuliah })} disabled={!!actionLoading} className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-[9px] font-black text-red-400 transition-all disabled:opacity-50">
                                    ✗ Tolak
                                  </button>
                                </div>
                              ) : (
                                <span className="text-zinc-600 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === INPUT NILAI KELAS VIEW === */}
      {view === "nilai" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Pilih Kelas Bar */}
          <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/10 backdrop-blur-md shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Pilih Kelas Perkuliahan
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Pilih kelas yang Anda ampu untuk menginput atau memperbarui nilai mahasiswa.</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedKelas?.id || ""}
                  onChange={(e) => {
                    const found = kelasList.find(k => k.id === e.target.value);
                    if (found) handleSelectKelas(found);
                  }}
                  className="bg-zinc-800 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-zinc-200 focus:outline-none focus:border-amber-500 transition-colors min-w-65"
                >
                  {kelasList.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.nama_mata_kuliah} ({k.kode_kelas}) — {k.hari}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedKelas && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5 text-xs">
                <div>
                  <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest block">Mata Kuliah</span>
                  <p className="font-bold text-zinc-100">{selectedKelas.nama_mata_kuliah}</p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest block">Kode & SKS</span>
                  <p className="font-bold text-zinc-100 font-mono">{selectedKelas.kode_kelas} ({selectedKelas.sks} SKS)</p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest block">Jadwal & Ruang</span>
                  <p className="font-bold text-zinc-100">{selectedKelas.hari}, {selectedKelas.jam_mulai?.slice(0,5)}–{selectedKelas.jam_selesai?.slice(0,5)} ({selectedKelas.ruangan})</p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest block">Formula Penilaian</span>
                  <p className="font-bold text-amber-400">30% Tugas + 35% UTS + 35% UAS</p>
                </div>
              </div>
            )}
          </div>

          {/* Table Input Nilai */}
          <div className="rounded-3xl bg-zinc-900/40 border border-white/10 overflow-hidden backdrop-blur-md shadow-2xl">
            <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Daftar Mahasiswa Kelas</h3>
                <p className="text-[11px] text-zinc-400">{mahasiswaNilaiList.length} mahasiswa terdaftar di kelas ini</p>
              </div>

              {mahasiswaNilaiList.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSaveNilai(false)}
                    disabled={savingNilai}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-black text-zinc-200 transition-all disabled:opacity-50"
                  >
                    {savingNilai ? "Menyimpan..." : "Simpan Draft"}
                  </button>
                  <button
                    onClick={() => handleSaveNilai(true)}
                    disabled={savingNilai}
                    className="px-5 py-2 rounded-xl bg-linear-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-xs font-black text-white shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50"
                  >
                    {savingNilai ? "Mempublikasikan..." : "★ Publikasikan Nilai"}
                  </button>
                </div>
              )}
            </div>

            {loadingNilai ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Memuat daftar peserta kelas...</p>
              </div>
            ) : mahasiswaNilaiList.length === 0 ? (
              <div className="py-16 text-center text-zinc-500">
                <p className="text-sm font-medium">Belum ada mahasiswa yang mengambil kelas ini atau KRS belum disetujui.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-black/30">
                      <th className="px-5 py-4 w-12 text-center">No</th>
                      <th className="px-5 py-4">NIM</th>
                      <th className="px-5 py-4">Nama Mahasiswa</th>
                      <th className="px-4 py-4 text-center w-28">Tugas (30%)</th>
                      <th className="px-4 py-4 text-center w-28">UTS (35%)</th>
                      <th className="px-4 py-4 text-center w-28">UAS (35%)</th>
                      <th className="px-4 py-4 text-center">Nilai Akhir</th>
                      <th className="px-4 py-4 text-center">Huruf</th>
                      <th className="px-4 py-4 text-center">Bobot</th>
                      <th className="px-4 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {mahasiswaNilaiList.map((mhs, idx) => {
                      const inp = nilaiInputs[mhs.krs_id] || { tugas: 0, uts: 0, uas: 0 };
                      const preview = hitungNilaiPreview(inp.tugas, inp.uts, inp.uas);

                      return (
                        <tr key={mhs.krs_id} className="hover:bg-white/5 transition-colors">
                          <td className="px-5 py-3 text-center text-zinc-500 font-bold">{idx + 1}</td>
                          <td className="px-5 py-3 font-mono text-xs text-zinc-400 font-bold">{mhs.nim}</td>
                          <td className="px-5 py-3 font-bold text-zinc-100">{mhs.nama_lengkap}</td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={inp.tugas}
                              onChange={(e) => handleInputChange(mhs.krs_id, "tugas", e.target.value)}
                              className="w-20 bg-zinc-800 border border-white/10 rounded-lg px-2.5 py-1 text-center font-mono text-xs font-bold text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={inp.uts}
                              onChange={(e) => handleInputChange(mhs.krs_id, "uts", e.target.value)}
                              className="w-20 bg-zinc-800 border border-white/10 rounded-lg px-2.5 py-1 text-center font-mono text-xs font-bold text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={inp.uas}
                              onChange={(e) => handleInputChange(mhs.krs_id, "uas", e.target.value)}
                              className="w-20 bg-zinc-800 border border-white/10 rounded-lg px-2.5 py-1 text-center font-mono text-xs font-bold text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                            />
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-zinc-200">
                            {preview.akhir.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center font-black">
                            <span className={`px-2 py-0.5 rounded text-xs font-black ${
                              preview.huruf === "A" || preview.huruf === "AB" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                              preview.huruf === "B" || preview.huruf === "BC" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                              preview.huruf === "C" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                              "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }`}>
                              {preview.huruf}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-zinc-400">
                            {preview.bobot.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {mhs.status_nilai === "published" ? (
                              <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                Published
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                Draft
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
