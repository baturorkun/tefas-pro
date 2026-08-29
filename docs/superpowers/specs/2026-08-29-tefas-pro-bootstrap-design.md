# Tefas Pro Bootstrap Design

## Goal

Create a new AI Factory target project named `tefas-pro` from scratch, using
the `vanilla-ts` template and GitHub as its repository platform.

## Scope

- Generate the project with AI Factory's `vanilla-ts` template.
- Keep the generated browser TypeScript application and AI Factory lifecycle
  structure unchanged.
- Copy only `../tefas-pro-ft/.env` from the former project.
- Do not copy source code, requirements, constraints, references, run history,
  database files, dependencies, build output, or Git history from the former
  project.
- Keep `.env` untracked through the generated `.gitignore`.

## Repository Setup

The project is initialized locally rather than cloned. Its branch is `main`
and its remote is:

```text
git@github.com:baturorkun/tefas-pro.git
```

Before the first push, verify that the remote is the intended empty repository.
If it resolves to the former project's history, stop without pushing.

## Generated Structure

AI Factory owns the initial scaffold. The application starts with
`public/index.html`, `src/main.ts`, `src/styles.css`, TypeScript configuration,
container files, CI workflows, and the standard requirement, constraint,
reference, handoff, run, and template directories.

No product functionality or TEFAS domain behavior is included in this
bootstrap. Those capabilities will be introduced later through explicit
requirements.

## Verification

Before the initial source push:

1. Confirm `.env` exists locally and is ignored by Git.
2. Install the generated dependencies if required by the scaffold.
3. Run `pnpm typecheck`.
4. Run `pnpm build`.
5. Confirm the Git index contains no secrets or files copied from the former
   project other than the ignored `.env`.

## Delivery

After verification, create the initial commit, add the GitHub remote, retain
the `main` branch name, and push with upstream tracking. A remote containing
unexpected history is a blocking safety condition and must not be overwritten.
