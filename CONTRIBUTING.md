# Contributing to TaskMinder

Thank you for your interest in contributing! Please read through these guidelines before getting started.

---

## Getting Started

Follow the instructions in the [TaskMinder Docs Development Section](docs.taskminder.de/v2/development.html).

---

## How to Contribute

**Reporting Bugs** — Search [existing issues](https://github.com/taskminder/taskminder/issues) before opening a new one. Include a clear title, steps to reproduce, expected vs. actual behavior, your environment, and any relevant screenshots or logs.

**Suggesting Features** — Check the issue tracker and pinned Roadmap issue first. Describe the problem, your proposed solution, and any alternatives. For larger changes, open an issue before writing code.

**Submitting Pull Requests**

1. Branch off `main` using the naming conventions below.
2. Include updated documentation where appropriate.
3. Manually verify your changes thoroughly before pushing (see [Testing](#testing)).
4. Open a PR against `main`, fill out the template completely, and link related issues (e.g. `Closes #123`).
5. Respond to reviewer feedback — PRs stale for 30+ days may be closed.

Keep PRs focused. For unrelated fixes, open separate PRs.

---

## Branch Naming & Commit Conventions

Branch names should be hyphenated and prefixed by type:

```
feat/add-recurring-tasks
fix/due-date-timezone-bug
docs/update-api-reference
chore/upgrade-dependencies
```

Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) spec:

```
<type>(<scope>): <short description>
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

---

## Code Style

TaskMinder uses ESLint and Prettier (configs included in the repo root). Run `bun run lint` to check and auto-format. Key conventions: prefer `const` over `let`, avoid `var`, keep functions small and single-purpose, and comment non-obvious logic only.

---

## Testing

TaskMinder doesn't have a formal test suite yet. In the meantime, manually verify the happy path, edge cases, invalid inputs, and any related functionality your change could affect.

---

## Documentation

If your change affects how TaskMinder is used, update the relevant docs in the `docs/` directory.

---

## Review Process

PRs require at least one approving maintainer review. Reviewers look for: a clear problem being solved, clean and maintainable code, and updated documentation. Maintainers aim to respond within a few business days, if you haven't heard back in a week, leave a comment as a nudge.

---

Thanks for contributing - every bit helps! 🎉