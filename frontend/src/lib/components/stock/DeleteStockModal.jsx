import { Button, Modal, ModalFooter } from "../ui";

export default function DeleteStockModal({ product, onCancel, onConfirm, loading = false, error = "" }) {
  return (
    <Modal
      open={!!product}
      onClose={loading ? undefined : onCancel}
      title="Hapus Barang?"
      showClose={false}
      className="max-w-[480px]"
      description={
        product && (
          <>
            Pastikan <span className="font-semibold text-neutral-700">{product.name}</span> benar-benar perlu dihapus.
            Barang akan hilang dari daftar stok dan kasir. Riwayat transaksi yang memakai barang ini tetap tersimpan.
          </>
        )
      }
    >
      {error && (
        <p role="alert" className="mx-6 mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      <ModalFooter>
        <Button variant="outline" size="sm" fullWidth={false} onClick={onCancel} disabled={loading}>
          Batal
        </Button>
        <Button variant="danger" size="sm" fullWidth={false} onClick={onConfirm} loading={loading}>
          Hapus Barang
        </Button>
      </ModalFooter>
    </Modal>
  );
}
