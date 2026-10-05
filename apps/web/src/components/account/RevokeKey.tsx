"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RevokeKey({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  return confirm ? (
    <span className="flex gap-3 text-[12px]">
      <button className="text-bad hover:underline" onClick={async () => { await fetch(`/api/v1/keys/${id}`, { method: "DELETE" }); router.refresh(); }}>Revoke</button>
      <button className="text-dim hover:text-cream" onClick={() => setConfirm(false)}>Cancel</button>
    </span>
  ) : (
    <button className="hit text-left text-[12px] text-dim hover:text-cream" onClick={() => setConfirm(true)}>Revoke</button>
  );
}
