import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, Users, UserPlus, Mail, Building2, Trash2, Edit } from "lucide-react";
import { InputField } from "../../components/ui/InputField";
import { SelectField } from "../../components/ui/SelectField";
import { Modal } from "../../components/ui/Modal";
import { fetchAllDosen, createDosen, updateDosen, deleteDosen, type Dosen } from "../../lib/api";
import { useDebounce } from "../../hooks/useOptimization";

export default function AdminDosen() {
  const [dosenList, setDosenList] = useState<Dosen[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Edit State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nidn: "",
    nama_lengkap: "",
    gelar_depan: "",
    gelar_belakang: "",
    departemen: "",
    password: "",
  });

  useEffect(() => {
    loadDosen();
  }, []);

  const loadDosen = async () => {
    try {
      const data = await fetchAllDosen();
      setDosenList(data);
    } catch (err: any) {
      console.error("Gagal mengambil data dosen:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData({
      nidn: "",
      nama_lengkap: "",
      gelar_depan: "",
      gelar_belakang: "",
      departemen: "",
      password: "",
    });
    setError(null);
    setIsModalOpen(true);
  };

  // useCallback: referensi fungsi stabil → child component tidak re-render
  const openEditModal = useCallback((d: Dosen) => {
    setIsEditMode(true);
    setEditingId(d.id);
    setFormData({
      nidn: d.nidn,
      nama_lengkap: d.nama_lengkap,
      gelar_depan: d.gelar_depan || "",
      gelar_belakang: d.gelar_belakang || "",
      departemen: d.departemen,
      password: "",
    });
    setError(null);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string, nama: string) => {
    if (!confirm(`Hapus dosen: ${nama}?`)) return;
    try {
      await deleteDosen(id);
      loadDosen();
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        gelar_depan: formData.gelar_depan || null,
        gelar_belakang: formData.gelar_belakang || null,
      };
      
      if (isEditMode && editingId) {
        await updateDosen(editingId, payload);
      } else {
        await createDosen(payload);
      }
      
      setIsModalOpen(false);
      setFormData({
        nidn: "",
        nama_lengkap: "",
        gelar_depan: "",
        gelar_belakang: "",
        departemen: "",
        password: "",
      });
      loadDosen();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debounce: menunggu 300ms setelah user berhenti mengetik
  // sebelum memfilter array → mencegah lag pada data besar
  const debouncedSearch = useDebounce(searchTerm, 300);

  // useMemo: hanya re-filter jika data atau keyword benar-benar berubah
  // Tanpa useMemo: filter dijalankan setiap kali komponen re-render
  // (bahkan saat membuka modal, mengetik form, dll — yang tidak relevan)
  const filteredDosen = useMemo(() => {
    if (!debouncedSearch) return dosenList;
    const q = debouncedSearch.toLowerCase();
    return dosenList.filter(
      (d) =>
        d.nama_lengkap.toLowerCase().includes(q) ||
        d.nidn.includes(debouncedSearch) ||
        d.departemen.toLowerCase().includes(q)
    );
  }, [dosenList, debouncedSearch]);

  // useMemo: mencegah kalkulasi ulang jumlah departemen unik
  const uniqueDeptCount = useMemo(
    () => new Set(dosenList.map(d => d.departemen)).size,
    [dosenList]
  );

  // Helper untuk preview email keren
  const getEmailPreview = () => {
    if (!formData.nama_lengkap) return "...@dosen.uisi.ac.id";
    const parts = formData.nama_lengkap.trim().toLowerCase().split(/\s+/);
    const year = new Date().getFullYear() % 100;
    let username = parts[0];
    if (parts.length > 1) {
      username = `${parts[0]}.${parts[parts.length - 1]}`;
    }
    return `${username}${year}@dosen.uisi.ac.id`;
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Kelola Dosen
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Daftar dosen tetap dan tidak tetap UISI.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-lg shadow-indigo-600/20 text-sm font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Tambah Dosen
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Dosen</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{dosenList.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Departemen</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">
            {uniqueDeptCount}
          </p>
        </div>
      </div>

      {/* Search & Table */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="p-4 border-b border-zinc-800/60 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Cari NIDN, Nama, atau Departemen..."
            className="bg-transparent border-none focus:ring-0 text-sm text-zinc-200 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/60">
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Dosen</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">NIDN</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Departemen</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="h-10 w-40 bg-zinc-800 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-20 bg-zinc-800 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-32 bg-zinc-800 rounded"></div></td>
                    <td className="p-4"><div className="h-8 w-16 bg-zinc-800 rounded"></div></td>
                  </tr>
                ))
              ) : filteredDosen.length > 0 ? (
                filteredDosen.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-zinc-100 font-medium">
                          {d.gelar_depan ? `${d.gelar_depan} ` : ""}
                          {d.nama_lengkap}
                          {d.gelar_belakang ? `, ${d.gelar_belakang}` : ""}
                        </span>
                        <span className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {d.email || `${d.nidn}@dosen.uisi.ac.id`}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-zinc-400 font-mono text-sm">{d.nidn}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-medium rounded-full border border-indigo-500/20 flex items-center w-fit gap-1">
                        <Building2 className="w-3 h-3" />
                        {d.departemen}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEditModal(d)}
                          className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(d.id, d.nama_lengkap)}
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
                    Data dosen tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Dosen */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? "Edit Data Dosen" : "Daftarkan Dosen Baru"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="NIDN (10 Digit)"
              name="nidn"
              placeholder="Contoh: 2011110001"
              required
              value={formData.nidn}
              onChange={handleInputChange}
              error={isEditMode ? "NIDN tidak dapat diubah" : undefined}
            />
            <InputField
              label="Nama Lengkap (Tanpa Gelar)"
              name="nama_lengkap"
              placeholder="Contoh: Stevino Nugroho"
              required
              value={formData.nama_lengkap}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Gelar Depan (Opsional)"
              name="gelar_depan"
              placeholder="Contoh: Dr. / Prof."
              value={formData.gelar_depan}
              onChange={handleInputChange}
            />
            <InputField
              label="Gelar Belakang (Opsional)"
              name="gelar_belakang"
              placeholder="Contoh: M.Kom / Ph.D"
              value={formData.gelar_belakang}
              onChange={handleInputChange}
            />
          </div>

          <SelectField
            label="Departemen"
            name="departemen"
            options={[
              { value: "Informatika", label: "Teknik Informatika" },
              { value: "Sistem Informasi", label: "Sistem Informasi" },
              { value: "Manajemen Rekayasa", label: "Manajemen Rekayasa" },
              { value: "DKV", label: "Desain Komunikasi Visual" },
              { value: "Manajemen", label: "Manajemen" },
              { value: "Akuntansi", label: "Akuntansi" },
              { value: "Logistik", label: "Teknik Logistik" },
            ]}
            required
            value={formData.departemen}
            onChange={handleInputChange}
          />

          {!isEditMode && (
            <div className="space-y-2">
              <InputField
                label="Password Akun"
                name="password"
                type="password"
                placeholder="Minimal 6 karakter"
                required={!isEditMode}
                value={formData.password}
                onChange={handleInputChange}
              />
              <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800/50">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Preview Email Login</p>
                <p className="text-sm text-indigo-400 font-mono mt-1">{getEmailPreview()}</p>
              </div>
            </div>
          )}

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
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-600/20"
            >
              {isSubmitting ? "Menyimpan..." : (isEditMode ? "Simpan Perubahan" : "Daftarkan Dosen")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
