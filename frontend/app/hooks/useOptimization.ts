import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useDebounce — Menunda pemrosesan value sampai user berhenti mengetik.
 * 
 * Masalah yang diselesaikan:
 *   Tanpa debounce, setiap keystroke langsung memicu filter/pencarian.
 *   Jika ada 10.000 data, React akan memfilter array 10.000 item
 *   di SETIAP huruf yang diketik → UI jadi lag/freeze.
 *
 * Cara kerja:
 *   1. User mengetik "algo" → 4 keystroke
 *   2. Tanpa debounce: filter dijalankan 4 kali ("a", "al", "alg", "algo")
 *   3. Dengan debounce (300ms): filter dijalankan 1 kali ("algo")
 *      karena menunggu 300ms setelah keystroke terakhir
 *
 * @param value - Nilai yang ingin di-debounce (biasanya searchTerm)
 * @param delay - Waktu tunggu dalam milidetik (default: 300ms)
 * @returns Nilai yang sudah di-debounce
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: hapus timer sebelumnya jika value berubah lagi
    // sebelum delay selesai (inilah inti dari debounce)
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useStableCallback — Membuat referensi fungsi yang stabil antar render.
 * 
 * Masalah yang diselesaikan:
 *   Di React, setiap kali komponen re-render, semua fungsi yang didefinisikan
 *   di dalamnya akan DIBUAT ULANG (alamat memori baru). Ini menyebabkan:
 *   - Child component yang menerima fungsi ini sebagai prop ikut re-render
 *   - Event handler yang di-pass ke <button onClick={fn}> berubah terus
 *
 * Bedanya dengan useCallback biasa:
 *   useCallback butuh dependency array yang harus dijaga manual.
 *   useStableCallback SELALU menjalankan versi terbaru dari fungsi,
 *   tapi referensinya stabil (tidak pernah berubah antar render).
 *
 * @param callback - Fungsi yang ingin distabilkan
 * @returns Fungsi dengan referensi stabil
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef<T>(callback);

  // Update ref ke versi terbaru di setiap render
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Kembalikan fungsi wrapper yang referensinya TIDAK PERNAH berubah
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    ((...args: any[]) => callbackRef.current(...args)) as T,
    []
  );
}
