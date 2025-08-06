# Base image with Node.js
FROM node:20.11.1-alpine AS base

# Update package index and install system dependencies
RUN apk update --no-cache

RUN apk add --no-cache libc6-compat postgresql

# Set up Turbo pruning in a separate build stage
FROM base AS builder

# Set working directory
WORKDIR /app

# Install Turbo globally
RUN yarn global add turbo

# Copy all project files
COPY . .

# Run Turbo prune to optimize dependencies for the web workspace & scripts
RUN turbo prune @rentlydev/rnota-web @rentlydev/rnota-scripts --docker

# ----------------------
# Install Dependencies
# ----------------------
FROM base AS installer

# Set working directory
WORKDIR /app

# Copy lockfile and package.json files from the builder stage
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Enable Corepack for package management
RUN corepack enable
RUN echo "PNPM Version: $(pnpm -v)"

# Install dependencies using pnpm (locked versions)
RUN pnpm install --frozen-lockfile

# Copy the full pruned project files
COPY --from=builder /app/out/full/ .

# Build the project for production
RUN pnpm build:next

# ----------------------
# Final Production Image
# ----------------------
FROM base AS runner

# Set working directory
WORKDIR /app

# Enable Corepack for package management
RUN corepack enable

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the built application files
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./next/standalone
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./next/standalone/apps/web/.next/static
# COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./next/standalone/apps/web/public

# Copy the scripts internal package
COPY --from=installer --chown=nextjs:nodejs /app/internal/scripts ./scripts
# Copy the drizzle migrations
COPY --from=installer --chown=nextjs:nodejs /app/internal/db/drizzle ./scripts/drizzle
# Copy the drizzle migration script
COPY --from=installer --chown=nextjs:nodejs /app/internal/db/src/scripts/migrate.ts ./scripts/migrate.ts
RUN chmod +x scripts/run.sh

# Set user to non-root
USER nextjs

# Expose application port
EXPOSE 3000

# Environment variables for runtime configuration
ENV HOSTNAME="0.0.0.0"
ENV AUTH_TRUST_HOST="true"
ENV NEXT_TELEMETRY_DISABLED=1

# Start the Next.js server
# CMD ["node", "next/standalone/apps/web/server.js"]
# CMD ["sh", "scripts/run.sh"]
