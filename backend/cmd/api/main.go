package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
	"go.uber.org/zap"

	"siakad/backend/internal/admin"
	"siakad/backend/internal/akademik"
	"siakad/backend/internal/auth"
	"siakad/backend/internal/berita"
	"siakad/backend/internal/dosen"
	"siakad/backend/internal/dosenWali"
	"siakad/backend/internal/kelas"
	"siakad/backend/internal/mahakarya"
	"siakad/backend/internal/mahasiswa"
	"siakad/backend/internal/middleware"
	"siakad/backend/internal/model"
	"siakad/backend/internal/payment"
	"siakad/backend/internal/pesan"
	"siakad/backend/pkg/cache"
	"siakad/backend/pkg/database"
	"siakad/backend/pkg/response"
)

func main() {
	// 1. Load .env
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	// 2. Init logger
	logger, err := zap.NewDevelopment()
	if err != nil {
		log.Fatal("Error initializing logger")
	}
	defer logger.Sync()

	// 3. Koneksi database
	db, err := database.NewPool(logger)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// 3.1 Jalankan Migrasi Otomatis
	if err := database.RunMigrations(db, logger); err != nil {
		logger.Fatal("Failed to run migrations", zap.Error(err))
	}

	// 4. Init in-memory cache
	appCache := cache.New()
	logger.Info("In-memory cache initialized")

	// 5. Init semua domain (Domain-Driven)

	// Auth
	authRepo := auth.NewAuthRepository(db)
	authService := auth.NewAuthService(authRepo, os.Getenv("JWT_SECRET"))
	authHandler := auth.NewAuthHandler(authService, logger)

	// Admin (Stats, MK, Search)
	adminRepo := admin.NewRepository(db, appCache)
	adminService := admin.NewService(adminRepo)

	// Mahasiswa
	mahasiswaRepo := mahasiswa.NewRepository(db)
	mahasiswaService := mahasiswa.NewService(mahasiswaRepo)
	mahasiswaHandler := mahasiswa.NewHandler(mahasiswaService, logger)

	// Dosen Wali
	dosenWaliRepo := dosenWali.NewRepository(db)
	dosenWaliService := dosenWali.NewService(dosenWaliRepo)
	dosenWaliHandler := dosenWali.NewHandler(dosenWaliService, logger)

	// Dosen
	dosenRepo := dosen.NewRepository(db)
	dosenService := dosen.NewService(dosenRepo)
	dosenHandler := dosen.NewHandler(dosenService, mahasiswaService, dosenWaliService, logger)

	// Mahakarya
	mahakaryaRepo := mahakarya.NewRepository(db)
	mahakaryaService := mahakarya.NewService(mahakaryaRepo, mahasiswaService, dosenService)
	mahakaryaHandler := mahakarya.NewHandler(mahakaryaService, logger)

	// 5. Init router

	// Pesan
	pesanRepo := pesan.NewRepository(db)
	pesanService := pesan.NewService(pesanRepo)
	pesanHandler := pesan.NewHandler(pesanService, logger)

	// Admin Handler
	adminHandler := admin.NewHandler(adminService, logger)

	beritaRepo := berita.NewRepository(db)
	beritaService := berita.NewService(beritaRepo)
	beritaHandler := berita.NewHandler(beritaService, logger)

	// Akademik (Kelas, KRS)
	akademikRepo := akademik.NewRepository(db)
	akademikService := akademik.NewService(akademikRepo, mahasiswaRepo)
	akademikHandler := akademik.NewHandler(akademikService)

	kelasRepo := kelas.NewRepository(db)
	kelasService := kelas.NewService(kelasRepo)
	kelasHandler := kelas.NewHandler(kelasService, logger)

	paymentRepo := payment.NewRepository(db)
	paymentService := payment.NewService(paymentRepo)
	paymentHandler := payment.NewHandler(paymentService, mahasiswaRepo, logger)

	// 5. Init router
	r := chi.NewRouter()

	// 5.1 Set up CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://127.0.0.1:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)

	// 6. Health check
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		if err := db.Ping(r.Context()); err != nil {
			response.Error(w, http.StatusServiceUnavailable, "Database unreachable", err.Error())
			return
		}
		response.Success(w, http.StatusOK, "SIAKAD API is running", map[string]string{
			"database": "connected",
		})
	})

	// 7. Route Auth
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/login", authHandler.Login)
		r.Post("/refresh", authHandler.Refresh)
		r.Post("/logout", authHandler.Logout)

		// Protected Auth Routes (membutuhkan login)
		r.Group(func(r chi.Router) {
			r.Use(middleware.Authenticate(os.Getenv("JWT_SECRET"), logger))
			r.Post("/change-password", authHandler.ChangePassword)
			r.Get("/password-history", authHandler.GetPasswordHistory)
		})
	})

	// 8. Route User (Search & Public Dosen List)
	r.Route("/api/users", func(r chi.Router) {
		r.Use(middleware.Authenticate(os.Getenv("JWT_SECRET"), logger))
		r.Get("/search", adminHandler.SearchUsers)
		r.Get("/dosen", dosenHandler.GetAllDosen)
	})

	// 9. Route Admin
	r.Route("/api/admin", func(r chi.Router) {
		r.Use(middleware.Authenticate(os.Getenv("JWT_SECRET"), logger))
		r.Use(middleware.RequireRole(model.RoleAdmin))

		r.Get("/stats", adminHandler.GetAdminStats)

		// Mahasiswa
		r.Get("/mahasiswa", mahasiswaHandler.GetAllMahasiswa)
		r.Post("/mahasiswa", mahasiswaHandler.Create)
		r.Put("/mahasiswa/{id}", mahasiswaHandler.Update)
		r.Delete("/mahasiswa/{id}", mahasiswaHandler.Delete)
		r.Put("/mahasiswa/{id}/assign-dosen-wali", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			var req struct {
				DosenID string `json:"dosen_id"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.DosenID == "" {
				response.Error(w, http.StatusBadRequest, "dosen_id wajib diisi", "")
				return
			}
			if err := dosenWaliService.AssignDosenWali(r.Context(), id, req.DosenID); err != nil {
				response.Error(w, http.StatusInternalServerError, "Gagal assign dosen wali", err.Error())
				return
			}
			response.Success(w, http.StatusOK, "Dosen wali berhasil ditugaskan", nil)
		})

		// Dosen
		r.Get("/dosen", dosenHandler.GetAllDosen)
		r.Post("/dosen", dosenHandler.Create)
		r.Put("/dosen/{id}", dosenHandler.Update)
		r.Delete("/dosen/{id}", dosenHandler.Delete)

		// Mata Kuliah
		r.Get("/mata-kuliah", adminHandler.GetAllMataKuliah)
		r.Get("/mata-kuliah/paginated", adminHandler.GetMataKuliahPaginated)
		r.Post("/mata-kuliah", adminHandler.CreateMataKuliah)
		r.Put("/mata-kuliah/{id}", adminHandler.UpdateMataKuliah)
		r.Delete("/mata-kuliah/{id}", adminHandler.DeleteMataKuliah)

		// Kelas
		r.Get("/kelas", kelasHandler.GetAll)
		r.Post("/kelas", kelasHandler.Create)
		r.Put("/kelas/{id}", kelasHandler.Update)
		r.Delete("/kelas/{id}", kelasHandler.Delete)

		// Pesan Masuk (Kotak Masuk Admin)
		r.Get("/pesan", pesanHandler.GetAllForAdmin)
		r.Put("/pesan/{id}/read", pesanHandler.MarkAsRead)
	})

	// 9. Berita Routes (Public & Admin)
	r.Get("/api/berita", beritaHandler.GetAll)
	r.Group(func(r chi.Router) {
		r.Use(middleware.Authenticate(os.Getenv("JWT_SECRET"), logger))
		r.Post("/api/admin/berita", beritaHandler.Create)
		r.Delete("/api/admin/berita/{id}", beritaHandler.Delete)
		
		// Endpoint Pesan (Untuk Mahasiswa/Dosen/Admin ngirim pesan)
		r.Post("/api/pesan", pesanHandler.Create)
	})

	// 10. Route Akademik (KRS)
	r.Route("/api/akademik", func(r chi.Router) {
		r.Use(middleware.Authenticate(os.Getenv("JWT_SECRET"), logger))

		r.Get("/profil-krs", akademikHandler.GetProfilKRS)
		r.Get("/kelas/tersedia", akademikHandler.GetAvailableKelas)
		r.Get("/krs", akademikHandler.GetKRS)
		r.Post("/krs/ambil", akademikHandler.EnrollKelas)
		r.Delete("/krs/batal/{id}", akademikHandler.DropKelas)
	})

	// 11. Route Dosen Wali
	r.Route("/api/dosen", func(r chi.Router) {
		r.Use(middleware.Authenticate(os.Getenv("JWT_SECRET"), logger))
		r.Use(middleware.RequireRole(model.RoleDosen))

		r.Get("/profil", dosenWaliHandler.GetProfil)
		r.Get("/dashboard", dosenWaliHandler.GetDashboard)
		r.Get("/wali/mahasiswa", dosenWaliHandler.GetMahasiswaAsuhan)
		r.Get("/wali/mahasiswa/{mahasiswaId}/krs", dosenWaliHandler.GetKRSMahasiswa)
		r.Put("/wali/krs/{id}/approve", dosenWaliHandler.ApproveKRS)
		r.Put("/wali/krs/{id}/reject", dosenWaliHandler.RejectKRS)
		r.Put("/wali/mahasiswa/{mahasiswaId}/krs/approve-all", dosenWaliHandler.ApproveAllKRS)

		// Review Mahakarya
		r.Get("/wali/mahakarya", mahakaryaHandler.GetToReview)
		r.Put("/wali/mahakarya/{id}/review", mahakaryaHandler.Review)
	})

	// 12. Route Mahakarya (Mahasiswa & Public)
	r.Route("/api/mahakarya", func(r chi.Router) {
		// Publik: siapa saja bisa lihat galeri karya yang sudah approved
		r.Get("/gallery", mahakaryaHandler.GetGallery)

		// Terproteksi: hanya mahasiswa yang login
		r.Group(func(r chi.Router) {
			r.Use(middleware.Authenticate(os.Getenv("JWT_SECRET"), logger))
			r.Post("/submit", mahakaryaHandler.Submit)
			r.Get("/my", mahakaryaHandler.GetMySubmissions)
			r.Put("/{id}", mahakaryaHandler.UpdateSubmission) // Re-submit karya yang direvisi
		})
	})

	// 13. Route Payment
	r.Route("/api/payment", func(r chi.Router) {
		r.Post("/webhook", paymentHandler.Webhook) // Midtrans webhook
		r.Group(func(r chi.Router) {
			r.Use(middleware.Authenticate(os.Getenv("JWT_SECRET"), logger))
			r.Use(middleware.RequireRole("mahasiswa"))
			r.Get("/tagihan", paymentHandler.GetTagihan)
			r.Get("/transaksi", paymentHandler.GetTransaksi)
			r.Post("/checkout", paymentHandler.Checkout)
		})
	})

	// 11. Start Server
	port := os.Getenv("APP_PORT")
	logger.Info("Server starting", zap.String("port", port))
	if err := http.ListenAndServe(":"+port, r); err != nil {
		logger.Fatal("Server failed to start", zap.Error(err))
	}
}
