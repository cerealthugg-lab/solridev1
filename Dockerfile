# Сборка фронтенда
FROM node:20-alpine AS build-stage
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# После этой команды в папке build (или dist) появится нормальный index.html со скриптами
RUN npm run build

# Запуск сервера
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt aiofiles
COPY backend/ ./
# Копируем результат сборки в папку static
COPY --from=build-stage /app/frontend/build ./static 
# ВНИМАНИЕ: Если используете Vite, замените /build на /dist выше

ENV PORT=8080
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8080}"]