# Mangrove web (Next.js). Node.js runtime only.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Public env is inlined at build time. Production never uses fixtures (ADR-038).
ARG NEXT_PUBLIC_USE_MOCKS=false
ARG NEXT_PUBLIC_BASEMAP_URL=
ENV NEXT_PUBLIC_USE_MOCKS=$NEXT_PUBLIC_USE_MOCKS NEXT_PUBLIC_BASEMAP_URL=$NEXT_PUBLIC_BASEMAP_URL
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
