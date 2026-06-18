# Compatibility

This project supports a Bases-compatible subset for the first alpha. Compatibility is tracked with lightweight fixtures in `tests/compatibility.test.ts` and focused package tests.

## Feature status

| Area                  | Status           | Notes                                                                                 |
| --------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| `.base` YAML views    | Supported        | Multiple named views.                                                                 |
| Table view            | Supported        | Columns, sorting, grouping, limits, summaries.                                        |
| List view             | Supported        | Primary property, inline properties, markers, indented properties.                    |
| Cards view            | Partial          | Grid shell and selected properties; image/cover options deferred.                     |
| Map view              | Planned          | Deferred.                                                                             |
| Object filters        | Supported        | `and`, `or`, `not`, `equals`, `notEquals`, `contains`.                                |
| Expression filters    | Supported subset | Arithmetic, comparisons, boolean operators, parentheses.                              |
| Formulas              | Supported subset | Dependency sorting, row evaluation, cycle diagnostics.                                |
| Functions/methods     | Supported subset | Common string, list, number, date, file helpers.                                      |
| Dates/durations/links | Partial          | Normalized JS dates and duration/link semantics; full Obsidian quirks not guaranteed. |
| Summaries             | Supported subset | Built-ins and custom expressions over visible rows.                                   |
| Toolbar controls      | Partial          | View switch, group, search, sort, properties, limit, dirty diff.                      |
| Editing               | Planned          | Deferred.                                                                             |
| Obsidian bridge       | Planned          | Deferred.                                                                             |

## Known gaps

- Full Obsidian Bases syntax compatibility.
- Advanced Moment-compatible date formatting and duration quirks.
- Multi-filter editing UI.
- Card cover/image polish.
- Real Obsidian vault/plugin integration.
