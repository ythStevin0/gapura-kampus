import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),

  // Mahasiswa Panel
  route("dashboard", "routes/dashboard.tsx", [
    index("routes/mahasiswa/index.tsx"),
    route("cari-user", "routes/mahasiswa/cari-user.tsx"),
    route("jadwal", "routes/mahasiswa/jadwal.tsx"),
    route("uisi-pay", "routes/mahasiswa/uisi-pay.tsx"),
    route("masterpiece", "routes/mahasiswa/masterpiece.tsx"),
    // Placeholder routes (can be moved to folder later as they are implemented)
    route("krs", "routes/dashboard.krs.tsx"),
    route("persetujuan-krs", "routes/dashboard.persetujuan-krs.tsx"),
    route("master-data", "routes/dashboard.master-data.tsx"),
    route("review-mahakarya", "routes/dashboard.review-mahakarya.tsx"),
  ]),

  // Admin Panel
  route("admin", "routes/admin.tsx", [
    index("routes/admin/index.tsx"),
    route("mahasiswa", "routes/admin/mahasiswa.tsx"),
    route("dosen", "routes/admin/dosen.tsx"),
    route("mata-kuliah", "routes/admin/mata-kuliah.tsx"),
    route("berita", "routes/admin/berita.tsx"),
    route("pesan", "routes/admin/pesan.tsx"),
    route("kelas", "routes/admin.kelas.tsx"),
    route("akun", "routes/admin.akun.tsx"),
  ]),
] satisfies RouteConfig;
