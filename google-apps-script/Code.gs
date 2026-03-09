/**
 * ヒアリングフォーム → Google スプレッドシート 連携
 *
 * セットアップ:
 * 1. 新しい Google スプレッドシートを作成
 * 2. 拡張機能 → Apps Script でこのコードを貼り付け
 * 3. 下の SPREADSHEET_ID をあなたのスプレッドシートのIDに変更
 *    （スプレッドシートのURLの /d/ と /edit の間の文字列）
 * 4. デプロイ → 新しいデプロイ → ウェブアプリ
 *    - 実行ユーザー: 自分
 *    - アクセス: 全員
 * 5. 表示されるウェブアプリのURLをフォームの SPREADSHEET_URL に設定
 */

var SPREADSHEET_ID = '1ivoXGeNeXyAW4Awv3oLNVZPop8_nfgKIydXhh1KXTJs';
var SHEET_NAME = 'フォーム回答';

/**
 * POST で送られてきたフォームデータをスプレッドシートに1行追加する
 */
function doPost(e) {
  try {
    var sheet = getSheet();
    var raw = e.parameter.data;
    if (!raw) {
      return jsonResponse({ success: false, error: 'data がありません' }, 400);
    }
    var data = JSON.parse(raw);
    var row = toRow(data);
    sheet.appendRow(row);
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

/**
 * GET はテスト用（ブラウザで開くと「OK」と表示）
 */
function doGet() {
  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}

function getSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(getHeaderRow());
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(getHeaderRow());
  }
  return sheet;
}

function getHeaderRow() {
  return [
    '送信日時',
    'お名前・屋号',
    '業種・業態',
    'メール',
    '電話番号',
    'ビジネス概要',
    '営業歴・経験',
    '月の問い合わせ数',
    '集客方法',
    '一番の悩み',
    'Web・SNS現状',
    '課題:新規集客',
    '課題:伝わりにくさ',
    '課題:差別化',
    '課題:発信が続かない',
    '目標',
    '理想のお客さん',
    '一番良かったお客さん',
    '競合',
    '差別化・独自性',
    '褒められたこと',
    '予算',
    '希望公開時期',
    '自分で更新',
    '写真素材',
    'ロゴ・名刺',
    'SNS連携希望',
    'その他'
  ];
}

/**
 * フォームの data オブジェクトをシートの1行（配列）に変換
 */
function toRow(data) {
  return [
    data.timestamp || '',
    data.name || '',
    data.industry || '',
    data.email || '',
    data.tel || '',
    data.overview || '',
    data.experience || '',
    data.inquiries || '',
    data.acquisition || '',
    data.mainProblem || '',
    data.webStatus || '',
    data.scale_新規集客 || '',
    data.scale_発信の伝わりにくさ || '',
    data.scale_差別化できていない || '',
    data.scale_発信が続かない || '',
    data.goal || '',
    data.idealCustomer || '',
    data.bestCustomer || '',
    data.competitors || '',
    data.uniqueness || '',
    data.strengths || '',
    data.budget || '',
    data.timeline || '',
    data.canUpdate || '',
    data.hasPhotos || '',
    data.hasLogo || '',
    data.sns || '',
    data.others || ''
  ];
}

function jsonResponse(obj, statusCode) {
  var code = statusCode || 200;
  var output = ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
