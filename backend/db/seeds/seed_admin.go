//go:build ignore

package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// 1. Load .env
	_ = godotenv.Load(".env", "../.env", "../../.env", "backend/.env")

	// 2. Koneksi database
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
	)

	db, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// 3. Hash password admin
	// Ganti "admin123" dengan password yang Anda inginkan
	password := "admin123"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}

	// 4. Insert admin user
	// Email sesuai domain kampus yang sudah kita sepakati
	query := `
		INSERT INTO users (email, password, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (email) DO NOTHING
	`
	_, err = db.Exec(context.Background(), query,
		"admin@admin.uisi.ac.id",
		string(hashedPassword),
		"admin",
	)
	if err != nil {
		log.Fatal("Failed to seed admin:", err)
	}

	fmt.Println("Admin user berhasil dibuat!")
	fmt.Println("   Email   : admin@admin.uisi.ac.id")
	fmt.Println("   Password: admin123")
	fmt.Println("   Role    : admin")
}
