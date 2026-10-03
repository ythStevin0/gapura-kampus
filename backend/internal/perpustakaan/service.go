package perpustakaan

import (
	"context"
	"siakad/backend/internal/model"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetAllBuku(ctx context.Context) ([]model.Buku, error) {
	return s.repo.GetAllBuku(ctx)
}

func (s *Service) CreateBuku(ctx context.Context, b *model.Buku) error {
	return s.repo.CreateBuku(ctx, b)
}

func (s *Service) GetBukuByID(ctx context.Context, id string) (*model.Buku, error) {
	return s.repo.GetBukuByID(ctx, id)
}

func (s *Service) PinjamBuku(ctx context.Context, p *model.PeminjamanBuku) error {
	return s.repo.CreatePeminjaman(ctx, p)
}

func (s *Service) GetPeminjamanSaya(ctx context.Context, userID string) ([]model.PeminjamanBuku, error) {
	return s.repo.GetPeminjamanByUser(ctx, userID)
}

func (s *Service) KembalikanBuku(ctx context.Context, peminjamanID string) error {
	return s.repo.KembalikanBuku(ctx, peminjamanID)
}
