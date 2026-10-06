package dosenWali

import (
	"context"
	"fmt"

	"siakad/backend/internal/model"
	"siakad/backend/pkg/cache"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db    *pgxpool.Pool
	cache *cache.Cache
}

func NewRepository(db *pgxpool.Pool, cache *cache.Cache) *Repository {
	return &Repository{db: db, cache: cache}
}

// GetDosenByUserID mengambil profil dosen berdasarkan user ID (dari JWT)
func (r *Repository) GetDosenByUserID(ctx context.Context, userID string) (*model.Dosen, error) {
	query := `
		SELECT id, user_id, nidn, nama_lengkap, gelar_depan, gelar_belakang, departemen, created_at, updated_at
		FROM dosen WHERE user_id = $1
	`
	var d model.Dosen
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&d.ID, &d.UserID, &d.NIDN, &d.NamaLengkap, &d.GelarDepan, &d.GelarBelakang,
		&d.Departemen, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("dosen not found: %w", err)
	}
	return &d, nil
}

// GetMahasiswaAsuhan mengambil semua mahasiswa yang dibimbing dosen ini
func (r *Repository) GetMahasiswaAsuhan(ctx context.Context, dosenID string) ([]model.Mahasiswa, error) {
	query := `
		SELECT 
			m.id, m.user_id, m.nim, m.nama_lengkap, m.program_studi, m.angkatan,
			m.jalur_masuk, m.status_ukt, m.status_bip, m.izin_krs, m.dosen_wali_id,
			m.created_at, m.updated_at,
			(SELECT COUNT(*) FROM krs k WHERE k.mahasiswa_id = m.id AND k.status = 'pending') as jumlah_pending
		FROM mahasiswa m
		WHERE m.dosen_wali_id = $1
		ORDER BY m.program_studi ASC, m.angkatan DESC, m.nama_lengkap ASC
	`
	rows, err := r.db.Query(ctx, query, dosenID)
	if err != nil {
		return nil, fmt.Errorf("failed to query mahasiswa asuhan: %w", err)
	}
	defer rows.Close()

	var list []model.Mahasiswa
	for rows.Next() {
		var m model.Mahasiswa
		var jumlahPending int
		err := rows.Scan(
			&m.ID, &m.UserID, &m.NIM, &m.NamaLengkap, &m.ProgramStudi, &m.Angkatan,
			&m.JalurMasuk, &m.StatusUKT, &m.StatusBIP, &m.IzinKRS, &m.DosenWaliID,
			&m.CreatedAt, &m.UpdatedAt, &jumlahPending,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan mahasiswa: %w", err)
		}
		// Simpan jumlah pending di NamaDosenWali sementara (workaround untuk response)
		_ = jumlahPending
		list = append(list, m)
	}
	return list, nil
}

// GetMahasiswaAsuhanWithPending mengambil mahasiswa dengan info jumlah KRS pending
func (r *Repository) GetMahasiswaAsuhanWithPending(ctx context.Context, dosenID string) ([]MahasiswaAsuhan, error) {
	query := `
		SELECT 
			m.id, m.nim, m.nama_lengkap, m.program_studi, m.angkatan,
			m.status_ukt, m.status_bip, m.dosen_wali_id,
			COALESCE(
				(SELECT COUNT(*) FROM krs k 
				 WHERE k.mahasiswa_id = m.id 
				 AND k.status = 'pending'), 0
			) as krs_pending,
			COALESCE(
				(SELECT COUNT(*) FROM krs k 
				 WHERE k.mahasiswa_id = m.id 
				 AND k.status = 'disetujui'), 0
			) as krs_disetujui
		FROM mahasiswa m
		WHERE m.dosen_wali_id = $1
		ORDER BY krs_pending DESC, m.nama_lengkap ASC
	`
	rows, err := r.db.Query(ctx, query, dosenID)
	if err != nil {
		return nil, fmt.Errorf("failed to query mahasiswa with pending: %w", err)
	}
	defer rows.Close()

	var list []MahasiswaAsuhan
	for rows.Next() {
		var ma MahasiswaAsuhan
		err := rows.Scan(
			&ma.ID, &ma.NIM, &ma.NamaLengkap, &ma.ProgramStudi, &ma.Angkatan,
			&ma.StatusUKT, &ma.StatusBIP, &ma.DosenWaliID,
			&ma.KRSPending, &ma.KRSDisetujui,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan mahasiswa asuhan: %w", err)
		}
		list = append(list, ma)
	}
	return list, nil
}

// GetKRSMahasiswaAsuhan mengambil KRS mahasiswa, dan verifikasi mahasiswa adalah asuhan dosen ini
func (r *Repository) GetKRSMahasiswaAsuhan(ctx context.Context, mahasiswaID string, dosenID string) ([]model.KRS, error) {
	query := `
		SELECT 
			kr.id, kr.mahasiswa_id, kr.kelas_id, kr.semester_akademik, kr.status, kr.catatan,
			kr.created_at, kr.updated_at,
			mk.nama_mk, k.kode_kelas, mk.sks, k.hari, k.jam_mulai, k.jam_selesai, d.nama_lengkap as nama_dosen
		FROM krs kr
		JOIN kelas k ON k.id = kr.kelas_id
		JOIN mata_kuliah mk ON mk.id = k.mata_kuliah_id
		JOIN dosen d ON d.id = k.dosen_id
		JOIN mahasiswa m ON m.id = kr.mahasiswa_id
		WHERE kr.mahasiswa_id = $1 AND m.dosen_wali_id = $2
		ORDER BY kr.status ASC, k.hari ASC, k.jam_mulai ASC
	`
	rows, err := r.db.Query(ctx, query, mahasiswaID, dosenID)
	if err != nil {
		return nil, fmt.Errorf("failed to query krs: %w", err)
	}
	defer rows.Close()

	var list []model.KRS
	for rows.Next() {
		var kr model.KRS
		err := rows.Scan(
			&kr.ID, &kr.MahasiswaID, &kr.KelasID, &kr.SemesterAkademik, &kr.Status, &kr.Catatan,
			&kr.CreatedAt, &kr.UpdatedAt,
			&kr.NamaMataKuliah, &kr.KodeKelas, &kr.SKS, &kr.Hari, &kr.JamMulai, &kr.JamSelesai, &kr.NamaDosen,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan krs: %w", err)
		}
		list = append(list, kr)
	}
	return list, nil
}

// ApproveKRS menyetujui satu item KRS, dengan verifikasi kepemilikan dosen
func (r *Repository) ApproveKRS(ctx context.Context, krsID string, dosenID string) error {
	query := `
		UPDATE krs SET status = 'disetujui', catatan = NULL, updated_at = NOW()
		WHERE id = $1
		AND mahasiswa_id IN (SELECT id FROM mahasiswa WHERE dosen_wali_id = $2)
		AND status = 'pending'
	`
	cmd, err := r.db.Exec(ctx, query, krsID, dosenID)
	if err != nil {
		return fmt.Errorf("failed to approve krs: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("krs tidak ditemukan, sudah diproses, atau bukan asuhan Anda")
	}

	if r.cache != nil {
		r.cache.Invalidate(fmt.Sprintf("dosen:summary:%s", dosenID))
	}
	return nil
}

// RejectKRS menolak satu item KRS dengan catatan alasan
func (r *Repository) RejectKRS(ctx context.Context, krsID string, dosenID string, catatan string) error {
	query := `
		UPDATE krs SET status = 'ditolak', catatan = $3, updated_at = NOW()
		WHERE id = $1
		AND mahasiswa_id IN (SELECT id FROM mahasiswa WHERE dosen_wali_id = $2)
		AND status = 'pending'
	`
	cmd, err := r.db.Exec(ctx, query, krsID, dosenID, catatan)
	if err != nil {
		return fmt.Errorf("failed to reject krs: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("krs tidak ditemukan, sudah diproses, atau bukan asuhan Anda")
	}

	if r.cache != nil {
		r.cache.Invalidate(fmt.Sprintf("dosen:summary:%s", dosenID))
	}
	return nil
}

// ApproveAllKRS menyetujui semua KRS pending dari satu mahasiswa asuhan
func (r *Repository) ApproveAllKRS(ctx context.Context, mahasiswaID string, dosenID string) (int64, error) {
	query := `
		UPDATE krs SET status = 'disetujui', catatan = NULL, updated_at = NOW()
		WHERE mahasiswa_id = $1
		AND mahasiswa_id IN (SELECT id FROM mahasiswa WHERE dosen_wali_id = $2)
		AND status = 'pending'
	`
	cmd, err := r.db.Exec(ctx, query, mahasiswaID, dosenID)
	if err != nil {
		return 0, fmt.Errorf("failed to approve all krs: %w", err)
	}

	if r.cache != nil {
		r.cache.Invalidate(fmt.Sprintf("dosen:summary:%s", dosenID))
	}
	return cmd.RowsAffected(), nil
}

// AssignDosenWali menugaskan dosen wali ke mahasiswa (untuk admin)
func (r *Repository) AssignDosenWali(ctx context.Context, mahasiswaID string, dosenID string) error {
	query := `UPDATE mahasiswa SET dosen_wali_id = $1, updated_at = NOW() WHERE id = $2`
	cmd, err := r.db.Exec(ctx, query, dosenID, mahasiswaID)
	if err != nil {
		return fmt.Errorf("failed to assign dosen wali: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("mahasiswa tidak ditemukan")
	}

	if r.cache != nil {
		r.cache.Invalidate(fmt.Sprintf("dosen:summary:%s", dosenID))
	}
	return nil
}

// GetSummary mengambil ringkasan statistik untuk dashboard dosen
func (r *Repository) GetSummary(ctx context.Context, dosenID string) (*DosenSummary, error) {
	cacheKey := fmt.Sprintf("dosen:summary:%s", dosenID)
	if r.cache != nil {
		if cached, ok := r.cache.Get(cacheKey); ok {
			return cached.(*DosenSummary), nil
		}
	}

	query := `
		SELECT
			COUNT(DISTINCT m.id) as total_asuhan,
			COALESCE(SUM(CASE WHEN k.status = 'pending' THEN 1 ELSE 0 END), 0) as total_pending,
			COALESCE(SUM(CASE WHEN k.status = 'disetujui' THEN 1 ELSE 0 END), 0) as total_disetujui,
			COALESCE(SUM(CASE WHEN k.status = 'ditolak' THEN 1 ELSE 0 END), 0) as total_ditolak
		FROM mahasiswa m
		LEFT JOIN krs k ON k.mahasiswa_id = m.id
		WHERE m.dosen_wali_id = $1
	`
	var s DosenSummary
	err := r.db.QueryRow(ctx, query, dosenID).Scan(
		&s.TotalAsuhan, &s.TotalPending, &s.TotalDisetujui, &s.TotalDitolak,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get summary: %w", err)
	}

	if r.cache != nil {
		r.cache.Set(cacheKey, &s, cache.TTLMedium)
	}
	return &s, nil
}
// GetUnassignedByDept mengambil mahasiswa yang belum punya dosen wali di departemen tertentu
func (r *Repository) GetUnassignedByDept(ctx context.Context, dept string) ([]string, error) {
	query := `SELECT id FROM mahasiswa WHERE dosen_wali_id IS NULL AND program_studi = $1`
	rows, err := r.db.Query(ctx, query, dept)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

// GetLecturerWithMinStudents mencari dosen di departemen X yang punya mahasiswa bimbingan paling sedikit
func (r *Repository) GetLecturerWithMinStudents(ctx context.Context, dept string) (string, error) {
	query := `
		SELECT d.id
		FROM dosen d
		LEFT JOIN mahasiswa m ON m.dosen_wali_id = d.id
		WHERE d.departemen = $1
		GROUP BY d.id
		ORDER BY COUNT(m.id) ASC
		LIMIT 1
	`
	var id string
	err := r.db.QueryRow(ctx, query, dept).Scan(&id)
	if err != nil {
		return "", err
	}
	return id, nil
}

// BatchAutoAssignByDept menugaskan dosen wali ke semua mahasiswa tanpa wali
// di departemen tertentu dalam SATU query SQL (menghindari N+1 problem).
//
// Cara kerja:
//   1. CTE 'unassigned': ambil semua mahasiswa tanpa wali di dept, beri nomor urut (ROW_NUMBER)
//   2. CTE 'available_dosen': ambil semua dosen di dept, beri nomor urut
//   3. UPDATE: assign mahasiswa ke dosen secara round-robin menggunakan modulo
//      Contoh: 10 mahasiswa, 3 dosen → dosen1 dapat 4, dosen2 dapat 3, dosen3 dapat 3
//
// Mengembalikan jumlah mahasiswa yang berhasil di-assign.
func (r *Repository) BatchAutoAssignByDept(ctx context.Context, dept string) (int64, error) {
	query := `
		WITH unassigned AS (
			SELECT id, ROW_NUMBER() OVER (ORDER BY angkatan, nama_lengkap) AS rn
			FROM mahasiswa
			WHERE dosen_wali_id IS NULL AND program_studi = $1
		),
		available_dosen AS (
			SELECT d.id, ROW_NUMBER() OVER (ORDER BY COUNT(m.id) ASC, d.id) AS rn
			FROM dosen d
			LEFT JOIN mahasiswa m ON m.dosen_wali_id = d.id
			WHERE d.departemen = $1
			GROUP BY d.id
		),
		dosen_count AS (
			SELECT COUNT(*) AS cnt FROM available_dosen
		)
		UPDATE mahasiswa
		SET dosen_wali_id = (
			SELECT ad.id FROM available_dosen ad, dosen_count dc
			WHERE ad.rn = ((u.rn - 1) % dc.cnt) + 1
		),
		updated_at = NOW()
		FROM unassigned u
		WHERE mahasiswa.id = u.id
	`
	cmd, err := r.db.Exec(ctx, query, dept)
	if err != nil {
		return 0, fmt.Errorf("batch auto-assign failed: %w", err)
	}
	return cmd.RowsAffected(), nil
}
