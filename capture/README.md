# Screenshot capture

Every image under `images/` is produced by a script here, never by hand, so it can be regenerated when the UI changes.

- `frames.json`: the shot list. One entry per frame: page, section, step, the on-screen labels the frame must show, the output file, and the `flow` that produces it.
- `flows/*.mjs`: one module per flow. A flow drives a signed-in browser to the state the frame documents and returns the element to frame (or the whole viewport).
- `capture.mjs`: runs the flows, asserts every required label is visible, saves the PNG. Fails loudly instead of saving a wrong frame.

Run: `npm install && npx playwright install chromium`, then `PERCH_DOCS_STATE=~/.config/perch-docs/demo-state.json npm run capture -- [frame-id...]`

Environment: demo.perchinsights.com, workspace **Docs** only. Flows may create and edit analyses in Docs. They must never touch any other workspace.
The session file is a Playwright storage state from a one-time interactive sign-in (see the RyanOS integrations registry, `perch_docs_capture.demo`). It is never committed.
