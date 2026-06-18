import type { ColumnDef, SortingFn } from '@tanstack/react-table'
import type { BaseEvaluationResult, BaseRow, BaseValue } from '@bases-react/core'

export function createBaseColumnDefs(result: BaseEvaluationResult): ColumnDef<BaseRow>[] {
  return result.columns.map((column) => ({
    id: column.id,
    header: column.label,
    accessorFn: (row) => row.values[column.property],
    cell: (info) => info.getValue(),
    sortingFn: baseValueSortingFn,
  }))
}

export const baseValueSortingFn: SortingFn<BaseRow> = (rowA, rowB, columnId) => {
  const groupCompare = String(rowA.original.groupKey ?? '').localeCompare(
    String(rowB.original.groupKey ?? ''),
    undefined,
    { numeric: true, sensitivity: 'base' },
  )
  return groupCompare || compareBaseValues(rowA.getValue(columnId), rowB.getValue(columnId))
}

export function compareBaseValues(a: BaseValue, b: BaseValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return displayValue(a).localeCompare(displayValue(b), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

export function displayValue(value: BaseValue): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toLocaleDateString()
  if (Array.isArray(value)) return value.map(displayValue).join(', ')
  if (typeof value === 'object') {
    if (value.type === 'duration' && typeof value.ms === 'number') return humanizeDuration(value.ms)
    if (typeof value.label === 'string') return value.label
    if (typeof value.path === 'string') return value.path
    if (typeof value.src === 'string') return value.src
    if (typeof value.name === 'string') return value.name
    return JSON.stringify(value)
  }
  return String(value)
}

function humanizeDuration(ms: number): string {
  const abs = Math.abs(ms)
  const units: Array<[string, number]> = [
    ['year', 365 * 24 * 60 * 60 * 1000],
    ['month', 30 * 24 * 60 * 60 * 1000],
    ['week', 7 * 24 * 60 * 60 * 1000],
    ['day', 24 * 60 * 60 * 1000],
    ['hour', 60 * 60 * 1000],
    ['minute', 60 * 1000],
    ['second', 1000],
  ]
  const [unit, size] = units.find(([, size]) => abs >= size) ?? ['millisecond', 1]
  const count = Math.round(abs / size)
  return `${ms < 0 ? '-' : ''}${count} ${unit}${count === 1 ? '' : 's'}`
}
