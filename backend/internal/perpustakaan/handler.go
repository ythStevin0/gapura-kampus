package perpustakaan

import (
	"encoding/json"
	"net/http"

	"siakad/backend/internal/middleware"
	"siakad/backend/internal/model"
	"siakad/backend/pkg/response"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type Handler struct {
	service *Service
	logger  *zap.Logger
}

func NewHandler(service *Service, logger *zap.Logger) *Handler {
	return &Handler{service: service, logger: logger}
}

// GET /api/perpustakaan/buku
func (h *Handler) GetAllBuku(w http.ResponseWriter, r *http.Request) {
	buku, err := h.service.GetAllBuku(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil data buku", err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Berhasil mengambil data buku", buku)
}

// POST /api/admin/perpustakaan/buku
func (h *Handler) CreateBuku(w http.ResponseWriter, r *http.Request) {
	var req model.Buku
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.service.CreateBuku(r.Context(), &req); err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal menambah buku", err.Error())
		return
	}
	response.Success(w, http.StatusCreated, "Berhasil menambah buku", req)
}

// POST /api/perpustakaan/pinjam
func (h *Handler) PinjamBuku(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(middleware.UserContextKey).(*middleware.UserContext)
	
	var req struct {
		BukuID string `json:"buku_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	bukuUUID, err := uuid.Parse(req.BukuID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid buku ID", err.Error())
		return
	}

	userUUID, err := uuid.Parse(user.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Invalid user ID", err.Error())
		return
	}

	p := &model.PeminjamanBuku{
		UserID: userUUID,
		BukuID: bukuUUID,
	}

	if err := h.service.PinjamBuku(r.Context(), p); err != nil {
		response.Error(w, http.StatusBadRequest, "Gagal meminjam buku", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Berhasil meminjam buku", p)
}

// GET /api/perpustakaan/peminjaman/me
func (h *Handler) GetPeminjamanSaya(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(middleware.UserContextKey).(*middleware.UserContext)
	
	list, err := h.service.GetPeminjamanSaya(r.Context(), user.UserID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil riwayat peminjaman", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Berhasil mengambil riwayat peminjaman", list)
}

// PUT /api/admin/perpustakaan/kembali/{id}
func (h *Handler) KembalikanBuku(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.Error(w, http.StatusBadRequest, "ID tidak ditemukan", "")
		return
	}

	if err := h.service.KembalikanBuku(r.Context(), id); err != nil {
		response.Error(w, http.StatusBadRequest, "Gagal memproses pengembalian buku", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Buku berhasil dikembalikan", nil)
}
