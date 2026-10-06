import { useState, useMemo } from "react";

interface RiwayatItem {
  id: string;
  kode: string;
  mataKuliah: string;
  sks: number;
  nilai: string;
  semester: string;
  masukTranskrip: boolean;
}

export function RiwayatStudiView({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState("non-transfer");

  const riwayatData: RiwayatItem[] = [
    // ... (data non-transfer sebelumnya tetap ada)
    { id: "1", kode: "IF12TI03", mataKuliah: "Pengantar Teknologi Informasi", sks: 3, nilai: "A", semester: "2024 / Gasal", masukTranskrip: false },
    { id: "2", kode: "IF12D102", mataKuliah: "Matematika Diskret 1", sks: 2, nilai: "AB", semester: "2024 / Gasal", masukTranskrip: false },
    { id: "3", kode: "IF12KI02", mataKuliah: "Keterampilan Interpersonal", sks: 2, nilai: "A", semester: "2024 / Gasal", masukTranskrip: false },
    { id: "4", kode: "IF12DP03", mataKuliah: "Dasar-dasar Pemrograman", sks: 3, nilai: "AB", semester: "2024 / Gasal", masukTranskrip: false },
    { id: "5", kode: "IF12KL04", mataKuliah: "Kalkulus 1", sks: 4, nilai: "BC", semester: "2024 / Gasal", masukTranskrip: false },
    { id: "6", kode: "GS12RG02", mataKuliah: "Agama", sks: 2, nilai: "A", semester: "2024 / Gasal", masukTranskrip: false },
    { id: "7", kode: "GS12E102", mataKuliah: "Bahasa Inggris 1", sks: 2, nilai: "A", semester: "2024 / Gasal", masukTranskrip: false },
    { id: "8", kode: "GS12CZ03", mataKuliah: "Pancasila dan Kewarganegaraan", sks: 3, nilai: "A", semester: "2024 / Genap", masukTranskrip: false },
    { id: "9", kode: "GS12E202", mataKuliah: "Bahasa Inggris 2", sks: 2, nilai: "A", semester: "2024 / Genap", masukTranskrip: false },
    { id: "10", kode: "IF12SO03", mataKuliah: "Sistem Operasi", sks: 3, nilai: "B", semester: "2024 / Genap", masukTranskrip: false },
    { id: "11", kode: "IF12AL02", mataKuliah: "Aljabar Linear", sks: 2, nilai: "AB", semester: "2024 / Genap", masukTranskrip: false },
    { id: "12", kode: "IF12D212", mataKuliah: "Matematika Diskret 2", sks: 2, nilai: "B", semester: "2024 / Genap", masukTranskrip: false },
    { id: "13", kode: "IF12P113", mataKuliah: "Pemrograman 1", sks: 3, nilai: "A", semester: "2024 / Genap", masukTranskrip: false },
    { id: "14", kode: "IF12ST03", mataKuliah: "Statistika Dasar", sks: 3, nilai: "AB", semester: "2024 / Genap", masukTranskrip: false },
    { id: "15", kode: "IF13AS13", mataKuliah: "Algoritma dan Struktur Data", sks: 3, nilai: "AB", semester: "2025 / Gasal", masukTranskrip: true },
    { id: "16", kode: "IF13IM13", mataKuliah: "Interaksi Manusia-Komputer", sks: 3, nilai: "AB", semester: "2025 / Gasal", masukTranskrip: true },
    { id: "17", kode: "IF13JK13", mataKuliah: "Jaringan Komputer", sks: 3, nilai: "D", semester: "2025 / Gasal", masukTranskrip: true },
    { id: "18", kode: "IF13MN13", mataKuliah: "Metode Numerik", sks: 3, nilai: "BC", semester: "2025 / Gasal", masukTranskrip: true },
    { id: "19", kode: "IF13P214", mataKuliah: "Pemrograman 2", sks: 4, nilai: "AB", semester: "2025 / Gasal", masukTranskrip: true },
    { id: "20", kode: "DT13SB13", mataKuliah: "Sistem Basis Data", sks: 3, nilai: "BC", semester: "2025 / Gasal", masukTranskrip: true },
    { id: "21", kode: "IF13RP12", mataKuliah: "Rekayasa Perangkat Lunak", sks: 2, nilai: "B", semester: "2025 / Gasal", masukTranskrip: true },
  ];

  const transferData = [
    { id: "t1", kode: "GS13EL03", mataKuliah: "Bahasa Inggris", sks: 3, nilai: "A", semester: "2024 / -", jenis: "Ekuivalensi" },
    { id: "t2", kode: "GS13RG02", mataKuliah: "Agama", sks: 2, nilai: "A", semester: "2024 / -", jenis: "Ekuivalensi" },
    { id: "t3", kode: "DT13MD13", mataKuliah: "Matematika Diskret", sks: 3, nilai: "AB", semester: "2024 / -", jenis: "Ekuivalensi" },
    { id: "t4", kode: "IF13KI12", mataKuliah: "Keterampilan Interpersonal", sks: 2, nilai: "A", semester: "2024 / -", jenis: "Ekuivalensi" },
    { id: "t5", kode: "IF13KA14", mataKuliah: "Kalkulus", sks: 4, nilai: "BC", semester: "2024 / -", jenis: "Ekuivalensi" },
    { id: "t6", kode: "DT13PT12", mataKuliah: "Pengantar Teknologi Informasi", sks: 2, nilai: "A", semester: "2024 / -", jenis: "Ekuivalensi" },
    { id: "t7", kode: "GS13CZ02", mataKuliah: "Kewarganegaraan", sks: 2, nilai: "A", semester: "2024 / -", jenis: "Ekuivalensi" },
    { id: "t8", kode: "GS13PC02", mataKuliah: "Pancasila", sks: 2, nilai: "A", semester: "2024 / -", jenis: "Ekuivalensi" },
    { id: "t9", kode: "IF13AL13", mataKuliah: "Aljabar Linear", sks: 3, nilai: "AB", semester: "2024 / -", jenis: "Ekuivalensi" },
    { id: "t10", kode: "IF13TG12", mataKuliah: "Teori Graf", sks: 2, nilai: "B", semester: "2024 / -", jenis: "Ekuivalensi" },
    { id: "t11", kode: "IF13P114", mataKuliah: "Pemrograman 1", sks: 4, nilai: "A", semester: "2024 / -", jenis: "Ekuivalensi" },
    { id: "t12", kode: "IF13SO13", mataKuliah: "Sistem Operasi", sks: 3, nilai: "B", semester: "2024 / -", jenis: "Ekuivalensi" },
    { id: "t13", kode: "DT13ST13", mataKuliah: "Statistika", sks: 3, nilai: "AB", semester: "2024 / -", jenis: "Ekuivalensi" },
  ];

  // Single-pass memoized calculation (menggantikan 3 kali reduce & filter per render)
  const { totalSksDiambil, totalSksDiakui, totalSksTransfer } = useMemo(() => {
    let diambil = 0;
    let diakui = 0;
    for (const i of riwayatData) {
      diambil += i.sks;
      if (i.masukTranskrip) diakui += i.sks;
    }
    const transfer = transferData.reduce((acc, curr) => acc + curr.sks, 0);
    return { totalSksDiambil: diambil, totalSksDiakui: diakui, totalSksTransfer: transfer };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          Laporan Nilai <span className="text-zinc-500 font-normal text-lg">Tampilan</span>
        </h1>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <span>&rsaquo;</span>
          <span className="text-zinc-400">Laporan Nilai</span>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-900/40 border border-white/10 p-6 backdrop-blur-md shadow-xl space-y-6">
        {/* Detail Section */}
        <div className="space-y-4">
          <h3 className="text-[#1ea39e] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Detail Riwayat Studi Mahasiswa
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 text-[12px] bg-white/5 p-5 rounded-xl border border-white/5">
            <div className="space-y-3">
              <div className="flex">
                <span className="w-24 text-zinc-500 font-bold uppercase tracking-tighter">Nama</span>
                <span className="text-zinc-400 mr-3">:</span>
                <span className="text-zinc-200 font-bold uppercase">{user?.name || "Stevino Adi Nugroho"}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-zinc-500 font-bold uppercase tracking-tighter">NIM</span>
                <span className="text-zinc-400 mr-3">:</span>
                <span className="text-zinc-300 font-mono">3012410047</span>
              </div>
              <div className="flex">
                <span className="w-24 text-zinc-500 font-bold uppercase tracking-tighter">Dosen Wali</span>
                <span className="text-zinc-400 mr-3">:</span>
                <span className="text-zinc-300">Taufiqotul Bariyah, S.Kom. , M.IM. , MCE</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex">
                <span className="w-32 text-zinc-500 font-bold uppercase tracking-tighter">Programstudi</span>
                <span className="text-zinc-400 mr-3">:</span>
                <span className="text-zinc-200 font-bold">Informatika</span>
              </div>
              <div className="flex">
                <span className="w-32 text-zinc-500 font-bold uppercase tracking-tighter">Tahun Masuk</span>
                <span className="text-zinc-400 mr-3">:</span>
                <span className="text-zinc-300 font-mono">2024</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 italic">
            Catatan : <span className="text-red-400/80 font-medium">Baris yang berwarna merah adalah nilai yang tidak dimasukkan ke transkrip / matkul yang pernah diulang</span>
          </p>
        </div>

        {/* Data Section */}
        <div className="space-y-4 pt-4">
          <h3 className="text-[#1ea39e] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
            Data Riwayat Studi Mahasiswa
          </h3>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-white/5">
            <button 
              onClick={() => setActiveTab("non-transfer")}
              className={`px-4 py-2 text-[11px] font-bold transition-all border-b-2 ${activeTab === "non-transfer" ? "border-[#1ea39e] text-white bg-[#1ea39e]/10" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
            >
              Riwayat Nilai Non Transfer
            </button>
            <button 
              onClick={() => setActiveTab("transfer")}
              className={`px-4 py-2 text-[11px] font-bold transition-all border-b-2 ${activeTab === "transfer" ? "border-[#1ea39e] text-white bg-[#1ea39e]/10" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
            >
              Riwayat Nilai Transfer/MBKM/Ekuivalensi
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-white/5">
                  <th className="px-4 py-3 text-center w-12">No</th>
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-6 py-3">Mata Kuliah</th>
                  <th className="px-4 py-3 text-center">SKS</th>
                  <th className="px-4 py-3 text-center">Nilai</th>
                  <th className="px-6 py-3">Semester</th>
                  {activeTab === "transfer" && <th className="px-6 py-3 text-center">Jenis Nilai</th>}
                  <th className="px-4 py-3 text-center">Masuk Transkrip?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeTab === "non-transfer" ? (
                  riwayatData.map((item, index) => (
                    <tr 
                      key={item.id} 
                      className={`transition-colors ${!item.masukTranskrip ? "bg-red-500/10 hover:bg-red-500/20" : "hover:bg-white/5"}`}
                    >
                      <td className="px-4 py-2.5 text-center text-zinc-500 font-bold">{index + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-zinc-400 text-xs">{item.kode}</td>
                      <td className={`px-6 py-2.5 font-bold ${!item.masukTranskrip ? "text-red-300/80" : "text-zinc-200"}`}>{item.mataKuliah}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-zinc-300">{item.sks}</td>
                      <td className="px-4 py-2.5 text-center font-black text-zinc-400">{item.nilai}</td>
                      <td className="px-6 py-2.5 text-zinc-500 font-medium">{item.semester}</td>
                      <td className={`px-4 py-2.5 text-center font-bold ${item.masukTranskrip ? "text-emerald-400" : "text-zinc-600"}`}>
                        {item.masukTranskrip ? "Ya" : "Tidak"}
                      </td>
                    </tr>
                  ))
                ) : (
                  transferData.map((item, index) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2.5 text-center text-zinc-500 font-bold">{index + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-zinc-400 text-xs">{item.kode}</td>
                      <td className="px-6 py-2.5 font-bold text-zinc-200">{item.mataKuliah}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-zinc-300">{item.sks}</td>
                      <td className="px-4 py-2.5 text-center font-black text-zinc-400">{item.nilai}</td>
                      <td className="px-6 py-2.5 text-zinc-500 font-medium">{item.semester}</td>
                      <td className="px-6 py-2.5 text-center text-zinc-400 font-medium">{item.jenis}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-emerald-400">Ya</td>
                    </tr>
                  ))
                )}
                
                {activeTab === "non-transfer" ? (
                  <>
                    <tr className="bg-white/5 font-black text-[10px] uppercase tracking-widest text-zinc-500">
                      <td colSpan={3} className="px-6 py-3 text-right">Total SKS Diambil</td>
                      <td className="px-4 py-3 text-center text-white text-[13px]">{totalSksDiambil}</td>
                      <td colSpan={3}></td>
                    </tr>
                    <tr className="bg-white/10 font-black text-[10px] uppercase tracking-widest text-zinc-400">
                      <td colSpan={3} className="px-6 py-3 text-right">Total SKS Diakui</td>
                      <td className="px-4 py-3 text-center text-[#1ea39e] text-[13px]">{totalSksDiakui}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </>
                ) : (
                  <tr className="bg-white/10 font-black text-[10px] uppercase tracking-widest text-zinc-400">
                    <td colSpan={3} className="px-6 py-3 text-right">Total SKS Diakui</td>
                    <td className="px-4 py-3 text-center text-[#1ea39e] text-[13px]">{totalSksTransfer}</td>
                    <td colSpan={4}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
