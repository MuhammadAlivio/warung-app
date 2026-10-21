import { Button, Modal, ModalFooter } from "../../components/ui";

export default function DeleteStockModal({ product, onCancel, onConfirm, loading = false }) {
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
            Setelah dihapus, barang akan hilang dan tidak tersimpan lagi.
          </>
        )
      }
    >
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
