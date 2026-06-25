# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
# 로컬 기본값. Render 등 PaaS는 런타임에 PORT를 주입합니다.
ENV PORT=50006

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    apk add --no-cache curl

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/bin /app/data/uploads && \
    curl -fsSL https://api.aihub.or.kr/api/aihubshell.do -o /app/bin/aihubshell && \
    chmod +x /app/bin/aihubshell && \
    chown -R nextjs:nodejs /app/data /app/bin

USER nextjs
EXPOSE 50006
VOLUME ["/app/data"]

CMD ["node", "server.js"]
