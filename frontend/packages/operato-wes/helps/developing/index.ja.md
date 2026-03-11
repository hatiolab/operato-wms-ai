# WESの開発

## [WES GitHub リポジトリ](#new-wes-github-repository)

- **以前:** [https://github.com/hatiolab/operato-wms-ui](https://github.com/hatiolab/operato-wms-ui)
- **以後:** [https://github.com/hatiolab/operato-app](https://github.com/hatiolab/operato-app)

## [インストールとビルド](#install--build)

1. **初回インストール**

   最初にリポジトリをチェックアウトした後、開発環境と依存モジュールをインストールします。

   ```bash
   $ yarn install
   ```

2. **全モジュールのビルド**

   プロジェクト内で開発されたモジュールをビルドします。

   すべてのモジュールは `operato-app/packages/` フォルダーにあります。

   - ビルドの意味：クライアントおよびサーバーのソースをコンパイルして dist-xxxx を生成（または更新）します。

     `/client` => `/dist-client`

     `/server` => `/dist-server`

   ```bash
   $ yarn build
   ```

3. **各モジュールのビルド**

   変更されたモジュールのみをビルドする必要がある場合は、特定のモジュールのみをビルドできます。

   各モジュールの package.json の name プロパティを参照してモジュール名を確認します。

   このプロジェクトで開発中の6つのモジュールの名前は次のとおりです。

   - @operato-app/metapage
   - @operato-app/mfg-warehouse
   - @operato-app/operato-logis-system-ui
   - @operato-app/operato-wes
   - @operato-app/operato-mes
   - @operato-app/operatofill

   ```bash
   // クライアント部分のみをビルドする
   $ yarn workspace {{module name}} build:client

   // サーバー部分のみをビルドする
   $ yarn workspace {{module name}} build:server

   // クライアント部分とサーバー部分の両方をビルドする
   $ yarn workspace {{module name}} build

   // 例
   $ yarn workspace @operato-app/mfg-warehouse build
   ```

4. **クリーンビルド**

   すべての npm モジュールを再インストールし、すべてのモジュールを再ビルドします。

   - すべての node_modules フォルダーを削除して再インストールします。
   - すべての dist-xxxx を削除して再ビルドします。

     - things-factory や operato がアップグレードされた場合、クリーンビルドを実行して反映できます。

   ```bash
   $ yarn build:clean
   ```

## [アプリケーションの構成](#configure-application)

operato-apps プロジェクトで WES アプリケーションを実行するためのモジュールは @operato-app/operato-wes モジュールです。

packages/operato-wes/config フォルダーの config.development.js と config.production.js ファイルで実行設定を行うことができます。

[設定方法についてはこのリンクをクリックしてください](../config/index.md)

これらのファイルはソースとして扱われるため、機密性の高いサーバー情報や認証情報は含めないようにしてください。

したがって、packages/operato-wes フォルダーに個別の config.development.js と config.production.js ファイルに実行設定を行って使用してください。

## [アプリケーションの実行 - 開発](#run-application---development)

operato-apps プロジェクトでアプリケーションを実行するためのモジュールは @operato-app/operato-wes モジュールです。

```bash
// この場合、config.development.js が適用されます
$ yarn workspace @operato-app/operato-wes serve:dev
```

## [アプリケーションの実行 - 本番](#run-application---production)

```bash
// dist-app フォルダーに最終アプリケーションイメージを作成する
$ yarn workspace @operato-app/operato-wes build:app

// dist-app を実行する
// この場合、config.production.js が適用されます
$ yarn workspace @operato-app/operato-wes serve
```

---

## [新しいページの生成](#generate-new-page)

```bash
$ yarn generate
```

```bash
$ yarn generate
yarn run v1.22.22
$ plop
? [PLOP] Please choose a generator.
  module - Create a new module from the scratch
  service - Generate service from the scratch
❯ page - Generate client page from the scratch
  help - Generate inline help page
  docs - Generate root repo documentation
```

```bash
$ plop
? [PLOP] Please choose a generator. page - Generate client page from the scratch
? What is target package's name? e.g. mfg-warehouse mfg-warehouse
? What should this pages's name be? e.g. sample-page my-page
? Select the type of page you want to generate: List Page
✔  ++ /packages/mfg-warehouse/client/pages/my-page.ts
✔  +- /packages/mfg-warehouse/client/route.ts
✔  +- /packages/mfg-warehouse/things-factory.config.js
✨  Done in 109.17s.
```

```bash
// クライアントソースが変更されたため、再度ビルドします。
$ yarn workspace @operato-app/mfg-warehouse build:client
```

![generate-page-01]
![generate-page-03]
![generate-page-03]
![generate-page-04]

---

## [デバッグ - サーバー部分](#debugging-server)

VSCode のデバッガーでアプリケーションを実行します。

![server-debugging]

## [デバッグ - クライアント部分](#debugging-client)

Chrome ブラウザーの開発者ツールの Source タブでソースファイルを開きます。

![client-debugging-01]
![client-debugging-02]

[注意] 各クライアントモジュールのルートで定義されるページは動的にロードされるため、

該当ページのロード後にデバッグが可能です。

[server-debugging]: ./images/server-debugging.png
[client-debugging-01]: ./images/client-debugging-01.png
[client-debugging-02]: ./images/client-debugging-02.png
[generate-page-01]: ./images/generate-page-01.png
[generate-page-02]: ./images/generate-page-02.png
[generate-page-03]: ./images/generate-page-03.png
[generate-page-04]: ./images/generate-page-04.png
