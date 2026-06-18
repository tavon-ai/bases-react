# Getting Started

Install the workspace packages or consume the published alpha packages when available:

```bash
pnpm add @bases-react/core @bases-react/react @bases-react/fs @bases-react/tanstack
```

Import the React stylesheet once:

```ts
import '@bases-react/react/styles.css'
```

Render a `.base` definition against normalized files:

```tsx
import { BaseView } from '@bases-react/react'
import { loadMarkdownFiles, parseBaseFile } from '@bases-react/fs'
import baseYaml from './projects.base?raw'

const files = loadMarkdownFiles(import.meta.glob('./projects/*.md', { as: 'raw', eager: true }))
const base = parseBaseFile(baseYaml)

export function App() {
  return <BaseView base={base} files={files} view="Projects" />
}
```

Run the included demo from the repository root:

```bash
pnpm install
pnpm dev:demo
```
