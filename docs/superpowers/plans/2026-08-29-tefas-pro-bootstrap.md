# Tefas Pro Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap `tefas-pro` as a fresh AI Factory `vanilla-ts` project and publish its verified initial state to GitHub.

**Architecture:** AI Factory generates the complete browser TypeScript and lifecycle scaffold into the already initialized local repository. The former project contributes only its ignored `.env`; Git history and all product artifacts remain isolated.

**Tech Stack:** TypeScript ES2022, browser DOM APIs, AI Factory `vanilla-ts`, pnpm scripts, Git, GitHub

**Spec:** `docs/superpowers/specs/2026-08-29-tefas-pro-bootstrap-design.md`

## Global Constraints

- Use the AI Factory `vanilla-ts` template.
- Copy only `../tefas-pro-ft/.env` from the former project.
- Do not copy source code, requirements, constraints, references, run history, database files, dependencies, build output, or Git history from the former project.
- Keep `.env` untracked.
- Use `main` and `git@github.com:baturorkun/tefas-pro.git`.
- Never overwrite unexpected remote history.

---

### Task 1: Generate the AI Factory Project

**Files:**
- Create: `AGENTS.md`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `.gitlab-ci.yml`
- Create: `.github/workflows/ai-factory.yml`
- Create: `.github/workflows/codex-runner-image.yml`
- Create: `factory.config.json`
- Create: `package.json`
- Create: `public/index.html`
- Create: `src/main.ts`
- Create: `src/styles.css`
- Create: `tsconfig.json`
- Create: `tsconfig.build.json`
- Create: `Dockerfile`
- Create: `nginx.conf`
- Create: `.dockerignore`
- Create: lifecycle directories and their generated marker/readme files

**Interfaces:**
- Consumes: `../aifactory` local AI Factory checkout and the approved design spec
- Produces: a standard AI Factory `vanilla-typescript` target project rooted at `tefas-pro/`

- [ ] **Step 1: Generate the scaffold into the initialized repository**

Run from `../aifactory`:

```bash
pnpm factory new tefas-pro --template vanilla-ts --dir .. --force
```

Expected: `Created target project: tefas-pro` with template `vanilla-ts`; the existing `.git/` and `docs/` remain present.

- [ ] **Step 2: Verify scaffold identity and isolation**

Run from `tefas-pro/`:

```bash
test "$(node -p "require('./package.json').name")" = "tefas-pro"
test "$(node -p "require('./factory.config.json').targetProject.profile")" = "vanilla-typescript"
test ! -e db
test ! -e node_modules
```

Expected: all commands exit successfully.

### Task 2: Transfer Environment and Validate the Scaffold

**Files:**
- Create locally, ignored: `.env`
- Verify: `.gitignore`
- Verify: `package.json`
- Verify: `src/main.ts`
- Verify: `tsconfig.json`
- Verify generated output, ignored: `dist/main.js`

**Interfaces:**
- Consumes: `../tefas-pro-ft/.env` and Task 1's generated scripts
- Produces: a locally configured project whose TypeScript source type-checks and builds

- [ ] **Step 1: Copy the sole authorized former-project file**

```bash
cp ../tefas-pro-ft/.env .env
cmp --silent .env ../tefas-pro-ft/.env
```

Expected: `.env` is byte-identical to the authorized source.

- [ ] **Step 2: Prove the secret file is ignored**

```bash
test "$(git check-ignore .env)" = ".env"
test -z "$(git ls-files .env)"
```

Expected: `.env` is ignored and absent from the Git index.

- [ ] **Step 3: Run generated quality gates**

```bash
pnpm typecheck
pnpm build
```

Expected: both commands exit with status 0 and `dist/main.js` exists.

- [ ] **Step 4: Check the pending project snapshot**

```bash
git diff --check
git status --short --ignored
```

Expected: no whitespace errors; `.env` and `dist/` appear only as ignored entries, and no former-project artifacts appear.

### Task 3: Commit and Publish the Initial Project

**Files:**
- Commit: all generated, non-ignored scaffold files
- Exclude: `.env`, `dist/`, `.git/`

**Interfaces:**
- Consumes: Task 2's verified local project and the user-created empty GitHub repository
- Produces: `main` tracking `origin/main` without rewriting remote history

- [ ] **Step 1: Commit the verified scaffold**

```bash
git add .
git diff --cached --check
git status --short
git commit -m "chore: bootstrap tefas-pro vanilla TypeScript project"
```

Expected: the commit contains the scaffold and plan, but not `.env` or `dist/`.

- [ ] **Step 2: Add the requested GitHub remote and normalize the branch**

```bash
git remote add origin git@github.com:baturorkun/tefas-pro.git
git branch -M main
git remote get-url origin
```

Expected: the printed URL is exactly `git@github.com:baturorkun/tefas-pro.git`.

- [ ] **Step 3: Verify the remote has no branch history**

```bash
test -z "$(git ls-remote --heads origin)"
```

Expected: the command exits successfully with no refs. If any ref is returned, stop and do not push.

- [ ] **Step 4: Push without force**

```bash
git push -u origin main
```

Expected: a normal non-force push succeeds and local `main` tracks `origin/main`.

- [ ] **Step 5: Confirm the published state**

```bash
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
```

Expected: the worktree is clean except for ignored local files, the branch reports `main...origin/main`, and both commit hashes match.
