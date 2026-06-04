# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

COPY . .

RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
