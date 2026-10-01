import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchAllMahasiswa, createMahasiswa, updateMahasiswa, deleteMahasiswa, type Mahasiswa } from "../../lib/api";
import { Modal } from "../../components/ui/Modal";
import { InputField } from "../../components/ui/InputField";
import { SelectField } from "../../components/ui/SelectField";
import { UserPlus, Edit, Trash2, GraduationCap, Building2, Calendar, CheckCircle2, XCircle, ShieldCheck, Search } from "lucide-react";
import { useDebounce } from "../../hooks/useOptimization";

export default function AdminMahasiswa() {
  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    nim: "",
    nama_lengkap: "",
    program_studi: "Teknik Informatika",
    angkatan: new Date().getFullYear(),
    jalur_masuk: "SNBT",
    status_ukt: false,
    status_bip: false,
    izin_krs: false,
    password: "",
  });

  const loadMahasiswa = () => {
    setLoading(true);
    fetchAllMahasiswa()
      .then(setMahasiswaList)
      .catch((err) => console.error("Gagal load mahasiswa:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMahasiswa();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : 
              name === "angkatan" ? parseInt(value) : value,
    }));
  };

  const toggleCheckbox = (name: string) => {
    setFormData(prev => ({ ...prev, [name]: !((prev as any)[name]) }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      nim: "",
      nama_lengkap: "",
      program_studi: "Teknik Informatika",
      angkatan: new Date().getFullYear(),
      jalur_masuk: "SNBT",
      status_ukt: false,
      status_bip: false,
      izin_krs: false,
      password: "",
    });
    setIsModalOpen(true);
  };

  // useCallback: referensi fungsi stabil agar child tidak re-render
  const openEditModal = useCallback((m: Mahasiswa) => {
    setEditingId(m.id);
    setFormData({
      nim: m.nim,
      nama_lengkap: m.nama_lengkap,
      program_studi: m.program_studi,
      angkatan: m.angkatan,
      jalur_masuk: m.jalur_masuk || "SNBT",
      status_ukt: m.status_ukt,
      status_bip: m.status_bip,
      izin_krs: m.izin_krs,
      password: "",
    });
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus mahasiswa ${nama}? Akun login juga akan dihapus.`)) return;
    try {
      await deleteMahasiswa(id);
      loadMahasiswa();
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    }
  }, []);

  // Debounce pencarian 300ms
  const debouncedSearch = useDebounce(searchTerm, 300);

  // useMemo: filter hanya berjalan saat data atau keyword berubah
  const filteredMahasiswa = useMemo(() => {
    if (!debouncedSearch) return mahasiswaList;
    const q = debouncedSearch.toLowerCase();
    return mahasiswaList.filter(
      (m) =>
        m.nama_lengkap.toLowerCase().includes(q) ||
        m.nim.toLowerCase().includes(q) ||
        m.program_studi.toLowerCase().includes(q)
    );
  }, [mahasiswaList, debouncedSearch]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      if (editingId) {
        await updateMahasiswa(editingId, formData);
      } else {
        await createMahasiswa(formData);
      }
      setIsModalOpen(false);
      loadMahasiswa();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-red-500" />
            Kelola Mahasiswa
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Manajemen data akademik, keuangan, dan akun.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all shadow-lg shadow-red-600/20 text-sm font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Tambah Mahasiswa
        </button>
      </div>

      {/* Search & Tabel */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="p-4 border-b border-zinc-800/60 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Cari NIM, Nama, atau Program Studi..."
            className="bg-transparent border-none focus:ring-0 text-sm text-zinc-200 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/60">
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Identitas</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Prodi & Angkatan</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status Keuangan & KRS</th>
                <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="h-10 w-48 bg-zinc-800 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-32 bg-zinc-800 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-32 bg-zinc-800 rounded"></div></td>
                    <td className="p-4"></td>
                  </tr>
                ))
              ) : filteredMahasiswa.length > 0 ? (
                filteredMahasiswa.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-zinc-100 font-medium">{m.nama_lengkap}</span>
                        <span className="text-xs text-zinc-500 font-mono tracking-tight flex items-center gap-1 mt-0.5">
                          {m.nim} • {m.jalur_masuk}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-zinc-300 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-zinc-500" />
                          {m.program_studi}
                        </span>
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Angkatan {m.angkatan}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                          m.status_ukt ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {m.status_ukt ? <CheckCircle2 size={10}/> : <XCircle size={10}/>}
                          UKT
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                          m.status_bip ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {m.status_bip ? <CheckCircle2 size={10}/> : <XCircle size={10}/>}
                          BIP
                        </span>
                        {m.izin_krs && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <ShieldCheck size={10}/>
                            IZIN KRS
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEditModal(m)}
                          className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
                          title="Edit Data"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(m.id, m.nama_lengkap)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
                          title="Hapus Mahasiswa"
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
                    Belum ada data mahasiswa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingId ? "Edit Data Mahasiswa" : "Daftarkan Mahasiswa Baru"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1">Data Akademik</h4>
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="NIM"
                name="nim"
                value={formData.nim}
                onChange={handleChange}
                placeholder="Contoh: 3012410001"
                required
                error={editingId ? "NIM tidak dapat diubah" : ""}
              />
              <InputField
                label="Angkatan"
                name="angkatan"
                type="number"
                value={formData.angkatan}
                onChange={handleChange}
                required
              />
            </div>

            <InputField
              label="Nama Lengkap"
              name="nama_lengkap"
              value={formData.nama_lengkap}
              onChange={handleChange}
              placeholder="Sesuai Akta Kelahiran"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Program Studi"
                name="program_studi"
                value={formData.program_studi}
                onChange={handleChange}
                required
                options={[
                  { value: "Teknik Informatika", label: "Teknik Informatika" },
                  { value: "Sistem Informasi", label: "Sistem Informasi" },
                  { value: "Manajemen Rekayasa", label: "Manajemen Rekayasa" },
                  { value: "Desain Komunikasi Visual", label: "Desain Komunikasi Visual" },
                  { value: "Manajemen", label: "Manajemen" },
                  { value: "Akuntansi", label: "Akuntansi" },
                ]}
              />
              <SelectField
                label="Jalur Masuk"
                name="jalur_masuk"
                value={formData.jalur_masuk}
                onChange={handleChange}
                required
                options={[
                  { value: "SNBP", label: "SNBP" },
                  { value: "SNBT", label: "SNBT" },
                  { value: "Mandiri", label: "Mandiri" },
                  { value: "Prestasi", label: "Prestasi" },
                ]}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1">Status Keuangan & Izin</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                formData.status_ukt ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
              }`}>
                <input type="checkbox" className="hidden" checked={formData.status_ukt} onChange={() => toggleCheckbox("status_ukt")} />
                {formData.status_ukt ? <CheckCircle2 size={16}/> : <XCircle size={16}/>}
                <span className="text-xs font-medium">Lunas UKT</span>
              </label>
              
              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                formData.status_bip ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
              }`}>
                <input type="checkbox" className="hidden" checked={formData.status_bip} onChange={() => toggleCheckbox("status_bip")} />
                {formData.status_bip ? <CheckCircle2 size={16}/> : <XCircle size={16}/>}
                <span className="text-xs font-medium">Lunas BIP</span>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                formData.izin_krs ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
              }`}>
                <input type="checkbox" className="hidden" checked={formData.izin_krs} onChange={() => toggleCheckbox("izin_krs")} />
                <ShieldCheck size={16}/>
                <span className="text-xs font-medium">Izin KRS</span>
              </label>
            </div>
          </div>

          {!editingId && (
            <div className="space-y-1">
              <InputField
                label="Password Akun Baru"
                name="password"
                type="text"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimal 6 karakter"
                required
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-red-600/20"
            >
              {submitting ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Daftarkan Mahasiswa"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
