FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install && npm install -g prisma tsx typescript

# Copy source
COPY . .

# Generate Prisma client and build
RUN npx prisma generate && npm run build

# Remove dev dependencies
RUN npm prune --production

EXPOSE 3000

CMD npx prisma migrate deploy && npm start
