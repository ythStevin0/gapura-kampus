package cache

import (
	"sync"
	"time"
)

// TTL presets — gunakan ini agar konsisten di seluruh codebase.
const (
	// TTLShort untuk data yang sering berubah (misal: stats dashboard)
	TTLShort = 1 * time.Minute
	// TTLMedium untuk data yang cukup stabil (misal: admin stats)
	TTLMedium = 2 * time.Minute
	// TTLLong untuk data yang jarang berubah (misal: daftar mata kuliah)
	TTLLong = 5 * time.Minute
)

// Item mewakili satu entry di dalam cache beserta waktu kedaluwarsanya.
type Item struct {
	Value     interface{}
	ExpiresAt time.Time
}

// IsExpired mengecek apakah item ini sudah kedaluwarsa.
func (i *Item) IsExpired() bool {
	return time.Now().After(i.ExpiresAt)
}

// Cache adalah in-memory cache yang thread-safe menggunakan sync.RWMutex.
// Dirancang untuk data yang jarang berubah namun sering dibaca (read-heavy),
// seperti daftar mata kuliah, statistik dashboard, dll.
//
// Menggunakan RWMutex agar banyak goroutine bisa membaca secara bersamaan
// (tidak saling blocking), namun operasi tulis (Set/Invalidate) tetap eksklusif.
type Cache struct {
	items map[string]*Item
	mu    sync.RWMutex
}

// New membuat instance Cache baru.
func New() *Cache {
	c := &Cache{
		items: make(map[string]*Item),
	}
	// Jalankan goroutine pembersih di background
	// untuk menghapus item yang sudah expired setiap 5 menit
	go c.janitor(5 * time.Minute)
	return c
}

// Set menyimpan value ke cache dengan durasi kedaluwarsa tertentu.
// Jika key sudah ada, value-nya akan ditimpa.
func (c *Cache) Set(key string, value interface{}, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items[key] = &Item{
		Value:     value,
		ExpiresAt: time.Now().Add(ttl),
	}
}

// Get mengambil value dari cache berdasarkan key.
// Mengembalikan (value, true) jika ditemukan dan belum expired,
// atau (nil, false) jika tidak ditemukan atau sudah expired.
func (c *Cache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, exists := c.items[key]
	if !exists || item.IsExpired() {
		return nil, false
	}
	return item.Value, true
}

// Invalidate menghapus satu key dari cache.
// Dipanggil saat data berubah (Create/Update/Delete) agar
// request berikutnya mengambil data terbaru dari database.
func (c *Cache) Invalidate(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.items, key)
}

// InvalidatePrefix menghapus semua key yang diawali prefix tertentu.
// Berguna saat data berubah dan kita perlu menghapus semua halaman
// pagination yang terkait. Misal: InvalidatePrefix("matkul:") akan
// menghapus "matkul:page:1", "matkul:page:2", "matkul:all", dst.
func (c *Cache) InvalidatePrefix(prefix string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	for key := range c.items {
		if len(key) >= len(prefix) && key[:len(prefix)] == prefix {
			delete(c.items, key)
		}
	}
}

// janitor berjalan di background goroutine untuk membersihkan
// item-item yang sudah expired secara periodik.
// Ini mencegah memory leak dari item yang tidak pernah diakses lagi.
func (c *Cache) janitor(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		for key, item := range c.items {
			if item.IsExpired() {
				delete(c.items, key)
			}
		}
		c.mu.Unlock()
	}
}
