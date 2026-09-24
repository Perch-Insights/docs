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
- perch-frontend-app: apps/www/components/ai/ThreadHeader.tsx (defaultMessage "New thread")
- perch-backend-stack: apps/guide-web/docs/integration/insight-reports.md
*/}
```

A page with no provenance block is not finished.

## Sources, in order of authority

1. **Typed contracts** (authoritative, cannot drift from code):
   `~/workspace/perchinsights/perch-frontend-app` on `develop`: `apps/www` is the UI
   (`pages/` and `components/` are the screens; the English UI strings are the react-intl
   `defaultMessage` values inline in `components/**`, and `lang/pt-BR.json` is the translation); `apps/bff` is the
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
- **Thread**: a conversation with the Guide. A thread can pin and run a playbook.
- **Playbook**: a reusable, parameterized analysis the Guide can run again.
- **Run**: one execution of a playbook. "Last run report" is the latest run by creation date.
- **Analysis**: a unit of analytical output. It can become the first run of a playbook.
- **Report**: the finalized output of a run. Reports are immutable once finalized.
- **Insight**: one section of a report, shown as a card. Insights can be pinned, voted on, and copied individually.
- **Workspace**: a client environment. Never "tenant" (the old name) or "project".
- **Cube**: the semantic layer of metrics, dimensions, and joins that the Guide queries.
- **Terra**: the semantic-layer management app. Out of scope for the first cut (see boundaries).
- **Member**: a person with access to a workspace. Never "user" when referring to a person in a workspace.

Capitalize Guide, Playbook, Thread, Workspace, Terra only at the start of a sentence or when
naming the UI element. In running prose they are common nouns: "open a thread", "pin the playbook".

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

## Content boundaries

First cut is **the Guide, in the order a new user meets it**: sign in and workspaces,
starting a thread, asking questions, reading reports and insights, playbooks and runs,
sharing and pinning. Stop there.

Do not document, in this cut:

- Terra and semantic-layer editing.
- Admin, member management, groups, or permissions beyond what a new user needs to get in.
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

## Verification before claiming success

Run from the repo root and fix everything they report:

```
mint broken-links
```

Then check by hand: the page has a provenance block, every term matches the terminology list,
the page is in `docs.json`, and every behavior described traces to a listed source.
If any check fails, report the iteration as unsuccessful rather than committing a partial page.
