FROM node:24.19.0-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@9.0.0
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
RUN pnpm install --filter @jiujiu/server... --frozen-lockfile --ignore-scripts
RUN pnpm --filter @jiujiu/shared build && pnpm --filter @jiujiu/server prisma:generate && pnpm --filter @jiujiu/server build
RUN pnpm --filter @jiujiu/server deploy --prod /out
RUN node /app/packages/server/node_modules/prisma/build/index.js generate --schema=/out/prisma/schema.prisma

FROM node:24.19.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production SERVER_HOST=0.0.0.0 SERVER_PORT=3000
WORKDIR /app
COPY --from=builder --chown=node:node /out ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
