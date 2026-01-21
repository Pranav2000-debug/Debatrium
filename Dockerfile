# -- multi stage single image setup --

# ---------- FRONTEND BUILD ----------

FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build



# ---------- BACKEND SETUP ----------
FROM node:22-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --only-production

COPY backend/ .



# ---------- FINAL RUNTIME IMAGE ----------
FROM nginx:alpine

COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy backend app
COPY --from=backend-builder /app/backend /app/backend

# Install node in final image (to run backend)
RUN apk add --no-cache nodejs npm

# Copy nginx config 
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Start backend + nginx
CMD sh -c "PORT=4000 node /app/backend/server.js & nginx -g 'daemon off;'"