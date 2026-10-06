package payment

import (
	"context"
	"fmt"
	"time"

	"siakad/backend/internal/model"

	"github.com/google/uuid"
	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/coreapi"
	"github.com/midtrans/midtrans-go/snap"
)

type Service struct {
	repo       *Repository
	snapClient snap.Client
	coreClient coreapi.Client
}

func NewService(repo *Repository) *Service {
	// Setup Midtrans Client
	var s snap.Client
	s.New("SB-Mid-server-xR7wz-F8aVqg-B_mSnhZ3e3n", midtrans.Sandbox)
	
	var c coreapi.Client
	c.New("SB-Mid-server-xR7wz-F8aVqg-B_mSnhZ3e3n", midtrans.Sandbox)
	
	return &Service{
		repo:       repo,
		snapClient: s,
		coreClient: c,
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

func (s *Service) Checkout(ctx context.Context, mahasiswaID string, jenisTagihan string, amount float64, nama, email string) (*model.Transaksi, error) {
	// Optimasi: Jangan panggil external service berulang kali jika sudah ada transaksi pending dengan token aktif
	existing, err := s.repo.GetPendingTransaksiByBill(ctx, mahasiswaID, jenisTagihan)
	if err == nil && existing != nil && existing.SnapToken != nil && *existing.SnapToken != "" {
		return existing, nil
	}

	// Generate Order ID (TRX-UUID)
	orderID := fmt.Sprintf("TRX-%s", uuid.New().String()[:8])

	// Create Midtrans Snap Request (External Service)
	req := &snap.Request{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:  orderID,
			GrossAmt: int64(amount),
		},
		CustomerDetail: &midtrans.CustomerDetails{
			FName: nama,
			Email: email,
		},
	}

	snapResp, err := s.snapClient.CreateTransaction(req)
	if err != nil {
		return nil, err
	}

	// Simpan ke database
	trx := &model.Transaksi{
		MahasiswaID:  uuid.MustParse(mahasiswaID),
		OrderID:      orderID,
		JenisTagihan: jenisTagihan,
		Jumlah:       amount,
		Status:       "pending",
		SnapToken:    &snapResp.Token,
	}

	dbErr := s.repo.CreateTransaksi(ctx, trx)
	if dbErr != nil {
		return nil, dbErr
	}

	return trx, nil
}

func (s *Service) HandleWebhook(ctx context.Context, orderID string, transactionStatus string, fraudStatus string, paymentType string) error {
	// Logika status mapping Midtrans
	status := "pending"
	
	if transactionStatus == "capture" {
		if fraudStatus == "challenge" {
			status = "challenge"
		} else if fraudStatus == "accept" {
			status = "settlement"
		}
	} else if transactionStatus == "settlement" {
		status = "settlement"
	} else if transactionStatus == "cancel" || transactionStatus == "expire" || transactionStatus == "deny" {
		status = "cancel"
	}

	// Update transaksi
	err := s.repo.UpdateStatusTransaksi(ctx, orderID, status, paymentType)
	if err != nil {
		return err
	}

	// Jika sukses, update status keuangan mahasiswa (UKT / BIP)
	if status == "settlement" {
		return s.repo.UpdateStatusKeuanganMahasiswa(ctx, orderID)
	}

	return nil
}
