import { describe, expect, it } from 'vitest'
import { evaluateBase, parseBase, type BaseFile } from '../packages/bases-core/src/index'

const files: BaseFile[] = [
  {
    path: 'projects/alpha.md',
    name: 'alpha.md',
    basename: 'alpha',
    folder: 'projects',
    ext: 'md',
    tags: ['project', 'frontend'],
    links: ['projects/beta.md'],
    properties: {
      type: 'Project',
      title: 'Alpha',
      status: 'Active',
      owner: 'Maya',
      progress: 75,
    },
  },
  {
    path: 'projects/beta.md',
    name: 'beta.md',
    basename: 'beta',
    folder: 'projects',
    ext: 'md',
    tags: ['project', 'backend'],
    links: [],
    properties: {
      type: 'Project',
      title: 'Beta',
      status: 'Paused',
      owner: 'Noor',
      progress: 20,
    },
  },
]

const baseYaml = `
properties:
  title:
    label: Project
formulas:
  complete: progress >= 50
summaries:
  progress:
    property: progress
    type: average
views:
  - name: Active table
    type: table
    filters:
      and:
        - property: type
          equals: Project
        - 'status == "Active"'
    columns:
      - property: title
        label: Project
      - property: owner
      - property: progress
      - property: formula.complete
        label: Complete
    sort:
      - property: progress
        direction: desc
  - name: Project list
    type: list
    marker: numbers
    indentedProperties: [owner]
    columns: [title, status, owner]
`

describe('lightweight Bases compatibility suite', () => {
  it('parses a .base file and evaluates filters, formulas, sorting, and summaries', () => {
    const result = evaluateBase({ base: parseBase(baseYaml), files, view: 'Active table' })

    expect(result.diagnostics).toEqual([])
    expect(result.rows.map((row) => row.values.title)).toEqual(['Alpha'])
    expect(result.rows[0].values['formula.complete']).toBe(true)
    expect(result.summaries.progress).toBe(75)
    expect(result.columns.map((column) => column.label)).toEqual([
      'Project',
      'Owner',
      'Progress',
      'Complete',
    ])
  })

  it('normalizes lightweight list-view compatibility options', () => {
    const result = evaluateBase({ base: baseYaml, files, view: 'Project list' })

    expect(result.view.listMarker).toBe('number')
    expect(result.view.indentedProperties).toEqual(['owner'])
    expect(result.rows).toHaveLength(2)
  })
})
