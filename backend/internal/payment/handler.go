package payment

import (
	"encoding/json"
	"net/http"

	"siakad/backend/internal/mahasiswa"
	"siakad/backend/internal/middleware"
	"siakad/backend/pkg/response"

	"go.uber.org/zap"
)

type Handler struct {
	service       *Service
	mahasiswaRepo *mahasiswa.Repository
	logger        *zap.Logger
}

func NewHandler(service *Service, mhsRepo *mahasiswa.Repository, logger *zap.Logger) *Handler {
	return &Handler{
		service:       service,
		mahasiswaRepo: mhsRepo,
		logger:        logger,
	}
}

// Get Data Tagihan Aktif
func (h *Handler) GetTagihan(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(middleware.UserContextKey).(*middleware.UserContext)
	
	// Cari data mahasiswa
	mhs, err := h.mahasiswaRepo.GetByUserID(r.Context(), user.UserID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Data mahasiswa tidak ditemukan", err.Error())
		return
	}

	bills := h.service.GetTagihan(r.Context(), mhs.ID.String(), mhs.StatusUKT, mhs.StatusBIP)
	response.Success(w, http.StatusOK, "Berhasil mengambil tagihan", bills)
}

// Get Riwayat Transaksi
func (h *Handler) GetTransaksi(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(middleware.UserContextKey).(*middleware.UserContext)
	
	mhs, err := h.mahasiswaRepo.GetByUserID(r.Context(), user.UserID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Data mahasiswa tidak ditemukan", err.Error())
		return
	}

	trx, err := h.service.GetTransaksi(r.Context(), mhs.ID.String())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil transaksi", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Berhasil mengambil transaksi", trx)
}

// Request Checkout ke Midtrans
func (h *Handler) Checkout(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(middleware.UserContextKey).(*middleware.UserContext)
	
	var req struct {
		JenisTagihan string  `json:"jenis_tagihan"`
		Amount       float64 `json:"amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	mhs, err := h.mahasiswaRepo.GetByUserID(r.Context(), user.UserID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Data mahasiswa tidak ditemukan", err.Error())
		return
	}

	trx, err := h.service.Checkout(r.Context(), mhs.ID.String(), req.JenisTagihan, req.Amount, mhs.NamaLengkap, user.Email)
	if err != nil {
		h.logger.Error("Checkout failed", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "Gagal checkout", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Checkout berhasil", trx)
}

// Webhook untuk Midtrans Notification
func (h *Handler) Webhook(w http.ResponseWriter, r *http.Request) {
	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON", err.Error())
		return
	}

	orderID, _ := payload["order_id"].(string)
	transactionStatus, _ := payload["transaction_status"].(string)
	fraudStatus, _ := payload["fraud_status"].(string)
	paymentType, _ := payload["payment_type"].(string)

	err := h.service.HandleWebhook(r.Context(), orderID, transactionStatus, fraudStatus, paymentType)
	if err != nil {
		h.logger.Error("Webhook error", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "Gagal memproses webhook", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Webhook processed", nil)
}
