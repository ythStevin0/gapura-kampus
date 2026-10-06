package perpustakaan

import (
	"context"
	"errors"
	"time"

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

// -----------------------------------------------------
// BUKU
// -----------------------------------------------------

func (r *Repository) GetAllBuku(ctx context.Context) ([]model.Buku, error) {
	const cacheKey = "perpustakaan:buku:all"
	if r.cache != nil {
		if cached, ok := r.cache.Get(cacheKey); ok {
			return cached.([]model.Buku), nil
		}
	}

	query := `SELECT id, judul, penulis, penerbit, tahun_terbit, isbn, stok, cover_url, created_at, updated_at FROM buku ORDER BY judul ASC`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.Buku
	for rows.Next() {
		var b model.Buku
		if err := rows.Scan(&b.ID, &b.Judul, &b.Penulis, &b.Penerbit, &b.TahunTerbit, &b.ISBN, &b.Stok, &b.CoverURL, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, b)
	}

	if r.cache != nil {
		r.cache.Set(cacheKey, list, cache.TTLLong)
	}

	return list, nil
}

func (r *Repository) CreateBuku(ctx context.Context, b *model.Buku) error {
	query := `
		INSERT INTO buku (judul, penulis, penerbit, tahun_terbit, isbn, stok, cover_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`
	err := r.db.QueryRow(ctx, query,
		b.Judul, b.Penulis, b.Penerbit, b.TahunTerbit, b.ISBN, b.Stok, b.CoverURL,
	).Scan(&b.ID, &b.CreatedAt, &b.UpdatedAt)
	if err != nil {
		return err
	}

	if r.cache != nil {
		r.cache.Invalidate("perpustakaan:buku:all")
	}
	return nil
}

func (r *Repository) GetBukuByID(ctx context.Context, id string) (*model.Buku, error) {
	query := `SELECT id, judul, penulis, penerbit, tahun_terbit, isbn, stok, cover_url, created_at, updated_at FROM buku WHERE id = $1`
	var b model.Buku
	err := r.db.QueryRow(ctx, query, id).Scan(&b.ID, &b.Judul, &b.Penulis, &b.Penerbit, &b.TahunTerbit, &b.ISBN, &b.Stok, &b.CoverURL, &b.CreatedAt, &b.UpdatedAt)
	return &b, err
}

func (r *Repository) UpdateStokBuku(ctx context.Context, id string, delta int) error {
	query := `UPDATE buku SET stok = stok + $1, updated_at = NOW() WHERE id = $2 AND stok + $1 >= 0`
	tag, err := r.db.Exec(ctx, query, delta, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("stok tidak mencukupi atau buku tidak ditemukan")
	}
	return nil
}

// -----------------------------------------------------
// PEMINJAMAN
// -----------------------------------------------------

func (r *Repository) CreatePeminjaman(ctx context.Context, p *model.PeminjamanBuku) error {
	// Mulai transaksi manual karena butuh kurangi stok
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Kurangi stok
	updateQuery := `UPDATE buku SET stok = stok - 1 WHERE id = $1 AND stok > 0`
	tag, err := tx.Exec(ctx, updateQuery, p.BukuID)
	if err != nil || tag.RowsAffected() == 0 {
		return errors.New("stok buku habis")
	}

	// Insert peminjaman
	query := `
		INSERT INTO peminjaman_buku (user_id, buku_id, tenggat_waktu, status)
		VALUES ($1, $2, $3, 'Dipinjam')
		RETURNING id, tanggal_pinjam, created_at, updated_at
	`
	// Tenggat waktu default 7 hari dari sekarang
	tenggat := time.Now().AddDate(0, 0, 7).Format("2006-01-02")
	var tglPinjam time.Time

	err = tx.QueryRow(ctx, query, p.UserID, p.BukuID, tenggat).Scan(&p.ID, &tglPinjam, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return err
	}
	
	p.TanggalPinjam = tglPinjam.Format("2006-01-02")
	p.TenggatWaktu = tenggat
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	if r.cache != nil {
		r.cache.Invalidate("perpustakaan:buku:all")
	}
	return nil
}

func (r *Repository) GetPeminjamanByUser(ctx context.Context, userID string) ([]model.PeminjamanBuku, error) {
	query := `
		SELECT 
			p.id, p.user_id, p.buku_id, p.tanggal_pinjam, p.tenggat_waktu, p.tanggal_kembali, p.status, p.created_at, p.updated_at,
			b.id, b.judul, b.penulis, b.cover_url
		FROM peminjaman_buku p
		JOIN buku b ON p.buku_id = b.id
		WHERE p.user_id = $1
		ORDER BY p.created_at DESC
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.PeminjamanBuku
	for rows.Next() {
		var p model.PeminjamanBuku
		var b model.Buku
		var tPinjam, tTenggat time.Time
		var tKembali *time.Time

		if err := rows.Scan(
			&p.ID, &p.UserID, &p.BukuID, &tPinjam, &tTenggat, &tKembali, &p.Status, &p.CreatedAt, &p.UpdatedAt,
			&b.ID, &b.Judul, &b.Penulis, &b.CoverURL,
		); err != nil {
			return nil, err
		}

		p.TanggalPinjam = tPinjam.Format("2006-01-02")
		p.TenggatWaktu = tTenggat.Format("2006-01-02")
		if tKembali != nil {
			k := tKembali.Format("2006-01-02")
			p.TanggalKembali = &k
		}
		p.Buku = &b
		list = append(list, p)
	}
	return list, nil
}

func (r *Repository) KembalikanBuku(ctx context.Context, peminjamanID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Dapatkan buku_id
	var bukuID string
	var status string
	err = tx.QueryRow(ctx, "SELECT buku_id, status FROM peminjaman_buku WHERE id = $1", peminjamanID).Scan(&bukuID, &status)
	if err != nil {
		return err
	}

	if status == "Selesai" {
		return errors.New("buku ini sudah dikembalikan")
	}

	// Update peminjaman
	_, err = tx.Exec(ctx, "UPDATE peminjaman_buku SET status = 'Selesai', tanggal_kembali = CURRENT_DATE, updated_at = NOW() WHERE id = $1", peminjamanID)
	if err != nil {
		return err
	}

	// Kembalikan stok
	_, err = tx.Exec(ctx, "UPDATE buku SET stok = stok + 1 WHERE id = $1", bukuID)
	if err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}
	if r.cache != nil {
		r.cache.Invalidate("perpustakaan:buku:all")
	}
	return nil
}
