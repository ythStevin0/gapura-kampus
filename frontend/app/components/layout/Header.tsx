import React from "react";

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isSiakad: boolean;
  user: any;
  onLogout: () => void;
  onChangePassword: () => void;
  dropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
}

function RealTimeClock() {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden md:flex flex-col items-end px-3 py-1 border-r border-white/10 mr-2">
      <span className="text-[11px] font-black text-white/90 tabular-nums tracking-wider">
        {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tight">
        {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
      </span>
    </div>
  );
}

import { NotificationBell } from "./NotificationBell";

export function Header({ 
  sidebarOpen, 
  setSidebarOpen, 
  isSiakad, 
  user, 
  onLogout, 
  onChangePassword,
  dropdownOpen,
  setDropdownOpen
}: HeaderProps) {
  return (
    <header className="relative z-20 flex items-center justify-between px-4 py-0 h-14 bg-black/40 border-b border-white/10 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-zinc-400 hover:text-zinc-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-linear-to-br from-red-600 to-red-700 rounded flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C12 2 8 8 8 13C8 15.2091 9.79086 17 12 17C14.2091 17 16 15.2091 16 13C16 8 12 2 12 2Z" fill="white"/>
              <path d="M6.5 6C6.5 6 3 11 4 14.5C4.79526 17.2831 8.5 17.5 12 17.5C15.5 17.5 19.2047 17.2831 20 14.5C21 11 17.5 6 17.5 6C17.5 6 14 11 12 11C10 11 6.5 6 6.5 6Z" fill="rgba(255,255,255,0.75)"/>
            </svg>
          </div>
          <span className="font-bold text-sm tracking-wider uppercase">
            {isSiakad ? (
              <>SIAKAD<span className="text-red-500">UISI</span></>
            ) : (
              <>GAPURA<span className="text-red-500">UISI</span></>
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <RealTimeClock />

        <NotificationBell setOtherDropdownOpen={setDropdownOpen} />

        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-black text-zinc-400 group-hover:scale-110 transition-transform uppercase">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-zinc-300 leading-none">{user?.name || user?.email}</p>
              <p className="text-[10px] text-zinc-500 mt-1 uppercase font-black tracking-tighter">
                {user?.role === "admin" ? "Administrator" : user?.role === "dosen" ? "Dosen" : "Mahasiswa"}
              </p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
              <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-50">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 transition-colors text-left border-b border-zinc-800"
                  onClick={() => {
                    setDropdownOpen(false);
                    onChangePassword();
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                  Ubah Password
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
                  </svg>
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
