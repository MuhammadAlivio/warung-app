import { createContext, useContext, useMemo, useState } from "react";
import { INITIAL_PURCHASES } from "../data/purchaseMockData";

const PurchaseCtx = createContext(null);

function generatePurchaseNo(date, seq) {
  const d = date.replaceAll("-", "");
  return `PB-${d}-${String(seq).padStart(4, "0")}`;
}

export function PurchaseProvider({ children }) {
  const [purchases, setPurchases] = useState(INITIAL_PURCHASES);
  const [seq, setSeq] = useState(5); // mock data has 4 entries

  const addPurchase = (data) => {
    const no = generatePurchaseNo(data.date, seq);
    setSeq((s) => s + 1);
    const items = (data.items || []).map((i) => ({
      ...i,
      id: i.id || crypto.randomUUID(),
    }));
    setPurchases((prev) => [
      { ...data, items, id: crypto.randomUUID(), purchaseNo: no, status: "belum_diterima" },
      ...prev,
    ]);
  };

  const updatePurchase = (id, data) =>
    setPurchases((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p)),
    );

  const deletePurchase = (id) =>
    setPurchases((prev) => prev.filter((p) => p.id !== id));

  const receiveItems = (purchaseId, receivedMap) =>
    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;
        const items = p.items.map((item) =>
          receivedMap[item.id] != null
            ? { ...item, qtyReceived: receivedMap[item.id] }
            : item,
        );
        const allReceived = items.every((i) => i.qtyReceived >= i.qty);
        const someReceived = items.some((i) => i.qtyReceived > 0);
        const status = allReceived
          ? "diterima"
          : someReceived
            ? "diterima_sebagian"
            : "belum_diterima";
        return { ...p, items, status };
      }),
    );

  const value = useMemo(
    () => ({ purchases, addPurchase, updatePurchase, deletePurchase, receiveItems }),
    [purchases],
  );

  return <PurchaseCtx.Provider value={value}>{children}</PurchaseCtx.Provider>;
}

export function usePurchase() {
  const ctx = useContext(PurchaseCtx);
  if (!ctx) throw new Error("usePurchase must be inside PurchaseProvider");
  return ctx;
}
