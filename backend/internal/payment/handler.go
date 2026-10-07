package payment

import (
	"encoding/json"
	"net/http"

	"siakad/backend/internal/mahasiswa"
	"siakad/backend/internal/middleware"
	"siakad/backend/pkg/response"

	"github.com/go-chi/chi/v5"
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

// GetConfig mengembalikan konfigurasi publik Midtrans (Client Key & Snap URL)
func (h *Handler) GetConfig(w http.ResponseWriter, r *http.Request) {
	cfg := h.service.GetConfig()
	response.Success(w, http.StatusOK, "Berhasil mengambil konfigurasi payment", cfg)
}

// Get Data Tagihan Aktif
func (h *Handler) GetTagihan(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(middleware.UserContextKey).(*middleware.UserContext)
	
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

// GetActivePending mencari transaksi mahasiswa yang statusnya sedang pending
func (h *Handler) GetActivePending(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(middleware.UserContextKey).(*middleware.UserContext)
	
	mhs, err := h.mahasiswaRepo.GetByUserID(r.Context(), user.UserID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Data mahasiswa tidak ditemukan", err.Error())
		return
	}

	trx, err := h.service.GetActivePendingTransaksi(r.Context(), mhs.ID.String())
	if err != nil {
		// Jika tidak ada transaksi pending, kembalikan null
		response.Success(w, http.StatusOK, "Tidak ada transaksi pending aktif", nil)
		return
	}

	response.Success(w, http.StatusOK, "Transaksi pending ditemukan", trx)
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

// Sync memeriksa status transaksi langsung ke Midtrans API
func (h *Handler) Sync(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "order_id")
	if orderID == "" {
		response.Error(w, http.StatusBadRequest, "order_id wajib diisi", "")
		return
	}

	trx, err := h.service.SyncTransactionStatus(r.Context(), orderID)
	if err != nil {
		h.logger.Error("Gagal sinkronisasi transaksi Midtrans", zap.String("order_id", orderID), zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "Gagal sinkronisasi transaksi", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Status transaksi berhasil disinkronisasi", trx)
}

// Cancel membatalkan transaksi yang masih pending
func (h *Handler) Cancel(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "order_id")
	if orderID == "" {
		response.Error(w, http.StatusBadRequest, "order_id wajib diisi", "")
		return
	}

	trx, err := h.service.CancelTransaction(r.Context(), orderID)
	if err != nil {
		h.logger.Error("Gagal membatalkan transaksi", zap.String("order_id", orderID), zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "Gagal membatalkan transaksi", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Transaksi berhasil dibatalkan", trx)
}

// Webhook untuk Midtrans Notification
func (h *Handler) Webhook(w http.ResponseWriter, r *http.Request) {
	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON payload", err.Error())
		return
	}

	err := h.service.HandleWebhook(r.Context(), payload)
	if err != nil {
		h.logger.Error("Webhook processing failed", zap.Error(err))
		response.Error(w, http.StatusBadRequest, "Gagal memproses notifikasi webhook", err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Webhook processed successfully", nil)
}
