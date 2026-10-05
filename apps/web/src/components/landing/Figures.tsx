"use client";

import { Exploded, Riffle, Terrain } from "@lucasmarkes/hairline/react";

export function FigureExtract() {
  return <Exploded theme="dark" intensity={0.6} aria-label="A page opened into its brand layers" />;
}
export function FigureSearch() {
  return <Riffle theme="dark" intensity={0.55} aria-label="A tray of brand systems; the one under the pointer stands up" />;
}
export function FigureVerify() {
  return <Terrain theme="dark" intensity={0.5} aria-label="Scores rising where the design matches the brand" />;
}
