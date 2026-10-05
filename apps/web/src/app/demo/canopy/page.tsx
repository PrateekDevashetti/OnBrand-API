/* eslint-disable @next/next/no-img-element */
/**
 * Demo: a new Canopy page built only from OnBrand's extraction of trycanopy.space.
 * Every value below is copied from that brand system (colours, type stacks, button CSS),
 * which is what the "With OnBrand" side of the landing-page comparison shows.
 */
export const metadata = { title: "Canopy · How it works (built with OnBrand)", robots: { index: false } };

const T = {
  surface: "#FFFFFF",
  subtle: "#F4F3F5",
  ink: "#101011",
  graphite: "#606266",
  green: "#2E8C2E",
  button: "#171717",
  display: 'Inter, "Inter Placeholder", sans-serif',
  ui: '"Google Sans Flex", "Google Sans", system-ui, -apple-system, sans-serif',
  mono: '"Fragment Mono", monospace',
};

const STEPS = [
  { n: "01", t: "Connect your brand", d: "Bring guidelines, past campaigns and product shots. Canopy learns the look before it makes anything." },
  { n: "02", t: "Localise every market", d: "One brief becomes on-brand creative for each region, language and channel, reviewed in one place." },
  { n: "03", t: "Ship with confidence", d: "Every asset is checked against the brand before it leaves the studio, with notes your team can act on." },
];

export default function CanopyDemo() {
  return (
    <div style={{ background: T.surface, color: T.ink, fontFamily: T.ui, minHeight: "100vh" }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Fragment+Mono&family=Google+Sans+Flex:wght@400;500;600&display=swap" />
      <div style={{ padding: "16px 80px 0" }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 70, padding: "0 30px", border: `1px solid ${T.subtle}`, borderRadius: 999 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 600, letterSpacing: "0.06em", fontSize: 17 }}>
            <img src="/brand/canopy-mark-black.png" alt="" style={{ height: 26 }} /> CANOPY AI
          </div>
          <div style={{ display: "flex", gap: 28, color: T.graphite, fontSize: 15 }}>
            {["Product", "How it Works", "Workflows", "For Teams", "Pricing"].map((l) => (
              <span key={l} style={{ color: l === "How it Works" ? T.ink : T.graphite }}>{l}</span>
            ))}
          </div>
          <span style={{ background: T.button, color: "#fff", borderRadius: 999, padding: "10px 20px", fontSize: 15, fontWeight: 600 }}>Request a Demo</span>
        </nav>
      </div>

      <section style={{ padding: "84px 80px 0", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 64, alignItems: "end" }}>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 13, color: T.graphite, letterSpacing: "0.04em" }}>HOW IT WORKS</div>
          <h1 style={{ fontFamily: T.display, fontWeight: 500, fontSize: 64, lineHeight: 1.02, letterSpacing: "-0.03em", color: T.green, margin: "18px 0 0" }}>
            On-brand creative, in every market you sell
          </h1>
        </div>
        <p style={{ fontSize: 19, lineHeight: 1.55, color: T.graphite, margin: 0 }}>
          Canopy turns one brief into localised campaigns that look like your team made them. Here is how a brand goes from guidelines to finished assets.
        </p>
      </section>

      <section style={{ padding: "56px 80px 0", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {STEPS.map((s) => (
          <div key={s.n} style={{ border: `1px solid ${T.subtle}`, borderRadius: 20, padding: "28px 28px 32px", background: s.n === "02" ? T.subtle : T.surface }}>
            <div style={{ fontFamily: T.mono, fontSize: 13, color: T.green }}>{s.n}</div>
            <div style={{ fontFamily: T.display, fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 40 }}>{s.t}</div>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: T.graphite, margin: "12px 0 28px" }}>{s.d}</p>
            <span style={{ display: "inline-block", border: `1px solid ${T.ink}`, borderRadius: 999, padding: "9px 18px", fontSize: 14, fontWeight: 600 }}>Learn more</span>
          </div>
        ))}
      </section>

      <section style={{ margin: "40px 80px 0", padding: "26px 30px", borderRadius: 20, background: T.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: T.display, fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em" }}>Private alpha now open for agencies, studios and brand teams.</div>
        <span style={{ background: "#fff", color: T.ink, borderRadius: 999, padding: "10px 20px", fontSize: 15, fontWeight: 600 }}>Request a Demo</span>
      </section>
    </div>
  );
}
