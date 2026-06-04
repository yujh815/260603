const SHEET_NAME = "visits";

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "visitedAt", "type", "detail", "region", "timezone", "device", "browser",
      "os", "language", "viewport", "screen", "referrer", "path", "visitorId",
      "sessionId", "cpuCores", "memoryGb", "connection", "userAgent"
    ]);
  }

  return sheet;
}

function doPost(event) {
  const payload = JSON.parse(event.parameter.payload || "{}");
  const sheet = getSheet();
  sheet.appendRow([
    payload.visitedAt || new Date().toISOString(),
    payload.type || "",
    payload.detail || "",
    payload.region || "",
    payload.timezone || "",
    payload.device || "",
    payload.browser || "",
    payload.os || "",
    payload.language || "",
    payload.viewport || "",
    payload.screen || "",
    payload.referrer || "",
    payload.path || "",
    payload.visitorId || "",
    payload.sessionId || "",
    payload.cpuCores || "",
    payload.memoryGb || "",
    payload.connection || "",
    payload.userAgent || "",
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(event) {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const visits = values.map((row) => {
    const item = {};
    headers.forEach((key, index) => {
      item[key] = row[index];
    });
    return item;
  });

  const output = { visits };
  const callback = event && event.parameter && event.parameter.callback;

  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(output)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
