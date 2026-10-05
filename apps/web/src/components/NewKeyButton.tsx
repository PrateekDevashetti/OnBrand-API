"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CodeBlock } from "./ui/CodeBlock";

export function NewKeyButton({ className = "btn-outline-lg", label = "Create a new key" }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function create() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/v1/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name || "Default key" }) });
    setBusy(false);
    if (!res.ok) return setError("Could not create key");
    const j = await res.json();
    setSecret(j.secret);
    router.refresh();
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]" onClick={() => !busy && (setOpen(false), setSecret(null), setName(""))}>
          <div className="animate-in w-[520px] rounded-[14px] border border-line-2 bg-[#1a1a1a] p-7" onClick={(e) => e.stopPropagation()}>
            {!secret ? (
              <>
                <h3 className="text-[20px] text-cream">Create a new key</h3>
                <p className="mt-1.5 text-[13px] text-dim">Keys authenticate the REST API and the MCP server.</p>
                <label className="mt-6 block text-[12px] text-dim">Key name</label>
                <input autoFocus className="field mt-2" placeholder="e.g. Production agent" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
                {error && <p className="mt-3 text-[12px] text-bad">{error}</p>}
                <div className="mt-6 flex justify-end gap-3">
                  <button className="btn-outline" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button className="btn-solid" disabled={busy} onClick={create}>
                    {busy ? "Creating…" : "Create key"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-[20px] text-cream">Your new API key</h3>
                <p className="mt-1.5 text-[13px] text-dim">Copy it now — for your security we only show it once.</p>
                <CodeBlock className="mt-5" code={secret} plain />
                <div className="mt-6 flex justify-end">
                  <button className="btn-solid" onClick={() => (setOpen(false), setSecret(null), setName(""))}>
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
