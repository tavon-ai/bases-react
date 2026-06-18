# Demo Update Plan — Document Database Interface

## Goal

Update the demo into a cleaner document-database experience using only features already supported by the current backend/core engine. No editing or persistence features for now.

The demo should remain project-based/OKF-based. It should feel like a lightweight database page with table/list/cards views, view controls, filter/group/sort/property controls, summary chips, and a clean page layout.

## Screenshot Observations

The provided screenshots show these key interaction and visual patterns:

- Large page title and short description above the database.
- View tabs with icons: Table, List, Cards.
- Selected view appears as a rounded pill.
- Right-aligned compact toolbar icons for supported controls such as filter/status, sort, search, settings/sliders, and export.
- Table view has clean property headers with type icons.
- Filter/group/sort state appears as compact pills below the main toolbar.
- Filter, sort, group, and property visibility open as individual compact popovers.
- Column/property options can open as a floating menu.
- List view is minimal: page icon + title rows, with properties floated/aligned to the right where useful.
- Cards view has large cards with optional cover area and title row.

## Non-Goals

- No editing cells/pages.
- No persistence.
- No full third-party database-app feature parity.
- No automations/AI/New-button visual affordances.
- No creating new records.
- Do not show controls/settings that are unsupported today.

## Supported Backend Features to Surface

Use existing support for:

- Multiple views: table, list, cards.
- Search over displayed properties.
- Sort property/direction.
- Group by selected property.
- Column visibility.
- Limit.
- CSV export is supported by earlier code paths but intentionally hidden from this demo UI.
- Formula columns.
- Date/duration formula values.
- Summary and group summary chips.
- Filters from `.base` definition.

## Open Features

- Interactive filtering currently supports only one filter criterion at a time. Multi-criteria filter editing remains open/planned.

## Implementation Milestones

### Milestone D1 — Demo Data and Page Framing

- [x] Keep the demo dataset project-based and OKF-compatible.
- [x] Keep records as project Markdown concepts with required `type`, `title`, `description`, `resource`, `tags`, and `timestamp` fields.
- [x] Enrich existing project records only if needed for better visual testing.
- [x] Keep page title project-oriented, e.g. `Projects`.
- [x] Use a short project database subtitle.
- [ ] Keep `.base` views named exactly:
  - [x] `Table`
  - [x] `List`
  - [x] `Cards`

### Milestone D2 — Document Database Shell

- [x] Restyle demo page to a clean white document canvas.
- [x] Remove card-like outer shell feel around the entire database.
- [ ] Add database header area:
  - [x] View tabs on the left.
  - [x] Compact toolbar actions for supported features on the right.
- [x] Use neutral typography, compact spacing, subtle borders.
- [x] Ensure the database stretches full width like the screenshots.
- [x] Keep responsive behavior acceptable for narrower screens.

### Milestone D3 — View Tabs and Toolbar

- [x] Convert current dropdown view switcher into visible tabs.
- [ ] Add icons for view types:
  - [x] Table icon.
  - [x] List icon.
  - [x] Cards/grid icon.
- [x] Keep current selected view visually highlighted.
- [ ] Move controls into a compact database toolbar:
  - [x] Filter/status chip or button for existing base filters.
  - [x] Sort icon/button.
  - [x] Group/settings icon/button.
  - [x] Search button/input.
  - [x] Settings/sliders button.
  - [ ] Secondary CSV export entry. Hidden from this demo by request.
- [x] Do not render a `New` button.
- [x] Hide export CSV from the demo by request.

### Milestone D4 — Filter/Sort/Group Chips Row

- [x] Add a compact chips row under toolbar when controls are active.
- [x] Display active search chip.
- [x] Display active group chip.
- [x] Display active sort chip.
- [x] Display active limit chip.
- [x] Display base filter summary chip if possible.
- [x] Chips should be visual/status controls only unless easy to wire existing state.

### Milestone D5 — Individual Control Popovers

- [x] Use individual compact popovers instead of one combined settings sidebar.
- [x] Filter popover includes supported filter fields and clear action.
- [x] Sort popover includes property and direction.
- [x] Group popover includes group property selection.
- [x] Property visibility has a separate floating menu.
- [x] Omit unsupported rows entirely.
- [x] Clearly avoid edit/persistence behavior.

### Milestone D6 — Property Menu / Column Controls

- [x] Replace current `details` column menu with a compact floating menu.
- [x] Show property name/search-like field if appropriate.
- [x] Show property visibility toggles.
- [x] Move supported actions to individual filter/sort/group popovers.
- [x] Show calculate/summary indicator.
- [x] Unsupported actions should be hidden.

### Milestone D7 — Table View Polish

- [x] Add property type icons in headers:
  - [x] Text/title.
  - [x] Multi-select/tags.
  - [x] Date.
  - [x] Number.
  - [x] URL/link.
  - [x] Formula.
- [x] Render title/name cells with a page icon.
- [x] Render tags as colored pills.
- [x] Render URLs as truncated underlined links.
- [x] Render date fields in a readable long-ish format.
- [x] Keep row hover subtle.
- [x] Keep grouped rows collapsible.
- [x] Keep summary/footer chips but visually quieter.
- [x] Do not add a `+ New page` row.

### Milestone D8 — List View Polish

- [x] Render list rows as document pages with page icon and title.
- [x] Display selected secondary properties to the right or inline as muted metadata/pills.
- [x] Do not add a `+ New page` row.
- [x] Keep search/sort/filter/limit controls working.

### Milestone D9 — Cards View Polish

- [x] Keep the view named `Cards`.
- [ ] Render cards with:
  - [x] cover/preview area.
  - [x] title row with page icon.
  - [x] selected properties below title.
- [x] Do not add a `+ New page` card.
- [x] Keep search/sort/filter/limit controls working.

### Milestone D10 — Manual Test Checklist

- [x] Switch between Table, List, Cards tabs.
- [x] Search by project title/owner/tag.
- [x] Sort by project title, progress, dates, and other visible properties.
- [x] Group by status/owner/priority and other visible properties.
- [x] Hide/show columns through settings/property visibility.
- [x] Set a row limit.
- [ ] Export CSV. Hidden from this demo by request.
- [x] Collapse/expand grouped table rows.
- [x] Verify formula/date fields still render.
- [x] Verify no editing or creation affordance is shown.

## Decisions

- Do not mention or brand against any third-party product in docs, UI, or code comments.
- Keep demo data as OKF projects.
- Do not show `New`, creation, editing, automations, AI, or other unsupported controls.
- Put reusable controls/styles in `@bases-react/react`; keep page title/subtitle and project data in the demo app.
- Keep `Cards` as the cards view name.
- Filters should be editable in the demo where the backend already supports the filter operation.

## Deferred Questions

- For property type icons, should we infer types from current values, or add explicit metadata to `.base` columns?
