import React, { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import { fetchTranskrip, type TranskripResponse } from "../../lib/api";

export function TranskripView({ user }: { user: any }) {
  const [transkrip, setTranskrip] = useState<TranskripResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchTranskrip()
      .then((data) => {
        setTranskrip(data);
      })
      .catch((err) => {
        setError(err.message || "Gagal memuat transkrip nilai akademik");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const getBadgeGrade = (huruf: string) => {
    if (!huruf || huruf === "-") {
      return <span className="text-zinc-500 font-mono">-</span>;
    }
    if (huruf === "A" || huruf === "AB") {
      return <span className="px-2 py-0.5 rounded text-[11px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 print:border-none print:text-black">{huruf}</span>;
    }
    if (huruf === "B" || huruf === "BC") {
      return <span className="px-2 py-0.5 rounded text-[11px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 print:border-none print:text-black">{huruf}</span>;
    }
    if (huruf === "C") {
      return <span className="px-2 py-0.5 rounded text-[11px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 print:border-none print:text-black">{huruf}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[11px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 print:border-none print:text-black">{huruf}</span>;
  };

  let globalCourseNumber = 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            Transkrip Nilai <span className="text-zinc-500 font-normal text-lg">Akademik</span>
          </h1>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            <span>&rsaquo;</span>
            <span className="text-zinc-400">Laporan Nilai</span>
            <span>&rsaquo;</span>
            <span className="text-[#1ea39e]">Transkrip / IPK Resmi</span>
          </div>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1ea39e] hover:bg-[#188f88] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#1ea39e]/20 active:scale-95 shrink-0"
        >
          <Printer size={16} />
          CETAK TRANSKRIP
        </button>
      </div>

      {/* Transcript Document Card */}
      <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden print:bg-white print:text-black print:border-none print:shadow-none print:m-0 print:p-0 shadow-2xl">
        
        {/* Document Header (Visible in print) */}
        <div className="p-8 border-b border-white/5 print:border-black/20">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#1ea39e] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-[#1ea39e]/20 print:shadow-none print:w-12 print:h-12 print:text-xl">
                U
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tighter text-zinc-100 print:text-black uppercase">Universitas Internasional Semen Indonesia</h2>
                <p className="text-zinc-500 text-xs font-bold print:text-zinc-700">Direktorat Administrasi Akademik & Kemahasiswaan (UISI)</p>
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-sm font-black text-[#1ea39e] uppercase tracking-widest mb-1 print:text-black">Transkrip Nilai Sementara</h3>
              <p className="text-zinc-500 text-[10px] font-bold print:text-zinc-700 uppercase tracking-tighter">
                Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white/5 p-6 rounded-2xl border border-white/5 print:bg-transparent print:border-none print:p-0">
            {[
              { label: "Nama Mahasiswa", value: transkrip?.nama_lengkap || user?.name || "..." },
              { label: "NIM", value: transkrip?.nim || "..." },
              { label: "Program Studi", value: transkrip?.program_studi || "..." },
              { label: "Jenjang Studi", value: "Sarjana (S1)" },
            ].map((info, i) => (
              <div key={i} className="space-y-1">
                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest print:text-zinc-600">{info.label}</span>
                <p className="text-sm font-bold text-zinc-200 print:text-black">{info.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Loading / Error / Empty States */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#1ea39e] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Memuat Transkrip Nilai...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 font-medium">
            {error}
          </div>
        ) : !transkrip || transkrip.semesters.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 space-y-2">
            <p className="text-sm font-medium">Belum ada riwayat perkuliahan atau nilai yang dipublikasikan.</p>
            <p className="text-xs text-zinc-600">Nilai akan otomatis muncul di transkrip setelah dosen mempublikasikan nilai akhir.</p>
          </div>
        ) : (
          <>
            {/* Transcript Table */}
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 print:bg-zinc-100">
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-white/5 print:text-black print:border-zinc-300 w-12 text-center">No</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-white/5 print:text-black print:border-zinc-300">Kode MK</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-white/5 print:text-black print:border-zinc-300">Mata Kuliah</th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-white/5 print:text-black print:border-zinc-300">SKS</th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-white/5 print:text-black print:border-zinc-300">Nilai</th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-white/5 print:text-black print:border-zinc-300">Bobot</th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-white/5 print:text-black print:border-zinc-300">SKS x Bobot</th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-white/5 print:text-black print:border-zinc-300 no-print">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transkrip.semesters.map((sem, sIdx) => (
                    <React.Fragment key={sIdx}>
                      <tr className="bg-zinc-800/30 print:bg-zinc-100">
                        <td colSpan={8} className="px-6 py-3 text-[11px] font-black text-[#1ea39e] uppercase tracking-[0.2em] border-y border-white/5 print:text-black print:border-zinc-300">
                          Semester Akademik: {sem.semester_akademik} (Total {sem.total_sks} SKS · IPS: {sem.ips.toFixed(2)})
                        </td>
                      </tr>
                      {sem.items.map((course) => {
                        globalCourseNumber += 1;
                        return (
                          <tr key={course.kode_mk + globalCourseNumber} className="group hover:bg-white/5 transition-colors print:hover:bg-transparent border-b border-white/5 print:border-zinc-200">
                            <td className="px-6 py-3 text-xs text-zinc-500 font-medium print:text-black text-center">
                              {globalCourseNumber}
                            </td>
                            <td className="px-6 py-3 text-xs text-zinc-400 font-mono font-bold print:text-black">
                              {course.kode_mk || "-"}
                            </td>
                            <td className="px-6 py-3 text-xs text-zinc-200 font-bold uppercase print:text-black">
                              {course.nama_mk}
                            </td>
                            <td className="px-6 py-3 text-xs text-center text-zinc-300 font-bold print:text-black">
                              {course.sks}
                            </td>
                            <td className="px-6 py-3 text-xs text-center font-black">
                              {getBadgeGrade(course.nilai_huruf)}
                            </td>
                            <td className="px-6 py-3 text-xs text-center text-zinc-400 font-medium font-mono print:text-black">
                              {course.bobot.toFixed(2)}
                            </td>
                            <td className="px-6 py-3 text-xs text-center text-zinc-200 font-black font-mono print:text-black">
                              {course.total_bobot.toFixed(2)}
                            </td>
                            <td className="px-6 py-3 text-xs text-center no-print">
                              {course.lulus ? (
                                <span className="text-[9px] font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Lulus</span>
                              ) : (
                                <span className="text-[9px] font-bold text-rose-400 uppercase bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">Tidak Lulus</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="p-8 bg-zinc-900/60 border-t border-white/10 print:bg-white print:border-black/20">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 flex-1">
                  {[
                    { label: "Total SKS Tempuh", value: transkrip.total_sks_tempuh },
                    { label: "Total SKS Lulus", value: transkrip.total_sks_lulus },
                    { label: "Total Kredit Bobot", value: transkrip.total_bobot.toFixed(2) },
                    { label: "IPK Kumulatif", value: transkrip.ipk.toFixed(2), highlight: true },
                  ].map((stat, i) => (
                    <div key={i} className="space-y-1">
                      <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest print:text-zinc-600">{stat.label}</span>
                      <p className={`text-2xl font-black ${stat.highlight ? 'text-[#1ea39e]' : 'text-zinc-100'} print:text-black`}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
                
                {/* Signature Placeholder (Print only) */}
                <div className="hidden print:block text-center min-w-60">
                  <p className="text-[10px] font-bold text-zinc-700 mb-16 uppercase">
                    Gresik, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Direktur Akademik & Kemahasiswaan,
                  </p>
                  <p className="text-sm font-black text-black uppercase underline decoration-2">Dr. Ir. Eko Nurcahyo, M.Kom.</p>
                  <p className="text-[9px] font-bold text-zinc-600 uppercase">NIDN: 0720108301</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; background: white !important; }
          .no-print { display: none !important; }
          .space-y-6, .space-y-6 * { visibility: visible; }
          .space-y-6 { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            margin: 0; 
            padding: 24px; 
          }
        }
      `}} />
    </div>
  );
}
