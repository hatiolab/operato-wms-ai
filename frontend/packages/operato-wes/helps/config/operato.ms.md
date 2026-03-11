# Operato

Konfigurasikan konfigurasi yang berkaitan dengan Server (Operato), yang terdiri dari sebuah layanan Restful.

- baseUrl

  - Menetapkan titik akhir dari server Operato.
  - Jika permintaan yang dimulai dengan '/rest' path konteks diterima dari klien, mereka akan diteruskan ke baseUrl ini menggunakan metode yang sama, dan responsnya dikirim kembali ke klien.

  Contoh:
  baseUrl: 'http://localhost:8080/rest'

## Default

```
module.exports = {
  operato: {
    baseUrl: ''
  }
}
```
