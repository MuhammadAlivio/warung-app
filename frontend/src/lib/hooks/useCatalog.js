import { useCallback, useMemo } from "react";
import { useStock } from "../stores/StockContext";

/** Katalog Kasir diambil dari StockContext (Stok Barang). Harga jual = sellPrice, satuan = note. */
export function useCatalog() {
  const { products } = useStock();
  return useMemo(
    () => products.map((p) => ({ id: p.id, name: p.name, unit: p.note, category: p.category, stock: p.stock, price: p.sellPrice })),
    [products]
  );
}

/**
 * Ubah stok sekaligus. deltas = { [productId]: +n (stok bertambah) | -n (berkurang) }
 * SEMENTARA hanya di layar (adjustLocal): stok di database baru ikut berubah setelah
 * transaksi kasir disimpan lewat API.
 */
export function useStockAdjust() {
  const { adjustLocal } = useStock();
  return useCallback((deltas) => adjustLocal(deltas), [adjustLocal]);
}
