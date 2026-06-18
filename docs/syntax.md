# Syntax

## Table with formulas, expression filters, grouping, sorting, and summaries

```yaml
summaries:
  averageProgress:
    property: progress
    type: average
formulas:
  health: 'if(progress >= 70, "Healthy", "At Risk")'
views:
  - name: Projects
    type: table
    filters: 'type == "Project" && progress >= 30'
    columns:
      - property: title
        label: Project
      - property: status
      - property: progress
      - property: formula.health
        label: Health
    groupBy: status
    sort:
      - property: progress
        direction: desc
```

Supported expression MVP:

- literals: strings, numbers, booleans, null
- paths: `title`, `note.title`, `file.name`, `formula.health`
- operators: `+`, `-`, `*`, `/`, `%`, `==`, `!=`, `>`, `<`, `>=`, `<=`, `!`, `&&`, `||`
- calls/methods: `if(...)`, `number(...)`, `date(...)`, `duration(...)`, `tags.contains("frontend")`, `progress.round()`
- date fields/methods: `date(timestamp).year`, `.month`, `.day`, `.hour`, `.minute`, `.second`, `.date()`, `.time()`, `.format("yyyy-MM-dd")`, `.relative()`
- duration/date arithmetic: `date(timestamp) + duration("14 days")`
- indexing: `tags[0]`, `meta["owner"]`

## List view options

```yaml
views:
  - name: Project list
    type: list
    marker: numbers # bullets, numbers, none also accepted through listMarker
    indentedProperties: [description, notes]
    columns: [title, status, owner, description, notes]
```

The first column is the primary value. Other columns render inline unless their property/id appears in `indentedProperties`.
