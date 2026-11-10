# Setup — response collection and live results

Everything runs on a static host (GitHub Pages), a Google Sheet and a Google
Apps Script web app. There is no server to maintain.

```
index.html#run      ──POST──────────────▶ Apps Script ──▶ Google Sheet
                                              │
index.html#results ◀──GET ?action=results─────┘   (auto-refreshes every 15 s)
```

## A. Google Sheet and collector (once)

1. Create a blank Google Sheet. Copy its ID from the URL:
   `https://docs.google.com/spreadsheets/d/1GRaH9xOmB890I8qYjmq4TviMf4l-vMmU0mtRHb8W_TM/edit`
2. In the Sheet: **Extensions → Apps Script**.
3. Delete the stub code, paste all of [`server/Code.gs`](server/Code.gs), and set
   `SHEET_ID` to the ID from step 1. **Save**.
4. Optional check: choose `selfTest` in the function dropdown → **Run**. The
   log should say `PASS`.
5. **Deploy → New deployment → ⚙ → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**

   **Deploy → Authorize access**. On *"Google hasn't verified this app"*,
   click **Advanced → Go to (project) (unsafe) → Allow**. This is expected for
   your own script.
6. Copy the **Web app URL** (ends in `/exec`). Opening it should show
   `{"ok":true,"service":"mpi-kansei-collector"}`.

## B. Connect the pages (once)

In [`config.json`](config.json):

```json
"collect_url": "https://script.google.com/macros/s/AKfy.../exec",
"collect_token": ""
```

`collect_token` is an optional spam guard. If you set it, set the same value
as `SHARED_TOKEN` in `Code.gs` and redeploy (step D). It is visible in the
page, so it deters noise, not a determined person.

## C. Publish

Push the folder to a GitHub repo and turn on **Settings → Pages → Source:
`main`, root**. Links:

- Everyone: `https://<user>.github.io/<repo>/` (the landing page)
- Straight to the projector view: `https://<user>.github.io/<repo>/#results`

## D. Redeploying later

- Changed `index.html`, `config.json` or images → push.
- Changed `Code.gs` → Apps Script **Deploy → Manage deployments → ✎ →
  Version: New version → Deploy**. The URL stays the same.

## E. Dry run before the session

1. Open `index.html?demo=1#results` to check the layout on the projector.
2. Choose **Take part** and complete a session yourself. A row should appear
   in both the `responses` and `datasample` tabs (both are created
   automatically on the first submission). Press **See results**; your point
   should be on the plot.
3. Delete your test row from **both** tabs afterwards.

## Offline backup: the notebook

The `datasample` tab uses the `DATASAMPLE.csv` layout with no header row. If
the live page fails, export that tab (**File → Download → CSV**) as
`data.csv` next to `RUN.ipynb` and run the notebook.

## Optional: automatic MPI scores

The MPI test is embedded from another site, so the browser does not let
`index.html` read its results. Participants type their E, N and L scores in
by hand. If the owner of `mpfranco10.github.io/mpikansei` adds this one line
to the end of the submit handler in `mpi.js` (right after
`plotScores(eScore, nScore);`), the scores fill in automatically:

```js
window.parent.postMessage({ type: "mpi-result", e: eScore, n: nScore, l: lScore }, "*");
```

Nothing changes when the MPI site is opened on its own. The Sheet's
`mpi_source` column records whether each row's scores were `auto` or
`manual`.

## Privacy notes

- No names are collected. Each submission gets a random `session_id`.
- The Sheet stores age, gender, E/N/L scores and words. The public
  `?action=results` endpoint returns **only** E, N and the words. Age, gender
  and L scores are never exposed.
- If an upload fails, the participant's browser downloads a `.json` file of
  their responses to hand to you instead.
