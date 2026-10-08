-- Migrasi 000017: Menambahkan sistem penilaian akademik pada tabel krs
ALTER TABLE krs
ADD COLUMN IF NOT EXISTS nilai_tugas NUMERIC(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nilai_uts NUMERIC(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nilai_uas NUMERIC(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nilai_akhir NUMERIC(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nilai_huruf VARCHAR(5) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bobot NUMERIC(4,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS status_nilai VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status_nilai IN ('draft', 'published'));

COMMENT ON COLUMN krs.nilai_tugas IS 'Nilai tugas / formatif (skala 0 - 100)';
COMMENT ON COLUMN krs.nilai_uts IS 'Nilai Ujian Tengah Semester (skala 0 - 100)';
COMMENT ON COLUMN krs.nilai_uas IS 'Nilai Ujian Akhir Semester (skala 0 - 100)';
COMMENT ON COLUMN krs.nilai_akhir IS 'Nilai akhir terbobot (30% tugas + 35% uts + 35% uas)';
COMMENT ON COLUMN krs.nilai_huruf IS 'Konversi nilai huruf: A, AB, B, BC, C, D, E';
COMMENT ON COLUMN krs.bobot IS 'Bobot nilai untuk perhitungan IP: A=4.00, AB=3.50, B=3.00, BC=2.50, C=2.00, D=1.00, E=0.00';
COMMENT ON COLUMN krs.status_nilai IS 'Status publikasi nilai: draft (hanya dosen), published (mahasiswa bisa lihat di KHS)';

CREATE INDEX IF NOT EXISTS idx_krs_status_nilai ON krs(status_nilai);
