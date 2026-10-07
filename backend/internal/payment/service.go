package payment

import (
	"context"
	"crypto/sha512"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"time"

	"siakad/backend/internal/model"

	"github.com/google/uuid"
	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/coreapi"
	"github.com/midtrans/midtrans-go/snap"
)

type Service struct {
	repo         *Repository
	serverKey    string
	clientKey    string
	isProduction bool
	snapClient   snap.Client
	coreClient   coreapi.Client
}

func NewService(repo *Repository, serverKey, clientKey string, isProduction bool) *Service {
	// Fallback ke env jika tidak dioper secara eksplisit
	if serverKey == "" {
		serverKey = os.Getenv("MIDTRANS_SERVER_KEY")
	}
	if clientKey == "" {
		clientKey = os.Getenv("MIDTRANS_CLIENT_KEY")
	}
	if !isProduction {
		isProduction = os.Getenv("MIDTRANS_IS_PRODUCTION") == "true"
	}

	env := midtrans.Sandbox
	if isProduction {
		env = midtrans.Production
	}

	var s snap.Client
	s.New(serverKey, env)

	var c coreapi.Client
	c.New(serverKey, env)

	return &Service{
		repo:         repo,
		serverKey:    serverKey,
		clientKey:    clientKey,
		isProduction: isProduction,
		snapClient:   s,
		coreClient:   c,
	}
}

// GetConfig mengembalikan konfigurasi publik untuk client frontend
func (s *Service) GetConfig() model.PaymentConfig {
	snapURL := "https://app.sandbox.midtrans.com/snap/snap.js"
	if s.isProduction {
		snapURL = "https://app.midtrans.com/snap/snap.js"
	}
	return model.PaymentConfig{
		ClientKey:    s.clientKey,
		IsProduction: s.isProduction,
		SnapURL:      snapURL,
	}
}

func (s *Service) GetTagihan(ctx context.Context, mahasiswaID string, statusUKT, statusBIP bool) []model.Tagihan {
	var bills []model.Tagihan

	if !statusUKT {
		bills = append(bills, model.Tagihan{
			ID:      "UKT",
			Type:    "UKT Semester Berjalan",
			Amount:  7500000,
			DueDate: time.Now().AddDate(0, 1, 0).Format("2006-01-02"),
			Status:  "Belum Bayar",
		})
	}

	if !statusBIP {
		bills = append(bills, model.Tagihan{
			ID:      "BIP",
			Type:    "Biaya Investasi Pendidikan (BIP)",
			Amount:  15000000,
			DueDate: time.Now().AddDate(0, 3, 0).Format("2006-01-02"),
			Status:  "Belum Bayar",
		})
	}

	return bills
}

func (s *Service) GetTransaksi(ctx context.Context, mahasiswaID string) ([]model.Transaksi, error) {
	return s.repo.GetTransaksiByMahasiswa(ctx, mahasiswaID)
}

func (s *Service) GetActivePendingTransaksi(ctx context.Context, mahasiswaID string) (*model.Transaksi, error) {
	return s.repo.GetActivePendingTransaksi(ctx, mahasiswaID)
}

func (s *Service) Checkout(ctx context.Context, mahasiswaID string, jenisTagihan string, amount float64, nama, email string) (*model.Transaksi, error) {
	// Cek apakah ada transaksi pending yang masih aktif
	existing, err := s.repo.GetPendingTransaksiByBill(ctx, mahasiswaID, jenisTagihan)
	if err == nil && existing != nil && existing.SnapToken != nil && *existing.SnapToken != "" {
		// Validasi apakah transaksi di Midtrans masih valid (belum expire/cancel)
		midResp, midErr := s.coreClient.CheckTransaction(existing.OrderID)
		if midErr == nil && midResp != nil {
			mappedStatus := mapMidtransStatus(midResp.TransactionStatus, midResp.FraudStatus)
			if mappedStatus == "pending" {
				return existing, nil
			}
			// Jika di Midtrans sudah expire/cancel/settlement, update database
			_ = s.repo.UpdateStatusTransaksi(ctx, existing.OrderID, mappedStatus, midResp.PaymentType)
			if mappedStatus == "settlement" {
				_ = s.repo.UpdateStatusKeuanganMahasiswa(ctx, existing.OrderID)
				return existing, nil
			}
		}
	}

	// Generate Order ID unik (TRX-UUID)
	orderID := fmt.Sprintf("TRX-%s", strings.ToUpper(uuid.New().String()[:8]))

	// Buat Snap Request ke Midtrans
	req := &snap.Request{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:  orderID,
			GrossAmt: int64(amount),
		},
		CustomerDetail: &midtrans.CustomerDetails{
			FName: nama,
			Email: email,
		},
		Items: &[]midtrans.ItemDetails{
			{
				ID:    jenisTagihan,
				Name:  "Pembayaran " + jenisTagihan + " UISI",
				Price: int64(amount),
				Qty:   1,
			},
		},
		Callbacks: &snap.Callbacks{
			Finish: "http://localhost:5173/mahasiswa/uisi-pay",
		},
	}

	snapResp, snapErr := s.snapClient.CreateTransaction(req)
	if snapErr != nil {
		return nil, fmt.Errorf("gagal membuat transaksi Snap di Midtrans: %s", snapErr.GetMessage())
	}
	if snapResp == nil || snapResp.Token == "" {
		return nil, fmt.Errorf("gagal mendapatkan snap token dari Midtrans")
	}

	// Set perkiraan batas waktu 24 jam ke depan
	expiry := time.Now().Add(24 * time.Hour)

	trx := &model.Transaksi{
		MahasiswaID:  uuid.MustParse(mahasiswaID),
		OrderID:      orderID,
		JenisTagihan: jenisTagihan,
		Jumlah:       amount,
		Status:       "pending",
		SnapToken:    &snapResp.Token,
		ExpiryTime:   &expiry,
	}

	if err := s.repo.CreateTransaksi(ctx, trx); err != nil {
		return nil, err
	}

	return trx, nil
}

// VerifySignature memeriksa kecocokan SHA-512 signature key dari webhook Midtrans
func (s *Service) VerifySignature(orderID, statusCode, grossAmount, signatureKey string) bool {
	input := orderID + statusCode + grossAmount + s.serverKey
	h := sha512.New()
	h.Write([]byte(input))
	expected := hex.EncodeToString(h.Sum(nil))
	return strings.EqualFold(expected, signatureKey)
}

// SyncTransactionStatus memeriksa status langsung ke Core API Midtrans dan mengupdate DB
func (s *Service) SyncTransactionStatus(ctx context.Context, orderID string) (*model.Transaksi, error) {
	trx, err := s.repo.GetTransaksiByOrderID(ctx, orderID)
	if err != nil {
		return nil, fmt.Errorf("transaksi dengan order_id %s tidak ditemukan: %w", orderID, err)
	}

	midResp, midErr := s.coreClient.CheckTransaction(orderID)
	if midErr != nil {
		return trx, fmt.Errorf("gagal memeriksa status ke Midtrans: %s", midErr.GetMessage())
	}

	newStatus := mapMidtransStatus(midResp.TransactionStatus, midResp.FraudStatus)
	trx.Status = newStatus

	if midResp.PaymentType != "" {
		pType := midResp.PaymentType
		trx.PaymentType = &pType
		trx.MetodePembayaran = &pType
	}

	// Tangkap detail VA atau bank transfer
	if len(midResp.VaNumbers) > 0 {
		va := midResp.VaNumbers[0].VANumber
		bank := strings.ToUpper(midResp.VaNumbers[0].Bank)
		trx.VANumber = &va
		trx.Bank = &bank
	} else if midResp.PermataVaNumber != "" {
		va := midResp.PermataVaNumber
		bank := "PERMATA"
		trx.VANumber = &va
		trx.Bank = &bank
	} else if midResp.BillKey != "" {
		bKey := midResp.BillKey
		bCode := midResp.BillerCode
		bank := "MANDIRI"
		trx.BillKey = &bKey
		trx.BillerCode = &bCode
		trx.Bank = &bank
	} else if midResp.PaymentCode != "" {
		code := midResp.PaymentCode
		store := strings.ToUpper(midResp.Store)
		trx.VANumber = &code
		trx.Bank = &store
	}

	// Parsing timestamp Midtrans ("2006-01-02 15:04:05")
	if midResp.ExpiryTime != "" {
		if t, err := time.Parse("2006-01-02 15:04:05", midResp.ExpiryTime); err == nil {
			trx.ExpiryTime = &t
		}
	}
	if midResp.SettlementTime != "" {
		if t, err := time.Parse("2006-01-02 15:04:05", midResp.SettlementTime); err == nil {
			trx.SettlementTime = &t
		}
	}

	if err := s.repo.UpdatePaymentDetails(ctx, trx); err != nil {
		return nil, fmt.Errorf("gagal mengupdate detail transaksi: %w", err)
	}

	if newStatus == "settlement" {
		_ = s.repo.UpdateStatusKeuanganMahasiswa(ctx, orderID)
	}

	return trx, nil
}

// CancelTransaction membatalkan transaksi pending di Midtrans dan database
func (s *Service) CancelTransaction(ctx context.Context, orderID string) (*model.Transaksi, error) {
	trx, err := s.repo.GetTransaksiByOrderID(ctx, orderID)
	if err != nil {
		return nil, err
	}

	// Batalkan di Midtrans (jika gagal, tetap tandai cancel di DB)
	_, _ = s.coreClient.CancelTransaction(orderID)

	trx.Status = "cancel"
	if err := s.repo.UpdateStatusTransaksi(ctx, orderID, "cancel", ""); err != nil {
		return nil, err
	}

	return trx, nil
}

func (s *Service) HandleWebhook(ctx context.Context, payload map[string]interface{}) error {
	orderID, _ := payload["order_id"].(string)
	statusCode, _ := payload["status_code"].(string)
	grossAmount, _ := payload["gross_amount"].(string)
	signatureKey, _ := payload["signature_key"].(string)
	transactionStatus, _ := payload["transaction_status"].(string)
	fraudStatus, _ := payload["fraud_status"].(string)
	paymentType, _ := payload["payment_type"].(string)

	if orderID == "" {
		return fmt.Errorf("order_id tidak ditemukan dalam payload")
	}

	// Verifikasi keaslian webhook melalui signature SHA-512
	if signatureKey != "" && !s.VerifySignature(orderID, statusCode, grossAmount, signatureKey) {
		return fmt.Errorf("invalid signature key for order_id: %s", orderID)
	}

	// Lakukan sinkronisasi menyeluruh ke Midtrans
	_, err := s.SyncTransactionStatus(ctx, orderID)
	if err != nil {
		// Fallback pembaruan status sederhana jika API sync terkendala
		status := mapMidtransStatus(transactionStatus, fraudStatus)
		_ = s.repo.UpdateStatusTransaksi(ctx, orderID, status, paymentType)
		if status == "settlement" {
			_ = s.repo.UpdateStatusKeuanganMahasiswa(ctx, orderID)
		}
	}

	return nil
}

func mapMidtransStatus(trxStatus, fraudStatus string) string {
	switch trxStatus {
	case "capture":
		if fraudStatus == "challenge" {
			return "challenge"
		}
		return "settlement"
	case "settlement":
		return "settlement"
	case "pending":
		return "pending"
	case "deny":
		return "deny"
	case "cancel":
		return "cancel"
	case "expire":
		return "expire"
	default:
		return trxStatus
	}
}
