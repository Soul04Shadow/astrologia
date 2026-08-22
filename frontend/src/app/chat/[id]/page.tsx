"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, type ChatMessageItem, type Profile } from "@/lib/api";

const LANGUAGES = [
  { id: "hinglish", label: "Hinglish" },
  { id: "hi", label: "हिंदी" },
  { id: "en", label: "English" },
];

interface ProviderInfo {
  id: string;
  ready: boolean;
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("hinglish");
  const [provider, setProvider] = useState<string>("");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    Promise.all([api.getProfile(id), api.history(id)])
      .then(([p, h]) => {
        setProfile(p);
        setMessages(h);
      })
      .catch((e) => setError(String(e)));
    fetch(`${api.base}/api/providers`)
      .then((r) => r.json())
      .then((d: { providers: ProviderInfo[] }) => {
        setProviders(d.providers);
        const ready = d.providers.find((x) => x.ready);
        if (ready) setProvider(ready.id);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setError("");
    setStreaming(true);
    setStreamText("");

    try {
      const res = await fetch(`${api.base}/api/chat/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, language, provider: provider || null }),
      });
      if (!res.ok || !res.body) {
        let detail = res.statusText;
        try {
          detail = (await res.json()).detail ?? detail;
        } catch {}
        throw new Error(detail);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const event = JSON.parse(line.slice(5).trim());
          if (event.delta) {
            full += event.delta;
            setStreamText(full);
          } else if (event.event === "error") {
            throw new Error(event.detail);
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "user",
          content: text,
          language,
          created_at: new Date().toISOString(),
        },
        {
          id: Date.now() + 1,
          role: "assistant",
          content: full,
          provider,
          language,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setStreaming(false);
      setStreamText("");
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-3xl flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div>
          <Link href={`/profiles/${id}`} className="text-xs font-semibold text-saffron-700 hover:underline">
            ← Chart
          </Link>
          <h1 className="text-lg font-bold">Consultation — {profile?.name ?? "…"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
            aria-label="AI provider"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.ready}>
                {p.id}
                {!p.ready && " (no key)"}
              </option>
            ))}
          </select>
          <div className="flex rounded-lg border border-stone-300 p-0.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                onClick={() => setLanguage(l.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                  language === l.id ? "bg-saffron-600 text-white" : "text-muted hover:bg-stone-50"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto py-4">
        {messages.length === 0 && !streaming && (
          <div className="rounded-xl border border-dashed border-saffron-400 bg-saffron-50 p-6 text-center text-sm text-muted">
            Ask anything about this chart — career, marriage, health timing, dasha effects…
            <br />
            Answers are grounded in the exact calculated positions.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-saffron-600 text-white"
                  : "border border-stone-200 bg-saffron-50 text-ink"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] whitespace-pre-wrap rounded-xl border border-stone-200 bg-saffron-50 px-4 py-3 text-sm leading-relaxed">
              {streamText || "…"}
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-saffron-600 align-middle" />
            </div>
          </div>
        )}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-stone-200 pt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about career, marriage, dasha, remedies…"
          disabled={streaming}
          className="flex-1 rounded-lg border border-stone-300 px-4 py-3 text-sm outline-none focus:border-saffron-600 focus:ring-2 focus:ring-saffron-100 disabled:bg-stone-50"
        />
        <button
          disabled={streaming || !input.trim()}
          className="rounded-lg bg-saffron-600 px-5 py-3 text-sm font-bold text-white hover:bg-saffron-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
