-- Migrasi 000019: Seed kelas perkuliahan dan KRS mahasiswa

-- 1. Pastikan Billy Butcher adalah dosen wali Stevino
UPDATE mahasiswa 
SET dosen_wali_id = (SELECT id FROM dosen WHERE nidn = '2001200001' LIMIT 1)
WHERE nim = '3012410047';

-- 2. Seed Kelas perkuliahan Semester Ganjil 2024/2025
INSERT INTO kelas (mata_kuliah_id, dosen_id, kode_kelas, hari, jam_mulai, jam_selesai, ruangan, kapasitas, semester_akademik)
SELECT 
    m.id, 
    d.id, 
    m.kode_mk || '-A', 
    'Senin', 
    '08:00'::TIME, 
    '10:30'::TIME, 
    'Lab Komputer 1', 
    40, 
    '2024/2025 - Ganjil'
FROM mata_kuliah m
CROSS JOIN (SELECT id FROM dosen WHERE nidn = '2001200001' LIMIT 1) d
WHERE m.kode_mk IN ('IF12TI03', 'IF12D102', 'IF12KI02', 'IF12DP03', 'IF12KL04', 'GS12RG02', 'GS12E102')
ON CONFLICT (kode_kelas, semester_akademik) DO NOTHING;

-- 3. Seed Kelas perkuliahan Semester Genap 2024/2025
INSERT INTO kelas (mata_kuliah_id, dosen_id, kode_kelas, hari, jam_mulai, jam_selesai, ruangan, kapasitas, semester_akademik)
SELECT 
    m.id, 
    d.id, 
    m.kode_mk || '-A', 
    'Selasa', 
    '10:00'::TIME, 
    '12:30'::TIME, 
    'Lab Komputer 2', 
    40, 
    '2024/2025 - Genap'
FROM mata_kuliah m
CROSS JOIN (SELECT id FROM dosen WHERE nidn = '2001200001' LIMIT 1) d
WHERE m.kode_mk IN ('GS12CZ03', 'GS12E202', 'IF12SO03', 'IF12AL02', 'IF12D212', 'IF12P113', 'IF12ST03')
ON CONFLICT (kode_kelas, semester_akademik) DO NOTHING;

-- 4. Seed Kelas perkuliahan Semester Aktif (2025/2026 - Ganjil)
INSERT INTO kelas (mata_kuliah_id, dosen_id, kode_kelas, hari, jam_mulai, jam_selesai, ruangan, kapasitas, semester_akademik)
SELECT 
    m.id, 
    d.id, 
    m.kode_mk || '-A', 
    'Rabu', 
    '08:00'::TIME, 
    '10:30'::TIME, 
    'Lab Pemrograman Web', 
    40, 
    '2025/2026 - Ganjil'
FROM mata_kuliah m
CROSS JOIN (SELECT id FROM dosen WHERE nidn = '2001200001' LIMIT 1) d
WHERE m.kode_mk IN ('IF13AS13', 'IF13IM13', 'IF13JK13', 'IF13MN13', 'IF13P214', 'DT13SB13', 'IF13RP12')
ON CONFLICT (kode_kelas, semester_akademik) DO NOTHING;

-- 5. Daftarkan KRS Stevino Semester Ganjil 2024/2025 (Resmi ada nilainya untuk KHS & Transkrip)
INSERT INTO krs (mahasiswa_id, kelas_id, semester_akademik, status, nilai_tugas, nilai_uts, nilai_uas, nilai_akhir, nilai_huruf, bobot, status_nilai)
SELECT 
    mhs.id,
    k.id,
    k.semester_akademik,
    'disetujui',
    85.0, 88.0, 90.0, 87.8, 'A', 4.00, 'published'
FROM kelas k
CROSS JOIN (SELECT id FROM mahasiswa WHERE nim = '3012410047' LIMIT 1) mhs
WHERE k.semester_akademik = '2024/2025 - Ganjil'
ON CONFLICT (mahasiswa_id, kelas_id, semester_akademik) DO NOTHING;

-- 6. Daftarkan KRS Stevino Semester Genap 2024/2025 (Resmi ada nilainya untuk KHS & Transkrip)
INSERT INTO krs (mahasiswa_id, kelas_id, semester_akademik, status, nilai_tugas, nilai_uts, nilai_uas, nilai_akhir, nilai_huruf, bobot, status_nilai)
SELECT 
    mhs.id,
    k.id,
    k.semester_akademik,
    'disetujui',
    80.0, 82.0, 84.0, 82.1, 'AB', 3.50, 'published'
FROM kelas k
CROSS JOIN (SELECT id FROM mahasiswa WHERE nim = '3012410047' LIMIT 1) mhs
WHERE k.semester_akademik = '2024/2025 - Genap'
ON CONFLICT (mahasiswa_id, kelas_id, semester_akademik) DO NOTHING;

-- 7. Daftarkan KRS Stevino Semester Aktif (2025/2026 - Ganjil: Siap diinput nilainya oleh Dosen!)
INSERT INTO krs (mahasiswa_id, kelas_id, semester_akademik, status, status_nilai)
SELECT 
    mhs.id,
    k.id,
    k.semester_akademik,
    'disetujui',
    'draft'
FROM kelas k
CROSS JOIN (SELECT id FROM mahasiswa WHERE nim = '3012410047' LIMIT 1) mhs
WHERE k.semester_akademik = '2025/2026 - Ganjil'
ON CONFLICT (mahasiswa_id, kelas_id, semester_akademik) DO NOTHING;
