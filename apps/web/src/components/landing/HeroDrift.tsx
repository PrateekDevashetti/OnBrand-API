/* eslint-disable @next/next/no-img-element */

/**
 * Brand thumbnails drift in from both sides and slide behind the hero search bar,
 * as if being pulled into the extractor. The input sits above (z-20); cards fade as they reach it.
 */
const LANES = [
  { side: -1, y: -64, delay: 0, rot: -6 },
  { side: 1, y: -30, delay: 1.6, rot: 5 },
  { side: -1, y: 38, delay: 3.2, rot: 4 },
  { side: 1, y: 58, delay: 4.8, rot: -5 },
  { side: -1, y: -8, delay: 6.4, rot: -3 },
  { side: 1, y: 10, delay: 8, rot: 3 },
];

export function HeroDrift({ shots }: { shots: string[] }) {
  if (!shots.length) return null;
  return (
    <div className="hero-drift pointer-events-none absolute top-[451px] left-1/2 z-10 max-md:top-[195px]" aria-hidden="true">
      {LANES.map((l, i) => (
        <div
          key={i}
          className="drift-card absolute h-[78px] w-[124px] overflow-hidden rounded-[8px] border border-white/10 bg-[#111] shadow-[0_14px_30px_rgba(0,0,0,0.45)]"
          style={{ "--side": l.side, "--y": `${l.y}px`, "--rot": `${l.rot}deg`, animationDelay: `${l.delay}s` } as React.CSSProperties}
        >
          <img src={shots[i % shots.length]} alt="" className="h-full w-full object-cover object-top" />
        </div>
      ))}
    </div>
  );
}
