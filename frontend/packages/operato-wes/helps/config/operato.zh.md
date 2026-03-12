# Operato

配置与（Operato）服务器相关的配置，该服务器由一个 Restful 服务组成。

- baseUrl

  - 设置 Operato 服务器的端点。
  - 如果从客户端收到以 '/rest' 上下文路径开头的请求，则使用相同的方法将其转发到此 baseUrl，并将响应发送回客户端。

  示例：
  baseUrl: 'http://localhost:9191/rest'

## 默认值

```
module.exports = {
  operato: {
    baseUrl: ''
  }
}
```
