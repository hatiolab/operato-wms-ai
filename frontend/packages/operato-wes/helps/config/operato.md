# operato

Configure the configuration related to the (Operato) Server, which is composed of a Restful service.

- baseUrl

  - Sets the endpoint of the Operato server.
  - If requests starting with '/rest' context path are received from the client, they are forwarded to this baseUrl using the same method, and the response is sent back to the client.

  Example:
  baseUrl: 'http://localhost:9191/rest'

## default

```
module.exports = {
  operato: {
    baseUrl: ''
  }
}
```
