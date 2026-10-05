import { listApiKeys } from "@onbrand/core";
import { getSessionUser } from "@/lib/auth";
import { NewKeyButton } from "@/components/NewKeyButton";
import { RevokeKey } from "@/components/account/RevokeKey";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "API Keys" };

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Never");

export default async function ApiKeysPage() {
  const user = (await getSessionUser())!;
  const keys = await listApiKeys(user.id);
  return (
    <div className="px-[50px] pt-[50px] pb-[40px] max-md:px-[20px] max-md:pt-[28px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[37px] leading-none text-cream">API Keys</h1>
          <p className="mt-[22px] text-[19px] text-dim">Keys authenticate the REST API, the MCP server and the skills.</p>
        </div>
        <NewKeyButton className="btn-solid h-[40px]" label="Create a new key" />
      </div>
      <div className="mt-[44px] overflow-hidden rounded-[2px] bg-card max-lg:overflow-x-auto">
        <div className="max-lg:min-w-[820px] grid grid-cols-[1.3fr_1.3fr_1fr_1fr_120px] border-b border-[#232322] px-[30px] py-[24px] text-[13.5px] text-dim">
          <span>Name</span><span>Key</span><span>Created</span><span>Last used</span><span />
        </div>
        {keys.map((k) => (
          <div key={k.id} className="max-lg:min-w-[820px] data-row grid-cols-[1.3fr_1.3fr_1fr_1fr_120px]">
            <span className="text-[13.5px] text-cream">{k.name}</span>
            <span className="font-mono text-[12px] text-dim">{k.prefix}••••••••</span>
            <span className="text-[12.5px] text-dim">{fmt(k.createdAt)}</span>
            <span className="text-[12.5px] text-dim">{fmt(k.lastUsedAt)}</span>
            <RevokeKey id={k.id} />
          </div>
        ))}
        {!keys.length && <div className="px-[30px] py-[40px] text-[13px] text-dim">No keys yet. Create one to call the API from your agent.</div>}
      </div>
      <h2 className="mt-[56px] text-[20px] text-cream">Quick test</h2>
      <p className="mt-[8px] text-[13px] text-dim">Swap YOUR_API_KEY for one of the keys above.</p>
      <CodeBlock className="mt-[16px] max-w-[880px]" code={`curl ${config.apiBase}/me \\\n  --header 'Authorization: Bearer YOUR_API_KEY'`} />
    </div>
  );
}
