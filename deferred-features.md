# Deferred / Later Features

Features and work intentionally deferred from the next implementation pass.

## Milestone 12 — Cards View Completion

- Card size options.
- Image property support.
- Image values:
  - local attachment links
  - URLs
  - hex colors
- Image fit options:
  - cover
  - contain
- Image aspect ratio support.
- Cards demo with cover images/colors.

## Milestone 14 — Toolbar and Interactive Controls

- Copy current view to clipboard.
- Export CSV follow-up, if not already fully implemented.
- Basic filter display/editing UI.

## Milestone 14.5 — Filter Dirty Tracking

- Dirty tracking for filters once filter editing exists.

## Milestone 15 — Editing Support

- Update APIs.
- Editing primitive note properties.
- Checkbox editing.
- Text/number/date editing.
- Patch/update events.
- Adapter-owned persistence.
- Optimistic updates.
- Editable table cells in the demo.

## Milestone 16 — Map View

- Map library selection.
- Coordinates property support.
- Coordinates as strings: `"lat, lng"`.
- Coordinates as lists: `[lat, lng]`.
- Formula-derived coordinates.
- Marker icon property.
- Marker color property.
- Tile URL support.
- Center and zoom options.
- Marker popup/preview.
- `<BaseMap />`.
- Map demo.

## Milestone 17 — Obsidian Bridge

- `@scope/bases-obsidian` package.
- Obsidian `App` to `BaseFile[]` adapter.
- Metadata cache integration for:
  - frontmatter
  - tags
  - links
  - embeds
- Vault integration for:
  - files
  - stats
  - paths
- Vault change watchers.
- Metadata change watchers.
- Context modes:
  - base file
  - embedding file
  - active file
- Obsidian plugin demo.

## Milestone 19 — Expanded Documentation and Examples

- Full docs site.
- Custom renderer docs.
- Exhaustive styling docs.
- CRM example.
- Travel map example.
- Gallery/cards example.
- Additional examples beyond lightweight alpha docs.
