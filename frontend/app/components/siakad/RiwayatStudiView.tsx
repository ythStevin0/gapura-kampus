import { useState, useEffect, useMemo } from "react";
import { fetchProfilKRS, fetchTranskrip, type ProfilKRS, type TranskripResponse } from "../../lib/api";

interface RiwayatItem {
  id: string;
  kode: string;
  mataKuliah: string;
  sks: number;
  nilai: string;
  semester: string;
  masukTranskrip: boolean;
}

export function RiwayatStudiView({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState("non-transfer");
  const [profil, setProfil] = useState<ProfilKRS | null>(null);
  const [transkrip, setTranskrip] = useState<TranskripResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchProfilKRS().catch(() => null),
      fetchTranskrip().catch(() => null)
    ]).then(([p, t]) => {
      if (p) setProfil(p);
      if (t) setTranskrip(t);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  // Format dynamic study history from backend transcript
  const riwayatData: RiwayatItem[] = useMemo(() => {
    if (!transkrip || !transkrip.semesters || transkrip.semesters.length === 0) {
      return [];
    }
    const rows: RiwayatItem[] = [];
    let idx = 1;
    for (const sem of transkrip.semesters) {
      for (const item of sem.items) {
        rows.push({
          id: `${item.kode_mk}-${idx++}`,
          kode: item.kode_mk || "-",
          mataKuliah: item.nama_mk,
          sks: item.sks,
          nilai: item.nilai_huruf || "-",
          semester: item.semester_akademik,
          masukTranskrip: item.lulus
        });
      }
    }
    return rows;
  }, [transkrip]);

  const transferData = useMemo(() => [
    { id: "t1", kode: "GS13EL03", mataKuliah: "Bahasa Inggris", sks: 3, nilai: "A", semester: "2024 / -", jenis: "Ekuivalensi" },
    { id: "t2", kode: "GS13RG02", mataKuliah: "Agama", sks: 2, nilai: "A", semester: "2024 / -", jenis: "Ekuivalensi" },
    { id: "t3", kode: "DT13MD13", mataKuliah: "Matematika Diskret", sks: 3, nilai: "AB", semester: "2024 / -", jenis: "Ekuivalensi" },
  ], []);

  const { totalSksDiambil, totalSksDiakui, totalSksTransfer } = useMemo(() => {
    let diambil = 0;
    let diakui = 0;
    for (const i of riwayatData) {
      diambil += i.sks;
      if (i.masukTranskrip) diakui += i.sks;
    }
    const transfer = transferData.reduce((acc, curr) => acc + curr.sks, 0);
    return { totalSksDiambil: diambil, totalSksDiakui: diakui, totalSksTransfer: transfer };
  }, [riwayatData, transferData]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          Laporan Nilai <span className="text-zinc-500 font-normal text-lg">Riwayat Studi</span>
        </h1>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <span>&rsaquo;</span>
          <span className="text-zinc-400">Laporan Nilai</span>
          <span>&rsaquo;</span>
          <span className="text-[#1ea39e]">Riwayat Studi</span>
        </div>
      </div>

      <div className="rounded-3xl bg-zinc-900/40 border border-white/10 p-6 md:p-8 backdrop-blur-md shadow-2xl space-y-6">
        {/* Detail Section */}
        <div className="space-y-4">
          <h3 className="text-[#1ea39e] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Detail Riwayat Studi Mahasiswa
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 text-[12px] bg-white/5 p-6 rounded-2xl border border-white/5">
            <div className="space-y-3">
              <div className="flex">
                <span className="w-28 text-zinc-400 font-bold uppercase tracking-wider text-[11px]">Nama</span>
                <span className="text-zinc-500 mr-3">:</span>
                <span className="text-zinc-100 font-bold uppercase">{profil?.nama_lengkap || user?.name || "..."}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-zinc-400 font-bold uppercase tracking-wider text-[11px]">NIM</span>
                <span className="text-zinc-500 mr-3">:</span>
                <span className="text-zinc-200 font-mono font-bold">{profil?.nim || "..."}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-zinc-400 font-bold uppercase tracking-wider text-[11px]">Dosen Wali</span>
                <span className="text-zinc-500 mr-3">:</span>
                <span className="text-zinc-200">{profil?.nama_dosen_wali || "..."}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex">
                <span className="w-32 text-zinc-400 font-bold uppercase tracking-wider text-[11px]">Program Studi</span>
                <span className="text-zinc-500 mr-3">:</span>
                <span className="text-zinc-100 font-bold">{profil?.program_studi || "..."}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-zinc-400 font-bold uppercase tracking-wider text-[11px]">Tahun Masuk</span>
                <span className="text-zinc-500 mr-3">:</span>
                <span className="text-zinc-200 font-mono">{profil?.angkatan || 2024}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-zinc-400 font-bold uppercase tracking-wider text-[11px]">IPK Kumulatif</span>
                <span className="text-zinc-500 mr-3">:</span>
                <span className="text-emerald-400 font-mono font-bold">{profil?.ipk?.toFixed(2) || "0.00"}</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 italic">
            Catatan: <span className="text-rose-400 font-medium">Baris yang berarsir merah adalah mata kuliah yang tidak dimasukkan ke transkrip / tidak lulus</span>
          </p>
        </div>

        {/* Data Section */}
        <div className="space-y-4 pt-4">
          <h3 className="text-[#1ea39e] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
            Data Riwayat Perkuliahan
          </h3>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/5">
            <button 
              onClick={() => setActiveTab("non-transfer")}
              className={`px-5 py-2.5 text-[11px] font-bold rounded-t-xl transition-all border-b-2 ${activeTab === "non-transfer" ? "border-[#1ea39e] text-white bg-[#1ea39e]/10" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}
            >
              Riwayat Nilai Reguler
            </button>
            <button 
              onClick={() => setActiveTab("transfer")}
              className={`px-5 py-2.5 text-[11px] font-bold rounded-t-xl transition-all border-b-2 ${activeTab === "transfer" ? "border-[#1ea39e] text-white bg-[#1ea39e]/10" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}
            >
              Riwayat Nilai Transfer/MBKM/Ekuivalensi
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-white/5">
                  <th className="px-5 py-3.5 text-center w-12">No</th>
                  <th className="px-5 py-3.5">Kode</th>
                  <th className="px-6 py-3.5">Mata Kuliah</th>
                  <th className="px-5 py-3.5 text-center">SKS</th>
                  <th className="px-5 py-3.5 text-center">Nilai</th>
                  <th className="px-6 py-3.5">Semester</th>
                  {activeTab === "transfer" && <th className="px-6 py-3.5 text-center">Jenis Nilai</th>}
                  <th className="px-5 py-3.5 text-center">Masuk Transkrip?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">Memuat riwayat studi...</td>
                  </tr>
                ) : activeTab === "non-transfer" ? (
                  riwayatData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">Belum ada riwayat nilai reguler yang tercatat.</td>
                    </tr>
                  ) : (
                    riwayatData.map((item, index) => (
                      <tr 
                        key={item.id} 
                        className={`transition-colors ${!item.masukTranskrip ? "bg-rose-500/10 hover:bg-rose-500/20" : "hover:bg-white/5"}`}
                      >
                        <td className="px-5 py-3 text-center text-zinc-500 font-bold">{index + 1}</td>
                        <td className="px-5 py-3 font-mono text-zinc-400 text-xs">{item.kode}</td>
                        <td className={`px-6 py-3 font-bold ${!item.masukTranskrip ? "text-rose-300" : "text-zinc-200"}`}>{item.mataKuliah}</td>
                        <td className="px-5 py-3 text-center font-bold text-zinc-300">{item.sks}</td>
                        <td className="px-5 py-3 text-center font-black text-zinc-300">{item.nilai}</td>
                        <td className="px-6 py-3 text-zinc-400 font-medium">{item.semester}</td>
                        <td className={`px-5 py-3 text-center font-bold ${item.masukTranskrip ? "text-emerald-400" : "text-rose-400"}`}>
                          {item.masukTranskrip ? "Ya" : "Tidak"}
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  transferData.map((item, index) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3 text-center text-zinc-500 font-bold">{index + 1}</td>
                      <td className="px-5 py-3 font-mono text-zinc-400 text-xs">{item.kode}</td>
                      <td className="px-6 py-3 font-bold text-zinc-200">{item.mataKuliah}</td>
                      <td className="px-5 py-3 text-center font-bold text-zinc-300">{item.sks}</td>
                      <td className="px-5 py-3 text-center font-black text-zinc-300">{item.nilai}</td>
                      <td className="px-6 py-3 text-zinc-400 font-medium">{item.semester}</td>
                      <td className="px-6 py-3 text-center text-zinc-400 font-medium">{item.jenis}</td>
                      <td className="px-5 py-3 text-center font-bold text-emerald-400">Ya</td>
                    </tr>
                  ))
                )}
                
                {activeTab === "non-transfer" ? (
                  <>
                    <tr className="bg-white/5 font-black text-[10px] uppercase tracking-widest text-zinc-400">
                      <td colSpan={3} className="px-6 py-3 text-right">Total SKS Diambil</td>
                      <td className="px-5 py-3 text-center text-white text-[13px]">{totalSksDiambil}</td>
                      <td colSpan={3}></td>
                    </tr>
                    <tr className="bg-white/10 font-black text-[10px] uppercase tracking-widest text-zinc-300">
                      <td colSpan={3} className="px-6 py-3 text-right">Total SKS Diakui</td>
                      <td className="px-5 py-3 text-center text-[#1ea39e] text-[13px]">{totalSksDiakui}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </>
                ) : (
                  <tr className="bg-white/10 font-black text-[10px] uppercase tracking-widest text-zinc-300">
                    <td colSpan={3} className="px-6 py-3 text-right">Total SKS Diakui</td>
                    <td className="px-5 py-3 text-center text-[#1ea39e] text-[13px]">{totalSksTransfer}</td>
                    <td colSpan={4}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
