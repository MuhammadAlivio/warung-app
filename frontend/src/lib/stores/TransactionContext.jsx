import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { makeSeedTransactions } from "../data/posMockData";
import { makeTrxNo } from "../utils/pos";
import { totalOf } from "../utils/transaction";

const Ctx = createContext(null);
export const useTransactions = () => useContext(Ctx);

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState(makeSeedTransactions);
  const nextSeq = Math.max(0, ...transactions.map((t) => t.seq)) + 1;
  const nextNo = useCallback(() => makeTrxNo(nextSeq), [nextSeq]);

  const patch = (id, fn) => setTransactions((p) => p.map((t) => (t.id === id ? fn(t) : t)));
  const log = (t, type, reason) => [...t.history, { at: new Date(), type, reason }];

  const value = useMemo(
    () => ({
      transactions, nextSeq, nextNo,
      getTransaction: (id) => transactions.find((t) => t.id === id),
      addTransaction: (tx) => setTransactions((p) => [tx, ...p]),
      editItems: (id, items, reason) =>
        patch(id, (t) => ({ ...t, items, total: totalOf(items), history: log(t, "edit", reason) })),
      addPayment: (id, pay) =>
        patch(id, (t) => ({ ...t, paid: t.paid + pay.amount, payments: [...t.payments, pay], history: log(t, "payment", pay.note) })),
      cancelTransaction: (id, reason) => patch(id, (t) => ({ ...t, cancelled: true, history: log(t, "cancel", reason) })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, nextSeq, nextNo]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
