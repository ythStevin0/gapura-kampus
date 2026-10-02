import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, CalendarDays, Edit, Trash2, Clock, Users, BookOpen, MapPin } from "lucide-react";
import { fetchAllKelas, createKelas, updateKelas, deleteKelas, fetchAllMataKuliah, fetchAllDosen, type Kelas, type MataKuliah, type Dosen } from "../lib/api";
import { Modal } from "../components/ui/Modal";
import { InputField } from "../components/ui/InputField";
import { SelectField } from "../components/ui/SelectField";
import { VirtualTable } from "../components/ui/VirtualTable";
import { useDebounce } from "../hooks/useOptimization";

export default function AdminKelas() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [mkList, setMkList] = useState<MataKuliah[]>([]);
  const [dosenList, setDosenList] = useState<Dosen[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    mata_kuliah_id: "",
    dosen_id: "",
    kode_kelas: "",
    hari: "Senin",
    jam_mulai: "",
    jam_selesai: "",
    ruangan: "",
    kapasitas: 40,
    semester_akademik: "Ganjil 2024/2025"
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [kelasRes, mkRes, dosenRes] = await Promise.all([
        fetchAllKelas(),
        fetchAllMataKuliah(),
        fetchAllDosen()
      ]);
      setKelasList(kelasRes || []);
      setMkList(mkRes || []);
      setDosenList(dosenRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setFormData({
      mata_kuliah_id: mkList.length > 0 ? mkList[0].id : "",
      dosen_id: dosenList.length > 0 ? dosenList[0].id : "",
      kode_kelas: "",
      hari: "Senin",
      jam_mulai: "08:00",
      jam_selesai: "10:30",
      ruangan: "",
      kapasitas: 40,
      semester_akademik: "Ganjil 2024/2025"
    });
    setErrorMsg("");
    setIsModalOpen(true);
  }, [mkList, dosenList]);

  const openEditModal = useCallback((k: Kelas) => {
    setEditingId(k.id);
    setFormData({
      mata_kuliah_id: k.mata_kuliah_id,
      dosen_id: k.dosen_id,
      kode_kelas: k.kode_kelas,
      hari: k.hari,
      jam_mulai: k.jam_mulai,
      jam_selesai: k.jam_selesai,
      ruangan: k.ruangan,
      kapasitas: k.kapasitas,
      semester_akademik: k.semester_akademik
    });
    setErrorMsg("");
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!confirm(`Hapus kelas: ${name}?`)) return;
    try {
      await deleteKelas(id);
      loadData();
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    }
  }, [loadData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      if (editingId) {
        await updateKelas(editingId, formData as Partial<Kelas>);
      } else {
        await createKelas(formData as Partial<Kelas>);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  }, [editingId, formData, loadData]);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const filteredKelas = useMemo(() => {
    if (!debouncedSearch) return kelasList;
    const q = debouncedSearch.toLowerCase();
    return kelasList.filter(
      (k) =>
        k.nama_mata_kuliah?.toLowerCase().includes(q) ||
        k.kode_kelas.toLowerCase().includes(q) ||
        k.nama_dosen?.toLowerCase().includes(q) ||
        k.semester_akademik.toLowerCase().includes(q)
    );
  }, [kelasList, debouncedSearch]);

  const columns = useMemo(() => [
    {
      key: "mata_kuliah",
      header: "Mata Kuliah & Dosen",
      render: (k: Kelas) => (
        <div className="flex flex-col">
          <span className="text-zinc-100 font-medium font-sans flex items-center gap-2">
            {k.nama_mata_kuliah}
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] rounded border border-indigo-500/20 font-bold">
              {k.kode_kelas}
            </span>
          </span>
          <span className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
            <BookOpen className="w-3 h-3" />
            {k.nama_dosen}
          </span>
        </div>
      )
    },
    {
      key: "jadwal",
      header: "Jadwal",
      width: "25%",
      render: (k: Kelas) => (
        <div className="flex flex-col">
          <span className="text-zinc-200 text-sm flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            {k.hari}, {k.jam_mulai.substring(0,5)} - {k.jam_selesai.substring(0,5)}
          </span>
          <span className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            Ruang {k.ruangan}
          </span>
        </div>
      )
    },
    {
      key: "kapasitas",
      header: "Kapasitas",
      width: "15%",
      render: (k: Kelas) => {
        const isFull = (k.terisi || 0) >= k.kapasitas;
        return (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <span className={`text-sm font-medium ${isFull ? 'text-red-400' : 'text-emerald-400'}`}>
              {k.terisi || 0} / {k.kapasitas}
            </span>
          </div>
        );
      }
    },
    {
      key: "semester",
      header: "Semester",
      width: "15%",
      render: (k: Kelas) => (
        <span className="text-sm text-zinc-300">{k.semester_akademik}</span>
      )
    },
    {
      key: "aksi",
      header: "Aksi",
      width: "100px",
      render: (k: Kelas) => (
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => openEditModal(k)}
            className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDelete(k.id, `${k.nama_mata_kuliah} - ${k.kode_kelas}`)}
            className="p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ], [openEditModal, handleDelete]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-400" />
            Kelola Kelas
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Atur jadwal, dosen, dan kapasitas kelas per semester.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-lg shadow-indigo-600/20 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Buat Kelas Baru
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Kelas Terbuka</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{kelasList.length}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="p-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Cari Mata Kuliah, Dosen, atau Semester..."
            className="bg-transparent border-none focus:ring-0 text-sm text-zinc-200 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabel */}
      <VirtualTable 
        data={filteredKelas}
        columns={columns}
        loading={loading}
        rowHeight={72}
        getRowKey={(k) => k.id}
        emptyMessage="Data kelas belum tersedia."
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingId ? "Edit Kelas" : "Buat Kelas Baru"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <SelectField
              label="Mata Kuliah"
              name="mata_kuliah_id"
              required
              value={formData.mata_kuliah_id}
              onChange={handleChange}
              options={mkList.map(mk => ({ value: mk.id, label: `${mk.nama_mk} (${mk.sks} SKS)` }))}
            />
            <SelectField
              label="Dosen Pengajar"
              name="dosen_id"
              required
              value={formData.dosen_id}
              onChange={handleChange}
              options={dosenList.map(d => ({ value: d.id, label: d.nama_lengkap }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Kode Kelas"
              name="kode_kelas"
              placeholder="Contoh: A / B / Kelas Paralel"
              required
              value={formData.kode_kelas}
              onChange={handleChange}
            />
            <InputField
              label="Kapasitas Mahasiswa"
              name="kapasitas"
              type="number"
              required
              value={formData.kapasitas}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <SelectField
              label="Hari"
              name="hari"
              required
              value={formData.hari}
              onChange={handleChange}
              options={[
                { value: "Senin", label: "Senin" },
                { value: "Selasa", label: "Selasa" },
                { value: "Rabu", label: "Rabu" },
                { value: "Kamis", label: "Kamis" },
                { value: "Jumat", label: "Jumat" },
                { value: "Sabtu", label: "Sabtu" }
              ]}
            />
            <InputField
              label="Jam Mulai"
              name="jam_mulai"
              type="time"
              required
              value={formData.jam_mulai}
              onChange={handleChange}
            />
            <InputField
              label="Jam Selesai"
              name="jam_selesai"
              type="time"
              required
              value={formData.jam_selesai}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Ruangan"
              name="ruangan"
              placeholder="Contoh: B101"
              required
              value={formData.ruangan}
              onChange={handleChange}
            />
            <InputField
              label="Semester Akademik"
              name="semester_akademik"
              placeholder="Ganjil 2024/2025"
              required
              value={formData.semester_akademik}
              onChange={handleChange}
            />
          </div>

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
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-600/20"
            >
              {submitting ? "Menyimpan..." : (editingId ? "Simpan Perubahan" : "Buat Kelas")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
