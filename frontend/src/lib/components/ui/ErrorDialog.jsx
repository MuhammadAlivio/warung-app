import { AlertTriangle } from "lucide-react";
import Button from "./Button";
import Modal, { ModalBody, ModalFooter } from "./Modal";

/**
 * Popup untuk aksi yang gagal (hapus, ubah status, gagal memuat data).
 * error: { title?, message } atau null (tertutup). onRetry opsional menambah tombol "Coba lagi".
 */
export default function ErrorDialog({ error, onClose, onRetry }) {
  return (
    <Modal open={!!error} onClose={onClose} title={error?.title ?? "Gagal"} className="max-w-[420px]">
      <ModalBody>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <p role="alert" className="pt-1.5 text-sm leading-relaxed text-neutral-700">
            {error?.message}
          </p>
        </div>
      </ModalBody>
      <ModalFooter className="justify-end">
        {onRetry && (
          <Button
            variant="outline"
            fullWidth={false}
            onClick={() => {
              onClose();
              onRetry();
            }}
          >
            Coba lagi
          </Button>
        )}
        <Button fullWidth={false} onClick={onClose}>
          Mengerti
        </Button>
      </ModalFooter>
    </Modal>
  );
}
