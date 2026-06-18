import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  evaluateBase,
  evaluateExpression,
  normalizeBase,
  parseBase,
  parseExpression,
} from './index'

const files = [
  {
    path: 'a.md',
    name: 'a.md',
    basename: 'a',
    folder: '',
    ext: 'md',
    tags: [],
    links: [],
    properties: { type: 'Project', title: 'A', status: 'Active', progress: 10, owner: 'Maya' },
  },
  {
    path: 'b.md',
    name: 'b.md',
    basename: 'b',
    folder: '',
    ext: 'md',
    tags: [],
    links: [],
    properties: { type: 'Note', title: 'B', status: 'Done', progress: 99, owner: 'Noor' },
  },
  {
    path: 'c.md',
    name: 'c.md',
    basename: 'c',
    folder: '',
    ext: 'md',
    tags: [],
    links: [],
    properties: { type: 'Project', title: 'C', status: 'Active', progress: 80, owner: 'Maya' },
  },
]

describe('base parser and normalization fixtures', () => {
  it('normalizes a valid .base fixture', () => {
    const source = readFileSync(
      new URL('../../../tests/fixtures/valid-projects.base', import.meta.url),
      'utf8',
    )
    const normalized = normalizeBase(parseBase(source))
    expect(normalized.diagnostics).toEqual([])
    expect(normalized.views[0].name).toBe('Table')
    expect(normalized.views[0].columns.map((column) => column.property)).toEqual([
      'title',
      'formula.health',
      'progress',
    ])
  })

  it('reports diagnostics for an invalid .base fixture', () => {
    const source = readFileSync(
      new URL('../../../tests/fixtures/invalid-missing-views.base', import.meta.url),
      'utf8',
    )
    const normalized = normalizeBase(parseBase(source))
    expect(normalized.diagnostics.some((diagnostic) => diagnostic.level === 'error')).toBe(true)
  })
})

describe('evaluateBase', () => {
  it('filters, projects columns, and sorts rows', () => {
    const base = parseBase(`
views:
  - name: Projects
    type: table
    filters:
      and:
        - property: type
          equals: Project
    columns:
      - property: title
      - property: progress
    sort:
      - property: progress
        direction: desc
`)
    const result = evaluateBase({ base, files, view: 'Projects' })
    expect(result.rows.map((row) => row.values.title)).toEqual(['C', 'A'])
    expect(result.columns.map((column) => column.property)).toEqual(['title', 'progress'])
  })

  it('supports groupBy overrides for table adapters', () => {
    const base = parseBase(`
views:
  - name: Projects
    type: table
    columns:
      - property: title
      - property: status
`)
    const result = evaluateBase({ base, files, view: 'Projects', groupBy: 'status' })
    expect(result.view.groupBy).toEqual(['status'])
    expect(result.rows.map((row) => row.groupKey)).toEqual(['Active', 'Active', 'Done'])
  })

  it('evaluates expressions, formulas, string filters, and summaries', () => {
    const base = parseBase(`
formulas:
  health: 'if(progress >= 70, "Healthy", "At Risk")'
summaries:
  averageProgress:
    property: progress
    type: average
  medianProgress:
    property: progress
    type: median
  rangeProgress:
    property: progress
    type: range
  customAverage:
    property: progress
    expression: 'values.mean().round()'
views:
  - name: Projects
    type: table
    filters: 'type == "Project" && progress >= 50'
    columns:
      - property: title
      - property: formula.health
      - property: progress
`)
    const result = evaluateBase({ base, files, view: 'Projects' })
    expect(result.rows.map((row) => row.values['formula.health'])).toEqual(['Healthy'])
    expect(result.summaries.averageProgress).toBe(80)
    expect(result.summaries.medianProgress).toBe(80)
    expect(result.summaries.rangeProgress).toBe(0)
    expect(result.summaries.customAverage).toBe(80)
  })
})

describe('filters', () => {
  it('supports and, or, not, and global plus view filter merging', () => {
    const base = parseBase(`
filters:
  property: type
  equals: Project
views:
  - name: Projects
    type: table
    filters:
      and:
        - or:
            - property: owner
              equals: Maya
            - property: owner
              equals: Noor
        - not:
            property: progress
            equals: 10
    columns:
      - property: title
      - property: owner
`)
    const result = evaluateBase({ base, files, view: 'Projects' })
    expect(result.rows.map((row) => row.values.title)).toEqual(['C'])
  })

  it('adds diagnostics for invalid filter structures', () => {
    const base = parseBase(`
views:
  - name: Projects
    type: table
    filters:
      property: type
    columns:
      - property: title
`)
    const result = evaluateBase({ base, files, view: 'Projects' })
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.message.includes('Invalid filter')),
    ).toBe(true)
  })
})

describe('expressions', () => {
  it('parses and evaluates arithmetic and comparison operators', () => {
    const file = files[0]
    expect(
      evaluateExpression(parseExpression('progress + 5 == 15 && owner == "Maya"'), { file }),
    ).toBe(true)
  })

  it('evaluates string functions by value type', () => {
    expect(
      evaluateExpression(parseExpression('title.lower().contains("a")'), { file: files[0] }),
    ).toBe(true)
    expect(
      evaluateExpression(parseExpression('owner.replace("May", "Sor")'), { file: files[0] }),
    ).toBe('Sora')
  })

  it('evaluates number functions by value type', () => {
    expect(evaluateExpression(parseExpression('(progress / 3).round()'), { file: files[0] })).toBe(
      3,
    )
    expect(evaluateExpression(parseExpression('number("42") + 1'), { file: files[0] })).toBe(43)
  })

  it('evaluates list functions by value type', () => {
    const file = {
      ...files[0],
      tags: ['search', 'frontend'],
      properties: { ...files[0].properties, tags: ['search', 'frontend', 'search'] },
    }
    expect(evaluateExpression(parseExpression('tags.contains("frontend")'), { file })).toBe(true)
    expect(evaluateExpression(parseExpression('tags.unique().join("|")'), { file })).toBe(
      'search|frontend',
    )
  })

  it('evaluates file helper functions', () => {
    const file = { ...files[0], folder: 'projects/demo', tags: ['search'], links: ['Target'] }
    expect(
      evaluateExpression(
        parseExpression(
          'file.hasTag("search") && file.inFolder("projects") && file.hasLink("Target")',
        ),
        { file },
      ),
    ).toBe(true)
  })

  it('supports date fields, date formatting, and date arithmetic', () => {
    const file = {
      ...files[0],
      properties: { ...files[0].properties, timestamp: new Date('2026-06-18T10:15:30Z') },
    }
    expect(evaluateExpression(parseExpression('date(timestamp).year'), { file })).toBe(2026)
    expect(
      evaluateExpression(parseExpression('date(timestamp).format("yyyy-MM-dd")'), { file }),
    ).toBe('2026-06-18')
    expect(
      evaluateExpression(parseExpression('(date(timestamp) + duration("2 days")).day'), { file }),
    ).toBe(20)
    expect(
      evaluateExpression(
        parseExpression('(date(timestamp) - date("2026-06-17T10:15:30Z")).humanize()'),
        { file },
      ),
    ).toBe('in 1 day')
  })

  it('supports link equality and list/object indexing', () => {
    const file = {
      ...files[0],
      properties: {
        ...files[0].properties,
        tags: ['search', 'frontend'],
        meta: { owner: 'Maya' },
      },
    }
    expect(evaluateExpression(parseExpression('tags[1] == "frontend"'), { file })).toBe(true)
    expect(evaluateExpression(parseExpression('meta["owner"] == "Maya"'), { file })).toBe(true)
    expect(evaluateExpression(parseExpression('link("Target") == "Target"'), { file })).toBe(true)
    expect(evaluateExpression(parseExpression('file.asLink() == link("a.md")'), { file })).toBe(
      true,
    )
  })
})
