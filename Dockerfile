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
RUN sed -i "s/\r$//" /app/scripts/*.sh && chmod +x /app/scripts/*.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["/app/scripts/entrypoint.sh"]
