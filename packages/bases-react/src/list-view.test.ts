import { describe, expect, it } from 'vitest'
import { buildBaseListModel } from './index'
import type { BaseEvaluationResult } from '@bases-react/core'

const result: BaseEvaluationResult = {
  base: {
    formulas: {},
    properties: {},
    summaries: {},
    views: [],
    diagnostics: [],
  },
  view: {
    name: 'List',
    type: 'list',
    columns: [
      { id: 'title', property: 'title', label: 'Title' },
      { id: 'status', property: 'status', label: 'Status' },
      { id: 'description', property: 'description', label: 'Description' },
      { id: 'owner', property: 'owner', label: 'Owner' },
    ],
    order: ['title', 'status', 'description', 'owner'],
    sort: [],
    listMarker: 'number',
    indentedProperties: ['description'],
  },
  rows: [],
  columns: [
    { id: 'title', property: 'title', label: 'Title' },
    { id: 'status', property: 'status', label: 'Status' },
    { id: 'description', property: 'description', label: 'Description' },
    { id: 'owner', property: 'owner', label: 'Owner' },
  ],
  summaries: {},
  groupSummaries: {},
  diagnostics: [],
}

describe('buildBaseListModel', () => {
  it('uses list marker and separates indented properties from inline properties', () => {
    expect(buildBaseListModel(result)).toMatchObject({
      marker: 'number',
      primaryColumn: { property: 'title' },
      inlineColumns: [{ property: 'status' }, { property: 'owner' }],
      indentedColumns: [{ property: 'description' }],
    })
  })

  it('defaults to bullet markers', () => {
    expect(
      buildBaseListModel({ ...result, view: { ...result.view, listMarker: undefined } }).marker,
    ).toBe('bullet')
  })
})
