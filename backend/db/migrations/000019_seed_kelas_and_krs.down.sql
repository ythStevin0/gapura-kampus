-- Rollback 000019: Hapus seed kelas dan KRS
DELETE FROM krs WHERE semester_akademik IN ('2024/2025 - Ganjil', '2024/2025 - Genap', '2025/2026 - Ganjil');
DELETE FROM kelas WHERE semester_akademik IN ('2024/2025 - Ganjil', '2024/2025 - Genap', '2025/2026 - Ganjil');
