FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

RUN npm ci && \
    npm cache clean --force

COPY src ./src
COPY public ./public

RUN npm run build

FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public

RUN mkdir -p /app/data/projects /app/data/temp && \
    chown -R node:node /app/data 

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]