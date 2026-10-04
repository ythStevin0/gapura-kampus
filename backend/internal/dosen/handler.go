package dosen

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"siakad/backend/internal/middleware"
	"siakad/backend/internal/model"
	"siakad/backend/pkg/response"
	"siakad/backend/pkg/util"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	service          *Service
	mahasiswaService interface {
		GetByUserID(ctx context.Context, userID string) (*model.Mahasiswa, error)
	}
	dosenWaliService interface {
		AutoAssignByDept(ctx context.Context, dept string) (int, error)
	}
	logger *zap.Logger
}

func NewHandler(
	service *Service,
	mahasiswaService interface {
		GetByUserID(ctx context.Context, userID string) (*model.Mahasiswa, error)
	},
	dosenWaliService interface {
		AutoAssignByDept(ctx context.Context, dept string) (int, error)
	},
	logger *zap.Logger,
) *Handler {
	return &Handler{
		service:          service,
		mahasiswaService: mahasiswaService,
		dosenWaliService: dosenWaliService,
		logger:           logger,
	}
}

// GetAllDosen — GET /api/users/dosen
func (h *Handler) GetAllDosen(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserFromContext(r.Context())
	if userCtx == nil {
		response.Error(w, http.StatusUnauthorized, "Unauthorized", "User not found in context")
		return
	}

	var list []model.Dosen
	var err error

	// Jika role adalah mahasiswa, filter berdasarkan departemen sesuai prodi mahasiswa
	if userCtx.Role == model.RoleMahasiswa {
		m, errM := h.mahasiswaService.GetByUserID(r.Context(), userCtx.UserID)
		if errM != nil {
			h.logger.Error("Failed to get mahasiswa profile for filtering", zap.String("userID", userCtx.UserID), zap.Error(errM))
			list, err = h.service.GetAll(r.Context())
		} else {
			list, err = h.service.GetByDepartemen(r.Context(), m.ProgramStudi)
		}
	} else {
		// Untuk admin atau role lain, ambil semua dosen
		list, err = h.service.GetAll(r.Context())
	}

	if err != nil {
		h.logger.Error("Failed to get dosen list", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil data dosen", err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Data dosen berhasil diambil", list)
}

// Create — POST /api/admin/dosen
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		NIDN          string  `json:"nidn"`
		NamaLengkap   string  `json:"nama_lengkap"`
		GelarDepan    *string `json:"gelar_depan"`
		GelarBelakang *string `json:"gelar_belakang"`
		Departemen    string  `json:"departemen"`
		Password      string  `json:"password"` // Opsional — jika kosong, auto-generate
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Format request tidak valid", err.Error())
		return
	}

	// Jika admin tidak mengisi password, auto-generate password unik berdasarkan NIDN
	plainPassword := req.Password
	if plainPassword == "" {
		plainPassword = util.GenerateSecurePassword(req.NIDN, "dosen")
	} else {
		// Validasi kekuatan password jika admin memasukkan sendiri
		if err := util.ValidatePasswordStrength(plainPassword); err != nil {
			response.Error(w, http.StatusBadRequest, "Password tidak memenuhi standar keamanan", err.Error())
			return
		}
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal mengamankan password", err.Error())
		return
	}

	d := model.Dosen{
		NIDN:          req.NIDN,
		NamaLengkap:   req.NamaLengkap,
		GelarDepan:    req.GelarDepan,
		GelarBelakang: req.GelarBelakang,
		Departemen:    req.Departemen,
	}

	if err := h.service.Create(r.Context(), &d, string(hashed)); err != nil {
		h.logger.Error("Failed to create dosen", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "Gagal mendaftarkan dosen", err.Error())
		return
	}

	// Trigger Auto Assign untuk mahasiswa yang belum punya wali di departemen ini
	assignedCount, _ := h.dosenWaliService.AutoAssignByDept(r.Context(), d.Departemen)
	if assignedCount > 0 {
		h.logger.Info("Auto-assigned students to new lecturer",
			zap.String("dept", d.Departemen),
			zap.Int("count", assignedCount))
	}

	// Kembalikan password plaintext di response agar admin bisa memberikan ke dosen
	result := map[string]interface{}{
		"dosen":              d,
		"generated_password": plainPassword,
		"email_generated":    util.GenerateUsername(req.NamaLengkap, time.Now().Year()) + "@dosen.uisi.ac.id",
	}

	response.Success(w, http.StatusCreated, "Dosen berhasil didaftarkan", result)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		NamaLengkap   string  `json:"nama_lengkap"`
		GelarDepan    *string `json:"gelar_depan"`
		GelarBelakang *string `json:"gelar_belakang"`
		Departemen    string  `json:"departemen"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Format request tidak valid", err.Error())
		return
	}

	parsedID, err := uuid.Parse(id)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	d := model.Dosen{
		ID:            parsedID,
		NamaLengkap:   req.NamaLengkap,
		GelarDepan:    req.GelarDepan,
		GelarBelakang: req.GelarBelakang,
		Departemen:    req.Departemen,
	}

	if err := h.service.Update(r.Context(), &d); err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal memperbarui data", err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Data dosen diperbarui", d)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.service.Delete(r.Context(), id); err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal menghapus data", err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Dosen berhasil dihapus", nil)
}
