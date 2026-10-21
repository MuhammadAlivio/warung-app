import { useEffect, useState } from "react";

const secondsLeft = (period) => period - (Math.floor(Date.now() / 1000) % period);

/**
 * Hitung mundur sampai kode TOTP berganti.
 * TOTP standar berganti tiap 30 detik, selaras dengan jam perangkat.
 */
export function useTotpCountdown(period = 30) {
  const [seconds, setSeconds] = useState(() => secondsLeft(period));

  useEffect(() => {
    const id = setInterval(() => setSeconds(secondsLeft(period)), 1000);
    return () => clearInterval(id);
  }, [period]);

  return seconds;
}

export const formatCountdown = (s) => `00:${String(s).padStart(2, "0")}`;
