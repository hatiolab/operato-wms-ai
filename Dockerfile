# =====================================================================
# Operato WMS AI — 백엔드 전용 Multi-stage Dockerfile
#
# 프론트엔드는 Nginx 컨테이너에서 서빙합니다 (nginx/Dockerfile 참조).
#
# Build context: 상위 디렉터리 (..) 로 설정해야 합니다.
#   docker build -f operato-wms-ai/Dockerfile -t operato-wms-ai ..
#   또는 docker-compose 사용 권장 (자동으로 context 처리)
# =====================================================================

# ---------------------------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------------------------
FROM --platform=linux/amd64 eclipse-temurin:18-jdk-alpine AS builder

WORKDIR /workspace

# Gradle wrapper 및 빌드 스크립트 먼저 복사 (레이어 캐시 활용)
COPY operato-wms-ai/gradle ./operato-wms-ai/gradle
COPY operato-wms-ai/gradlew ./operato-wms-ai/gradlew
COPY operato-wms-ai/build.gradle ./operato-wms-ai/build.gradle
COPY operato-wms-ai/settings.gradle ./operato-wms-ai/settings.gradle

# otarepo-core 복사 (settings.gradle이 ../otarepo-core 참조)
COPY otarepo-core ./otarepo-core

# 소스 복사
COPY operato-wms-ai/src ./operato-wms-ai/src

WORKDIR /workspace/operato-wms-ai

RUN chmod +x gradlew && \
    ./gradlew build -x test --no-daemon --console=plain

# ---------------------------------------------------------------------
# Stage 2: Runtime
# ---------------------------------------------------------------------
FROM --platform=linux/amd64 eclipse-temurin:18-jre-alpine AS runtime

# 보안: root가 아닌 전용 사용자로 실행
RUN addgroup -S wms && adduser -S wms -G wms

WORKDIR /app

# 빌드 결과물 복사 (plain jar 제외, executable jar만)
COPY --from=builder /workspace/operato-wms-ai/build/libs/operato-wms-ai.jar app.jar

# 로그 디렉터리 생성 및 권한 설정
RUN mkdir -p /app/logs && chown -R wms:wms /app

USER wms

EXPOSE 9191

# 환경변수 기본값 (운영 시 반드시 외부에서 주입)
ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_OPTS="-Xmx512m -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar --spring.profiles.active=$SPRING_PROFILES_ACTIVE"]
