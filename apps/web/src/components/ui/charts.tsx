/** Hand-rolled SVG charts matching the dashboard's monochrome style. */

export function LineChart({
  series,
  labels,
  height = 230,
  yTicks,
}: {
  series: { values: number[]; dashed?: boolean; color?: string }[];
  labels: [string, string];
  height?: number;
  yTicks?: number[];
}) {
  const W = 424;
  const H = height;
  const padL = 34;
  const padB = 30;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const top = yTicks ? Math.max(...yTicks) : Math.ceil(max);
  const ticks = yTicks ?? [0, Math.ceil(top / 3), Math.ceil((2 * top) / 3), top].filter((v, i, a) => a.indexOf(v) === i);
  const n = Math.max(2, series[0]?.values.length ?? 2);
  const x = (i: number) => padL + (i / (n - 1)) * (W - padL - 4);
  const y = (v: number) => 8 + (1 - v / top) * (H - padB - 14);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Usage chart">
      {ticks.map((t) => (
        <text key={t} x={padL - 14} y={y(t) + 4} textAnchor="end" className="fill-dim font-mono text-[11px]">
          {t}
        </text>
      ))}
      <line x1={padL - 4} x2={W} y1={y(0) + 4} y2={y(0) + 4} stroke="#2c2c2b" />
      {series.map((s, si) => {
        const d = s.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${(y(v) + 4).toFixed(1)}`).join(" ");
        return <path key={si} d={d} fill="none" stroke={s.color ?? (s.dashed ? "#8b8d89" : "#f3f6f0")} strokeWidth={s.dashed ? 1 : 1.4} strokeDasharray={s.dashed ? "3 3" : undefined} strokeLinejoin="round" />;
      })}
      <text x={0} y={H - 4} className="fill-dim font-mono text-[12px]">
        {labels[0]}
      </text>
      <text x={W} y={H - 4} textAnchor="end" className="fill-dim font-mono text-[12px]">
        {labels[1]}
      </text>
    </svg>
  );
}

/** Thin vertical spikes per day (Usage page). */
export function SpikeChart({ values, labels, height = 250, kind = "bars" }: { values: number[]; labels: [string, string]; height?: number; kind?: "bars" | "line" }) {
  const W = 440;
  const H = height;
  const max = Math.max(1, ...values);
  const n = values.length;
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const base = H - 30;
  const y = (v: number) => base - (v / max) * (base - 14);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Daily usage">
      <line x1={0} x2={W} y1={base + 1} y2={base + 1} stroke="#3a3a39" />
      {kind === "bars"
        ? values.map((v, i) => (v > 0 ? <line key={i} x1={x(i)} x2={x(i)} y1={base} y2={y(v)} stroke="#8b8d89" strokeWidth={2} /> : null))
        : (
          <path d={values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} fill="none" stroke="#f3f6f0" strokeWidth={1.3} strokeLinejoin="round" />
        )}
      <text x={0} y={H - 4} className="fill-dim font-mono text-[12px]">
        {labels[0]}
      </text>
      <text x={W} y={H - 4} textAnchor="end" className="fill-dim font-mono text-[12px]">
        {labels[1]}
      </text>
    </svg>
  );
}

export function MultiLine({ series, labels, height = 250 }: { series: { values: number[]; dash?: string; color?: string }[]; labels: [string, string]; height?: number }) {
  const W = 440;
  const H = height;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const n = Math.max(2, series[0]?.values.length ?? 2);
  const base = H - 30;
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => base - (v / max) * (base - 14);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Credits by feature">
      <line x1={0} x2={W} y1={base + 1} y2={base + 1} stroke="#3a3a39" />
      {series.map((s, si) => (
        <path key={si} d={s.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} fill="none" stroke={s.color ?? "#f3f6f0"} strokeWidth={1.2} strokeDasharray={s.dash} strokeLinejoin="round" />
      ))}
      <text x={0} y={H - 4} className="fill-dim font-mono text-[12px]">
        {labels[0]}
      </text>
      <text x={W} y={H - 4} textAnchor="end" className="fill-dim font-mono text-[12px]">
        {labels[1]}
      </text>
    </svg>
  );
}

/** 60-bar meter: filled share in cream, remainder muted. */
export function BarMeter({ ratio, bars = 60 }: { ratio: number; bars?: number }) {
  const filled = Math.round(Math.max(0, Math.min(1, ratio)) * bars);
  return (
    <div className="flex h-[33px] items-stretch justify-between" aria-label={`${Math.round(ratio * 100)}% used`}>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className={`w-[3px] rounded-[1px] ${i < filled ? "bg-cream" : "bg-[#4a4b49]"}`} />
      ))}
    </div>
  );
}
