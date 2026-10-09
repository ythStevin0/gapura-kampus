-- Rollback 000020: Hapus mata kuliah seed non-Informatika
DELETE FROM mata_kuliah 
WHERE program_studi IN (
    'Sistem Informasi',
    'Desain Komunikasi Visual',
    'Manajemen Rekayasa',
    'Teknik Logistik',
    'Manajemen',
    'Akuntansi'
);
