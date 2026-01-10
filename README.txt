# SuperSplat エディタ

SuperSplat エディタは、3D Gaussian Splatsを検査、編集、最適化、公開するための無料かつオープンソースのツールです。ウェブ技術で構築されており、ブラウザで動作するため、ダウンロードやインストールは不要です。

このツールのライブバージョンはこちらで利用可能です： https://superspl.at/editor

![image](https://github.com/user-attachments/assets/b6cbb5cc-d3cc-4385-8c71-ab2807fd4fba)

SuperSplatの使用方法については、[ユーザーガイド](https://developer.playcanvas.com/user-manual/gaussian-splatting/editing/supersplat/)をご覧ください。

## ローカル開発

SuperSplatのローカル開発環境を初期化するには、[Node.js](https://nodejs.org/) 18以降がインストールされていることを確認してください。以下の手順に従ってください：

1. リポジトリをクローンします：

   ```sh
   git clone https://github.com/playcanvas/supersplat.git
   cd supersplat
   ```

2. 依存関係をインストールします：

   ```sh
   npm install
   ```

3. SuperSplatをビルドしてローカルWebサーバーを起動します：

   ```sh
   npm run develop
   ```

4. Webブラウザを開き、ネットワークタブでネットワークキャッシュが無効になっていること、およびその他のアプリケーションキャッシュがクリアされていることを確認してください：

   - Safariでは `Cmd+Option+e` または 開発->キャッシュを空にする を使用できます。
   - Chromeでは、アプリケーション->Service workersタブで「更新時にリロード (Update on reload)」と「ネットワークをバイパス (Bypass for network)」のオプションが有効になっていることを確認してください。

5. `http://localhost:3000` にアクセスします。

ソースの変更が検出されると、SuperSplatは自動的に再ビルドされます。ブラウザをリフレッシュするだけで変更が反映されます。

## SuperSplat エディタのローカライズ

現在サポートされている言語はこちらで確認できます：

https://github.com/playcanvas/supersplat/tree/main/static/locales

### 新しい言語の追加

1. `static/locales` ディレクトリに新しい `<locale>.json` ファイルを追加します。

2. 以下のリストにそのロケールを追加します：

   https://github.com/playcanvas/supersplat/blob/main/src/ui/localization.ts

### 翻訳のテスト

翻訳をテストするには：

1. 開発サーバーを実行します：

   ```sh
   npm run develop
   ```

2. ブラウザを開き、以下にアクセスします：

   ```
   http://localhost:3000/?lng=<locale>
   ```

   `<locale>` を言語コード（例: `fr`、`de`、`es`）に置き換えてください。

## コントリビューター

SuperSplatは素晴らしいオープンソースコミュニティによって支えられています。

<a href="https://github.com/playcanvas/supersplat/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=playcanvas/supersplat" />
</a>
