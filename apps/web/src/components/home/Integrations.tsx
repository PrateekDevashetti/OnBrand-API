"use client";

import { useState } from "react";
import { CodeBlock } from "../ui/CodeBlock";
import { config } from "@/lib/config";

type Client = "claude" | "cursor" | "codex" | "vscode" | "desktop";

const CLIENTS: { value: Client; label: string }[] = [
  { value: "claude", label: "Claude Code" },
  { value: "cursor", label: "Cursor" },
  { value: "codex", label: "Codex CLI" },
  { value: "vscode", label: "VS Code" },
  { value: "desktop", label: "Claude Desktop" },
];

function mcpSnippets(client: Client) {
  const url = config.mcpUrl;
  switch (client) {
    case "claude":
      return [
        `claude mcp add --transport http onbrand \\\n  ${url}`,
        `claude mcp add --transport http onbrand \\\n  ${url} \\\n  --header "Authorization: Bearer YOUR_API_KEY"`,
      ];
    case "codex":
      return [`codex mcp add onbrand --url ${url}`, `codex mcp add onbrand --url ${url} \\\n  --bearer-token-env-var ONBRAND_API_KEY`];
    case "cursor":
    case "vscode":
      return [
        JSON.stringify({ mcpServers: { onbrand: { url } } }, null, 2),
        JSON.stringify({ mcpServers: { onbrand: { url, headers: { Authorization: "Bearer YOUR_API_KEY" } } } }, null, 2),
      ];
    case "desktop":
      return [
        JSON.stringify({ mcpServers: { onbrand: { command: "npx", args: ["-y", "mcp-remote", url] } } }, null, 2),
        JSON.stringify({ mcpServers: { onbrand: { command: "npx", args: ["-y", "mcp-remote", url, "--header", "Authorization: Bearer YOUR_API_KEY"] } } }, null, 2),
      ];
  }
}

function ClientGlyph() {
  return <span className="mr-1 text-[15px] text-[#d97757]">✳</span>;
}

export function Integrations() {
  const [tab, setTab] = useState<"mcp" | "skills" | "api">("mcp");
  const [client, setClient] = useState<Client>("claude");
  const [primary, withKey] = mcpSnippets(client);
  return (
    <div>
      <h3 className="text-[20px] text-cream">Agent Integrations</h3>
      <p className="mt-[6px] text-[13px] text-dim">Give your AI agents brand data</p>
      <div className="mt-[22px] flex gap-[9px]">
        {(["mcp", "skills", "api"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-[36px] rounded-full px-[13px] text-[13.5px] transition-colors ${tab === t ? "bg-cream text-ink" : "bg-[#2a2a2a] text-cream hover:bg-[#333]"}`}
          >
            {t === "mcp" ? "MCP" : t === "skills" ? "Skills" : "API"}
          </button>
        ))}
      </div>
      {tab === "mcp" && (
        <div className="animate-in">
          <p className="mt-[20px] text-[11.5px] leading-[1.25] text-dim">
            Connect the OnBrand MCP server to your AI client. Add the server, then run /mcp in Claude Code to sign in, or pass an API key.
          </p>
          <div className="mt-[12px]">
            <ClientPicker value={client} onChange={setClient} />
          </div>
          <CodeBlock className="mt-[12px]" code={primary} />
          <p className="mt-[14px] mb-[8px] text-[13px] text-dim">Or authenticate with an API key</p>
          <CodeBlock code={withKey} />
        </div>
      )}
      {tab === "skills" && (
        <div className="animate-in">
          <p className="mt-[20px] mb-[12px] text-[13px] text-dim">Install the OnBrand skills into your AI agent.</p>
          <CodeBlock code={`npx skills add ${config.skillsRepo}`} />
        </div>
      )}
      {tab === "api" && (
        <div className="animate-in">
          <p className="mt-[20px] mb-[12px] text-[13px] text-dim">Swap YOUR_API_KEY for a key from the API Keys page.</p>
          <CodeBlock
            code={`curl --location '${config.apiBase}/extract' \\\n  --header 'Authorization: Bearer YOUR_API_KEY' \\\n  --header 'Content-Type: application/json' \\\n  --data '{\n    "url": "https://ramp.com",\n    "depth": "deep"\n  }'`}
          />
        </div>
      )}
    </div>
  );
}

function ClientPicker({ value, onChange }: { value: Client; onChange: (c: Client) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex h-[40px] w-full items-center rounded-[4px] border border-line-2 px-3.5 text-left">
        <ClientGlyph />
        <span className="text-[14px] text-cream">{CLIENTS.find((c) => c.value === value)?.label}</span>
        <svg className="ml-auto text-dim" width="11" height="11" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.6 5 6.6l3-3" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
      {open && (
        <ul className="absolute top-[44px] right-0 left-0 z-30 rounded-[6px] border border-line-2 bg-[#1f1f1f] py-1 shadow-xl shadow-black/40">
          {CLIENTS.map((c) => (
            <li key={c.value}>
              <button type="button" onClick={() => { onChange(c.value); setOpen(false); }} className={`block w-full px-3.5 py-2 text-left text-[13px] hover:bg-[#2a2a2a] ${c.value === value ? "text-cream" : "text-dim"}`}>
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
