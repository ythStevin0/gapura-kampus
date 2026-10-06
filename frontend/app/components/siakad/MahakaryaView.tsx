import { useState, useEffect, useMemo } from "react";
import { NavLink, useOutletContext } from "react-router";
import { useDebounce } from "../../hooks/useOptimization";

// ==========================================
// DATA TYPES
// ==========================================
interface Review {
  id: string;
  user: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
}

interface Creator {
  name: string;
  dept: string;
  avatar: string;
  role?: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  fullDescription: string;
  category: string;
  thumbnail: string;
  rating: number;
  views: number;
  date: string;
  author: string;
  authorDept: string;
  authorInitials: string;
  authorColor: string;
  creators: Creator[];
  reviews: Review[];
  featured?: boolean;
  tags?: string[];
}

// ==========================================
// HELPERS
// ==========================================
function StarRating({ count, size = 14, activeColor = "#f59e0b" }: { count: number; size?: number; activeColor?: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= count ? activeColor : "none"} stroke={i <= count ? activeColor : "#52525b"} strokeWidth="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function CategoryBadge({ label }: { label: string }) {
  const colors: Record<string, string> = {
    "Software & Digital": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    "Bisnis & Startup": "bg-amber-500/15 text-amber-400 border-amber-500/20",
    "Desain & Kreatif": "bg-rose-500/15 text-rose-400 border-rose-500/20",
    "Logistik & Industri": "bg-blue-500/15 text-blue-400 border-blue-500/20",
    "Sains & Energi": "bg-teal-500/15 text-teal-400 border-teal-500/20",
    "Sosial & Humaniora": "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  };
  const cls = colors[label] || "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
  return (
    <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${cls}`}>
      {label}
    </span>
  );
}

// ==========================================
// REGISTRATION FORM COMPONENT
// ==========================================
function RegistrationForm({ onBack, token, initialData }: { onBack: () => void; token: string; initialData?: any }) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    category: initialData?.category || "",
    description: initialData?.description || "",
    link: initialData?.portfolio_url || "",
  });
  const isEditMode = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran file maksimal 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, link: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const url = isEditMode 
        ? `http://localhost:8080/api/mahakarya/${initialData.id}` 
        : "http://localhost:8080/api/mahakarya/submit";
      
      const res = await fetch(url, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category,
          description: formData.description,
          portfolio_url: formData.link
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mengirim karya");

      alert(isEditMode ? "Karya berhasil diperbaiki! Menunggu persetujuan ulang Dosen Wali." : "Karya berhasil dikirim! Menunggu persetujuan Dosen Wali.");
      onBack();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen -m-8 p-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="group flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-[#1ea39e] hover:bg-white/10 transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-black text-zinc-100 uppercase tracking-widest">{isEditMode ? "PERBAIKAN KARYA" : "PENDAFTARAN KARYA"}</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Status: <span className="text-amber-500 font-black">{isEditMode ? "Revisi" : "Draft"}</span></p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-2.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#1ea39e] animate-pulse" />
            <span className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Input Data</span>
          </div>
          <div className="w-8 h-px bg-zinc-800" />
          <div className="flex items-center gap-2 opacity-40">
            <div className="w-2 h-2 rounded-full bg-zinc-600" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Review Dosen Wali</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto pb-20">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-8 space-y-6 backdrop-blur-xl shadow-2xl">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Judul Karya Mahakarya</label>
                <input 
                  type="text" required
                  placeholder="Masukkan judul inovasi Anda..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-zinc-100 focus:outline-none focus:border-[#1ea39e]/50 transition-all placeholder:text-zinc-700"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Kategori Departemen</label>
                <select 
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-zinc-300 focus:outline-none focus:border-[#1ea39e]/50 transition-all appearance-none cursor-pointer"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="" className="bg-zinc-900">Pilih Kategori...</option>
                  {CATEGORIES.filter(c => c !== "Semua").map(cat => (
                    <option key={cat} value={cat} className="bg-zinc-900">{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Deskripsi & Abstrak</label>
                <textarea 
                  required rows={6}
                  placeholder="Jelaskan mengenai latar belakang, solusi, dan dampak dari karya Anda..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-zinc-300 focus:outline-none focus:border-[#1ea39e]/50 transition-all resize-none placeholder:text-zinc-700"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-8 space-y-6 backdrop-blur-xl shadow-2xl">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Poster Utama / Tautan Portfolio</label>
                <div className="group relative border-2 border-dashed border-white/10 rounded-3xl overflow-hidden text-center hover:border-[#1ea39e]/40 transition-all bg-white/0.01">
                  
                  {formData.link && (formData.link.startsWith("data:image") || formData.link.match(/\.(jpeg|jpg|gif|png)$/i)) ? (
                    <div className="relative w-full aspect-video">
                      <img src={formData.link} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-xs font-bold tracking-widest uppercase">Ubah Foto</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-10 space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-zinc-500 group-hover:text-[#1ea39e] transition-colors">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      </div>
                      <p className="text-[11px] font-black text-zinc-400 uppercase tracking-tighter">Unggah Thumbnail Karya</p>
                      <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">PNG / JPG (Maks. 5MB)</p>
                    </div>
                  )}
                  
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                {/* Fallback text input for links if they don't upload an image */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1 block mb-2">Atau masukkan Tautan (Drive/GitHub)</label>
                  <input 
                    type="text"
                    placeholder="https://..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-xs text-zinc-300 focus:outline-none focus:border-[#1ea39e]/50 transition-all placeholder:text-zinc-700"
                    value={formData.link && !formData.link.startsWith("data:image") ? formData.link : ""}
                    onChange={(e) => setFormData({...formData, link: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-6 flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              </div>
              <p className="text-[10px] text-amber-500/80 font-bold uppercase leading-relaxed tracking-tight">
                Data akan dikirim ke portal Dosen Wali untuk diverifikasi kelayakannya sebelum dipublikasikan di Masterpiece UISI.
              </p>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 rounded-2xl bg-[#1ea39e] hover:bg-[#17888a] disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-[#1ea39e]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? "MENGIRIM..." : "Kirim ke Dosen Wali"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// DOSEN APPROVAL VIEW COMPONENT
// ==========================================
function DosenApprovalView({ onBack, token }: { onBack: () => void; token: string }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revisiModal, setRevisiModal] = useState<{isOpen: boolean, submissionId: string, reason: string}>({isOpen: false, submissionId: "", reason: ""});
  const [detailModal, setDetailModal] = useState<any>(null);



  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/dosen/wali/mahakarya", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setSubmissions(data.data || []);
    } catch (err) {
      console.error("Gagal mengambil submisi:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    try {
      const res = await fetch(`http://localhost:8080/api/dosen/wali/mahakarya/${id}/review`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: action, reason: action === "rejected" ? revisiModal.reason : "" })

      });

      if (!res.ok) throw new Error("Gagal memproses review");
      
      alert(action === "approved" ? "Karya disetujui!" : "Revisi dikirim ke mahasiswa.");
      if (action === "rejected") {
        setRevisiModal({isOpen: false, submissionId: "", reason: ""});
      }
      fetchSubmissions();
    } catch (err: any) {

      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen -m-8 p-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="group flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-[#1ea39e] hover:bg-white/10 transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-black text-zinc-100 uppercase tracking-widest">PERSETUJUAN KARYA</h1>
            <p className="text-[10px] text-[#1ea39e] font-black uppercase tracking-widest mt-0.5">Portal Dosen Wali</p>
          </div>
        </div>
        <div className="px-4 py-2 rounded-xl bg-[#1ea39e]/10 border border-[#1ea39e]/20">
          <span className="text-[10px] font-black text-[#1ea39e] uppercase tracking-widest">{submissions.length} Submisi Menunggu</span>
        </div>
      </div>      <div className="max-w-5xl mx-auto space-y-4 pb-20">
        {isLoading ? (
          <div className="py-20 text-center text-zinc-500 uppercase text-[10px] font-black tracking-widest animate-pulse">Memuat Submisi...</div>
        ) : submissions.length > 0 ? (
          submissions.map((sub) => (
            <div key={sub.id} className="group relative overflow-hidden rounded-3xl bg-zinc-900/40 border border-white/5 p-7 backdrop-blur-xl transition-all hover:border-white/10 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 font-black text-xl shadow-inner group-hover:text-[#1ea39e] transition-colors">
                    {sub.mahasiswa_nama?.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight group-hover:text-[#1ea39e] transition-colors">{sub.title}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-[11px] font-black text-zinc-400 uppercase tracking-tight">{sub.mahasiswa_nama}</p>
                      <span className="text-zinc-700 text-xs font-black">•</span>
                      <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">{sub.mahasiswa_nim}</p>
                      <span className="text-zinc-700 text-xs font-black">•</span>
                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest italic">{new Date(sub.created_at).toLocaleDateString("id-ID")}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 z-10">
                  <button 
                    onClick={() => setDetailModal(sub)}
                    className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all"
                  >
                    DETAIL
                  </button>
                  <button 
                    onClick={() => setRevisiModal({isOpen: true, submissionId: sub.id, reason: ""})}
                    className="px-5 py-3 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] hover:bg-rose-500/10 transition-all"
                  >
                    REVISI
                  </button>
                  <button 
                    onClick={() => handleAction(sub.id, "approved")}
                    className="px-10 py-3 rounded-2xl bg-[#1ea39e] text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-[#1ea39e]/20 hover:bg-[#17888a] transition-all active:scale-[0.98]"
                  >
                    ACC KARYA
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <div>
              <p className="text-sm font-black text-zinc-300 uppercase tracking-widest">Selesai!</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Semua submisi mahasiswa bimbingan telah diproses</p>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailModal(null)} />
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">{detailModal.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-1 rounded-md bg-[#1ea39e]/20 text-[#1ea39e] text-[10px] font-black uppercase tracking-widest">{detailModal.category}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs font-bold text-zinc-400">{detailModal.mahasiswa_nama} ({detailModal.mahasiswa_nim})</span>
                </div>
              </div>
              <button onClick={() => setDetailModal(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="space-y-6">
              {detailModal.portfolio_url && (
                <div className="rounded-xl overflow-hidden bg-black/50 border border-white/5 aspect-video flex items-center justify-center">
                  {/* Simulate image/portfolio display */}
                  {detailModal.portfolio_url.match(/\.(jpeg|jpg|gif|png)$/) != null ? (
                    <img src={detailModal.portfolio_url} alt="Portfolio" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-6">
                      <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      <a href={detailModal.portfolio_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#1ea39e] hover:underline break-all">{detailModal.portfolio_url}</a>
                    </div>
                  )}
                </div>
              )}

              <div>
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Deskripsi Karya</h4>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap bg-white/5 p-4 rounded-xl border border-white/5">
                  {detailModal.description || "Tidak ada deskripsi yang dilampirkan."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-white/5">
              <button 
                onClick={() => {
                  setDetailModal(null);
                  setRevisiModal({isOpen: true, submissionId: detailModal.id, reason: ""});
                }}
                className="px-6 py-2.5 rounded-xl bg-rose-500/10 text-xs font-black text-rose-500 hover:bg-rose-500/20 transition-all uppercase tracking-widest"
              >
                Revisi
              </button>
              <button 
                onClick={() => {
                  handleAction(detailModal.id, "approved");
                  setDetailModal(null);
                }}
                className="px-8 py-2.5 rounded-xl bg-[#1ea39e] text-white text-xs font-black uppercase tracking-widest hover:bg-[#17888a] transition-all shadow-lg shadow-[#1ea39e]/20"
              >
                ACC Karya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVISI MODAL */}
      {revisiModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRevisiModal({isOpen: false, submissionId: "", reason: ""})} />
          <div className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">CATATAN REVISI</h3>
            <p className="text-xs text-zinc-400 mb-6">Berikan masukan atau alasan mengapa karya ini perlu direvisi oleh mahasiswa.</p>
            
            <textarea
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-zinc-300 focus:outline-none focus:border-rose-500/50 transition-all min-h-30 resize-none placeholder:text-zinc-600"
              placeholder="Ketik catatan revisi di sini..."
              value={revisiModal.reason}
              onChange={(e) => setRevisiModal({...revisiModal, reason: e.target.value})}
              autoFocus
            />
            
            <div className="flex items-center justify-end gap-3 mt-8">
              <button 
                onClick={() => setRevisiModal({isOpen: false, submissionId: "", reason: ""})}
                className="px-6 py-2.5 rounded-xl bg-white/5 text-xs font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
              >
                Batal
              </button>
              <button 
                onClick={() => handleAction(revisiModal.submissionId, "rejected")}
                disabled={!revisiModal.reason.trim()}
                className="px-6 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Kirim Revisi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAHASISWA RIWAYAT VIEW (CEK REVISI)
// ==========================================
function MahasiswaRiwayatView({ onBack, token, onEdit }: { onBack: () => void; token: string; onEdit: (sub: any) => void }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMySubmissions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/mahakarya/my", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setSubmissions(data.data || []);
    } catch (err) {
      console.error("Gagal mengambil riwayat:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMySubmissions();
  }, []);

  return (
    <div className="min-h-screen -m-8 p-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="group flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-[#1ea39e] hover:bg-white/10 transition-all">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-black text-zinc-100 uppercase tracking-widest">RIWAYAT KARYA SAYA</h1>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-0.5">Pantau status persetujuan karya Anda</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-4 pb-20">
        {isLoading ? (
          <div className="py-20 text-center text-zinc-500 uppercase text-[10px] font-black tracking-widest animate-pulse">Memuat Riwayat...</div>
        ) : submissions.length > 0 ? (
          submissions.map((sub) => (
            <div key={sub.id} className="relative overflow-hidden rounded-3xl bg-zinc-900/40 border border-white/5 p-7 backdrop-blur-xl shadow-xl">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {sub.status === 'approved' && <span className="px-3 py-1 rounded-full bg-[#1ea39e]/20 text-[#1ea39e] text-[10px] font-black uppercase tracking-widest border border-[#1ea39e]/20">Disetujui</span>}
                    {sub.status === 'rejected' && <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest border border-rose-500/20">Perlu Revisi</span>}
                    {sub.status === 'pending' && <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/20">Menunggu Review</span>}
                    <span className="text-[10px] font-bold text-zinc-600">{new Date(sub.created_at).toLocaleDateString("id-ID")}</span>
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">{sub.title}</h3>
                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2 max-w-2xl">{sub.description}</p>
                </div>
                
                {sub.status === 'rejected' && (
                  <div className="md:w-64 shrink-0 space-y-3">
                    <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Catatan Revisi Dosen:</p>
                      <p className="text-xs text-zinc-300 font-medium italic">"{sub.rejection_reason}"</p>
                    </div>
                    {/* For now we just alert, later we can implement onEdit properly */}
                    <button 
                      onClick={() => onEdit(sub)}
                      className="w-full py-2.5 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                    >
                      Perbaiki Karya
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center text-zinc-500 text-sm font-bold">Anda belum pernah mendaftarkan karya.</div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// DETAIL VIEW (Full Detailed Layout)
// ==========================================
function DetailView({ project, onBack }: { project: Project; onBack: () => void }) {
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);

  return (
    <div className="min-h-screen animate-in slide-in-from-bottom-4 duration-500">
      {/* Top Bar / Breadcrumbs */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="group flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-[#1ea39e] hover:bg-white/10 transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="text-xl font-black text-zinc-100 uppercase tracking-widest">LIHAT KARYA</h1>
        </div>
      </div>

      {/* Project Header Info */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <StarRating count={project.rating} size={16} />
          <span className="text-zinc-500 text-xs font-bold">{project.rating}.0</span>
          <span className="text-zinc-700 mx-2">|</span>
          <CategoryBadge label={project.category} />
        </div>
        <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-2">{project.title}</h2>
        <p className="text-zinc-500 text-sm font-medium">{project.authorDept}</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Poster & Description & Reviews */}
        <div className="lg:col-span-8 space-y-12">
          {/* Main Poster */}
          <div className="rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl">
            <img src={project.thumbnail} alt={project.title} className="w-full aspect-video object-cover" />
          </div>

          {/* Description Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-[#1ea39e] rounded-full" />
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Deskripsi Proyek</h3>
            </div>
            <p className="text-zinc-400 leading-relaxed whitespace-pre-line text-[15px]">
              {project.fullDescription}
            </p>
          </div>

          {/* Review Section */}
          <div className="space-y-8 pt-8 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-[#1ea39e] rounded-full" />
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Berikan Review</h3>
            </div>

            {/* Form */}
            <div className="bg-white/0.02 border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Rating Anda</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button key={i} onClick={() => setRating(i)} className="focus:outline-none transition-transform hover:scale-110">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill={i <= rating ? "#f59e0b" : "none"} stroke={i <= rating ? "#f59e0b" : "#3f3f46"} strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tulis ulasan Anda di sini..."
                className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#1ea39e]/30"
              />
              <div className="flex justify-end">
                <button className="px-8 py-2.5 rounded-xl bg-[#1ea39e] hover:bg-[#17888a] text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-[#1ea39e]/20" disabled={!rating}>
                  Kirim Review
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-6">
              <h4 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">{project.reviews.length} Review Mahasiswa</h4>
              {project.reviews.map((rev) => (
                <div key={rev.id} className="flex gap-4 p-5 rounded-2xl bg-white/0.01 border border-white/0.03">
                  <img src={rev.avatar} alt={rev.user} className="w-10 h-10 rounded-full border border-white/10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200 text-sm">{rev.user}</span>
                      <span className="text-[9px] text-zinc-600 font-bold uppercase">{rev.date}</span>
                    </div>
                    <StarRating count={rev.rating} size={12} />
                    <p className="text-sm text-zinc-400 leading-relaxed">{rev.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* Section: Creators */}
          <div className="bg-white/0.02 border border-white/5 rounded-3xl p-6 space-y-6">
            <h3 className="text-[10px] font-black text-[#1ea39e] uppercase tracking-[0.25em] border-b border-white/5 pb-3">PEMBUAT</h3>
            <div className="space-y-5">
              {project.creators.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <img src={c.avatar} alt={c.name} className="w-12 h-12 rounded-full border-2 border-white/10 object-cover" />
                  <div>
                    <p className="text-sm font-bold text-zinc-100">{c.name}</p>
                    <p className="text-[11px] text-zinc-500">{c.dept}</p>
                    {c.role && <span className="text-[9px] font-black text-[#1ea39e] uppercase tracking-tighter">{c.role}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Info */}
          <div className="bg-white/0.02 border border-white/5 rounded-3xl p-6 space-y-4">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em] border-b border-white/5 pb-3">INFO KARYA</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-bold uppercase tracking-wider">Kategori</span>
                <span className="text-zinc-200 font-bold">{project.category}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-bold uppercase tracking-wider">Tahun Lulus</span>
                <span className="text-zinc-200 font-bold">2024</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-bold uppercase tracking-wider">Views</span>
                <span className="text-[#1ea39e] font-black">{project.views.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Section: Similar Projects */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em]">KARYA SEJENIS</h3>
            <div className="space-y-3">
              <div className="py-10 text-center text-zinc-600 text-[10px] uppercase font-black tracking-widest">
                Belum ada karya sejenis
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// PROJECT CARD
// ==========================================
function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl bg-white/0.03 border border-white/[0.07] overflow-hidden hover:border-[#1ea39e]/40 hover:bg-white/0.06 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-[#1ea39e]/5 hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <div className={`w-9 h-9 ${project.authorColor} rounded-full flex items-center justify-center text-white font-black text-xs uppercase shrink-0 ring-1 ring-white/20`}>
          {project.authorInitials}
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-zinc-200 truncate">{project.author}</p>
          <p className="text-[10px] text-zinc-500 truncate">{project.authorDept}</p>
        </div>
      </div>

      <div className="relative w-full h-44 overflow-hidden bg-zinc-900">
        <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-[#1ea39e]/80 backdrop-blur-sm flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M5 3l14 9-14 9V3z" /></svg>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3 space-y-2">
        <h3 className="font-black text-zinc-100 uppercase tracking-wide text-[13px] leading-tight group-hover:text-[#1ea39e] transition-colors">{project.title}</h3>
        <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">{project.description}</p>
        <div className="flex items-center justify-between pt-1">
          <StarRating count={project.rating} />
          <CategoryBadge label={project.category} />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-[#1ea39e] to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
    </div>
  );
}

// ==========================================
// FEATURED PANEL
// ==========================================
function FeaturedPanel({ project, onViewDetails }: { project: Project; onViewDetails: () => void }) {
  return (
    <div className="relative h-full min-h-150 rounded-3xl overflow-hidden bg-zinc-900/60 border border-white/10 flex flex-col group cursor-pointer" onClick={onViewDetails}>
      <div className="absolute inset-0">
        <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover opacity-30 transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/60 to-black/20" />
        <div className="absolute inset-0 bg-linear-to-r from-black/40 to-transparent" />
      </div>
      <div className="relative z-10 p-8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#1ea39e] animate-pulse" />
          <span className="text-[10px] font-black text-[#1ea39e] uppercase tracking-[0.25em]">Karya Unggulan</span>
        </div>
      </div>
      <div className="relative z-10 flex-1 flex items-center justify-center px-8">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full scale-75" />
          <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl shadow-black/60 w-72 aspect-video">
            <img src={project.thumbnail} alt="App Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-br from-orange-500/10 to-transparent" />
          </div>
        </div>
      </div>
      <div className="relative z-10 p-8 space-y-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-2 uppercase">{project.title}</h2>
          <p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-2">{project.description}</p>
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <StarRating count={project.rating} size={16} />
            <CategoryBadge label={project.category} />
          </div>
          <button className="group flex items-center gap-2 text-[11px] font-black text-[#1ea39e] hover:text-white transition-all uppercase tracking-widest">
            Lihat Detail <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="transition-transform group-hover:translate-x-1"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN VIEW
// ==========================================
const CATEGORIES = ["Semua", "Software & Digital", "Bisnis & Startup", "Desain & Kreatif", "Logistik & Industri", "Sains & Energi", "Sosial & Humaniora"];

// = ... (existing interfaces and data)

export function MahakaryaView() {
  const { user, token } = useOutletContext<{ user: any; token: string }>();
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRegistration, setShowRegistration] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<any>(null);
  const [showDosenApproval, setShowDosenApproval] = useState(false);
  const [showRiwayat, setShowRiwayat] = useState(false);
  const [galleryProjects, setGalleryProjects] = useState<Project[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/mahakarya/gallery");
        const data = await res.json();
        if (res.ok && data.data) {
          const mapped = data.data.map((item: any) => ({
            id: item.id,
            title: item.title,
            category: item.category,
            author: item.mahasiswa_nama || "Mahasiswa",
            authorDept: item.mahasiswa_nim || "NIM",
            authorInitials: (item.mahasiswa_nama || "MH").substring(0, 2).toUpperCase(),
            authorColor: "bg-[#1ea39e]", // Default color for real data
            thumbnail: (item.portfolio_url && item.portfolio_url.match(/\.(jpeg|jpg|gif|png)$/i)) 
                        ? item.portfolio_url 
                        : "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
            description: item.description,
            fullDescription: item.description,
            rating: 5,
          }));
          setGalleryProjects(mapped);
        }
      } catch (err) {
        console.error("Gagal memuat galeri", err);
      } finally {
        setIsGalleryLoading(false);
      }
    };
    fetchGallery();
  }, []);

  // Fallback token if not in context (for safety)
  const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("siakad_access_token") || "" : "");

  const displayedProjects = galleryProjects;
  const featuredProject = galleryProjects.length > 0 ? galleryProjects[0] : null;

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Single calculation: query di-lowercase 1x saja dan hanya dihitung ulang jika kategori/search/projects berubah
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return displayedProjects.filter((p) => {
      const matchCat = activeCategory === "Semua" || p.category === activeCategory;
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [displayedProjects, activeCategory, debouncedSearch]);

  if (selectedProject) {
    return <DetailView project={selectedProject} onBack={() => setSelectedProject(null)} />;
  }

  if (showRegistration) {
    return <RegistrationForm onBack={() => { setShowRegistration(false); setEditingSubmission(null); }} token={authToken} initialData={editingSubmission} />;
  }

  if (showDosenApproval && user?.role === "dosen") {
    return <DosenApprovalView onBack={() => setShowDosenApproval(false)} token={authToken} />;
  }

  if (showRiwayat && user?.role === "mahasiswa") {
    return <MahasiswaRiwayatView onBack={() => setShowRiwayat(false)} token={authToken} onEdit={(sub) => { setShowRiwayat(false); setEditingSubmission(sub); setShowRegistration(true); }} />;
  }

  return (
    <div className="min-h-screen -m-8 animate-in fade-in duration-500">
      {/* === PAGE HEADER === */}
      <div className="px-4 md:px-8 pt-8 pb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <NavLink
              to="/dashboard"
              className="group flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-[#1ea39e] hover:bg-white/10 transition-all"
              title="Kembali ke Beranda"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </NavLink>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1ea39e]" />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Universitas Internasional Semen Indonesia</span>
              </div>
              <h1 className="text-3xl font-black text-zinc-100 tracking-tight">MAHA<span className="text-[#1ea39e]">KARYA</span></h1>
              <p className="text-xs text-zinc-500 mt-0.5">Karya Terbaik Mahasiswa UISI</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
            <div className="relative hidden lg:block">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input type="text" placeholder="Cari karya atau mahasiswa..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none w-64" />
            </div>
            {user?.role === "dosen" && (
              <button 
                onClick={() => setShowDosenApproval(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[11px] font-black text-zinc-400 hover:text-[#1ea39e] uppercase tracking-widest transition-all whitespace-nowrap shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/></svg>
                Portal Dosen Wali
              </button>
            )}
            {user?.role === "mahasiswa" && (
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <button 
                  onClick={() => setShowRiwayat(true)}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black text-zinc-300 uppercase tracking-widest transition-all whitespace-nowrap shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                  Cek Revisi
                </button>
                <button 
                  onClick={() => setShowRegistration(true)}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1ea39e] hover:bg-[#17888a] text-[11px] font-black text-white uppercase tracking-widest shadow-lg shadow-[#1ea39e]/20 transition-all group whitespace-nowrap shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="transition-transform group-hover:rotate-90"><path d="M12 5v14M5 12h14"/></svg>
                  Daftarkan Karya
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${activeCategory === cat ? "bg-[#1ea39e] text-white" : "bg-white/5 border border-white/10 text-zinc-500 hover:text-zinc-300"}`}>{cat}</button>
          ))}
        </div>
      </div>

      {/* === CONTENT GRID === */}
      <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-8 px-8 pb-10">
        <div className="xl:sticky xl:top-8 xl:self-start h-150">
          {isGalleryLoading ? (
            <div className="w-full h-full rounded-3xl bg-white/5 animate-pulse border border-white/10" />
          ) : featuredProject ? (
            <FeaturedPanel project={featuredProject} onViewDetails={() => setSelectedProject(featuredProject)} />
          ) : (
            <div className="w-full h-full rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center p-10 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600 mb-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-2">Belum Ada Karya</h3>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-relaxed">Daftarkan karya inovasi terbaik Anda untuk dipublikasikan di sini.</p>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 px-4 rounded-2xl bg-white/0.03 border border-white/0.06">
            <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">Eksplorasi Karya — <span className="text-zinc-300">{filtered.length} ditemukan</span></span>
          </div>
          {isGalleryLoading ? (
             <div className="py-20 text-center text-zinc-500 uppercase tracking-widest text-xs font-black animate-pulse">Memuat Galeri...</div>
          ) : filtered.length === 0 ? (
             <div className="py-20 text-center text-zinc-500 uppercase tracking-widest text-xs font-black">Tidak ada karya ditemukan.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p) => (
                <ProjectCard key={p.id} project={p} onClick={() => setSelectedProject(p)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
