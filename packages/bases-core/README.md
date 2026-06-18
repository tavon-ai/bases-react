# @bases-react/core

Framework-independent Bases engine.

## APIs

- `parseBase(source)` parses `.base` YAML.
- `normalizeBase(raw)` validates and normalizes definitions.
- `evaluateBase({ base, files, view, groupBy })` returns rows, columns, summaries, group summaries, diagnostics, and selected view metadata.

This package has no React or TanStack dependency.
