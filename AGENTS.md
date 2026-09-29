# Perch product documentation — agent instructions

This is the public product documentation for Perch, built on [Mintlify](https://mintlify.com).
Pages are MDX with YAML frontmatter. Navigation and site config live in `docs.json`.
Git is the source of truth. Never rely on the Mintlify dashboard as a place content lives.

## Who reads this

New Perch users, usually analysts or operators at a client, who have just been given a
workspace and want to get an answer out of the Guide. Write for them. Assume no prior
knowledge of Perch and no interest in how it is built.

## The one rule: evidence only

Every statement about what the product does must be traceable to one of the sources below.
If you cannot find a source for a behavior, do not write it. Do not infer features from
names, do not fill gaps with what a product like this "probably" does, and do not describe
work that is planned or in progress as if it shipped.

Each page ends with a provenance block, an MDX comment listing the sources it was written from:

```
{/* provenance
- perch-frontend-app: apps/www/components/ai/ThreadHeader/ThreadHeader.tsx ("New Analysis" button)
- perch-backend-stack: apps/guide-web/docs/integration/insight-reports.md
*/}
```

A page with no provenance block is not finished.

## Sources, in order of authority

1. **Typed contracts** (authoritative, cannot drift from code):
   `~/workspace/perchinsights/perch-frontend-app` on `develop`: `apps/www` is the UI
   (`pages/` are the routes and `components/` the screens; English UI strings are plain JSX string
   literals in the component `.tsx` files, so cite the component file for any on-screen label); `apps/bff` is the
   tRPC layer (`router/<domain>.<action>.ts`) with Prisma at `apps/bff/prisma/schema.prisma`.
   `~/workspace/perchinsights/perch-backend-stack` on `develop`: `apps/guide-web` is the Guide
   HTTP service.
2. **Integration docs** (rich but prose; verify against 1 before quoting):
   `~/workspace/perchinsights/perch-backend-stack/apps/guide-web/docs/integration/*.md`.
3. **Product concept prototype** (what a feature is meant to do):
   `~/workspace/perchinsights/product-concept-ux` on `main`. Use it for intent and flow, not
   as proof that something shipped.

Read-only. Never modify these repositories.

## Terminology

Use the product's words. Do not invent synonyms.

- **Guide**: Perch's AI analyst. Users chat with it. Never "the AI", "the bot", "the assistant".
- **Analysis**: a conversation with the Guide. The screen says **New Analysis** and **All Analyses**.
  Internally this is a "thread"; never use that word in the docs. An analysis can pin and run a playbook.
- **Playbook**: a reusable, parameterized analysis the Guide can run again.
- **Run**: one execution of a playbook. "Last run report" is the latest run by creation date.
- **Report**: the finalized output of a run. Reports are immutable once finalized.
- **Insight**: one section of a report, shown as a card. Insights can be pinned, voted on, and copied individually.
- **Workspace**: a client environment. Never "tenant" (the old name) or "project".
- **Cube**: the semantic layer of metrics, dimensions, and joins that the Guide queries.
- **Terra**: the semantic-layer management app. Out of scope for the first cut (see boundaries).
- **Member**: a person with access to a workspace. Never "user" when referring to a person in a workspace.

Capitalize Guide, Playbook, Analysis, Workspace, Terra only at the start of a sentence or when
naming the UI element. In running prose they are common nouns: "open an analysis", "pin the playbook".

## Style

- Active voice, second person. "You" is the reader.
- One idea per sentence. Short sentences. No em dashes.
- Sentence case for headings.
- Bold for UI elements the reader clicks or reads on screen: Click **New thread**.
- Code formatting for file names, commands, and literal values.
- Lead each page with what the reader can accomplish, then how. Cut anything that does not change what the reader does.
- Prefer a numbered list of steps over a paragraph describing a flow.
- Do not explain architecture, repositories, APIs, or internal service names. The reader never sees them.
- Do not use marketing language. No "powerful", "seamless", "effortless".

## Information architecture (product-first)

The site explains the product first, then documents flows by product area. Navigation, in order:

1. **Introduction**: what Perch is, how Perch organizes analysis (journeys, the two lenses), the
   product at a glance (every surface in one paragraph each, who uses it), and a get-up-and-running
   page with three path cards.
2. **Get started**: one page per path, a short narrative whose steps link into the areas:
   *Analyze with the Guide*, *View and monitor*, *Administer a workspace*.
3. **Areas**, each with a concept page first and how-to pages after: Analyses and the Guide ·
   Playbooks · Reports and sharing · Dashboards · Alerts · Metrics catalog · Administration.
4. **Reference**: Terminology · Self-service and managed services.

Two page types with different rules:

- **Concept pages** (introduction, path, area-concept, reference) explain. They are written from the
  Guide's own product corpus (below) and from the product source, in second person, no procedures.
  Their provenance block cites the corpus documents and source files used.
- **How-to pages** are procedural: outcome sentence, `<Steps>` with exact on-screen labels, one short
  good-to-know section, frames under their steps, provenance block. Unchanged from the first cut.

## The Guide's product corpus as a source

`~/workspace/perchinsights/perch-backend-stack/libs/chat/src/chat/context/docs` is the corpus the
Guide reads. Read-only. Use it only for concept pages, and only the public tier:

- **Public (use freely):** `foundations/perch_overview.md`, and the public halves of three mixed
  documents, which will be split into separate documents in the corpus: `semantic_layer/journey_reference.md`
  (the journey concepts; not the field lists), `methodology/terminology_canon.md` (the user-facing
  vocabulary; not the internal contract names), `methodology/perch_standard_way.md` (what the method
  is, as the product's way of analyzing; not the execution rules addressed to the model).
- **Internal (never quote, never paraphrase into the docs):** everything under `examples/`,
  `guides/support_playbook.md`, `methodology/ai_guardrails.md`, `query_building_rules.md`,
  `suggestion_workflow.md`, `focus_comparison_resolution.md`, `recurring_analysis_rerun.md`,
  `root_cause_ontology.md`, `analytical_rules.md`, `semantic_layer/business_semantic_layer.md`,
  `semantic_layer/query_api_reference.md`, `index.md`.

Where the corpus and the product disagree, do not fix the corpus; record the disagreement in
key_learnings (RyanOS catalogs these) and follow the product.

Rewrite for a person, not for the model: drop every "the AI Guide should" instruction, keep the
product facts and the mental model. Where the corpus and the UI disagree, the UI wins.

## Content boundaries

Dashboards and alerts are configured by the Perch team during onboarding, against Perch standards.
The docs describe how to view, filter, read, and act on them, and say plainly that setup is part of
onboarding, not self-service.

Do not document:

- Terra and semantic-layer editing.
- Internal tooling, MCPs, environments, release process, or anything from the vault.
- Features that exist only in the concept prototype or in an open pull request.
- Client names, client data, or screenshots containing either.

## Page conventions

- Frontmatter: `title` and `description`, both sentence case, description one sentence.
- Every page is reachable from `docs.json` navigation. Add the page to navigation in the same change that creates it.
- Use Mintlify components sparingly: `<Steps>` for procedures, `<Note>` and `<Warning>` for
  callouts, `<Card>` groups only on the introduction page. No other components without a reason.
- Relative links between pages, never absolute URLs to the docs site.
- Screenshots go under `images/` with a descriptive file name. Only add screenshots that already
  exist in this repo; never generate placeholder images.

## Working notes from earlier runs

- `perch-backend-stack` may be checked out on a feature branch. Read its integration docs from
  `develop` with `git -C <repo> show develop:apps/guide-web/docs/integration/<file>`.
- Backend-only features with no UI affordance are not documented: file uploads, pinning a report to a
  playbook page. Flag-gated features (share link, SSO login, Guide demo tab) are out of the first cut.
- Run one shell command per call. Compound commands joined with `&&` or `;` are refused in the run.

## Screenshots

Images are generated, never hand-made. `capture/README.md` explains the harness: `capture/frames.json`
is the shot list, `capture/flows/*.mjs` drive a signed-in browser to the documented state, and
`npm run capture -- <frame-id>` asserts the step's on-screen labels are visible before saving the PNG.

- Environment: `demo.perchinsights.com`. Two workspaces, two rules:
  - **Docs** (`WORKSPACE` in `capture/capture.mjs`): flows may create, edit, and delete analyses and
    playbooks here. Every frame that involves the Guide, analyses, playbooks, reports, or sharing is shot here.
  - **Pnc Ins** (`READONLY_WORKSPACE` in `capture/capture.mjs`): **read-only**, for dashboards, alerts,
    and metrics-catalog frames only, because those are configured by the Perch team and exist only
    there. A flow in Pnc Ins may navigate, open, scroll, hover, and use filters and menus that change
    what is shown. It may never click anything that creates, edits, deletes, saves, pins, runs,
    shares, or changes a setting, and never types into the Guide. When in doubt, do not click.
  - No other workspace, ever. Never open the workspace switcher panel in a flow; go to URLs directly.
- The signed-in session comes from `PERCH_DOCS_STATE`, set in the environment. Never read, print, copy,
  or commit that file. If a capture lands on the login page, stop and report; do not try to sign in.
- Frames are cropped to the element or band the step is about (return a locator or a clip from the
  flow). A full-viewport frame needs a reason in the frame's `why_full` field.
- Look at every PNG you produce (the Read tool renders images). A frame that shows the wrong state,
  a loading spinner, an empty panel, or a truncated label is a failure, not a success.
- Fixtures: create what a frame needs (an analysis with a question answered, a finished report, a
  saved playbook with one run, a pinned insight) once, with a recognisable name prefixed `Docs:`,
  and reuse it across frames. `npm run capture -- --flow _fixtures` does this and records ids and URLs in
  `capture/fixtures.json`; frame flows read them with `loadFixtures()` from `capture/flows/_fixtures.mjs`.
  Guide answers take minutes; wait for the finished state, do not screenshot
  the writing state unless the step is about it.
- Data in frames is PNC demo data and is fine to show. Never include the account menu, email
  addresses, or the workspace switcher panel listing other workspaces.

## Verification before claiming success

Run from the repo root and fix everything they report:

```
mint validate
mint broken-links
```

For a screenshot iteration, also: the frame's PNG exists, you looked at it, and `npm run capture -- <id>` exits 0.

Then check by hand: the page has a provenance block, every term matches the terminology list,
the page is in `docs.json`, and every behavior described traces to a listed source.
If any check fails, report the iteration as unsuccessful rather than committing a partial page.
