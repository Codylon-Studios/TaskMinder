# oxlint Prisma plugin

A local oxlint JS plugin that catches `select` / `include` keys referencing
fields that don't exist on a Prisma model — e.g. `prisma.estimate.findUnique({
select: { jobId: true } })` when `Estimate` has no `jobId`.

## Why this exists

Prisma's generated query methods accept `select`/`include` as a generic type
parameter (`SelectSubset<T, …Args>`). TypeScript does **not** apply
excess-property checking to object literals matched against a generic parameter,
and the inner `select` object is validated via `GetSelect<>`, a mapped type that
also disables excess-property checks. The net effect: a typo'd or stale field
name in a nested `select` type-checks cleanly under both `tsc` and `tsgo`, then
fails at runtime with `PrismaClientValidationError: Unknown field`.

Patching the generated client to close `GetSelect` was attempted and rejected —
it breaks Prisma's result-shape inference and produces hundreds of false errors.
A lint rule that reads the schema directly is the reliable fix.

## How it works

- [`schema.js`](./schema.js) parses the `.prisma` files in a backend's
  `src/db/models` into `{ Model: { field: { relation } } }`.
- [`no-unknown-select-field.js`](./no-unknown-select-field.js) visits
  `CallExpression`s of the form `(prisma|tx|db).<model>.<method>(…)`, finds the
  `select`/`include` object, and reports any key that isn't a field on the
  model. It recurses into nested `select`/`include` by following relation
  fields to their target model.

Detection is syntax-only (no type info), so it intentionally bails when it can't
confidently resolve the model — unknown roots, computed keys, and spreads are
skipped to avoid false positives.

## Configuration

Registered in the root [`.oxlintrc.json`](../../../.oxlintrc.json):

```jsonc
"jsPlugins": ["…", "./scripts/oxlint-plugins/prisma/index.js"],
"rules": {
  "prisma-local/no-unknown-select-field": ["error", { "schemaDir": "src/db/models" }]
}
```

`schemaDir` is resolved relative to each linted file's nearest ancestor that
contains the dir, so a single `bun run lint` covers all four backends.

## Limitations

- Only top-level `(prisma|tx|db).<model>.<method>` calls are checked. Selects
  built up in a separate variable and passed in aren't traced.
- `select` and `include` are treated identically (any existing field is
  allowed); it does not enforce that `include` keys are relations only.
- Schema parsing is line-based, matching the one-field-per-line convention used
  across the repo's models.
