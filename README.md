# MPI × Kansei workshop

The whole workshop site is one page, `index.html`: demographics → MPI test →
image word association → submit. Responses go to a Google Sheet, and a live
results view plots everyone's words on the E/N grid. This replaces the Google
Form and the `RUN.ipynb` step.

> **Setting this up? Start with [`SETUP.md`](SETUP.md).**

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole site (JP/EN): landing page, participant session, live results. No build step. |
| `config.json` | Collector URL, MPI URL, image list, words per image, refresh interval. |
| `server/Code.gs` | Google Apps Script web app: stores submissions in the Sheet and serves results. |
| `images/` | The 9 stimulus images. |
| `RUN.ipynb` | The original offline notebook (kept as a backup). It now writes its gallery to `gallery.html`, so it can't overwrite `index.html`. |

## Pages

| URL | Shows |
| --- | --- |
| `index.html` | Landing page: **Take part** or **Live results**. |
| `index.html#run` | Participant session. Every visit starts a fresh session. |
| `index.html#results` | Live results. `#results/4` opens image 4. A **Home** button is always visible. |

Leaving a session before submitting (for example with the browser's Back
button) asks for confirmation first, because the answers would be lost.

## Participant session (`#run`)

1. **Age and gender.** A **Home** link is available here, before the session
   starts.
2. **MPI test.** The MPI site is embedded in the page. After submitting it,
   the participant types the E, N and L scores into the boxes below (checked:
   E and N 0–48, L 0–24). These can fill in automatically if the MPI site
   adds one line; see `SETUP.md`.
3. **Instructions** for the word association (JP and EN).
4. **9 images**, one at a time, with 3 word boxes each. No time limit. Next is
   enabled once all three boxes are filled. **Enter** jumps to the next empty
   box, or to the next image once all are filled. No going back. The time
   spent on each image is recorded.
5. **Submit.** Responses are sent to the collector. If that fails, a `.json`
   file downloads instead. Afterwards the participant chooses **See results**
   or **Back to home**. On a shared device, the next participant starts from
   **Take part**.

## Live results (`#results`)

- Click a thumbnail or use **← / →** to switch images.
- Refreshes every `results_refresh_seconds` (default 15) while the view is
  open; toggle with the checkbox.
- The plotting library is only downloaded when this view is first opened, so
  participants' phones don't load it.
- `index.html?demo=1#results` shows generated data so you can preview the
  view before any responses exist.

## Running locally

The page loads `config.json` with `fetch()`, so serve the folder over HTTP:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000/>. Note that with `collect_url` set,
local test submissions go to the real Sheet.

## Sheet tabs

Each submission is written to two tabs.

**`responses`** holds the full record, with a header row:
`received_at, session_id, age, gender, e_score, n_score, l_score, mpi_source,
started_at, finished_at, duration_ms`, then for each image *i* = 1–9:
`img{i}_file, img{i}_w1, img{i}_w2, img{i}_w3, img{i}_ms`, then `raw_json`
(the full submission).

**`datasample`** matches the [`DATASAMPLE.csv`](DATASAMPLE.csv) layout, with
**no header row**:
`timestamp, E, N, img1_w1, img1_w2, img1_w3, … img9_w1, img9_w2, img9_w3`
(30 columns). To use the notebook offline, open this tab, choose **File →
Download → CSV**, save it as `data.csv` next to `RUN.ipynb`, and run the
notebook.

---

## Workshop plan

```
INTRODUCTION                    05 MINS
EXPLANATION OF KANSEI           10 MINS

MPI TEST                        10 MINS
IMAGE RESPONSE                  05 MINS
RUNTIME CODE PROCESS            05 MINS
PAIR/TRIPLET CREATION           05 MINS

STUDENT DISCUSSION              20 MINS
GROUP PRESENTATION              25 MINS ( 5 x 5 mins )

CLOSING                         05 MINS

TOTAL ESTIMATED                 90 MINS
```

To be prepared:
- Devices for the MPI test and image responses (**Take part**)
- Projector for the **Live results** view
- Large paper / markers for group presentations

### Previous Google Form setup (backup)

- Form (edit): https://docs.google.com/forms/d/1L5WiPrDAEXqieuhM9OwRkfxeZ0WkzbIcy0BkJxK7MFQ/edit
- Sheet: https://docs.google.com/spreadsheets/d/1a3hp1tgIM1xRuICDUEpaj_NSjAEsqQ0zb6I8a5JJNnc/edit?usp=sharing
- Form (respond): https://forms.gle/g7edoxrjDZa1BdUPA
