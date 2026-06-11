#!/bin/bash
# .classpath에서 src/main/resources의 excluding="**" 를 자동으로 제거합니다.
# Gradle 프로젝트 동기화 시 Buildship이 재추가하는 속성을 5초마다 감지하여 수정합니다.

CLASSPATH_FILE="$(cd "$(dirname "$0")/.." && pwd)/.classpath"
PATTERN='excluding="\*\*" kind="src" output="bin/main" path="src/main/resources"'

echo "[fix-classpath] 감시 시작: $CLASSPATH_FILE"

while true; do
  if grep -q 'excluding="\*\*" kind="src" output="bin/main" path="src/main/resources"' "$CLASSPATH_FILE" 2>/dev/null; then
    sed -i '' \
      's/excluding="\*\*" kind="src" output="bin\/main" path="src\/main\/resources"/kind="src" output="bin\/main" path="src\/main\/resources"/' \
      "$CLASSPATH_FILE"
    echo "[fix-classpath] $(date '+%H:%M:%S'): .classpath 자동 수정 완료"
  fi
  sleep 5
done
