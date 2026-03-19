# サムライSEO利益計算

## 起動方法（ログイン不要・固定シートに保存）

1. `.env` を作成（[.env.example](.env.example) をコピー）
2. 下記「スプレッドシートの準備」を完了
3. 開発: `npm install` → `npm run dev`  
   - フロント: http://localhost:3000（ポートが埋まっている場合は表示に従う）  
   - 裏で API サーバーが **8788** で起動し、Vite が `/api` を中継します
4. 本番ビルド: `npm run build` → `npm run start`（`PORT` でポート指定可）

**`npm run dev:vite` だけ**だと API が動かず保存・一覧が使えません。必ず **`npm run dev`** を使ってください。

## スプレッドシートの準備

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. **API とサービス** → **ライブラリ** → **Google Sheets API** を有効化
3. **IAM と管理** → **サービスアカウント** → アカウントを作成 → **キー** → JSON をダウンロード
4. ダウンロードした JSON を例: `secrets/service-account.json` として保存（`.gitignore` 済み推奨）
5. **スプレッドシート「サムライSEO利益計算」** を開き、**共有** → サービスアカウントのメール（`xxx@....iam.gserviceaccount.com`）を**編集者**で追加
6. `.env` に設定:
   - `SPREADSHEET_ID` … URL の `/d/` と `/edit` の間の文字列
   - `SHEET_NAME=シート1`（別タブにしたい場合はタブ名を変更）
   - `GOOGLE_APPLICATION_CREDENTIALS=./secrets/service-account.json`（または `GOOGLE_SERVICE_ACCOUNT_JSON`）

初回保存時、1行目が空なら列見出し（作成日時・案件名・売上…）が自動で入り、2行目からデータが追加されます。

## Vercel 環境変数

Vercel では鍵ファイルパス（`GOOGLE_APPLICATION_CREDENTIALS`）ではなく、JSON 本文を 1 行にした `GOOGLE_SERVICE_ACCOUNT_JSON` を使うのがおすすめです。
