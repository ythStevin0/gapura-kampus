package kelas

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

func (s *Service) GetAll(ctx context.Context) ([]model.Kelas, error) {
	return s.repo.GetAll(ctx)
}

func (s *Service) Create(ctx context.Context, k *model.Kelas) error {
	return s.repo.Create(ctx, k)
}

func (s *Service) Update(ctx context.Context, k *model.Kelas) error {
	return s.repo.Update(ctx, k)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
