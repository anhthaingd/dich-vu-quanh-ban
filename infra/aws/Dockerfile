# Build and runtime use the same OS/architecture for sharp native modules.
FROM node:24.22.1-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY services/api/package.json services/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY apps/admin/package.json apps/admin/package.json
RUN npm ci --workspace services/api --include-workspace-root
COPY services/api/tsconfig.json services/api/tsconfig.build.json services/api/
COPY services/api/src services/api/src
COPY services/api/migrations services/api/migrations
COPY services/api/seeds services/api/seeds
COPY scripts/build scripts/build
RUN npx tsc -p services/api/tsconfig.build.json && node scripts/build/api.mjs
RUN npm prune --omit=dev --workspace services/api --include-workspace-root
# Official RDS trust bundle; TLS verification stays on in node-postgres.
RUN node -e "fetch('https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem').then(r=>{if(!r.ok)throw Error('CA download');return r.text()}).then(x=>{if(!x.includes('BEGIN CERTIFICATE'))throw Error('Invalid CA');require('fs').writeFileSync('/app/rds-ca.pem',x)})"
FROM node:24.22.1-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/api/dist ./services/api/dist
COPY --from=build /app/services/api/node_modules ./services/api/node_modules
COPY --from=build /app/services/api/package.json ./services/api/package.json
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/rds-ca.pem ./rds-ca.pem
COPY scripts/aws/database.mjs ./scripts/aws/database.mjs
USER node
EXPOSE 3100
CMD ["node", "services/api/dist/src/main.js"]
