# Goal Board (Sheet-driven)

A no-button neon scoreboard. Bank SMS flow into a Google Sheet; the app reads the
current balance from a Google Apps Script endpoint and fills the bar toward your
target. No native SMS code - pure JavaScript, so it builds cleanly and supports
EAS Update (over-the-air JS updates).

## Flow
```
Bank SMS -> forwarder app -> Apps Script doPost -> Google Sheet
Google Sheet -> Apps Script doGet -> the app (polls every 15s + on open)
```

## 1. Sheet + Apps Script
1. Open the Sheet: https://docs.google.com/spreadsheets/d/1PjGysTO1hxrJT0Yh9xDxmEYGBUXbAqxHNy27pAxxs2I/edit
2. Extensions > Apps Script. Delete any starter code and paste `apps-script/Code.gs` from this repo.
3. Set `SECRET` to your own private random string (keep it out of the app/repo).
4. Deploy > New deployment > type **Web app** > Execute as: **Me** > Who has access: **Anyone** > Deploy.
5. Copy the Web app URL (ends with `/exec`).
6. Put that URL in `App.js` -> `ENDPOINT` (or send it to me and I will commit it).

## 2. Forwarder (catches SMS in the background)
Use MacroDroid (free) or Tasker:
- Trigger: **SMS Received** (optionally filter: sender contains "PNB").
- Action: **HTTP Request / POST** to your `/exec` URL.
  - Content type: `application/x-www-form-urlencoded`
  - Body: `token=YOUR_SECRET&body={sms_message_text_variable}`

Now every bank SMS is logged to the Sheet automatically, even while the app is closed.

## 3. Build / deploy
- Push to `main` -> EAS build trigger (or "Build from GitHub", profile `preview`) -> install the APK.
- Later JS tweaks can ship via **EAS Update** with no rebuild.

## Rewire
- `App.js`: GOAL_NAME, TARGET, SEED, ENDPOINT, POLL_MS.
- `apps-script/Code.gs`: ACCOUNT, SECRET, SHEET_NAME.

## Privacy note
The `/exec` GET returns only the current balance number. Writing to the Sheet requires
the SECRET, so no one can inject fake data without it. If you would rather the balance
URL not sit in a public repo, make the repo private.
