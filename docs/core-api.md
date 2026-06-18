# Core API

`@bases-react/core` is framework-independent.

## `parseBase(source)`

Parses `.base` YAML into a raw definition.

## `normalizeBase(raw)`

Validates and normalizes raw schema into typed views, columns, formulas, summaries, and diagnostics.

## `evaluateBase(options)`

```ts
evaluateBase({
  base,
  files,
  view,
  groupBy,
})
```

Returns rows, columns, summaries, group summaries, selected view metadata, and diagnostics.

Input files use the `BaseFile` shape: path/name/folder metadata, tags, links, and a `properties` record for frontmatter/note properties.
