package util

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
)

// GenerateSecurePassword membuat password unik dan aman untuk setiap user.
// Format: {Prefix}{4 huruf acak}{2 angka acak}{1 simbol acak}
// Contoh untuk NIM "2024001": Mhs#AbcD47!
// Contoh untuk NIDN "1234567890": Dsn#XyZk19!
// Menghasilkan password 12-14 karakter yang unik per user.
func GenerateSecurePassword(identifier string, role string) string {
	var prefix string
	switch role {
	case "mahasiswa":
		prefix = "Mhs"
	case "dosen":
		prefix = "Dsn"
	case "admin":
		prefix = "Adm"
	default:
		prefix = "Usr"
	}

	// Ambil 2-3 digit terakhir dari identifier (NIM/NIDN) untuk keunikan
	idSuffix := identifier
	if len(idSuffix) > 3 {
		idSuffix = idSuffix[len(idSuffix)-3:]
	}

	// Generate 4 random huruf (campuran besar-kecil)
	letters := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	randomLetters := make([]byte, 4)
	for i := range randomLetters {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		randomLetters[i] = letters[n.Int64()]
	}

	// Generate 2 random digit
	digits := "0123456789"
	randomDigits := make([]byte, 2)
	for i := range randomDigits {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		randomDigits[i] = digits[n.Int64()]
	}

	// Generate 1 random simbol
	symbols := "!@#$%&*"
	symIdx, _ := rand.Int(rand.Reader, big.NewInt(int64(len(symbols))))
	symbol := symbols[symIdx.Int64()]

	return fmt.Sprintf("%s#%s%s%s%c", prefix, idSuffix, string(randomLetters), string(randomDigits), symbol)
}

// GenerateRandomPassword membuat password acak murni (fallback).
// Panjang 12 karakter, kombinasi huruf besar, kecil, angka, simbol.
func GenerateRandomPassword() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*"
	password := make([]byte, 12)

	// Pastikan minimal ada 1 huruf besar, 1 kecil, 1 angka, 1 simbol
	upper := "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	lower := "abcdefghijklmnopqrstuvwxyz"
	digit := "0123456789"
	sym := "!@#$%&*"

	pickRandom := func(s string) byte {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(s))))
		return s[n.Int64()]
	}

	password[0] = pickRandom(upper)
	password[1] = pickRandom(lower)
	password[2] = pickRandom(digit)
	password[3] = pickRandom(sym)

	for i := 4; i < 12; i++ {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		password[i] = charset[n.Int64()]
	}

	// Shuffle password agar posisi karakter wajib tidak bisa ditebak
	shuffled := make([]byte, len(password))
	perm := make([]int, len(password))
	for i := range perm {
		perm[i] = i
	}
	for i := len(perm) - 1; i > 0; i-- {
		j, _ := rand.Int(rand.Reader, big.NewInt(int64(i+1)))
		perm[i], perm[j.Int64()] = perm[j.Int64()], perm[i]
	}
	for i, v := range perm {
		shuffled[i] = password[v]
	}

	return string(shuffled)
}

// ValidatePasswordStrength memeriksa apakah password memenuhi standar keamanan minimum.
// Rules: minimal 8 karakter, ada huruf besar, huruf kecil, angka.
func ValidatePasswordStrength(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("password minimal 8 karakter")
	}

	var hasUpper, hasLower, hasDigit bool
	for _, c := range password {
		switch {
		case c >= 'A' && c <= 'Z':
			hasUpper = true
		case c >= 'a' && c <= 'z':
			hasLower = true
		case c >= '0' && c <= '9':
			hasDigit = true
		}
	}

	var missing []string
	if !hasUpper {
		missing = append(missing, "huruf besar")
	}
	if !hasLower {
		missing = append(missing, "huruf kecil")
	}
	if !hasDigit {
		missing = append(missing, "angka")
	}

	if len(missing) > 0 {
		return fmt.Errorf("password harus mengandung %s", strings.Join(missing, ", "))
	}

	return nil
}
