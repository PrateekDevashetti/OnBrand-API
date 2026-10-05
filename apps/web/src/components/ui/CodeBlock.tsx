"use client";

import { useState } from "react";
import { CopyIcon } from "./icons";

/** Tiny highlighter tuned for shell / curl / JSON snippets. */
function highlight(code: string) {
  const out: React.ReactNode[] = [];
  const re = /('[^']*'|"[^"]*")|(--?[a-zA-Z][\w-]*)|(\b(?:curl|claude|npx|codex|gemini|npm|export|mcp|add|skills)\b)|(https?:\/\/[^\s'"\\]+)|(\b(?:true|false|null)\b)|(\\$)/gm;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const [tok] = m;
    const cls = m[1]
      ? "text-[#9fd88a]"
      : m[2]
        ? "text-[#7fb6ff]"
        : m[3]
          ? "text-[#e88ad6]"
          : m[4]
            ? "text-[#f0a37c]"
            : m[5]
              ? "text-[#e8b765]"
              : "text-dim";
    out.push(
      <span key={i++} className={cls}>
        {tok}
      </span>,
    );
    last = m.index + tok.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy"
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      className={`text-dim transition-colors hover:text-cream ${className}`}
    >
      {done ? <span className="font-mono text-[10px] text-ok">copied</span> : <CopyIcon />}
    </button>
  );
}

export function CodeBlock({ code, className = "", plain = false }: { code: string; className?: string; plain?: boolean }) {
  return (
    <div className={`code relative ${className}`}>
      <CopyButton text={code} className="absolute top-3.5 right-3.5" />
      <pre className="overflow-x-auto pr-8 whitespace-pre">{plain ? code : highlight(code)}</pre>
    </div>
  );
}
