"use client";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = "",
  size = "md",
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={`seg ${size === "sm" ? "h-[38px]" : ""} ${className}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          data-active={o.value === value}
          onClick={() => onChange(o.value)}
          className={`seg-item ${size === "sm" ? "h-[29px] px-[19px]" : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
