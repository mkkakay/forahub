"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useSubscription } from "@/context/SubscriptionContext";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "Find health financing conferences in Africa Q3 2027",
  "What WHA side events should I not miss?",
  "Show me events with travel grants available",
  "Find antimicrobial resistance conferences accepting abstracts",
  "What events are happening in Geneva this year?",
  "Find virtual SDG 3 events in the next 3 months",
];

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-[#4ea8de] flex items-center justify-center shrink-0">
          <Sparkles size={14} className="text-white" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-[#4ea8de] text-white rounded-br-sm"
            : "bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] text-gray-800 dark:text-gray-100 rounded-bl-sm"
        }`}
      >
        {msg.content.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
        ))}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
          <User size={14} className="text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </div>
  );
}

export default function AssistantClient() {
  const { hasFullAccess, userId } = useSubscription();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [queryCount, setQueryCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    if (!userId && queryCount >= 3) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setQueryCount(c => c + 1);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json();
      if (data.content) {
        setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't connect. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const showUpgradeGate = !hasFullAccess && queryCount >= 3;

  return (
    <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4ea8de] to-[#3b82f6] flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0f2a4a] dark:text-white">ForaHub AI Assistant</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ask me anything about global development events</p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 space-y-4 mb-4 min-h-[300px]">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Suggested questions:</p>
            <div className="grid gap-2">
              {SUGGESTED.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-sm px-4 py-3 rounded-xl bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] text-gray-700 dark:text-gray-300 hover:border-[#4ea8de] hover:text-[#4ea8de] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-[#4ea8de] flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        {showUpgradeGate && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
              You&apos;ve used your 3 free queries. Upgrade to Pro for unlimited AI assistant access.
            </p>
            <Link href="/pricing" className="inline-flex items-center gap-2 bg-[#4ea8de] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#3a95cc] transition-colors">
              Upgrade to Pro
            </Link>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-4">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-2 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-2xl p-2 shadow-lg"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about events, conferences, travel grants…"
            disabled={loading || showUpgradeGate}
            className="flex-1 bg-transparent text-sm text-gray-800 dark:text-white placeholder-gray-400 px-3 py-2 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || showUpgradeGate}
            className="w-9 h-9 rounded-xl bg-[#4ea8de] flex items-center justify-center text-white disabled:opacity-40 hover:bg-[#3a95cc] transition-colors shrink-0"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </main>
  );
}
