package kelas

import (
	"encoding/json"
	"net/http"

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
	return &Handler{
		service: service,
		logger:  logger,
	}
}

func (h *Handler) GetAll(w http.ResponseWriter, r *http.Request) {
	kelas, err := h.service.GetAll(r.Context())
	if err != nil {
		h.logger.Error("Failed to get all kelas", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil data kelas", err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Data kelas berhasil diambil", kelas)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var k model.Kelas
	if err := json.NewDecoder(r.Body).Decode(&k); err != nil {
		response.Error(w, http.StatusBadRequest, "Format request tidak valid", err.Error())
		return
	}

	if err := h.service.Create(r.Context(), &k); err != nil {
		h.logger.Error("Failed to create kelas", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "Gagal membuat kelas", err.Error())
		return
	}

	response.Success(w, http.StatusCreated, "Kelas berhasil dibuat", k)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID kelas tidak valid", "")
		return
	}

	var k model.Kelas
	if err := json.NewDecoder(r.Body).Decode(&k); err != nil {
		response.Error(w, http.StatusBadRequest, "Format request tidak valid", err.Error())
		return
	}
	k.ID = id

	if err := h.service.Update(r.Context(), &k); err != nil {
		h.logger.Error("Failed to update kelas", zap.Error(err), zap.String("id", idStr))
		response.Error(w, http.StatusInternalServerError, "Gagal mengupdate kelas", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Kelas berhasil diupdate", k)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.service.Delete(r.Context(), id); err != nil {
		h.logger.Error("Failed to delete kelas", zap.Error(err), zap.String("id", id))
		response.Error(w, http.StatusInternalServerError, "Gagal menghapus kelas", err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Kelas berhasil dihapus", nil)
}
