// Klien API ke backend Laravel. Autentikasi memakai cookie sesi (Sanctum SPA), tanpa token manual.

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const readCookie = (name) => {
  const row = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return row ? decodeURIComponent(row.split("=").slice(1).join("=")) : null;
};

const refreshCsrf = () => fetch("/sanctum/csrf-cookie", { credentials: "include" });

export async function api(path, { method = "GET", body } = {}, retried = false) {
  if (method !== "GET" && !readCookie("XSRF-TOKEN")) await refreshCsrf();

  // FormData (unggah file) dikirim apa adanya; browser yang mengisi Content-Type multipart
  const isForm = body instanceof FormData;

  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !isForm && { "Content-Type": "application/json" }),
        ...(method !== "GET" && { "X-XSRF-TOKEN": readCookie("XSRF-TOKEN") ?? "" }),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Tidak dapat terhubung ke server. Coba lagi.", 0);
  }

  // Token CSRF kedaluwarsa (mis. setelah logout): ambil ulang lalu coba sekali lagi
  if (res.status === 419 && !retried) {
    await refreshCsrf();
    return api(path, { method, body }, true);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.message ?? "Terjadi kesalahan. Coba lagi.", res.status, data);
  return data;
}
