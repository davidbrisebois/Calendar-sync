FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY api ./api
COPY db ./db
COPY lib ./lib
COPY public ./public
COPY server.js ./server.js
COPY scripts ./scripts

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["/scripts/entrypoint.sh"]
