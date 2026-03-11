# =====================================================================
# Operato WMS 프론트엔드 — Nginx 멀티 스테이지 Dockerfile
#
# Build context: 상위 디렉터리 (..) 로 설정해야 합니다.
#   docker-compose에서 자동 처리됨
# =====================================================================

# ---------------------------------------------------------------------
# Stage 1: 프론트엔드 빌드
# ---------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY operato-wms-ai/frontend/ ./

RUN yarn install && \
    yarn build && \
    yarn workspace @operato-app/operato-wes run build:app

# ---------------------------------------------------------------------
# Stage 2: Nginx에 빌드 산출물 복사
# ---------------------------------------------------------------------
FROM nginx:alpine

COPY operato-wms-ai/nginx/nginx.conf /etc/nginx/nginx.conf
COPY operato-wms-ai/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/operato-wes/dist-app /usr/share/nginx/html

EXPOSE 80
