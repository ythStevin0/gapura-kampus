import { useState, useEffect } from "react";
import { NavLink } from "react-router";
import { type KRS, fetchProfilKRS, type ProfilKRS } from "../../lib/api";
import { StatCard } from "./shared/StatCard";
import { DocCard } from "./shared/DocCard";

interface DashboardHomeProps {
  user: any;
  myKRS: KRS[];
}

export function DashboardHome({ user, myKRS }: DashboardHomeProps) {
  const [profil, setProfil] = useState<ProfilKRS | null>(null);

  useEffect(() => {
    fetchProfilKRS().then(setProfil).catch(console.error);
  }, []);

  const dataMahasiswa = {
    nama: profil?.nama_lengkap || user?.name || "...",
    nim: profil?.nim || "...",
    prodi: profil?.program_studi || "...",
    dosenWali: profil?.nama_dosen_wali || "...",
    semesterAktif: profil?.semester_akademik || "...",
    semesterKe: profil?.semester_sekarang ?? 0,
    ipk: profil?.ipk ?? 0,
    totalSks: profil?.total_sks_kumulatif ?? 0,
    frsDiSetujui: { mk: myKRS.length, sks: myKRS.reduce((a, b) => a + b.sks, 0) },
    kuesioner: "Sudah Diisi / Tidak Wajib"
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Page Header & Breadcrumb - Masterpiece Style */}
      <div className="flex items-center gap-4">
        <NavLink
          to="/dashboard"
          className="group flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-[#1ea39e] hover:bg-white/10 transition-all shadow-2xl backdrop-blur-xl shrink-0"
          title="Kembali ke Gapura UISI"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </NavLink>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1ea39e]" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Universitas Internasional Semen Indonesia</span>
          </div>
          <h1 className="text-3xl font-black text-zinc-100 tracking-tight">DASHBOARD <span className="text-[#1ea39e]">MAHASISWA</span></h1>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">
            <span>Home</span>
            <span className="text-[#1ea39e]/50">&rsaquo;</span>
            <span className="text-zinc-400">Dashboard</span>
          </div>
        </div>
      </div>

      {/* Profile Info Section - Enhanced Glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900/60 border border-white/10 p-8 backdrop-blur-xl shadow-2xl">
        {/* Decorative Background Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1ea39e]/10 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -ml-32 -mb-32 pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
          <div className="space-y-6">
            <div>
              <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-2 uppercase">{dataMahasiswa.nama}</h2>
              <div className="flex items-center gap-4 text-sm font-bold">
                <span className="font-mono text-[#1ea39e] bg-[#1ea39e]/10 px-3 py-1 rounded-lg border border-[#1ea39e]/20">{dataMahasiswa.nim}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                <span className="flex items-center gap-2 text-zinc-400">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                   {dataMahasiswa.prodi}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-4">
              <div className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#1ea39e] group-hover:bg-[#1ea39e]/10 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Dosen Wali</p>
                  <p className="text-sm font-bold text-zinc-100">{dataMahasiswa.dosenWali}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#1ea39e] group-hover:bg-[#1ea39e]/10 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Semester Aktif</p>
                  <p className="text-sm font-bold text-zinc-100">{dataMahasiswa.semesterAktif}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#1ea39e] group-hover:bg-[#1ea39e]/10 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Semester Ke</p>
                  <p className="text-sm font-bold text-zinc-100">{dataMahasiswa.semesterKe}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 shrink-0">
            <a href="?view=transkrip" className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-zinc-100 uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-3 group">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-500 group-hover:text-white transition-colors"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7.5 20 7.5"/></svg>
              Transkrip Nilai
            </a>
            <a href="?view=form" className="px-8 py-3 rounded-2xl bg-[#1ea39e] hover:bg-[#17888a] text-xs font-black text-white uppercase tracking-widest shadow-xl shadow-[#1ea39e]/20 transition-all flex items-center justify-center gap-3 group">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="transition-transform group-hover:rotate-12"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Pengisian FRS
            </a>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid - Updated colors to be more vibrant */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="IPK Kumulatif" value={dataMahasiswa.ipk > 0 ? dataMahasiswa.ipk.toFixed(2) : "0.00"} color="bg-emerald-500" icon={<path d="M12 20v-6M6 20V10M18 20V4"/>} link="LIHAT TRANSKRIP" shadow="shadow-emerald-500/20" href="?view=transkrip" />
        <StatCard label="Total SKS Diambil & Diakui" value={dataMahasiswa.totalSks} color="bg-blue-500" icon={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>} link="LIHAT TRANSKRIP" shadow="shadow-blue-500/20" href="?view=transkrip" />
        <StatCard label={`${dataMahasiswa.frsDiSetujui.mk} MK · ${dataMahasiswa.frsDiSetujui.sks} SKS`} value="FRS Disetujui" color="bg-rose-500" icon={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>} link="LIHAT FRS" shadow="shadow-rose-500/20" href="?view=form" />
        <StatCard label={dataMahasiswa.kuesioner} value="Kuesioner" color="bg-violet-500" icon={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>} link="LIHAT KUESIONER" shadow="shadow-violet-500/20" href="?view=kuesioner" />
      </div>

      {/* Table Section - Premium Masterpiece Style */}
      <div className="rounded-3xl bg-zinc-900/60 border border-white/10 overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-[#1ea39e] rounded-full shadow-[0_0_15px_rgba(30,163,158,0.5)]" />
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              Mata Kuliah Semester Ini <span className="text-zinc-500 font-medium lowercase tracking-normal">— {dataMahasiswa.semesterAktif}</span>
            </h3>
          </div>
          <a href="?view=form" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black text-zinc-100 uppercase tracking-widest hover:bg-[#1ea39e] hover:border-[#1ea39e] transition-all flex items-center gap-2 group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="transition-transform group-hover:scale-110"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
            Buka FRS
          </a>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] bg-black/40">
                <th className="px-8 py-4 w-12 text-center">#</th>
                <th className="px-8 py-4">Mata Kuliah</th>
                <th className="px-8 py-4">Kode</th>
                <th className="px-8 py-4 text-center">SKS</th>
                <th className="px-8 py-4">Kelas</th>
                <th className="px-8 py-4 text-center">Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[14px] text-zinc-300">
              {myKRS.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-16 text-center text-zinc-600 italic tracking-wide">Belum ada mata kuliah yang disetujui untuk semester ini.</td></tr>
              ) : (
                myKRS.map((item, i) => (
                  <tr key={item.id} className="hover:bg-white/0.03 transition-colors group">
                    <td className="px-8 py-4.5 text-center font-bold text-zinc-600">{i + 1}</td>
                    <td className="px-8 py-4.5">
                      <p className="font-black text-zinc-100 group-hover:text-[#1ea39e] transition-colors uppercase tracking-tight">{item.nama_mata_kuliah}</p>
                    </td>
                    <td className="px-8 py-4.5">
                      <span className="font-mono text-xs bg-black/30 px-2 py-1 rounded border border-white/5 text-zinc-500">{item.kode_kelas}</span>
                    </td>
                    <td className="px-8 py-4.5 text-center font-black text-[#1ea39e]">{item.sks}</td>
                    <td className="px-8 py-4.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-zinc-500 font-bold uppercase text-[11px] tracking-tighter">Reguler</span>
                      </div>
                    </td>
                    <td className="px-8 py-4.5 text-center">
                      <span className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto text-zinc-600 font-black">-</span>
                    </td>
                  </tr>
                ))
              )}
              <tr className="bg-black/40 font-black text-zinc-400 text-[11px] uppercase tracking-[0.2em]">
                <td colSpan={3} className="px-8 py-5 text-right border-r border-white/5">Total SKS Diambil</td>
                <td className="px-8 py-5 text-center text-white text-lg tracking-tighter">{myKRS.reduce((a,b) => a + b.sks, 0)}</td>
                <td colSpan={2} className=""></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Documents Section - Grid of Premium Cards */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em]">Dokumen & Tautan</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <DocCard label="Jadwal Perkuliahan" sub="Gasal 2025/2026" color="bg-orange-500" type="UNDUH" />
          <DocCard label="Kalender Akademik" sub="2025-2026" color="bg-rose-500" type="UNDUH" />
          <DocCard label="Peraturan Akademik" sub="versi 2025" color="bg-purple-500" type="UNDUH" />
          <DocCard label="Layanan Akademik" sub="UISI Portal" color="bg-zinc-600" type="BUKA" />
        </div>
      </div>
    </div>
  );
}
