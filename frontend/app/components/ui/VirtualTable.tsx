// @ts-expect-error - TS 5.9 + moduleResolution bundler gives false positive for react-window exports
import pkg from "react-window";
const { FixedSizeList: List } = pkg;
import type { CSSProperties } from "react";
import { useRef, useEffect, useState, memo } from "react";

/**
 * VirtualTable — Tabel dengan Virtualization (Windowing).
 *
 * Masalah yang diselesaikan:
 *   Jika ada 1000 mahasiswa, browser harus merender 1000 <tr> sekaligus
 *   di DOM → memori membengkak, scrolling jadi lag/patah-patah.
 *
 * Solusi (Virtualization):
 *   Hanya merender baris yang TERLIHAT DI LAYAR (misal: 15-20 baris).
 *   Saat user scroll ke bawah, baris atas dihapus dari DOM dan
 *   baris bawah yang baru ditambahkan. Total elemen DOM selalu sedikit.
 *
 *   Contoh: 1000 data, tinggi layar 600px, tinggi per baris 56px
 *   → Hanya ~11 baris yang di-render di DOM (bukan 1000)
 *   → Performa scrolling SANGAT halus
 */

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render: (item: T, index: number) => React.ReactNode;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  maxHeight?: number;
  loading?: boolean;
  emptyMessage?: string;
  rowClassName?: string;
  getRowKey: (item: T, index: number) => string;
}

// Memoized row component — mencegah re-render baris yang tidak berubah
const VirtualRow = memo(function VirtualRowImpl<T>({
  item,
  columns,
  rowClassName,
}: {
  item: T;
  columns: Column<T>[];
  index: number;
  rowClassName?: string;
}) {
  return (
    <div
      className={`flex items-center border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group ${rowClassName || ""}`}
    >
      {columns.map((col) => (
        <div
          key={col.key}
          className="p-4 shrink-0"
          style={{ width: col.width || "auto", flex: col.width ? "none" : 1 }}
        >
          {col.render(item, 0)}
        </div>
      ))}
    </div>
  );
}) as <T>(props: {
  item: T;
  columns: Column<T>[];
  index: number;
  rowClassName?: string;
}) => React.ReactElement;

export function VirtualTable<T>({
  data,
  columns,
  rowHeight = 64,
  maxHeight = 560,
  loading = false,
  emptyMessage = "Tidak ada data.",
  rowClassName,
  getRowKey,
}: VirtualTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  const listHeight = Math.min(data.length * rowHeight, maxHeight);

  return (
    <div ref={containerRef} className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="flex bg-zinc-900/60">
        {columns.map((col) => (
          <div
            key={col.key}
            className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider shrink-0"
            style={{ width: col.width || "auto", flex: col.width ? "none" : 1 }}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Body */}
      {loading ? (
        <div className="divide-y divide-zinc-800/50">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center animate-pulse p-4 gap-4">
              <div className="h-10 w-48 bg-zinc-800 rounded" />
              <div className="h-4 w-32 bg-zinc-800 rounded" />
              <div className="h-4 w-24 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="p-12 text-center text-zinc-600 italic text-sm">
          {emptyMessage}
        </div>
      ) : data.length <= 50 ? (
        // Data kecil (≤50 baris): render biasa tanpa virtualization
        // Overhead dari react-window tidak sebanding untuk data kecil
        <div>
          {data.map((item, index) => (
            <VirtualRow
              key={getRowKey(item, index)}
              item={item}
              columns={columns}
              index={index}
              rowClassName={rowClassName}
            />
          ))}
        </div>
      ) : (
        // Data besar (>50 baris): gunakan virtualization
        <List
          height={listHeight}
          itemCount={data.length}
          itemSize={rowHeight}
          width={containerWidth || "100%"}
        >
          {({ index, style }: { index: number; style: CSSProperties }) => (
            <div style={style} key={getRowKey(data[index], index)}>
              <VirtualRow
                item={data[index]}
                columns={columns}
                index={index}
                rowClassName={rowClassName}
              />
            </div>
          )}
        </List>
      )}
    </div>
  );
}
