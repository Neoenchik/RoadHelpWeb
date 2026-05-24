FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --include=dev --legacy-peer-deps --omit=optional --no-audit --no-fund

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
