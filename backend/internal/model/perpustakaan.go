package model

import (
	"time"

	"github.com/google/uuid"
)

type Buku struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Judul       string    `json:"judul" db:"judul"`
	Penulis     string    `json:"penulis" db:"penulis"`
	Penerbit    string    `json:"penerbit" db:"penerbit"`
	TahunTerbit int       `json:"tahun_terbit" db:"tahun_terbit"`
	ISBN        string    `json:"isbn" db:"isbn"`
	Stok        int       `json:"stok" db:"stok"`
	CoverURL    string    `json:"cover_url" db:"cover_url"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type PeminjamanBuku struct {
	ID             uuid.UUID `json:"id" db:"id"`
	UserID         uuid.UUID `json:"user_id" db:"user_id"`
	BukuID         uuid.UUID `json:"buku_id" db:"buku_id"`
	TanggalPinjam  string    `json:"tanggal_pinjam" db:"tanggal_pinjam"`
	TenggatWaktu   string    `json:"tenggat_waktu" db:"tenggat_waktu"`
	TanggalKembali *string   `json:"tanggal_kembali" db:"tanggal_kembali"`
	Status         string    `json:"status" db:"status"` // Menunggu, Dipinjam, Selesai, Terlambat
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`

	// Relational data
	Buku *Buku `json:"buku,omitempty"`
}
