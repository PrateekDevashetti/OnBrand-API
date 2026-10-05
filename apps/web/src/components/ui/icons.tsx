import type { SVGProps } from "react";

/** Circular arrow button glyph (the "go" affordance used across the product). */
export function GoCircle({ size = 28, filled = false, className = "" }: { size?: number; filled?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} aria-hidden>
      <circle cx="14" cy="14" r="13.25" stroke="currentColor" strokeWidth="1.2" fill={filled ? "currentColor" : "none"} />
      <path d="M11 17l6-6M12.2 11H17v4.8" stroke={filled ? "#f3f6f0" : "currentColor"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" fill="none" {...props}>
      <path d="M21 8H1.5M8 1.2 1.2 8 8 14.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Info(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" {...props}>
      <circle cx="6" cy="6" r="5.3" stroke="currentColor" strokeWidth="1" />
      <path d="M6 5.3V8.6M6 3.5v.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function Chevron(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" {...props}>
      <path d="M2 3.6 5 6.6l3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...props}>
      <path d="M9.5 3.5 14 7.7l-4.5 4.2V9.6c-3.6 0-5.8.9-7.5 3.4.6-3.7 2.8-6.6 7.5-7.1V3.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
      <rect x="5.2" y="5.2" width="8.6" height="8.6" rx="1.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10.8 5V3.6c0-.8-.6-1.4-1.4-1.4H3.6c-.8 0-1.4.6-1.4 1.4v5.8c0 .8.6 1.4 1.4 1.4H5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" {...props}>
      <circle cx="6.2" cy="6.2" r="4.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="m9.6 9.6 3.2 3.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...props}>
      <path d="M8 2.5v8M4.6 7.3 8 10.6l3.4-3.3M2.5 12.3v1.2h11v-1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...props}>
      <path d="M6.6 9.4a2.9 2.9 0 0 0 4.1 0l2.2-2.2a2.9 2.9 0 0 0-4.1-4.1l-.9.9M9.4 6.6a2.9 2.9 0 0 0-4.1 0L3.1 8.8a2.9 2.9 0 0 0 4.1 4.1l.9-.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function LogoutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" {...props}>
      <path d="M6 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1H6M10.5 11l3-3-3-3M13.5 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Sparkle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...props}>
      <path d="M8 1.8 9.3 6.7 14.2 8 9.3 9.3 8 14.2 6.7 9.3 1.8 8l4.9-1.3L8 1.8Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}
