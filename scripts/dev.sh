#!/bin/bash

# ========================================
# 개발 모드 실행 스크립트
# ========================================
# 백엔드와 프론트엔드를 동시에 실행합니다.
#
# 사용법:
#   ./scripts/dev.sh

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}개발 모드 시작${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Java 18 확인
if ! command -v java &> /dev/null; then
    echo -e "${YELLOW}⚠️  Java가 설치되지 않았습니다.${NC}"
    exit 1
fi

# application-dev.properties 확인
if [ ! -f "src/main/resources/application-dev.properties" ]; then
    echo -e "${YELLOW}⚠️  application-dev.properties 파일이 없습니다.${NC}"
    echo -e "${YELLOW}   템플릿을 복사하여 설정하세요:${NC}"
    echo -e "   cp src/main/resources/application-dev.properties.template src/main/resources/application-dev.properties"
    exit 1
fi

# frontend 디렉토리 확인
if [ ! -d "frontend/packages" ]; then
    echo -e "${YELLOW}⚠️  프론트엔드 프로젝트가 아직 복사되지 않았습니다.${NC}"
    echo -e "   operato-wms-app을 frontend/ 디렉토리로 복사하세요."
    echo ""
    echo -e "${GREEN}백엔드만 실행합니다...${NC}"
    export JAVA_HOME=$(/usr/libexec/java_home -v 18)
    ./gradlew bootRun --args='--spring.profiles.active=dev'
    exit 0
fi

# 백엔드 시작
echo -e "${GREEN}🚀 백엔드 시작 (포트 9191)...${NC}"
export JAVA_HOME=$(/usr/libexec/java_home -v 18)
./gradlew bootRun --args='--spring.profiles.active=dev' &
BACKEND_PID=$!

# 잠시 대기 (백엔드 시작 시간)
sleep 3

# 프론트엔드 시작
echo -e "${GREEN}🎨 프론트엔드 시작 (포트 5907)...${NC}"
cd frontend && yarn wms:dev &
FRONTEND_PID=$!

# 안내 메시지
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}개발 서버가 실행되었습니다!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "백엔드:     ${YELLOW}http://localhost:9191${NC}"
echo -e "프론트엔드: ${YELLOW}http://localhost:5907${NC}"
echo ""
echo -e "종료하려면 ${YELLOW}Ctrl+C${NC}를 누르세요."
echo ""

# Ctrl+C 시 모두 종료
trap "echo ''; echo '종료 중...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# 대기
wait
