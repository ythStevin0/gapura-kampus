package akademik

import (
	"context"
	"fmt"
	"math"

	"siakad/backend/internal/model"
	"siakad/backend/pkg/database"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// GetAvailableKelas mengambil semua kelas yang tersedia untuk prodi tertentu di semester tertentu
func (r *Repository) GetAvailableKelas(ctx context.Context, prodi string, semesterAkademik string) ([]model.Kelas, error) {
	query := `
		SELECT 
			k.id, k.mata_kuliah_id, k.dosen_id, k.kode_kelas, k.hari, k.jam_mulai, k.jam_selesai, 
			k.ruangan, k.kapasitas, k.semester_akademik, k.created_at, k.updated_at,
			mk.nama_mk, d.nama_lengkap as nama_dosen, mk.sks,
			(SELECT COUNT(*) FROM krs kr WHERE kr.kelas_id = k.id AND kr.status != 'ditolak') as terisi
		FROM kelas k
		JOIN mata_kuliah mk ON mk.id = k.mata_kuliah_id
		JOIN dosen d ON d.id = k.dosen_id
		WHERE (mk.program_studi = $1 OR mk.program_studi = 'Umum')
		AND k.semester_akademik = $2
		ORDER BY mk.semester ASC, mk.nama_mk ASC, k.kode_kelas ASC
	`
	rows, err := r.db.Query(ctx, query, prodi, semesterAkademik)
	if err != nil {
		return nil, fmt.Errorf("failed to query available kelas: %w", err)
	}
	defer rows.Close()

	var list []model.Kelas
	for rows.Next() {
		var k model.Kelas
		err := rows.Scan(
			&k.ID, &k.MataKuliahID, &k.DosenID, &k.KodeKelas, &k.Hari, &k.JamMulai, &k.JamSelesai,
			&k.Ruangan, &k.Kapasitas, &k.SemesterAkademik, &k.CreatedAt, &k.UpdatedAt,
			&k.NamaMataKuliah, &k.NamaDosen, &k.SKS, &k.Terisi,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan kelas: %w", err)
		}
		list = append(list, k)
	}
	return list, nil
}

// GetKRSMahasiswa mengambil daftar KRS yang sudah diambil oleh mahasiswa
func (r *Repository) GetKRSMahasiswa(ctx context.Context, mahasiswaID string, semesterAkademik string) ([]model.KRS, error) {
	query := `
		SELECT 
			kr.id, kr.mahasiswa_id, kr.kelas_id, kr.semester_akademik, kr.status, kr.catatan,
			kr.nilai_tugas, kr.nilai_uts, kr.nilai_uas, kr.nilai_akhir, kr.nilai_huruf, kr.bobot, kr.status_nilai,
			kr.created_at, kr.updated_at,
			mk.kode_mk, mk.nama_mk, k.kode_kelas, mk.sks, k.hari, k.jam_mulai, k.jam_selesai, d.nama_lengkap as nama_dosen
		FROM krs kr
		JOIN kelas k ON k.id = kr.kelas_id
		JOIN mata_kuliah mk ON mk.id = k.mata_kuliah_id
		JOIN dosen d ON d.id = k.dosen_id
		WHERE kr.mahasiswa_id = $1 AND kr.semester_akademik = $2
		ORDER BY k.hari ASC, k.jam_mulai ASC
	`
	rows, err := r.db.Query(ctx, query, mahasiswaID, semesterAkademik)
	if err != nil {
		return nil, fmt.Errorf("failed to query krs: %w", err)
	}
	defer rows.Close()

	var list []model.KRS
	for rows.Next() {
		var kr model.KRS
		err := rows.Scan(
			&kr.ID, &kr.MahasiswaID, &kr.KelasID, &kr.SemesterAkademik, &kr.Status, &kr.Catatan,
			&kr.NilaiTugas, &kr.NilaiUTS, &kr.NilaiUAS, &kr.NilaiAkhir, &kr.NilaiHuruf, &kr.Bobot, &kr.StatusNilai,
			&kr.CreatedAt, &kr.UpdatedAt,
			&kr.KodeMK, &kr.NamaMataKuliah, &kr.KodeKelas, &kr.SKS, &kr.Hari, &kr.JamMulai, &kr.JamSelesai, &kr.NamaDosen,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan krs: %w", err)
		}
		list = append(list, kr)
	}
	return list, nil
}

// ProfilKRS adalah data lengkap profil mahasiswa untuk halaman KRS
type ProfilKRS struct {
	NIM               string  `json:"nim"`
	NamaLengkap       string  `json:"nama_lengkap"`
	ProgramStudi      string  `json:"program_studi"`
	Angkatan          int     `json:"angkatan"`
	SemesterSekarang  int     `json:"semester_sekarang"`
	SemesterAkademik  string  `json:"semester_akademik"`
	IPSSemesterLalu   float64 `json:"ips_semester_lalu"`
	TotalSKSKumulatif int     `json:"total_sks_kumulatif"`
	TotalSKSLulus     int     `json:"total_sks_lulus"`
	IPK               float64 `json:"ipk"`
	NamaDosenWali     string  `json:"nama_dosen_wali"`
	MaxSKS            int     `json:"max_sks"`
	StatusUKT         bool    `json:"status_ukt"`
	StatusBIP         bool    `json:"status_bip"`
	IzinKRS           bool    `json:"izin_krs"`
}

// GetProfilKRS mengambil data profil mahasiswa lengkap untuk form KRS
func (r *Repository) GetProfilKRS(ctx context.Context, mahasiswaID string) (*ProfilKRS, error) {
	query := `
		SELECT 
			m.nim, m.nama_lengkap, m.program_studi, m.angkatan,
			m.status_ukt, m.status_bip, m.izin_krs,
			COALESCE(
				CONCAT(
					COALESCE(d.gelar_depan || ' ', ''),
					d.nama_lengkap,
					COALESCE(' ' || d.gelar_belakang, '')
				), 
				'Belum ditugaskan'
			) as nama_dosen_wali
		FROM mahasiswa m
		LEFT JOIN dosen d ON d.id = m.dosen_wali_id
		WHERE m.id = $1
	`
	var p ProfilKRS
	err := r.db.QueryRow(ctx, query, mahasiswaID).Scan(
		&p.NIM, &p.NamaLengkap, &p.ProgramStudi, &p.Angkatan,
		&p.StatusUKT, &p.StatusBIP, &p.IzinKRS,
		&p.NamaDosenWali,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get profil krs: %w", err)
	}

	// Hitung akumulasi SKS dan IPK nyata dari database
	statsQuery := `
		SELECT 
			COALESCE(SUM(mk.sks), 0) as total_sks,
			COALESCE(SUM(CASE WHEN kr.bobot >= 2.0 THEN mk.sks ELSE 0 END), 0) as total_lulus,
			COALESCE(SUM(mk.sks * kr.bobot) / NULLIF(SUM(mk.sks), 0), 0.0) as ipk
		FROM krs kr
		JOIN kelas k ON k.id = kr.kelas_id
		JOIN mata_kuliah mk ON mk.id = k.mata_kuliah_id
		WHERE kr.mahasiswa_id = $1
		  AND kr.status = 'disetujui'
		  AND kr.status_nilai = 'published'
		  AND kr.bobot IS NOT NULL
	`
	_ = r.db.QueryRow(ctx, statsQuery, mahasiswaID).Scan(&p.TotalSKSKumulatif, &p.TotalSKSLulus, &p.IPK)
	p.IPK = math.Round(p.IPK*100) / 100

	return &p, nil
}

// GetIPSSemesterLalu menghitung IPS riil dari semester akademik sebelumnya
func (r *Repository) GetIPSSemesterLalu(ctx context.Context, mahasiswaID string, semesterSebelumnya string) float64 {
	if semesterSebelumnya == "" {
		return 0
	}

	query := `
		SELECT 
			COALESCE(SUM(mk.sks * kr.bobot) / NULLIF(SUM(mk.sks), 0), 0.0)
		FROM krs kr
		JOIN kelas k ON k.id = kr.kelas_id
		JOIN mata_kuliah mk ON mk.id = k.mata_kuliah_id
		WHERE kr.mahasiswa_id = $1 
		  AND kr.semester_akademik = $2
		  AND kr.status = 'disetujui'
		  AND kr.status_nilai = 'published'
		  AND kr.bobot IS NOT NULL
	`
	var ips float64
	err := r.db.QueryRow(ctx, query, mahasiswaID, semesterSebelumnya).Scan(&ips)
	if err != nil {
		return 0
	}
	return math.Round(ips*100) / 100
}

// GetKHSMahasiswa mengambil Kartu Hasil Studi per semester beserta kalkulasi IPS & IPK
func (r *Repository) GetKHSMahasiswa(ctx context.Context, mahasiswaID string, semesterAkademik string) (*model.KHSResponse, error) {
	// 1. Ambil data mahasiswa
	var mhs model.Mahasiswa
	err := r.db.QueryRow(ctx, `SELECT nim, nama_lengkap, program_studi, angkatan FROM mahasiswa WHERE id = $1`, mahasiswaID).
		Scan(&mhs.NIM, &mhs.NamaLengkap, &mhs.ProgramStudi, &mhs.Angkatan)
	if err != nil {
		return nil, fmt.Errorf("mahasiswa tidak ditemukan: %w", err)
	}

	// 2. Ambil daftar mata kuliah yang diambil di semester tersebut
	query := `
		SELECT 
			kr.id, mk.kode_mk, mk.nama_mk, k.kode_kelas, mk.sks,
			kr.nilai_tugas, kr.nilai_uts, kr.nilai_uas, kr.nilai_akhir,
			COALESCE(kr.nilai_huruf, '-') as nilai_huruf,
			COALESCE(kr.bobot, 0) as bobot,
			kr.status_nilai
		FROM krs kr
		JOIN kelas k ON k.id = kr.kelas_id
		JOIN mata_kuliah mk ON mk.id = k.mata_kuliah_id
		WHERE kr.mahasiswa_id = $1 AND kr.semester_akademik = $2 AND kr.status = 'disetujui'
		ORDER BY mk.kode_mk ASC
	`
	rows, err := r.db.Query(ctx, query, mahasiswaID, semesterAkademik)
	if err != nil {
		return nil, fmt.Errorf("failed to query khs: %w", err)
	}
	defer rows.Close()

	var items []model.KHSItem
	var totalSKSSemester int
	var totalBobotSemester float64

	for rows.Next() {
		var item model.KHSItem
		if err := rows.Scan(
			&item.KRSID, &item.KodeMK, &item.NamaMK, &item.KodeKelas, &item.SKS,
			&item.NilaiTugas, &item.NilaiUTS, &item.NilaiUAS, &item.NilaiAkhir,
			&item.NilaiHuruf, &item.Bobot, &item.StatusNilai,
		); err != nil {
			return nil, err
		}

		// Jika status nilai belum published, sembunyikan nilai detail dari mahasiswa
		if item.StatusNilai != "published" {
			item.NilaiHuruf = "-"
			item.Bobot = 0
			item.NilaiTugas = nil
			item.NilaiUTS = nil
			item.NilaiUAS = nil
			item.NilaiAkhir = nil
		}

		item.TotalSKSBobot = float64(item.SKS) * item.Bobot
		totalSKSSemester += item.SKS
		totalBobotSemester += item.TotalSKSBobot

		items = append(items, item)
	}

	var ips float64
	if totalSKSSemester > 0 {
		ips = math.Round((totalBobotSemester/float64(totalSKSSemester))*100) / 100
	}

	// 3. Ambil total kumulatif s/d sekarang
	var totalSKSKumulatif int
	var ipk float64
	cumQuery := `
		SELECT 
			COALESCE(SUM(mk.sks), 0) as total_sks,
			COALESCE(SUM(mk.sks * kr.bobot) / NULLIF(SUM(mk.sks), 0), 0.0) as ipk
		FROM krs kr
		JOIN kelas k ON k.id = kr.kelas_id
		JOIN mata_kuliah mk ON mk.id = k.mata_kuliah_id
		WHERE kr.mahasiswa_id = $1 
		  AND kr.status = 'disetujui'
		  AND kr.status_nilai = 'published'
		  AND kr.bobot IS NOT NULL
	`
	_ = r.db.QueryRow(ctx, cumQuery, mahasiswaID).Scan(&totalSKSKumulatif, &ipk)
	ipk = math.Round(ipk*100) / 100

	// 4. Hitung batas SKS semester depan
	maxSKSDepan := 24
	switch {
	case ips < 2.0:
		maxSKSDepan = 18
	case ips < 2.5:
		maxSKSDepan = 20
	case ips < 3.0:
		maxSKSDepan = 22
	default:
		maxSKSDepan = 24
	}

	return &model.KHSResponse{
		NIM:                 mhs.NIM,
		NamaLengkap:         mhs.NamaLengkap,
		ProgramStudi:        mhs.ProgramStudi,
		SemesterAkademik:    semesterAkademik,
		Items:               items,
		TotalSKSSemester:    totalSKSSemester,
		TotalBobotSemester:  totalBobotSemester,
		IPS:                 ips,
		TotalSKSKumulatif:   totalSKSKumulatif,
		IPK:                 ipk,
		MaxSKSDepan:         maxSKSDepan,
	}, nil
}

// GetTranskripMahasiswa mengambil seluruh daftar mata kuliah yang pernah diambil mahasiswa
func (r *Repository) GetTranskripMahasiswa(ctx context.Context, mahasiswaID string) (*model.TranskripResponse, error) {
	var mhs model.Mahasiswa
	err := r.db.QueryRow(ctx, `SELECT nim, nama_lengkap, program_studi FROM mahasiswa WHERE id = $1`, mahasiswaID).
		Scan(&mhs.NIM, &mhs.NamaLengkap, &mhs.ProgramStudi)
	if err != nil {
		return nil, fmt.Errorf("mahasiswa tidak ditemukan: %w", err)
	}

	query := `
		SELECT 
			mk.kode_mk, mk.nama_mk, mk.sks,
			COALESCE(kr.nilai_huruf, '-') as nilai_huruf,
			COALESCE(kr.bobot, 0) as bobot,
			kr.semester_akademik,
			(COALESCE(kr.bobot, 0) >= 2.0) as lulus
		FROM krs kr
		JOIN kelas k ON k.id = kr.kelas_id
		JOIN mata_kuliah mk ON mk.id = k.mata_kuliah_id
		WHERE kr.mahasiswa_id = $1 
		  AND kr.status = 'disetujui'
		  AND kr.status_nilai = 'published'
		ORDER BY kr.semester_akademik ASC, mk.kode_mk ASC
	`
	rows, err := r.db.Query(ctx, query, mahasiswaID)
	if err != nil {
		return nil, fmt.Errorf("failed to query transcript: %w", err)
	}
	defer rows.Close()

	semesterMap := make(map[string][]model.TranskripItem)
	var semesterOrder []string

	var totalSKSTempuh int
	var totalSKSLulus int
	var totalBobotKumulatif float64

	for rows.Next() {
		var item model.TranskripItem
		if err := rows.Scan(
			&item.KodeMK, &item.NamaMK, &item.SKS,
			&item.NilaiHuruf, &item.Bobot, &item.SemesterAkademik, &item.Lulus,
		); err != nil {
			return nil, err
		}

		item.TotalBobot = float64(item.SKS) * item.Bobot
		totalSKSTempuh += item.SKS
		if item.Lulus {
			totalSKSLulus += item.SKS
		}
		totalBobotKumulatif += item.TotalBobot

		if _, exists := semesterMap[item.SemesterAkademik]; !exists {
			semesterOrder = append(semesterOrder, item.SemesterAkademik)
		}
		semesterMap[item.SemesterAkademik] = append(semesterMap[item.SemesterAkademik], item)
	}

	var semesters []model.TranskripSemester
	for _, sem := range semesterOrder {
		items := semesterMap[sem]
		var semSKS int
		var semBobot float64
		for _, it := range items {
			semSKS += it.SKS
			semBobot += it.TotalBobot
		}
		var semIPS float64
		if semSKS > 0 {
			semIPS = math.Round((semBobot/float64(semSKS))*100) / 100
		}
		semesters = append(semesters, model.TranskripSemester{
			SemesterAkademik: sem,
			Items:            items,
			TotalSKS:         semSKS,
			IPS:              semIPS,
		})
	}

	var ipk float64
	if totalSKSTempuh > 0 {
		ipk = math.Round((totalBobotKumulatif/float64(totalSKSTempuh))*100) / 100
	}

	return &model.TranskripResponse{
		NIM:            mhs.NIM,
		NamaLengkap:    mhs.NamaLengkap,
		ProgramStudi:   mhs.ProgramStudi,
		Semesters:      semesters,
		TotalSKSTempuh: totalSKSTempuh,
		TotalSKSLulus:  totalSKSLulus,
		TotalBobot:     totalBobotKumulatif,
		IPK:            ipk,
	}, nil
}

// GetSemestersMahasiswa mengambil daftar semester akademik yang pernah diambil mahasiswa
func (r *Repository) GetSemestersMahasiswa(ctx context.Context, mahasiswaID string) ([]string, error) {
	query := `
		SELECT DISTINCT semester_akademik
		FROM krs
		WHERE mahasiswa_id = $1 AND status != 'ditolak'
		ORDER BY semester_akademik DESC
	`
	rows, err := r.db.Query(ctx, query, mahasiswaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var semesters []string
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err == nil {
			semesters = append(semesters, s)
		}
	}
	return semesters, nil
}

// GetMahasiswaNilaiByKelas mengambil daftar mahasiswa dalam kelas untuk input nilai dosen
func (r *Repository) GetMahasiswaNilaiByKelas(ctx context.Context, kelasID string) ([]model.MahasiswaNilaiKelasItem, error) {
	query := `
		SELECT 
			kr.id, m.id as mahasiswa_id, m.nim, m.nama_lengkap,
			kr.nilai_tugas, kr.nilai_uts, kr.nilai_uas, kr.nilai_akhir,
			kr.nilai_huruf, kr.bobot, kr.status_nilai
		FROM krs kr
		JOIN mahasiswa m ON m.id = kr.mahasiswa_id
		WHERE kr.kelas_id = $1 AND kr.status = 'disetujui'
		ORDER BY m.nim ASC
	`
	rows, err := r.db.Query(ctx, query, kelasID)
	if err != nil {
		return nil, fmt.Errorf("failed to query mahasiswa nilai: %w", err)
	}
	defer rows.Close()

	var list []model.MahasiswaNilaiKelasItem
	for rows.Next() {
		var it model.MahasiswaNilaiKelasItem
		if err := rows.Scan(
			&it.KRSID, &it.MahasiswaID, &it.NIM, &it.NamaLengkap,
			&it.NilaiTugas, &it.NilaiUTS, &it.NilaiUAS, &it.NilaiAkhir,
			&it.NilaiHuruf, &it.Bobot, &it.StatusNilai,
		); err != nil {
			return nil, err
		}
		list = append(list, it)
	}
	return list, nil
}

// UpdateNilaiKRS mengupdate nilai satu mahasiswa di kelas
func (r *Repository) UpdateNilaiKRS(ctx context.Context, krsID string, tugas, uts, uas, akhir float64, huruf string, bobot float64, statusNilai string) error {
	query := `
		UPDATE krs
		SET 
			nilai_tugas = $1,
			nilai_uts = $2,
			nilai_uas = $3,
			nilai_akhir = $4,
			nilai_huruf = $5,
			bobot = $6,
			status_nilai = $7,
			updated_at = NOW()
		WHERE id = $8
	`
	_, err := r.db.Exec(ctx, query, tugas, uts, uas, akhir, huruf, bobot, statusNilai, krsID)
	return err
}

// GetAutoDosenWali mencari dosen wali dari departemen yang sama jika mahasiswa belum punya dosen wali
func (r *Repository) GetAutoDosenWali(ctx context.Context, mahasiswaID string, programStudi string) error {
	var existing *string
	err := r.db.QueryRow(ctx, `SELECT dosen_wali_id::text FROM mahasiswa WHERE id = $1`, mahasiswaID).Scan(&existing)
	if err != nil || (existing != nil && *existing != "") {
		return nil
	}

	query := `
		SELECT d.id
		FROM dosen d
		LEFT JOIN mahasiswa m ON m.dosen_wali_id = d.id
		WHERE d.departemen ILIKE '%' || split_part($1, ' ', array_length(string_to_array($1,' '), 1)) || '%'
		   OR d.departemen ILIKE '%Informatika%'
		GROUP BY d.id
		ORDER BY COUNT(m.id) ASC
		LIMIT 1
	`
	var dosenID string
	err = r.db.QueryRow(ctx, query, programStudi).Scan(&dosenID)
	if err != nil {
		return nil
	}

	_, err = r.db.Exec(ctx, `UPDATE mahasiswa SET dosen_wali_id = $1, updated_at = NOW() WHERE id = $2`, dosenID, mahasiswaID)
	return err
}

// AddKRS menambahkan mata kuliah ke rencana studi mahasiswa
func (r *Repository) AddKRS(ctx context.Context, krs *model.KRS) error {
	query := `
		INSERT INTO krs (mahasiswa_id, kelas_id, semester_akademik, status)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at
	`
	err := r.db.QueryRow(ctx, query, krs.MahasiswaID, krs.KelasID, krs.SemesterAkademik, krs.Status).
		Scan(&krs.ID, &krs.CreatedAt, &krs.UpdatedAt)
	if err != nil {
		return database.ParsePgError(err)
	}
	return nil
}

// DeleteKRS menghapus mata kuliah dari rencana studi (Drop)
func (r *Repository) DeleteKRS(ctx context.Context, id string, mahasiswaID string) error {
	query := `DELETE FROM krs WHERE id = $1 AND mahasiswa_id = $2 AND status = 'pending'`
	cmd, err := r.db.Exec(ctx, query, id, mahasiswaID)
	if err != nil {
		return fmt.Errorf("failed to delete krs: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("krs not found or already approved")
	}
	return nil
}

// CheckScheduleConflict mengecek apakah ada jadwal yang bentrok
func (r *Repository) CheckScheduleConflict(ctx context.Context, mahasiswaID string, kelasID string, semesterAkademik string) (bool, error) {
	var newHari string
	var newMulai, newSelesai string
	err := r.db.QueryRow(ctx, "SELECT hari, jam_mulai, jam_selesai FROM kelas WHERE id = $1", kelasID).
		Scan(&newHari, &newMulai, &newSelesai)
	if err != nil {
		return false, fmt.Errorf("failed to get class details: %w", err)
	}

	query := `
		SELECT EXISTS (
			SELECT 1 FROM krs kr
			JOIN kelas k ON k.id = kr.kelas_id
			WHERE kr.mahasiswa_id = $1 
			AND kr.semester_akademik = $2
			AND k.hari = $3
			AND (
				(k.jam_mulai, k.jam_selesai) OVERLAPS ($4::TIME, $5::TIME)
			)
			AND kr.status != 'ditolak'
		)
	`
	var conflict bool
	err = r.db.QueryRow(ctx, query, mahasiswaID, semesterAkademik, newHari, newMulai, newSelesai).Scan(&conflict)
	if err != nil {
		return false, fmt.Errorf("failed to check schedule conflict: %w", err)
	}

	return conflict, nil
}

// CheckCapacity mengecek apakah kelas masih memiliki sisa kuota
func (r *Repository) CheckCapacity(ctx context.Context, kelasID string) (bool, error) {
	query := `
		SELECT 
			(SELECT COUNT(*) FROM krs WHERE kelas_id = $1 AND status != 'ditolak') < kapasitas
		FROM kelas WHERE id = $1
	`
	var hasCapacity bool
	err := r.db.QueryRow(ctx, query, kelasID).Scan(&hasCapacity)
	if err != nil {
		return false, fmt.Errorf("failed to check capacity: %w", err)
	}
	return hasCapacity, nil
}
