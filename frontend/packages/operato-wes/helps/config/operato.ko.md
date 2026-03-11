# operato

Restful 서비스로 구성된 (Operato) Server와 관련된 컨피규레이션을 설정한다.

- baseUrl

  - Operato 서버의 엔드포인트를 설정한다.
  - 클라이언트로부터 '/rest' context path로 시작되는 요청(Request)을 받으면, 동일한 메쏘드로 이 baseUrl로 전달되고, 그 결과를 클라이언트에 응답(Response)한다.

  Example:
  baseUrl: 'http://localhost:8080/rest'

## default

```
module.exports = {
  operato: {
    baseUrl: ''
}
```
