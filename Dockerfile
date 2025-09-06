FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Add execute permissions and build with production env
ENV NODE_ENV=production
ENV CI=false
RUN chmod +x ./node_modules/.bin/react-scripts && npm run build

FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY backend/ ./
COPY --from=frontend-builder /app/frontend/build ./public

# Add build tools and rebuild native dependencies
RUN apk add --no-cache python3 make g++ \
    && npm rebuild sqlite3 \
    && apk del python3 make g++

RUN mkdir -p uploads data
EXPOSE 5000
CMD ["npm", "start"]