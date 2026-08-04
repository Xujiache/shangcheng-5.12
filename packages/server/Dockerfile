# 多阶段构建：构建 + 运行
# ============ 构建阶段 ============
FROM node:20-alpine AS builder
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@9

# 拷贝 monorepo 根配置和需要的 packages
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

# 安装依赖（仅 server 和 shared）
RUN pnpm install --filter @jiujiu/server... --frozen-lockfile

# 构建 shared 和 server
RUN pnpm --filter @jiujiu/shared build
RUN cd packages/server && pnpm prisma:generate && pnpm build

# ============ 运行阶段 ============
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g pnpm@9

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/prisma ./packages/server/prisma
COPY --from=builder /app/packages/server/node_modules ./packages/server/node_modules

EXPOSE 3000

CMD ["node", "packages/server/dist/main.js"]
