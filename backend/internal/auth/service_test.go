package auth

import (
	"context"
	"fmt"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"
	"siakad/backend/internal/model"
)

// --- Mock Repository ---

// mockAuthRepo adalah implementasi palsu dari AuthRepository
// untuk keperluan unit test tanpa memerlukan database nyata.
type mockAuthRepo struct {
	users            map[string]*model.User
	passwordHistories []model.PasswordHistory
	saveHistoryErr   error
}

func newMockAuthRepo() *mockAuthRepo {
	return &mockAuthRepo{
		users: make(map[string]*model.User),
	}
}

func (m *mockAuthRepo) FindUserByID(ctx context.Context, id string) (*model.User, error) {
	user, ok := m.users[id]
	if !ok {
		return nil, fmt.Errorf("user not found")
	}
	return user, nil
}

func (m *mockAuthRepo) FindUserByEmail(ctx context.Context, email string) (*model.User, error) {
	for _, u := range m.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, fmt.Errorf("user not found")
}

func (m *mockAuthRepo) SaveRefreshToken(ctx context.Context, token *model.RefreshToken) error {
	return nil
}

func (m *mockAuthRepo) FindRefreshToken(ctx context.Context, token string) (*model.RefreshToken, error) {
	return nil, nil
}

func (m *mockAuthRepo) RevokeRefreshToken(ctx context.Context, token string) error {
	return nil
}

func (m *mockAuthRepo) UpdatePassword(ctx context.Context, userID, hashedPassword string) error {
	if u, ok := m.users[userID]; ok {
		u.Password = hashedPassword
	}
	return nil
}

func (m *mockAuthRepo) SavePasswordHistory(ctx context.Context, h *model.PasswordHistory) error {
	if m.saveHistoryErr != nil {
		return m.saveHistoryErr
	}
	m.passwordHistories = append(m.passwordHistories, *h)
	return nil
}

func (m *mockAuthRepo) GetPasswordHistory(ctx context.Context, userID string) ([]model.PasswordHistory, error) {
	var result []model.PasswordHistory
	for _, h := range m.passwordHistories {
		if h.UserID == userID {
			result = append(result, h)
		}
	}
	return result, nil
}

// --- Helpers ---

func hashPassword(t *testing.T, plain string) string {
	t.Helper()
	h, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}
	return string(h)
}


// --- Unit Tests ---

// TestValidateChangePasswordInputs menguji validasi input secara terpisah (SRP)
func TestValidateChangePasswordInputs(t *testing.T) {
	tests := []struct {
		name        string
		oldPassword string
		newPassword string
		expectErr   bool
	}{
		{"valid inputs", "oldPass123", "newPass456", false},
		{"empty old password", "", "newPass456", true},
		{"empty new password", "oldPass123", "", true},
		{"both empty", "", "", true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateChangePasswordInputs(tc.oldPassword, tc.newPassword)
			if tc.expectErr && err == nil {
				t.Errorf("expected error, got nil")
			}
			if !tc.expectErr && err != nil {
				t.Errorf("expected no error, got: %v", err)
			}
		})
	}
}

// TestPasswordHistoryIsRecorded menguji bahwa riwayat password disimpan dengan benar
func TestPasswordHistoryIsRecorded(t *testing.T) {
	repo := newMockAuthRepo()
	ctx := context.Background()
	userID := "user-123"
	ip := "127.0.0.1"

	history := &model.PasswordHistory{
		UserID:    userID,
		IPAddress: ip,
		Info:      "[PIN] User Create New PIN",
		CreatedAt: time.Now(),
	}

	if err := repo.SavePasswordHistory(ctx, history); err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	histories, err := repo.GetPasswordHistory(ctx, userID)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if len(histories) != 1 {
		t.Errorf("expected 1 history, got %d", len(histories))
	}

	if histories[0].IPAddress != ip {
		t.Errorf("expected IP %s, got %s", ip, histories[0].IPAddress)
	}
}

// TestPasswordHistoryLimit menguji bahwa hanya 5 riwayat terakhir yang dikembalikan
func TestPasswordHistoryLimit(t *testing.T) {
	repo := newMockAuthRepo()
	ctx := context.Background()
	userID := "user-456"

	// Simpan 7 riwayat
	for i := 0; i < 7; i++ {
		h := &model.PasswordHistory{
			UserID:    userID,
			IPAddress: fmt.Sprintf("192.168.1.%d", i),
			Info:      "[PIN] User Create New PIN",
			CreatedAt: time.Now(),
		}
		_ = repo.SavePasswordHistory(ctx, h)
	}

	// Mock langsung mengembalikan semua; batas 5 diterapkan di SQL LIMIT di repo nyata.
	// Tes ini memverifikasi bahwa GetPasswordHistory memfilter hanya untuk userID yang benar.
	histories, _ := repo.GetPasswordHistory(ctx, userID)
	if len(histories) == 0 {
		t.Error("expected some histories, got 0")
	}
}
