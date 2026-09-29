package admin

import (
	"encoding/json"
	"net/http"

	"siakad/backend/internal/model"
	"siakad/backend/pkg/response"

	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

type Handler struct {
	service *Service
	logger  *zap.Logger
}

func NewHandler(service *Service, logger *zap.Logger) *Handler {
	return &Handler{
		service: service,
		logger:  logger,
	}
}

func (h *Handler) GetAdminStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.service.GetStats(r.Context())
	if err != nil {
		h.logger.Error("Failed to get admin stats", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil statistik", err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Stats berhasil diambil", stats)
}

func (h *Handler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if len(q) < 3 {
		response.Error(w, http.StatusBadRequest, "Kata kunci terlalu pendek", "Minimal 3 karakter")
		return
	}
	results, err := h.service.SearchUsers(r.Context(), q)
	if err != nil {
		h.logger.Error("Search failed", zap.Error(err), zap.String("query", q))
		response.Error(w, http.StatusInternalServerError, "Pencarian gagal", err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Pencarian berhasil", results)
}

func (h *Handler) CreateMataKuliah(w http.ResponseWriter, r *http.Request) {
	var req struct {
		KodeMK   string `json:"kode_mk"`
		NamaMK   string `json:"nama_mk"`
		SKS      int    `json:"sks"`
		Semester int    `json:"semester"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Format request tidak valid", err.Error())
		return
	}
	mk := model.MataKuliah{
		KodeMK:   req.KodeMK,
		NamaMK:   req.NamaMK,
		SKS:      req.SKS,
		Semester: req.Semester,
	}
	err := h.service.CreateMataKuliah(r.Context(), &mk)
	if err != nil {
		h.logger.Error("Failed to create mata kuliah", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "Gagal membuat mata kuliah", err.Error())
		return
	}
	response.Success(w, http.StatusCreated, "Mata kuliah berhasil ditambahkan", mk)
}

func (h *Handler) GetAllMataKuliah(w http.ResponseWriter, r *http.Request) {
	list, err := h.service.GetAllMataKuliah(r.Context())
	if err != nil {
		h.logger.Error("Failed to get mata kuliah list", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil data mata kuliah", err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Data mata kuliah berhasil diambil", list)
}

func (h *Handler) UpdateMataKuliah(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.Error(w, http.StatusBadRequest, "ID mata kuliah diperlukan", "")
		return
	}

	var req struct {
		KodeMK   string `json:"kode_mk"`
		NamaMK   string `json:"nama_mk"`
		SKS      int    `json:"sks"`
		Semester int    `json:"semester"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Format request tidak valid", err.Error())
		return
	}

	mk := model.MataKuliah{
		KodeMK:   req.KodeMK,
		NamaMK:   req.NamaMK,
		SKS:      req.SKS,
		Semester: req.Semester,
	}

	err := h.service.UpdateMataKuliah(r.Context(), id, &mk)
	if err != nil {
		h.logger.Error("Failed to update mata kuliah", zap.Error(err), zap.String("id", id))
		response.Error(w, http.StatusInternalServerError, "Gagal mengubah mata kuliah", err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Mata kuliah berhasil diubah", mk)
}

func (h *Handler) DeleteMataKuliah(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.Error(w, http.StatusBadRequest, "ID mata kuliah diperlukan", "")
		return
	}

	err := h.service.DeleteMataKuliah(r.Context(), id)
	if err != nil {
		h.logger.Error("Failed to delete mata kuliah", zap.Error(err), zap.String("id", id))
		response.Error(w, http.StatusInternalServerError, "Gagal menghapus mata kuliah", err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Mata kuliah berhasil dihapus", nil)
}
