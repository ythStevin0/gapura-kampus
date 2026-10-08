import { useState, useEffect } from "react";
import { 
  fetchKHS, 
  fetchAcademicSemesters, 
  type KHSResponse 
} from "../../lib/api";

export function KHSView({ user }: { user: any }) {
  const [semesters, setSemesters] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [khs, setKhs] = useState<KHSResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load list of semesters
  useEffect(() => {
    fetchAcademicSemesters()
      .then((sems) => {
        if (sems && sems.length > 0) {
          setSemesters(sems);
          setSelectedSemester(sems[0]);
        } else {
          const defaultSems = ["2024/2025 - Ganjil", "2024/2025 - Genap", "2025/2026 - Ganjil"];
          setSemesters(defaultSems);
          setSelectedSemester(defaultSems[0]);
        }
      })
      .catch(() => {
        const defaultSems = ["2024/2025 - Ganjil", "2024/2025 - Genap", "2025/2026 - Ganjil"];
        setSemesters(defaultSems);
        setSelectedSemester(defaultSems[0]);
      });
  }, []);

  // Fetch KHS when selected semester changes
  useEffect(() => {
    if (!selectedSemester) return;
    setLoading(true);
    setError(null);
    fetchKHS(selectedSemester)
      .then((data) => {
        setKhs(data);
      })
      .catch((err) => {
        setError(err.message || "Gagal memuat Kartu Hasil Studi");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedSemester]);

  const handlePrint = () => {
    window.print();
  };

  const getBadgeGrade = (huruf: string) => {
    if (!huruf || huruf === "-") {
      return <span className="text-zinc-500 font-mono">-</span>;
    }
    if (huruf === "A" || huruf === "AB") {
      return <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{huruf}</span>;
    }
    if (huruf === "B" || huruf === "BC") {
      return <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">{huruf}</span>;
    }
    if (huruf === "C") {
      return <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">{huruf}</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">{huruf}</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            Kartu Hasil Studi <span className="text-zinc-500 font-normal text-lg">(KHS)</span>
          </h1>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            <span>&rsaquo;</span>
            <span className="text-zinc-400">Akademik</span>
            <span>&rsaquo;</span>
            <span className="text-[#1ea39e]">Kartu Hasil Studi</span>
          </div>
        </div>

        <button 
          onClick={handlePrint}
          className="px-5 py-2.5 rounded-xl bg-[#2d7fb9] hover:bg-[#246a9b] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/30 active:scale-95 shrink-0"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
          Cetak KHS
        </button>
      </div>

      {/* Main Container */}
      <div className="rounded-3xl bg-zinc-900/40 border border-white/10 p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-8 print:bg-white print:text-black print:border-none print:shadow-none print:m-0 print:p-2">
        {/* Printable Letterhead */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6 print:border-black/20">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#1ea39e] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-[#1ea39e]/20 print:shadow-none print:w-12 print:h-12 print:text-xl">
              U
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-zinc-100 uppercase print:text-black">Universitas Internasional Semen Indonesia</h2>
              <p className="text-xs text-zinc-400 font-bold print:text-zinc-600">Direktorat Administrasi Akademik & Kemahasiswaan</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-lg bg-[#1ea39e]/10 border border-[#1ea39e]/20 text-[#1ea39e] text-[11px] font-black uppercase tracking-widest print:border-none print:p-0">
              KHS Mahasiswa
            </span>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono print:text-zinc-500">
              Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Student Profile & Semester Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[13px] bg-white/5 p-6 rounded-2xl border border-white/5 print:bg-transparent print:border-none print:p-0">
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="w-32 text-zinc-400 font-bold uppercase text-[11px] tracking-wider print:text-zinc-700">Nama Mahasiswa</span>
              <span className="text-zinc-500 mr-3">:</span>
              <span className="text-zinc-100 font-bold uppercase print:text-black">{khs?.nama_lengkap || user?.name || "..."}</span>
            </div>
            <div className="flex items-center">
              <span className="w-32 text-zinc-400 font-bold uppercase text-[11px] tracking-wider print:text-zinc-700">NIM</span>
              <span className="text-zinc-500 mr-3">:</span>
              <span className="text-zinc-100 font-mono font-bold print:text-black">{khs?.nim || "..."}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <span className="w-36 text-zinc-400 font-bold uppercase text-[11px] tracking-wider print:text-zinc-700">Program Studi</span>
              <span className="text-zinc-500 mr-3">:</span>
              <span className="text-zinc-100 font-bold print:text-black">{khs?.program_studi || "..."}</span>
            </div>
            <div className="flex items-center">
              <span className="w-36 text-zinc-400 font-bold uppercase text-[11px] tracking-wider print:text-zinc-700">Semester Akademik</span>
              <span className="text-zinc-500 mr-3">:</span>
              <div className="no-print">
                <select 
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="bg-zinc-800/80 border border-white/10 rounded-xl px-3.5 py-1.5 text-zinc-200 text-xs font-bold focus:outline-none focus:border-[#1ea39e] transition-colors min-w-55"
                >
                  {semesters.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <span className="hidden print:inline font-bold print:text-black">{selectedSemester}</span>
            </div>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#1ea39e] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Memuat Kartu Hasil Studi...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center text-sm font-medium">
            {error}
          </div>
        ) : !khs || khs.items.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 space-y-2">
            <p className="text-sm font-medium">Belum ada data nilai yang dipublikasikan untuk semester ini.</p>
            <p className="text-xs text-zinc-600">Silakan hubungi dosen pengajar atau BAAK jika nilai belum muncul.</p>
          </div>
        ) : (
          <>
            {/* KHS Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20 print:border-black/20 print:bg-transparent">
              <table className="w-full text-left text-[13px] print:text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-white/5 print:bg-zinc-100 print:text-black print:border-black/20">
                    <th className="px-5 py-4 text-center w-12">No.</th>
                    <th className="px-5 py-4">Kode MK</th>
                    <th className="px-5 py-4">Mata Kuliah</th>
                    <th className="px-5 py-4 text-center">Kelas</th>
                    <th className="px-5 py-4 text-center">SKS</th>
                    <th className="px-5 py-4 text-center">Nilai</th>
                    <th className="px-5 py-4 text-center">Bobot</th>
                    <th className="px-5 py-4 text-center">SKS x Bobot</th>
                    <th className="px-5 py-4 text-center no-print">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-black/10">
                  {khs.items.map((item, index) => (
                    <tr key={item.krs_id} className="hover:bg-white/5 transition-colors print:hover:bg-transparent">
                      <td className="px-5 py-3.5 text-center text-zinc-500 font-bold print:text-black">{index + 1}</td>
                      <td className="px-5 py-3.5 font-mono text-zinc-400 text-xs print:text-black">{item.kode_mk || "-"}</td>
                      <td className="px-5 py-3.5 font-bold text-zinc-200 print:text-black">{item.nama_mk}</td>
                      <td className="px-5 py-3.5 text-center font-mono text-xs text-zinc-400 print:text-black">{item.kode_kelas}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-zinc-100 print:text-black">{item.sks}</td>
                      <td className="px-5 py-3.5 text-center font-bold">
                        {getBadgeGrade(item.nilai_huruf)}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-zinc-400 print:text-black">
                        {item.bobot > 0 ? item.bobot.toFixed(2) : "-"}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-bold text-zinc-200 print:text-black">
                        {item.total_sks_bobot > 0 ? item.total_sks_bobot.toFixed(2) : "-"}
                      </td>
                      <td className="px-5 py-3.5 text-center no-print">
                        {item.status_nilai === "published" ? (
                          <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Resmi</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Draft</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Subtotal Row */}
                  <tr className="bg-white/5 font-black text-xs uppercase tracking-widest text-zinc-300 print:bg-zinc-50 print:text-black border-t-2 border-white/10 print:border-black/20">
                    <td colSpan={4} className="px-5 py-4 text-left">Total Semester Ini</td>
                    <td className="px-5 py-4 text-center text-white print:text-black">{khs.total_sks_semester}</td>
                    <td colSpan={2} className="px-5 py-4 text-right text-zinc-400 print:text-black">Total Bobot:</td>
                    <td className="px-5 py-4 text-center text-white print:text-black">{khs.total_bobot_semester.toFixed(2)}</td>
                    <td className="no-print"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Performance Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="p-5 rounded-2xl bg-zinc-800/40 border border-white/5 print:border-black/20 print:bg-transparent">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 print:text-zinc-600">IP Semester (IPS)</span>
                <p className="text-3xl font-black text-[#1ea39e] mt-1 print:text-black">{khs.ips.toFixed(2)}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Semester berjalan</p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-800/40 border border-white/5 print:border-black/20 print:bg-transparent">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 print:text-zinc-600">IP Kumulatif (IPK)</span>
                <p className="text-3xl font-black text-emerald-400 mt-1 print:text-black">{khs.ipk.toFixed(2)}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Seluruh semester</p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-800/40 border border-white/5 print:border-black/20 print:bg-transparent">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 print:text-zinc-600">Total SKS Kumulatif</span>
                <p className="text-3xl font-black text-blue-400 mt-1 print:text-black">{khs.total_sks_kumulatif}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">SKS tempuh kumulatif</p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-800/40 border border-white/5 print:border-black/20 print:bg-transparent">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 print:text-zinc-600">Beban Maks SKS Depan</span>
                <p className="text-3xl font-black text-amber-400 mt-1 print:text-black">{khs.max_sks_depan} SKS</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Berdasarkan IPS semester ini</p>
              </div>
            </div>

            {/* Print Signatures */}
            <div className="hidden print:grid grid-cols-2 gap-12 pt-16 text-center text-xs text-black">
              <div>
                <p className="mb-16 font-bold">Dosen Pembimbing Akademik / Wali,</p>
                <p className="font-black uppercase underline">( ............................................................ )</p>
                <p className="text-[10px] text-zinc-600 mt-1">NIDN: .......................................</p>
              </div>
              <div>
                <p className="mb-16 font-bold">Gresik, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}<br />Ketua Program Studi,</p>
                <p className="font-black uppercase underline">( ............................................................ )</p>
                <p className="text-[10px] text-zinc-600 mt-1">NIDN: .......................................</p>
              </div>
            </div>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:text-black { color: black !important; }
          .space-y-6, .space-y-6 * { visibility: visible; }
          .space-y-6 { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; }
        }
      `}} />
    </div>
  );
}
