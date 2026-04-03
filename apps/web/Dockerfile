FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package files
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Force a clean install to resolve native dependencies (Tailwind Oxide, SWC, LightningCSS) 
# for the correct architecture (Alpine ARM64) instead of relying on the host's lockfile
RUN rm -rf package-lock.json node_modules && npm install

# Copy the rest of the application
COPY . .

# We need the API Base URL at build time for any static generation that might use it
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

# Build the Next.js app
RUN npm run build --workspace=apps/web

# Create the production image
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built artifacts and necessary files from builder
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "run", "start", "--workspace=apps/web"]
