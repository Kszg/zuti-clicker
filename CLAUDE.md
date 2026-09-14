# CLAUDE.md

Guidance for Claude Code (and anyone else) working in this repository. This
file is about **process and conventions** — what the codebase already looks
like, how to extend it consistently, and how to verify a change before
calling it done. For product intent, read `PRODUCT.md` first; for the current
architecture in depth, read `docs/developer/final.md` (Hungarian); for
player-facing behavior, `docs/user/final.md` (Hungarian).

## Repo shape

Two independent pnpm packages under `zuti-clicker/`, no shared workspace
tooling between them — they are separately deployed apps that happen to live
in one repo:

```
zuti-clicker/
├── api/       Express 5 + Prisma 7 + MariaDB, ESM ("type": "module")
└── frontend/  Vue 3 + Pinia + vue-i18n + Vite
```

Because they're separately deployed, **anything shared between them (allowed
enum values, balance constants, payload shapes) has to be duplicated by hand**
— there is no shared package to import from. When you duplicate a constant
across a client/server boundary like this, leave a `// keep in sync with ...`
comment pointing at the other copy, and update both in the same change.

## Before starting non-trivial work

- **Plan first, get explicit sign-off, then build.** For anything beyond a
  small fix, use plan mode: understand the existing code, design an approach,
  and get the user's approval before writing code. Treat every design or
  implementation decision that could go more than one reasonable way as
  something to ask about, not assume — but don't turn routine judgment calls
  (matching an existing pattern, naming, picking the obvious default) into
  questions either.
- **Verify claims empirically before designing around them**, especially
  anything about database behavior, floating-point edge cases, or "the docs
  say X" — a quick script against the real thing is cheap and catches wrong
  assumptions before they're baked into a plan. If a design pass (yours or a
  sub-agent's) asserts something risky, check it yourself rather than taking
  it on faith.
- If a change touches the database schema or an already-deployed surface,
  work out the backward-compatibility story (see "Database & migrations"
  below) as part of the plan, not as an afterthought during implementation.

## Database & migrations

- Migrations are **hand-written SQL**, not the raw Prisma-generated output —
  match the aligned, commented formatting style of the existing migrations
  under `zuti-clicker/api/prisma/migrations/` (e.g.
  `20260602120000_redesign_save_data`). Generate a draft with
  `pnpm prisma migrate dev --create-only --name ...` to get Prisma's own SQL
  as a starting point, then reformat it to match.
- **New columns must be additive**: `NOT NULL DEFAULT <value>`, never a
  rename/drop/narrowing of something the currently-deployed API still reads
  or writes. This is what makes the automated deploy below safe to run
  unattended: `.github/workflows/deploy.yml`'s `migrate` job runs
  `prisma migrate deploy` against the **live production database** on every
  push to `main`, before the `deploy` job swaps in the new images (see
  "CI/CD" below) — a migration that isn't purely additive/backward-compatible
  could break the still-running old containers in the window before the
  image swap, or apply a destructive change with no staging database to
  catch it first (this project still has none). The only safety nets are
  this additive-only rule, PR review, and `ci.yml`'s `verify-migrations` job
  (`prisma migrate deploy` + a `prisma migrate diff` schema-drift check
  against the dedicated `zutiClickerTest` database) — that job proves a
  migration is *correct* (applies cleanly, matches `prisma/schema.prisma`)
  before merge; it cannot catch a migration that's syntactically fine but
  semantically wrong (e.g. a logically valid `DROP`/data-destructive
  statement). `api/Dockerfile` itself still never runs
  `prisma migrate deploy` — the step lives in the workflow, not the image.
- If an API endpoint's request body gains a new optional field, **omitting
  it must preserve whatever is already stored** — never let an absent field
  reset a column to its default on an update. Only a first-ever row (create
  path) gets real defaults. A present-but-invalid value is still a hard
  validation error (400), never silently coerced.
- Validate numeric input against the actual column's range, not just
  type/sign — e.g. a MySQL `Int` column caps at 2147483647; a value beyond
  that should 400 at the controller, not reach Prisma and 500.
- After any schema change: `pnpm prisma generate` (client goes to
  `api/generated/prisma/`, gitignored — nothing compiles until this runs).
- **The live/production database may be used directly for schema changes and
  for running the real test suite** (this project has no separate staging
  DB), but treat it accordingly:
  - Always read-only inspect it first (row counts, existing schema) before
    writing anything.
  - The test suite creates real rows (`test_<random>@example.com` users) —
    clean them up afterward with a narrow, defensive script (a
    `cleanup-test-users` script following this pattern was added under
    `api/scripts/` in PR #10 — reuse or extend it rather than writing a new
    one): SQL `LIKE` / `startsWith` is only a coarse prefilter, **never the
    authority** on what gets deleted (MySQL treats `_` as a wildcard, and
    ORM string-match helpers don't escape it) — the actual decision belongs
    to a strict application-level pattern check, with dry-run as the default
    mode, an explicit `--apply` flag, and a deletion-count fuse.
  - After cleanup, confirm row counts are back to the pre-change baseline.

## Backend conventions (`zuti-clicker/api`)

- ESM only. No `require()`. Relative imports inside `src/tests/*.test.ts`
  need a `.js` suffix (ESM + ts-jest requirement); application `src/` code
  does not.
- Centralize HTTP response bodies in `src/constants/responses.ts` — tests
  must assert against these constants, never against a hardcoded literal
  string, so a copy change can't silently desync a test from reality.
- New endpoint recipe: controller function with an `@openapi` JSDoc block →
  register the route → add response constants if needed → extend
  `config/swagger.ts` schemas if the payload shape changed → if the endpoint
  touches the schema, do the migration steps above first → write tests
  (including both directions for any optional field: present and absent).
- Validate an entire request body before writing any of it (validate-then-
  write atomicity) — a partially-invalid body should change nothing.
- Prettier is configured (`zuti-clicker/.prettierrc.json`) but not installed
  as a dependency and there's no format script — match its rules by hand:
  double quotes, semicolons, 2-space indent, 100-column width, no trailing
  commas. There is no ESLint in this repo either; nothing enforces style
  automatically, so conventions have to be followed deliberately.

## Frontend conventions (`zuti-clicker/frontend`)

- Pinia setup-stores. When a `watch()` needs a reactive value that lives on
  *another* store instance, pass a getter (`() => otherStore.field`), not the
  bare property — a bare property read off a store instance is not a ref and
  won't retrigger the watcher.
- Vue's default `watch()` flush is asynchronous (queued, not synchronous with
  the triggering assignment). A "this value was just applied from the
  server, don't push it back" guard flag must stay set until
  `await nextTick()`, not just past the synchronous mutation, or the
  watcher fires after the guard has already been cleared.
- A "discovery gate" reveal (a unit in the shop, the prestige panel) should
  key off a monotonically-increasing lifetime total and, once shown, stay
  shown — never re-hide because a per-run or spendable-balance value dropped.
- **Never `Math.round()` a value on a fractional-step scale for display.**
  `Math.round(0.5)` rounds up in JS, so a per-unit rate that can land on a
  half value (e.g. "0.5% per something") displays as double its real value
  at every odd multiple. Keep one decimal when the value can legitimately
  land on `x.5`, instead of rounding to a whole number. When testing a fix
  like this, use an odd/half-value input specifically — an even input can
  coincidentally round correctly and mask the bug.
- Testing components that use `<Teleport>`: the teleported content renders
  under `document.body`, not under the mounted wrapper's own element.
  `wrapper.find(...)` won't see it — query `document.body` instead (e.g. via
  `@vue/test-utils`'s `DOMWrapper`), and clear `document.body.innerHTML`
  between tests so a previous test's teleported content doesn't leak into
  the next one's query.
- The frontend uses Vitest, with specs co-located under
  `src/**/__tests__/*.spec.ts` next to the code they cover, a standalone
  `vitest.config.ts` (don't merge it with `vite.config.ts` — that one
  carries dev-only plugins/proxy config that don't belong in a test run),
  and `@vue/test-utils` + `happy-dom` for anything that mounts a component.

## Testing standards

- Every behavioral change gets a test; every bug fix gets a **regression**
  test, not just a passing one.
- When asked whether something is regression-tested, the right way to answer
  is to prove it: temporarily reintroduce the bug, run the suite, confirm
  the relevant test(s) fail for the right reason, then restore the fix and
  confirm they pass again. Don't just assert coverage exists.
- Run the full test suite, typecheck, and a production build after every
  meaningful change — not only once at the very end. For the API, that means
  the app actually running (tests hit a live server, not an in-process app).
- For UI changes, do a real visual pass in addition to unit tests — run the
  app and look at it (a headless-browser screenshot pass is enough; the
  point is seeing the actual rendered result, not just green tests).
- For a change of any real size, run an independent self-review pass before
  opening a PR. Triage what it finds explicitly: fix genuine issues, and say
  what you deliberately left alone and why (in the commit message or PR
  description) rather than silently ignoring findings.

## UI / design work

This project uses the **impeccable** skill for UI work. Before writing a new
or changed Vue component:

- There's no `DESIGN.md`, but there is a real, established visual system —
  the CSS custom properties in `frontend/src/assets/styles/base.css`
  (colors, radii, transitions), the shared keyframes in `animations.css`,
  and existing component patterns (the `Teleport`-based modal shell used by
  `AuthModal`/`GuestWarningModal`/`ConfirmModal`, the segmented-control
  pattern used by `MultiplierSelector`). Treat that as the visual authority
  and extend it faithfully rather than inventing a new visual language for
  one feature.
- After editing, run the mechanical detector:
  `node <impeccable-skill-dir>/scripts/detect.mjs --json <changed files>`.
  Fix what it flags — e.g. animate `transform`/`opacity`, never `width`/
  `height`/`padding`/`margin` (layout thrash).

## Documentation upkeep

Three docs must be updated **in the same change** as any schema, endpoint, or
user-facing mechanic change — not as a follow-up:

- `docs/developer/final.md` — architecture, endpoint list, recipes for
  adding a unit / endpoint / balance constant.
- `docs/user/final.md` — player-facing explanation of how things work.
- `docs/uml/uml-adatbazis.md` — the ER diagram and table descriptions.

Both are in Hungarian; match the existing tone and structure rather than
switching to English or a different format.

`frontend/src/i18n/en.ts` and `hu.ts` must stay **structurally mirrored** —
any key added to one is added to the other in the same change.

## Git & PR workflow

- Commit in small, logically separable, backtrackable checkpoints (e.g.
  schema → endpoints → tests → one frontend layer at a time → UI → docs),
  not one giant commit per feature. A standalone bugfix found while touching
  something else ships as its own commit, separate from the feature that
  led you to it, so it can be reverted independently.
- Match the existing commit style: lowercase, descriptive, no scope prefix
  (the one exception in history is `hotfix:` for hotfixes). No Conventional
  Commits.
- **Never put unescaped backticks, or anything else shell-special, inside a
  `git commit -m "..."` string** — bash evaluates them as command
  substitution before git ever sees the text, silently corrupting the
  message. Write the message to a temp file and use `git commit -F <file>`
  instead whenever the message quotes code or file names.
- Branch off `main` for feature work; a documentation-only or process-only
  change (like this file) gets its own branch/PR too, separate from whatever
  feature branch happens to be open, so PRs stay reviewable on one topic.
- Open PRs with `gh pr create` and a description that covers what changed,
  why, and how it was verified (tests run, manual checks, screenshots for
  UI). End commit messages and PR descriptions with the attribution footer
  currently specified by the harness for this session.
- **MUST DO, before opening any PR that isn't docs/process-only: bump both
  `api/package.json` and `frontend/package.json`'s `version` field together**,
  even for a bugfix-only or small PR — this comparison is the *only* signal
  `deploy.yml` uses to decide whether a merge to `main` cuts a real release
  (see "CI/CD" below); a merged PR that forgets this silently ships with no
  tagged release and no GHCR image beyond `latest`/`sha-*`, discovered only
  after the fact. Do not wait to be asked — check this before every
  `gh pr create` as routinely as running the tests. (PR #17 shipped without
  this and needed a same-day follow-up bump PR — don't repeat that.)
- Check `git status` before any destructive git operation.

## CI/CD

Two GitHub Actions workflows run on the self-hosted runner (`vbServer`, bare
metal, no VM/Docker for the runner itself):

- `.github/workflows/ci.yml` — on every PR into `main`: `typecheck` (api
  `tsc --noEmit` + frontend `vue-tsc --build`), `verify-migrations`
  (`prisma migrate deploy` + a `prisma migrate diff --exit-code` drift check
  against the dedicated `zutiClickerTest` database — the pre-merge proof
  that a migration is correct, not just present), `frontend-tests` (Vitest),
  and `api-tests` (Jest against a live server + that same `zutiClickerTest`
  database, never production; depends on `verify-migrations` so it runs
  against an already-migrated database instead of re-applying migrations
  itself) run as jobs, each uploading a `junit-<stage>` artifact. A `reports`
  job turns those into `.html`/`.ods`/`.md`/`.json` via
  `.github/scripts/junit-report.mjs`; a `summary` job publishes the result as
  a job summary, a sticky PR comment, and inline check-run annotations.
- `.github/workflows/deploy.yml` — on every push to `main`: builds and pushes
  both images to GHCR (`sha-<short_sha>` + `latest` always, the bare
  `<version>` when `api/package.json` and `frontend/package.json`'s versions
  have moved past the latest `v*` tag), cuts a GitHub release when that
  happens, runs a `migrate` job that applies pending migrations to the
  **live production database** (`prisma migrate deploy`, reading — never
  writing — the deploy directory's own `.env` for DB credentials), then —
  only if that succeeds — syncs `docker-compose.prod.yml` into the deploy
  directory on the host and does `docker compose pull && up -d`. A failed
  migration blocks the deploy entirely (`deploy` requires `migrate` to
  succeed): the old containers keep running on the old schema/images,
  nothing swaps. `deploy` itself still never touches the host's `.env`.

Bump both `package.json` versions together when shipping a release-worthy
change — that comparison is the only source of truth for whether a push cuts
a release. See `docs/developer/final.md`'s "CI/CD" section for the full
job-by-job breakdown and the rollback recipe.

## Environment notes

- Local dev ports can already be occupied by unrelated processes on a shared
  machine — `pnpm dev`/`pnpm start` will pick the next free port
  (Vite prints which one it actually bound to; don't assume 5173/2710).
- `pnpm install` for the API needs `pnpm approve-builds` (or a
  `pnpm.onlyBuiltDependencies` entry in `package.json`) before Prisma's
  postinstall (engine download) will run non-interactively.
