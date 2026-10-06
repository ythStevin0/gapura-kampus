import React from "react";

export function NotificationBell({ setOtherDropdownOpen }: { setOtherDropdownOpen: (open: boolean) => void }) {
  const [notificationOpen, setNotificationOpen] = React.useState(false);
  const [berita, setBerita] = React.useState<any[]>([]);
  const [readBeritaIds, setReadBeritaIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    // Load read status from localStorage
    const savedReads = localStorage.getItem("readBeritaIds");
    if (savedReads) {
      try {
        setReadBeritaIds(JSON.parse(savedReads));
      } catch (e) {}
    }

    fetch("http://localhost:8080/api/berita")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBerita(data.data.slice(0, 5)); // Ambil 5 berita terbaru
        }
      })
      .catch(err => console.error("Gagal mengambil berita:", err));
  }, []);

  const markAsRead = (id: string) => {
    if (!readBeritaIds.includes(id)) {
      const newReadIds = [...readBeritaIds, id];
      setReadBeritaIds(newReadIds);
      localStorage.setItem("readBeritaIds", JSON.stringify(newReadIds));
    }
  };

  // Memoized unreadCount with O(1) Set lookup (menggantikan filter + includes berulang di setiap render)
  const unreadCount = React.useMemo(() => {
    const readSet = new Set(readBeritaIds);
    return berita.filter(b => !readSet.has(b.id)).length;
  }, [berita, readBeritaIds]);

  return (
    <div className="relative">
      <button 
        onClick={() => {
          setNotificationOpen(!notificationOpen);
          setOtherDropdownOpen(false);
        }}
        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors relative group"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-zinc-900 animate-pulse" />
        )}
      </button>

      {notificationOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNotificationOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pemberitahuan Terbaru</h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[8px] font-black">{unreadCount} BARU</span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {berita.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-zinc-500 italic">Tidak ada pemberitahuan baru</p>
                </div>
              ) : (
                berita.map((item) => {
                  const isRead = readBeritaIds.includes(item.id);
                  return (
                    <button 
                      key={item.id}
                      onClick={() => markAsRead(item.id)}
                      className={`w-full p-4 border-b border-white/5 hover:bg-white/5 transition-colors text-left group relative ${isRead ? 'opacity-70' : ''}`}
                    >
                      {!isRead && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#1ea39e] rounded-r-full"></div>}
                      <div className={`flex gap-3 ${!isRead ? 'pl-2' : ''}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isRead ? 'bg-zinc-800' : 'bg-[#1ea39e]/10'}`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isRead ? "#71717a" : "#1ea39e"} strokeWidth="2.5"><path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10l4 4v10a2 2 0 0 1-2 2z"/><polyline points="14 3 14 8 19 8"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h1"/></svg>
                        </div>
                        <div className="space-y-1 overflow-hidden">
                          <p className={`text-xs font-bold truncate group-hover:text-[#1ea39e] transition-colors ${isRead ? 'text-zinc-400' : 'text-zinc-100'}`}>{item.judul}</p>
                          <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">{item.isi}</p>
                          <p className="text-[9px] text-zinc-600 font-bold uppercase mt-1">
                            {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {item.kategori}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <button 
              onClick={() => {
                const allIds = berita.map(b => b.id);
                setReadBeritaIds(allIds);
                localStorage.setItem("readBeritaIds", JSON.stringify(allIds));
              }}
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] transition-all border-t border-white/5"
            >
              Tandai Semua Dibaca
            </button>
          </div>
        </>
      )}
    </div>
  );
}
