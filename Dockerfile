FROM node:20-slim

WORKDIR /app

# Install dependencies (force dev deps so vite/esbuild are available for the build)
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy source and build the client + server bundle
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Railway provides PORT at runtime; the server reads process.env.PORT
CMD ["node", "dist/index.js"]
