import React from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  ChevronRight,
  Circle,
  FileText,
  Filter,
  GripVertical,
  Hash,
  LayoutGrid,
  Link2,
  List,
  Search,
  Sigma,
  SlidersHorizontal,
  Table2,
  Tags,
  Type,
  type LucideIcon,
} from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import {
  evaluateBase,
  type BaseColumn,
  type BaseEvaluationResult,
  type BaseFile,
  type BaseListMarker,
  type BaseRow,
  type BaseValue,
  type NormalizedBaseDefinition,
  type RawBaseDefinition,
} from '@bases-react/core'
import { createBaseColumnDefs, displayValue } from '@bases-react/tanstack'

export type BaseViewProps = {
  base: string | RawBaseDefinition | NormalizedBaseDefinition
  files: BaseFile[]
  view?: string
  onSaveViewState?: (viewName: string, state: BaseViewState) => void
  onViewStateChange?: (viewName: string, state: BaseViewState, diff: BaseViewStateDiff[]) => void
}

type SortDirection = 'asc' | 'desc'
type FilterOperator = 'contains' | 'equals' | 'notEquals'

type InteractiveFilter = {
  property: string
  operator: FilterOperator
  value: string
}

export type BaseViewState = {
  sort: Array<{ property: string; direction: SortDirection }>
  groupBy: string[]
  columnOrder: string[]
  visibleColumns: string[]
  limit: number | null
  filter: InteractiveFilter | null
}

export type BaseViewStateDiff = {
  key: keyof BaseViewState
  label: string
  saved: string
  current: string
}

export type BaseValueRenderer = (value: BaseValue) => React.ReactNode
export type BaseRenderers = Partial<
  Record<
    | 'string'
    | 'number'
    | 'boolean'
    | 'date'
    | 'list'
    | 'link'
    | 'file'
    | 'image'
    | 'icon'
    | 'html'
    | 'object',
    BaseValueRenderer
  >
>

type BaseProviderOptions = { renderers?: BaseRenderers }
const BaseReactContext = React.createContext<BaseProviderOptions>({})

export function BaseProvider({
  children,
  renderers,
}: React.PropsWithChildren<BaseProviderOptions>) {
  return <BaseReactContext.Provider value={{ renderers }}>{children}</BaseReactContext.Provider>
}

function useBaseOptions() {
  return React.useContext(BaseReactContext)
}

export function BaseView({ base, files, view, onSaveViewState, onViewStateChange }: BaseViewProps) {
  const initial = React.useMemo(() => evaluateBase({ base, files, view }), [base, files, view])
  const [selectedView, setSelectedView] = React.useState(view ?? initial.view.name)
  const [selectedGroupBy, setSelectedGroupBy] = React.useState(initial.view.groupBy?.[0] ?? '')
  const [search, setSearch] = React.useState('')
  const [sortProperty, setSortProperty] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc')
  const [limit, setLimit] = React.useState('')
  const [filter, setFilter] = React.useState<InteractiveFilter>(() =>
    filterFromDefinition(initial.view.filters, initial.columns[0]?.property ?? ''),
  )
  const [visibleColumnIds, setVisibleColumnIds] = React.useState<string[]>(
    initial.columns.map((column) => column.id),
  )
  const [columnOrderIds, setColumnOrderIds] = React.useState<string[]>(
    initial.columns.map((column) => column.id),
  )

  React.useEffect(() => setSelectedView(view ?? initial.view.name), [view, initial.view.name])
  React.useEffect(() => {
    const nextResult = evaluateBase({ base, files, view: selectedView })
    setSelectedGroupBy(nextResult.view.groupBy?.[0] ?? '')
    setSortProperty(null)
    setSearch('')
    setLimit('')
    setFilter(filterFromDefinition(nextResult.view.filters, nextResult.columns[0]?.property ?? ''))
    setVisibleColumnIds(nextResult.columns.map((column) => column.id))
    setColumnOrderIds(nextResult.columns.map((column) => column.id))
  }, [base, files, selectedView])

  const evaluatedResult = React.useMemo(
    () => evaluateBase({ base, files, view: selectedView, groupBy: selectedGroupBy }),
    [base, files, selectedView, selectedGroupBy],
  )
  const savedView = React.useMemo(
    () =>
      evaluatedResult.base.views.find((candidate) => candidate.name === selectedView) ??
      evaluatedResult.view,
    [evaluatedResult.base.views, evaluatedResult.view, selectedView],
  )
  const currentViewState = React.useMemo(
    () =>
      interactiveViewState(savedView, evaluatedResult.columns, {
        sortProperty,
        sortDirection,
        selectedGroupBy,
        limit,
        visibleColumnIds,
        columnOrderIds,
        filter,
      }),
    [
      savedView,
      evaluatedResult.columns,
      sortProperty,
      sortDirection,
      selectedGroupBy,
      limit,
      visibleColumnIds,
      columnOrderIds,
      filter,
    ],
  )
  const savedViewState = React.useMemo(
    () => viewStateFromDefinition(savedView, evaluatedResult.columns),
    [savedView, evaluatedResult.columns],
  )
  const savedSort = savedView.sort[0]
  const displayedSortProperty = sortProperty !== null ? sortProperty : savedSort?.property || ''
  const displayedSortDirection =
    sortProperty !== null ? sortDirection : (savedSort?.direction ?? sortDirection)
  const viewStateDiff = React.useMemo(
    () => diffBaseViewState(savedViewState, currentViewState, evaluatedResult.columns),
    [savedViewState, currentViewState, evaluatedResult.columns],
  )
  React.useEffect(() => {
    onViewStateChange?.(selectedView, currentViewState, viewStateDiff)
  }, [onViewStateChange, selectedView, currentViewState, viewStateDiff])
  const interactiveEvaluationResult = React.useMemo(() => {
    const canEditViewFilter = isSingleEditableFilter(evaluatedResult.view.filters)
    if (sortProperty === null && !canEditViewFilter) return evaluatedResult
    return evaluateBase({
      base: {
        ...evaluatedResult.base,
        views: evaluatedResult.base.views.map((candidate) =>
          candidate.name === selectedView
            ? {
                ...candidate,
                ...(sortProperty === null ? {} : { sort: [] }),
                ...(canEditViewFilter ? { filters: undefined } : {}),
              }
            : candidate,
        ),
      },
      files,
      view: selectedView,
      groupBy: selectedGroupBy,
    })
  }, [evaluatedResult, files, selectedGroupBy, selectedView, sortProperty])
  const result = React.useMemo(
    () =>
      applyInteractiveState(interactiveEvaluationResult, {
        search,
        sortProperty,
        sortDirection,
        limit,
        visibleColumnIds,
        columnOrderIds,
        filter,
      }),
    [
      interactiveEvaluationResult,
      search,
      sortProperty,
      sortDirection,
      limit,
      visibleColumnIds,
      columnOrderIds,
      filter,
    ],
  )
  const body =
    result.view.type === 'cards' ? (
      <BaseCards result={result} embedded />
    ) : result.view.type === 'list' ? (
      <BaseList result={result} embedded />
    ) : (
      <BaseTable result={result} embedded />
    )

  return (
    <section className="obr-shell" aria-label={`${result.view.name} base view`}>
      <BaseToolbar
        result={result}
        allColumns={evaluatedResult.columns}
        selectedView={selectedView}
        onSelectedViewChange={view ? undefined : setSelectedView}
        selectedGroupBy={selectedGroupBy}
        onSelectedGroupByChange={result.view.type === 'table' ? setSelectedGroupBy : undefined}
        search={search}
        onSearchChange={setSearch}
        sortProperty={displayedSortProperty}
        onSortPropertyChange={setSortProperty}
        sortDirection={displayedSortDirection}
        onSortDirectionChange={(direction) => {
          if (sortProperty === null && savedSort?.property) setSortProperty(savedSort.property)
          setSortDirection(direction)
        }}
        limit={limit}
        onLimitChange={setLimit}
        visibleColumnIds={visibleColumnIds}
        onVisibleColumnIdsChange={setVisibleColumnIds}
        columnOrderIds={columnOrderIds}
        onColumnOrderIdsChange={setColumnOrderIds}
        filter={filter}
        onFilterChange={setFilter}
        viewStateDiff={viewStateDiff}
        onResetViewState={() => {
          setSelectedGroupBy(savedView.groupBy?.[0] ?? '')
          setSortProperty(null)
          setSortDirection('asc')
          setLimit('')
          setFilter(
            filterFromDefinition(savedView.filters, evaluatedResult.columns[0]?.property ?? ''),
          )
          setVisibleColumnIds(evaluatedResult.columns.map((column) => column.id))
          setColumnOrderIds(evaluatedResult.columns.map((column) => column.id))
        }}
        onSaveViewState={
          onSaveViewState ? () => onSaveViewState(selectedView, currentViewState) : undefined
        }
      />
      {result.diagnostics.length > 0 && <DiagnosticList diagnostics={result.diagnostics} />}
      {body}
    </section>
  )
}

export function viewStateFromDefinition(
  view: Pick<BaseEvaluationResult['view'], 'sort' | 'groupBy' | 'columns' | 'limit' | 'filters'>,
  columns: BaseColumn[] = view.columns,
): BaseViewState {
  return {
    sort: view.sort.map((sort) => ({ ...sort })),
    groupBy: [...(view.groupBy ?? [])],
    columnOrder: columns.map((column) => column.id),
    visibleColumns: columns.map((column) => column.id),
    limit: typeof view.limit === 'number' ? view.limit : null,
    filter: normalizeStateFilter(parseEditableFilter(view.filters)),
  }
}

function orderedColumnIds(columns: BaseColumn[], ids: string[]): string[] {
  const knownIds = new Set(columns.map((column) => column.id))
  const ordered = ids.filter((id) => knownIds.has(id))
  const missing = columns.map((column) => column.id).filter((id) => !ordered.includes(id))
  return [...ordered, ...missing]
}

function reorderColumnIds(
  columns: BaseColumn[],
  currentIds: string[],
  draggedId: string,
  targetId: string,
  position: 'before' | 'after' = 'before',
): string[] {
  const next = orderedColumnIds(columns, currentIds)
  const from = next.indexOf(draggedId)
  const targetIndex = next.indexOf(targetId)
  if (from < 0 || targetIndex < 0 || draggedId === targetId) return next
  const [moved] = next.splice(from, 1)
  const adjustedTargetIndex = next.indexOf(targetId)
  next.splice(position === 'after' ? adjustedTargetIndex + 1 : adjustedTargetIndex, 0, moved)
  return next
}

function interactiveViewState(
  savedView: BaseEvaluationResult['view'],
  columns: BaseColumn[],
  state: {
    sortProperty: string | null
    sortDirection: SortDirection
    selectedGroupBy: string
    limit: string
    visibleColumnIds: string[]
    columnOrderIds: string[]
    filter: InteractiveFilter
  },
): BaseViewState {
  const parsedLimit = Number(state.limit)
  return {
    sort:
      state.sortProperty === null
        ? savedView.sort.map((sort) => ({ ...sort }))
        : state.sortProperty
          ? [{ property: state.sortProperty, direction: state.sortDirection }]
          : [],
    groupBy: state.selectedGroupBy ? [state.selectedGroupBy] : [],
    columnOrder: orderedColumnIds(columns, state.columnOrderIds),
    visibleColumns: state.visibleColumnIds,
    limit:
      state.limit.trim() && Number.isFinite(parsedLimit) && parsedLimit > 0
        ? parsedLimit
        : typeof savedView.limit === 'number'
          ? savedView.limit
          : null,
    filter: normalizeStateFilter(state.filter),
  }
}

export function diffBaseViewState(
  saved: BaseViewState,
  current: BaseViewState,
  columns: BaseColumn[] = [],
): BaseViewStateDiff[] {
  const labels = new Map(columns.map((column) => [column.id, column.label]))
  const propertyLabel = (property: string) =>
    columns.find((column) => column.property === property || column.id === property)?.label ??
    property
  const columnList = (ids: string[]) => ids.map((id) => labels.get(id) ?? id).join(', ') || 'None'
  const sortList = (sorts: BaseViewState['sort']) =>
    sorts.map((sort) => `${propertyLabel(sort.property)} ${sort.direction}`).join(', ') || 'No sort'
  const groupList = (groups: string[]) => groups.map(propertyLabel).join(', ') || 'No grouping'
  const numberValue = (value: number | null) => (value == null ? 'All rows' : String(value))
  const filterValue = (filter: InteractiveFilter | null) =>
    filter ? `${propertyLabel(filter.property)} ${filter.operator} ${filter.value}` : 'No filter'
  const diffs: BaseViewStateDiff[] = []
  const push = (
    key: keyof BaseViewState,
    label: string,
    savedValue: string,
    currentValue: string,
  ) => {
    if (savedValue !== currentValue)
      diffs.push({ key, label, saved: savedValue, current: currentValue })
  }
  push('sort', 'Sort', sortList(saved.sort), sortList(current.sort))
  push('groupBy', 'Group by', groupList(saved.groupBy), groupList(current.groupBy))
  push(
    'columnOrder',
    'Column order',
    columnList(saved.columnOrder),
    columnList(current.columnOrder),
  )
  push(
    'visibleColumns',
    'Visible columns',
    columnList(saved.visibleColumns),
    columnList(current.visibleColumns),
  )
  push('limit', 'Row limit', numberValue(saved.limit), numberValue(current.limit))
  push('filter', 'Filter', filterValue(saved.filter), filterValue(current.filter))
  return diffs
}

function applyInteractiveState(
  result: BaseEvaluationResult,
  state: {
    search: string
    sortProperty: string | null
    sortDirection: SortDirection
    limit: string
    visibleColumnIds: string[]
    columnOrderIds: string[]
    filter: InteractiveFilter
  },
): BaseEvaluationResult {
  const search = state.search.trim().toLowerCase()
  let rows = result.rows
  if (search) {
    rows = rows.filter((row) =>
      result.columns.some((column) =>
        displayValue(row.values[column.property]).toLowerCase().includes(search),
      ),
    )
  }
  if (state.filter.value.trim() && state.filter.property) {
    rows = rows.filter((row) => matchesInteractiveFilter(row, state.filter))
  }
  const interactiveSortProperty = state.sortProperty
  if (interactiveSortProperty) {
    const sortProperty = interactiveSortProperty
    rows = [...rows].sort((a, b) => {
      const groupCompare = String(a.groupKey ?? '').localeCompare(
        String(b.groupKey ?? ''),
        undefined,
        { numeric: true, sensitivity: 'base' },
      )
      const valueCompare = compareRowValue(a, b, sortProperty)
      return groupCompare || (state.sortDirection === 'desc' ? -valueCompare : valueCompare)
    })
  }
  const parsedLimit = Number(state.limit)
  if (Number.isFinite(parsedLimit) && parsedLimit > 0) rows = rows.slice(0, parsedLimit)
  const visibleSet = new Set(state.visibleColumnIds)
  const order = orderedColumnIds(result.columns, state.columnOrderIds)
  const orderRank = new Map(order.map((id, index) => [id, index]))
  const columns = result.columns
    .filter((column) => visibleSet.has(column.id))
    .sort((a, b) => (orderRank.get(a.id) ?? 0) - (orderRank.get(b.id) ?? 0))
  return interactiveSortProperty
    ? {
        ...result,
        view: {
          ...result.view,
          sort: [{ property: interactiveSortProperty, direction: state.sortDirection }],
        },
        rows,
        columns,
      }
    : { ...result, rows, columns }
}

function matchesInteractiveFilter(row: BaseRow, filter: InteractiveFilter) {
  const actual = displayValue(row.values[filter.property]).toLowerCase()
  const expected = filter.value.trim().toLowerCase()
  if (filter.operator === 'equals') return actual === expected
  if (filter.operator === 'notEquals') return actual !== expected
  return actual.includes(expected)
}

function compareRowValue(a: BaseRow, b: BaseRow, property: string) {
  const av = a.values[property]
  const bv = b.values[property]
  if (typeof av === 'number' && typeof bv === 'number') return av - bv
  return displayValue(av).localeCompare(displayValue(bv), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

function filterFromDefinition(filter: unknown, fallbackProperty: string): InteractiveFilter {
  return parseEditableFilter(filter) ?? blankFilter(fallbackProperty)
}

function blankFilter(property: string): InteractiveFilter {
  return { property, operator: 'contains', value: '' }
}

function normalizeStateFilter(filter: InteractiveFilter | undefined): InteractiveFilter | null {
  if (!filter?.property || !filter.value.trim()) return null
  return { ...filter, value: filter.value.trim() }
}

function isSingleEditableFilter(filter: unknown): boolean {
  return parseEditableFilter(filter) !== undefined
}

function parseEditableFilter(filter: unknown): InteractiveFilter | undefined {
  if (!filter) return undefined
  if (typeof filter === 'string') return parseExpressionFilter(filter)
  if (!isPlainObject(filter) || typeof filter.property !== 'string') return undefined
  if ('equals' in filter)
    return { property: filter.property, operator: 'equals', value: String(filter.equals ?? '') }
  if ('notEquals' in filter)
    return {
      property: filter.property,
      operator: 'notEquals',
      value: String(filter.notEquals ?? ''),
    }
  if ('contains' in filter)
    return { property: filter.property, operator: 'contains', value: String(filter.contains ?? '') }
  return undefined
}

function parseExpressionFilter(filter: string): InteractiveFilter | undefined {
  const match = filter
    .trim()
    .match(
      /^([A-Za-z_][\w.]*|formula\.[A-Za-z_][\w.]*)\s*(==|!=)\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))$/,
    )
  if (!match) return undefined
  return {
    property: match[1],
    operator: match[2] === '!=' ? 'notEquals' : 'equals',
    value: match[3] ?? match[4] ?? match[5] ?? '',
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function BaseToolbar({
  result,
  allColumns,
  selectedView,
  onSelectedViewChange,
  selectedGroupBy,
  onSelectedGroupByChange,
  search,
  onSearchChange,
  sortProperty,
  onSortPropertyChange,
  sortDirection,
  onSortDirectionChange,
  limit,
  onLimitChange,
  visibleColumnIds,
  onVisibleColumnIdsChange,
  columnOrderIds,
  onColumnOrderIdsChange,
  filter,
  onFilterChange,
  viewStateDiff,
  onResetViewState,
  onSaveViewState,
}: {
  result: BaseEvaluationResult
  allColumns?: BaseColumn[]
  selectedView: string
  onSelectedViewChange?: (view: string) => void
  selectedGroupBy?: string
  onSelectedGroupByChange?: (property: string) => void
  search?: string
  onSearchChange?: (value: string) => void
  sortProperty?: string
  onSortPropertyChange?: (property: string) => void
  sortDirection?: SortDirection
  onSortDirectionChange?: (direction: SortDirection) => void
  limit?: string
  onLimitChange?: (value: string) => void
  visibleColumnIds?: string[]
  onVisibleColumnIdsChange?: (ids: string[]) => void
  columnOrderIds?: string[]
  onColumnOrderIdsChange?: (ids: string[]) => void
  filter?: InteractiveFilter
  onFilterChange?: (filter: InteractiveFilter) => void
  viewStateDiff?: BaseViewStateDiff[]
  onResetViewState?: () => void
  onSaveViewState?: () => void
}) {
  const columns = allColumns ?? result.columns
  const [filterOpen, setFilterOpen] = React.useState(false)
  const [sortOpen, setSortOpen] = React.useState(false)
  const [groupOpen, setGroupOpen] = React.useState(false)
  const [limitOpen, setLimitOpen] = React.useState(false)
  const [propertiesOpen, setPropertiesOpen] = React.useState(false)
  const [diffOpen, setDiffOpen] = React.useState(false)
  React.useEffect(() => {
    const hasOpenPopover =
      filterOpen || sortOpen || groupOpen || limitOpen || propertiesOpen || diffOpen
    if (!hasOpenPopover) return

    const closePopovers = () => {
      setFilterOpen(false)
      setSortOpen(false)
      setGroupOpen(false)
      setLimitOpen(false)
      setPropertiesOpen(false)
      setDiffOpen(false)
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('.obr-control-menu, .obr-property-menu, .obr-dirty-menu')) return
      closePopovers()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePopovers()
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [filterOpen, sortOpen, groupOpen, limitOpen, propertiesOpen, diffOpen])

  const activeSorts = sortProperty
    ? [{ property: sortProperty, direction: sortDirection ?? 'asc' }]
    : result.view.sort
  const isDirty = Boolean(viewStateDiff?.length)
  const activeChips = [
    search ? `Search: ${search}` : '',
    filter?.value
      ? `Filter: ${labelForProperty(columns, filter.property)} ${filter.operator} ${filter.value}`
      : '',
    selectedGroupBy ? `Group: ${labelForProperty(columns, selectedGroupBy)}` : '',
    activeSorts.length > 0
      ? `Sort: ${activeSorts
          .map((sort) => `${labelForProperty(columns, sort.property)} ${sort.direction}`)
          .join(', ')}`
      : '',
    limit ? `Limit: ${limit}` : '',
  ].filter(Boolean)

  return (
    <div className="obr-database-header">
      <div className="obr-viewbar">
        {onSelectedViewChange && result.base.views.length > 1 ? (
          <div className="obr-view-tabs" aria-label="Views">
            {result.base.views.map((candidate) => (
              <button
                className={
                  candidate.name === selectedView ? 'obr-view-tab is-active' : 'obr-view-tab'
                }
                key={candidate.name}
                type="button"
                onClick={() => onSelectedViewChange(candidate.name)}
              >
                <ViewIcon type={candidate.type} />
                {candidate.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="obr-view-tabs">
            <span className="obr-view-tab is-active">
              <ViewIcon type={result.view.type} />
              {result.view.name}
            </span>
          </div>
        )}
        <div className="obr-toolbar-actions">
          {onFilterChange && filter && (
            <div className="obr-control-menu">
              <button
                className={
                  filter.value || filterOpen ? 'obr-icon-button is-active' : 'obr-icon-button'
                }
                type="button"
                title="Filter"
                onClick={() => setFilterOpen((open) => !open)}
              >
                <Filter aria-hidden="true" />
              </button>
              {filterOpen && (
                <FilterMenu columns={columns} filter={filter} onFilterChange={onFilterChange} />
              )}
            </div>
          )}
          {onSortPropertyChange && (
            <div className="obr-control-menu">
              <button
                className={
                  activeSorts.length > 0 || sortOpen
                    ? 'obr-icon-button is-active'
                    : 'obr-icon-button'
                }
                type="button"
                title="Sort"
                onClick={() => setSortOpen((open) => !open)}
              >
                <ArrowUpDown aria-hidden="true" />
              </button>
              {sortOpen && (
                <SortMenu
                  columns={columns}
                  sortProperty={sortProperty}
                  onSortPropertyChange={onSortPropertyChange}
                  sortDirection={sortDirection}
                  onSortDirectionChange={onSortDirectionChange}
                />
              )}
            </div>
          )}
          {onSelectedGroupByChange && (
            <div className="obr-control-menu">
              <button
                className={
                  selectedGroupBy || groupOpen ? 'obr-icon-button is-active' : 'obr-icon-button'
                }
                type="button"
                title="Group"
                onClick={() => setGroupOpen((open) => !open)}
              >
                <LayoutGrid aria-hidden="true" />
              </button>
              {groupOpen && (
                <GroupMenu
                  columns={columns}
                  selectedGroupBy={selectedGroupBy}
                  onSelectedGroupByChange={onSelectedGroupByChange}
                />
              )}
            </div>
          )}
          {onLimitChange && (
            <div className="obr-control-menu">
              <button
                className={limit || limitOpen ? 'obr-icon-button is-active' : 'obr-icon-button'}
                type="button"
                title="Limit"
                onClick={() => setLimitOpen((open) => !open)}
              >
                <Hash aria-hidden="true" />
              </button>
              {limitOpen && <LimitMenu limit={limit} onLimitChange={onLimitChange} />}
            </div>
          )}
          {onSearchChange && (
            <label className="obr-compact-search">
              <Search aria-hidden="true" />
              <input
                value={search ?? ''}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search"
              />
            </label>
          )}
          {onVisibleColumnIdsChange && visibleColumnIds && (
            <div className="obr-property-menu">
              <button
                className={propertiesOpen ? 'obr-icon-button is-active' : 'obr-icon-button'}
                type="button"
                title="Properties"
                onClick={() => setPropertiesOpen((open) => !open)}
              >
                <SlidersHorizontal aria-hidden="true" />
              </button>
              {propertiesOpen && (
                <PropertyMenu
                  columns={columns}
                  visibleColumnIds={visibleColumnIds}
                  onVisibleColumnIdsChange={onVisibleColumnIdsChange}
                  columnOrderIds={columnOrderIds ?? columns.map((column) => column.id)}
                  onColumnOrderIdsChange={onColumnOrderIdsChange}
                  summaries={result.summaries}
                />
              )}
            </div>
          )}
          {isDirty && (
            <div className="obr-dirty-menu">
              <button
                className="obr-dirty-indicator"
                type="button"
                onClick={() => setDiffOpen((open) => !open)}
              >
                Unsaved view changes
              </button>
              {diffOpen && (
                <ViewStateDiffPanel
                  diff={viewStateDiff ?? []}
                  onResetViewState={onResetViewState}
                  onSaveViewState={onSaveViewState}
                />
              )}
            </div>
          )}
          <span className="obr-count">{result.rows.length}</span>
        </div>
      </div>
      {activeChips.length > 0 && (
        <div className="obr-chip-row">
          {activeChips.map((chip) => (
            <span className="obr-state-chip" key={chip}>
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ViewStateDiffPanel({
  diff,
  onResetViewState,
  onSaveViewState,
}: {
  diff: BaseViewStateDiff[]
  onResetViewState?: () => void
  onSaveViewState?: () => void
}) {
  return (
    <div className="obr-floating-panel obr-diff-panel">
      <strong>Current view differs from the .base file</strong>
      <div className="obr-diff-list">
        {diff.map((item) => (
          <div className="obr-diff-row" key={item.key}>
            <span>{item.label}</span>
            <del>{item.saved}</del>
            <ins>{item.current}</ins>
          </div>
        ))}
      </div>
      <div className="obr-menu-actions">
        {onResetViewState && (
          <button type="button" onClick={onResetViewState}>
            Revert to file
          </button>
        )}
        {onSaveViewState && (
          <button type="button" onClick={onSaveViewState}>
            Apply changes
          </button>
        )}
      </div>
    </div>
  )
}

function FilterMenu({
  columns,
  filter,
  onFilterChange,
}: {
  columns: BaseColumn[]
  filter: InteractiveFilter
  onFilterChange: (filter: InteractiveFilter) => void
}) {
  return (
    <div className="obr-floating-panel obr-control-panel">
      <strong>Filter</strong>
      <select
        value={filter.property}
        onChange={(event) => onFilterChange({ ...filter, property: event.target.value })}
      >
        {columns.map((column) => (
          <option key={column.id} value={column.property}>
            {column.label}
          </option>
        ))}
      </select>
      <select
        value={filter.operator}
        onChange={(event) =>
          onFilterChange({ ...filter, operator: event.target.value as FilterOperator })
        }
      >
        <option value="contains">contains</option>
        <option value="equals">equals</option>
        <option value="notEquals">not equals</option>
      </select>
      <input
        value={filter.value}
        onChange={(event) => onFilterChange({ ...filter, value: event.target.value })}
        placeholder="Value"
      />
      {filter.value && (
        <button type="button" onClick={() => onFilterChange({ ...filter, value: '' })}>
          Clear filter
        </button>
      )}
    </div>
  )
}

function SortMenu({
  columns,
  sortProperty,
  onSortPropertyChange,
  sortDirection,
  onSortDirectionChange,
}: {
  columns: BaseColumn[]
  sortProperty?: string
  onSortPropertyChange: (property: string) => void
  sortDirection?: SortDirection
  onSortDirectionChange?: (direction: SortDirection) => void
}) {
  return (
    <div className="obr-floating-panel obr-control-panel">
      <strong>Sort</strong>
      <select
        value={sortProperty ?? ''}
        onChange={(event) => onSortPropertyChange(event.target.value)}
      >
        <option value="">No sort</option>
        {columns.map((column) => (
          <option key={column.id} value={column.property}>
            {column.label}
          </option>
        ))}
      </select>
      {onSortDirectionChange && (
        <select
          value={sortDirection}
          onChange={(event) => onSortDirectionChange(event.target.value as SortDirection)}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      )}
    </div>
  )
}

function GroupMenu({
  columns,
  selectedGroupBy,
  onSelectedGroupByChange,
}: {
  columns: BaseColumn[]
  selectedGroupBy?: string
  onSelectedGroupByChange: (property: string) => void
}) {
  return (
    <div className="obr-floating-panel obr-control-panel">
      <strong>Group</strong>
      <select
        value={selectedGroupBy ?? ''}
        onChange={(event) => onSelectedGroupByChange(event.target.value)}
      >
        <option value="">No grouping</option>
        {columns.map((column) => (
          <option key={column.id} value={column.property}>
            {column.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function LimitMenu({
  limit,
  onLimitChange,
}: {
  limit?: string
  onLimitChange: (value: string) => void
}) {
  return (
    <div className="obr-floating-panel obr-control-panel">
      <strong>Limit</strong>
      <input
        type="number"
        min="1"
        value={limit ?? ''}
        onChange={(event) => onLimitChange(event.target.value)}
        placeholder="All rows"
      />
      {limit && (
        <button type="button" onClick={() => onLimitChange('')}>
          Clear limit
        </button>
      )}
    </div>
  )
}

function PropertyMenu({
  columns,
  visibleColumnIds,
  onVisibleColumnIdsChange,
  columnOrderIds,
  onColumnOrderIdsChange,
  summaries,
}: {
  columns: BaseColumn[]
  visibleColumnIds: string[]
  onVisibleColumnIdsChange: (ids: string[]) => void
  columnOrderIds: string[]
  onColumnOrderIdsChange?: (ids: string[]) => void
  summaries: Record<string, BaseValue>
}) {
  const [query, setQuery] = React.useState('')
  const [draggedColumnId, setDraggedColumnId] = React.useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = React.useState<{
    id: string
    position: 'before' | 'after'
  } | null>(null)
  const byId = new Map(columns.map((column) => [column.id, column]))
  const orderedColumns = orderedColumnIds(columns, columnOrderIds).flatMap((id) => {
    const column = byId.get(id)
    return column ? [column] : []
  })
  const filteredColumns = orderedColumns.filter((column) =>
    column.label.toLowerCase().includes(query.toLowerCase()),
  )
  const reorder = (targetId: string, position: 'before' | 'after') => {
    const draggedId = draggedColumnId
    if (!draggedId || draggedId === targetId || !onColumnOrderIdsChange) return
    onColumnOrderIdsChange(reorderColumnIds(columns, columnOrderIds, draggedId, targetId, position))
    setDraggedColumnId(null)
    setDropIndicator(null)
  }

  return (
    <div className="obr-floating-panel obr-property-panel">
      <input
        className="obr-panel-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Find property"
      />
      <div className={draggedColumnId ? 'obr-panel-section is-reordering' : 'obr-panel-section'}>
        {filteredColumns.map((column) => {
          const dropClass =
            dropIndicator?.id === column.id ? ` is-drop-${dropIndicator.position}` : ''
          return (
            <div
              className={`${
                draggedColumnId === column.id ? 'obr-property-row is-dragging' : 'obr-property-row'
              }${dropClass}`}
              key={column.id}
              onDragEnter={(event) => {
                if (!onColumnOrderIdsChange) return
                const rect = event.currentTarget.getBoundingClientRect()
                const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
                setDropIndicator({ id: column.id, position })
              }}
              onDragOver={(event) => {
                if (!onColumnOrderIdsChange) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                const rect = event.currentTarget.getBoundingClientRect()
                const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
                setDropIndicator({ id: column.id, position })
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDropIndicator((current) => (current?.id === column.id ? null : current))
                }
              }}
              onDrop={(event) => {
                event.preventDefault()
                reorder(column.id, dropIndicator?.position ?? 'before')
              }}
            >
              {dropIndicator?.id === column.id && (
                <span
                  className={`obr-drop-indicator obr-drop-indicator-${dropIndicator.position}`}
                  aria-hidden="true"
                />
              )}
              <button
                className="obr-drag-handle"
                type="button"
                draggable={Boolean(onColumnOrderIdsChange)}
                aria-label={`Reorder ${column.label}`}
                title="Drag to reorder"
                onDragStart={(event) => {
                  setDraggedColumnId(column.id)
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', column.id)
                }}
                onDragEnd={() => {
                  setDraggedColumnId(null)
                  setDropIndicator(null)
                }}
              >
                <GripVertical aria-hidden="true" />
              </button>
              <input
                type="checkbox"
                checked={visibleColumnIds.includes(column.id)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...visibleColumnIds, column.id]
                    : visibleColumnIds.filter((id) => id !== column.id)
                  onVisibleColumnIdsChange(next.length ? next : visibleColumnIds)
                }}
              />
              <span>{propertyIcon(column)}</span>
              <span className="obr-property-label">{column.label}</span>
            </div>
          )
        })}
      </div>
      {Object.keys(summaries).length > 0 && (
        <div className="obr-menu-actions">
          <span>Calculate: {Object.keys(summaries).length}</span>
        </div>
      )}
    </div>
  )
}

function labelForProperty(columns: BaseColumn[], property: string) {
  return columns.find((column) => column.property === property)?.label ?? property
}

function IconGlyph({ icon: Icon, label }: { icon: LucideIcon; label?: string }) {
  return <Icon aria-hidden={label ? undefined : true} aria-label={label} />
}

function ViewIcon({ type }: { type: string }) {
  if (type === 'list') return <IconGlyph icon={List} />
  if (type === 'cards') return <IconGlyph icon={LayoutGrid} />
  return <IconGlyph icon={Table2} />
}

function propertyIcon(column: BaseColumn) {
  const name = `${column.property} ${column.label}`.toLowerCase()
  if (name.includes('tag')) return <IconGlyph icon={Tags} />
  if (name.includes('date') || name.includes('updated') || name.includes('timestamp'))
    return <IconGlyph icon={Calendar} />
  if (name.includes('progress') || name.includes('number') || name.includes('%'))
    return <IconGlyph icon={Hash} />
  if (name.includes('link') || name.includes('url')) return <IconGlyph icon={Link2} />
  if (name.includes('formula')) return <IconGlyph icon={Sigma} />
  return <IconGlyph icon={Type} />
}

function sortingStateForResult(result: BaseEvaluationResult): SortingState {
  return result.view.sort.flatMap((sort) => {
    const column = result.columns.find((candidate) => candidate.property === sort.property)
    return column ? [{ id: column.id, desc: sort.direction === 'desc' }] : []
  })
}

export function BaseTable({
  result,
  embedded = false,
}: {
  result: BaseEvaluationResult
  embedded?: boolean
}) {
  const initialSorting = React.useMemo(() => sortingStateForResult(result), [result])
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting)
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(() => new Set())
  const columns = React.useMemo(() => createBaseColumnDefs(result), [result])
  const sortKey = result.view.sort.map((sort) => `${sort.property}:${sort.direction}`).join('|')
  React.useEffect(() => {
    setSorting(sortingStateForResult(result))
  }, [result, sortKey])
  const table = useReactTable({
    data: result.rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
  const rows = table.getRowModel().rows
  const groupCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of result.rows) {
      if (row.groupKey) counts.set(row.groupKey, (counts.get(row.groupKey) ?? 0) + 1)
    }
    return counts
  }, [result.rows])
  let lastGroup = ''

  const tableBody = (
    <div className="obr-table-frame">
      <table className="obr-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const column = result.columns.find((candidate) => candidate.id === header.column.id)
                return (
                  <th key={header.id}>
                    <span className="obr-property-heading">
                      <span>{column ? propertyIcon(column) : <IconGlyph icon={Type} />}</span>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                    <span
                      className={header.column.getIsSorted() ? 'obr-sort is-active' : 'obr-sort'}
                    >
                      {header.column.getIsSorted() === 'asc' ? (
                        <ArrowUp aria-hidden="true" />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ArrowDown aria-hidden="true" />
                      ) : (
                        <ArrowUpDown aria-hidden="true" />
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.map((row) => {
            const groupKey = row.original.groupKey
            const groupChanged = groupKey && groupKey !== lastGroup
            if (groupChanged) lastGroup = groupKey
            const isCollapsed = Boolean(groupKey && collapsedGroups.has(groupKey))
            return (
              <React.Fragment key={row.id}>
                {groupChanged && (
                  <tr className="obr-group-row">
                    <td colSpan={result.columns.length}>
                      <button
                        className="obr-group-toggle"
                        type="button"
                        aria-expanded={!isCollapsed}
                        onClick={() => {
                          setCollapsedGroups((current) => {
                            const next = new Set(current)
                            if (next.has(groupKey)) next.delete(groupKey)
                            else next.add(groupKey)
                            return next
                          })
                        }}
                      >
                        <span>
                          {isCollapsed ? (
                            <ChevronRight aria-hidden="true" />
                          ) : (
                            <ChevronDown aria-hidden="true" />
                          )}
                        </span>
                        {groupKey}
                        <em>{groupCounts.get(groupKey) ?? 0} rows</em>
                      </button>
                      {result.groupSummaries[groupKey] && (
                        <SummaryBar summaries={result.groupSummaries[groupKey]} compact />
                      )}
                    </td>
                  </tr>
                )}
                {!isCollapsed && (
                  <tr>
                    {row.getVisibleCells().map((cell, index) => (
                      <td key={cell.id}>
                        {index === 0 ? (
                          <span className="obr-title-cell">
                            <FileText className="obr-page-icon" aria-hidden="true" />
                            <BaseValueView value={cell.getValue() as BaseValue} />
                          </span>
                        ) : (
                          <BaseValueView value={cell.getValue() as BaseValue} />
                        )}
                      </td>
                    ))}
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
        {Object.keys(result.summaries).length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={result.columns.length}>
                <SummaryBar summaries={result.summaries} />
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )

  if (embedded) return tableBody
  return (
    <section className="obr-shell">
      <BaseToolbar result={result} selectedView={result.view.name} />
      {tableBody}
    </section>
  )
}

export type BaseListModel = {
  marker: BaseListMarker
  primaryColumn?: BaseColumn
  inlineColumns: BaseColumn[]
  indentedColumns: BaseColumn[]
}

export function buildBaseListModel(result: BaseEvaluationResult): BaseListModel {
  const [primaryColumn, ...secondaryColumns] = result.columns
  const marker = result.view.listMarker ?? 'bullet'
  const indentedPropertySet = new Set(result.view.indentedProperties ?? [])
  return {
    marker,
    primaryColumn,
    inlineColumns: secondaryColumns.filter(
      (column) => !indentedPropertySet.has(column.property) && !indentedPropertySet.has(column.id),
    ),
    indentedColumns: secondaryColumns.filter(
      (column) => indentedPropertySet.has(column.property) || indentedPropertySet.has(column.id),
    ),
  }
}

export function BaseList({
  result,
  embedded = false,
}: {
  result: BaseEvaluationResult
  embedded?: boolean
}) {
  const model = buildBaseListModel(result)
  const ListTag = model.marker === 'number' ? 'ol' : 'ul'
  const content = (
    <ListTag className={`obr-list-items obr-list-marker-${model.marker}`}>
      {result.rows.map((row) => (
        <li key={row.id}>
          <div className="obr-list-main">
            <FileText className="obr-page-icon" aria-hidden="true" />
            <strong>
              <BaseValueView
                value={row.values[model.primaryColumn?.property ?? ''] ?? row.file.basename}
              />
            </strong>
            {model.inlineColumns.length > 0 && (
              <span className="obr-list-inline">
                {model.inlineColumns
                  .filter((column) => displayValue(row.values[column.property]))
                  .map((column, index) => (
                    <React.Fragment key={column.id}>
                      {index > 0 && <span className="obr-list-separator"> · </span>}
                      <BaseValueView value={row.values[column.property]} />
                    </React.Fragment>
                  ))}
              </span>
            )}
          </div>
          {model.indentedColumns.length > 0 && (
            <div className="obr-list-indented">
              {model.indentedColumns.map((column) => (
                <div className="obr-list-property" key={column.id}>
                  <span>{column.label}</span>
                  <BaseValueView value={row.values[column.property]} />
                </div>
              ))}
            </div>
          )}
        </li>
      ))}
    </ListTag>
  )
  if (embedded) return <div className="obr-list">{content}</div>
  return (
    <section className="obr-shell obr-list">
      <BaseToolbar result={result} selectedView={result.view.name} />
      {content}
    </section>
  )
}

export function BaseCards({
  result,
  embedded = false,
}: {
  result: BaseEvaluationResult
  embedded?: boolean
}) {
  const [primary, ...rest] = result.columns
  const content = (
    <div className="obr-card-grid">
      {result.rows.map((row, index) => (
        <article className="obr-card" key={row.id}>
          <div className={`obr-card-cover obr-card-cover-${index % 4}`}>
            {displayValue(row.values[rest[0]?.property] ?? row.file.folder)}
          </div>
          <h3>
            <FileText className="obr-page-icon" aria-hidden="true" />
            {displayValue(row.values[primary?.property] ?? row.file.basename)}
          </h3>
          {rest.map((column) => (
            <p key={column.id}>
              <span>{column.label}</span>
              <BaseValueView value={row.values[column.property]} />
            </p>
          ))}
        </article>
      ))}
    </div>
  )
  if (embedded) return <div className="obr-cards">{content}</div>
  return (
    <section className="obr-shell obr-cards">
      <BaseToolbar result={result} selectedView={result.view.name} />
      {content}
    </section>
  )
}

export function BaseValueView({ value }: { value: BaseValue }) {
  const { renderers } = useBaseOptions()
  const kind = valueKind(value)
  const override = renderers?.[kind]
  if (override) return <>{override(value)}</>
  if (Array.isArray(value))
    return (
      <span className="obr-tags">
        {value.map((item, index) => (
          <span key={index}>{displayValue(item)}</span>
        ))}
      </span>
    )
  if (value instanceof Date)
    return <time dateTime={value.toISOString()}>{displayValue(value)}</time>
  if (typeof value === 'boolean')
    return <span className={value ? 'obr-true' : 'obr-false'}>{value ? 'Yes' : 'No'}</span>
  if (typeof value === 'number')
    return <span className="obr-number">{Number.isInteger(value) ? value : value.toFixed(1)}</span>
  if (typeof value === 'string' && /^https?:\/\//.test(value)) {
    return (
      <a className="obr-link" href={value}>
        {value}
      </a>
    )
  }
  if (value && typeof value === 'object') {
    if (value.type === 'link' || value.type === 'file') {
      const href = String(value.path ?? '#')
      return (
        <a className="obr-link" href={href}>
          {displayValue(value)}
        </a>
      )
    }
    if (value.type === 'image')
      return (
        <img
          className="obr-image"
          src={String(value.src ?? '')}
          alt={String(value.alt ?? value.label ?? '')}
        />
      )
    if (value.type === 'icon') {
      const iconName = String(value.name ?? 'icon')
      return (
        <span className="obr-icon">
          <IconGlyph icon={iconForName(iconName)} label={iconName} />
        </span>
      )
    }
    if (value.type === 'html')
      return <span dangerouslySetInnerHTML={{ __html: String(value.html ?? '') }} />
  }
  return <span>{displayValue(value)}</span>
}

function iconForName(name: string): LucideIcon {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const icons: Record<string, LucideIcon> = {
    arrowdown: ArrowDown,
    arrowup: ArrowUp,
    arrowupdown: ArrowUpDown,
    calendar: Calendar,
    chevrondown: ChevronDown,
    chevronright: ChevronRight,
    file: FileText,
    filetext: FileText,
    filter: Filter,
    hash: Hash,
    layoutgrid: LayoutGrid,
    grid: LayoutGrid,
    link: Link2,
    link2: Link2,
    list: List,
    search: Search,
    sigma: Sigma,
    sliders: SlidersHorizontal,
    slidershorizontal: SlidersHorizontal,
    table: Table2,
    table2: Table2,
    tags: Tags,
    type: Type,
  }
  return icons[normalized] ?? Circle
}

function valueKind(value: BaseValue): keyof BaseRenderers {
  if (Array.isArray(value)) return 'list'
  if (value instanceof Date) return 'date'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value && typeof value === 'object') {
    if (value.type === 'link') return 'link'
    if (value.type === 'file') return 'file'
    if (value.type === 'image') return 'image'
    if (value.type === 'icon') return 'icon'
    if (value.type === 'html') return 'html'
  }
  return 'object'
}

function SummaryBar({
  summaries,
  compact = false,
}: {
  summaries: Record<string, BaseValue>
  compact?: boolean
}) {
  return (
    <div className={compact ? 'obr-summary obr-summary-compact' : 'obr-summary'}>
      {Object.entries(summaries).map(([key, value]) => (
        <span key={key}>
          <strong>{key}</strong> {displayValue(value)}
        </span>
      ))}
    </div>
  )
}

function DiagnosticList({ diagnostics }: { diagnostics: BaseEvaluationResult['diagnostics'] }) {
  return (
    <div className="obr-diagnostics">
      {diagnostics.map((diagnostic, index) => (
        <p key={index}>
          {diagnostic.level}: {diagnostic.message}
        </p>
      ))}
    </div>
  )
}
