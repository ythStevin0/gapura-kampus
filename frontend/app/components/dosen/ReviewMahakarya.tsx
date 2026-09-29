import { useState, useEffect } from "react";
import { useOutletContext } from "react-router";
import {
  fetchMahakaryaToReview,
  reviewMahakarya,
  type MahakaryaSubmission,
} from "../../lib/api-dosen";

interface OutletContext {
  user: { email: string; role: string; name: string } | null;
  roleLabel: string;
  token: string;
}

export default function ReviewMahakarya() {
  const { token } = useOutletContext<OutletContext>();
  const [submissions, setSubmissions] = useState<MahakaryaSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedItem, setSelectedItem] = useState<MahakaryaSubmission | null>(null);
  const [rejectModal, setRejectModal] = useState<MahakaryaSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchMahakaryaToReview();
      setSubmissions(data);
    } catch (err) {
      console.error("Failed to fetch mahakarya:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item: MahakaryaSubmission) => {
    setActionLoading(item.id);
    try {
      await reviewMahakarya(item.id, "approved");
      setSubmissions((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, status: "approved" as const } : s))
      );
      showToast("success", `"${item.title}" berhasil disetujui dan akan tampil di Galeri`);
      setSelectedItem(null);
    } catch (err: any) {
      showToast("error", err.message || "Gagal menyetujui karya");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      showToast("error", "Alasan revisi wajib diisi");
      return;
    }
    setActionLoading(rejectModal.id);
    try {
      await reviewMahakarya(rejectModal.id, "rejected", rejectReason);
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === rejectModal.id ? { ...s, status: "rejected" as const, reason: rejectReason } : s
        )
      );
      showToast("success", `"${rejectModal.title}" dikembalikan untuk direvisi`);
      setRejectModal(null);
      setRejectReason("");
      setSelectedItem(null);
    } catch (err: any) {
      showToast("error", err.message || "Gagal menolak karya");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSubmissions =
    filter === "all" ? submissions : submissions.filter((s) => s.status === filter);

  const counts = {
    all: submissions.length,
    pending: submissions.filter((s) => s.status === "pending").length,
    approved: submissions.filter((s) => s.status === "approved").length,
    rejected: submissions.filter((s) => s.status === "rejected").length,
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved")
      return (
        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          ✓ Disetujui
        </span>
      );
    if (status === "rejected")
      return (
        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30">
          ✗ Perlu Revisi
        </span>
      );
    return (
      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
        ⏳ Menunggu Review
      </span>
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Software & Digital": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
      "Desain & Kreatif": "bg-purple-500/15 text-purple-400 border-purple-500/20",
      "Riset & Publikasi": "bg-blue-500/15 text-blue-400 border-blue-500/20",
      "Bisnis & Startup": "bg-amber-500/15 text-amber-400 border-amber-500/20",
      "Teknik & Rekayasa": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    };
    return colors[category] || "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-black text-white mb-1">Kembalikan untuk Revisi</h3>
            <p className="text-xs text-zinc-400 mb-1">{rejectModal.title}</p>
            <p className="text-[10px] text-zinc-500 mb-4">
              oleh {rejectModal.mahasiswa_nama} ({rejectModal.mahasiswa_nim})
            </p>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
              Alasan Revisi (Wajib)
            </label>
            <textarea
              className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-sm text-zinc-200 resize-none focus:outline-none focus:border-red-500/50 transition-colors"
              rows={3}
              placeholder="Jelaskan apa yang perlu diperbaiki..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-black text-zinc-400 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectModal.id || !rejectReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-xs font-black text-white transition-all disabled:opacity-50"
              >
                {actionLoading === rejectModal.id ? "Menolak..." : "Konfirmasi Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && !rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">{selectedItem.title}</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {selectedItem.mahasiswa_nama} • {selectedItem.mahasiswa_nim}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-zinc-500"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getCategoryColor(selectedItem.category)}`}>
                  {selectedItem.category}
                </span>
                {getStatusBadge(selectedItem.status)}
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Deskripsi
                </label>
                <p className="text-sm text-zinc-300 mt-1 leading-relaxed">
                  {selectedItem.description || (
                    <span className="italic text-zinc-600">Tidak ada deskripsi</span>
                  )}
                </p>
              </div>

              {selectedItem.portfolio_url && (
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Link Portfolio
                  </label>
                  <a
                    href={selectedItem.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-1 text-sm text-[#1ea39e] hover:underline truncate"
                  >
                    {selectedItem.portfolio_url}
                  </a>
                </div>
              )}

              {selectedItem.reason && selectedItem.status === "rejected" && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                    Alasan Penolakan
                  </label>
                  <p className="text-xs text-red-300 mt-1">{selectedItem.reason}</p>
                </div>
              )}

              <div className="text-[10px] text-zinc-600">
                Disubmit: {formatDate(selectedItem.created_at)}
                {selectedItem.updated_at !== selectedItem.created_at &&
                  ` • Diperbarui: ${formatDate(selectedItem.updated_at)}`}
              </div>

              {selectedItem.status === "pending" && (
                <div className="flex gap-3 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleApprove(selectedItem)}
                    disabled={actionLoading === selectedItem.id}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/20"
                  >
                    {actionLoading === selectedItem.id ? "Menyetujui..." : "✓ Setujui & Tampilkan di Galeri"}
                  </button>
                  <button
                    onClick={() => setRejectModal(selectedItem)}
                    disabled={!!actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-xs font-black text-red-400 transition-all disabled:opacity-50"
                  >
                    ✗ Minta Revisi
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1ea39e]" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">
            Portal Dosen Wali
          </span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          Review Mahakarya{" "}
          <span className="text-zinc-500 font-normal text-lg">Mahasiswa Bimbingan</span>
        </h1>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => {
          const labels = {
            all: "Semua",
            pending: "Menunggu Review",
            approved: "Disetujui",
            rejected: "Perlu Revisi",
          };
          const activeColors = {
            all: "bg-zinc-700 text-white",
            pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
            approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
            rejected: "bg-red-500/20 text-red-400 border-red-500/30",
          };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                filter === f ? activeColors[f] : "bg-zinc-800/60 text-zinc-500 border-transparent hover:bg-zinc-800"
              }`}
            >
              {labels[f]} ({counts[f]})
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-2xl bg-zinc-900/40 border border-white/10 p-16 text-center backdrop-blur-md">
          <div className="w-8 h-8 border-2 border-[#1ea39e]/30 border-t-[#1ea39e] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">Memuat data mahakarya...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="rounded-2xl bg-zinc-900/40 border border-white/10 p-16 text-center backdrop-blur-md">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-zinc-700 mx-auto mb-4"
          >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
          <p className="text-zinc-500 text-sm">
            {filter === "all"
              ? "Belum ada karya yang disubmit oleh mahasiswa bimbingan Anda"
              : `Tidak ada karya dengan status "${filter}"`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSubmissions.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="text-left rounded-2xl bg-zinc-900/40 border border-white/10 hover:border-[#1ea39e]/30 p-5 backdrop-blur-md transition-all duration-200 group hover:shadow-xl hover:shadow-[#1ea39e]/5"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white truncate">
                    {item.title}
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {item.mahasiswa_nama} • {item.mahasiswa_nim}
                  </p>
                </div>
                <div className="shrink-0">{getStatusBadge(item.status)}</div>
              </div>

              {/* Category */}
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${getCategoryColor(
                  item.category
                )}`}
              >
                {item.category}
              </span>

              {/* Description preview */}
              {item.description && (
                <p className="text-xs text-zinc-500 mt-3 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                <span className="text-[10px] text-zinc-600">{formatDate(item.created_at)}</span>
                {item.status === "pending" && (
                  <span className="text-[10px] font-bold text-[#1ea39e] group-hover:underline">
                    Klik untuk review →
                  </span>
                )}
                {item.portfolio_url && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-zinc-600"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" x2="21" y1="14" y2="3" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
