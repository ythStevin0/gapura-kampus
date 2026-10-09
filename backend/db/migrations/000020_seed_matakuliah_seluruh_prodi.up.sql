-- Migrasi 000020: Menambahkan mata kuliah kurikulum untuk seluruh program studi di UISI
INSERT INTO mata_kuliah (kode_mk, nama_mk, sks, semester, program_studi)
VALUES
    -- ==========================================
    -- 1. SISTEM INFORMASI
    -- ==========================================
    ('SI1101', 'Pengantar Sistem Informasi', 3, 1, 'Sistem Informasi'),
    ('SI1102', 'Dasar Logika & Algoritma', 3, 1, 'Sistem Informasi'),
    ('SI1201', 'Analisis & Perancangan Sistem Informasi', 3, 2, 'Sistem Informasi'),
    ('SI1202', 'Pemrograman Berorientasi Objek', 3, 2, 'Sistem Informasi'),
    ('SI1301', 'Arsitektur Enterprise', 3, 3, 'Sistem Informasi'),
    ('SI1302', 'Manajemen Proyek Sistem Informasi', 3, 3, 'Sistem Informasi'),
    ('SI1401', 'Tata Kelola TI & COBIT', 3, 4, 'Sistem Informasi'),
    ('SI1402', 'Business Intelligence & Data Warehouse', 3, 4, 'Sistem Informasi'),

    -- ==========================================
    -- 2. DESAIN KOMUNIKASI VISUAL (DKV)
    -- ==========================================
    ('DKV1101', 'Rupa Dasar 2D (Nirmana Dwimatra)', 3, 1, 'Desain Komunikasi Visual'),
    ('DKV1102', 'Menggambar Bentuk & Anatomi', 3, 1, 'Desain Komunikasi Visual'),
    ('DKV1201', 'Tipografi Dasar', 3, 2, 'Desain Komunikasi Visual'),
    ('DKV1202', 'Fotografi Desain', 3, 2, 'Desain Komunikasi Visual'),
    ('DKV1301', 'Ilustrasi Digital', 3, 3, 'Desain Komunikasi Visual'),
    ('DKV1302', 'Desain Identitas Visual & Branding', 3, 3, 'Desain Komunikasi Visual'),
    ('DKV1401', 'Animasi 2D & Motion Graphic', 3, 4, 'Desain Komunikasi Visual'),
    ('DKV1402', 'Desain Kemasan (Packaging Design)', 3, 4, 'Desain Komunikasi Visual'),

    -- ==========================================
    -- 3. MANAJEMEN REKAYASA
    -- ==========================================
    ('MR1101', 'Pengantar Manajemen Rekayasa', 2, 1, 'Manajemen Rekayasa'),
    ('MR1102', 'Fisika Dasar untuk Rekayasa', 3, 1, 'Manajemen Rekayasa'),
    ('MR1201', 'Ergonomi & Rekayasa Kerja', 3, 2, 'Manajemen Rekayasa'),
    ('MR1202', 'Ekonomi Teknik', 3, 2, 'Manajemen Rekayasa'),
    ('MR1301', 'Perencanaan & Pengendalian Produksi', 3, 3, 'Manajemen Rekayasa'),
    ('MR1302', 'Manajemen Mutu & Six Sigma', 3, 3, 'Manajemen Rekayasa'),
    ('MR1401', 'Riset Operasi & Optimasi', 3, 4, 'Manajemen Rekayasa'),
    ('MR1402', 'Analisis Kelayakan Proyek Industri', 3, 4, 'Manajemen Rekayasa'),

    -- ==========================================
    -- 4. TEKNIK LOGISTIK
    -- ==========================================
    ('TL1101', 'Pengantar Sistem Logistik & Supply Chain', 3, 1, 'Teknik Logistik'),
    ('TL1102', 'Pengantar Transportasi & Distribusi', 2, 1, 'Teknik Logistik'),
    ('TL1201', 'Manajemen Pergudangan & Inventory', 3, 2, 'Teknik Logistik'),
    ('TL1202', 'Pemodelan Sistem Logistik', 3, 2, 'Teknik Logistik'),
    ('TL1301', 'Logistik Maritim & Pelabuhan', 3, 3, 'Teknik Logistik'),
    ('TL1302', 'Manajemen Pengadaan (Procurement)', 3, 3, 'Teknik Logistik'),
    ('TL1401', 'Sistem Informasi Logistik & ERP', 3, 4, 'Teknik Logistik'),
    ('TL1402', 'Green Logistics & Keberlanjutan', 3, 4, 'Teknik Logistik'),

    -- ==========================================
    -- 5. MANAJEMEN
    -- ==========================================
    ('MN1101', 'Pengantar Bisnis & Manajemen', 3, 1, 'Manajemen'),
    ('MN1102', 'Pengantar Ilmu Ekonomi', 3, 1, 'Manajemen'),
    ('MN1201', 'Manajemen Pemasaran', 3, 2, 'Manajemen'),
    ('MN1202', 'Manajemen Keuangan', 3, 2, 'Manajemen'),
    ('MN1301', 'Manajemen Sumber Daya Manusia', 3, 3, 'Manajemen'),
    ('MN1302', 'Perilaku Organisasi', 3, 3, 'Manajemen'),
    ('MN1401', 'Manajemen Operasi & Inovasi', 3, 4, 'Manajemen'),
    ('MN1402', 'Manajemen Stratejik & Kewirausahaan', 3, 4, 'Manajemen'),

    -- ==========================================
    -- 6. AKUNTANSI
    -- ==========================================
    ('AK1101', 'Pengantar Akuntansi 1', 3, 1, 'Akuntansi'),
    ('AK1102', 'Matematika Bisnis & Keuangan', 3, 1, 'Akuntansi'),
    ('AK1201', 'Pengantar Akuntansi 2', 3, 2, 'Akuntansi'),
    ('AK1202', 'Akuntansi Biaya', 3, 2, 'Akuntansi'),
    ('AK1301', 'Akuntansi Keuangan Menengah 1', 3, 3, 'Akuntansi'),
    ('AK1302', 'Perpajakan & Hukum Pajak', 3, 3, 'Akuntansi'),
    ('AK1401', 'Sistem Informasi Akuntansi', 3, 4, 'Akuntansi'),
    ('AK1402', 'Pengauditan 1 (Auditing)', 3, 4, 'Akuntansi')
ON CONFLICT (kode_mk) DO UPDATE
SET nama_mk = EXCLUDED.nama_mk,
    sks = EXCLUDED.sks,
    semester = EXCLUDED.semester,
    program_studi = EXCLUDED.program_studi,
    updated_at = NOW();
