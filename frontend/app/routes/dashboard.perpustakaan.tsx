import { useState, useEffect } from "react";
import { fetchAllBuku, pinjamBuku, fetchPeminjamanSaya, createBukuAdmin, kembalikanBukuAdmin, type Buku, type PeminjamanBuku } from "../lib/api";
import { useOutletContext } from "react-router";

export default function DashboardPerpustakaan() {
  const { user } = useOutletContext<{ user: any }>();
  const isDosen = user?.role === "dosen";
  const isAdmin = user?.role === "admin";
  const canManage = isDosen || isAdmin;

  const [activeTab, setActiveTab] = useState<"katalog" | "pinjaman" | "kelola">("katalog");
  const [katalog, setKatalog] = useState<Buku[]>([]);
  const [pinjaman, setPinjaman] = useState<PeminjamanBuku[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [judul, setJudul] = useState("");
  const [penulis, setPenulis] = useState("");
  const [penerbit, setPenerbit] = useState("");
  const [tahun, setTahun] = useState("");
  const [isbn, setIsbn] = useState("");
  const [stok, setStok] = useState("1");
  const [cover, setCover] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === "katalog" || activeTab === "kelola") {
        const data = await fetchAllBuku();
        setKatalog(data);
      } else {
        const data = await fetchPeminjamanSaya();
        setPinjaman(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handlePinjam = async (buku_id: string) => {
    try {
      await pinjamBuku(buku_id);
      alert("Berhasil meminjam buku. Silakan ambil fisik buku di perpustakaan.");
      loadData();
    } catch (err: any) {
      alert("Gagal meminjam buku: " + (err.message || "Stok habis"));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBukuAdmin({
        judul, penulis, penerbit, tahun_terbit: parseInt(tahun), isbn, stok: parseInt(stok), cover_url: cover
      });
      setShowForm(false);
      setJudul(""); setPenulis(""); setPenerbit(""); setTahun(""); setIsbn(""); setStok("1"); setCover("");
      loadData();
    } catch (err: any) {
      alert("Gagal menambahkan buku: " + (err.message || ""));
    }
  };

  const handleReturn = async (peminjamanId: string) => {
    if (!confirm("Yakin ingin menandai buku ini telah dikembalikan?")) return;
    try {
      await kembalikanBukuAdmin(peminjamanId);
      alert("Berhasil mengembalikan buku!");
      loadData();
    } catch (err: any) {
      alert("Gagal: " + (err.message || "Pastikan ID benar"));
    }
  };

  const filteredKatalog = katalog.filter(
    (b) => b.judul.toLowerCase().includes(search.toLowerCase()) || b.penulis.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-light text-zinc-100 mb-1">
            Perpustakaan <span className="text-blue-400 font-normal">Digital</span>
          </h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Koleksi Buku & E-Library</p>
        </div>
        
        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 backdrop-blur-md">
          <button
            onClick={() => setActiveTab("katalog")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "katalog" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Katalog Buku
          </button>
          <button
            onClick={() => setActiveTab("pinjaman")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "pinjaman" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Peminjaman Saya
          </button>
          {canManage && (
            <button
              onClick={() => setActiveTab("kelola")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "kelola" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Kelola Buku
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-500 animate-pulse text-sm">Memuat data...</div>
      ) : activeTab === "kelola" && canManage ? (
        /* ==================== TAB KELOLA (Dosen & Admin) ==================== */
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition"
            >
              {showForm ? "Batal" : "+ Tambah Buku Baru"}
            </button>
          </div>

          {showForm && (
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Judul Buku</label>
                    <input required type="text" value={judul} onChange={(e)=>setJudul(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Penulis</label>
                    <input required type="text" value={penulis} onChange={(e)=>setPenulis(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Penerbit</label>
                    <input type="text" value={penerbit} onChange={(e)=>setPenerbit(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Tahun</label>
                      <input type="number" value={tahun} onChange={(e)=>setTahun(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Stok</label>
                      <input type="number" min="1" value={stok} onChange={(e)=>setStok(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">ISBN</label>
                    <input type="text" value={isbn} onChange={(e)=>setIsbn(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">URL Cover Image</label>
                    <input type="url" placeholder="https://..." value={cover} onChange={(e)=>setCover(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
                <button type="submit" className="w-full mt-4 bg-emerald-500 text-white font-bold text-sm py-3 rounded-lg hover:bg-emerald-600 transition">
                  Simpan Buku
                </button>
              </form>
            </div>
          )}

          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Judul</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Penulis</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">ISBN</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {katalog.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-zinc-500">Belum ada buku terdaftar</td></tr>
                ) : (
                  katalog.map((b) => (
                    <tr key={b.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-zinc-200">{b.judul}</td>
                      <td className="px-6 py-4 text-xs text-zinc-400">{b.penulis}</td>
                      <td className="px-6 py-4 text-xs font-mono text-zinc-500">{b.isbn || "-"}</td>
                      <td className="px-6 py-4 text-center"><span className="text-sm font-bold text-blue-400">{b.stok}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "katalog" ? (
        /* ==================== TAB KATALOG ==================== */
        <div className="space-y-6">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari judul buku atau penulis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredKatalog.map((buku) => (
              <div key={buku.id} className="group flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all">
                <div className="aspect-[3/4] relative bg-zinc-800">
                  {buku.cover_url ? (
                    <img src={buku.cover_url} alt={buku.judul} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M8 7h6"/><path d="M8 11h8"/>
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                    <span className="text-[10px] font-bold text-zinc-300">Stok: {buku.stok}</span>
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-zinc-100 text-sm line-clamp-2 leading-tight mb-1" title={buku.judul}>{buku.judul}</h3>
                  <p className="text-xs text-zinc-500 line-clamp-1">{buku.penulis}</p>
                  <div className="mt-auto pt-4">
                    <button
                      onClick={() => handlePinjam(buku.id)}
                      disabled={buku.stok <= 0}
                      className="w-full py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                    >
                      {buku.stok > 0 ? "Pinjam Buku" : "Stok Habis"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredKatalog.length === 0 && (
              <div className="col-span-full py-12 text-center text-zinc-500 text-sm">
                {katalog.length === 0 ? "Belum ada buku dalam katalog." : "Tidak ada buku yang cocok dengan pencarian Anda."}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ==================== TAB PEMINJAMAN SAYA ==================== */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinjaman.map((p) => (
              <div key={p.id} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
                <div className="w-16 h-24 shrink-0 rounded-lg bg-zinc-800 border border-white/5 overflow-hidden">
                  {p.buku?.cover_url ? (
                    <img src={p.buku.cover_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-between py-1 flex-1">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 line-clamp-2 leading-tight">{p.buku?.judul}</h3>
                    <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-bold">Batas Waktu: {p.tenggat_waktu}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-widest ${
                      p.status === "Selesai" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      p.status === "Dipinjam" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    }`}>
                      {p.status}
                    </span>
                    {canManage && p.status === "Dipinjam" && (
                      <button 
                        onClick={() => handleReturn(p.id)} 
                        className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition"
                      >
                        Kembalikan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {pinjaman.length === 0 && (
              <div className="col-span-full py-12 text-center text-zinc-500 text-sm">
                Anda belum pernah meminjam buku.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
