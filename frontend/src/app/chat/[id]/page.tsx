"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Check, ChevronLeft, Copy, MessageSquareQuote, Mic, MicOff, Pencil, Plus, RotateCw, Sparkles, Sun, Trash2, UserRound } from "lucide-react";
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

const ANALYSIS_STAGES = [
  {
    step: 1,
    title_en: "Examining Natal Lagna & Coordinates",
    title_hi: "लग्न, जन्म चक्र एवं ग्रह स्थितियों का अवलोकन",
    desc_en: "Scanning planetary degrees, houses, signs, and natal strengths...",
    desc_hi: "ग्रहों के भोगांश, भाव, राशियाँ एवं कुंडली बल का गणितीय अध्ययन...",
    icon: "🪐",
  },
  {
    step: 2,
    title_en: "Analyzing Dasha Periods & Planetary Transits",
    title_hi: "दशा चक्र, ग्रह गोचर एवं दृष्टि विश्लेषण",
    desc_en: "Correlating active Vimshottari mahadasha/antardasha with current celestial transits...",
    desc_hi: "विंशोत्तरी महादशा/अंतर्दशा एवं वर्तमान आकाशीय गोचर का समन्वय...",
    icon: "✨",
  },
  {
    step: 3,
    title_en: "Consulting Classical Vedic Principles",
    title_hi: "महर्षि पाराशर व जैमिनी सूत्रों का समन्वय",
    desc_en: "Cross-referencing Parashari yogas, shadbala, and divisional vargas...",
    desc_hi: "वैदिक योगों, षड्बल, नवमांश व वर्गीय स्थितियों का सूक्ष्म परीक्षण...",
    icon: "📜",
  },
  {
    step: 4,
    title_en: "Synthesizing Jyotish Guidance & Remedies",
    title_hi: "दैवज्ञ परामर्श व समाधान संकलन",
    desc_en: "Formulating personalized insights, predictions, and authentic Vedic remedies...",
    desc_hi: "आपके प्रश्न के संदर्भ में सटीक मार्गदर्शन व शास्त्रसम्मत समाधान तैयार किया जा रहा है...",
    icon: "🌟",
  },
] as const;

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
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const activeStreamReaderRef = useRef<AbortController | null>(null);
  const sessionMessagesCache = useRef<Record<string, ChatMessageItem[]>>({});
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [generationSeconds, setGenerationSeconds] = useState(0);

  // Timer & stage rotation during generation
  useEffect(() => {
    let timerInterval: any = null;
    let stageInterval: any = null;

    if (streaming || waitingFirstToken) {
      setGenerationSeconds(0);
      setAnalysisStage(0);

      timerInterval = setInterval(() => {
        setGenerationSeconds((s) => s + 1);
      }, 1000);

      stageInterval = setInterval(() => {
        setAnalysisStage((prev) => (prev + 1) % 4);
      }, 2500);
    } else {
      setGenerationSeconds(0);
      setAnalysisStage(0);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (stageInterval) clearInterval(stageInterval);
    };
  }, [streaming, waitingFirstToken]);

  function handleChatScroll() {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
  }

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

      // 1. Immediately commit completed assistant message into state before clearing streaming flags
      if (full.trim() && sid === activeSessionId) {
        setMessages((prev) => {
          if (prev.some((m) => m.role === "assistant" && m.content === full)) return prev;
          return [
            ...prev,
            {
              id: Date.now(),
              role: "assistant",
              content: full,
              language,
              created_at: new Date().toISOString(),
              session_id: Number(sid),
            },
          ];
        });
      }

      // 2. Stream completed: reload authoritative session history from DB
      if (sid === activeSessionId) {
        try {
          const fresh = await api.sessionHistory(id, sid);
          if (sid === activeSessionId) {
            sessionMessagesCache.current[sid] = fresh;
            setMessages(fresh);
          }
        } catch {}
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
        setToolCalls([]);
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

  // Smart non-jittery container auto-scroll
  useEffect(() => {
    if (!chatContainerRef.current) return;
    if (isNearBottomRef.current) {
      if (streaming && streamText) {
        // Direct scroll position update during token stream prevents jerky animation fights
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      } else {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [messages, streamText, thinkingText, waitingFirstToken, pendingUser, streaming]);

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setSpeechSupported(Boolean(SpeechRec));
    }
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function toggleSpeech() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (typeof window === "undefined") return;
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert(
        locale === "hi"
          ? "आपके ब्राउज़र में स्पीच-टू-टेक्स्ट समर्थित नहीं है। कृपया Chrome, Edge या Safari का उपयोग करें।"
          : "Speech-to-text is not supported in this browser. Please try Chrome, Edge, or Safari."
      );
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === "hi" || locale === "hi" ? "hi-IN" : "en-IN";

      let baseInput = input;

      recognition.onstart = () => {
        setIsListening(true);
        baseInput = input;
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const combined = baseInput ? `${baseInput.trim()} ${transcript.trim()}` : transcript.trim();
        setInput(combined);
        if (taRef.current) {
          taRef.current.style.height = "auto";
          taRef.current.style.height = Math.min(taRef.current.scrollHeight, 140) + "px";
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
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

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

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

      // 1. Immediately commit the finished assistant message into state
      if (full.trim() && sid === activeSessionId) {
        setMessages((prev) => {
          if (prev.some((m) => m.role === "assistant" && m.content === full)) return prev;
          return [
            ...prev,
            {
              id: Date.now(),
              role: "assistant",
              content: full,
              language,
              created_at: new Date().toISOString(),
              session_id: Number(sid),
            },
          ];
        });
      }

      // 2. Reload authoritative messages from DB to get the saved assistant record
      if (sid === activeSessionId) {
        try {
          const h = await api.sessionHistory(id, sid);
          if (sid === activeSessionId) {
            sessionMessagesCache.current[sid] = h;
            setMessages(h);
          }
        } catch {}
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
        setToolCalls([]);
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
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] w-full max-w-6xl gap-4 overflow-x-hidden">
      {/* Session sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col rounded-xl border border-goldline bg-panel p-2 sm:flex">
        <button
          onClick={handleNewChat}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-saffron-600 px-3 py-2 text-sm font-bold text-white hover:bg-saffron-500 transition shadow-xs"
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

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* Responsive Toolbar Header */}
        <div className="flex flex-col gap-2 border-b border-goldline bg-panel/70 p-2 sm:px-3 sm:py-2">
          {/* Top row: Title / Breadcrumb */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-stone-500 mb-0.5">
                <Link href="/" className="hover:text-saffron-800 transition">
                  {locale === "hi" ? "जातक" : "Horoscopes"}
                </Link>
                <span className="text-stone-400">/</span>
                <Link href={`/profiles/${id}`} className="hover:text-saffron-800 transition">
                  {profile?.name}
                </Link>
                <span className="text-stone-400">/</span>
                <span className="text-saffron-900 font-bold">{locale === "hi" ? "परामर्श" : "Consultation"}</span>
              </div>
              <h1 className="truncate text-base font-bold text-saffron-900 sm:text-lg">
                {t("chat.title", { name: profile?.name ?? "…" })}
              </h1>
            </div>

            {/* Quick Chart Link for Mobile */}
            <Link
              href={`/profiles/${id}`}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-goldline bg-panel px-2.5 py-1 text-xs font-bold text-saffron-800 hover:bg-saffron-100 transition shadow-2xs sm:hidden"
            >
              <Sun size={13} className="text-saffron-600" />
              <span>{locale === "hi" ? "कुंडली" : "Chart"}</span>
            </Link>
          </div>

          {/* Controls row: Responsive wrap */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:gap-2">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="max-w-[125px] sm:max-w-none rounded-lg border border-goldline bg-panel px-2 py-1.5 text-xs font-bold capitalize text-stone-600 focus:outline-hidden"
                aria-label="AI provider"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id} disabled={!p.ready}>
                    {p.id === "cliproxy" ? "CLIProxy" : p.id}
                    {!p.ready && " · " + t("menu.nokey")}
                  </option>
                ))}
              </select>

              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="min-w-0 max-w-[155px] sm:max-w-[220px] truncate rounded-lg border border-goldline bg-panel px-2 py-1.5 text-xs font-bold text-stone-600 focus:outline-hidden"
                aria-label="Model"
                disabled={models.length === 0}
              >
                {models.length === 0 ? (
                  <option value="">{model || "—"}</option>
                ) : (
                  models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} {m.free ? "FREE" : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex shrink-0 rounded-lg border border-goldline bg-panel p-0.5 shadow-2xs">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => handleTranslate(l.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                    language === l.id ? "bg-saffron-600 text-white shadow-2xs" : "text-stone-600 hover:bg-saffron-100"
                  }`}
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

        <div
          ref={chatContainerRef}
          onScroll={handleChatScroll}
          className="flex-1 space-y-4 overflow-y-auto py-4 pr-1 scroll-smooth"
        >
          {messages.length === 0 && !streaming && !pendingUser && (
            <div className="rounded-xl border border-dashed border-gold bg-saffron-50/70 p-6 text-center text-sm text-stone-600">{t("chat.empty")}</div>
          )}

          {messages.map((m, idx) => {
            const isLastMessage = idx === messages.length - 1;
            const isOrphanedUser =
              m.role === "user" &&
              isLastMessage &&
              !streaming &&
              !waitingFirstToken &&
              !pendingUser &&
              (Boolean(error) || messages.length === 1);
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
                  <Sun size={15} />
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
            <div className="flex items-start gap-2 animate-in fade-in duration-300">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-goldline bg-sidebarbg text-saffron-600 shadow-2xs">
                <Sun size={15} className={streaming && !streamText ? "animate-spin" : "text-saffron-600"} />
              </span>
              <div className="max-w-[88%] w-full space-y-2">
                {toolCalls.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {toolCalls.map((tc, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-saffron-50 px-3 py-1 text-[11px] font-semibold text-saffron-800 shadow-2xs"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-saffron-500 animate-pulse" />
                        ⚙️ {locale === "hi" ? "परामर्शित गणना" : "Consulted"}: {tc.name} {tc.args?.at_date ? `· ${tc.args.at_date}` : tc.args?.detail ? `· ${tc.args.detail}` : ""}
                      </span>
                    ))}
                  </div>
                )}

                {thinkingText && (
                  <details className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-stone-700 transition" open={!streamText}>
                    <summary className="cursor-pointer font-bold text-amber-800 flex items-center gap-1.5 select-none">
                      <Sun size={13} className="text-amber-600 animate-pulse" />
                      <span>{streamText ? (locale === "hi" ? "विचार प्रक्रिया (क्लिक करें)" : "Thought process (expand)") : (locale === "hi" ? "कुंडली का विश्लेषण चल रहा है..." : "Analyzing chart & thinking...")}</span>
                    </summary>
                    <div className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-stone-600 max-h-44 overflow-y-auto pl-2 border-l-2 border-amber-300">
                      {thinkingText}
                    </div>
                  </details>
                )}

                <div className="relative overflow-hidden rounded-2xl rounded-tl-sm border border-goldline bg-panel p-4 shadow-sm">
                  {/* Subtle top shimmer bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-saffron-400 via-amber-300 to-saffron-500 animate-pulse" />

                  {streamText ? (
                    <div>
                      <div className="mb-2 flex items-center justify-between border-b border-goldline/30 pb-1.5 text-[11px] font-bold text-saffron-800">
                        <span className="flex items-center gap-1.5">
                          <Sparkles size={12} className="text-saffron-600 animate-pulse" />
                          {locale === "hi" ? "दैवज्ञ उत्तर संकलित हो रहा है..." : "Generating astrological guidance..."}
                        </span>
                        <span className="font-mono text-[10px] text-stone-500 bg-saffron-50 px-2 py-0.5 rounded-md border border-goldline/30">
                          ⏱️ {Math.floor(generationSeconds / 60)}:{String(generationSeconds % 60).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="prose-chat text-sm text-ink">
                        <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>{streamText}</Markdown>
                        <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-saffron-600 align-middle" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Active analysis header */}
                      <div className="flex items-center justify-between border-b border-goldline/40 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-saffron-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-saffron-600"></span>
                          </span>
                          <span className="text-xs font-bold text-saffron-900 tracking-wide uppercase">
                            {locale === "hi" ? "दैवज्ञ चिंतन एवं कुंडली विश्लेषण" : "Jyotish Calculation & Synthesis"}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-semibold text-stone-600 bg-saffron-50 px-2 py-0.5 rounded-md border border-goldline/40">
                          ⏱️ {Math.floor(generationSeconds / 60)}:{String(generationSeconds % 60).padStart(2, "0")}
                        </span>
                      </div>

                      {/* Active Astrological Step Card */}
                      <div className="flex items-start gap-3 rounded-xl bg-saffron-50/50 p-2.5 border border-goldline/30 transition-all duration-300">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg border border-goldline/60 shadow-2xs">
                          {ANALYSIS_STAGES[analysisStage].icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-stone-900 leading-snug">
                            {locale === "hi" ? ANALYSIS_STAGES[analysisStage].title_hi : ANALYSIS_STAGES[analysisStage].title_en}
                          </p>
                          <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                            {locale === "hi" ? ANALYSIS_STAGES[analysisStage].desc_hi : ANALYSIS_STAGES[analysisStage].desc_en}
                          </p>
                        </div>
                      </div>

                      {/* Step Progress Ticker */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          {ANALYSIS_STAGES.map((s, idx) => (
                            <span
                              key={idx}
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                idx === analysisStage
                                  ? "w-6 bg-saffron-600"
                                  : idx < analysisStage
                                  ? "w-2.5 bg-saffron-400"
                                  : "w-2 bg-stone-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-semibold text-stone-500">
                          {locale === "hi" ? `चरण ${analysisStage + 1} / 4` : `Step ${analysisStage + 1} of 4`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div ref={bottomRef} />
        </div>

        {isListening && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-xs text-red-700 font-semibold mb-2 animate-pulse">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
            </span>
            <span>
              {language === "hi" || locale === "hi"
                ? "सुन रहा हूँ... बोलिए (रोकने के लिए माइक पर क्लिक करें)"
                : "Listening... Speak now in Hindi or English (click mic to stop)"}
            </span>
          </div>
        )}

        <form onSubmit={send} className="flex items-end gap-2 border-t border-goldline pt-3 w-full max-w-full">
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
            className="max-h-[140px] min-w-0 flex-1 resize-none rounded-xl border border-goldline bg-panel px-3 sm:px-4 py-3 text-sm outline-none focus:border-saffron-700 focus:ring-2 focus:ring-saffron-100 disabled:opacity-60"
          />

          <button
            type="button"
            onClick={toggleSpeech}
            disabled={streaming}
            title={
              isListening
                ? (locale === "hi" ? "आवाज़ रिकॉर्डिंग बंद करें" : "Stop listening")
                : (locale === "hi" ? "बोलकर लिखें (माइक्रोफ़ोन)" : "Speech to text (Voice input)")
            }
            aria-label="Voice input"
            className={`shrink-0 flex h-[46px] w-[46px] items-center justify-center rounded-xl border transition shadow-2xs ${
              isListening
                ? "border-red-600 bg-red-600 text-white animate-pulse"
                : "border-goldline bg-panel text-stone-600 hover:text-saffron-800 hover:border-saffron-700 hover:bg-cream"
            }`}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="shrink-0 flex h-[46px] items-center gap-1.5 rounded-xl bg-saffron-600 px-4 sm:px-5 text-sm font-bold text-white hover:bg-saffron-500 disabled:opacity-50 transition shadow-2xs active:scale-95"
          >
            {t("chat.send")}
          </button>
        </form>
      </div>
    </div>
  );
}
