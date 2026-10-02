CREATE TABLE transaksi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mahasiswa_id UUID NOT NULL REFERENCES mahasiswa(id) ON DELETE CASCADE,
    order_id VARCHAR(50) NOT NULL UNIQUE,
    jenis_tagihan VARCHAR(50) NOT NULL, -- e.g., 'UKT', 'BIP'
    jumlah NUMERIC(15,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, settlement, cancel, expire
    metode_pembayaran VARCHAR(50),
    snap_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaksi_mahasiswa ON transaksi(mahasiswa_id);
CREATE INDEX idx_transaksi_order_id ON transaksi(order_id);
