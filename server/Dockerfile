FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY src/ ./src/

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "src/index.js"]
