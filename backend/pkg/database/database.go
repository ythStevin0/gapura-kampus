package database

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

// NewPool membuat connection pool ke PostgreSQL
// Menggunakan pgxpool agar koneksi bisa dipakai ulang
// oleh banyak request secara bersamaan
func NewPool(logger *zap.Logger) (*pgxpool.Pool, error) { //
	// Ambil konfigurasi dari .env via godotenv
	dsn := fmt.Sprintf( 
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", 
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
	)

	// Konfigurasi pool
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to parse db config: %w", err)
	}

	// Maksimal 25 koneksi aktif sekaligus.
	// Ditingkatkan dari 10 karena goroutine concurrent queries membutuhkan
	// lebih banyak koneksi tersedia di pool secara bersamaan.
	// Minimal 5 koneksi selalu siap standby untuk menghindari cold-start.
	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 30 * time.Minute
	// Health check setiap 1 menit — deteksi koneksi yang sudah mati
	// sebelum dipakai oleh goroutine (mencegah error di runtime)
	config.HealthCheckPeriod = 1 * time.Minute

	// Prepared Statement Cache (pgx v5 default behavior):
	// ───────────────────────────────────────────────────────
	// pgx v5 secara default menggunakan QueryExecModeCacheDescribe,
	// yang berarti SETIAP query otomatis di-cache sebagai prepared statement.
	//
	// Cara kerjanya:
	//   1. Query pertama: PostgreSQL mem-parse & merencanakan query → disimpan di cache
	//   2. Query berikutnya (parameter berbeda): LANGSUNG eksekusi tanpa parse/plan ulang
	//
	// Contoh nyata di proyek ini:
	//   - "SELECT * FROM mata_kuliah WHERE id = $1" → di-parse sekali
	//   - Panggilan ke-2 dengan id berbeda → skip parse, langsung eksekusi (lebih cepat)
	//
	// Kita set StatementCacheCapacity = 256 agar cukup untuk seluruh query di proyek ini.
	// (Default pgx = 512, kita turunkan karena proyek ini belum sebesar itu)
	config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeCacheDescribe
	config.ConnConfig.StatementCacheCapacity = 256

	// Buat pool koneksi
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("failed to create pool: %w", err)
	}

	// Test koneksi — pastikan database benar-benar bisa dijangkau
	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logger.Info("Database connected successfully",
		zap.String("host", os.Getenv("DB_HOST")),
		zap.String("dbname", os.Getenv("DB_NAME")),
	)

	return pool, nil
}