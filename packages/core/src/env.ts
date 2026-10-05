import path from "node:path";

function read(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

export const env = {
  get databaseUrl() {
    return read("DATABASE_URL", "postgres://localhost:5432/onbrand");
  },
  get anthropicKey() {
    return read("ANTHROPIC_API_KEY");
  },
  get model() {
    return read("ONBRAND_MODEL", "claude-opus-5-5");
  },
  get firecrawlKey() {
    return read("FIRECRAWL_API_KEY");
  },
  /** inline = run jobs inside the web process; worker = enqueue for apps/worker */
  get engineMode(): "inline" | "worker" {
    return read("ONBRAND_ENGINE_MODE", "inline") === "worker" ? "worker" : "inline";
  },
  get storageDir() {
    return read("ONBRAND_STORAGE_DIR", path.resolve(process.cwd(), "storage"));
  },
  get publicStorageBase() {
    return read("ONBRAND_STORAGE_PUBLIC_URL", "/api/files");
  },
  get chromiumPath() {
    return read("CHROMIUM_PATH");
  },
  get appUrl() {
    return read("NEXT_PUBLIC_APP_URL", "http://localhost:3100");
  },
  get signupCredits() {
    return Number(read("ONBRAND_SIGNUP_CREDITS", "20"));
  },
};
