"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, ChevronLeft, Copy, Sparkles, UserRound } from "lucide-react";
import { api, type ChatMessageItem, type Profile } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const LANGUAGES = [
  { id: "hinglish", label: "Hinglish" },
  { id: "hi", label: "हिंदी" },
  { id: "en", label: "English" },
] as const;

interface ProviderInfo {
  id: string;
  ready: boolean;
}

interface LiveMessage {
  role: "user" | "assistant";
  content: string;
}

const mdComponents: Components = {
  p: (props) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
  strong: (props) => <strong className="font-bold text-saffron-800" {...props} />,
  em: (props) => <em className="text-stone-600" {...props} />,
  ol: (props) => <ol className="mb-2 ml-5 list-decimal space-y-1 last:mb-0" {...props} />,
  ul: (props) => <ul className="mb-2 ml-5 list-disc space-y-1 last:mb-0" {...props} />,
  li: (props) => <li className="pl-1" {...props} />,
  h1: (props) => <h3 className="mb-1.5 text-base font-bold text-saffron-800" {...props} />,
  h2: (props) => <h3 className="mb-1.5 text-base font-bold text-saffron-800" {...props} />,
  h3: (props) => <h4 className="mb-1 text-sm font-bold text-saffron-800" {...props} />,
  hr: (props) => <hr className="my-3 border-goldline" {...props} />,
  table: (props) => (
    <div className="mb-2 overflow-x-auto">
      <table className="w-full min-w-[360px] border-collapse text-xs" {...props} />
    </div>
  ),
  th: (props) => <th className="border-b-2 border-saffron-600 px-2 py-1.5 text-left font-bold" {...props} />,
  td: (props) => <td className="border-b border-saffron-100 px-2 py-1.5 align-top" {...props} />,
  blockquote: (props) => (
    <blockquote className="mb-2 border-l-4 border-gold bg-saffron-50/70 py-1 pl-3 italic" {...props} />
  ),
  a: (props) => <a className="font-semibold text-saffron-700 underline" target="_blank" rel="noreferrer" {...props} />,
};

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t, locale } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<"hinglish" | "hi" | "en">("hinglish");
  const [provider, setProvider] = useState<string>("");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [streamText, setStreamText] = useState("");
  const [waitingFirstToken, setWaitingFirstToken] = useState(false);
  const [error, setError] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    Promise.all([api.getProfile(id), api.history(id)])
      .then(([p, h]) => {
        setProfile(p);
        setMessages(h);
      })
      .catch((e) => setError(String(e)));
    fetch(`${api.base}/api/providers`)
      .then((r) => r.json())
      .then((d) => {
        setProviders(d.providers ?? []);
        const ready = d.providers?.find?.((x: ProviderInfo) => x.ready);
        if (ready) setProvider(ready.id);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamText, waitingFirstToken, pendingUser]);

  function autoGrow() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setError("");
    setStreaming(true);
    setPendingUser(text);
    setStreamText("");
    setWaitingFirstToken(true);

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
            setWaitingFirstToken(false);
          } else if (event.event === "error") {
            throw new Error(event.detail);
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "user", content: text, language, created_at: new Date().toISOString() },
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
      setPendingUser(null);
      setStreamText("");
      setWaitingFirstToken(false);
    }
  }

  function copyMessage(content: string, idx: number) {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1600);
  }

  const langNote = useMemo(() => {
    const map: Record<string, string> = {
      hinglish: locale === "hi" ? "अगले उत्तर हिंग्लिश में आएँगे" : "Next reply in Hinglish",
      hi: locale === "hi" ? "अगला उत्तर हिंदी (देवनागरी) में आएगा" : "Next reply in Hindi (Devanagari)",
      en: locale === "hi" ? "अगला उत्तर अंग्रेज़ी में आएगा" : "Next reply in English",
    };
    return map[language];
  }, [language, locale]);

  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] max-w-3xl flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-goldline bg-panel/60 px-1 pb-2.5 pt-1">
        <div>
          <Link
            href={`/profiles/${id}`}
            className="flex items-center gap-0.5 text-xs font-semibold text-saffron-700 hover:underline"
          >
            <ChevronLeft size={13} /> {t("chat.back")}
          </Link>
          <h1 className="text-lg font-bold">{t("chat.title", { name: profile?.name ?? "…" })}</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-lg border border-goldline bg-panel px-2 py-1.5 text-xs font-bold capitalize text-stone-600"
            aria-label="AI provider"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.ready}>
                {p.id}
                {!p.ready && " · " + t("menu.nokey")}
              </option>
            ))}
          </select>
          <div className="flex rounded-lg border border-goldline bg-panel p-0.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                onClick={() => setLanguage(l.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                  language === l.id ? "bg-saffron-600 text-white" : "text-stone-600 hover:bg-saffron-100"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-goldline/60 bg-saffron-50/60 px-3 py-1.5 text-center text-[11px] font-semibold text-saffron-800">
        {langNote}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1">
        {messages.length === 0 && !streaming && !pendingUser && (
          <div className="rounded-xl border border-dashed border-gold bg-saffron-50/70 p-6 text-center text-sm text-stone-600">
            {t("chat.empty")}
          </div>
        )}

        {messages.map((m, idx) =>
          m.role === "user" ? (
            <div key={m.id} className="flex items-end justify-end gap-2">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-saffron-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
                {m.content}
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-goldline bg-panel text-saffron-700">
                <UserRound size={15} />
              </span>
            </div>
          ) : (
            <div key={m.id} className="group flex items-start gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-goldline bg-sidebarbg text-saffron-700">
                <Sparkles size={15} />
              </span>
              <div className="max-w-[88%]">
                <div className="prose-chat rounded-2xl rounded-tl-sm border border-goldline bg-panel px-4 py-3 text-sm text-ink shadow-sm">
                  <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {m.content}
                  </Markdown>
                </div>
                <button
                  onClick={() => copyMessage(m.content, idx)}
                  className="mt-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-stone-500 opacity-0 transition group-hover:opacity-100 hover:bg-saffron-100"
                >
                  {copiedIdx === idx ? <Check size={11} /> : <Copy size={11} />}
                  {copiedIdx === idx ? (locale === "hi" ? "कॉपी हो गया" : "Copied") : locale === "hi" ? "कॉपी" : "Copy"}
                </button>
              </div>
            </div>
          ),
        )}

        {pendingUser && (
          <div className="flex items-end justify-end gap-2 opacity-90">
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-saffron-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
              {pendingUser}
            </div>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-goldline bg-panel text-saffron-700">
              <UserRound size={15} />
            </span>
          </div>
        )}

        {(streaming || waitingFirstToken) && (
          <div className="flex items-start gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-goldline bg-sidebarbg text-saffron-700">
              <Sparkles size={15} />
            </span>
            <div className="max-w-[88%]">
              <div className="min-h-[2.75rem] rounded-2xl rounded-tl-sm border border-goldline bg-panel px-4 py-3 text-sm shadow-sm">
                {streamText ? (
                  <div className="prose-chat">
                    <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                      {streamText}
                    </Markdown>
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-saffron-600 align-middle" />
                  </div>
                ) : (
                  <span className="flex gap-1 py-1.5" aria-label="thinking">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-saffron-500"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex items-end gap-2 border-t border-goldline pt-3">
        <textarea
          ref={taRef}
          rows={1}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autoGrow();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={t("chat.placeholder")}
          disabled={streaming}
          className="max-h-[140px] flex-1 resize-none rounded-xl border border-goldline bg-panel px-4 py-3 text-sm outline-none focus:border-saffron-600 focus:ring-2 focus:ring-saffron-100 disabled:opacity-60"
        />
        <button
          disabled={streaming || !input.trim()}
          className="flex h-[46px] items-center gap-1.5 rounded-xl bg-saffron-600 px-5 text-sm font-bold text-white hover:bg-saffron-700 disabled:opacity-50"
        >
          {t("chat.send")}
        </button>
      </form>
    </div>
  );
}
