/**
 * MPI × Kansei response collector — Google Apps Script web app.
 *
 *   POST  (from index.html#run)       -> appends one row per participant
 *   GET   ?action=results             -> E/N scores + words, for index.html#results
 *   GET   (no params)                 -> health check
 *
 * Setup: see SETUP.md. In short:
 *   1. Create a Google Sheet, copy its ID from the URL, paste below.
 *   2. Extensions -> Apps Script, replace the file with this, Save.
 *   3. Deploy -> New deployment -> Web app
 *        Execute as:      Me
 *        Who has access:  Anyone
 *      Put the /exec URL into "collect_url" in config.json.
 */

// ---- config -------------------------------------------------------------
var SHEET_ID = "PASTE_YOUR_SHEET_ID_HERE";
var SHEET_NAME = "responses";
// Second tab in the DATASAMPLE.csv layout (timestamp, E, N, 27 words), with
// no header row, so its CSV export works in RUN.ipynb unchanged.
var DATASAMPLE_SHEET_NAME = "datasample";
// Number of images per session (must match the images list in config.json).
var N_IMAGES = 9;
var WORDS_PER_IMAGE = 3;
// Optional: set the same non-empty string as "collect_token" in config.json
// to reject submissions that don't carry it. Not a real secret.
var SHARED_TOKEN = "";
// -----------------------------------------------------------------------

function headers_() {
  var h = [
    "received_at", "session_id", "age", "gender",
    "e_score", "n_score", "l_score", "mpi_source",
    "started_at", "finished_at", "duration_ms"
  ];
  for (var i = 1; i <= N_IMAGES; i++) {
    h.push("img" + i + "_file");
    for (var w = 1; w <= WORDS_PER_IMAGE; w++) h.push("img" + i + "_w" + w);
    h.push("img" + i + "_ms");
  }
  h.push("raw_json");
  return h;
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: "empty request body" });
    }
    var body = JSON.parse(e.postData.contents);

    if (SHARED_TOKEN && body.token !== SHARED_TOKEN) {
      return json_({ ok: false, error: "bad or missing token" });
    }
    if (body.format !== "mpi-kansei-response" || !body.mpi || !Array.isArray(body.responses)) {
      return json_({ ok: false, error: "not an mpi-kansei response" });
    }
    delete body.token;

    var mpi = body.mpi;
    var row = [
      str_(body.session_id), str_(body.age), str_(body.gender),
      str_(mpi.e), str_(mpi.n), str_(mpi.l), str_(mpi.source),
      str_(body.started_at), str_(body.finished_at), str_(body.duration_ms)
    ];
    for (var i = 0; i < N_IMAGES; i++) {
      var r = body.responses[i] || {};
      var words = Array.isArray(r.words) ? r.words : [];
      row.push(str_(r.image));
      for (var w = 0; w < WORDS_PER_IMAGE; w++) row.push(str_(words[w]));
      row.push(str_(r.time_ms));
    }
    row.push(JSON.stringify(body));

    // DATASAMPLE layout: E, N, then img1 w1..w3 … img9 w1..w3.
    var sampleRow = [str_(mpi.e), str_(mpi.n)];
    for (var j = 0; j < N_IMAGES; j++) {
      var sw = (body.responses[j] && Array.isArray(body.responses[j].words)) ? body.responses[j].words : [];
      for (var k = 0; k < WORDS_PER_IMAGE; k++) sampleRow.push(str_(sw[k]));
    }

    var receivedAt = new Date();
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      appendTextRow_(getSheet_(), receivedAt, row);
      appendTextRow_(getDatasampleSheet_(), receivedAt, sampleRow);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === "results") {
    return json_(results_());
  }
  return json_({ ok: true, service: "mpi-kansei-collector" });
}

// Only what the live results page needs: E, N and the words per image.
// Age, gender and L scores are deliberately not exposed here.
function results_() {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return { ok: true, count: 0, participants: [] };

  var head = values[0];
  var col = {};
  head.forEach(function (name, idx) { col[name] = idx; });

  var participants = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var eScore = Number(row[col.e_score]);
    var nScore = Number(row[col.n_score]);
    if (row[col.e_score] === "" || row[col.n_score] === "" || isNaN(eScore) || isNaN(nScore)) continue;

    var words = [];
    for (var i = 1; i <= N_IMAGES; i++) {
      var set = [];
      for (var w = 1; w <= WORDS_PER_IMAGE; w++) {
        var c = col["img" + i + "_w" + w];
        if (c !== undefined && row[c] !== "") set.push(row[c]);
      }
      words.push(set);
    }
    participants.push({ e: eScore, n: nScore, words: words });
  }
  return { ok: true, count: participants.length, participants: participants };
}

function getSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers_());
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getDatasampleSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(DATASAMPLE_SHEET_NAME) || ss.insertSheet(DATASAMPLE_SHEET_NAME);
}

function str_(v) {
  return v === undefined || v === null ? "" : String(v);
}

// Write a row whose text cells are stored verbatim. Plain appendRow() lets
// Sheets interpret values, so a word typed as "=happy" or "+1" would turn
// into a formula. Cells are formatted as plain text first, and values that
// start with "=" also get Sheets' apostrophe text prefix (not part of the
// stored value). Must run while the script lock is held.
function appendTextRow_(sheet, receivedAt, textValues) {
  var row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1).setValue(receivedAt);
  var range = sheet.getRange(row, 2, 1, textValues.length);
  range.setNumberFormat("@");
  range.setValues([textValues.map(function (v) {
    return v.charAt(0) === "=" ? "'" + v : v;
  })]);
}

// Run once from the Apps Script editor (select selfTest -> Run): writes
// tricky strings to a temporary sheet, reads them back, deletes the sheet,
// and logs PASS / FAIL.
function selfTest() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var tmp = ss.insertSheet("selftest_" + new Date().getTime());
  var samples = ["=happy", "+1", "-calm", "@home", "#ERROR!", "静か", "007"];
  try {
    appendTextRow_(tmp, new Date(), samples);
    var back = tmp.getRange(1, 2, 1, samples.length).getDisplayValues()[0];
    var bad = samples.filter(function (s, i) { return back[i] !== s; });
    Logger.log(bad.length ? "FAIL: altered values " + JSON.stringify(bad) + " -> " + JSON.stringify(back)
                          : "PASS: all " + samples.length + " values stored verbatim");
  } finally {
    ss.deleteSheet(tmp);
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
