package berita

import (
	"context"
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

func (r *Repository) GetAll(ctx context.Context) ([]model.Berita, error) {
	const cacheKey = "berita:all"
	if r.cache != nil {
		if cached, ok := r.cache.Get(cacheKey); ok {
			return cached.([]model.Berita), nil
		}
	}

	query := `
		SELECT b.id, b.judul, b.isi, b.kategori, b.thumbnail_url, b.penulis_id, b.created_at, b.updated_at
		FROM berita b
		ORDER BY b.created_at DESC
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.Berita
	for rows.Next() {
		var b model.Berita
		err := rows.Scan(
			&b.ID, &b.Judul, &b.Isi, &b.Kategori, &b.ThumbnailURL, &b.PenulisID, &b.CreatedAt, &b.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, b)
	}

	if r.cache != nil {
		r.cache.Set(cacheKey, list, cache.TTLLong)
	}

	return list, nil
}

func (r *Repository) Create(ctx context.Context, b *model.Berita) error {
	query := `
		INSERT INTO berita (judul, isi, kategori, thumbnail_url, penulis_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`
	err := r.db.QueryRow(ctx, query,
		b.Judul, b.Isi, b.Kategori, b.ThumbnailURL, b.PenulisID,
	).Scan(&b.ID, &b.CreatedAt, &b.UpdatedAt)
	if err != nil {
		return err
	}

	if r.cache != nil {
		r.cache.Invalidate("berita:all")
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM berita WHERE id = $1", id)
	if err != nil {
		return err
	}

	if r.cache != nil {
		r.cache.Invalidate("berita:all")
	}
	return nil
}
