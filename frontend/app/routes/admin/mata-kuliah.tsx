import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, BookOpen, Clock, Layers, Trash2, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import { InputField } from "../../components/ui/InputField";
import { SelectField } from "../../components/ui/SelectField";
import { Modal } from "../../components/ui/Modal";
import {
  fetchMataKuliahPaginated,
  createMataKuliah,
  updateMataKuliah,
  deleteMataKuliah,
  type MataKuliah,
  type PaginatedResult,
} from "../../lib/api";

const ITEMS_PER_PAGE = 20;

export default function AdminMataKuliah() {
  const [paginatedData, setPaginatedData] = useState<PaginatedResult<MataKuliah> | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    kode_mk: "",
    nama_mk: "",
    sks: 0,
    semester: 0,
  });

  // Debounce timer ref
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input — menunggu 300ms setelah user berhenti mengetik
  // agar tidak memfilter di setiap keystroke (mencegah lag pada data besar)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadMK(currentPage);
  }, [currentPage]);

  const loadMK = async (page: number) => {
    setLoading(true);
    try {
      const data = await fetchMataKuliahPaginated(page, ITEMS_PER_PAGE);
      setPaginatedData(data);
    } catch (err: any) {
      console.error("Gagal mengambil data mata kuliah:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === "sks" || name === "semester" ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        sks: Number(formData.sks),
        semester: Number(formData.semester),
      };

      if (isEdit && editId) {
        await updateMataKuliah(editId, payload);
      } else {
        await createMataKuliah(payload);
      }
      
      setIsModalOpen(false);
      setFormData({ kode_mk: "", nama_mk: "", sks: 0, semester: 0 });
      setIsEdit(false);
      setEditId(null);
      loadMK(currentPage);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = useCallback((mk: MataKuliah) => {
    setFormData({
      kode_mk: mk.kode_mk,
      nama_mk: mk.nama_mk,
      sks: mk.sks,
      semester: mk.semester,
    });
    setEditId(mk.id);
    setIsEdit(true);
    setIsModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback(async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus mata kuliah ini?")) {
      try {
        await deleteMataKuliah(id);
        loadMK(currentPage);
      } catch (err: any) {
        alert(err.message || "Gagal menghapus mata kuliah");
      }
    }
  }, [currentPage]);

  // useMemo untuk filter — mencegah re-kalkulasi saat komponen re-render
  // tanpa perubahan pada data atau kata kunci pencarian
  const filteredMK = useMemo(() => {
    if (!paginatedData?.items) return [];
    if (!debouncedSearch) return paginatedData.items;
    
    return paginatedData.items.filter(
      (mk) =>
        mk.nama_mk.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        mk.kode_mk.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [paginatedData?.items, debouncedSearch]);

  const totalItems = paginatedData?.total_items ?? 0;
  const totalPages = paginatedData?.total_pages ?? 1;
  const totalSKS = useMemo(
    () => filteredMK.reduce((acc, curr) => acc + curr.sks, 0),
    [filteredMK]
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            Daftar Mata Kuliah
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Kelola kurikulum dan bobot SKS prodi.</p>
        </div>
        <button
          onClick={() => {
            setIsEdit(false);
            setEditId(null);
            setFormData({ kode_mk: "", nama_mk: "", sks: 0, semester: 0 });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-lg shadow-emerald-600/20 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Mata Kuliah
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total MK</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{totalItems}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total SKS (Halaman Ini)</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{totalSKS}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Halaman</p>
          <p className="text-2xl font-bold text-sky-400 mt-1">{currentPage} / {totalPages}</p>
        </div>
      </div>

      {/* Search & Table */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="p-4 border-b border-zinc-800/60 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Cari Kode atau Nama Mata Kuliah..."
            className="bg-transparent border-none focus:ring-0 text-sm text-zinc-200 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/60">
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Kode & Nama MK</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">SKS</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Semester</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="h-10 w-48 bg-zinc-800 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-12 bg-zinc-800 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-12 bg-zinc-800 rounded"></div></td>
                    <td className="p-4"><div className="h-8 w-16 bg-zinc-800 rounded"></div></td>
                  </tr>
                ))
              ) : filteredMK.length > 0 ? (
                filteredMK.map((mk) => (
                  <tr key={mk.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-zinc-100 font-medium">{mk.nama_mk}</span>
                        <span className="text-xs text-zinc-500 font-mono tracking-tight">{mk.kode_mk}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded border border-emerald-500/20 flex items-center w-fit gap-1">
                        <Clock className="w-3 h-3" />
                        {mk.sks} SKS
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs font-medium rounded border border-amber-500/20 flex items-center w-fit gap-1">
                        <Layers className="w-3 h-3" />
                        Semester {mk.semester}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditClick(mk)}
                          className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(mk.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-zinc-600 italic text-sm">
                    Mata kuliah tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800/60 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Menampilkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} dari {totalItems} mata kuliah
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    page === currentPage
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit MK */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEdit ? "Edit Mata Kuliah" : "Tambah Mata Kuliah Baru"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Kode Mata Kuliah"
            name="kode_mk"
            placeholder="Contoh: IF101 / MKDU-01"
            required
            value={formData.kode_mk}
            onChange={handleInputChange}
          />
          
          <InputField
            label="Nama Mata Kuliah"
            name="nama_mk"
            placeholder="Contoh: Algoritma & Pemrograman"
            required
            value={formData.nama_mk}
            onChange={handleInputChange}
          />

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Jumlah SKS"
              name="sks"
              options={[
                { value: "1", label: "1 SKS" },
                { value: "2", label: "2 SKS" },
                { value: "3", label: "3 SKS" },
                { value: "4", label: "4 SKS" },
                { value: "6", label: "6 SKS" },
              ]}
              required
              value={formData.sks.toString()}
              onChange={handleInputChange}
            />
            <SelectField
              label="Semester"
              name="semester"
              options={[
                { value: "1", label: "Semester 1" },
                { value: "2", label: "Semester 2" },
                { value: "3", label: "Semester 3" },
                { value: "4", label: "Semester 4" },
                { value: "5", label: "Semester 5" },
                { value: "6", label: "Semester 6" },
                { value: "7", label: "Semester 7" },
                { value: "8", label: "Semester 8" },
              ]}
              required
              value={formData.semester.toString()}
              onChange={handleInputChange}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-emerald-600/20"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Mata Kuliah"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
