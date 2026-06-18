import { useState } from 'react'
import { FileCode2, X } from 'lucide-react'
import { BaseView } from '@bases-react/react'
import { loadMarkdownFiles, parseBaseFile } from '@bases-react/fs'
import baseYaml from '../data/projects.base?raw'

const files = loadMarkdownFiles(
  import.meta.glob('../data/projects/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
)

const base = parseBaseFile(baseYaml)

export function App() {
  const [baseOpen, setBaseOpen] = useState(false)

  return (
    <main className="demo-page">
      <section className="hero">
        <p className="eyebrow">Standalone OKF project database</p>
        <div className="hero-title-row">
          <h1>Projects</h1>
          <button className="base-file-link" type="button" onClick={() => setBaseOpen(true)}>
            <FileCode2 aria-hidden="true" />
            Open projects.base
          </button>
        </div>
        <p>
          Review project concepts from local Markdown files. Switch views, search, filter, group,
          sort, hide properties, limit rows, and inspect the source base definition without any
          editing or persistence.
        </p>
      </section>
      <BaseView base={base} files={files} />
      {baseOpen && (
        <div
          className="base-file-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="projects.base"
        >
          <button
            className="base-file-backdrop"
            type="button"
            onClick={() => setBaseOpen(false)}
            aria-label="Close projects.base"
          />
          <section className="base-file-modal">
            <header>
              <div>
                <span>Source definition</span>
                <h2>projects.base</h2>
              </div>
              <button
                type="button"
                onClick={() => setBaseOpen(false)}
                aria-label="Close projects.base"
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <pre>{baseYaml}</pre>
          </section>
        </div>
      )}
    </main>
  )
}
