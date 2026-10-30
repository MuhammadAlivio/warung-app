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

/** Ubah stok sekaligus. deltas = { [productId]: +n (stok bertambah) | -n (berkurang) } */
export function useStockAdjust() {
  const { products, updateProduct } = useStock();
  return useCallback(
    (deltas) => {
      Object.entries(deltas).forEach(([id, d]) => {
        const p = products.find((x) => x.id === id);
        if (p && d) updateProduct(id, { stock: Math.max(0, p.stock + d) });
      });
    },
    [products, updateProduct]
  );
}
