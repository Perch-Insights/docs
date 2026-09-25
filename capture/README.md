# Screenshot capture

Every image under `images/` is produced by a script here, never by hand, so it can be regenerated when the UI changes.

- `frames.json`: the shot list. One entry per frame: page, section, step, the on-screen labels the frame must show, the output file, and the `flow` that produces it.
- `flows/*.mjs`: one module per flow. A flow drives a signed-in browser to the state the frame documents and returns the element to frame (or the whole viewport).
- `capture.mjs`: runs the flows, asserts every required label is visible (as text, as a field placeholder, or as an icon-only button's aria-label), saves the PNG. Fails loudly instead of saving a wrong frame. A flow may return `{ page, target }` to frame a page it opened in a fresh, signed-out browser context (the login page redirects signed-in members); that context is closed after the shot. A flow may also return an `after` function, run once the PNG is saved, to leave the state it reached (the dictation flow cancels its recording). A flow module may export `launch` (extra Chromium launch options) and `context` (extra browser context options) when the state needs them; such a flow runs in its own browser. The dictation flow uses this for Chromium's fake microphone and the microphone permission.

Run: `npm install && npx playwright install chromium`, then `PERCH_DOCS_STATE=~/.config/perch-docs/demo-state.json npm run capture -- [frame-id...]`

`npm run capture -- --flow <name> [args...]` runs one flow module on its own, without a frame or a PNG, and prints what it returns. Two flows exist only for that:

- `_fixtures`: creates the `Docs:` content the frames rely on (an analysis with a finished Insight report, a pinned insight, a playbook saved from it with one completed run, and a public analysis) and writes their ids and URLs to `fixtures.json`. It is idempotent: it looks every fixture up by name first, so re-running it after a partial failure only does the missing steps. Frame flows read `fixtures.json` through `loadFixtures()` from `flows/_fixtures.mjs`. A full first run takes about ten minutes because the Guide has to answer.
- `ask-question-guide-question` keeps one more `Docs:` analysis of its own, `Docs: Guide Question`, found by name or created on first run, holding a pending three-question Guide Question that the flow never submits or cancels. Delete it with `--flow _probe delete <id>` if the card is gone and the flow will recreate it.
- `ask-question-query-suggestion` does the same with `Docs: Query Suggestion`: one concrete question whose Query Suggestion the flow never accepts or rejects, so the card stays pending with its Update step 1 / Add as New Step / Reject buttons. Delete the analysis with `--flow _probe delete <id>` if the card is gone and the flow will recreate it (about a minute).
- `_probe`: debugging aid. `thread <url>` or `page <url>` prints the page text and saves `capture/_probe.png`; `delete <analysis-id>` deletes one `Docs:` analysis.

Environment: demo.perchinsights.com, workspace **Docs** only. Flows may create and edit analyses in Docs. They must never touch any other workspace.
The session file is a Playwright storage state from a one-time interactive sign-in (see the RyanOS integrations registry, `perch_docs_capture.demo`). It is never committed.
