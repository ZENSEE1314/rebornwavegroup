FROM node:20-slim

WORKDIR /app

# Install dependencies (force dev deps so vite/esbuild are available for the build)
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy source and build the client + server bundle
COPY . .
RUN npm run build

# A CJK font so the 中文 version of the contract PDF can be written
RUN apt-get update && apt-get install -y --no-install-recommends fonts-wqy-zenhei && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# Railway provides PORT at runtime; the server reads process.env.PORT
# Node only collects garbage when it nears its heap limit, and on this host that limit is huge, so memory climbed to 4 GB before anything was freed.
# A 2.5 GB cap makes it free memory early; the server's real data is far smaller.
CMD ["node", "--max-old-space-size=2560", "dist/index.js"]
