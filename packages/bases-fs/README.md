# @bases-react/fs

Standalone Markdown/frontmatter adapter.

## APIs

- `parseMarkdownFile(path, source)` parses a Markdown file into `BaseFile`.
- `loadMarkdownFiles(modules)` converts Vite-style raw module maps to `BaseFile[]`.
- `parseBaseFile(source)` parses `.base` YAML via core.

Extracts YAML frontmatter, inline `#tags`, and basic `[[wikilinks]]`.
