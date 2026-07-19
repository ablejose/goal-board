/**
 * Goal Board - SMS hub (Google Apps Script, bound to the "Goal Board - SMS Log" Sheet)
 *
 * doPost: your SMS-forwarder app POSTs each bank SMS here (with the token).
 *         The message is parsed and appended to the 'SMS' tab.
 * doGet:  the Goal Board app fetches the current balance for ACCOUNT from here.
 *
 * Deploy: Extensions > Apps Script > paste this > Save > Deploy > New deployment >
 *         type "Web app" > Execute as: Me > Who has access: Anyone > Deploy.
 *         Copy the Web app URL (ends with /exec).
 */

// ---- Config ----
var SHEET_NAME = 'SMS';
var ACCOUNT = 'X7046';        // which account's balance drives the goal
var SECRET = 'change-me-123'; // shared token; MUST match your forwarder. Keep private (not in the app).

function doPost(e) {
  try {
    var body = '';
    var token = '';
    if (e && e.parameter) {
      body = e.parameter.body || e.parameter.text || e.parameter.message || '';
      token = e.parameter.token || '';
    }
    if (e && e.postData && e.postData.contents) {
      try {
        var j = JSON.parse(e.postData.contents);
        if (!body) body = j.body || j.text || j.message || '';
        if (!token) token = j.token || '';
      } catch (ignore) {}
    }
    if (token !== SECRET) return json({ ok: false, error: 'bad token' });
    if (!body) return json({ ok: false, error: 'no body' });

    var t = parseSms(body);
    var sh = getSheet();
    sh.appendRow([
      new Date(), body,
      t ? t.account : '', t ? t.direction : '',
      t ? t.amount : '', t ? t.balance : '', t ? t.party : ''
    ]);
    return json({ ok: true, parsed: t });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  try {
    var sh = getSheet();
    var values = sh.getDataRange().getValues();
    var balance = null;
    var updatedAt = null;
    for (var i = values.length - 1; i >= 1; i--) {
      var acc = String(values[i][2]);
      var bal = values[i][5];
      if (acc === ACCOUNT && bal !== '' && bal !== null) {
        balance = Number(bal);
        updatedAt = values[i][0];
        break;
      }
    }
    return json({ ok: true, account: ACCOUNT, balance: balance, updatedAt: updatedAt });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['receivedAt', 'body', 'account', 'direction', 'amount', 'balance', 'party']);
  }
  return sh;
}

function parseSms(body) {
  var reDebit = /A\/c (X\d+) debited INR ([\d,]+\.\d{2}) Dt \d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} to (.+?) thru UPI:\d+\.Bal INR ([\d,]+\.\d{2})/i;
  var reCredit = /A\/c (X\d+) credited for INR ([\d,]+\.\d{2}) on \d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} by (.+?) thru UPI\.AvlBal INR ([\d,]+\.\d{2})\(UPI:\d+\)/i;
  function num(x) { return parseFloat(String(x).replace(/,/g, '')); }
  var m;
  if ((m = body.match(reCredit))) return { account: m[1], direction: 'credit', amount: num(m[2]), party: m[3].trim(), balance: num(m[4]) };
  if ((m = body.match(reDebit)))  return { account: m[1], direction: 'debit',  amount: num(m[2]), party: m[3].trim(), balance: num(m[4]) };
  return null;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
