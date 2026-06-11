### Stage 1: Build frontend ###
FROM node:20-bookworm-slim AS frontend-build
WORKDIR /app

COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY frontend/ ./
ENV REACT_APP_BACKEND_URL=""
ENV CI=false
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN yarn build

### Stage 2: Backend runtime ###
FROM python:3.11-slim
WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend-build /app/build ./static

ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port $PORT"]