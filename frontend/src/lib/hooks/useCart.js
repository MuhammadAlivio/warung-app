import { useMemo, useReducer } from "react";

function reducer(state, a) {
  switch (a.type) {
    case "add": {
      const found = state.find((i) => i.id === a.product.id);
      if (found) return state.map((i) => (i.id === found.id ? { ...i, qty: Math.min(i.qty + 1, i.stock) } : i));
      const { id, name, price, stock } = a.product;
      return [...state, { id, name, price, stock, qty: 1 }];
    }
    case "setQty":
      return state.map((i) => (i.id === a.id ? { ...i, qty: Math.max(1, Math.min(a.qty, i.stock)) } : i));
    case "remove":
      return state.filter((i) => i.id !== a.id);
    case "clear":
      return [];
    default:
      return state;
  }
}

export function useCart() {
  const [items, dispatch] = useReducer(reducer, []);
  const totals = useMemo(
    () => ({ units: items.reduce((s, i) => s + i.qty, 0), total: items.reduce((s, i) => s + i.qty * i.price, 0) }),
    [items]
  );
  return {
    items, ...totals,
    add: (product) => dispatch({ type: "add", product }),
    setQty: (id, qty) => dispatch({ type: "setQty", id, qty }),
    remove: (id) => dispatch({ type: "remove", id }),
    clear: () => dispatch({ type: "clear" }),
  };
}
