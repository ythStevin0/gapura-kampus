package payment

import (
	"context"

	"siakad/backend/internal/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateTransaksi(ctx context.Context, trx *model.Transaksi) error {
	query := `
		INSERT INTO transaksi (mahasiswa_id, order_id, jenis_tagihan, jumlah, status, snap_token)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query,
		trx.MahasiswaID, trx.OrderID, trx.JenisTagihan, trx.Jumlah, trx.Status, trx.SnapToken,
	).Scan(&trx.ID, &trx.CreatedAt, &trx.UpdatedAt)
}

func (r *Repository) GetTransaksiByMahasiswa(ctx context.Context, mahasiswaID string) ([]model.Transaksi, error) {
	query := `
		SELECT id, mahasiswa_id, order_id, jenis_tagihan, jumlah, status, metode_pembayaran, snap_token, created_at, updated_at
		FROM transaksi 
		WHERE mahasiswa_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, query, mahasiswaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.Transaksi
	for rows.Next() {
		var t model.Transaksi
		if err := rows.Scan(
			&t.ID, &t.MahasiswaID, &t.OrderID, &t.JenisTagihan, &t.Jumlah, 
			&t.Status, &t.MetodePembayaran, &t.SnapToken, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	return list, nil
}

func (r *Repository) UpdateStatusTransaksi(ctx context.Context, orderID string, status string, metode string) error {
	query := `
		UPDATE transaksi 
		SET status = $1, metode_pembayaran = $2, updated_at = NOW() 
		WHERE order_id = $3
	`
	_, err := r.db.Exec(ctx, query, status, metode, orderID)
	return err
}

func (r *Repository) UpdateStatusKeuanganMahasiswa(ctx context.Context, orderID string) error {
	// Jika jenis_tagihan = UKT, update status_ukt = true
	// Jika jenis_tagihan = BIP, update status_bip = true
	query := `
		UPDATE mahasiswa 
		SET 
			status_ukt = CASE WHEN (SELECT jenis_tagihan FROM transaksi WHERE order_id = $1) = 'UKT' THEN true ELSE status_ukt END,
			status_bip = CASE WHEN (SELECT jenis_tagihan FROM transaksi WHERE order_id = $1) = 'BIP' THEN true ELSE status_bip END
		WHERE id = (SELECT mahasiswa_id FROM transaksi WHERE order_id = $1)
	`
	_, err := r.db.Exec(ctx, query, orderID)
	return err
}
