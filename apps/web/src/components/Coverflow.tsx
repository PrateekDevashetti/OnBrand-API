"use client";

import { useEffect, useRef } from "react";

const TILES = [
  "linear-gradient(135deg,#ff4d6d,#3a0ca3)",
  "linear-gradient(135deg,#f3f6f0,#cfd2cb)",
  "linear-gradient(160deg,#fff7d6,#f5e7b2)",
  "linear-gradient(135deg,#111,#2b2b2b)",
  "linear-gradient(135deg,#d9c2a7,#7a5c3e)",
  "linear-gradient(135deg,#ff2a2a,#ffb3b3)",
  "linear-gradient(135deg,#0f3d2e,#4caf50)",
  "linear-gradient(135deg,#1b1b1b,#ffd400)",
  "linear-gradient(135deg,#e9f17a,#c6d63c)",
  "linear-gradient(135deg,#fdfcf8,#e8e4da)",
  "linear-gradient(135deg,#2563eb,#93c5fd)",
  "linear-gradient(135deg,#0ea5e9,#312e81)",
  "linear-gradient(135deg,#f472b6,#be185d)",
  "linear-gradient(135deg,#f5f5f4,#a8a29e)",
  "linear-gradient(135deg,#14b8a6,#0f172a)",
];

/**
 * 3D arc of brand cards rotating behind a lens — the "extracting" loader.
 * Pass screenshot URLs to show real brands from the index.
 */
export function Coverflow({ images = [], scale = 1, className = "" }: { images?: string[]; scale?: number; className?: string }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const N = 15;
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const phase = ((now - start) / 1400) % N;
      for (let i = 0; i < N; i++) {
        const el = refs.current[i];
        if (!el) continue;
        let off = i - phase;
        if (off < -N / 2) off += N;
        if (off > N / 2) off -= N;
        const a = off * 0.21;
        const x = Math.sin(a) * 520;
        const z = (Math.cos(a) - 1) * 420;
        const centered = Math.max(0, 1 - Math.abs(off) / 0.9);
        const s = 1 + centered * 0.32;
        el.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${a * 1.45}rad) scale(${s})`;
        el.style.zIndex = String(100 - Math.round(Math.abs(off) * 6));
        el.style.opacity = String(Math.abs(off) > 6.8 ? 0 : 1);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className={`pointer-events-none relative flex items-center justify-center ${className}`} style={{ perspective: 1100, height: 230 * scale, transform: `scale(${scale})` }}>
      <div className="absolute h-[218px] w-[200px] rounded-[64px] bg-cream/95 blur-[0.3px]" style={{ zIndex: 95 }} />
      {Array.from({ length: N }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="absolute h-[150px] w-[118px] overflow-hidden rounded-[18px] border border-black/20 shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
          style={{ background: images[i % Math.max(1, images.length)] ? `#111 url(${images[i % images.length]}) center top/cover` : TILES[i % TILES.length], willChange: "transform" }}
        />
      ))}
    </div>
  );
}
