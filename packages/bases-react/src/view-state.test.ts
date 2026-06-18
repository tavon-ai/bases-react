import { describe, expect, it } from 'vitest'
import { diffBaseViewState, type BaseViewState } from './index'
import type { BaseColumn } from '@bases-react/core'

const columns: BaseColumn[] = [
  { id: 'title', property: 'title', label: 'Title' },
  { id: 'status', property: 'status', label: 'Status' },
  { id: 'owner', property: 'owner', label: 'Owner' },
]

const saved: BaseViewState = {
  sort: [{ property: 'title', direction: 'asc' }],
  groupBy: [],
  columnOrder: ['title', 'status', 'owner'],
  visibleColumns: ['title', 'status', 'owner'],
  limit: null,
  filter: { property: 'status', operator: 'equals', value: 'Active' },
}

describe('diffBaseViewState', () => {
  it('returns no diff for matching saved and current view state', () => {
    expect(diffBaseViewState(saved, saved, columns)).toEqual([])
  })

  it('reports dirty saved-backed view settings with display labels', () => {
    const current: BaseViewState = {
      sort: [{ property: 'status', direction: 'desc' }],
      groupBy: ['owner'],
      columnOrder: ['owner', 'title', 'status'],
      visibleColumns: ['title', 'owner'],
      limit: 10,
      filter: null,
    }

    expect(diffBaseViewState(saved, current, columns)).toEqual([
      { key: 'sort', label: 'Sort', saved: 'Title asc', current: 'Status desc' },
      { key: 'groupBy', label: 'Group by', saved: 'No grouping', current: 'Owner' },
      {
        key: 'columnOrder',
        label: 'Column order',
        saved: 'Title, Status, Owner',
        current: 'Owner, Title, Status',
      },
      {
        key: 'visibleColumns',
        label: 'Visible columns',
        saved: 'Title, Status, Owner',
        current: 'Title, Owner',
      },
      { key: 'limit', label: 'Row limit', saved: 'All rows', current: '10' },
      { key: 'filter', label: 'Filter', saved: 'Status equals Active', current: 'No filter' },
    ])
  })
})
