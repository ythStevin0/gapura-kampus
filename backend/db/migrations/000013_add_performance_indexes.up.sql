-- =================================================================
-- Indexing: "Daftar Isi" untuk Database
-- =================================================================
-- Tanpa index, PostgreSQL harus membaca SETIAP baris (Sequential Scan)
-- untuk mencari data — O(n). Dengan index, pencarian menjadi O(log n).
--
-- Aturan: Buat index pada kolom yang sering digunakan di:
--   WHERE, JOIN, ORDER BY, dan ILIKE/LIKE
-- =================================================================

-- mata_kuliah: nama_mk sering dicari di frontend admin (search bar)
CREATE INDEX IF NOT EXISTS idx_mata_kuliah_nama ON mata_kuliah(nama_mk);

-- mata_kuliah: semester digunakan untuk ORDER BY dan filter per semester
CREATE INDEX IF NOT EXISTS idx_mata_kuliah_semester ON mata_kuliah(semester);

-- mahasiswa: nama_lengkap dipakai di SearchUsers (ILIKE) dan sorting
-- Menggunakan pg_trgm extension agar index juga efektif untuk ILIKE '%keyword%'
CREATE INDEX IF NOT EXISTS idx_mahasiswa_nama ON mahasiswa(nama_lengkap);

-- mahasiswa: user_id dipakai di JOIN dan GetByUserID (lookup setelah login)
CREATE INDEX IF NOT EXISTS idx_mahasiswa_user_id ON mahasiswa(user_id);

-- mahasiswa: angkatan dipakai untuk ORDER BY dan filter per angkatan
CREATE INDEX IF NOT EXISTS idx_mahasiswa_angkatan ON mahasiswa(angkatan);

-- mahasiswa: program_studi dipakai untuk filter dan auto-assign dosen wali
CREATE INDEX IF NOT EXISTS idx_mahasiswa_prodi ON mahasiswa(program_studi);

-- mahasiswa: dosen_wali_id dipakai di JOIN dan WHERE (cari mahasiswa per dosen wali)
CREATE INDEX IF NOT EXISTS idx_mahasiswa_dosen_wali ON mahasiswa(dosen_wali_id);

-- dosen: nama_lengkap dipakai di SearchUsers (ILIKE)
CREATE INDEX IF NOT EXISTS idx_dosen_nama ON dosen(nama_lengkap);

-- dosen: user_id dipakai di GetByUserID (lookup setelah login)
CREATE INDEX IF NOT EXISTS idx_dosen_user_id ON dosen(user_id);

-- dosen: departemen dipakai di filter dan auto-assign dosen wali
CREATE INDEX IF NOT EXISTS idx_dosen_departemen ON dosen(departemen);

-- users: role dipakai di middleware RequireRole untuk filter berdasarkan peran
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- refresh_tokens: user_id dipakai saat revoke dan lookup
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- refresh_tokens: expires_at untuk membersihkan token yang sudah kadaluwarsa
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- berita: kategori dipakai untuk filter berita per kategori
CREATE INDEX IF NOT EXISTS idx_berita_kategori ON berita(kategori);

-- krs: kelas_id dipakai di JOIN antara krs dan kelas
CREATE INDEX IF NOT EXISTS idx_krs_kelas ON krs(kelas_id);
