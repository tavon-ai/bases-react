# React API

## BaseView

```tsx
import { BaseView } from '@bases-react/react'
import '@bases-react/react/styles.css'
;<BaseView base={base} files={files} />
```

`BaseView` evaluates the selected `.base` view and renders table, list, or cards UI. The built-in toolbar supports view switching, search, grouping, sorting, column visibility, limits, simple filter editing, and dirty-state diffing for saved view settings.

## BaseProvider

Use `BaseProvider` to override value rendering by value kind.

```tsx
import { BaseProvider, BaseView } from '@bases-react/react'
;<BaseProvider
  renderers={{
    boolean: (value) => (value ? '✅' : '—'),
    link: (value) => <a href={String(value.path)}>{String(value.label ?? value.path)}</a>,
  }}
>
  <BaseView base={base} files={files} />
</BaseProvider>
```

Renderer keys: `string`, `number`, `boolean`, `date`, `list`, `link`, `file`, `image`, `icon`, `html`, and `object`.

## Styling

Import `@bases-react/react/styles.css` for the default alpha styles. Components expose stable `obr-*` class names such as `obr-shell`, `obr-table`, `obr-list`, `obr-card`, `obr-toolbar-actions`, and `obr-tags` for app-level overrides.

## List views

List views support `marker`/`listMarker` values `bullets`, `numbers`, and `none`, plus `indentedProperties` for secondary property rows.
