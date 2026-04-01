FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package files
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies (will install for all workspaces)
RUN npm ci

# Copy the rest of the application
COPY . .

# Generate Prisma Client (requires DATABASE_URL for prisma.config.ts during build)
ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/diet_designer?schema=public"
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate

# Build the API
RUN npm run build --workspace=apps/api

# Create the production image
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built artifacts and necessary files from builder
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 4000

ENV NODE_ENV=production

# Run migrations and start the server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/prisma/schema.prisma && npm run start --workspace=apps/api"]