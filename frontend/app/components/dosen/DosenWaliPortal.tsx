import React, { useMemo } from "react";
import { useNavigate } from "react-router";

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

export function DosenWaliPortal({ token }: { token: string }) {
  const [view, setView] = React.useState<"dashboard" | "persetujuan">("dashboard");
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

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
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
          Portal Dosen Wali <span className="text-zinc-500 font-normal text-lg">Akademik</span>
        </h1>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <span>›</span>
          <span className="text-zinc-400">Dosen Wali</span>
          {view === "persetujuan" && selectedMahasiswa && (
            <><span>›</span><span className="text-zinc-400">Persetujuan KRS — {selectedMahasiswa.nama_lengkap}</span></>
          )}
        </div>
      </div>

      {/* Profil Card */}
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900/40 border border-white/10 p-5 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl font-black">
            {dosen?.nama_lengkap?.charAt(0)?.toUpperCase() || "D"}
          </div>
          <div>
            <p className="text-base font-black text-white">{namaLengkap}</p>
            <p className="text-xs text-zinc-400">NIDN: {dosen?.nidn || "..."} • {dosen?.departemen || "..."}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setView("dashboard")} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === "dashboard" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>Dashboard</button>
            <button onClick={() => setView("persetujuan")} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === "persetujuan" ? "bg-[#1ea39e] text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>Persetujuan KRS</button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
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
          {/* Pilih Mahasiswa */}
          {!selectedMahasiswa ? (
            <div className="rounded-2xl bg-zinc-900/40 border border-white/10 overflow-hidden backdrop-blur-md shadow-xl">
              <div className="px-5 py-3 border-b border-white/5 bg-white/5">
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Pilih Mahasiswa Asuhan</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                {mahasiswaList.map(m => (
                  <button key={m.id} onClick={() => loadKRS(m)} className="text-left p-4 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-white/5 hover:border-[#1ea39e]/30 transition-all group">
                    <p className="text-sm font-bold text-zinc-200 group-hover:text-[#1ea39e]">{m.nama_lengkap}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">{m.nim} • {m.program_studi}</p>
                    {m.krs_pending > 0 && (
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black">{m.krs_pending} pending</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Action Bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => setSelectedMahasiswa(null)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black text-zinc-400 transition-all">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
                  Ganti Mahasiswa
                </button>
                <div className="flex-1 px-4 py-2 rounded-xl bg-zinc-900/60 border border-white/5">
                  <p className="text-xs font-black text-white">{selectedMahasiswa.nama_lengkap}</p>
                  <p className="text-[10px] text-zinc-500">{selectedMahasiswa.nim} • {selectedMahasiswa.program_studi}</p>
                </div>
                {pendingKRS.length > 0 && (
                  <button onClick={handleApproveAll} disabled={actionLoading === "all"} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black text-white transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/20">
                    {actionLoading === "all" ? "Menyetujui..." : `✓ ACC Semua (${pendingKRS.length})`}
                  </button>
                )}
              </div>

              {/* KRS Table */}
              <div className="rounded-2xl bg-zinc-900/40 border border-white/10 overflow-hidden backdrop-blur-md shadow-xl">
                <div className="px-5 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Kartu Rencana Studi</h3>
                  <div className="flex gap-2">
                    <span className="text-[9px] text-zinc-500">{krsList.length} mata kuliah</span>
                    {pendingKRS.length > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black">{pendingKRS.length} pending</span>}
                  </div>
                </div>
                {krsList.length === 0 ? (
                  <div className="p-12 text-center text-zinc-600 italic text-sm">Belum ada KRS untuk mahasiswa ini.</div>
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
    </div>
  );
}
