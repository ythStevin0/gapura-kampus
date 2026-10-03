import { useState, useEffect } from "react";
import { fetchAllBuku, createBukuAdmin, kembalikanBukuAdmin, type Buku } from "../lib/api";
import VirtualTable from "../components/ui/VirtualTable";

export default function AdminPerpustakaan() {
  const [buku, setBuku] = useState<Buku[]>([]);
  const [loading, setLoading] = useState(true);
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
      const data = await fetchAllBuku();
      setBuku(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBukuAdmin({
        judul, penulis, penerbit, tahun_terbit: parseInt(tahun), isbn, stok: parseInt(stok), cover_url: cover
      });
      setShowForm(false);
      setJudul(""); setPenulis(""); setPenerbit(""); setTahun(""); setIsbn(""); setStok("1"); setCover("");
      loadData();
    } catch (err) {
      alert("Gagal menambahkan buku");
    }
  };

  const handleReturn = async (id: string) => {
    const peminjamanId = prompt("Masukkan ID Peminjaman (dari resi/kartu) untuk dikembalikan:");
    if (!peminjamanId) return;
    
    try {
      await kembalikanBukuAdmin(peminjamanId);
      alert("Berhasil mengembalikan buku!");
      loadData();
    } catch (err: any) {
      alert("Gagal mengembalikan buku: " + (err.message || "Pastikan ID benar."));
    }
  };

  const columns = [
    { key: "id", header: "ID Buku", width: 300, render: (v: any) => <span className="font-mono text-[10px] text-zinc-500">{v}</span> },
    { key: "judul", header: "Judul", width: 300, render: (v: any) => <span className="font-bold text-zinc-200">{v}</span> },
    { key: "penulis", header: "Penulis", width: 200 },
    { key: "stok", header: "Stok Tersedia", width: 120, render: (v: any) => <span className="font-bold text-blue-400">{v}</span> },
    { key: "isbn", header: "ISBN", width: 150 },
    { 
      key: "actions", header: "Aksi", width: 150, 
      render: (_: any, row: any) => (
        <button
          onClick={() => handleReturn(row.id)}
          className="px-3 py-1 bg-zinc-800 text-xs font-bold rounded hover:bg-zinc-700 transition"
        >
          Proses Kembali
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-light text-zinc-100 mb-1">
            Manajemen <span className="text-blue-400 font-normal">Perpustakaan</span>
          </h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Katalog & Inventori</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition"
        >
          {showForm ? "Batal" : "+ Tambah Buku Baru"}
        </button>
      </div>

      {showForm && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Judul Buku</label>
                <input required type="text" value={judul} onChange={(e)=>setJudul(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Penulis</label>
                <input required type="text" value={penulis} onChange={(e)=>setPenulis(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Penerbit</label>
                <input type="text" value={penerbit} onChange={(e)=>setPenerbit(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Tahun</label>
                  <input type="number" value={tahun} onChange={(e)=>setTahun(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Stok</label>
                  <input type="number" min="1" value={stok} onChange={(e)=>setStok(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">ISBN</label>
                <input type="text" value={isbn} onChange={(e)=>setIsbn(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">URL Cover Image</label>
                <input type="url" placeholder="https://..." value={cover} onChange={(e)=>setCover(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <button type="submit" className="w-full mt-4 bg-blue-500 text-white font-bold text-sm py-3 rounded-lg hover:bg-blue-600 transition">
              Simpan Buku
            </button>
          </form>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
        {loading ? (
          <div className="p-8 text-center text-zinc-500 text-sm animate-pulse">Memuat inventori...</div>
        ) : (
          <VirtualTable data={buku} columns={columns} height={500} />
        )}
      </div>
    </div>
  );
}
