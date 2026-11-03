// Waktu dari server berformat ISO (UTC). Ditampilkan dalam WIB.
const fmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export const formatDateTime = (iso) => (iso ? `${fmt.format(new Date(iso))} WIB` : "-");
