# Perch product documentation

Public product documentation for Perch, built on [Mintlify](https://mintlify.com).

Pages are MDX with YAML frontmatter. Navigation and site config live in `docs.json`.
Git is the source of truth for all content.

Read `AGENTS.md` before writing or editing any page. It defines the audience, the
evidence rule, the terminology, the style, and the content boundaries.

## Local preview

Install the Mintlify CLI:

```
npm i -g mint
```

Run from the repo root, where `docs.json` is:

```
mint dev
```

The preview is at `http://localhost:3000`.

## Verification

Run both from the repo root and fix everything they report before committing:

```
mint validate
mint broken-links
```
