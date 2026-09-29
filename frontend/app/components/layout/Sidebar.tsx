import { NavLink, useLocation } from "react-router";
import { useState } from "react";
import type { MenuItem } from "../../types/layout";
import { menuByRole } from "../../constants/menu";

interface SidebarProps {
  sidebarOpen: boolean;
  role: string;
  isSiakad: boolean;
  onOpenMessage: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export function Sidebar({ sidebarOpen, role, isSiakad, onOpenMessage, setSidebarOpen }: SidebarProps) {
  const location = useLocation();
  const [openDropdowns, setOpenDropdowns] = useState<string[]>(["Laporan Nilai", "Yudisium"]);
  const viewParam = new URLSearchParams(location.search).get("view");

  const toggleDropdown = (label: string) => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      if (!openDropdowns.includes(label)) {
        setOpenDropdowns(prev => [...prev, label]);
      }
      return;
    }
    setOpenDropdowns(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const allMenus = menuByRole[role] || menuByRole.mahasiswa;
  const menus = allMenus.filter(item => {
    if (role === "admin") return true; 
    if (role === "dosen") return true; // Dosen selalu tampilkan semua menu
    if (isSiakad) {
      return (
        item.to?.includes("/krs") || 
        item.type === "header" || 
        (item.isDropdown && item.subItems?.some(sub => sub.to.includes("/krs")))
      );
    } else {
      return (item.to === "/dashboard" || item.label === "Pencarian" || item.label === "Mahakarya UISI") && !item.to?.includes("/krs");
    }
  });

  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.type === "header") {
      return sidebarOpen ? (
        <p key={index} className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
          {item.label}
        </p>
      ) : <div key={index} className="h-4" />;
    }

    if (item.isDropdown) {
      const isOpen = openDropdowns.includes(item.label);
      return (
        <div key={index} className="space-y-0.5">
          <button 
            onClick={() => toggleDropdown(item.label)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-100 transition-all duration-150 group"
          >
            <span className="shrink-0">{item.icon}</span>
            {sidebarOpen && (
              <>
                <span className="whitespace-nowrap font-medium text-[13px]">{item.label}</span>
                <svg 
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" 
                  className={`ml-auto text-zinc-600 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </>
            )}
          </button>
          {sidebarOpen && isOpen && (
            <div className="pl-9 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
              {item.subItems?.map((sub, sIdx) => {
                const currentView = new URLSearchParams(location.search).get("view");
                const itemUrl = new URL(sub.to, "http://localhost");
                const itemView = itemUrl.searchParams.get("view");
                const isTrulyActive = (itemView === currentView);

                return (
                  <NavLink
                    key={sIdx}
                    to={sub.to}
                    className={`flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium transition-colors 
                    ${isTrulyActive ? "text-[#1ea39e]" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    {sub.icon ? (
                      <span className="shrink-0 opacity-70">{sub.icon}</span>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 opacity-60">
                        <path d="M12 20v-6M6 20V10M18 20V4"/>
                      </svg>
                    )}
                    {sub.label}
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={index}
        to={item.to || "#"}
        end={item.to === "/dashboard" || item.to === "/dashboard/krs"}
        className={({ isActive }) => {
          const url = new URL(item.to || "#", "http://localhost");
          const itemView = url.searchParams.get("view");
          
          // Logika pencocokan yang lebih ketat
          const isTrulyActive = isActive && (itemView === viewParam);

          return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group
          ${isTrulyActive
            ? (isSiakad ? "bg-[#1ea39e]/20 text-[#1ea39e] border border-[#1ea39e]/30" : "bg-red-600/20 text-red-400 border border-red-600/30")
            : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
          }`;
        }}
      >
        <span className="shrink-0">{item.icon}</span>
        {sidebarOpen && (
          <span className="whitespace-nowrap transition-opacity duration-200 text-[13px] font-medium">
            {item.label}
          </span>
        )}
        {sidebarOpen && item.badge && (
          <span className="ml-auto px-1.5 py-0.5 rounded bg-amber-500 text-[8px] font-black text-zinc-950 uppercase animate-pulse">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <aside
      className={`
        flex flex-col bg-black/40 backdrop-blur-xl border-r border-white/10
        transition-all duration-300 ease-in-out overflow-hidden shrink-0
        ${sidebarOpen ? "w-52" : "w-0 lg:w-14"}
      `}
    >
      <nav className="flex-1 mt-4 space-y-0.5 px-2 overflow-y-auto custom-scrollbar">
        {menus.map((item, index) => renderMenuItem(item, index))}
      </nav>

      <div className="p-4 mt-auto">
        <button
          onClick={onOpenMessage}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold text-white bg-[#1ea39e] hover:bg-[#188f88] transition-all duration-150 shadow-lg shadow-[#1ea39e]/20 ${!sidebarOpen ? "px-2" : "px-4"}`}
        >
          {!sidebarOpen && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          )}
          {sidebarOpen && <span>Send message</span>}
        </button>
      </div>
    </aside>
  );
}
