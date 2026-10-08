package akademik

import (
	"encoding/json"
	"net/http"
	"siakad/backend/internal/middleware"
	"siakad/backend/internal/model"
	"siakad/backend/pkg/response"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// GetProfilKRS handles GET /api/akademik/profil-krs
// Mengembalikan data profil mahasiswa: semester aktif, IPS, nama dosen wali, max SKS
func (h *Handler) GetProfilKRS(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserFromContext(r.Context())
	userID, _ := uuid.Parse(userCtx.UserID)

	profil, err := h.service.GetProfilKRS(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil profil KRS", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Profil KRS berhasil diambil", profil)
}

// GetAvailableKelas handles GET /api/akademik/kelas/tersedia
func (h *Handler) GetAvailableKelas(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserFromContext(r.Context())
	semester := r.URL.Query().Get("semester")
	if semester == "" {
		semester = "Ganjil 2024/2025" // Default
	}

	userID, _ := uuid.Parse(userCtx.UserID)
	list, err := h.service.GetAvailableKelas(r.Context(), userID, semester)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil daftar kelas", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Daftar kelas tersedia berhasil diambil", list)
}


// GetKRS handles GET /api/akademik/krs
func (h *Handler) GetKRS(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserFromContext(r.Context())
	semester := r.URL.Query().Get("semester")
	if semester == "" {
		semester = "Ganjil 2024/2025"
	}

	userID, _ := uuid.Parse(userCtx.UserID)
	list, err := h.service.GetKRS(r.Context(), userID, semester)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil data KRS", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Data KRS berhasil diambil", list)
}

// EnrollKelas handles POST /api/akademik/krs/ambil
func (h *Handler) EnrollKelas(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserFromContext(r.Context())
	
	var req struct {
		KelasID  string `json:"kelas_id"`
		Semester string `json:"semester"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Format request tidak valid", err.Error())
		return
	}

	if req.KelasID == "" || req.Semester == "" {
		response.Error(w, http.StatusBadRequest, "Data tidak lengkap", "kelas_id and semester are required")
		return
	}

	userID, _ := uuid.Parse(userCtx.UserID)
	err := h.service.EnrollKelas(r.Context(), userID, req.KelasID, req.Semester)
	if err != nil {
		if err == ErrPaidRequired || err == ErrScheduleConflict || err == ErrClassFull || err == ErrMaxSKS {
			response.Error(w, http.StatusForbidden, "Gagal mengambil mata kuliah", err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "Terjadi kesalahan server", err.Error())
		return
	}

	response.Success(w, http.StatusCreated, "Mata kuliah berhasil ditambahkan ke KRS", nil)
}

// DropKelas handles DELETE /api/akademik/krs/batal/{id}
func (h *Handler) DropKelas(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserFromContext(r.Context())
	krsID := chi.URLParam(r, "id")

	if krsID == "" {
		response.Error(w, http.StatusBadRequest, "Data tidak lengkap", "KRS ID is required")
		return
	}

	userID, _ := uuid.Parse(userCtx.UserID)
	err := h.service.DropKelas(r.Context(), userID, krsID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal membatalkan mata kuliah", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Mata kuliah berhasil dibatalkan dari KRS", nil)
}

// GetKHS handles GET /api/akademik/khs?semester=...
func (h *Handler) GetKHS(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserFromContext(r.Context())
	semester := r.URL.Query().Get("semester")

	userID, _ := uuid.Parse(userCtx.UserID)
	khs, err := h.service.GetKHS(r.Context(), userID, semester)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil data KHS", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Data KHS berhasil diambil", khs)
}

// GetTranskrip handles GET /api/akademik/transkrip
func (h *Handler) GetTranskrip(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserFromContext(r.Context())
	userID, _ := uuid.Parse(userCtx.UserID)

	transkrip, err := h.service.GetTranskrip(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil transkrip nilai", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Transkrip nilai berhasil diambil", transkrip)
}

// GetSemesters handles GET /api/akademik/semesters
func (h *Handler) GetSemesters(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserFromContext(r.Context())
	userID, _ := uuid.Parse(userCtx.UserID)

	semesters, err := h.service.GetSemesters(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil daftar semester", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Daftar semester berhasil diambil", semesters)
}

// GetMahasiswaNilaiByKelas handles GET /api/dosen/kelas/{id}/nilai
func (h *Handler) GetMahasiswaNilaiByKelas(w http.ResponseWriter, r *http.Request) {
	kelasID := chi.URLParam(r, "id")
	if kelasID == "" {
		response.Error(w, http.StatusBadRequest, "ID kelas wajib diisi", "")
		return
	}

	list, err := h.service.GetMahasiswaNilaiByKelas(r.Context(), kelasID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil nilai mahasiswa kelas", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Daftar nilai mahasiswa kelas berhasil diambil", list)
}

// InputNilaiKelas handles POST /api/dosen/kelas/nilai
func (h *Handler) InputNilaiKelas(w http.ResponseWriter, r *http.Request) {
	var req model.InputNilaiRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Format JSON request tidak valid", err.Error())
		return
	}

	if req.KelasID == "" {
		response.Error(w, http.StatusBadRequest, "kelas_id wajib diisi", "")
		return
	}

	if err := h.service.InputNilaiKelas(r.Context(), req); err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal menyimpan nilai", err.Error())
		return
	}

	pesan := "Nilai berhasil disimpan sebagai draft"
	if req.Publish {
		pesan = "Nilai berhasil disimpan dan dipublikasikan ke mahasiswa"
	}

	response.Success(w, http.StatusOK, pesan, nil)
}

// PublishNilaiKelas handles POST /api/dosen/kelas/{id}/publish-nilai
func (h *Handler) PublishNilaiKelas(w http.ResponseWriter, r *http.Request) {
	kelasID := chi.URLParam(r, "id")
	if kelasID == "" {
		response.Error(w, http.StatusBadRequest, "ID kelas wajib diisi", "")
		return
	}

	if err := h.service.PublishNilaiKelas(r.Context(), kelasID); err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal mempublikasikan nilai kelas", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Semua nilai kelas berhasil dipublikasikan", nil)
}
