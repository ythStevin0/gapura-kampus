package model

import (
	"time"

	"github.com/google/uuid"
)

type Mahasiswa struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	UserID        uuid.UUID  `json:"user_id" db:"user_id"`
	NIM           string     `json:"nim" db:"nim"`
	NamaLengkap   string     `json:"nama_lengkap" db:"nama_lengkap"`
	ProgramStudi  string     `json:"program_studi" db:"program_studi"`
	Angkatan      int        `json:"angkatan" db:"angkatan"`
	JalurMasuk    *string    `json:"jalur_masuk" db:"jalur_masuk"`
	StatusUKT     bool       `json:"status_ukt" db:"status_ukt"`
	StatusBIP     bool       `json:"status_bip" db:"status_bip"`
	IzinKRS       bool       `json:"izin_krs" db:"izin_krs"`
	DosenWaliID   *uuid.UUID `json:"dosen_wali_id" db:"dosen_wali_id"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`

	// Field virtual dari JOIN
	NamaDosenWali string `json:"nama_dosen_wali,omitempty" db:"-"`
}

type Dosen struct {
	ID            uuid.UUID `json:"id" db:"id"`
	UserID        uuid.UUID `json:"user_id" db:"user_id"`
	NIDN          string    `json:"nidn" db:"nidn"`
	NamaLengkap   string    `json:"nama_lengkap" db:"nama_lengkap"`
	GelarDepan    *string   `json:"gelar_depan" db:"gelar_depan"`
	GelarBelakang *string   `json:"gelar_belakang" db:"gelar_belakang"`
	Departemen    string    `json:"departemen" db:"departemen"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

type MataKuliah struct {
	ID           uuid.UUID `json:"id" db:"id"`
	KodeMK       string    `json:"kode_mk" db:"kode_mk"`
	NamaMK       string    `json:"nama_mk" db:"nama_mk"`
	SKS          int       `json:"sks" db:"sks"`
	Semester     int       `json:"semester" db:"semester"`
	ProgramStudi string    `json:"program_studi" db:"program_studi"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// KelasStatus merepresentasikan status ketersediaan kelas
type KelasStatus string

const (
	KelasStatusBuka   KelasStatus = "buka"
	KelasStatusTutup  KelasStatus = "tutup"
)

// Kelas merepresentasikan satu sesi perkuliahan dari sebuah mata kuliah
type Kelas struct {
	ID               uuid.UUID `json:"id" db:"id"`
	MataKuliahID     uuid.UUID `json:"mata_kuliah_id" db:"mata_kuliah_id"`
	DosenID          uuid.UUID `json:"dosen_id" db:"dosen_id"`
	KodeKelas        string    `json:"kode_kelas" db:"kode_kelas"`
	Hari             string    `json:"hari" db:"hari"`
	JamMulai         string    `json:"jam_mulai" db:"jam_mulai"`
	JamSelesai       string    `json:"jam_selesai" db:"jam_selesai"`
	Ruangan          string    `json:"ruangan" db:"ruangan"`
	Kapasitas        int       `json:"kapasitas" db:"kapasitas"`
	SemesterAkademik string    `json:"semester_akademik" db:"semester_akademik"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`

	// Field tambahan dari JOIN, tidak disimpan di DB
	NamaMataKuliah string `json:"nama_mata_kuliah,omitempty" db:"-"`
	NamaDosen      string `json:"nama_dosen,omitempty" db:"-"`
	SKS            int    `json:"sks,omitempty" db:"-"`
	Terisi         int    `json:"terisi,omitempty" db:"-"`
}

// KRSStatus merepresentasikan alur persetujuan KRS
type KRSStatus string

const (
	KRSStatusPending   KRSStatus = "pending"
	KRSStatusDisetujui KRSStatus = "disetujui"
	KRSStatusDitolak   KRSStatus = "ditolak"
)

// KRS merepresentasikan rencana studi mahasiswa untuk satu kelas di satu semester
type KRS struct {
	ID               uuid.UUID `json:"id" db:"id"`
	MahasiswaID      uuid.UUID `json:"mahasiswa_id" db:"mahasiswa_id"`
	KelasID          uuid.UUID `json:"kelas_id" db:"kelas_id"`
	SemesterAkademik string    `json:"semester_akademik" db:"semester_akademik"`
	Status           KRSStatus `json:"status" db:"status"`
	Catatan          *string   `json:"catatan" db:"catatan"` // Catatan penolakan dari dosen wali
	NilaiTugas       *float64  `json:"nilai_tugas,omitempty" db:"nilai_tugas"`
	NilaiUTS         *float64  `json:"nilai_uts,omitempty" db:"nilai_uts"`
	NilaiUAS         *float64  `json:"nilai_uas,omitempty" db:"nilai_uas"`
	NilaiAkhir       *float64  `json:"nilai_akhir,omitempty" db:"nilai_akhir"`
	NilaiHuruf       *string   `json:"nilai_huruf,omitempty" db:"nilai_huruf"`
	Bobot            *float64  `json:"bobot,omitempty" db:"bobot"`
	StatusNilai      string    `json:"status_nilai" db:"status_nilai"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`

	// Field tambahan dari JOIN, tidak disimpan di DB
	KodeMK         string `json:"kode_mk,omitempty" db:"-"`
	NamaMataKuliah string `json:"nama_mata_kuliah,omitempty" db:"-"`
	KodeKelas      string `json:"kode_kelas,omitempty" db:"-"`
	SKS            int    `json:"sks,omitempty" db:"-"`
	Hari           string `json:"hari,omitempty" db:"-"`
	JamMulai       string `json:"jam_mulai,omitempty" db:"-"`
	JamSelesai     string `json:"jam_selesai,omitempty" db:"-"`
	NamaDosen      string `json:"nama_dosen,omitempty" db:"-"`
}

// KHSItem merepresentasikan satu baris mata kuliah di KHS
type KHSItem struct {
	KRSID         uuid.UUID `json:"krs_id"`
	KodeMK        string    `json:"kode_mk"`
	NamaMK        string    `json:"nama_mk"`
	KodeKelas     string    `json:"kode_kelas"`
	SKS           int       `json:"sks"`
	NilaiTugas    *float64  `json:"nilai_tugas,omitempty"`
	NilaiUTS      *float64  `json:"nilai_uts,omitempty"`
	NilaiUAS      *float64  `json:"nilai_uas,omitempty"`
	NilaiAkhir    *float64  `json:"nilai_akhir,omitempty"`
	NilaiHuruf    string    `json:"nilai_huruf"`
	Bobot         float64   `json:"bobot"`
	TotalSKSBobot float64   `json:"total_sks_bobot"` // SKS * Bobot
	StatusNilai   string    `json:"status_nilai"`
}

// KHSResponse menyajikan Kartu Hasil Studi per semester beserta IPS & IPK
type KHSResponse struct {
	NIM               string    `json:"nim"`
	NamaLengkap       string    `json:"nama_lengkap"`
	ProgramStudi      string    `json:"program_studi"`
	SemesterAkademik  string    `json:"semester_akademik"`
	Items             []KHSItem `json:"items"`
	TotalSKSSemester  int       `json:"total_sks_semester"`
	TotalBobotSemester float64  `json:"total_bobot_semester"`
	IPS               float64   `json:"ips"` // Indeks Prestasi Semester
	TotalSKSKumulatif int       `json:"total_sks_kumulatif"`
	IPK               float64   `json:"ipk"` // Indeks Prestasi Kumulatif
	MaxSKSDepan       int       `json:"max_sks_depan"`
}

// TranskripItem merepresentasikan satu baris transkrip nilai
type TranskripItem struct {
	KodeMK           string  `json:"kode_mk"`
	NamaMK           string  `json:"nama_mk"`
	SKS              int     `json:"sks"`
	NilaiHuruf       string  `json:"nilai_huruf"`
	Bobot            float64 `json:"bobot"`
	TotalBobot       float64 `json:"total_bobot"`
	SemesterAkademik string  `json:"semester_akademik"`
	Lulus            bool    `json:"lulus"`
}

// TranskripSemester grouping transkrip per semester
type TranskripSemester struct {
	SemesterAkademik string          `json:"semester_akademik"`
	Items            []TranskripItem `json:"items"`
	TotalSKS         int             `json:"total_sks"`
	IPS              float64         `json:"ips"`
}

// TranskripResponse mengembalikan transkrip kumulatif lengkap
type TranskripResponse struct {
	NIM             string              `json:"nim"`
	NamaLengkap     string              `json:"nama_lengkap"`
	ProgramStudi    string              `json:"program_studi"`
	Semesters       []TranskripSemester `json:"semesters"`
	TotalSKSTempuh  int                 `json:"total_sks_tempuh"`
	TotalSKSLulus   int                 `json:"total_sks_lulus"`
	TotalBobot      float64             `json:"total_bobot"`
	IPK             float64             `json:"ipk"`
}

// MahasiswaNilaiKelasItem daftar mahasiswa dalam satu kelas untuk input nilai dosen
type MahasiswaNilaiKelasItem struct {
	KRSID       uuid.UUID `json:"krs_id"`
	MahasiswaID uuid.UUID `json:"mahasiswa_id"`
	NIM         string    `json:"nim"`
	NamaLengkap string    `json:"nama_lengkap"`
	NilaiTugas  *float64  `json:"nilai_tugas"`
	NilaiUTS    *float64  `json:"nilai_uts"`
	NilaiUAS    *float64  `json:"nilai_uas"`
	NilaiAkhir  *float64  `json:"nilai_akhir"`
	NilaiHuruf  *string   `json:"nilai_huruf"`
	Bobot       *float64  `json:"bobot"`
	StatusNilai string    `json:"status_nilai"`
}

// InputNilaiItem baris nilai satu mahasiswa
type InputNilaiItem struct {
	KRSID      string  `json:"krs_id"`
	NilaiTugas float64 `json:"nilai_tugas"`
	NilaiUTS   float64 `json:"nilai_uts"`
	NilaiUAS   float64 `json:"nilai_uas"`
}

// InputNilaiRequest payload input nilai satu kelas oleh dosen
type InputNilaiRequest struct {
	KelasID string           `json:"kelas_id"`
	Nilai   []InputNilaiItem `json:"nilai"`
	Publish bool             `json:"publish"`
}
