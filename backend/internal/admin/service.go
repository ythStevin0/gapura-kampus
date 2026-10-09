package admin

import (
	"context"
	"fmt"
	"regexp"

	"siakad/backend/internal/model"
	"siakad/backend/pkg/pagination"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func validateKodeMK(kode string) error {
	matched, _ := regexp.MatchString(`^[A-Z0-9-]{3,15}$`, kode)
	if !matched {
		return fmt.Errorf("Kode MK tidak valid (harus 3-15 karakter alfanumerik kapital)")
	}
	return nil
}

func (s *Service) GetStats(ctx context.Context) (map[string]int64, error) {
	return s.repo.GetStats(ctx)
}

func (s *Service) SearchUsers(ctx context.Context, q string) ([]SearchResult, error) {
	return s.repo.SearchUsers(ctx, q)
}

func (s *Service) CreateMataKuliah(ctx context.Context, mk *model.MataKuliah) error {
	if err := validateKodeMK(mk.KodeMK); err != nil {
		return err
	}
	if mk.NamaMK == "" {
		return fmt.Errorf("nama mata kuliah tidak boleh kosong")
	}
	if mk.SKS < 1 || mk.SKS > 6 {
		return fmt.Errorf("SKS harus berada di rentang 1-6")
	}
	return s.repo.CreateMataKuliah(ctx, mk)
}

// GetAllMataKuliah mengambil semua data (untuk dropdown/select).
func (s *Service) GetAllMataKuliah(ctx context.Context) ([]model.MataKuliah, error) {
	return s.repo.GetAllMataKuliah(ctx)
}

// GetMataKuliahPaginated mengambil data dengan pagination, prodi, dan search (untuk tabel admin).
func (s *Service) GetMataKuliahPaginated(ctx context.Context, params pagination.Params, prodi, search string) ([]model.MataKuliah, int64, error) {
	return s.repo.GetMataKuliahPaginated(ctx, params, prodi, search)
}

func (s *Service) UpdateMataKuliah(ctx context.Context, id string, mk *model.MataKuliah) error {
	if err := validateKodeMK(mk.KodeMK); err != nil {
		return err
	}
	if mk.NamaMK == "" {
		return fmt.Errorf("nama mata kuliah tidak boleh kosong")
	}
	if mk.SKS < 1 || mk.SKS > 6 {
		return fmt.Errorf("SKS harus berada di rentang 1-6")
	}
	return s.repo.UpdateMataKuliah(ctx, id, mk)
}

func (s *Service) DeleteMataKuliah(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("id mata kuliah tidak valid")
	}
	return s.repo.DeleteMataKuliah(ctx, id)
}
