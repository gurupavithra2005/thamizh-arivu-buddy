import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { translateTexts } from "@/lib/translate.functions";

export type Lang = "en" | "ta";
const STORAGE_KEY = "thamizharivu-lang";
const CACHE_KEY = "thamizharivu-tx-cache-v1";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; busy: boolean }>({
  lang: "en",
  setLang: () => {},
  busy: false,
});

export const useLang = () => useContext(LangContext);

const TAMIL = /[\u0B80-\u0BFF]/g;
const LATIN = /[A-Za-z]/g;

/** True when a string already reads in the target language. */
function isInTarget(text: string, target: Lang) {
  const ta = (text.match(TAMIL) ?? []).length;
  const la = (text.match(LATIN) ?? []).length;
  if (ta + la === 0) return true;
  return target === "ta" ? la === 0 || ta / (ta + la) > 0.8 : ta === 0;
}

function loadCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/**
 * Whole-site language switch. The chosen language re-renders every visible
 * text on every page (including loaded passages and AI answers) through the
 * translation service; originals are restored when switching back.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [busy, setBusy] = useState(false);
  const originals = useRef(new WeakMap<Text, string>());
  const applied = useRef(new WeakMap<Text, string>());
  const cache = useRef<Record<string, string>>({});
  const langRef = useRef<Lang>("en");

  useEffect(() => {
    cache.current = loadCache();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ta" || saved === "en") {
      langRef.current = saved;
      setLangState(saved);
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    langRef.current = l;
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    const root = document.getElementById("app-root");
    if (!root) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const collect = () => {
      const nodes: Text[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || parent.closest("script,style,textarea,input,code,[data-no-translate]")) {
            return NodeFilter.FILTER_REJECT;
          }
          return node.nodeValue && node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      });
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      return nodes;
    };

    const run = async () => {
      const target = langRef.current;
      const nodes = collect();
      const pending = new Map<string, Text[]>();
      for (const node of nodes) {
        const current = node.nodeValue ?? "";
        // React replaced the text since our last write → treat as new original
        if (applied.current.get(node) !== current) originals.current.set(node, current);
        const original = originals.current.get(node) ?? current;
        const trimmed = original.trim();
        let next: string;
        if (isInTarget(trimmed, target)) next = original;
        else {
          const hit = cache.current[`${target}:${trimmed}`];
          if (hit) next = original.replace(trimmed, hit);
          else {
            pending.set(trimmed, [...(pending.get(trimmed) ?? []), node]);
            continue;
          }
        }
        if (current !== next) {
          node.nodeValue = next;
        }
        applied.current.set(node, next);
      }
      if (pending.size === 0) return;
      setBusy(true);
      const keys = [...pending.keys()];
      for (let i = 0; i < keys.length && !cancelled; i += 40) {
        const batch = keys.slice(i, i + 40);
        try {
          const { translations } = await translateTexts({ data: { texts: batch, target } });
          if (cancelled || langRef.current !== target) break;
          batch.forEach((src, j) => {
            const tr = translations[j] ?? src;
            cache.current[`${target}:${src}`] = tr;
            for (const node of pending.get(src) ?? []) {
              const original = originals.current.get(node) ?? src;
              const value = original.replace(src, tr);
              node.nodeValue = value;
              applied.current.set(node, value);
            }
          });
        } catch (e) {
          console.error("[i18n] translate failed", e);
        }
      }
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache.current));
      } catch {
        /* cache full — ignore */
      }
      if (!cancelled) setBusy(false);
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void run(), 350);
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      observer.disconnect();
      setBusy(false);
    };
  }, [lang]);

  return <LangContext.Provider value={{ lang, setLang, busy }}>{children}</LangContext.Provider>;
}
