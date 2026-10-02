package model

import (
	"time"

	"github.com/google/uuid"
)

type Transaksi struct {
	ID               uuid.UUID `json:"id" db:"id"`
	MahasiswaID      uuid.UUID `json:"mahasiswa_id" db:"mahasiswa_id"`
	OrderID          string    `json:"order_id" db:"order_id"`
	JenisTagihan     string    `json:"jenis_tagihan" db:"jenis_tagihan"`
	Jumlah           float64   `json:"jumlah" db:"jumlah"`
	Status           string    `json:"status" db:"status"` // pending, settlement, cancel, expire
	MetodePembayaran *string   `json:"metode_pembayaran" db:"metode_pembayaran"`
	SnapToken        *string   `json:"snap_token" db:"snap_token"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`
}

type Tagihan struct {
	ID      string  `json:"id"`
	Type    string  `json:"type"`
	Amount  float64 `json:"amount"`
	DueDate string  `json:"dueDate"`
	Status  string  `json:"status"` // Belum Bayar, Lunas
}
