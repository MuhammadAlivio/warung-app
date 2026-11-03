// Halaman tujuan setelah login berhasil
export const homeFor = (user) => (user?.role === "admin" ? "/stok" : "/kasir");
