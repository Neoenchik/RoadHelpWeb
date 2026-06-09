FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --include=dev --legacy-peer-deps --omit=optional --no-audit --no-fund

COPY . .

EXPOSE 3000

# Named volume may mount an empty node_modules on first run — install deps then start dev.
CMD ["sh", "-c", "if [ ! -d node_modules/@microsoft/signalr ] || [ ! -d node_modules/leaflet ]; then npm install --include=dev --legacy-peer-deps --no-audit --no-fund; fi && npm run dev"]
