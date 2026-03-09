# ヒアリングフォームを Google スプレッドシートと連携する手順

フォームの送信内容を Google スプレッドシートに自動で保存するための設定です。**Google Apps Script（GAS）** を使い、API のように連携します。

---

## 1. スプレッドシートを用意する

1. [Google スプレッドシート](https://sheets.google.com) を開く
2. **空白** で新しいスプレッドシートを作成
3. 名前を付ける（例: `ヒアリングフォーム回答`）
4. ブラウザの URL を確認する  
   例: `https://docs.google.com/spreadsheets/d/【ここがスプレッドシートID】/edit`  
   **`/d/` と `/edit` の間の長い英数字** が **スプレッドシート ID** です。コピーしておく

---

## 2. Apps Script を追加する

1. スプレッドシートのメニューで **拡張機能** → **Apps Script**
2. 開いた画面で **「Code.gs」** の内容をすべて削除
3. このリポジトリの **`google-apps-script/Code.gs`** の内容をすべてコピーして貼り付け
4. コード先頭付近の次の行を編集する:
   ```javascript
   var SPREADSHEET_ID = 'ここにスプレッドシートIDを貼り付け';
   ```
   → コピーした **スプレッドシート ID** を `'...'` のなかに貼り付けて保存  
   例: `var SPREADSHEET_ID = '1ABC123xyz...';`
5. **保存**（Ctrl+S / Cmd+S）

---

## 3. ウェブアプリとしてデプロイする

1. Apps Script の画面で **デプロイ** → **新しいデプロイ**
2. 種類で **ウェブアプリ** を選択
3. 設定:
   - **説明**: 任意（例: 「ヒアリングフォーム受け取り」）
   - **実行ユーザー**: **自分**
   - **アクセスできるユーザー**: **全員**
4. **デプロイ** をクリック
5. **ウェブアプリの URL** が表示されるのでコピーする  
   例: `https://script.google.com/macros/s/AKfycbx.../exec`  
   （末尾が **`/exec`** であることを確認）

---

## 4. フォーム側に URL を設定する

1. **index.html** と **hearing-form.html** を開く
2. 次の行を探す:
   ```javascript
   const SPREADSHEET_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL';
   ```
3. `'YOUR_GOOGLE_APPS_SCRIPT_URL'` を、コピーした **ウェブアプリの URL** に置き換える  
   例: `const SPREADSHEET_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';`
4. ファイルを保存し、Vercel にデプロイしている場合は再デプロイする

---

## 5. 動作確認

1. 公開したフォーム（Vercel の URL）でヒアリングを入力して **送信する**
2. Google スプレッドシートを開き、**「フォーム回答」** シート（なければ自動作成）に 1 行追加されているか確認する

- シートが空のときは、1 行目に **見出し** が自動で入ります
- 2 行目以降に、送信内容が 1 件ずつ追加されます

---

## トラブルシューティング

| 症状 | 確認すること |
|------|----------------|
| 送信してもシートに反映されない | フォームの `SPREADSHEET_URL` が GAS の **ウェブアプリ URL**（末尾 `/exec`）になっているか |
| シート ID を変えた | `Code.gs` の `SPREADSHEET_ID` を新しい ID に変更し、GAS で **デプロイ** → **デプロイを管理** → **編集** → **バージョン: 新バージョン** で再デプロイ |
| 「承認が必要」と出る | 初回は GAS の **デプロイ** 時に「アクセスを許可」で自分の Google アカウントを許可する |

---

## データの流れ

```
[ヒアリングフォーム（Vercel）]
    → POST（form-urlencoded）
[Google Apps Script ウェブアプリ]
    → doPost() で受信 → JSON をパース
[Google スプレッドシート]
    → 「フォーム回答」シートに 1 行追加
```

シートの列とフォームの項目は `Code.gs` の `getHeaderRow()` と `toRow()` で対応しています。項目を増やした場合は、この 2 つを同じ順序で編集してください。
