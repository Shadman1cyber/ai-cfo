FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile

COPY . .
RUN npm run db:generate
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env ./.env

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]