# Obsidian Bases React Package — Implementation Plan

## Goal

Build a new React package that renders Obsidian Bases-style views using a reusable Bases engine and TanStack Table for the table-specific row/column mechanics.

The package should support `.base` YAML files, normalized vault/file data, formulas, filters, summaries, and multiple view renderers: table, list, cards, and eventually map.

## Guiding Principles

- Do **not** fork TanStack Table.
- Do **not** fork Obsidian.
- Keep the core Bases engine independent from React and TanStack.
- Use TanStack Table as the table-view adapter, not as the whole data engine.
- Support standalone React use first; add Obsidian integration later.
- Avoid `eval`; formulas and filters should use a safe parser/interpreter.
- Aim for “Bases-compatible subset” first, then expand toward fuller compatibility.

---

## Proposed Repository Structure

```txt
bases-react/
  packages/
    bases-core/
    bases-react/
    bases-tanstack/
    bases-fs/
    bases-obsidian/
  examples/
    vite-demo/
    obsidian-plugin-demo/
  docs/
    compatibility.md
    syntax.md
    architecture.md
  tests/
    fixtures/
```

---

## Package Responsibilities

### `@scope/bases-core`

Core engine. No React. No TanStack.

Responsibilities:

- Parse `.base` YAML.
- Validate and normalize Base definitions.
- Represent files, note properties, formula properties, links, dates, durations, images, icons, and HTML values.
- Evaluate global filters and view-level filters.
- Evaluate formulas.
- Resolve formula dependencies.
- Detect formula cycles.
- Compute effective result rows for a selected view.
- Compute summaries.
- Provide diagnostics and errors.

Primary API:

```ts
evaluateBase({
  base,
  files,
  view,
  context,
}): BaseEvaluationResult
```

### `@scope/bases-react`

React UI package.

Responsibilities:

- Public React components.
- Shared Base context/provider.
- Value renderers.
- Toolbar pieces.
- View switching.
- Search/filter/sort/property controls.
- Table/List/Cards/Map component shells.

Primary API:

```tsx
<BaseView base={baseYaml} files={files} view="Books" />
```

or:

```tsx
const result = evaluateBase({ base, files, view: 'Books' })
<BaseTable result={result} />
```

### `@scope/bases-tanstack`

TanStack Table adapter.

Responsibilities:

- Convert `BaseEvaluationResult` to TanStack column definitions.
- Configure TanStack row models.
- Provide custom sorting functions.
- Provide custom grouping functions.
- Provide aggregation/summary helpers.
- Support column order, visibility, resizing, selection, and editable cells.

### `@scope/bases-fs`

Standalone filesystem/Markdown adapter.

Responsibilities:

- Read Markdown files from a filesystem-like source.
- Parse frontmatter.
- Extract basic inline tags.
- Extract basic wikilinks.
- Produce normalized `BaseFile` records.

This is for demos, tests, static sites, and non-Obsidian usage.

### `@scope/bases-obsidian`

Optional Obsidian bridge.

Responsibilities:

- Use Obsidian APIs to read vault files.
- Use metadata cache for frontmatter, tags, links, embeds, and file metadata.
- Watch vault and metadata changes.
- Provide `this.file`, active file, base file, and embedding file context.
- Expose hooks usable inside an Obsidian plugin.

---

## Core Data Model

### Normalized File

```ts
type BaseFile = {
  path: string
  name: string
  basename: string
  folder: string
  ext: string
  size?: number
  ctime?: Date
  mtime?: Date
  tags: string[]
  links: BaseLink[]
  embeds?: BaseLink[]
  backlinks?: BaseLink[]
  properties: Record<string, BaseValue>
}
```

### Values

```ts
type BaseValue =
  | null
  | string
  | number
  | boolean
  | BaseDate
  | BaseDuration
  | BaseFileRef
  | BaseLink
  | BaseImage
  | BaseIcon
  | BaseHtml
  | BaseValue[]
  | Record<string, BaseValue>
```

### Evaluation Result

```ts
type BaseEvaluationResult = {
  base: NormalizedBaseDefinition
  view: NormalizedBaseView
  rows: BaseRow[]
  columns: BaseColumn[]
  summaries: Record<string, BaseValue>
  diagnostics: BaseDiagnostic[]
}
```

---

## Milestones

## Milestone 0 — [ ] Project Bootstrap

### Goal

Create the new repo and establish tooling.

### Tasks

- [ ] Initialize monorepo.
- [ ] Configure TypeScript.
- [ ] Configure package manager/workspaces.
- [ ] Add linting/formatting.
- [ ] Add test runner.
- [ ] Add build tooling.
- [ ] Add basic docs structure.
- [ ] Add CI for typecheck/test/build.

### Deliverables

- [ ] Empty packages compile successfully.
- [ ] CI passes.
- [ ] Initial README explains project goals and compatibility intent.

---

## Milestone 1 — [ ] `.base` Parser and Schema Normalization

### Goal

Load `.base` YAML into a typed, normalized internal model.

### Tasks

- [ ] Add YAML parser.
- [ ] Define TypeScript types for raw Base schema:
  - [ ] `filters`
  - [ ] `formulas`
  - [ ] `properties`
  - [ ] `summaries`
  - [ ] `views`
- [ ] Define normalized schema types.
- [ ] Validate required view fields.
- [ ] Normalize shorthand note properties.
- [ ] Normalize view names/types.
- [ ] Normalize global filters and view filters.
- [ ] Add diagnostics for invalid/missing fields.

### Deliverables

- [ ] `parseBase(source: string): RawBaseDefinition`
- [ ] `normalizeBase(raw): NormalizedBaseDefinition`
- [ ] Test fixtures for valid and invalid `.base` files.

---

## Milestone 2 — [ ] Static Data Model and Basic Evaluation

### Goal

Evaluate a Base against normalized file data without formulas yet.

### Tasks

- [ ] Define `BaseFile`, `BaseRow`, `BaseColumn`, and `BaseValue`.
- [ ] Build rows from file records.
- [ ] Support file properties:
  - [ ] `file.name`
  - [ ] `file.basename`
  - [ ] `file.path`
  - [ ] `file.folder`
  - [ ] `file.ext`
  - [ ] `file.size`
  - [ ] `file.ctime`
  - [ ] `file.mtime`
  - [ ] `file.tags`
  - [ ] `file.links`
  - [ ] `file.properties`
- [ ] Support note property access:
  - [ ] `note.foo`
  - [ ] `note["foo"]`
  - [ ] shorthand `foo`
- [ ] Support property display names.
- [ ] Select columns from view `order`.

### Deliverables

- [ ] `evaluateBase()` returns rows/columns for simple table views.
- [ ] Tests for file and note property resolution.

---

## Milestone 3 — [ ] Expression Parser and Interpreter MVP

### Goal

Safely parse and evaluate simple filters and formulas.

### Tasks

- [ ] Choose parser strategy/library.
- [ ] Define expression AST.
- [ ] Parse literals:
  - [ ] strings
  - [ ] numbers
  - [ ] booleans
  - [ ] null
- [ ] Parse identifiers and property paths.
- [ ] Parse arithmetic operators:
  - [ ] `+`
  - [ ] `-`
  - [ ] `*`
  - [ ] `/`
  - [ ] `%`
- [ ] Parse comparison operators:
  - [ ] `==`
  - [ ] `!=`
  - [ ] `>`
  - [ ] `<`
  - [ ] `>=`
  - [ ] `<=`
- [ ] Parse boolean operators:
  - [ ] `!`
  - [ ] `&&`
  - [ ] `||`
- [ ] Parse parentheses.
- [ ] Interpret AST against row context.
- [ ] Add basic error diagnostics.

### Deliverables

- [ ] `parseExpression(source): ExpressionAst`
- [ ] `evaluateExpression(ast, context): BaseValue`
- [ ] Simple formulas work.
- [ ] Simple filters work.

---

## Milestone 4 — [ ] Filters

### Goal

Support Bases global and view filter semantics.

### Tasks

- [ ] Support filter statements as strings.
- [ ] Support recursive filter objects:
  - [ ] `and`
  - [ ] `or`
  - [ ] `not`
- [ ] Combine global filters and view filters with implicit `AND`.
- [ ] Apply filters before rendering.
- [ ] Add diagnostics for invalid filter structures.

### Deliverables

- [ ] Full nested filter tree support.
- [ ] Tests for `and`, `or`, `not`, and global+view filter merging.

---

## Milestone 5 — [ ] Formula Properties

### Goal

Support formula-defined properties.

### Tasks

- [ ] Parse all formulas in Base definition.
- [ ] Detect references to `formula.foo`.
- [ ] Build formula dependency graph.
- [ ] Topologically sort formulas.
- [ ] Detect direct and indirect cycles.
- [ ] Evaluate formulas per row.
- [ ] Cache formula results per row.
- [ ] Add formula diagnostics.

### Deliverables

- [ ] `formula.foo` values available as columns, filters, sorts, and summaries.
- [ ] Circular formula references produce diagnostics.

---

## Milestone 6 — [ ] Function Library MVP

### Goal

Implement the most common Bases functions and methods.

### Tasks

Implement global functions:

- [ ] `if()`
- [ ] `now()`
- [ ] `today()`
- [ ] `date()`
- [ ] `number()`
- [ ] `list()`
- [ ] `min()`
- [ ] `max()`
- [ ] `link()`
- [ ] `image()`
- [ ] `icon()`

Implement string methods:

- [ ] `.contains()`
- [ ] `.containsAll()`
- [ ] `.containsAny()`
- [ ] `.startsWith()`
- [ ] `.endsWith()`
- [ ] `.lower()`
- [ ] `.title()`
- [ ] `.trim()`
- [ ] `.replace()`
- [ ] `.split()`
- [ ] `.slice()`

Implement number methods:

- [ ] `.round()`
- [ ] `.toFixed()`
- [ ] `.abs()`
- [ ] `.ceil()`
- [ ] `.floor()`

Implement list methods:

- [ ] `.contains()`
- [ ] `.containsAll()`
- [ ] `.containsAny()`
- [ ] `.join()`
- [ ] `.sort()`
- [ ] `.unique()`
- [ ] `.slice()`

Implement file methods:

- [ ] `file.hasTag()`
- [ ] `file.inFolder()`
- [ ] `file.hasProperty()`
- [ ] `file.hasLink()`
- [ ] `file.asLink()`

### Deliverables

- [ ] Common Bases examples evaluate correctly.
- [ ] Function tests grouped by value type.

---

## Milestone 7 — [ ] Date, Duration, Link, and File Semantics

### Goal

Improve compatibility for non-primitive values.

### Tasks

- [ ] Implement `BaseDate` wrapper or normalized date handling.
- [ ] Implement date formatting.
- [ ] Implement date fields:
  - [ ] `.year`
  - [ ] `.month`
  - [ ] `.day`
  - [ ] `.hour`
  - [ ] `.minute`
  - [ ] `.second`
- [ ] Implement date methods:
  - [ ] `.date()`
  - [ ] `.time()`
  - [ ] `.format()`
  - [ ] `.relative()`
- [ ] Implement duration parsing:
  - [ ] `d`, `day`, `days`
  - [ ] `w`, `week`, `weeks`
  - [ ] `M`, `month`, `months`
  - [ ] `y`, `year`, `years`
  - [ ] `h`, `hour`, `hours`
  - [ ] `m`, `minute`, `minutes`
  - [ ] `s`, `second`, `seconds`
- [ ] Support date arithmetic.
- [ ] Implement link/file equality semantics.
- [ ] Implement list/object indexing.
- [ ] Implement object access and methods:
  - [ ] `.keys()`
  - [ ] `.values()`
  - [ ] `.isEmpty()`

### Deliverables

- [ ] Date and duration formulas work.
- [ ] Link/file comparisons work for normalized file data.

---

## Milestone 8 — [ ] Table View with TanStack

### Goal

Render a functional Table view using TanStack Table.

### Tasks

- [ ] Add `@scope/bases-tanstack`.
- [ ] Add `@tanstack/react-table` dependency.
- [ ] Convert Base columns to TanStack column definitions.
- [ ] Render headers, rows, and cells.
- [ ] Support column order from view `order`.
- [ ] Support sorting.
- [ ] Support grouping via view `groupBy`.
- [ ] Support row expansion for grouped rows.
- [ ] Support custom sorting for Base values.
- [ ] Support custom grouping keys for Base values.
- [ ] Add row limit support.
- [ ] Add basic styling hooks/classes.

### Deliverables

- [ ] `<BaseTable result={result} />`
- [ ] Table example matching a simple `.base` file.
- [ ] Sorting and grouping tests/examples.

---

## Milestone 9 — [ ] Summaries and Aggregations

### Goal

Support built-in and custom table summaries.

### Tasks

Implement built-in summaries:

- [ ] Average
- [ ] Min
- [ ] Max
- [ ] Sum
- [ ] Range
- [ ] Median
- [ ] Stddev
- [ ] Earliest
- [ ] Latest
- [ ] Checked
- [ ] Unchecked
- [ ] Empty
- [ ] Filled
- [ ] Unique

Support custom summaries:

```yaml
summaries:
  customAverage: 'values.mean().round(3)'
```

Additional tasks:

- [ ] Add `values` context for summary expressions.
- [ ] Compute summaries over visible/filtered rows.
- [ ] Compute group summaries.
- [ ] Render summary footer rows.
- [ ] Render group summary rows/cells.

### Deliverables

- [ ] Summary calculations match expected fixtures.
- [ ] Table view renders footer summaries.

---

## Milestone 10 — [ ] React Components and Provider API

### Goal

Expose ergonomic React APIs.

### Tasks

- [ ] Implement `<BaseProvider>`.
- [ ] Implement `<BaseView>`.
- [ ] Implement `<BaseTable>`.
- [ ] Implement value renderers for:
  - [ ] string
  - [ ] number
  - [ ] boolean
  - [ ] date
  - [ ] list
  - [ ] link
  - [ ] file
  - [ ] image
  - [ ] icon
  - [ ] HTML
- [ ] Add render override hooks/props.
- [ ] Add loading/error/diagnostic UI.

### Deliverables

- [ ] Public React API usable in a Vite example.
- [ ] Basic docs for usage.

---

## Milestone 11 — [ ] List View

### Goal

Implement Bases-style list renderer.

### Tasks

- [ ] Support list markers:
  - [ ] bullets
  - [ ] numbers
  - [ ] none
- [ ] Determine primary property.
- [ ] Render selected properties.
- [ ] Support indented properties.
- [ ] Support inline separators.
- [ ] Reuse core result rows.
- [ ] Respect filters, formulas, sorting, and grouping where applicable.

### Deliverables

- [ ] `<BaseList result={result} />`
- [ ] List view demo and tests.

---

## Milestone 12 — [ ] Cards View

### Goal

Implement Bases-style cards renderer.

### Tasks

- [ ] Render grid layout.
- [ ] Support card size.
- [ ] Support image property.
- [ ] Support image values:
  - [ ] local attachment link
  - [ ] URL
  - [ ] hex color
- [ ] Support image fit:
  - [ ] cover
  - [ ] contain
- [ ] Support image aspect ratio.
- [ ] Render selected properties.
- [ ] Add styling hooks/classes.

### Deliverables

- [ ] `<BaseCards result={result} />`
- [ ] Cards demo with cover images/colors.

---

## Milestone 13 — [ ] Filesystem Markdown Adapter

### Goal

Allow standalone demos and static-site usage from Markdown files.

### Tasks

- [ ] Add `@scope/bases-fs`.
- [ ] Parse Markdown frontmatter.
- [ ] Build `BaseFile` records.
- [ ] Extract basic inline tags.
- [ ] Extract basic wikilinks.
- [ ] Add fixture vault for tests.
- [ ] Add Vite demo loading sample vault data.

### Deliverables

- [ ] `loadMarkdownFiles()` adapter.
- [ ] Demo vault rendered through Base views.

---

## Milestone 14 — [ ] Toolbar and Interactive Controls

### Goal

Add basic UI controls similar to Bases.

### Tasks

- [ ] View switcher.
- [ ] Search over displayed properties.
- [ ] Sort menu.
- [ ] Properties/columns menu.
- [ ] Results count.
- [ ] Limit control.
- [ ] Copy current view to clipboard.
- [ ] Export CSV.
- [ ] Basic filter display/editing.

### Deliverables

- [ ] `<BaseToolbar />`
- [ ] Interactive Vite demo.

---

## Milestone 15 — [ ] Editing Support

### Goal

Support editable values through callbacks.

### Tasks

- [ ] Define update APIs.
- [ ] Support editing primitive note properties.
- [ ] Support checkbox values.
- [ ] Support text/number/date editing.
- [ ] Emit patch/update events.
- [ ] Keep adapters responsible for persistence.
- [ ] Add optimistic update support.

### Deliverables

```ts
onUpdateProperty(filePath, propertyName, value)
```

- [ ] Editable table cells in demo.

---

## Milestone 16 — [ ] Map View

### Goal

Implement map renderer as optional view.

### Tasks

- [ ] Choose map library, likely MapLibre or Leaflet.
- [ ] Support coordinates property.
- [ ] Support coordinates as string: `"lat, lng"`.
- [ ] Support coordinates as list: `[lat, lng]`.
- [ ] Support formula-derived coordinates.
- [ ] Support marker icon property.
- [ ] Support marker color property.
- [ ] Support tile URL.
- [ ] Support center and zoom options.
- [ ] Render marker popup/preview with selected properties.

### Deliverables

- [ ] `<BaseMap result={result} />`
- [ ] Map demo with sample place notes.

---

## Milestone 17 — [ ] Obsidian Bridge

### Goal

Support real Obsidian vault data inside an Obsidian plugin.

### Tasks

- [ ] Add `@scope/bases-obsidian`.
- [ ] Create adapter from Obsidian `App` to `BaseFile[]`.
- [ ] Use `metadataCache` for:
  - [ ] frontmatter
  - [ ] tags
  - [ ] links
  - [ ] embeds
- [ ] Use `vault` for:
  - [ ] files
  - [ ] stats
  - [ ] paths
- [ ] Watch vault changes.
- [ ] Watch metadata changes.
- [ ] Implement context modes:
  - [ ] base file
  - [ ] embedding file
  - [ ] active file
- [ ] Add Obsidian plugin demo.

### Deliverables

- [ ] `createObsidianDataSource(app)`.
- [ ] Working plugin demo rendering Bases React components.

---

## Milestone 18 — [ ] Compatibility Suite

### Goal

Track and improve compatibility with Obsidian Bases.

### Tasks

- [ ] Create fixture `.base` files.
- [ ] Create fixture Markdown vaults.
- [ ] Add expected JSON outputs.
- [ ] Add compatibility docs.
- [ ] Mark support status for each feature:
  - [ ] supported
  - [ ] partial
  - [ ] unsupported
  - [ ] planned
- [ ] Add regression tests for public examples from Obsidian docs.

### Deliverables

- [ ] `docs/compatibility.md`
- [ ] Automated compatibility test suite.

---

## Milestone 19 — [ ] Documentation and Examples

### Goal

Make the package usable by others.

### Tasks

- [ ] Write getting-started docs.
- [ ] Document core APIs.
- [ ] Document React APIs.
- [ ] Document data source adapters.
- [ ] Document supported `.base` syntax.
- [ ] Document custom renderers.
- [ ] Document styling.
- [ ] Document limitations.
- [ ] Build examples:
  - [ ] reading list
  - [ ] project tracker
  - [ ] CRM
  - [ ] travel map
  - [ ] gallery/cards

### Deliverables

- [ ] Complete README.
- [ ] Docs site or docs folder.
- [ ] Multiple runnable examples.

---

## Milestone 20 — [ ] Release Preparation

### Goal

Prepare for first public release.

### Tasks

- [ ] Stabilize package names.
- [ ] Stabilize public APIs.
- [ ] Add changelog.
- [ ] Add versioning/release tooling.
- [ ] Add package READMEs.
- [ ] Add license.
- [ ] Add contribution guide.
- [ ] Publish alpha release.

### Deliverables

- [ ] `0.1.0-alpha` release.
- [ ] Public npm packages.

---

## MVP Definition

The initial MVP should include:

- `@scope/bases-core`
- `@scope/bases-react`
- `@scope/bases-tanstack`
- `.base` YAML parser
- normalized file data input
- table view
- list view
- cards view
- simple filters
- formula subset
- sorting
- grouping
- summaries
- property display names
- Vite demo

MVP can defer:

- Obsidian bridge
- map view
- full date/duration support
- full link resolution
- inline editing
- advanced toolbar UI
- complete Bases function library

---

## Risks and Mitigations

### Risk: Expression language complexity

Mitigation:

- Start with a subset.
- Use explicit compatibility docs.
- Build many fixtures.
- Avoid promising perfect compatibility early.

### Risk: Obsidian behavior differences

Mitigation:

- Keep Obsidian bridge isolated.
- Use Obsidian metadata cache where possible.
- Track unsupported edge cases.

### Risk: TanStack Table mismatch for summaries/grouping

Mitigation:

- Compute summaries in `bases-core` if needed.
- Use TanStack primarily for rendering and interaction state.

### Risk: API surface grows too quickly

Mitigation:

- Keep `bases-core` small and stable.
- Put optional integrations in separate packages.
- Prefer composable hooks/components over monolithic APIs.

---

## Suggested Implementation Order

1. Bootstrap repo.
2. Build `bases-core` parser and normalized model.
3. Build expression parser/interpreter MVP.
4. Implement filters.
5. Implement formulas.
6. Implement function library MVP.
7. Build TanStack table adapter.
8. Build React table renderer.
9. Add summaries.
10. Add list and cards renderers.
11. Add filesystem adapter and richer demo.
12. Add toolbar/interactions.
13. Add map renderer.
14. Add Obsidian bridge.
15. Expand compatibility and docs.

---

## Open Questions

- What package scope/name should be used?
- Should the first release target Obsidian plugin users or standalone React users?
- Should the expression parser be custom or based on a library?
- Should date formatting use Moment-compatible behavior, Day.js, Luxon, or a custom adapter?
- How strict should compatibility be with Obsidian Bases syntax quirks?
- Should Map view be included in the core React package or a separate optional package?
- Should editing be part of MVP or post-MVP?

---

## Summary

This project is feasible as a new React package suite. TanStack Table is a strong fit for table rendering, grouping, sorting, and aggregation mechanics, but the main work is the Bases engine: parsing `.base` files, evaluating expressions, modeling Obsidian-like values, and bridging data sources.

The recommended path is to build a framework-independent `bases-core`, layer React components on top, and use TanStack Table only where it provides clear value: the Table view.

---

## Appendix — Very Simple React App Demo

Add a minimal standalone React example that proves the package can render Bases-style views from plain files without any Obsidian vault dependency.

### Demo Goal

Create a tiny Vite React app that:

- reads sample Markdown files from a local `data/projects/` directory;
- parses YAML frontmatter and Markdown body through `@scope/bases-fs`;
- renders a `.base` definition through `@scope/bases-react`;
- uses only filesystem-backed sample data, not Obsidian vault APIs, metadata cache, or `.obsidian` folders;
- models the sample Markdown as OKF concepts following the `~/workspace/other/knowledge-catalog/okf` standard.

### Demo Directory Structure

```txt
examples/
  simple-react-app/
    package.json
    index.html
    src/
      App.tsx
      main.tsx
      styles.css
    data/
      projects.base
      projects/
        alpha-search.md
        atlas-dashboard.md
        beacon-sync.md
```

### OKF Project Markdown Standard

Each project is one Markdown concept document with YAML frontmatter. The files must follow the OKF convention:

- UTF-8 Markdown file.
- Required frontmatter block delimited by `---`.
- Required `type` field.
- Recommended `title`, `description`, `resource`, `tags`, and `timestamp` fields.
- Additional project-specific fields are allowed and should be preserved by parsers.

For this demo, use `type: Project` and include simple queryable fields such as `status`, `owner`, `priority`, and `progress`.

Example:

```markdown
---
type: Project
title: Alpha Search
description: Improve catalog search quality and ranking for project knowledge.
resource: file://projects/alpha-search
tags: [search, catalog, frontend]
timestamp: 2026-06-18T00:00:00Z
status: Active
owner: Maya
priority: High
progress: 72
---

# Summary

Alpha Search improves discovery across OKF project concepts.

# Milestones

- Parse project documents from local Markdown files.
- Render project status in a React table.
- Add lightweight filtering by status and owner.
```

### Sample `.base` Definition

```yaml
views:
  - name: Projects
    type: table
    filters:
      and:
        - property: type
          equals: Project
    columns:
      - property: title
        label: Project
      - property: status
      - property: owner
      - property: priority
      - property: progress
        label: Progress %
      - property: tags
      - property: timestamp
        label: Updated
    sort:
      - property: priority
        direction: desc
      - property: title
        direction: asc
```

### Minimal React App Shape

```tsx
import { BaseView } from '@scope/bases-react'
import { loadMarkdownFiles, parseBaseFile } from '@scope/bases-fs'
import baseYaml from '../data/projects.base?raw'

export function App() {
  const files = loadMarkdownFiles(
    import.meta.glob('../data/projects/*.md', {
      as: 'raw',
      eager: true,
    }),
  )

  const base = parseBaseFile(baseYaml)

  return (
    <main>
      <h1>Projects</h1>
      <p>Standalone file-based OKF project data rendered with Bases React.</p>
      <BaseView base={base} files={files} view="Projects" />
    </main>
  )
}
```

### Acceptance Criteria

- The app runs with `npm install` and `npm run dev` from `examples/simple-react-app`.
- No Obsidian packages, vault layout, or metadata cache are required.
- All sample records are Markdown files under `data/projects/`.
- The Markdown records conform to OKF: frontmatter includes `type`, and should include `title`, `description`, `resource`, `tags`, and `timestamp`.
- The rendered table displays project rows and supports the initial columns/filter/sort from `projects.base`.
