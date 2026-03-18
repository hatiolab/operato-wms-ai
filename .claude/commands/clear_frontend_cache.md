프론트엔드 번역 캐시를 삭제해줘.

`frontend/packages/operato-wes/cache/translations` 디렉토리 하위의 모든 폴더내의 파일만을 삭제하여 번역 캐시를 초기화합니다.

## 대상 경로

```
frontend/packages/operato-wes/cache/translations/
```

## 처리 절차

### 1. 캐시 디렉토리 확인

캐시 디렉토리가 존재하는지 확인합니다.

```bash
ls -la frontend/packages/operato-wes/cache/translations/
```

### 2. 캐시 삭제

translations 디렉토리 하위의 모든 파일을 삭제합니다. (폴더 구조는 유지)

```bash
# 하위 폴더의 모든 파일만 삭제 (폴더는 유지)
find frontend/packages/operato-wes/cache/translations -type f -delete
```

> **참고**: 폴더 구조는 유지하고 캐시 파일(.json 등)만 삭제합니다.

### 3. 결과 확인

삭제 후 디렉토리 상태를 확인합니다.

```bash
ls -la frontend/packages/operato-wes/cache/translations/
```

## 사용 예시

```bash
/clear_frontend_cache
```

## 실행 결과

```
✅ 프론트엔드 번역 캐시 삭제 완료!

📂 삭제된 캐시 디렉토리:
  - frontend/packages/operato-wes/cache/translations/

🔄 번역 캐시가 초기화되었습니다.
   다음 실행 시 DB에서 최신 번역을 다시 로드합니다.
```

## 주의사항

- 이 명령은 번역 캐시만 삭제하며, DB의 terminologies 데이터는 영향받지 않습니다
- 캐시 삭제 후 프론트엔드를 다시 실행하면 DB에서 번역을 자동으로 재로드합니다
- 번역을 업데이트한 후 프론트엔드에 반영되지 않을 때 사용하세요
