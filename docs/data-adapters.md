# Data Adapters

## Filesystem Markdown adapter

`@bases-react/fs` provides standalone Markdown support for demos, tests, and static sites.

- `parseMarkdownFile(path, source)` parses one Markdown document.
- `loadMarkdownFiles(modules)` converts Vite-style raw module maps into `BaseFile[]`.
- `parseBaseFile(source)` is re-exported from core.

The adapter extracts YAML frontmatter, inline `#tags`, and basic `[[wikilinks]]`.

## Obsidian adapter

The Obsidian bridge is intentionally deferred. Future adapter packages should produce the same `BaseFile[]` data model and own persistence/watch behavior.
