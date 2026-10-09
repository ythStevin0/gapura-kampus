-- Migrasi 000018: Seed kurikulum mata kuliah resmi UISI (Teknik Informatika)
INSERT INTO mata_kuliah (kode_mk, nama_mk, sks, semester, program_studi)
VALUES
    -- Semester 1
    ('IF12TI03', 'Pengantar Teknologi Informasi', 3, 1, 'Teknik Informatika'),
    ('IF12D102', 'Matematika Diskret 1', 2, 1, 'Teknik Informatika'),
    ('IF12KI02', 'Keterampilan Interpersonal', 2, 1, 'Teknik Informatika'),
    ('IF12DP03', 'Dasar-dasar Pemrograman', 3, 1, 'Teknik Informatika'),
    ('IF12KL04', 'Kalkulus 1', 4, 1, 'Teknik Informatika'),
    ('GS12RG02', 'Agama', 2, 1, 'Teknik Informatika'),
    ('GS12E102', 'Bahasa Inggris 1', 2, 1, 'Teknik Informatika'),

    -- Semester 2
    ('GS12CZ03', 'Pancasila dan Kewarganegaraan', 3, 2, 'Teknik Informatika'),
    ('GS12E202', 'Bahasa Inggris 2', 2, 2, 'Teknik Informatika'),
    ('IF12SO03', 'Sistem Operasi', 3, 2, 'Teknik Informatika'),
    ('IF12AL02', 'Aljabar Linear', 2, 2, 'Teknik Informatika'),
    ('IF12D212', 'Matematika Diskret 2', 2, 2, 'Teknik Informatika'),
    ('IF12P113', 'Pemrograman 1', 3, 2, 'Teknik Informatika'),
    ('IF12ST03', 'Statistika Dasar', 3, 2, 'Teknik Informatika'),

    -- Semester 3
    ('IF13AS13', 'Algoritma dan Struktur Data', 3, 3, 'Teknik Informatika'),
    ('IF13IM13', 'Interaksi Manusia-Komputer', 3, 3, 'Teknik Informatika'),
    ('IF13JK13', 'Jaringan Komputer', 3, 3, 'Teknik Informatika'),
    ('IF13MN13', 'Metode Numerik', 3, 3, 'Teknik Informatika'),
    ('IF13P214', 'Pemrograman 2', 4, 3, 'Teknik Informatika'),
    ('DT13SB13', 'Sistem Basis Data', 3, 3, 'Teknik Informatika'),
    ('IF13RP12', 'Rekayasa Perangkat Lunak', 2, 3, 'Teknik Informatika'),

    -- Semester 4
    ('IF-13AD13', 'Analisis Data Eksploratif', 3, 4, 'Teknik Informatika'),
    ('IF-13AK13', 'Analisis Kebutuhan Perangkat Lunak', 3, 4, 'Teknik Informatika'),
    ('IF-13KB13', 'Kecerdasan Buatan', 3, 4, 'Teknik Informatika'),
    ('IF-13MB13', 'Manajemen Basis Data', 3, 4, 'Teknik Informatika'),
    ('DT13PW13', 'Pemrograman Web', 3, 4, 'Teknik Informatika'),
    ('IF13WL12', 'Wawasan Lingkungan', 2, 4, 'Teknik Informatika'),
    ('DT13DP13', 'Desain Pengalaman Pengguna', 3, 4, 'Teknik Informatika')
ON CONFLICT (kode_mk) DO UPDATE 
SET nama_mk = EXCLUDED.nama_mk,
    sks = EXCLUDED.sks,
    semester = EXCLUDED.semester,
    program_studi = EXCLUDED.program_studi,
    updated_at = NOW();
