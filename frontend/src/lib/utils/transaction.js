export const totalOf = (items) => items.reduce((s, i) => s + i.qty * i.price, 0);
export const unitsOf = (t) => t.items.reduce((s, i) => s + i.qty, 0);
export const remainingOf = (t) => (t.cancelled ? 0 : Math.max(t.total - t.paid, 0));
export const statusOf = (t) => (t.cancelled ? "Dibatalkan" : t.total > t.paid ? "Belum Lunas" : "Lunas");
export const STATUS_VARIANT = { Lunas: "brand", "Belum Lunas": "danger", Dibatalkan: "neutral" };
