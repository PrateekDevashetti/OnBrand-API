# OnBrand engine worker (Railway). The web app deploys to Vercel and ignores this file.
# The Playwright base image ships Chromium + every system library it needs, pinned to the
# same version as the playwright-core dependency.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app
ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    NEXT_TELEMETRY_DISABLED=1

# Install workspace dependencies first so they cache across code changes.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/core/package.json packages/core/
COPY packages/sdk/package.json packages/sdk/
RUN npm ci --include=dev --workspace @onbrand/worker --workspace @onbrand/core --include-workspace-root

COPY . .

EXPOSE 8080
CMD ["npm", "run", "start", "-w", "@onbrand/worker"]
