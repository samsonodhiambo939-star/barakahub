FROM node:22-alpine

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl curl

# Copy package files
COPY package*.json ./

# Install ALL dependencies (build + runtime)
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client and build TypeScript
RUN npx prisma generate && npm run build

# Remove source files (keep dist)
RUN rm -rf src tsconfig.json

EXPOSE 3000

# Start script - wait for DB then run migrations
CMD npx prisma migrate deploy 2>/dev/null; node dist/index.js
