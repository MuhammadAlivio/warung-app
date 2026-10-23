import { createContext, useContext, useMemo, useState } from "react";
import { INITIAL_PURCHASES } from "../data/purchaseMockData";

const PurchaseCtx = createContext(null);

function generatePurchaseNo(date, seq) {
  const d = date.replaceAll("-", "");
  return `INV-${d}-${String(seq).padStart(4, "0")}`;
}

export function PurchaseProvider({ children }) {
  const [purchases, setPurchases] = useState(INITIAL_PURCHASES);
  const [seq, setSeq] = useState(5); // mock data has 3 entries

  const addPurchase = (data) => {
    const no = generatePurchaseNo(data.date, seq);
    setSeq((s) => s + 1);
    const items = (data.items || []).map((i) => ({
      ...i,
      id: i.id || crypto.randomUUID(),
    }));
    setPurchases((prev) => [
      {
        ...data,
        items,
        id: crypto.randomUUID(),
        purchaseNo: no,
        status: "belum_diterima",
        paymentStatus: data.initialPayment > 0 ? "sebagian" : "belum_bayar",
        receptions: [],
        createdBy: "Dina Anggraini",
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      },
      ...prev,
    ]);
  };

  const updatePurchase = (id, data) =>
    setPurchases((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p)),
    );

  const deletePurchase = (id) =>
    setPurchases((prev) => prev.filter((p) => p.id !== id));

  const receiveItems = (purchaseId, receptionData) =>
    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;

        // Update item quantities
        const items = p.items.map((item) => {
          const received = receptionData.itemsReceived?.find((r) => r.productId === item.productId);
          if (received) {
            return { ...item, qtyReceived: (item.qtyReceived || 0) + received.qty };
          }
          return item;
        });

        // Determine new status
        const allReceived = items.every((i) => (i.qtyReceived || 0) >= i.qty);
        const someReceived = items.some((i) => (i.qtyReceived || 0) > 0);
        const status = allReceived
          ? "diterima"
          : someReceived
            ? "diterima_sebagian"
            : "belum_diterima";

        // Add reception record
        const newReception = {
          id: crypto.randomUUID(),
          receptionNo: `BM-${String(Math.floor(Math.random() * 900) + 100)}`,
          date: receptionData.date,
          time: new Date().toTimeString().slice(0, 5),
          receivedBy: receptionData.receivedBy || "Dina",
          deliveryNote: receptionData.deliveryNote || "",
          items: receptionData.itemsReceived || [],
          notes: receptionData.notes || "",
        };

        const receptions = [...(p.receptions || []), newReception];

        return { ...p, items, status, receptions };
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
