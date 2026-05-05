"use client";

import { useState } from "react";
import { Sparkles, X, Send } from "lucide-react";

interface Message { role: "user" | "assistant"; content: string; }

export default function AIWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const updated = [...messages, { role: "user" as const, content: text }];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json();
      if (data.content) setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-20 right-4 md:bottom-6 z-40 flex items-center gap-2 bg-[#4ea8de] hover:bg-[#3a95cc] text-white rounded-full shadow-lg transition-all px-4 py-3 ${open ? "hidden" : ""}`}
      >
        <Sparkles size={16} />
        <span className="text-sm font-semibold hidden sm:inline">Ask AI</span>
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 z-50 w-full md:w-96 h-[480px] bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#334155]">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#4ea8de]" />
              <span className="font-semibold text-sm text-[#0f2a4a] dark:text-white">ForaHub AI</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Ask me about global development events, conferences, or travel grants.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`text-sm rounded-xl px-3 py-2 max-w-[85%] ${m.role === "user" ? "bg-[#4ea8de] text-white ml-auto" : "bg-gray-100 dark:bg-[#334155] text-gray-800 dark:text-gray-100"}`}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="flex gap-1 px-3 py-2 bg-gray-100 dark:bg-[#334155] rounded-xl w-16">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            )}
          </div>
          <form onSubmit={e => { e.preventDefault(); send(input); }} className="p-3 border-t border-gray-200 dark:border-[#334155] flex gap-2">
            <input
              value={input} onChange={e => setInput(e.target.value)}
              placeholder="Ask about events…"
              className="flex-1 text-sm bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] rounded-lg px-3 py-2 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#4ea8de]"
            />
            <button type="submit" disabled={!input.trim() || loading}
              className="w-8 h-8 bg-[#4ea8de] rounded-lg flex items-center justify-center text-white disabled:opacity-40 hover:bg-[#3a95cc] transition-colors shrink-0">
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
