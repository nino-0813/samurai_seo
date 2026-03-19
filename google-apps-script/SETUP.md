## Google Apps Script デプロイ手順（サムライSEO利益計算）

### 1) スクリプト作成

- スプレッドシートを開く → **拡張機能** → **Apps Script**
- `Code.gs` をこのフォルダの内容に置き換え

### 2) （推奨）TOKEN を設定

- Apps Script → **プロジェクトの設定** → **スクリプト プロパティ**
- `TOKEN` に任意の長い文字列をセット（例: ランダム文字列）

※ TOKEN を設定すると、URL に `?token=...` が無いリクエストは拒否します。

### 3) デプロイ（ウェブアプリ）

**デプロイ** → **新しいデプロイ** → 種類: **ウェブアプリ**

- 実行するユーザー: **自分**
- アクセスできるユーザー: **全員**

デプロイ後に **Web アプリ URL** が表示されます。

### 4) 動作確認

- `GET {WEBAPP_URL}?action=health` → `{"ok":true}`
- `GET {WEBAPP_URL}?action=config&token=...`
- `GET {WEBAPP_URL}?action=rows&token=...`
- `POST {WEBAPP_URL}?token=...`（JSON body: `{"action":"append", ... }`）

