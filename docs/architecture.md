# Architecture

`@bases-react/core` owns parsing, normalization, filtering, formula evaluation, sorting, grouping metadata, summaries, and row evaluation.

`@bases-react/tanstack` adapts evaluated columns and values to TanStack Table.

`@bases-react/react` renders table/list/card views and provides interactive client-side controls through `<BaseToolbar />`:

- view switching
- search over displayed values
- group-by selection for tables
- sort menu
- column visibility menu
- row limit
- CSV export

`@bases-react/fs` converts Markdown files with YAML frontmatter into normalized `BaseFile` records for standalone demos and static sites.
