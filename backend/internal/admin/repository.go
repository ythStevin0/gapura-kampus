package admin

import (
	"context"
	"fmt"
	"sync"

	"siakad/backend/internal/model"
	"siakad/backend/pkg/database"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/sync/errgroup"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

type SearchResult struct {
	Tipe        string `json:"tipe"`
	NamaLengkap string `json:"nama_lengkap"`
	Identifier  string `json:"identifier"`
	Email       string `json:"email"`
	Detail      string `json:"detail"`
}

func (r *Repository) GetStats(ctx context.Context) (map[string]int64, error) {
	stats := make(map[string]int64)
	var mu sync.Mutex

	queries := map[string]string{
		"total_mahasiswa": "SELECT COUNT(*) FROM mahasiswa",
		"total_dosen":     "SELECT COUNT(*) FROM dosen",
		"total_matkul":    "SELECT COUNT(*) FROM mata_kuliah",
	}

	g, ctx := errgroup.WithContext(ctx)

	for key, q := range queries {
		k, query := key, q
		g.Go(func() error {
			var count int64
			if err := r.db.QueryRow(ctx, query).Scan(&count); err != nil {
				return fmt.Errorf("failed to count %s: %w", k, err)
			}
			mu.Lock()
			stats[k] = count
			mu.Unlock()
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return stats, nil
}

func (r *Repository) SearchUsers(ctx context.Context, q string) ([]SearchResult, error) {
	query := `
		SELECT 'mahasiswa' AS tipe, m.nama_lengkap, m.nim AS identifier, u.email, m.program_studi AS detail
		FROM mahasiswa m JOIN users u ON u.id = m.user_id
		WHERE m.nim ILIKE $1 OR m.nama_lengkap ILIKE $1 OR u.email ILIKE $1
		UNION ALL
		SELECT 'dosen' AS tipe, d.nama_lengkap, d.nidn AS identifier, u.email, d.departemen AS detail
		FROM dosen d JOIN users u ON u.id = d.user_id
		WHERE d.nidn ILIKE $1 OR d.nama_lengkap ILIKE $1 OR u.email ILIKE $1
		LIMIT 10
	`
	searchTerm := "%" + q + "%"
	rows, err := r.db.Query(ctx, query, searchTerm)
	if err != nil {
		return nil, fmt.Errorf("search failed: %w", err)
	}
	defer rows.Close()

	results := make([]SearchResult, 0)
	for rows.Next() {
		var res SearchResult
		if err := rows.Scan(&res.Tipe, &res.NamaLengkap, &res.Identifier, &res.Email, &res.Detail); err != nil {
			return nil, fmt.Errorf("failed to scan search result: %w", err)
		}
		results = append(results, res)
	}
	return results, nil
}

func (r *Repository) CreateMataKuliah(ctx context.Context, mk *model.MataKuliah) error {
	query := `
		INSERT INTO mata_kuliah (kode_mk, nama_mk, sks, semester, program_studi)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`
	err := r.db.QueryRow(ctx, query, mk.KodeMK, mk.NamaMK, mk.SKS, mk.Semester, mk.ProgramStudi).
		Scan(&mk.ID, &mk.CreatedAt, &mk.UpdatedAt)
	if err != nil {
		return database.ParsePgError(err)
	}
	return nil
}

func (r *Repository) GetAllMataKuliah(ctx context.Context) ([]model.MataKuliah, error) {
	query := `
		SELECT id, kode_mk, nama_mk, sks, semester, program_studi, created_at, updated_at
		FROM mata_kuliah
		ORDER BY semester ASC, kode_mk ASC
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query mata kuliah: %w", err)
	}
	defer rows.Close()

	list := make([]model.MataKuliah, 0)
	for rows.Next() {
		var mk model.MataKuliah
		if err := rows.Scan(&mk.ID, &mk.KodeMK, &mk.NamaMK, &mk.SKS, &mk.Semester, &mk.ProgramStudi, &mk.CreatedAt, &mk.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan mata kuliah: %w", err)
		}
		list = append(list, mk)
	}
	return list, nil
}

func (r *Repository) UpdateMataKuliah(ctx context.Context, id string, mk *model.MataKuliah) error {
	query := `
		UPDATE mata_kuliah 
		SET kode_mk = $1, nama_mk = $2, sks = $3, semester = $4, updated_at = NOW()
		WHERE id = $5
		RETURNING updated_at
	`
	err := r.db.QueryRow(ctx, query, mk.KodeMK, mk.NamaMK, mk.SKS, mk.Semester, id).Scan(&mk.UpdatedAt)
	if err != nil {
		return database.ParsePgError(err)
	}
	if parsedID, err := uuid.Parse(id); err == nil {
		mk.ID = parsedID
	}
	return nil
}

func (r *Repository) DeleteMataKuliah(ctx context.Context, id string) error {
	query := `DELETE FROM mata_kuliah WHERE id = $1`
	cmd, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete mata kuliah: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("mata kuliah tidak ditemukan")
	}
	return nil
}
