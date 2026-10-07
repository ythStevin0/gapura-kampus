import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  fetchTagihan, 
  fetchTransaksi, 
  fetchActivePendingTransaksi,
  fetchPaymentConfig,
  checkoutPayment, 
  syncPaymentStatus, 
  cancelPayment,
  type Tagihan, 
  type Transaksi,
  type PaymentConfig 
} from "../../lib/api";

declare global {
  interface Window {
    snap: any;
  }
}

// Format currency diinisialisasi 1x saja di level module
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});
const formatCurrency = (amount: number) => currencyFormatter.format(amount);

export default function UISIPayUI() {
  const [bills, setBills] = useState<Tagihan[]>([]);
  const [transactions, setTransactions] = useState<Transaksi[]>([]);
  const [activePending, setActivePending] = useState<Transaksi | null>(null);
  const [selectedBill, setSelectedBill] = useState<Tagihan | null>(null);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copiedVa, setCopiedVa] = useState(false);
  const [receiptTrx, setReceiptTrx] = useState<Transaksi | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [b, t, pending] = await Promise.all([
        fetchTagihan(), 
        fetchTransaksi(),
        fetchActivePendingTransaksi()
      ]);
      setBills(b);
      setTransactions(t);
      setActivePending(pending);
    } catch (err) {
      console.error("Gagal memuat data pembayaran:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Sinkronisasi Status Langsung ke Midtrans Core API
  const syncStatus = useCallback(async (orderId: string, showSuccessAlert = false) => {
    try {
      setSyncing(true);
      const updated = await syncPaymentStatus(orderId);
      await loadData();

      if (updated.status === "settlement") {
        if (showSuccessAlert) {
          alert(`Pembayaran untuk Order ID ${orderId} berhasil LUNAS!`);
        }
        setReceiptTrx(updated);
      } else if (showSuccessAlert) {
        alert(`Status pembayaran saat ini: ${updated.status.toUpperCase()}`);
      }
    } catch (err: any) {
      console.error("Gagal sinkronisasi status:", err);
    } finally {
      setSyncing(false);
    }
  }, [loadData]);

  // 1. Muat Config & Script Midtrans Snap secara Dinamis
  useEffect(() => {
    let scriptEl: HTMLScriptElement | null = null;

    const setupMidtrans = async () => {
      try {
        const cfg = await fetchPaymentConfig();
        setConfig(cfg);

        // Load script Snap sesuai environment (Sandbox / Production)
        scriptEl = document.createElement("script");
        scriptEl.src = cfg.snap_url;
        scriptEl.setAttribute("data-client-key", cfg.client_key);
        scriptEl.async = true;
        document.body.appendChild(scriptEl);
      } catch (err) {
        console.error("Gagal memuat konfigurasi Midtrans:", err);
      }
    };

    setupMidtrans();
    loadData();

    // Deteksi jika browser kembali dari redirect Midtrans (?order_id=...&transaction_status=settlement)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const redirectOrderId = params.get("order_id");
      if (redirectOrderId) {
        syncStatus(redirectOrderId, true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    return () => {
      if (scriptEl && document.body.contains(scriptEl)) {
        document.body.removeChild(scriptEl);
      }
    };
  }, [loadData, syncStatus]);

  // Handle buka Snap Popup
  const openSnapPopup = (token: string, orderId: string) => {
    if (!window.snap) {
      alert("Sistem pembayaran Midtrans sedang disiapkan, silakan tunggu beberapa detik dan coba lagi.");
      return;
    }

    window.snap.pay(token, {
      onSuccess: async function (result: any) {
        console.log("Snap onSuccess:", result);
        await syncStatus(orderId, true);
        setSelectedBill(null);
      },
      onPending: async function (result: any) {
        console.log("Snap onPending:", result);
        await syncStatus(orderId, false);
        setSelectedBill(null);
      },
      onError: function (result: any) {
        console.error("Snap onError:", result);
        alert("Pembayaran dibatalkan atau mengalami kegagalan.");
        loadData();
      },
      onClose: async function () {
        console.log("Snap closed by user");
        await syncStatus(orderId, false);
      }
    });
  };

  // 2. Checkout Pembayaran Baru
  const handlePay = async () => {
    if (!selectedBill) return;
    try {
      setProcessing(true);
      const trx = await checkoutPayment(selectedBill.id, selectedBill.amount);
      
      if (trx.snap_token) {
        openSnapPopup(trx.snap_token, trx.order_id);
      }
    } catch (err: any) {
      console.error("Gagal checkout:", err);
      alert(err.message || "Terjadi kesalahan saat memulai pembayaran");
    } finally {
      setProcessing(false);
    }
  };

  // 4. Batalkan Transaksi Pending
  const handleCancel = async (orderId: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan transaksi ini? Anda dapat memilih tagihan atau metode lain setelah dibatalkan.")) {
      return;
    }

    try {
      setSyncing(true);
      await cancelPayment(orderId);
      alert("Transaksi berhasil dibatalkan.");
      await loadData();
    } catch (err: any) {
      console.error("Gagal membatalkan transaksi:", err);
      alert("Gagal membatalkan transaksi: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Salin Nomor VA
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVa(true);
    setTimeout(() => setCopiedVa(false), 2000);
  };

  // Single-pass memoized calculation tagihan aktif
  const totalUnpaid = useMemo(() => {
    return bills.reduce((acc, curr) => (curr.status === "Belum Bayar" ? acc + curr.amount : acc), 0);
  }, [bills]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-500 animate-pulse text-sm">
        Memuat data pembayaran UISI Pay & Midtrans...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-light text-zinc-100 mb-1">
              UISI <span className="text-amber-400 font-normal">Pay</span>
            </h1>
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              config?.is_production 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            }`}>
              {config?.is_production ? "Midtrans Production" : "Midtrans Sandbox"}
            </span>
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Layanan Pembayaran Akademik Terintegrasi</p>
        </div>
        
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
            </svg>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Total Tagihan Belum Bayar</p>
            <p className="text-lg font-bold text-zinc-100 leading-none">{formatCurrency(totalUnpaid)}</p>
          </div>
        </div>
      </div>

      {/* === BANNER TRANSAKSI PENDING AKTIF (Jika Ada) === */}
      {activePending && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-6 relative overflow-hidden backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-black tracking-widest text-amber-400 uppercase">Menunggu Pembayaran</span>
                <span className="text-xs font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  {activePending.order_id}
                </span>
              </div>
              
              <h2 className="text-xl font-bold text-white">
                Tagihan {activePending.jenis_tagihan}: {formatCurrency(activePending.jumlah)}
              </h2>

              {/* Detail Virtual Account jika sudah dipilih */}
              {activePending.va_number ? (
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                      {activePending.bank || "BANK"} VA
                    </span>
                    <span className="font-mono text-base font-bold text-zinc-100 tracking-wider">
                      {activePending.va_number}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(activePending.va_number!)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-zinc-200 transition-all flex items-center gap-1.5"
                  >
                    {copiedVa ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg>
                        <span className="text-emerald-400">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        <span>Salin VA</span>
                      </>
                    )}
                  </button>
                </div>
              ) : activePending.bill_key ? (
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-3 text-xs font-mono">
                    <div>
                      <span className="text-zinc-500 block text-[9px]">KODE PERUSAHAAN</span>
                      <span className="text-zinc-100 font-bold">{activePending.biller_code}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">KODE BAYAR (BILL KEY)</span>
                      <span className="text-amber-400 font-bold">{activePending.bill_key}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">
                  Pilihan metode pembayaran dapat dibuka kembali melalui tombol di bawah.
                </p>
              )}

              {activePending.expiry_time && (
                <p className="text-[11px] text-zinc-400">
                  Batas Waktu: <span className="text-amber-300 font-medium">{new Date(activePending.expiry_time).toLocaleString("id-ID")}</span>
                </p>
              )}
            </div>

            {/* Aksi untuk Transaksi Aktif */}
            <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
              {activePending.snap_token && (
                <button
                  onClick={() => openSnapPopup(activePending.snap_token!, activePending.order_id)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  Buka Modal Midtrans
                </button>
              )}
              
              <button
                onClick={() => syncStatus(activePending.order_id, true)}
                disabled={syncing}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-zinc-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {syncing ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
                    <span>Mengecek...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    <span>Cek Status Pembayaran</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleCancel(activePending.order_id)}
                disabled={syncing}
                className="px-5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider transition-all border border-rose-500/20"
              >
                Batalkan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Bills */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/>
            </svg>
            <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Daftar Tagihan Mahasiswa</h2>
          </div>

          <div className="space-y-3">
            {bills.length === 0 ? (
               <div className="p-8 text-center text-zinc-400 bg-white/5 rounded-2xl border border-white/10 text-sm">
                 <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center mb-3">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                 </div>
                 <p className="font-semibold text-zinc-200">Semua Tagihan Lunas</p>
                 <p className="text-xs text-zinc-500 mt-1">Tidak ada tagihan yang harus dibayarkan saat ini.</p>
               </div>
            ) : (
              bills.map((bill) => (
                <div 
                  key={bill.id}
                  className={`cursor-pointer relative overflow-hidden group rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/10 ${
                    selectedBill?.id === bill.id ? "ring-2 ring-amber-500/50 border-amber-500/30 bg-amber-500/5" : ""
                  }`}
                  onClick={() => bill.status === "Belum Bayar" && setSelectedBill(bill)}
                >
                  <div className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        bill.status === "Lunas" ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"
                      }`}>
                        {bill.status === "Lunas" ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-100">{bill.type}</p>
                        <p className="text-xs text-zinc-500">Jatuh tempo: {new Date(bill.dueDate).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold text-zinc-100">{formatCurrency(bill.amount)}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border mt-1 inline-block ${
                        bill.status === "Lunas" 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        {bill.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Checkout Summary */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Ringkasan Pembayaran</h2>
          </div>

          <div className="rounded-2xl bg-zinc-900 border border-white/10 p-6 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
            
            {selectedBill ? (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Metode Tersedia</p>
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    {[
                      "BCA / BNI / BRI / Mandiri Virtual Account",
                      "QRIS (GoPay, OVO, Dana, ShopeePay)",
                      "Kartu Kredit / Debit Online",
                      "Gerai Retail (Indomaret / Alfamart)"
                    ].map((method) => (
                      <div 
                        key={method}
                        className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300"
                      >
                        <span>{method}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-2 italic">*Pilihan Bank & E-Wallet akan langsung dipilih di popup Midtrans Snap</p>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-zinc-500">Jenis Tagihan</span>
                    <span className="text-xs text-zinc-200 font-bold">{selectedBill.type}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-zinc-500">Jumlah Pokok</span>
                    <span className="text-xs text-zinc-300">{formatCurrency(selectedBill.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Biaya Layanan Gateway</span>
                    <span className="text-xs text-emerald-400 font-bold uppercase">Gratis / Sesuai Bank</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 mt-2 border-t border-white/5">
                    <span className="text-sm font-bold text-zinc-400 uppercase">Total Bayar</span>
                    <span className="text-lg font-bold text-amber-500">{formatCurrency(selectedBill.amount)}</span>
                  </div>
                </div>

                <button 
                  onClick={handlePay}
                  disabled={processing || activePending !== null}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all active:scale-[0.98]"
                >
                  {processing ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-zinc-900 border-t-transparent animate-spin" />
                      <span>Menyiapkan Midtrans...</span>
                    </>
                  ) : activePending ? (
                    "Selesaikan Transaksi Aktif Terlebih Dahulu"
                  ) : (
                    "Bayar Sekarang dengan Midtrans"
                  )}
                </button>
              </>
            ) : (
              <div className="py-12 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-zinc-700">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
                  </svg>
                </div>
                <p className="text-sm text-zinc-600">Pilih salah satu tagihan <br />untuk melihat detail pembayaran</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === RIWAYAT TRANSAKSI DENGAN ACTION CEK STATUS & KUITANSI === */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Riwayat Transaksi Pembayaran</h2>
          <span className="text-[11px] text-zinc-500">Total: {transactions.length} Transaksi</span>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Order ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tagihan</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Metode / Bank</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Waktu</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Jumlah</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-zinc-500">
                      Belum ada riwayat transaksi
                    </td>
                  </tr>
                ) : (
                  transactions.map((trx) => (
                    <tr key={trx.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-zinc-400">{trx.order_id}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-zinc-200">{trx.jenis_tagihan}</td>
                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {trx.bank ? (
                          <span className="font-bold text-zinc-200 uppercase">{trx.bank} {trx.va_number ? `(${trx.va_number})` : ""}</span>
                        ) : trx.payment_type ? (
                          <span className="capitalize">{trx.payment_type.replace(/_/g, " ")}</span>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-500">
                        {new Date(trx.created_at).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                          trx.status === "settlement" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          trx.status === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                          {trx.status === "settlement" ? "Lunas" : trx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-zinc-100 text-right">
                        {formatCurrency(trx.jumlah)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {trx.status === "pending" ? (
                          <button
                            onClick={() => syncStatus(trx.order_id, true)}
                            className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-bold uppercase transition-all"
                          >
                            Cek Status
                          </button>
                        ) : trx.status === "settlement" ? (
                          <button
                            onClick={() => setReceiptTrx(trx)}
                            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 text-[11px] font-bold uppercase transition-all"
                          >
                            Kuitansi
                          </button>
                        ) : (
                          <span className="text-zinc-600 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* === MODAL KUITANSI PEMBAYARAN DIGITAL RESMI === */}
      {receiptTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 text-zinc-200">
            {/* Header Kuitansi */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">BUKTI PEMBAYARAN DIGITAL</h3>
                <p className="text-[11px] text-zinc-400 font-mono">UNIVERSITAS INTERNASIONAL SEMEN INDONESIA</p>
              </div>
              <button 
                onClick={() => setReceiptTrx(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Badge Status Lunas */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">TRANSAKSI TELAH LUNAS</span>
              <p className="text-2xl font-black text-white">{formatCurrency(receiptTrx.jumlah)}</p>
              <p className="text-[10px] text-zinc-400 font-mono">Midtrans Settlement Verified</p>
            </div>

            {/* Detail Transaksi */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-500">Order ID:</span>
                <span className="font-mono font-bold text-zinc-300">{receiptTrx.order_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-500">Jenis Tagihan:</span>
                <span className="font-bold text-zinc-200">{receiptTrx.jenis_tagihan}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-500">Metode Pembayaran:</span>
                <span className="font-bold uppercase text-zinc-200">{receiptTrx.bank || receiptTrx.payment_type || "MIDTRANS"}</span>
              </div>
              {receiptTrx.va_number && (
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-zinc-500">Nomor Virtual Account:</span>
                  <span className="font-mono text-zinc-300">{receiptTrx.va_number}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-500">Waktu Pembayaran:</span>
                <span className="text-zinc-300">
                  {receiptTrx.settlement_time ? new Date(receiptTrx.settlement_time).toLocaleString("id-ID") : new Date(receiptTrx.created_at).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all"
              >
                Cetak / Simpan PDF
              </button>
              <button
                onClick={() => setReceiptTrx(null)}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-bold uppercase tracking-wider transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
