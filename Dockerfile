FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY frontend/ ./
ENV REACT_APP_BACKEND_URL=""
ENV CI=false
RUN yarn build

FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install aiofiles
COPY backend/ ./
COPY --from=frontend-build /app/build ./static
ENV PORT=8000
EXPOSE $PORT
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port $PORT"]