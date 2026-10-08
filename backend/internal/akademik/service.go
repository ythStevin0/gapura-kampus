package akademik

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"siakad/backend/internal/mahasiswa"
	"siakad/backend/internal/model"

	"github.com/google/uuid"
	"golang.org/x/sync/errgroup"
)

var (
	ErrPaidRequired     = errors.New("anda harus melunasi UKT/BIP atau mendapatkan izin dosen wali untuk mengisi KRS")
	ErrScheduleConflict = errors.New("jadwal kuliah bentrok dengan mata kuliah lain yang sudah diambil")
	ErrClassFull        = errors.New("kuota kelas sudah penuh")
	ErrMaxSKS           = errors.New("anda telah mencapai batas maksimal SKS")
)

type Service struct {
	repo          *Repository
	mahasiswaRepo *mahasiswa.Repository
}

func NewService(repo *Repository, mahasiswaRepo *mahasiswa.Repository) *Service {
	return &Service{
		repo:          repo,
		mahasiswaRepo: mahasiswaRepo,
	}
}

func (s *Service) GetAvailableKelas(ctx context.Context, userID uuid.UUID, semesterAkademik string) ([]model.Kelas, error) {
	// Ambil data mahasiswa untuk tahu prodinya
	mhs, err := s.mahasiswaRepo.GetByUserID(ctx, userID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to get student info: %w", err)
	}

	return s.repo.GetAvailableKelas(ctx, mhs.ProgramStudi, semesterAkademik)
}

func (s *Service) GetKRS(ctx context.Context, userID uuid.UUID, semesterAkademik string) ([]model.KRS, error) {
	mhs, err := s.mahasiswaRepo.GetByUserID(ctx, userID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to get student info: %w", err)
	}

	return s.repo.GetKRSMahasiswa(ctx, mhs.ID.String(), semesterAkademik)
}

func (s *Service) EnrollKelas(ctx context.Context, userID uuid.UUID, kelasID string, semesterAkademik string) error {
	// 1. Ambil data mahasiswa
	mhs, err := s.mahasiswaRepo.GetByUserID(ctx, userID.String())
	if err != nil {
		return fmt.Errorf("failed to get student info: %w", err)
	}

	// 2. Cek syarat pembayaran (UKT lunas ATAU BIP lunas ATAU Izin KRS true)
	// Kebijakan: Mahasiswa harus bayar UKT DAN BIP. Jika belum, harus ada IzinKRS dari dosen wali.
	if !mhs.IzinKRS && (!mhs.StatusUKT || !mhs.StatusBIP) {
		return ErrPaidRequired
	}

	// 3. Cek kapasitas kelas
	hasCapacity, err := s.repo.CheckCapacity(ctx, kelasID)
	if err != nil {
		return err
	}
	if !hasCapacity {
		return ErrClassFull
	}

	// 4. Cek konflik jadwal
	hasConflict, err := s.repo.CheckScheduleConflict(ctx, mhs.ID.String(), kelasID, semesterAkademik)
	if err != nil {
		return err
	}
	if hasConflict {
		return ErrScheduleConflict
	}

	// 5. Hitung semester & max SKS secara dinamis
	semesterSekarang, _, semesterSebelumnya := hitungSemester(mhs.Angkatan)
	ips := s.repo.GetIPSSemesterLalu(ctx, mhs.ID.String(), semesterSebelumnya)
	maxSKS := hitungMaxSKS(semesterSekarang, ips, mhs.IzinKRS)

	currentKRS, err := s.repo.GetKRSMahasiswa(ctx, mhs.ID.String(), semesterAkademik)
	if err != nil {
		return err
	}
	
	totalSKS := 0
	for _, k := range currentKRS {
		totalSKS += k.SKS
	}

	// Ambil SKS kelas yang baru akan ditambahkan
	var newSKS int
	err = s.repo.db.QueryRow(ctx, `
		SELECT mk.sks FROM kelas k 
		JOIN mata_kuliah mk ON mk.id = k.mata_kuliah_id 
		WHERE k.id = $1`, kelasID).Scan(&newSKS)
	if err != nil {
		return fmt.Errorf("failed to get class SKS: %w", err)
	}

	if totalSKS+newSKS > maxSKS {
		return fmt.Errorf("batas SKS Anda adalah %d SKS. Anda tidak bisa mengambil mata kuliah ini", maxSKS)
	}

	// 6. Simpan ke database
	status := model.KRSStatusPending
	// Aturan: Semester 1 (Mahasiswa Baru) otomatis DISETUJUI
	if semesterSekarang <= 1 {
		status = model.KRSStatusDisetujui
	}

	newKRS := &model.KRS{
		MahasiswaID:      mhs.ID,
		KelasID:          uuid.MustParse(kelasID),
		SemesterAkademik: semesterAkademik,
		Status:           status,
	}

	return s.repo.AddKRS(ctx, newKRS)
}

func (s *Service) DropKelas(ctx context.Context, userID uuid.UUID, krsID string) error {
	mhs, err := s.mahasiswaRepo.GetByUserID(ctx, userID.String())
	if err != nil {
		return fmt.Errorf("failed to get student info: %w", err)
	}

	return s.repo.DeleteKRS(ctx, krsID, mhs.ID.String())
}

// GetProfilKRS mengambil profil lengkap mahasiswa untuk form KRS
func (s *Service) GetProfilKRS(ctx context.Context, userID uuid.UUID) (*ProfilKRS, error) {
	mhs, err := s.mahasiswaRepo.GetByUserID(ctx, userID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to get student info: %w", err)
	}

	// Auto-assign dosen wali berdasarkan prodi jika belum punya
	if mhs.DosenWaliID == nil {
		_ = s.repo.GetAutoDosenWali(ctx, mhs.ID.String(), mhs.ProgramStudi)
	}

	// Hitung semester sekarang berdasarkan angkatan
	semesterSekarang, semesterAkademik, semesterSebelumnya := hitungSemester(mhs.Angkatan)

	// Eksekusi bersamaan (Concurrent Execution):
	// Mengambil Profil Dasar dan IPS Semester Lalu secara paralel untuk memangkas waktu tunggu I/O
	g, gCtx := errgroup.WithContext(ctx)

	var profil *ProfilKRS
	var ips float64

	g.Go(func() error {
		var errP error
		profil, errP = s.repo.GetProfilKRS(gCtx, mhs.ID.String())
		return errP
	})

	g.Go(func() error {
		ips = s.repo.GetIPSSemesterLalu(gCtx, mhs.ID.String(), semesterSebelumnya)
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	profil.SemesterSekarang = semesterSekarang
	profil.SemesterAkademik = semesterAkademik
	profil.IPSSemesterLalu = ips
	profil.MaxSKS = hitungMaxSKS(semesterSekarang, profil.IPSSemesterLalu, mhs.IzinKRS)

	return profil, nil
}

// hitungSemester menghitung semester saat ini dari angkatan mahasiswa
// Mengembalikan: nomor semester, string semester akademik, semester akademik sebelumnya
func hitungSemester(angkatan int) (int, string, string) {
	now := time.Now()
	tahunSekarang := now.Year()
	bulanSekarang := now.Month()

	// Ganjil: Agustus-Januari (bulan 8-12 dan 1)
	// Genap: Februari-Juli (bulan 2-7)
	isGenap := bulanSekarang >= 2 && bulanSekarang <= 7

	// Hitung berapa tahun sejak masuk
	tahunAjaran := tahunSekarang
	if !isGenap {
		// Ganjil: tahun ajaran dimulai dari tahun ini
		if bulanSekarang >= 8 {
			tahunAjaran = tahunSekarang
		} else {
			tahunAjaran = tahunSekarang - 1
		}
	} else {
		tahunAjaran = tahunSekarang - 1
	}

	tahunKe := tahunAjaran - angkatan + 1
	if tahunKe < 1 {
		tahunKe = 1
	}

	var semesterSekarang int
	if isGenap {
		semesterSekarang = (tahunKe * 2)
	} else {
		semesterSekarang = (tahunKe * 2) - 1
	}

	// Format string semester akademik
	var semesterAkademik, semesterSebelumnya string
	if isGenap {
		semesterAkademik = fmt.Sprintf("%d/%d Genap", tahunAjaran, tahunAjaran+1)
		semesterSebelumnya = fmt.Sprintf("%d/%d Ganjil", tahunAjaran, tahunAjaran+1)
	} else {
		semesterAkademik = fmt.Sprintf("%d/%d Ganjil", tahunAjaran, tahunAjaran+1)
		if semesterSekarang > 1 {
			semesterSebelumnya = fmt.Sprintf("%d/%d Genap", tahunAjaran-1, tahunAjaran)
		} else {
			semesterSebelumnya = "" // Semester 1, belum ada riwayat
		}
	}

	return semesterSekarang, semesterAkademik, semesterSebelumnya
}

// hitungMaxSKS menentukan batas SKS berdasarkan IPS semester lalu
// Aturan standar: Sem 1 = 20 SKS, IPS<2.0 = 18, IPS 2.0-2.49 = 20, IPS 2.5-2.99 = 22, IPS ≥ 3.0 = 24
func hitungMaxSKS(semesterSekarang int, ipsSemesterLalu float64, izinKRS bool) int {
	// Selalu boleh ambil penuh jika sudah dapat izin dari dosen wali
	if izinKRS {
		return 24
	}

	// Semester 1 (maba): standar 20 SKS, belum ada IPS
	if semesterSekarang <= 1 {
		return 20
	}

	// Bulatkan IPS ke 2 desimal
	ips := math.Round(ipsSemesterLalu*100) / 100

	switch {
	case ips < 2.0:
		return 18
	case ips < 2.5:
		return 20
	case ips < 3.0:
		return 22
	default:
		return 24
	}
}

// HitungNilaiAkhirDanHuruf menghitung nilai akhir terbobot (30% Tugas + 35% UTS + 35% UAS) dan konversi ke huruf & bobot
func HitungNilaiAkhirDanHuruf(tugas, uts, uas float64) (float64, string, float64) {
	akhir := (0.30 * tugas) + (0.35 * uts) + (0.35 * uas)
	akhir = math.Round(akhir*100) / 100

	var huruf string
	var bobot float64

	switch {
	case akhir >= 85:
		huruf = "A"
		bobot = 4.00
	case akhir >= 75:
		huruf = "AB"
		bobot = 3.50
	case akhir >= 65:
		huruf = "B"
		bobot = 3.00
	case akhir >= 60:
		huruf = "BC"
		bobot = 2.50
	case akhir >= 55:
		huruf = "C"
		bobot = 2.00
	case akhir >= 40:
		huruf = "D"
		bobot = 1.00
	default:
		huruf = "E"
		bobot = 0.00
	}

	return akhir, huruf, bobot
}

func (s *Service) GetKHS(ctx context.Context, userID uuid.UUID, semesterAkademik string) (*model.KHSResponse, error) {
	mhs, err := s.mahasiswaRepo.GetByUserID(ctx, userID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to get student info: %w", err)
	}

	if semesterAkademik == "" {
		_, semesterAkademik, _ = hitungSemester(mhs.Angkatan)
	}

	return s.repo.GetKHSMahasiswa(ctx, mhs.ID.String(), semesterAkademik)
}

func (s *Service) GetTranskrip(ctx context.Context, userID uuid.UUID) (*model.TranskripResponse, error) {
	mhs, err := s.mahasiswaRepo.GetByUserID(ctx, userID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to get student info: %w", err)
	}

	return s.repo.GetTranskripMahasiswa(ctx, mhs.ID.String())
}

func (s *Service) GetSemesters(ctx context.Context, userID uuid.UUID) ([]string, error) {
	mhs, err := s.mahasiswaRepo.GetByUserID(ctx, userID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to get student info: %w", err)
	}

	semesters, err := s.repo.GetSemestersMahasiswa(ctx, mhs.ID.String())
	if err != nil {
		return nil, err
	}

	if len(semesters) == 0 {
		_, currentSem, _ := hitungSemester(mhs.Angkatan)
		semesters = append(semesters, currentSem)
	}

	return semesters, nil
}

func (s *Service) GetMahasiswaNilaiByKelas(ctx context.Context, kelasID string) ([]model.MahasiswaNilaiKelasItem, error) {
	return s.repo.GetMahasiswaNilaiByKelas(ctx, kelasID)
}

func (s *Service) InputNilaiKelas(ctx context.Context, req model.InputNilaiRequest) error {
	statusNilai := "draft"
	if req.Publish {
		statusNilai = "published"
	}

	for _, item := range req.Nilai {
		akhir, huruf, bobot := HitungNilaiAkhirDanHuruf(item.NilaiTugas, item.NilaiUTS, item.NilaiUAS)
		err := s.repo.UpdateNilaiKRS(ctx, item.KRSID, item.NilaiTugas, item.NilaiUTS, item.NilaiUAS, akhir, huruf, bobot, statusNilai)
		if err != nil {
			return fmt.Errorf("failed to update grade for krs %s: %w", item.KRSID, err)
		}
	}

	return nil
}

func (s *Service) PublishNilaiKelas(ctx context.Context, kelasID string) error {
	items, err := s.repo.GetMahasiswaNilaiByKelas(ctx, kelasID)
	if err != nil {
		return err
	}

	for _, it := range items {
		tugas := 0.0
		uts := 0.0
		uas := 0.0
		if it.NilaiTugas != nil {
			tugas = *it.NilaiTugas
		}
		if it.NilaiUTS != nil {
			uts = *it.NilaiUTS
		}
		if it.NilaiUAS != nil {
			uas = *it.NilaiUAS
		}
		akhir, huruf, bobot := HitungNilaiAkhirDanHuruf(tugas, uts, uas)
		_ = s.repo.UpdateNilaiKRS(ctx, it.KRSID.String(), tugas, uts, uas, akhir, huruf, bobot, "published")
	}

	return nil
}

