/**
 * サムライSEO利益計算 - Google Apps Script Web API
 *
 * デプロイ: 「ウェブアプリ」
 * - 実行するユーザー: 自分
 * - アクセスできるユーザー: 全員（推奨: token を設定）
 *
 * スプレッドシート:
 * - このスクリプトを紐付けたスプレッドシートを使用します（アクティブなスプレッドシート）
 */

const SHEET_NAME = 'シート1';
const HEADERS = ['作成日時', '案件名', '売上(円)', 'コスト内訳', 'コスト合計', '利益(円)', '利益率(%)'];

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function corsText() {
  // ※GASのCORSは完全制御できないため、基本は「全員」公開＋token推奨
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

function getToken_() {
  return PropertiesService.getScriptProperties().getProperty('TOKEN') || '';
}

function requireAuth_(e) {
  const token = getToken_();
  if (!token) return; // token未設定なら認証なし
  const incoming = (e && e.parameter && e.parameter.token) || '';
  if (incoming !== token) {
    throw new Error('Unauthorized');
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
  return sheet;
}

function ensureHeader_() {
  const sheet = getSheet_();
  const first = sheet.getRange(1, 1).getValue();
  if (!first) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}

// GET /?action=health|config|rows
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'health';
    if (action === 'health') {
      return json({ ok: true });
    }

    requireAuth_(e);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (action === 'config') {
      return json({ ok: true, spreadsheetId: ss.getId(), sheetName: SHEET_NAME });
    }

    if (action === 'rows') {
      ensureHeader_();
      const sheet = getSheet_();
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return json({ ok: true, rows: [] });
      const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
      const rows = values
        .filter((r) => r.some((c) => String(c || '').trim() !== ''))
        .map((r) => ({
          createdAt: String(r[0] || ''),
          title: String(r[1] || ''),
          orderAmount: String(r[2] || ''),
          costsDetail: String(r[3] || ''),
          totalCost: String(r[4] || ''),
          profit: String(r[5] || ''),
          margin: String(r[6] || ''),
        }));
      return json({ ok: true, rows });
    }

    return json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    return json({ ok: false, error: msg });
  }
}

// POST / (body JSON) { action:"append", ... }
function doPost(e) {
  try {
    requireAuth_(e);
    ensureHeader_();
    const sheet = getSheet_();

    const raw = (e && e.postData && e.postData.contents) || '';
    const body = raw ? JSON.parse(raw) : {};
    if (body.action !== 'append') {
      return json({ ok: false, error: 'Unknown action' });
    }

    const created = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
    const title = body.title ? String(body.title) : '（無題）';
    const orderAmount = Number(body.orderAmount || 0);
    const costsSummary = body.costsSummary ? String(body.costsSummary) : '—';
    const totalCost = Number(body.totalCost || 0);
    const profit = Number(body.profit || 0);
    const margin = body.profitMarginPct != null ? `${Number(body.profitMarginPct).toFixed(1)}%` : '0.0%';

    sheet.appendRow([created, title, orderAmount, costsSummary, totalCost, profit, margin]);
    return json({ ok: true });
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    return json({ ok: false, error: msg });
  }
}

// CORS preflight (optional)
function doOptions(e) {
  return corsText();
}

