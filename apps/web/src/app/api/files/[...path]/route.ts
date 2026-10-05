import { getObject } from "@onbrand/core";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", svg: "image/svg+xml", html: "text/plain; charset=utf-8", css: "text/css; charset=utf-8", json: "application/json" };

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const key = path.join("/");
  const body = await getObject(key);
  if (!body) return new Response("Not found", { status: 404 });
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const download = new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(download ? { "Content-Disposition": `attachment; filename="${key.split("/").pop()}"` } : {}),
    },
  });
}
