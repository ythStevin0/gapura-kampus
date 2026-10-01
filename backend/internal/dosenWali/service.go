package dosenWali

import (
	"context"
	"errors"
	"fmt"

	"siakad/backend/internal/model"
)

var (
	ErrNotAsuhan = errors.New("mahasiswa ini bukan asuhan Anda")
	ErrKRSEmpty  = errors.New("tidak ada KRS pending untuk disetujui")
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// GetProfilDosen mengambil profil dosen yang sedang login
func (s *Service) GetProfilDosen(ctx context.Context, userID string) (*model.Dosen, error) {
	return s.repo.GetDosenByUserID(ctx, userID)
}

// GetDashboardSummary mengambil ringkasan statistik dosen
func (s *Service) GetDashboardSummary(ctx context.Context, userID string) (*DosenSummary, error) {
	dosen, err := s.repo.GetDosenByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data dosen: %w", err)
	}
	return s.repo.GetSummary(ctx, dosen.ID.String())
}

// GetMahasiswaAsuhan mengambil daftar mahasiswa asuhan beserta info KRS
func (s *Service) GetMahasiswaAsuhan(ctx context.Context, userID string) ([]MahasiswaAsuhan, error) {
	dosen, err := s.repo.GetDosenByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data dosen: %w", err)
	}
	return s.repo.GetMahasiswaAsuhanWithPending(ctx, dosen.ID.String())
}

// GetKRSMahasiswa mengambil detail KRS milik satu mahasiswa asuhan
func (s *Service) GetKRSMahasiswa(ctx context.Context, userID string, mahasiswaID string) ([]model.KRS, error) {
	dosen, err := s.repo.GetDosenByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data dosen: %w", err)
	}

	krs, err := s.repo.GetKRSMahasiswaAsuhan(ctx, mahasiswaID, dosen.ID.String())
	if err != nil {
		return nil, err
	}
	if krs == nil {
		return []model.KRS{}, nil
	}
	return krs, nil
}

// ApproveKRS menyetujui satu item KRS
func (s *Service) ApproveKRS(ctx context.Context, userID string, krsID string) error {
	dosen, err := s.repo.GetDosenByUserID(ctx, userID)
	if err != nil {
		return fmt.Errorf("gagal mengambil data dosen: %w", err)
	}
	return s.repo.ApproveKRS(ctx, krsID, dosen.ID.String())
}

// RejectKRS menolak satu item KRS dengan catatan alasan
func (s *Service) RejectKRS(ctx context.Context, userID string, krsID string, catatan string) error {
	dosen, err := s.repo.GetDosenByUserID(ctx, userID)
	if err != nil {
		return fmt.Errorf("gagal mengambil data dosen: %w", err)
	}
	if catatan == "" {
		catatan = "Ditolak oleh Dosen Wali"
	}
	return s.repo.RejectKRS(ctx, krsID, dosen.ID.String(), catatan)
}

// ApproveAllKRS menyetujui semua KRS pending dari satu mahasiswa asuhan
func (s *Service) ApproveAllKRS(ctx context.Context, userID string, mahasiswaID string) (int64, error) {
	dosen, err := s.repo.GetDosenByUserID(ctx, userID)
	if err != nil {
		return 0, fmt.Errorf("gagal mengambil data dosen: %w", err)
	}
	affected, err := s.repo.ApproveAllKRS(ctx, mahasiswaID, dosen.ID.String())
	if err != nil {
		return 0, err
	}
	if affected == 0 {
		return 0, ErrKRSEmpty
	}
	return affected, nil
}

// AssignDosenWali menugaskan dosen wali ke mahasiswa (dipakai oleh admin handler)
func (s *Service) AssignDosenWali(ctx context.Context, mahasiswaID string, dosenID string) error {
	return s.repo.AssignDosenWali(ctx, mahasiswaID, dosenID)
}

// AutoAssignByDept menugaskan dosen wali ke mahasiswa tanpa wali di departemen tertentu.
// Menggunakan SATU query SQL (batch) untuk menghindari N+1 problem.
//
// Sebelumnya (N+1 Pattern):
//   for _, mhsID := range mhsIDs {
//       dosenID := GetLecturerWithMinStudents()  ← query 1 per mahasiswa
//       AssignDosenWali(mhsID, dosenID)           ← query 2 per mahasiswa
//   }
//   Total: 1 + (2 × N) queries
//
// Sesudah (Batch):
//   BatchAutoAssignByDept()  ← 1 query saja untuk semua mahasiswa
func (s *Service) AutoAssignByDept(ctx context.Context, dept string) (int, error) {
	count, err := s.repo.BatchAutoAssignByDept(ctx, dept)
	if err != nil {
		return 0, fmt.Errorf("gagal auto-assign dosen wali: %w", err)
	}
	return int(count), nil
}
