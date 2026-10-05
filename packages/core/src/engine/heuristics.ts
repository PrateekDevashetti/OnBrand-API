import type { Capture } from "./signals";
import type { digest } from "./analyze";
import { clusterColors, ramp, typeScale, fontFamilies, breakpoints, primaryFamily } from "./analyze";
import type { GroupKey } from "./synthesize";
import type { Color, TypeStyle } from "../types";

type Digest = ReturnType<typeof digest>;

const TONE_NAMES: Record<string, string[]> = {
  Dark: ["Ink Black", "Charcoal", "Deep Graphite", "Night"],
  Light: ["Off-White", "Paper", "Mist", "Bone"],
  Neutral: ["Muted Grey", "Stone", "Slate", "Ash"],
  Accent: ["Signal Accent", "Brand Accent", "Highlight", "Spark"],
};

function hueName(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max - min < 24) return "";
  let h = 0;
  if (max === r) h = ((g - b) / (max - min)) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  h = (h * 60 + 360) % 360;
  const names: [number, string][] = [[15, "Red"], [40, "Orange"], [65, "Yellow"], [160, "Green"], [195, "Teal"], [255, "Blue"], [290, "Violet"], [335, "Pink"], [360, "Red"]];
  return names.find(([lim]) => h <= lim)![1];
}

export function heuristicColors(capture: Capture) {
  const fams = clusterColors(capture.signals);
  const used: Record<string, number> = {};
  const toColor = (f: (typeof fams)[number]): Color => {
    const i = (used[f.tone] = (used[f.tone] ?? -1) + 1);
    const hue = hueName(f.hex);
    const name = f.tone === "Accent" && hue ? `${hue} Accent` : TONE_NAMES[f.tone][i % 4];
    const role = f.role.bg >= f.role.text ? "surface" : "text";
    return {
      name,
      hex: f.hex,
      tone: f.tone,
      description: `Observed primarily as a ${role} color (${Math.round(f.weight)} weight).`,
      usage: [role === "surface" ? "Backgrounds" : "Typography", ...(f.role.border > 0 ? ["Borders"] : [])],
      shades: f.members.length > 1 ? f.members.slice(1, 5) : ramp(f.hex),
    };
  };
  const colors = fams.map(toColor);
  return {
    baseline: colors.slice(0, 2).concat(colors.filter((c) => c.tone === "Accent").slice(0, 1)),
    secondary: colors.slice(2, 6).filter((c) => c.tone !== "Accent"),
    others: colors.slice(6).concat(colors.filter((c) => c.tone === "Accent").slice(1)),
    notes: [],
  };
}

function toType(t: ReturnType<typeof typeScale>["titles"][number], role: string): TypeStyle {
  return { family: t.primary, role, size: t.size, weight: t.weight, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing, textTransform: t.transform, stack: t.family };
}

export function heuristicGroup(key: GroupKey, capture: Capture, d: Digest): unknown {
  const s = capture.signals;
  switch (key) {
    case "identity": {
      const host = new URL(s.url).hostname.replace(/^www\./, "");
      const name = s.siteName || host.split(".")[0].replace(/^\w/, (c) => c.toUpperCase());
      const fams = clusterColors(s);
      const mode = fams[0] && fams[0].lightness < 40 ? "dark" : "light";
      return {
        identity: {
          companyName: name,
          pageTitle: s.title,
          pageTags: ["Core Marketing", new URL(s.url).pathname === "/" ? "Homepage" : "Subpage", "Web"],
          purpose: s.description || `${name} website`,
          mainCta: s.buttons[0]?.text ?? "",
          summary: `${mode === "dark" ? "Dark" : "Light"} interface anchored by ${fams.slice(0, 2).map((f) => f.hex).join(" and ")}, set in ${fontFamilies(s).map((f) => f.family).slice(0, 2).join(" and ") || "system fonts"}.`,
          keywords: [mode === "dark" ? "dark mode" : "light", "web"],
          copyTone: [],
          visualHighlights: "",
          accentStrategy: "",
          targetAudience: [],
          executiveSynthesis: s.description,
          primaryStyle: { name: "Modern", rationale: "" },
          secondaryStyle: { name: "Corporate", rationale: "" },
          styleTags: [],
          mode,
        },
      };
    }
    case "palette": {
      return {
        colors: heuristicColors(capture),
        surfaces: {
          textures: [s.gradients.length ? "gradient linear" : "flat", ...(s.backdrops.length ? ["glass blur"] : [])],
          solids: clusterColors(s)
            .filter((f) => f.role.bg > f.role.text)
            .slice(0, 6)
            .map((f) => ({ name: `Surface ${f.hex}`, hex: f.hex, description: "Observed background surface", usage: ["Section backgrounds"] })),
          gradients: s.gradients.slice(0, 6).map((g, i) => ({ name: `Gradient ${i + 1}`, css: g.value, description: "Observed gradient", usage: [g.sample ?? ""] })),
        },
      };
    }
    case "typography": {
      const sc = typeScale(s);
      const roles = ["L", "M", "S", "XS", "XXS", "XXXS"];
      return {
        typography: {
          summary: fontFamilies(s).length <= 1 ? "single-typeface" : `${fontFamilies(s).length} families`,
          families: fontFamilies(s).map((f) => ({ family: f.family, classification: /mono/i.test(f.family) ? "Monospace" : "Sans-serif", usage: "", source: f.src ? "Self-hosted" : "System / provider", downloadUrl: f.src })),
          titles: sc.titles.map((t, i) => toType(t, `Global Headline ${roles[i]}`)),
          body: sc.body.map((t, i) => toType(t, `Body ${roles[i]}`)),
          labels: sc.labels.map((t, i) => toType(t, `Label ${roles[i]}`)),
          others: sc.others.map((t, i) => toType(t, `Other ${i + 1}`)),
          notes: [],
        },
      };
    }
    case "spatial": {
      const bps = breakpoints(s);
      return {
        layout: {
          classification: [],
          grid: { columns: "12", gutter: "", maxWidth: "" },
          breakpoints: bps.map((b) => ({ name: b < 768 ? "Mobile" : b < 992 ? "Tablet" : b < 1440 ? "Desktop" : "Large", range: `${b}px`, detail: "" })),
          sectionSeparation: "",
          template: s.sections.map((x) => `[${x.tag} ${x.headline || ""}]`).join("\n"),
          annotations: "",
          insights: [],
        },
        elevation: {
          summary: s.shadows.length ? "Uses box-shadows for elevation" : "Primarily flat; borders separate content",
          shadows: s.shadows.slice(0, 6).map((x, i) => ({ name: `Shadow ${i + 1}`, kind: "drop", css: x.value, description: "", usage: [] })),
          borders: s.borders.slice(0, 10).map((b) => ({ css: b.value, description: "" })),
        },
        structure: { dividers: s.borders.slice(0, 3).map((b, i) => ({ name: `Divider ${i + 1}`, css: b.value, description: "", usage: [] })) },
      };
    }
    case "components": {
      const css = (o: Record<string, string> | null | undefined) =>
        o ? Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${v}`).join("; ") : "";
      return {
        interactions: {
          buttons: s.buttons.slice(0, 8).map((b) => ({
            name: b.text,
            label: b.text,
            description: "",
            radius: parseFloat(b.css.borderRadius) > 20 ? "rounded-full" : parseFloat(b.css.borderRadius) > 0 ? "rounded" : "rounded-none",
            surface: parseInt(b.parentBg.slice(1, 3), 16) < 128 ? "dark" : "light",
            defaultCss: css(b.css),
            hoverCss: css(b.hover),
            sizes: [`Default: ${b.css.fontSize} · ${b.css.padding}`],
          })),
          links: [],
          inputs: s.inputs.map((i) => ({ name: i.placeholder || "Input", description: "", usage: [], css: css(i.css) })),
        },
        navigation: {
          height: s.nav?.height ?? "",
          position: s.nav?.position ?? "",
          background: s.nav?.background ?? "",
          tabs: [],
        },
        icons: { sets: s.icons.length ? [{ name: "Inline SVG icons", format: "SVG", style: "", description: "", whenToUse: [], sizes: [...new Set(s.icons.map((i) => `${i.w}px`))].join(", "), examples: s.icons.map((i) => i.label).filter(Boolean).slice(0, 6) }] : [] },
        motion: {
          patterns: [s.nav?.position === "fixed" || s.nav?.position === "sticky" ? "sticky header" : "", s.media.some((m) => m.kind === "video") ? "video background" : ""].filter(Boolean),
          animations: [
            ...s.keyframes.slice(0, 6).map((k) => ({ name: k.name, description: "", code: k.css })),
            ...s.transitions.slice(0, 4).map((t, i) => ({ name: `transition-${i + 1}`, description: "", code: t.value })),
          ],
        },
        dataDisplay: { tiles: [] },
      };
    }
    case "sections": {
      return {
        sections: s.sections.map((x, i) => ({
          name: i === 0 ? "Hero" : x.tag === "footer" ? "Footer" : x.headline ? x.headline.slice(0, 40) : `Section ${i + 1}`,
          layout: "",
          headline: x.headline,
          components: Object.entries(x.counts).filter(([, n]) => n > 0).map(([k, n]) => ({ name: k, description: `${n} × ${k}` })),
        })),
        media: s.media.slice(0, 20).map((m) => ({ name: m.src.split("/").pop()?.split("?")[0] ?? "asset", description: m.alt, kind: (m.kind === "video" ? "video" : m.kind === "illustration" ? "illustration" : "image") as "video" | "image" | "illustration", url: m.src })),
      };
    }
  }
  void d;
  void primaryFamily;
  return {};
}
