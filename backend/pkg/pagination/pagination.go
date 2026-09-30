package pagination

import (
	"net/http"
	"strconv"
)

// Params berisi parameter pagination yang dikirim oleh frontend.
type Params struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
}

// Offset menghitung berapa baris yang harus di-skip
// berdasarkan halaman dan limit saat ini.
// Contoh: Page=2, Limit=20 → Offset = 20 (skip 20 baris pertama)
func (p *Params) Offset() int {
	return (p.Page - 1) * p.Limit
}

// Result adalah wrapper respon API yang menyertakan metadata pagination.
// Frontend dapat menggunakan metadata ini untuk membuat navigasi halaman.
type Result struct {
	Items      interface{} `json:"items"`
	TotalItems int64       `json:"total_items"`
	TotalPages int         `json:"total_pages"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
}

// DefaultLimit adalah jumlah item per halaman jika tidak dispesifikasi.
const DefaultLimit = 20

// MaxLimit adalah batas maksimal item per halaman untuk mencegah
// request yang terlalu besar (misal: ?limit=99999).
const MaxLimit = 100

// FromRequest mengekstrak parameter pagination dari query string HTTP request.
// Mendukung: ?page=1&limit=20
// Jika tidak ada, menggunakan default: page=1, limit=20
func FromRequest(r *http.Request) Params {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}

	return Params{
		Page:  page,
		Limit: limit,
	}
}

// NewResult membuat pagination result dari data items dan total count.
func NewResult(items interface{}, totalItems int64, params Params) Result {
	totalPages := int(totalItems) / params.Limit
	if int(totalItems)%params.Limit != 0 {
		totalPages++
	}
	if totalPages < 1 {
		totalPages = 1
	}

	return Result{
		Items:      items,
		TotalItems: totalItems,
		TotalPages: totalPages,
		Page:       params.Page,
		Limit:      params.Limit,
	}
}
