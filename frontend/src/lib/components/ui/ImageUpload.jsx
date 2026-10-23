import { useEffect, useRef, useState } from "react";
import { ImageIcon, Trash2 } from "lucide-react";
import { cn } from "../../utils/cn";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Upload satu foto: klik area atau seret file ke dalamnya.
 *
 * value    : File (baru dipilih) | string URL (foto yang sudah tersimpan) | null
 * onChange : dipanggil dengan File valid, atau null saat foto dihapus
 * File yang tidak valid (format/ukuran) ditolak di sini dan tidak diteruskan ke onChange.
 */
export default function ImageUpload({ label, value, onChange, error, maxSizeMB = 2, className }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);

  // Pratinjau dibuat di effect (bukan useMemo) agar aman di React StrictMode
  useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(typeof value === "string" && value ? value : null);
  }, [value]);

  const handleFile = (file) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError("Format harus JPG, PNG, atau WebP");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setLocalError(`Ukuran foto maksimal ${maxSizeMB} MB`);
      return;
    }
    setLocalError("");
    onChange(file);
  };

  const openPicker = () => inputRef.current?.click();

  const message = localError || error;

  return (
    <div className={className}>
      {label && <p className="mb-1.5 text-xs font-semibold text-neutral-900">{label}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-label={label ?? "Unggah foto"}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = ""; // izinkan memilih file yang sama lagi
        }}
      />

      {previewUrl ? (
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <img src={previewUrl} alt="Pratinjau foto barang" className="h-40 w-full bg-neutral-50 object-contain" />
          <div className="flex items-center justify-between gap-2 border-t border-neutral-100 bg-white px-3 py-2">
            <button
              type="button"
              onClick={openPicker}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              Ganti foto
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalError("");
                onChange(null);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Hapus
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
            "focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/15",
            dragging
              ? "border-brand-600 bg-brand-50"
              : message
                ? "border-red-400 bg-neutral-50"
                : "border-neutral-200 bg-neutral-50 hover:border-neutral-300"
          )}
        >
          <span className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-brand-50">
            <ImageIcon className="h-4 w-4 text-brand-700" aria-hidden />
          </span>
          <span className="text-xs font-semibold text-neutral-900">Tambahkan foto barang</span>
          <span className="text-[10px] text-neutral-500">Seret file atau klik area ini untuk mengunggah foto</span>
        </button>
      )}

      {message ? (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {message}
        </p>
      ) : (
        <p className="mt-1.5 text-[10px] text-neutral-500">JPG, PNG, atau WebP. Maksimal {maxSizeMB} MB.</p>
      )}
    </div>
  );
}