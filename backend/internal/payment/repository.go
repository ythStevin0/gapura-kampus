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
		INSERT INTO transaksi (
			mahasiswa_id, order_id, jenis_tagihan, jumlah, status, 
			metode_pembayaran, snap_token, va_number, bank, bill_key, 
			biller_code, payment_type, expiry_time, settlement_time, pdf_url
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query,
		trx.MahasiswaID, trx.OrderID, trx.JenisTagihan, trx.Jumlah, trx.Status,
		trx.MetodePembayaran, trx.SnapToken, trx.VANumber, trx.Bank, trx.BillKey,
		trx.BillerCode, trx.PaymentType, trx.ExpiryTime, trx.SettlementTime, trx.PdfURL,
	).Scan(&trx.ID, &trx.CreatedAt, &trx.UpdatedAt)
}

func (r *Repository) GetTransaksiByMahasiswa(ctx context.Context, mahasiswaID string) ([]model.Transaksi, error) {
	query := `
		SELECT 
			id, mahasiswa_id, order_id, jenis_tagihan, jumlah, status, 
			metode_pembayaran, snap_token, va_number, bank, bill_key, 
			biller_code, payment_type, expiry_time, settlement_time, pdf_url, 
			created_at, updated_at
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
			&t.Status, &t.MetodePembayaran, &t.SnapToken, &t.VANumber, &t.Bank,
			&t.BillKey, &t.BillerCode, &t.PaymentType, &t.ExpiryTime, &t.SettlementTime,
			&t.PdfURL, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	return list, nil
}

func (r *Repository) GetTransaksiByOrderID(ctx context.Context, orderID string) (*model.Transaksi, error) {
	query := `
		SELECT 
			id, mahasiswa_id, order_id, jenis_tagihan, jumlah, status, 
			metode_pembayaran, snap_token, va_number, bank, bill_key, 
			biller_code, payment_type, expiry_time, settlement_time, pdf_url, 
			created_at, updated_at
		FROM transaksi 
		WHERE order_id = $1
		LIMIT 1
	`
	var t model.Transaksi
	err := r.db.QueryRow(ctx, query, orderID).Scan(
		&t.ID, &t.MahasiswaID, &t.OrderID, &t.JenisTagihan, &t.Jumlah, 
		&t.Status, &t.MetodePembayaran, &t.SnapToken, &t.VANumber, &t.Bank,
		&t.BillKey, &t.BillerCode, &t.PaymentType, &t.ExpiryTime, &t.SettlementTime,
		&t.PdfURL, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
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

func (r *Repository) UpdatePaymentDetails(ctx context.Context, trx *model.Transaksi) error {
	query := `
		UPDATE transaksi 
		SET 
			status = $1, 
			metode_pembayaran = $2, 
			va_number = $3, 
			bank = $4, 
			bill_key = $5, 
			biller_code = $6, 
			payment_type = $7, 
			expiry_time = $8, 
			settlement_time = $9, 
			pdf_url = $10,
			updated_at = NOW() 
		WHERE order_id = $11
	`
	_, err := r.db.Exec(ctx, query,
		trx.Status, trx.MetodePembayaran, trx.VANumber, trx.Bank,
		trx.BillKey, trx.BillerCode, trx.PaymentType, trx.ExpiryTime,
		trx.SettlementTime, trx.PdfURL, trx.OrderID,
	)
	return err
}

func (r *Repository) UpdateStatusKeuanganMahasiswa(ctx context.Context, orderID string) error {
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

// GetPendingTransaksiByBill mencari transaksi pending yang masih aktif untuk tagihan mahasiswa
func (r *Repository) GetPendingTransaksiByBill(ctx context.Context, mahasiswaID string, jenisTagihan string) (*model.Transaksi, error) {
	query := `
		SELECT 
			id, mahasiswa_id, order_id, jenis_tagihan, jumlah, status, 
			metode_pembayaran, snap_token, va_number, bank, bill_key, 
			biller_code, payment_type, expiry_time, settlement_time, pdf_url, 
			created_at, updated_at
		FROM transaksi 
		WHERE mahasiswa_id = $1 AND jenis_tagihan = $2 AND status = 'pending' AND snap_token IS NOT NULL
		ORDER BY created_at DESC 
		LIMIT 1
	`
	var t model.Transaksi
	err := r.db.QueryRow(ctx, query, mahasiswaID, jenisTagihan).Scan(
		&t.ID, &t.MahasiswaID, &t.OrderID, &t.JenisTagihan, &t.Jumlah, 
		&t.Status, &t.MetodePembayaran, &t.SnapToken, &t.VANumber, &t.Bank,
		&t.BillKey, &t.BillerCode, &t.PaymentType, &t.ExpiryTime, &t.SettlementTime,
		&t.PdfURL, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// GetActivePendingTransaksi mencari transaksi pending mahasiswa yang sedang berjalan
func (r *Repository) GetActivePendingTransaksi(ctx context.Context, mahasiswaID string) (*model.Transaksi, error) {
	query := `
		SELECT 
			id, mahasiswa_id, order_id, jenis_tagihan, jumlah, status, 
			metode_pembayaran, snap_token, va_number, bank, bill_key, 
			biller_code, payment_type, expiry_time, settlement_time, pdf_url, 
			created_at, updated_at
		FROM transaksi 
		WHERE mahasiswa_id = $1 AND status = 'pending'
		ORDER BY created_at DESC 
		LIMIT 1
	`
	var t model.Transaksi
	err := r.db.QueryRow(ctx, query, mahasiswaID).Scan(
		&t.ID, &t.MahasiswaID, &t.OrderID, &t.JenisTagihan, &t.Jumlah, 
		&t.Status, &t.MetodePembayaran, &t.SnapToken, &t.VANumber, &t.Bank,
		&t.BillKey, &t.BillerCode, &t.PaymentType, &t.ExpiryTime, &t.SettlementTime,
		&t.PdfURL, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}
