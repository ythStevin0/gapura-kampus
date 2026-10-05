import { NavLink } from "react-router";
import type { ReactNode } from "react";

interface AppCard {
  id: string;
  label: string;
  to: string;
  icon: ReactNode;
  color: string; // Base background color (filled)
  accentColor: string; // Text and icon color
}

const appCards: AppCard[] = [
  {
    id: "siakad",
    label: "Sistem Informasi Akademik",
    to: "/dashboard/krs",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/>
      </svg>
    ),
    color: "bg-blue-600/20",
    accentColor: "text-blue-400",
  },
  {
    id: "kehadiran",
    label: "Kehadiran Perkuliahan",
    to: "/dashboard/jadwal",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
        <line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
        <path d="m9 16 2 2 4-4"/>
      </svg>
    ),
    color: "bg-emerald-600/20",
    accentColor: "text-emerald-400",
  },
  {
    id: "peminjaman",
    label: "Peminjaman Ruang",
    to: "/dashboard",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    color: "bg-orange-600/20",
    accentColor: "text-orange-400",
  },
  {
    id: "repository",
    label: "Masterpiece UISI",
    to: "/dashboard/masterpiece",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    color: "bg-amber-600/20",
    accentColor: "text-amber-400",
  },
  {
    id: "uisilink",
    label: "Perpustakaan UISI",
    to: "/dashboard/perpustakaan",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
        <path d="M8 7h6"/>
        <path d="M8 11h8"/>
      </svg>
    ),
    color: "bg-cyan-600/20",
    accentColor: "text-cyan-400",
  },
  {
    id: "uisipay",
    label: "UISI Pay (Billing)",
    to: "/dashboard/uisi-pay",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><line x1="7" x2="7.01" y1="15" y2="15"/><line x1="11" x2="11.01" y1="15" y2="15"/>
      </svg>
    ),
    color: "bg-yellow-600/20",
    accentColor: "text-yellow-400",
  },
];

export default function LayananGrid() {
  return (
    <div className="space-y-5 pt-4">
      <div className="flex items-center gap-3 px-1">
        <div className="w-1.5 h-4 bg-[#1ea39e] rounded-full shadow-[0_0_10px_rgba(30,163,158,0.5)]" />
        <h2 className="text-[10px] font-black tracking-[0.3em] text-zinc-500 uppercase">Aplikasi & Layanan</h2>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {appCards.map((card) => (
          <NavLink
            key={card.id}
            to={card.to}
            className="group relative flex flex-col items-center justify-center gap-4 p-7 rounded-3xl bg-zinc-900/60 border border-white/5 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] shadow-xl"
          >
            {/* The Colored Background Panels (Split Curtain Reveal) */}
            <div className="absolute inset-0 z-0 flex pointer-events-none">
              <div className={`w-1/2 h-full ${card.color} transition-transform duration-500 ease-out group-hover:-translate-x-full`} />
              <div className={`w-1/2 h-full ${card.color} transition-transform duration-500 ease-out group-hover:translate-x-full`} />
            </div>
            
            {/* Content Container */}
            <div className={`relative z-10 ${card.accentColor} transition-transform duration-300 group-hover:scale-110`}>
              {card.icon}
            </div>
            
            <p className="relative z-10 text-[10px] font-black text-zinc-100 text-center leading-none uppercase tracking-tighter transition-all duration-300 group-hover:tracking-widest">
              {card.label}
            </p>
            
            {/* Border Accent Reveal */}
            <div className={`absolute inset-0 border-2 border-transparent group-hover:border-white/10 transition-all duration-500 rounded-3xl pointer-events-none`} />
          </NavLink>
        ))}
      </div>
    </div>
  );
}
