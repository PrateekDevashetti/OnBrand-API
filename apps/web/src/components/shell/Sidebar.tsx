"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; badge?: "BETA" | "ALPHA"; match?: string[] };
type Group = { label?: string; items: Item[] };

const GROUPS: Group[] = [
  { items: [{ href: "/app", label: "Home" }] },
  {
    label: "API Playground",
    items: [
      { href: "/app/extract", label: "Brand Extraction", badge: "BETA", match: ["/app/extract"] },
      { href: "/app/search", label: "Style Search", badge: "ALPHA", match: ["/app/search", "/app/styles"] },
      { href: "/app/adherence", label: "Adherence", badge: "ALPHA" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/app/usage", label: "Usage" },
      { href: "/app/history", label: "History" },
      { href: "/app/api-keys", label: "API Keys" },
      { href: "/docs", label: "Documentation" },
      { href: "/app/billing", label: "Billing" },
      { href: "/app/profile", label: "Profile" },
    ],
  },
];

export function Sidebar() {
  const path = usePathname();
  const isActive = (it: Item) =>
    it.href === "/app" ? path === "/app" : (it.match ?? [it.href]).some((m) => path === m || path.startsWith(m + "/"));

  return (
    <nav className="relative ml-[15px] mt-[20px] w-[214px] border-l border-line pb-1" aria-label="Dashboard">
      {GROUPS.map((g, gi) => (
        <div key={gi} className={gi === 0 ? "" : gi === 1 ? "mt-[47px]" : "mt-[55px]"}>
          {g.label && <div className="mb-[14px] pl-[15px] text-[11.5px] text-dim">{g.label}</div>}
          <ul className="flex flex-col gap-[16px]">
            {g.items.map((it) => {
              const active = isActive(it);
              return (
                <li key={it.href} className="relative">
                  {active && <span className="absolute top-[-8px] bottom-[-8px] left-[-1px] w-[2px] bg-cream" />}
                  <Link
                    href={it.href}
                    className={`flex h-[34px] items-center gap-[12px] pl-[15px] text-[14px] transition-colors ${active ? "font-medium text-cream" : "text-[#d5d7d3] hover:text-cream"}`}
                  >
                    {it.label}
                    {it.badge && <span className={it.badge === "BETA" ? "badge-beta" : "badge-alpha"}>{it.badge}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
