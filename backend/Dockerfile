FROM node:20-bookworm
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 4000
CMD ["npx", "tsx", "src/server.ts"]
