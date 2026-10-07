-- Menambahkan detail payment gateway untuk transaksi Midtrans
ALTER TABLE transaksi
ADD COLUMN IF NOT EXISTS va_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS bank VARCHAR(50),
ADD COLUMN IF NOT EXISTS bill_key VARCHAR(50),
ADD COLUMN IF NOT EXISTS biller_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS expiry_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS settlement_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

COMMENT ON COLUMN transaksi.va_number IS 'Nomor Virtual Account bank transfer';
COMMENT ON COLUMN transaksi.bank IS 'Nama bank tujuan transfer (bca, bni, bri, mandiri, permata, dll)';
COMMENT ON COLUMN transaksi.bill_key IS 'Bill key untuk Mandiri Bill Payment';
COMMENT ON COLUMN transaksi.biller_code IS 'Biller code untuk Mandiri Bill Payment';
COMMENT ON COLUMN transaksi.payment_type IS 'Tipe pembayaran Midtrans (bank_transfer, qris, cstore, dll)';
COMMENT ON COLUMN transaksi.expiry_time IS 'Batas waktu kedaluwarsa pembayaran';
COMMENT ON COLUMN transaksi.settlement_time IS 'Waktu transaksi lunas/settled';
COMMENT ON COLUMN transaksi.pdf_url IS 'Tautan petunjuk pembayaran (PDF)';
