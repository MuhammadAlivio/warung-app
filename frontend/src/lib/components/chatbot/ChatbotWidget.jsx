import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Send, Sparkles, X } from "lucide-react";
import { Button } from "../ui";
import { cn } from "../../utils/cn";
import { formatJam } from "../../utils/pos";
import { useTransactions } from "../../stores/TransactionContext";
import { useCustomers } from "../../stores/CustomerContext";
import { getBotReply, QUICK_PROMPTS } from "../../utils/chatbotReplies";

const GREETING = { id: 0, from: "bot", text: "Halo! Saya asisten Warung. Tanyakan soal tagihan pelanggan atau penjualan hari ini.", at: new Date() };

/** mode: "closed" (hanya FAB) | "popup" (widget ringkas) | "drawer" (panel samping penuh) */
export default function ChatbotWidget() {
  const [mode, setMode] = useState("closed");
  const [messages, setMessages] = useState([GREETING]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  const { transactions } = useTransactions();
  const { customers } = useCustomers();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing, mode]);
  useEffect(() => {
    if (mode === "closed") return;
    const h = (e) => e.key === "Escape" && setMode("closed");
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [mode]);

  const send = (value) => {
    const msg = value.trim();
    if (!msg || typing) return;
    setMessages((m) => [...m, { id: Date.now(), from: "user", text: msg, at: new Date() }]);
    setText(""); setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { id: Date.now() + 1, from: "bot", text: getBotReply(msg, { transactions, customers }), at: new Date() }]);
      setTyping(false);
    }, 600);
  };

  const drawer = mode === "drawer";
  const panelCls = drawer
    ? "fixed right-0 top-0 z-40 flex h-full w-full max-w-[420px] flex-col border-l border-neutral-100 bg-white shadow-xl"
    : "fixed bottom-24 right-6 z-40 flex h-[520px] max-h-[calc(100vh-8rem)] w-[calc(100vw-3rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-xl";

  return (
    <>
      {mode === "closed" && (
        <button
          type="button" onClick={() => setMode("popup")} aria-label="Buka chatbot"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/40"
        >
          <Sparkles className="h-6 w-6" aria-hidden />
        </button>
      )}

      {mode !== "closed" && (
        <section role="dialog" aria-label="Chatbot" className={panelCls}>
          <header className="flex items-center justify-between bg-brand-600 px-5 py-4 text-white">
            <div><h2 className="text-lg font-bold leading-tight">ChatBot</h2><p className="text-xs text-white/80">Bantuan cepat pelanggan</p></div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setMode(drawer ? "popup" : "drawer")} aria-label={drawer ? "Perkecil" : "Perbesar ke panel samping"} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
                {drawer ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
              </button>
              <button type="button" onClick={() => setMode("closed")} aria-label="Tutup chatbot" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"><X className="h-4 w-4" aria-hidden /></button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 p-4" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex items-end gap-2", m.from === "user" && "justify-end")}>
                {m.from === "bot" && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Sparkles className="h-4 w-4" aria-hidden /></span>}
                <div className={cn("max-w-[80%] whitespace-pre-line rounded-2xl border px-4 py-2.5 text-sm text-neutral-900", m.from === "user" ? "border-neutral-100 bg-white" : "border-transparent bg-brand-50")}>
                  {m.text}
                  <p className="mt-1 text-[10px] text-neutral-500">{formatJam(m.at)}</p>
                </div>
              </div>
            ))}
            {typing && <p className="pl-10 text-xs text-neutral-500">Mengetik…</p>}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pl-10">
                {QUICK_PROMPTS.map((p) => (
                  <button key={p} type="button" onClick={() => send(p)} className="rounded-full border border-brand-600/30 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50">{p}</button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2 border-t border-neutral-100 bg-white p-3">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Tulis pesan untuk chatbot..." aria-label="Pesan"
              className="h-11 min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 text-sm placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15" />
            <Button type="submit" fullWidth={false} disabled={!text.trim() || typing} aria-label="Kirim"><Send className="h-4 w-4" aria-hidden /></Button>
          </form>
        </section>
      )}
    </>
  );
}
