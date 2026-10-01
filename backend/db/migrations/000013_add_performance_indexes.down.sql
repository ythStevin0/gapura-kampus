-- Rollback: Hapus semua index performa yang ditambahkan
DROP INDEX IF EXISTS idx_mata_kuliah_nama;
DROP INDEX IF EXISTS idx_mata_kuliah_semester;
DROP INDEX IF EXISTS idx_mahasiswa_nama;
DROP INDEX IF EXISTS idx_mahasiswa_user_id;
DROP INDEX IF EXISTS idx_mahasiswa_angkatan;
DROP INDEX IF EXISTS idx_mahasiswa_prodi;
DROP INDEX IF EXISTS idx_mahasiswa_dosen_wali;
DROP INDEX IF EXISTS idx_dosen_nama;
DROP INDEX IF EXISTS idx_dosen_user_id;
DROP INDEX IF EXISTS idx_dosen_departemen;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_refresh_tokens_user;
DROP INDEX IF EXISTS idx_refresh_tokens_expires;
DROP INDEX IF EXISTS idx_berita_kategori;
DROP INDEX IF EXISTS idx_krs_kelas;
