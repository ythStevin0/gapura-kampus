package kelas

import (
	"context"

	"siakad/backend/internal/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetAll(ctx context.Context) ([]model.Kelas, error) {
	query := `
		SELECT 
			k.id, k.mata_kuliah_id, k.dosen_id, k.kode_kelas, k.hari, 
			k.jam_mulai, k.jam_selesai, k.ruangan, k.kapasitas, k.semester_akademik,
			k.created_at, k.updated_at,
			mk.nama_mk AS nama_mata_kuliah, mk.sks,
			d.nama_lengkap AS nama_dosen,
			(SELECT COUNT(*) FROM krs WHERE krs.kelas_id = k.id AND krs.status != 'ditolak') AS terisi
		FROM kelas k
		JOIN mata_kuliah mk ON k.mata_kuliah_id = mk.id
		JOIN dosen d ON k.dosen_id = d.id
		ORDER BY k.semester_akademik DESC, mk.nama_mk ASC, k.kode_kelas ASC
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.Kelas
	for rows.Next() {
		var k model.Kelas
		err := rows.Scan(
			&k.ID, &k.MataKuliahID, &k.DosenID, &k.KodeKelas, &k.Hari,
			&k.JamMulai, &k.JamSelesai, &k.Ruangan, &k.Kapasitas, &k.SemesterAkademik,
			&k.CreatedAt, &k.UpdatedAt,
			&k.NamaMataKuliah, &k.SKS, &k.NamaDosen, &k.Terisi,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, k)
	}
	return list, nil
}

func (r *Repository) Create(ctx context.Context, k *model.Kelas) error {
	query := `
		INSERT INTO kelas (mata_kuliah_id, dosen_id, kode_kelas, hari, jam_mulai, jam_selesai, ruangan, kapasitas, semester_akademik)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query,
		k.MataKuliahID, k.DosenID, k.KodeKelas, k.Hari, k.JamMulai, k.JamSelesai, k.Ruangan, k.Kapasitas, k.SemesterAkademik,
	).Scan(&k.ID, &k.CreatedAt, &k.UpdatedAt)
}

func (r *Repository) Update(ctx context.Context, k *model.Kelas) error {
	query := `
		UPDATE kelas 
		SET mata_kuliah_id = $1, dosen_id = $2, kode_kelas = $3, hari = $4, 
		    jam_mulai = $5, jam_selesai = $6, ruangan = $7, kapasitas = $8, semester_akademik = $9, updated_at = NOW()
		WHERE id = $10
		RETURNING updated_at
	`
	return r.db.QueryRow(ctx, query,
		k.MataKuliahID, k.DosenID, k.KodeKelas, k.Hari, k.JamMulai, k.JamSelesai, k.Ruangan, k.Kapasitas, k.SemesterAkademik, k.ID,
	).Scan(&k.UpdatedAt)
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM kelas WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}
