import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadMarkdownFiles, parseMarkdownFile } from './index'

const fixtureRoot = join(process.cwd(), 'tests/fixtures/vault/projects')

describe('@bases-react/fs fixture vault', () => {
  it('parses frontmatter, inline tags, and wikilinks from fixture markdown', () => {
    const source = readFileSync(join(fixtureRoot, 'alpha.md'), 'utf8')
    const file = parseMarkdownFile('tests/fixtures/vault/projects/alpha.md', source)

    expect(file).toMatchObject({
      path: 'tests/fixtures/vault/projects/alpha.md',
      name: 'alpha.md',
      basename: 'alpha',
      folder: 'tests/fixtures/vault/projects',
      ext: 'md',
      properties: {
        type: 'Project',
        title: 'Alpha',
        status: 'Active',
        progress: 75,
      },
    })
    expect(file.tags).toEqual(['project', 'alpha', 'frontend'])
    expect(file.links).toEqual(['Beta'])
  })

  it('does not throw on duplicate frontmatter keys', () => {
    const file = parseMarkdownFile(
      'people/contact.md',
      [
        '---',
        'tags:',
        '  - original',
        'tags:',
        '  - duplicate',
        'status: active',
        '---',
        '#inline',
      ].join('\n'),
    )

    expect(file.properties).toMatchObject({ tags: ['duplicate'], status: 'active' })
    expect(file.tags).toEqual(['duplicate', 'inline'])
  })

  it('does not throw on malformed frontmatter', () => {
    const file = parseMarkdownFile(
      'people/broken.md',
      ['---', 'tags: [broken', '---', 'Body with #fallback'].join('\n'),
    )

    expect(file.properties).toEqual({})
    expect(file.tags).toEqual(['fallback'])
  })

  it('loads a small vault through import-like modules', () => {
    const files = loadMarkdownFiles({
      '../vault/projects/alpha.md': readFileSync(join(fixtureRoot, 'alpha.md'), 'utf8'),
      '../vault/projects/beta.md': { default: readFileSync(join(fixtureRoot, 'beta.md'), 'utf8') },
    })

    expect(files.map((file) => file.basename)).toEqual(['alpha', 'beta'])
    expect(files[1].tags).toEqual(['project', 'backend'])
    expect(files[1].links).toEqual(['Alpha'])
  })
})
