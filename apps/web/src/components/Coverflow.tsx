"use client";

import { useEffect, useRef } from "react";

/** The twelve brand blocks of the loader, in orbit order (left wing → right wing). */
const BLOCKS: { bg: string; content?: React.ReactNode }[] = [
  { bg: "linear-gradient(180deg,#dcdde1,#c8c9cd)" },
  {
    bg: "repeating-linear-gradient(90deg,#ff4b1f 0 15px,#d93a12 15px 16px)",
    content: (
      <div className="absolute inset-y-[14px] left-[18px] flex gap-[3px] font-mono text-[10px] leading-none font-bold tracking-[0.28em] text-[#3a1306] [writing-mode:vertical-rl]">
        <span>PARALLEL PARALLEL</span>
        <span>PARALLEL</span>
      </div>
    ),
  },
  { bg: "radial-gradient(60% 45% at 42% 66%,#0fa84a 0%,#7fcf9b 35%,#eef3ee 75%) #eef3ee" },
  { bg: "radial-gradient(55% 40% at 58% 52%,#eaa2b1 0%,#f3cdd2 45%,#fbf0ee 80%) #fbf0ee" },
  { bg: "repeating-linear-gradient(90deg,#f6cdb7 0 11px,#fbe6da 11px 18px,#eab49d 18px 21px)" },
  { bg: "#e6c21e" },
  { bg: "linear-gradient(90deg,#fff8e6 0%,#f7d354 18%,#5fb1ff 48%,#7c5cff 78%,#f4f0ff 100%)" },
  {
    bg: "#0631c6",
    content: (
      <div className="absolute inset-y-[14px] right-[14px] flex gap-[4px] font-serif leading-none text-white [writing-mode:vertical-rl]">
        <span className="text-[13px] tracking-[0.06em]">DER SCHWARZE ADLER</span>
        <span className="text-[10px] italic opacity-80">Geschichte &amp; Biografien</span>
      </div>
    ),
  },
  { bg: "#e4e4e4", content: <span className="absolute right-0 bottom-[22%] left-0 h-[34%] bg-[#ff4b1f]" /> },
  { bg: "#0f0f0f", content: <span className="absolute top-[22%] bottom-[16%] left-0 w-[46%] bg-[#f0c400]" /> },
  { bg: "linear-gradient(180deg,#f3f0e6,#e9e5d8)" },
  {
    bg: "#2f4a3a",
    content: (
      <span className="absolute top-1/2 left-1/2 flex h-[28px] w-[38px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[6px] bg-[#c9ec5a] font-mono text-[15px] font-bold text-[#17220f]">
        08
      </span>
    ),
  },
];

/** The centre lens: a soft hexagon holding the abstract app icon. */
function Lens() {
  return (
    <svg width="230" height="216" viewBox="0 0 230 216" className="absolute" style={{ zIndex: 200 }} aria-hidden="true">
      <polygon points="40,4 190,4 228,108 190,212 40,212 2,108" fill="#ffffff" stroke="rgba(0,0,0,0.06)" />
      <g transform="translate(53,46)">
        <rect x="0" y="0" width="124" height="124" rx="16" fill="#1f47b8" stroke="#1e1e1e" strokeWidth="5" />
        <clipPath id="ob-lens-clip">
          <rect x="2.5" y="2.5" width="119" height="119" rx="14" />
        </clipPath>
        <g clipPath="url(#ob-lens-clip)">
          <circle cx="96" cy="26" r="30" fill="#f2efe4" />
          <circle cx="20" cy="112" r="40" fill="#0fa84a" />
          <path d="M20 92 C 34 50, 62 42, 108 20" stroke="#ff4b1f" strokeWidth="9" strokeLinecap="round" fill="none" />
          <g transform="translate(58,66) rotate(10)">
            <rect width="34" height="30" rx="3" fill="#f0c400" stroke="#1e1e1e" strokeWidth="2" />
            {[7, 13, 19, 25].map((x) => (
              <rect key={x} x={x} y="5" width="2.4" height="20" fill="#1e1e1e" />
            ))}
          </g>
          {[[18, 108], [33, 103], [48, 108], [63, 102], [78, 107], [93, 101], [108, 107]].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="4" fill="#ffffff" />
          ))}
        </g>
      </g>
    </svg>
  );
}

/**
 * The "extracting" loader: twelve brand blocks orbit on a 3D arc and pass behind the lens.
 * Pass screenshot URLs to swap the blocks for real brands from the index.
 */
export function Coverflow({ images = [], scale = 1, className = "" }: { images?: string[]; scale?: number; className?: string }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const N = BLOCKS.length;
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const start = performance.now();
    const place = (phase: number) => {
      for (let i = 0; i < N; i++) {
        const el = refs.current[i];
        if (!el) continue;
        let off = i - phase;
        if (off < -N / 2) off += N;
        if (off > N / 2) off -= N;
        const a = off * 0.24;
        const x = Math.sin(a) * 520;
        const z = (Math.cos(a) - 1) * 420;
        el.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${a * 1.5}rad)`;
        el.style.zIndex = String(100 - Math.round(Math.abs(off) * 6));
        el.style.opacity = String(Math.abs(off) > 5.6 ? 0 : 1);
      }
    };
    if (reduce) {
      place(N / 2 - 0.5);
      return;
    }
    const tick = (now: number) => {
      place(((now - start) / 1500) % N);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [N]);
  return (
    <div
      role="img"
      aria-label="Extracting brand system"
      className={`pointer-events-none relative flex items-center justify-center ${className}`}
      style={{ perspective: 1100, height: 240 * scale, transform: `scale(${scale})` }}
    >
      <Lens />
      {BLOCKS.map((b, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="absolute h-[168px] w-[118px] overflow-hidden rounded-[20px] shadow-[0_18px_34px_rgba(0,0,0,0.35)]"
          style={{ background: images[i] ? `#111 url(${images[i]}) center top/cover` : b.bg, willChange: "transform" }}
        >
          {!images[i] && b.content}
        </div>
      ))}
    </div>
  );
}
