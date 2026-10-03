CREATE TABLE buku (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul VARCHAR(255) NOT NULL,
    penulis VARCHAR(255) NOT NULL,
    penerbit VARCHAR(255),
    tahun_terbit INT,
    isbn VARCHAR(50),
    stok INT NOT NULL DEFAULT 0,
    cover_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE peminjaman_buku (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buku_id UUID NOT NULL REFERENCES buku(id) ON DELETE CASCADE,
    tanggal_pinjam DATE NOT NULL DEFAULT CURRENT_DATE,
    tenggat_waktu DATE NOT NULL,
    tanggal_kembali DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Menunggu', -- Menunggu, Dipinjam, Selesai, Terlambat
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_buku_judul ON buku(judul);
CREATE INDEX idx_peminjaman_user ON peminjaman_buku(user_id);
CREATE INDEX idx_peminjaman_status ON peminjaman_buku(status);
