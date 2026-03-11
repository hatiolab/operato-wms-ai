#!/bin/bash

# ========================================
# 전체 빌드 스크립트 (프론트엔드 + 백엔드)
# ========================================
# 배포용 단일 JAR 파일을 생성합니다.
#
# 사용법:
#   ./scripts/build.sh

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}전체 빌드 시작${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Java 18 설정
export JAVA_HOME=$(/usr/libexec/java_home -v 18)
echo -e "${GREEN}Java 버전:${NC}"
java -version
echo ""

# frontend 디렉토리 확인
if [ ! -d "frontend/packages" ]; then
    echo -e "${YELLOW}⚠️  프론트엔드 프로젝트가 없습니다.${NC}"
    echo -e "   백엔드만 빌드합니다..."
    ./gradlew clean build -x test
else
    echo -e "${GREEN}프론트엔드 + 백엔드 통합 빌드...${NC}"
    ./gradlew clean buildAll -x test
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 빌드 완료!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "배포 파일: ${YELLOW}build/libs/operato-wms-ai.jar${NC}"
echo ""
echo -e "실행 방법:"
echo -e "  ${YELLOW}java -jar build/libs/operato-wms-ai.jar${NC}"
echo ""
