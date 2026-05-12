# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time public env vars (baked into client bundle)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_PAYME_MERCHANT_ID
ARG NEXT_PUBLIC_PAYME_TEST_MODE
ARG NEXT_PUBLIC_TELEGRAM_BOT_TOKEN
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CLICK_MERCHANT_ID
ARG NEXT_PUBLIC_CLICK_SERVICE_ID
ARG NEXT_PUBLIC_CLICK_TEST_MODE
# Legacy VITE_ aliases (still read by src/lib/supabase.js)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_TELEGRAM_BOT_TOKEN
ARG VITE_PAYME_MERCHANT_ID
ARG VITE_PAYME_TEST_MODE
ARG VITE_CLICK_MERCHANT_ID
ARG VITE_CLICK_SERVICE_ID
ARG VITE_CLICK_TEST_MODE

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
