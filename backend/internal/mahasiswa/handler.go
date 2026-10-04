package mahasiswa

import (
	"encoding/json"
	"net/http"

	"siakad/backend/internal/model"
	"siakad/backend/pkg/response"
	"siakad/backend/pkg/util"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
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

func (h *Handler) GetAllMahasiswa(w http.ResponseWriter, r *http.Request) {
	list, err := h.service.GetAll(r.Context())
	if err != nil {
		h.logger.Error("Failed to get mahasiswa list", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil data mahasiswa", err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Data mahasiswa berhasil diambil", list)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		NIM          string  `json:"nim"`
		NamaLengkap  string  `json:"nama_lengkap"`
		ProgramStudi string  `json:"program_studi"`
		Angkatan     int     `json:"angkatan"`
		JalurMasuk   *string `json:"jalur_masuk"`
		Password     string  `json:"password"` // Opsional — jika kosong, auto-generate
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Format request tidak valid", err.Error())
		return
	}

	// Jika admin tidak mengisi password, auto-generate password unik berdasarkan NIM
	plainPassword := req.Password
	if plainPassword == "" {
		plainPassword = util.GenerateSecurePassword(req.NIM, "mahasiswa")
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

	m := model.Mahasiswa{
		NIM:          req.NIM,
		NamaLengkap:  req.NamaLengkap,
		ProgramStudi: req.ProgramStudi,
		Angkatan:     req.Angkatan,
		JalurMasuk:   req.JalurMasuk,
	}

	if err := h.service.Create(r.Context(), &m, string(hashed)); err != nil {
		h.logger.Error("Failed to insert mahasiswa", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "Gagal menambahkan mahasiswa", err.Error())
		return
	}

	// Kembalikan password plaintext di response agar admin bisa memberikan ke mahasiswa
	// Password ini HANYA ditampilkan sekali dan tidak pernah disimpan dalam bentuk plaintext
	result := map[string]interface{}{
		"mahasiswa":          m,
		"generated_password": plainPassword,
		"email_generated":    util.GenerateUsername(req.NamaLengkap, req.Angkatan) + "@mahasiswa.uisi.ac.id",
	}

	response.Success(w, http.StatusCreated, "Mahasiswa berhasil didaftarkan", result)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		NamaLengkap  string  `json:"nama_lengkap"`
		ProgramStudi string  `json:"program_studi"`
		Angkatan     int     `json:"angkatan"`
		JalurMasuk   *string `json:"jalur_masuk"`
		StatusUKT    bool    `json:"status_ukt"`
		StatusBIP    bool    `json:"status_bip"`
		IzinKRS      bool    `json:"izin_krs"`
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

	m := model.Mahasiswa{
		ID:           parsedID,
		NamaLengkap:  req.NamaLengkap,
		ProgramStudi: req.ProgramStudi,
		Angkatan:     req.Angkatan,
		JalurMasuk:   req.JalurMasuk,
		StatusUKT:    req.StatusUKT,
		StatusBIP:    req.StatusBIP,
		IzinKRS:      req.IzinKRS,
	}

	if err := h.service.Update(r.Context(), &m); err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal memperbarui data", err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Data mahasiswa diperbarui", m)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.service.Delete(r.Context(), id); err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal menghapus data", err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Mahasiswa berhasil dihapus", nil)
}
