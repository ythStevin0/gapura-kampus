package middleware

import (
	"fmt"
	"net/http"
	"time"

	"go.uber.org/zap"
)

type statusRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (rec *statusRecorder) WriteHeader(code int) {
	rec.statusCode = code
	rec.ResponseWriter.WriteHeader(code)
}

// RequestTimerMiddleware mencatat waktu eksekusi setiap endpoint (Stopwatch/Timer Profiler)
// sebagaimana prinsip Milan Jovanovic:
// 1. Mengukur durasi eksekusi secara real-time.
// 2. Mengirim header Server-Timing dan X-Response-Time ke client.
// 3. Memberikan alert log jika ada endpoint yang melebihi batas toleransi (Bottleneck Detection).
func RequestTimerMiddleware(logger *zap.Logger, slowThreshold time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			rec := &statusRecorder{
				ResponseWriter: w,
				statusCode:     http.StatusOK,
			}

			// Lanjutkan ke handler berikutnya
			next.ServeHTTP(rec, r)

			// Hitung durasi eksekusi (stopwatch)
			duration := time.Since(start)
			durMs := duration.Milliseconds()

			// Pasang header W3C Server-Timing dan X-Response-Time
			rec.Header().Set("Server-Timing", fmt.Sprintf("app;dur=%d", durMs))
			rec.Header().Set("X-Response-Time", fmt.Sprintf("%dms", durMs))

			// Deteksi bottleneck otomatis
			if duration > slowThreshold && r.URL.Path != "/api/health" {
				logger.Warn("⚠️ BOTTLENECK TERDETEKSI: Endpoint lambat",
					zap.String("method", r.Method),
					zap.String("path", r.URL.Path),
					zap.Duration("duration", duration),
					zap.Int("status", rec.statusCode),
				)
			}
		})
	}
}
