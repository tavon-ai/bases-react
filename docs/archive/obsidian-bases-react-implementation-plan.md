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

## Milestone 0 — [x] Project Bootstrap

### Goal

Create the new repo and establish tooling.

### Tasks

- [x] Initialize monorepo.
- [x] Configure TypeScript.
- [x] Configure package manager/workspaces.
- [x] Add linting/formatting.
- [x] Add test runner.
- [x] Add build tooling.
- [x] Add basic docs structure.
- [x] Add CI for typecheck/test/build.

### Deliverables

- [x] Packages compile successfully.
- [x] Local typecheck/test/build passes; CI workflow added.
- [x] Initial README explains project goals and compatibility intent.

---

## Milestone 1 — [x] `.base` Parser and Schema Normalization

### Goal

Load `.base` YAML into a typed, normalized internal model.

### Tasks

- [x] Add YAML parser.
- [x] Define TypeScript types for raw Base schema:
  - [x] `filters`
  - [x] `formulas`
  - [x] `properties`
  - [x] `summaries`
  - [x] `views`
- [x] Define normalized schema types.
- [x] Validate required view fields.
- [x] Normalize shorthand note properties.
- [x] Normalize view names/types.
- [x] Normalize global filters and view filters.
- [x] Add diagnostics for invalid/missing fields.

### Deliverables

- [x] `parseBase(source: string): RawBaseDefinition`
- [x] `normalizeBase(raw): NormalizedBaseDefinition`
- [x] Test fixtures for valid and invalid `.base` files.

---

## Milestone 2 — [x] Static Data Model and Basic Evaluation

### Goal

Evaluate a Base against normalized file data without formulas yet.

### Tasks

- [x] Define `BaseFile`, `BaseRow`, `BaseColumn`, and `BaseValue`.
- [x] Build rows from file records.
- [x] Support file properties:
  - [x] `file.name`
  - [x] `file.basename`
  - [x] `file.path`
  - [x] `file.folder`
  - [x] `file.ext`
  - [x] `file.size`
  - [x] `file.ctime`
  - [x] `file.mtime`
  - [x] `file.tags`
  - [x] `file.links`
  - [x] `file.properties`
- [x] Support note property access:
  - [x] `note.foo`
  - [x] `note["foo"]`
  - [x] shorthand `foo`
- [x] Support property display names.
- [x] Select columns from view `order`.

### Deliverables

- [x] `evaluateBase()` returns rows/columns for simple table views.
- [x] Tests for basic filtering/sorting/column projection; file/note property fixture expansion remains.

---

## Milestone 3 — [x] Expression Parser and Interpreter MVP

### Goal

Safely parse and evaluate simple filters and formulas.

### Tasks

- [x] Choose parser strategy/library: custom Pratt parser.
- [x] Define expression AST.
- [ ] Parse literals:
  - [x] strings
  - [x] numbers
  - [x] booleans
  - [x] null
- [x] Parse identifiers and property paths.
- [ ] Parse arithmetic operators:
  - [x] `+`
  - [x] `-`
  - [x] `*`
  - [x] `/`
  - [x] `%`
- [ ] Parse comparison operators:
  - [x] `==`
  - [x] `!=`
  - [x] `>`
  - [x] `<`
  - [x] `>=`
  - [x] `<=`
- [ ] Parse boolean operators:
  - [x] `!`
  - [x] `&&`
  - [x] `||`
- [x] Parse parentheses.
- [x] Interpret AST against row context.
- [x] Add basic error diagnostics.

### Deliverables

- [x] `parseExpression(source): ExpressionAst`
- [x] `evaluateExpression(ast, context): BaseValue`
- [x] Simple formulas work.
- [x] Simple filters work.

---

## Milestone 4 — [x] Filters

### Goal

Support Bases global and view filter semantics.

### Tasks

- [x] Support filter statements as strings.
- [x] Support recursive filter objects:
  - [x] `and`
  - [x] `or`
  - [x] `not`
- [x] Combine global filters and view filters with implicit `AND`.
- [x] Apply filters before rendering.
- [x] Add diagnostics for invalid filter structures.

### Deliverables

- [x] Full nested filter tree support.
- [x] Tests for `and`, `or`, `not`, and global+view filter merging.

---

## Milestone 5 — [x] Formula Properties

### Goal

Support formula-defined properties.

### Tasks

- [x] Parse all formulas in Base definition.
- [x] Detect references to `formula.foo`.
- [x] Build formula dependency graph.
- [x] Topologically sort formulas.
- [x] Detect direct and indirect cycles.
- [x] Evaluate formulas per row.
- [x] Cache formula results per row.
- [x] Add formula diagnostics.

### Deliverables

- [x] `formula.foo` values available as columns, filters, sorts, and summaries.
- [x] Circular formula references produce diagnostics.

---

## Milestone 6 — [x] Function Library MVP

### Goal

Implement the most common Bases functions and methods.

### Tasks

Implement global functions:

- [x] `if()`
- [x] `now()`
- [x] `today()`
- [x] `date()`
- [x] `number()`
- [x] `list()`
- [x] `min()`
- [x] `max()`
- [x] `link()`
- [x] `image()`
- [x] `icon()`

Implement string methods:

- [x] `.contains()`
- [x] `.containsAll()`
- [x] `.containsAny()`
- [x] `.startsWith()`
- [x] `.endsWith()`
- [x] `.lower()`
- [x] `.title()`
- [x] `.trim()`
- [x] `.replace()`
- [x] `.split()`
- [x] `.slice()`

Implement number methods:

- [x] `.round()`
- [x] `.toFixed()`
- [x] `.abs()`
- [x] `.ceil()`
- [x] `.floor()`

Implement list methods:

- [x] `.contains()`
- [x] `.containsAll()`
- [x] `.containsAny()`
- [x] `.join()`
- [x] `.sort()`
- [x] `.unique()`
- [x] `.slice()`

Implement file methods:

- [x] `file.hasTag()`
- [x] `file.inFolder()`
- [x] `file.hasProperty()`
- [x] `file.hasLink()`
- [x] `file.asLink()`

### Deliverables

- [x] Demo formulas/functions evaluate correctly.
- [x] Function tests grouped by value type.

---

## Milestone 7 — [x] Date, Duration, Link, and File Semantics

### Goal

Improve compatibility for non-primitive values.

### Tasks

- [x] Implement normalized date handling with JavaScript `Date` values.
- [x] Implement date formatting.
- [x] Implement date fields:
  - [x] `.year`
  - [x] `.month`
  - [x] `.day`
  - [x] `.hour`
  - [x] `.minute`
  - [x] `.second`
- [x] Implement date methods:
  - [x] `.date()`
  - [x] `.time()`
  - [x] `.format()`
  - [x] `.relative()`
- [x] Implement duration parsing:
  - [x] `d`, `day`, `days`
  - [x] `w`, `week`, `weeks`
  - [x] `M`, `month`, `months`
  - [x] `y`, `year`, `years`
  - [x] `h`, `hour`, `hours`
  - [x] `m`, `minute`, `minutes`
  - [x] `s`, `second`, `seconds`
- [x] Support date arithmetic.
- [x] Implement link/file equality semantics.
- [x] Implement list/object indexing.
- [x] Implement object access and methods:
  - [x] `.keys()`
  - [x] `.values()`
  - [x] `.isEmpty()`

### Deliverables

- [x] Date and duration formulas work.
- [x] Link/file comparisons work for normalized file data.

---

## Milestone 8 — [x] Table View with TanStack

### Goal

Render a functional Table view using TanStack Table.

### Tasks

- [x] Add `@bases-react/tanstack`.
- [x] Add `@tanstack/react-table` dependency.
- [x] Convert Base columns to TanStack column definitions.
- [x] Render headers, rows, and cells.
- [x] Support column order from view `order`.
- [x] Support sorting.
- [x] Support grouping via view `groupBy`.
- [x] Support row expansion for grouped rows.
- [x] Support custom sorting for Base values.
- [x] Support custom grouping keys for Base values.
- [x] Add row limit support.
- [x] Add basic styling hooks/classes.

### Deliverables

- [x] `<BaseTable result={result} />`
- [x] Table example matching a simple `.base` file.
- [x] Sorting and grouping tests/examples.

---

## Milestone 9 — [x] Summaries and Aggregations

### Goal

Support built-in and custom table summaries.

### Tasks

Implement built-in summaries:

- [x] Average
- [x] Min
- [x] Max
- [x] Sum
- [x] Range
- [x] Median
- [x] Stddev
- [x] Earliest
- [x] Latest
- [x] Checked
- [x] Unchecked
- [x] Empty
- [x] Filled
- [x] Unique

Support custom summaries:

```yaml
summaries:
  customAverage: 'values.mean().round(3)'
```

Additional tasks:

- [x] Add `values` context for summary expressions.
- [x] Compute summaries over visible/filtered rows.
- [x] Compute group summaries.
- [x] Render summary footer rows.
- [x] Render group summary rows/cells.

### Deliverables

- [x] Summary calculations match expected fixtures.
- [x] Table view renders footer summaries.

---

## Milestone 10 — [x] React Components and Provider API

### Goal

Expose ergonomic React APIs.

### Tasks

- [x] Implement `<BaseProvider>`.
- [x] Implement `<BaseView>`.
- [x] Implement `<BaseTable>`.
- [x] Implement value renderers for:
  - [x] string
  - [x] number
  - [x] boolean
  - [x] date
  - [x] list
  - [x] link
  - [x] file
  - [x] image
  - [x] icon
  - [x] HTML
- [x] Add render override hooks/props.
- [x] Add diagnostic UI.

### Deliverables

- [x] Public React API usable in a Vite example.
- [x] Basic docs for usage.

---

## Milestone 11 — [x] List View

### Goal

Implement Bases-style list renderer.

### Tasks

- [x] Support list markers:
  - [x] bullets
  - [x] numbers
  - [x] none
- [x] Determine primary property.
- [x] Render selected properties.
- [x] Support indented properties.
- [x] Support inline separators.
- [x] Reuse core result rows.
- [x] Respect filters, formulas, and sorting where applicable.

### Deliverables

- [x] `<BaseList result={result} />`
- [x] List view demo and list option tests.

---

## Milestone 12 — [ ] Cards View (shell complete)

### Goal

Implement Bases-style cards renderer.

### Tasks

- [x] Render grid layout.
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
- [x] Render selected properties.
- [x] Add styling hooks/classes.

### Deliverables

- [x] `<BaseCards result={result} />`
- [ ] Cards demo with cover images/colors.

---

## Milestone 13 — [x] Filesystem Markdown Adapter

### Goal

Allow standalone demos and static-site usage from Markdown files.

### Tasks

- [x] Add `@bases-react/fs`.
- [x] Parse Markdown frontmatter.
- [x] Build `BaseFile` records.
- [x] Extract basic inline tags.
- [x] Extract basic wikilinks.
- [x] Add fixture vault for tests.
- [x] Add Vite demo loading sample vault data.

### Deliverables

- [x] `loadMarkdownFiles()` adapter.
- [x] Demo vault rendered through Base views.

---

## Milestone 14 — [ ] Toolbar and Interactive Controls

### Goal

Add basic UI controls similar to Bases.

### Tasks

- [x] View switcher.
- [x] Group-by control for table demo.
- [x] Search over displayed properties.
- [x] Sort menu.
- [x] Properties/columns menu.
- [x] Results count.
- [x] Limit control.
- [ ] Copy current view to clipboard.
- [ ] Export CSV.
- [ ] Basic filter display/editing.
- [x] Add document-database demo shell/component using only currently supported controls; no editing/New/unsupported actions.

### Deliverables

- [x] `<BaseToolbar />`
- [x] Interactive Vite demo with view switching, grouping, search, sorting, column visibility, and limit.
- [x] Cleaner project database demo based on `update-demo-plan.md`.

---

## Milestone 14.5 — [ ] View Definition State, Dirty Tracking, and Diff

### Goal

Track when interactive view changes diverge from the saved `.base` file definition, and expose that difference to users before any persistence happens.

### Tasks

- [x] Distinguish saved `.base` view definitions from current interactive view state.
- [x] Track dirty state for `.base`-backed settings:
  - [x] sorting
  - [x] grouping
  - [x] column order
  - [x] column visibility
  - [x] row limit
  - [ ] filters, once filter editing exists
- [x] Mark the source `.base` file/view as dirty when current state differs from the saved definition.
- [x] Generate a structured diff between saved view definition and current view state.
- [x] Show the diff when the user clicks the dirty `.base` indicator.
- [x] Provide a reset/revert-to-file action.
- [x] Provide optional save/apply callbacks while keeping persistence adapter-specific.
- [x] Add tests for dirty-state detection and view-state diff generation.

### Deliverables

- Dirty indicator for modified `.base` view state.
- Diff UI for current view state vs saved `.base` definition.
- Revert-to-saved behavior.
- Optional adapter callback for saving updated view definitions.

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

## Milestone 18 — [x] Compatibility Suite (lightweight)

### Goal

Track and improve compatibility with Obsidian Bases.

### Tasks

- [x] Create lightweight fixture `.base` coverage.
- [x] Create fixture Markdown vaults.
- [x] Add expected output assertions in tests.
- [x] Add compatibility docs.
- [x] Mark support status for each feature:
  - [x] supported
  - [x] partial
  - [x] unsupported
  - [x] planned
- [x] Add lightweight regression tests for representative supported syntax; full public-doc coverage deferred.

### Deliverables

- [x] `docs/compatibility.md`
- [x] Lightweight automated compatibility test suite.

---

## Milestone 19 — [x] Documentation and Examples (lightweight)

### Goal

Make the package usable by others.

### Tasks

- [x] Write getting-started docs.
- [x] Document core APIs.
- [x] Document React APIs.
- [x] Document data source adapters.
- [x] Document supported `.base` syntax.
- [x] Document custom renderers.
- [x] Document styling.
- [x] Document limitations.
- [x] Build alpha example:
  - [x] project tracker/database demo
  - [ ] reading list
  - [ ] CRM
  - [ ] travel map
  - [ ] gallery/cards

### Deliverables

- [x] Alpha README.
- [x] Docs folder.
- [x] One runnable alpha example; additional examples deferred.

---

## Milestone 20 — [x] Release Preparation

### Goal

Prepare for first public release.

### Tasks

- [x] Stabilize package names.
- [x] Stabilize public APIs for alpha.
- [x] Add changelog.
- [x] Add alpha versions and release checklist.
- [x] Add package READMEs.
- [x] Add license.
- [x] Add contribution guide.
- [x] Prepare alpha release metadata; public npm publish remains manual.

### Deliverables

- [x] `0.1.0-alpha.0` release metadata.
- [x] Public npm package metadata prepared.

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
- Should property type icons be inferred from values/property names, or explicitly defined in `.base` column metadata?
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

- The app runs with `pnpm install` and `pnpm dev:demo` from the workspace root, or `pnpm dev` from `examples/simple-react-app`.
- No Obsidian packages, vault layout, or metadata cache are required.
- All sample records are Markdown files under `data/projects/`.
- The Markdown records conform to OKF: frontmatter includes `type`, and should include `title`, `description`, `resource`, `tags`, and `timestamp`.
- The rendered table displays project rows and supports the initial columns/filter/sort from `projects.base`.
