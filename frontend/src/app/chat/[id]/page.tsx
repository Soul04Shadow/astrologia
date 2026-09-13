"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Check, ChevronLeft, Copy, Pencil, Plus, RotateCw, Sparkles, Trash2, UserRound } from "lucide-react";
import { api, type ChatMessageItem, type ChatSession, type ModelInfo, type Profile } from "@/lib/api";
import { getSupabase } from "@/lib/auth";

async function withAuthHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase) return extra;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(searchParams.get("s"));
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<"hinglish" | "hi" | "en">("hinglish");
  const [provider, setProvider] = useState<string>("");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [model, setModel] = useState<string>("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [streamText, setStreamText] = useState("");
  const [thinkingText, setThinkingText] = useState("");
  const [waitingFirstToken, setWaitingFirstToken] = useState(false);
  const [error, setError] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [translatedCache, setTranslatedCache] = useState<Record<number, Record<string, string>>>({});
  const [translating, setTranslating] = useState(false);
  const [toolCalls, setToolCalls] = useState<{ id?: string; name: string; args: any }[]>([]);
  const localeInitialized = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const activeStreamReaderRef = useRef<AbortController | null>(null);
  const sessionMessagesCache = useRef<Record<string, ChatMessageItem[]>>({});

  // cleanup in-flight stream reader on unmount
  useEffect(() => {
    return () => {
      activeStreamReaderRef.current?.abort();
    };
  }, []);

  // sync URL ?s= to state
  useEffect(() => {
    setActiveSessionId(searchParams.get("s"));
  }, [searchParams]);

  // load profile and providers + sessions
  useEffect(() => {
    api.getProfile(id)
      .then((p) => setProfile(p))
      .catch((e) => setError(String(e)));
    fetch(`${api.base}/api/providers`)
      .then((r) => r.json())
      .then((d) => {
        const list: ProviderInfo[] = d.providers ?? [];
        setProviders(list);
        try {
          const raw = localStorage.getItem(`chat:model:${id}`);
          if (raw) {
            const saved = JSON.parse(raw);
            if (saved.provider && list.find((x) => x.id === saved.provider)) {
              setProvider(saved.provider);
              if (saved.model) setModel(saved.model);
              return;
            }
          }
        } catch {}
        const ready = list.find((x: ProviderInfo) => x.ready);
        if (ready) setProvider(ready.id);
      })
      .catch(() => {});
    api
      .listSessions(id)
      .then((sess) => {
        setSessions(sess);
        const urlSid = searchParams.get("s");
        if (urlSid && sess.find((s) => String(s.id) === urlSid)) {
          setActiveSessionId(urlSid);
        } else if (sess.length > 0) {
          const first = String(sess[0].id);
          setActiveSessionId(first);
          router.push(`/chat/${id}?s=${first}`);
        }
      })
      .catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // provider -> model list
  useEffect(() => {
    if (!provider) return;
    api
      .listModels(provider)
      .then((list) => {
        setModels(list);
        if (list.length === 0) {
          setModel("");
          return;
        }
        const hasCurrent = list.find((m) => m.id === model);
        if (!hasCurrent) {
          try {
            const raw = localStorage.getItem(`chat:model:${id}`);
            if (raw) {
              const saved = JSON.parse(raw);
              if (saved.provider === provider && saved.model && list.find((m) => m.id === saved.model)) {
                setModel(saved.model);
                return;
              }
            }
          } catch {}
          setModel(list[0].id);
        }
      })
      .catch(() => {
        setModels([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, id]);

  // persist provider+model combo per profile
  useEffect(() => {
    if (!provider) return;
    try {
      localStorage.setItem(`chat:model:${id}`, JSON.stringify({ provider, model }));
    } catch {}
  }, [provider, model, id]);

  // Attach to active background stream replay & live events
  async function attachToStream(sid: string) {
    if (activeStreamReaderRef.current) {
      activeStreamReaderRef.current.abort();
    }
    const controller = new AbortController();
    activeStreamReaderRef.current = controller;

    setStreaming(true);
    setWaitingFirstToken(true);

    try {
      const res = await fetch(`${api.base}/api/chat/${id}/stream?session_id=${sid}`, {
        signal: controller.signal,
        headers: await withAuthHeaders(),
      });
      if (!res.ok || !res.body) return;

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
          if (event.event === "tool_call") {
            setToolCalls((prev) => [...prev, event]);
            setWaitingFirstToken(false);
          } else if (event.event === "error_tool") {
            setToolCalls((prev) => [...prev, { name: "error", args: { detail: event.detail } }]);
          } else if (event.event === "reasoning" && event.delta) {
            setThinkingText((prev) => prev + event.delta);
            setWaitingFirstToken(false);
          } else if (event.delta) {
            full += event.delta;
            setStreamText(full);
            setWaitingFirstToken(false);
          } else if (event.event === "done" || event.event === "error") {
            if (event.event === "error") {
              setError(event.detail || "Error in response");
            }
            break;
          }
        }
      }

      // Stream completed: reload session history from DB to get final saved assistant message
      if (sid === activeSessionId) {
        api.sessionHistory(id, sid).then(setMessages).catch(() => {});
        api.listSessions(id).then(setSessions).catch(() => {});
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    } finally {
      if (sid === activeSessionId) {
        setStreaming(false);
        setWaitingFirstToken(false);
        setStreamText("");
        setThinkingText("");
      }
    }
  }

  // load session history when activeSessionId changes & check if stream is running in background
  useEffect(() => {
    if (!activeSessionId) return;

    // Reset current UI stream state
    activeStreamReaderRef.current?.abort();
    setStreamText("");
    setThinkingText("");
    setToolCalls([]);
    setStreaming(false);
    setWaitingFirstToken(false);

    if (sessionMessagesCache.current[activeSessionId]) {
      setMessages(sessionMessagesCache.current[activeSessionId]);
    }

    api
      .sessionHistory(id, activeSessionId)
      .then((h) => {
        sessionMessagesCache.current[activeSessionId] = h;
        setMessages(h);
      })
      .catch((e) => setError(String(e)));

    // Check if stream is currently active in background for this session
    fetch(`${api.base}/api/chat/${id}/status?session_id=${activeSessionId}`)
      .then((r) => r.json())
      .then((status) => {
        if (status.active) {
          attachToStream(activeSessionId);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeSessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamText, thinkingText, waitingFirstToken, pendingUser]);

  async function handleTranslate(target: "hinglish" | "hi" | "en") {
    setLanguage(target);
    const assistantOnly = messages.filter((m) => m.role === "assistant");
    if (assistantOnly.length === 0) return;
    const toTranslate = assistantOnly.filter((m) => !translatedCache[m.id]?.[target]);
    if (toTranslate.length === 0) return;
    setTranslating(true);
    try {
      const results = await Promise.all(
        toTranslate.map(async (m) => {
          try {
            const r = await api.translate(m.content, target, provider || null);
            return { id: m.id, translated: r.translated };
          } catch {
            return { id: m.id, translated: m.content };
          }
        }),
      );
      setTranslatedCache((prev) => {
        const next = { ...prev };
        for (const { id: mid, translated } of results) {
          if (!next[mid]) next[mid] = {};
          next[mid][target] = translated;
        }
        return next;
      });
    } finally {
      setTranslating(false);
    }
  }

  // AppShell locale sync -> retro-translate visible session.
  useEffect(() => {
    if (!localeInitialized.current) {
      localeInitialized.current = true;
      return;
    }
    if (messages.length === 0) return;
    const mapped: "hi" | "en" | "hinglish" = locale === "hi" ? "hi" : locale === "en" ? "en" : "hinglish";
    const pending = messages.some(
      (m) => m.role === "assistant" && !translatedCache[m.id]?.[mapped],
    );
    if (pending) handleTranslate(mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  function autoGrow() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }

  async function handleNewChat() {
    activeStreamReaderRef.current?.abort();
    setStreamText("");
    setThinkingText("");
    setWaitingFirstToken(false);
    setStreaming(false);
    setToolCalls([]);
    try {
      const sess = await api.createSession(id, "New chat");
      setSessions((prev) => [sess, ...prev]);
      setActiveSessionId(String(sess.id));
      setMessages([]);
      setError("");
      router.push(`/chat/${id}?s=${sess.id}`);
    } catch (e) {
      setError(String(e));
    }
  }

  function handleSelectSession(sid: number) {
    const sidStr = String(sid);
    if (sidStr === activeSessionId) return;
    activeStreamReaderRef.current?.abort();
    setStreamText("");
    setThinkingText("");
    setWaitingFirstToken(false);
    setStreaming(false);
    setToolCalls([]);
    if (sessionMessagesCache.current[sidStr]) {
      setMessages(sessionMessagesCache.current[sidStr]);
    }
    setError("");
    setActiveSessionId(sidStr);
    router.push(`/chat/${id}?s=${sid}`);
  }

  async function handleRename(sid: number, current: string) {
    const next = window.prompt("Rename session", current);
    if (!next || next.trim() === current) return;
    try {
      const updated = await api.renameSession(id, sid, next.trim().slice(0, 80));
      setSessions((prev) => prev.map((s) => (s.id === sid ? updated : s)));
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleDelete(sid: number) {
    if (!window.confirm(t("chat.delete_confirm"))) return;
    try {
      await api.deleteSession(id, sid);
      setSessions((prev) => prev.filter((s) => s.id !== sid));
      if (String(sid) === activeSessionId) {
        const remaining = sessions.filter((s) => s.id !== sid);
        if (remaining.length > 0) {
          router.push(`/chat/${id}?s=${remaining[0].id}`);
          setActiveSessionId(String(remaining[0].id));
        } else {
          const fresh = await api.listSessions(id);
          setSessions(fresh);
          if (fresh.length > 0) {
            router.push(`/chat/${id}?s=${fresh[0].id}`);
            setActiveSessionId(String(fresh[0].id));
          } else {
            setActiveSessionId(null);
            setMessages([]);
          }
        }
      }
    } catch (e) {
      setError(String(e));
    }
  }

  async function send(e?: React.FormEvent, overrideText?: string) {
    e?.preventDefault();
    const text = (overrideText ?? input).trim();
    if (!text || streaming) return;

    let sid = activeSessionId;
    if (!sid) {
      try {
        const sess = await api.createSession(id, text.slice(0, 40) || "New chat");
        setSessions((prev) => [sess, ...prev]);
        sid = String(sess.id);
        setActiveSessionId(sid);
        router.push(`/chat/${id}?s=${sid}`);
      } catch (err) {
        setError(String(err));
        return;
      }
    }

    if (!overrideText) {
      setInput("");
      if (taRef.current) taRef.current.style.height = "auto";
    }
    setError("");

    // Optimistically show user message
    setMessages((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].role === "user" && prev[prev.length - 1].content === text) {
        return prev;
      }
      return [
        ...prev,
        { id: Date.now(), role: "user", content: text, language, created_at: new Date().toISOString(), session_id: Number(sid) },
      ];
    });

    setStreaming(true);
    setStreamText("");
    setThinkingText("");
    setWaitingFirstToken(true);
    setToolCalls([]);

    // Attach stream reader controller
    activeStreamReaderRef.current?.abort();
    const controller = new AbortController();
    activeStreamReaderRef.current = controller;

    try {
      const res = await fetch(`${api.base}/api/chat/${id}?session_id=${sid}`, {
        method: "POST",
        headers: await withAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ message: text, language, provider: provider || null, model: model || null }),
        signal: controller.signal,
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
          if (event.event === "tool_call") {
            setToolCalls((prev) => [...prev, event]);
            setWaitingFirstToken(false);
          } else if (event.event === "error_tool") {
            setToolCalls((prev) => [...prev, { name: "error", args: { detail: event.detail } }]);
          } else if (event.event === "reasoning" && event.delta) {
            setThinkingText((prev) => prev + event.delta);
            setWaitingFirstToken(false);
          } else if (event.delta) {
            full += event.delta;
            setStreamText(full);
            setWaitingFirstToken(false);
          } else if (event.event === "done" || event.event === "error") {
            if (event.event === "error") {
              setError(event.detail || "Error in response");
            }
            break;
          }
        }
      }

      // Reload fresh messages from DB to get the saved assistant message
      if (sid === activeSessionId) {
        api.sessionHistory(id, sid).then((h) => {
          sessionMessagesCache.current[sid] = h;
          setMessages(h);
        }).catch(() => {});
        api.listSessions(id).then(setSessions).catch(() => {});
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return;
      }
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      if (sid === activeSessionId) {
        setStreaming(false);
        setStreamText("");
        setThinkingText("");
        setWaitingFirstToken(false);
      }
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
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] max-w-6xl gap-4">
      {/* Session sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col rounded-xl border border-goldline bg-panel p-2 sm:flex">
        <button
          onClick={handleNewChat}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-saffron-600 px-3 py-2 text-sm font-bold text-white hover:bg-saffron-700"
        >
          <Plus size={14} /> {t("chat.new")}
        </button>
        <div className="flex-1 space-y-1 overflow-y-auto pr-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm ${String(s.id) === activeSessionId ? "bg-saffron-100 font-semibold text-saffron-800" : "hover:bg-saffron-50 text-stone-700"}`}
            >
              <button onClick={() => handleSelectSession(s.id)} className="flex-1 truncate text-left">
                {s.title}
              </button>
              <button onClick={() => handleRename(s.id, s.title)} className="opacity-0 group-hover:opacity-100 p-1 text-stone-500 hover:text-saffron-700" aria-label={t("chat.rename")}>
                <Pencil size={12} />
              </button>
              <button onClick={() => handleDelete(s.id)} className="opacity-0 group-hover:opacity-100 p-1 text-stone-500 hover:text-red-600" aria-label="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {sessions.length === 0 && <p className="p-3 text-xs text-stone-500">{t("chat.none")}</p>}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-goldline bg-panel/60 px-1 pb-2.5 pt-1">
          <div>
            <Link
              href={`/profiles/${id}`}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold text-saffron-800 hover:bg-saffron-100 transition"
            >
              <ArrowLeft size={14} /> {locale === "hi" ? "कुंडली देखें" : "Back to Chart"}
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
                  {p.id === "cliproxy" ? "CLIProxy (Antigravity)" : p.id}
                  {!p.ready && " · " + t("menu.nokey")}
                </option>
              ))}
            </select>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-lg border border-goldline bg-panel px-2 py-1.5 text-xs font-bold text-stone-600 max-w-[220px]"
              aria-label="Model"
              disabled={models.length === 0}
            >
              {models.length === 0 ? (
                <option value="">{model || "—"}</option>
              ) : (
                models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} {m.ctx} {m.free ? "FREE" : ""} {m.tools ? "" : "· no-tools"}
                  </option>
                ))
              )}
            </select>
            <div className="flex rounded-lg border border-goldline bg-panel p-0.5">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => handleTranslate(l.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${language === l.id ? "bg-saffron-600 text-white" : "text-stone-600 hover:bg-saffron-100"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* mobile new chat */}
        <div className="flex gap-2 py-2 sm:hidden">
          <button onClick={handleNewChat} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-saffron-600 px-3 py-2 text-xs font-bold text-white">
            <Plus size={12} /> {t("chat.new")}
          </button>
          <select value={activeSessionId ?? ""} onChange={(e) => handleSelectSession(Number(e.target.value))} className="flex-1 rounded-lg border border-goldline bg-panel px-2 py-2 text-xs">
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        <div className="border-b border-goldline/60 bg-saffron-50/60 px-3 py-1.5 text-center text-[11px] font-semibold text-saffron-800">
          {translating ? t("chat.translating") : langNote}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1">
          {messages.length === 0 && !streaming && !pendingUser && (
            <div className="rounded-xl border border-dashed border-gold bg-saffron-50/70 p-6 text-center text-sm text-stone-600">{t("chat.empty")}</div>
          )}

          {messages.map((m, idx) => {
            const isLastMessage = idx === messages.length - 1;
            const isOrphanedUser = m.role === "user" && isLastMessage && !streaming && !pendingUser;
            const display =
              m.role === "assistant" ? (translatedCache[m.id]?.[language] ?? m.content) : m.content;
            return m.role === "user" ? (
              <div key={m.id} className="space-y-1.5">
                <div className="flex items-end justify-end gap-2">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-saffron-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
                    {display}
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-goldline bg-panel text-saffron-700">
                    <UserRound size={15} />
                  </span>
                </div>
                {isOrphanedUser && (
                  <div className="flex items-center justify-end pr-10">
                    <button
                      onClick={() => send(undefined, m.content)}
                      className="flex items-center gap-1.5 rounded-lg border border-goldline bg-panel px-2.5 py-1 text-xs font-semibold text-saffron-800 shadow-sm transition hover:bg-saffron-100"
                    >
                      <RotateCw size={12} />
                      {locale === "hi" ? "उत्तर प्राप्त करें / पुनः प्रयास" : "Generate response"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div key={m.id} className="group flex items-start gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-goldline bg-sidebarbg text-saffron-700">
                  <Sparkles size={15} />
                </span>
                <div className="max-w-[88%]">
                  <div className="prose-chat rounded-2xl rounded-tl-sm border border-goldline bg-panel px-4 py-3 text-sm text-ink shadow-sm">
                    <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>{display}</Markdown>
                  </div>
                  <button
                    onClick={() => copyMessage(display, idx)}
                    className="mt-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-stone-500 opacity-0 transition group-hover:opacity-100 hover:bg-saffron-100"
                  >
                    {copiedIdx === idx ? <Check size={11} /> : <Copy size={11} />}
                    {copiedIdx === idx ? (locale === "hi" ? "कॉपी हो गया" : "Copied") : locale === "hi" ? "कॉपी" : "Copy"}
                  </button>
                </div>
              </div>
            );
          })}

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
              <div className="max-w-[88%] w-full">
                {toolCalls.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {toolCalls.map((tc, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-full border border-gold bg-saffron-50 px-2.5 py-1 text-[11px] font-semibold text-saffron-800"
                      >
                        🔧 Consulted {tc.name} {tc.args?.at_date ? `· ${tc.args.at_date}` : tc.args?.detail ? `· ${tc.args.detail}` : ""}
                      </span>
                    ))}
                  </div>
                )}

                {thinkingText && (
                  <details className="mb-2.5 rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-stone-700 transition" open={!streamText}>
                    <summary className="cursor-pointer font-bold text-amber-800 flex items-center gap-1.5 select-none">
                      <Sparkles size={13} className="text-amber-600 animate-pulse" />
                      <span>{streamText ? (locale === "hi" ? "विचार प्रक्रिया (क्लिक करें)" : "Thought process (expand)") : (locale === "hi" ? "कुंडली का विश्लेषण चल रहा है..." : "Analyzing chart & thinking...")}</span>
                    </summary>
                    <div className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-stone-600 max-h-44 overflow-y-auto pl-2 border-l-2 border-amber-300">
                      {thinkingText}
                    </div>
                  </details>
                )}

                <div className="min-h-[2.75rem] rounded-2xl rounded-tl-sm border border-goldline bg-panel px-4 py-3 text-sm shadow-sm">
                  {streamText ? (
                    <div className="prose-chat">
                      <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>{streamText}</Markdown>
                      <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-saffron-600 align-middle" />
                    </div>
                  ) : (
                    <span className="flex gap-1 py-1.5" aria-label="thinking">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-saffron-500" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
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
          <button disabled={streaming || !input.trim()} className="flex h-[46px] items-center gap-1.5 rounded-xl bg-saffron-600 px-5 text-sm font-bold text-white hover:bg-saffron-700 disabled:opacity-50">
            {t("chat.send")}
          </button>
        </form>
      </div>
    </div>
  );
}
