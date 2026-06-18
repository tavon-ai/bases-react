import yaml from 'js-yaml'

export type BasePrimitive = null | string | number | boolean | Date
export type BaseValue = BasePrimitive | BaseValue[] | BaseValueObject
export interface BaseValueObject {
  [key: string]: BaseValue
}

export type BaseFile = {
  path: string
  name: string
  basename: string
  folder: string
  ext: string
  size?: number
  ctime?: Date
  mtime?: Date
  tags: string[]
  links: string[]
  embeds?: string[]
  backlinks?: string[]
  properties: Record<string, BaseValue>
}

export type RawBaseDefinition = Record<string, unknown> & {
  filters?: unknown
  properties?: unknown
  formulas?: Record<string, string>
  summaries?: unknown
  views?: unknown
}

export type BaseDiagnostic = { level: 'error' | 'warning'; message: string; path?: string }
export type BaseViewType = 'table' | 'list' | 'cards' | 'map'
export type BaseListMarker = 'bullet' | 'number' | 'none'
export type BaseColumn = { id: string; property: string; label: string }
export type BaseSort = { property: string; direction: 'asc' | 'desc' }

export type NormalizedBaseView = {
  name: string
  type: BaseViewType
  filters?: unknown
  columns: BaseColumn[]
  order: string[]
  sort: BaseSort[]
  groupBy?: string[]
  limit?: number
  listMarker?: BaseListMarker
  indentedProperties?: string[]
}

export type NormalizedBaseDefinition = {
  filters?: unknown
  formulas: Record<string, string>
  properties: Record<string, { label?: string }>
  summaries: Record<string, unknown>
  views: NormalizedBaseView[]
  diagnostics: BaseDiagnostic[]
}

export type BaseRow = {
  id: string
  file: BaseFile
  values: Record<string, BaseValue>
  groupKey?: string
}
export type BaseEvaluationResult = {
  base: NormalizedBaseDefinition
  view: NormalizedBaseView
  rows: BaseRow[]
  columns: BaseColumn[]
  summaries: Record<string, BaseValue>
  groupSummaries: Record<string, Record<string, BaseValue>>
  diagnostics: BaseDiagnostic[]
}

export type ExpressionAst =
  | { type: 'literal'; value: BaseValue }
  | { type: 'identifier'; path: string[] }
  | { type: 'unary'; operator: '!'; argument: ExpressionAst }
  | { type: 'binary'; operator: string; left: ExpressionAst; right: ExpressionAst }
  | { type: 'call'; callee: ExpressionAst; args: ExpressionAst[] }
  | { type: 'member'; object: ExpressionAst; property: string }
  | { type: 'index'; object: ExpressionAst; index: ExpressionAst }

export function parseBase(source: string): RawBaseDefinition {
  const parsed = yaml.load(source)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  return parsed as RawBaseDefinition
}

export const parseBaseFile = parseBase

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function normalizePropertyName(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  const record = asRecord(value)
  return typeof record?.property === 'string' ? record.property : undefined
}

function normalizeColumns(
  view: Record<string, unknown>,
  properties: Record<string, { label?: string }>,
  formulas: Record<string, string>,
  diagnostics: BaseDiagnostic[],
  viewPath: string,
): BaseColumn[] {
  const rawColumns = Array.isArray(view.columns)
    ? view.columns
    : Array.isArray(view.order)
      ? view.order
      : []
  if (rawColumns.length === 0)
    diagnostics.push({
      level: 'warning',
      message: 'View has no columns/order; using title fallback.',
      path: viewPath,
    })
  const source = rawColumns.length > 0 ? rawColumns : ['title']
  return source
    .map((entry, index) => {
      const property = normalizePropertyName(entry) ?? `column_${index}`
      const label = asRecord(entry)?.label
      return {
        id: property,
        property,
        label:
          typeof label === 'string'
            ? label
            : (properties[property]?.label ??
              properties[property.replace(/^formula\./, '')]?.label ??
              (property.startsWith('formula.')
                ? titleCase(property.slice(8))
                : titleCase(property))),
      }
    })
    .concat(
      Object.keys(formulas).filter((name) =>
        source.some((entry) => normalizePropertyName(entry) === `formula.${name}`),
      ).length
        ? []
        : [],
    )
}

function normalizeListMarker(value: unknown): BaseListMarker | undefined {
  if (value === 'bullet' || value === 'bullets') return 'bullet'
  if (value === 'number' || value === 'numbers' || value === 'ordered') return 'number'
  if (value === 'none' || value === false) return 'none'
  return undefined
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const strings = value.filter((entry): entry is string => typeof entry === 'string')
    return strings.length ? strings : undefined
  }
  if (typeof value === 'string' && value.trim()) return [value]
  return undefined
}

export function normalizeBase(raw: RawBaseDefinition): NormalizedBaseDefinition {
  const diagnostics: BaseDiagnostic[] = []
  const rawProperties = asRecord(raw.properties) ?? {}
  const properties: Record<string, { label?: string }> = {}
  for (const [key, value] of Object.entries(rawProperties)) {
    properties[key] =
      typeof value === 'string'
        ? { label: value }
        : {
            label:
              typeof asRecord(value)?.label === 'string'
                ? String(asRecord(value)?.label)
                : undefined,
          }
  }
  const formulas =
    typeof raw.formulas === 'object' && raw.formulas
      ? (Object.fromEntries(
          Object.entries(raw.formulas).filter(([, v]) => typeof v === 'string'),
        ) as Record<string, string>)
      : {}

  const rawViews = Array.isArray(raw.views) ? raw.views : []
  if (!Array.isArray(raw.views))
    diagnostics.push({
      level: 'error',
      message: 'Base definition must include a views array.',
      path: 'views',
    })

  const views = rawViews.map((entry, index): NormalizedBaseView => {
    const view = asRecord(entry) ?? {}
    const name = typeof view.name === 'string' && view.name.trim() ? view.name : `View ${index + 1}`
    const type = ['table', 'list', 'cards', 'map'].includes(String(view.type))
      ? (view.type as BaseViewType)
      : 'table'
    if (!view.name)
      diagnostics.push({
        level: 'warning',
        message: 'View is missing a name; generated one.',
        path: `views.${index}.name`,
      })
    const columns = normalizeColumns(view, properties, formulas, diagnostics, `views.${index}`)
    const rawSort = Array.isArray(view.sort) ? view.sort : []
    const sort = rawSort.flatMap((item): BaseSort[] => {
      const record = asRecord(item)
      const property = typeof record?.property === 'string' ? record.property : undefined
      if (!property) return []
      return [{ property, direction: record?.direction === 'desc' ? 'desc' : 'asc' }]
    })
    const groupBy = Array.isArray(view.groupBy)
      ? view.groupBy.filter((v): v is string => typeof v === 'string')
      : typeof view.groupBy === 'string'
        ? [view.groupBy]
        : undefined
    const listOptions = asRecord(view.list)
    return {
      name,
      type,
      filters: view.filters,
      columns,
      order: columns.map((c) => c.property),
      sort,
      groupBy,
      limit: typeof view.limit === 'number' ? view.limit : undefined,
      listMarker: normalizeListMarker(view.listMarker ?? view.marker ?? listOptions?.marker),
      indentedProperties: normalizeStringArray(
        view.indentedProperties ??
          view.indentProperties ??
          view.indent ??
          listOptions?.indentedProperties,
      ),
    }
  })

  return {
    filters: raw.filters,
    formulas,
    properties,
    summaries: asRecord(raw.summaries) ?? {},
    views,
    diagnostics,
  }
}

export function evaluateBase({
  base,
  files,
  view,
  groupBy,
}: {
  base: string | RawBaseDefinition | NormalizedBaseDefinition
  files: BaseFile[]
  view?: string
  groupBy?: string | string[]
}): BaseEvaluationResult {
  const normalized =
    typeof base === 'string'
      ? normalizeBase(parseBase(base))
      : 'diagnostics' in base && 'views' in base
        ? (base as NormalizedBaseDefinition)
        : normalizeBase(base as RawBaseDefinition)
  const diagnostics = [...normalized.diagnostics]
  const selectedViewBase =
    normalized.views.find((candidate) => candidate.name === view) ?? normalized.views[0]
  const selectedView =
    selectedViewBase && groupBy !== undefined
      ? {
          ...selectedViewBase,
          groupBy: Array.isArray(groupBy) ? groupBy : groupBy ? [groupBy] : undefined,
        }
      : selectedViewBase
  if (!selectedView) {
    const fallback: NormalizedBaseView = {
      name: 'Empty',
      type: 'table',
      columns: [],
      order: [],
      sort: [],
    }
    return {
      base: normalized,
      view: fallback,
      rows: [],
      columns: [],
      summaries: {},
      groupSummaries: {},
      diagnostics: [...diagnostics, { level: 'error', message: 'No views available.' }],
    }
  }

  const formulaOrder = sortFormulas(normalized.formulas, diagnostics)
  const columns = selectedView.columns
  let rows = files.map((file): BaseRow => {
    const formulaValues: Record<string, BaseValue> = {}
    for (const name of formulaOrder) {
      formulaValues[name] = safeEvaluate(
        normalized.formulas[name],
        { file, formula: formulaValues, values: [] },
        diagnostics,
        `formulas.${name}`,
      )
    }
    const values = {
      ...Object.fromEntries(
        Object.entries(formulaValues).map(([key, value]) => [`formula.${key}`, value]),
      ),
      ...Object.fromEntries(
        columns.map((column) => [
          column.property,
          resolveProperty(file, column.property, formulaValues),
        ]),
      ),
    }
    return {
      id: file.path,
      file,
      values,
      groupKey: selectedView.groupBy
        ?.map((key) => String(resolveProperty(file, key, formulaValues) ?? ''))
        .join(' / '),
    }
  })

  rows = rows.filter(
    (row) =>
      matchesFilterTree(row, normalized.filters, diagnostics) &&
      matchesFilterTree(row, selectedView.filters, diagnostics),
  )
  if (selectedView.groupBy?.length || selectedView.sort.length)
    rows = [...rows].sort((a, b) => {
      const groupCompare = String(a.groupKey ?? '').localeCompare(
        String(b.groupKey ?? ''),
        undefined,
        { numeric: true, sensitivity: 'base' },
      )
      return groupCompare || compareRows(a, b, selectedView.sort)
    })
  if (selectedView.limit && selectedView.limit > 0) rows = rows.slice(0, selectedView.limit)
  return {
    base: normalized,
    view: selectedView,
    rows,
    columns,
    summaries: computeSummaries(rows, normalized.summaries, diagnostics),
    groupSummaries: computeGroupSummaries(rows, normalized.summaries, diagnostics),
    diagnostics,
  }
}

function sortFormulas(formulas: Record<string, string>, diagnostics: BaseDiagnostic[]): string[] {
  const names = Object.keys(formulas)
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const result: string[] = []
  const deps = Object.fromEntries(
    names.map((name) => [
      name,
      [...formulas[name].matchAll(/formula\.([A-Za-z_$][\w$]*)/g)]
        .map((m) => m[1])
        .filter((dep) => dep in formulas),
    ]),
  )
  const visit = (name: string) => {
    if (visited.has(name)) return
    if (visiting.has(name)) {
      diagnostics.push({
        level: 'error',
        message: `Circular formula reference involving ${name}.`,
        path: `formulas.${name}`,
      })
      return
    }
    visiting.add(name)
    for (const dep of deps[name] ?? []) visit(dep)
    visiting.delete(name)
    visited.add(name)
    result.push(name)
  }
  names.forEach(visit)
  return result
}

export function parseExpression(source: string): ExpressionAst {
  return new Parser(tokenize(source)).parse()
}

export function evaluateExpression(
  ast: ExpressionAst,
  context: { file: BaseFile; formula?: Record<string, BaseValue>; values?: BaseValue[] },
): BaseValue {
  switch (ast.type) {
    case 'literal':
      return ast.value
    case 'identifier':
      return resolveIdentifier(ast.path, context)
    case 'unary':
      return !truthy(evaluateExpression(ast.argument, context))
    case 'binary':
      return evalBinary(
        ast.operator,
        evaluateExpression(ast.left, context),
        evaluateExpression(ast.right, context),
      )
    case 'member':
      return getMember(evaluateExpression(ast.object, context), ast.property)
    case 'index':
      return getIndex(
        evaluateExpression(ast.object, context),
        evaluateExpression(ast.index, context),
      )
    case 'call':
      return callValue(
        ast.callee,
        ast.args.map((arg) => evaluateExpression(arg, context)),
        context,
      )
  }
}

function safeEvaluate(
  source: string,
  context: { file: BaseFile; formula?: Record<string, BaseValue>; values?: BaseValue[] },
  diagnostics: BaseDiagnostic[],
  path?: string,
): BaseValue {
  try {
    return evaluateExpression(parseExpression(source), context)
  } catch (error) {
    diagnostics.push({
      level: 'error',
      message: error instanceof Error ? error.message : String(error),
      path,
    })
    return null
  }
}

export function resolveProperty(
  file: BaseFile,
  property: string,
  formula: Record<string, BaseValue> = {},
): BaseValue {
  if (property.startsWith('formula.')) return formula[property.slice(8)] ?? null
  if (property.startsWith('file.')) return getPath(file, property.slice(5)) ?? null
  if (property.startsWith('note.'))
    return getPath(file.properties, property.slice(5).replace(/^\["(.+)"\]$/, '$1')) ?? null
  if (property === 'file') return file.path
  return getPath(file.properties, property) ?? getPath(file, property) ?? null
}

function resolveIdentifier(
  path: string[],
  context: { file: BaseFile; formula?: Record<string, BaseValue>; values?: BaseValue[] },
): BaseValue {
  const [head, ...rest] = path
  if (head === 'file')
    return rest.length ? (getPath(context.file, rest.join('.')) ?? null) : context.file.path
  if (head === 'note') return getPath(context.file.properties, rest.join('.')) ?? null
  if (head === 'formula') return getPath(context.formula ?? {}, rest.join('.')) ?? null
  if (head === 'values')
    return rest.length
      ? (getPath({ values: context.values ?? [] }, path.join('.')) ?? null)
      : (context.values ?? [])
  if (head === 'true') return true
  if (head === 'false') return false
  if (head === 'null') return null
  return resolveProperty(context.file, path.join('.'), context.formula)
}

function getPath(source: unknown, path: string): BaseValue | undefined {
  const parts = path
    .replace(/\["([^"]+)"\]/g, '.$1')
    .split('.')
    .filter(Boolean)
  let current: unknown = source
  for (const part of parts) {
    if (Array.isArray(current) && /^\d+$/.test(part)) current = current[Number(part)]
    else if (current && typeof current === 'object')
      current = (current as Record<string, unknown>)[part]
    else return undefined
  }
  return current as BaseValue | undefined
}

function getMember(value: BaseValue, property: string): BaseValue {
  if (value instanceof Date) {
    if (property === 'year') return value.getFullYear()
    if (property === 'month') return value.getMonth() + 1
    if (property === 'day') return value.getDate()
    if (property === 'hour') return value.getHours()
    if (property === 'minute') return value.getMinutes()
    if (property === 'second') return value.getSeconds()
  }
  if (Array.isArray(value) && property === 'length') return value.length
  if (value && typeof value === 'object' && !(value instanceof Date))
    return (value as Record<string, BaseValue>)[property] ?? null
  if (typeof value === 'string' && property === 'length') return value.length
  return { __target: value, __method: property } as BaseValueObject
}

function getIndex(value: BaseValue, index: BaseValue): BaseValue {
  if (Array.isArray(value)) return value[Number(index)] ?? null
  if (typeof value === 'string') return value[Number(index)] ?? null
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return (value as Record<string, BaseValue>)[String(index)] ?? null
  }
  return null
}

function callValue(
  callee: ExpressionAst,
  args: BaseValue[],
  context: { file: BaseFile; formula?: Record<string, BaseValue>; values?: BaseValue[] },
): BaseValue {
  if (callee.type === 'identifier') return callFunction(callee.path.join('.'), args, context)
  if (callee.type === 'member') {
    if (callee.object.type === 'identifier' && callee.object.path.join('.') === 'file') {
      return callFunction(`file.${callee.property}`, args, context)
    }
    const target = evaluateExpression(callee.object, context)
    return callMethod(target, callee.property, args)
  }
  return null
}

function callFunction(
  name: string,
  args: BaseValue[],
  context: { file: BaseFile; formula?: Record<string, BaseValue>; values?: BaseValue[] },
): BaseValue {
  switch (name) {
    case 'if':
      return truthy(args[0]) ? (args[1] ?? null) : (args[2] ?? null)
    case 'now':
      return new Date()
    case 'today': {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      return d
    }
    case 'date':
      return toDate(args[0])
    case 'duration':
      return parseDuration(args[0], args[1])
    case 'number':
      return Number(args[0] ?? 0)
    case 'list':
      return args
    case 'min':
      return Math.min(...args.flatMap(numberValues))
    case 'max':
      return Math.max(...args.flatMap(numberValues))
    case 'link':
      return { type: 'link', path: String(args[0] ?? ''), label: String(args[1] ?? args[0] ?? '') }
    case 'image':
      return { type: 'image', src: String(args[0] ?? '') }
    case 'icon':
      return { type: 'icon', name: String(args[0] ?? '') }
    case 'html':
      return { type: 'html', html: String(args[0] ?? '') }
    case 'file.hasTag':
      return context.file.tags.includes(String(args[0] ?? '').replace(/^#/, ''))
    case 'file.inFolder':
      return context.file.folder.startsWith(String(args[0] ?? ''))
    case 'file.hasProperty':
      return String(args[0] ?? '') in context.file.properties
    case 'file.hasLink':
      return context.file.links.some((link) => valueEquals(link, args[0]))
    case 'file.asLink':
      return { type: 'link', path: context.file.path, label: context.file.basename }
    default:
      return null
  }
}

function callMethod(target: BaseValue, method: string, args: BaseValue[]): BaseValue {
  if (target instanceof Date) {
    if (method === 'date') {
      const date = new Date(target)
      date.setHours(0, 0, 0, 0)
      return date
    }
    if (method === 'time') return target.toTimeString().slice(0, 8)
    if (method === 'format') return formatDate(target, String(args[0] ?? 'yyyy-MM-dd'))
    if (method === 'relative') return relativeDate(target, toDate(args[0]) ?? new Date())
  }
  if (typeof target === 'string') {
    if (method === 'contains') return target.includes(String(args[0] ?? ''))
    if (method === 'containsAll')
      return ((args[0] as BaseValue[]) ?? []).every((v) => target.includes(String(v)))
    if (method === 'containsAny')
      return ((args[0] as BaseValue[]) ?? []).some((v) => target.includes(String(v)))
    if (method === 'startsWith') return target.startsWith(String(args[0] ?? ''))
    if (method === 'endsWith') return target.endsWith(String(args[0] ?? ''))
    if (method === 'lower') return target.toLowerCase()
    if (method === 'title') return titleCase(target)
    if (method === 'trim') return target.trim()
    if (method === 'replace') return target.replace(String(args[0] ?? ''), String(args[1] ?? ''))
    if (method === 'split') return target.split(String(args[0] ?? ','))
    if (method === 'slice')
      return target.slice(Number(args[0] ?? 0), args[1] == null ? undefined : Number(args[1]))
  }
  if (typeof target === 'number') {
    if (method === 'round') return Math.round(target)
    if (method === 'toFixed') return target.toFixed(Number(args[0] ?? 0))
    if (method === 'abs') return Math.abs(target)
    if (method === 'ceil') return Math.ceil(target)
    if (method === 'floor') return Math.floor(target)
  }
  if (Array.isArray(target)) {
    if (method === 'contains') return target.some((item) => valueEquals(item, args[0]))
    if (method === 'containsAll')
      return ((args[0] as BaseValue[]) ?? []).every((v) =>
        target.some((item) => valueEquals(item, v)),
      )
    if (method === 'containsAny')
      return ((args[0] as BaseValue[]) ?? []).some((v) =>
        target.some((item) => valueEquals(item, v)),
      )
    if (method === 'join') return target.map(String).join(String(args[0] ?? ', '))
    if (method === 'sort') return [...target].sort(compareValues)
    if (method === 'unique') return [...new Set(target.map(String))]
    if (method === 'slice')
      return target.slice(Number(args[0] ?? 0), args[1] == null ? undefined : Number(args[1]))
    if (method === 'mean') {
      const nums = target.flatMap(numberValues)
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
    }
  }
  if (target && typeof target === 'object' && !(target instanceof Date) && !Array.isArray(target)) {
    if (isDuration(target) && method === 'humanize') return humanizeDuration(target.ms)
    if (method === 'keys') return Object.keys(target)
    if (method === 'values') return Object.values(target) as BaseValue[]
    if (method === 'isEmpty') return Object.keys(target).length === 0
  }
  return null
}

function matchesFilterTree(row: BaseRow, filter: unknown, diagnostics: BaseDiagnostic[]): boolean {
  if (!filter) return true
  if (typeof filter === 'string')
    return truthy(
      safeEvaluate(
        filter,
        { file: row.file, formula: formulaFromRow(row) },
        diagnostics,
        'filters',
      ),
    )
  const record = asRecord(filter)
  if (!record) {
    diagnostics.push({ level: 'warning', message: 'Invalid filter structure.' })
    return true
  }
  if (Array.isArray(record.and))
    return record.and.every((item) => matchesFilterTree(row, item, diagnostics))
  if (Array.isArray(record.or))
    return record.or.some((item) => matchesFilterTree(row, item, diagnostics))
  if (record.not) return !matchesFilterTree(row, record.not, diagnostics)
  if (typeof record.property === 'string') {
    const actual =
      row.values[record.property] ?? resolveProperty(row.file, record.property, formulaFromRow(row))
    if ('equals' in record) return valueEquals(actual, record.equals as BaseValue)
    if ('notEquals' in record) return !valueEquals(actual, record.notEquals as BaseValue)
    if ('contains' in record) return valueContains(actual, record.contains as BaseValue)
  }
  diagnostics.push({
    level: 'warning',
    message: 'Invalid filter object; expected and/or/not or property comparison.',
  })
  return true
}

function formulaFromRow(row: BaseRow): Record<string, BaseValue> {
  return Object.fromEntries(
    Object.entries(row.values)
      .filter(([key]) => key.startsWith('formula.'))
      .map(([key, value]) => [key.slice(8), value]),
  )
}

function computeSummaries(
  rows: BaseRow[],
  summaries: Record<string, unknown>,
  diagnostics: BaseDiagnostic[],
): Record<string, BaseValue> {
  const result: Record<string, BaseValue> = {}
  for (const [key, config] of Object.entries(summaries)) {
    const record = asRecord(config)
    const property = typeof record?.property === 'string' ? record.property : key
    const type =
      typeof record?.type === 'string'
        ? record.type
        : typeof config === 'string' && isSummaryType(config)
          ? config
          : 'filled'
    const values = rows
      .map((row) => row.values[property] ?? resolveProperty(row.file, property))
      .filter((value) => value != null)
    const expression =
      typeof record?.expression === 'string'
        ? record.expression
        : typeof config === 'string' && !isSummaryType(config)
          ? config
          : undefined
    result[key] = expression
      ? safeEvaluate(
          expression,
          {
            file: emptyFile(),
            values: values.length ? values : rows.flatMap((row) => Object.values(row.values)),
          },
          diagnostics,
          `summaries.${key}`,
        )
      : computeSummaryValue(type, values, rows.length)
  }
  return result
}

function computeGroupSummaries(
  rows: BaseRow[],
  summaries: Record<string, unknown>,
  diagnostics: BaseDiagnostic[],
): Record<string, Record<string, BaseValue>> {
  const grouped = new Map<string, BaseRow[]>()
  for (const row of rows) {
    if (!row.groupKey) continue
    grouped.set(row.groupKey, [...(grouped.get(row.groupKey) ?? []), row])
  }
  return Object.fromEntries(
    [...grouped.entries()].map(([group, groupRows]) => [
      group,
      computeSummaries(groupRows, summaries, diagnostics),
    ]),
  )
}

function computeSummaryValue(type: string, values: BaseValue[], rowCount: number): BaseValue {
  const nums = values.flatMap(numberValues)
  const dates = values.flatMap((value) => (value instanceof Date ? [value.getTime()] : []))
  if (type === 'sum') return nums.reduce((a, b) => a + b, 0)
  if (type === 'average') return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
  if (type === 'min') return nums.length ? Math.min(...nums) : null
  if (type === 'max') return nums.length ? Math.max(...nums) : null
  if (type === 'range') return nums.length ? Math.max(...nums) - Math.min(...nums) : null
  if (type === 'median') {
    const sorted = [...nums].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length
      ? sorted.length % 2
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2
      : null
  }
  if (type === 'stddev') {
    if (!nums.length) return null
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length
    return Math.sqrt(nums.reduce((sum, value) => sum + (value - mean) ** 2, 0) / nums.length)
  }
  if (type === 'earliest') return dates.length ? new Date(Math.min(...dates)) : null
  if (type === 'latest') return dates.length ? new Date(Math.max(...dates)) : null
  if (type === 'checked') return values.filter((value) => value === true).length
  if (type === 'unchecked') return values.filter((value) => value === false).length
  if (type === 'unique')
    return [...new Set(values.flatMap((v) => (Array.isArray(v) ? v.map(String) : [String(v)])))]
      .length
  if (type === 'empty') return rowCount - values.length
  return values.length
}

function isSummaryType(value: string): boolean {
  return [
    'average',
    'min',
    'max',
    'sum',
    'range',
    'median',
    'stddev',
    'earliest',
    'latest',
    'checked',
    'unchecked',
    'empty',
    'filled',
    'unique',
  ].includes(value)
}

function emptyFile(): BaseFile {
  return {
    path: '',
    name: '',
    basename: '',
    folder: '',
    ext: '',
    tags: [],
    links: [],
    properties: {},
  }
}

function evalBinary(operator: string, left: BaseValue, right: BaseValue): BaseValue {
  if (operator === '&&') return truthy(left) && truthy(right)
  if (operator === '||') return truthy(left) || truthy(right)
  if (operator === '==') return valueEquals(left, right)
  if (operator === '!=') return !valueEquals(left, right)
  if (operator === '>') return compareValues(left, right) > 0
  if (operator === '<') return compareValues(left, right) < 0
  if (operator === '>=') return compareValues(left, right) >= 0
  if (operator === '<=') return compareValues(left, right) <= 0
  if (operator === '+') {
    const dateSum = addDateDuration(left, right)
    if (dateSum) return dateSum
    const durationSum = addDurations(left, right)
    if (durationSum) return durationSum
    return typeof left === 'number' && typeof right === 'number'
      ? left + right
      : `${left ?? ''}${right ?? ''}`
  }
  if (operator === '-') {
    const dateDiff = subtractDateValues(left, right)
    if (dateDiff !== undefined) return dateDiff
    return Number(left ?? 0) - Number(right ?? 0)
  }
  if (operator === '*') return Number(left ?? 0) * Number(right ?? 0)
  if (operator === '/') return Number(left ?? 0) / Number(right ?? 1)
  if (operator === '%') return Number(left ?? 0) % Number(right ?? 1)
  return null
}

function toDate(value: BaseValue | undefined): Date | null {
  if (value instanceof Date) return value
  if (value == null) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function parseDuration(value: BaseValue | undefined, unit?: BaseValue): BaseValueObject | null {
  if (typeof value === 'number')
    return { type: 'duration', ms: value * unitToMs(String(unit ?? 'ms')) }
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*([A-Za-z]+)$/)
  if (!match) return null
  return { type: 'duration', ms: Number(match[1]) * unitToMs(match[2]) }
}

function unitToMs(unit: string): number {
  const normalized = unit.toLowerCase()
  if (['ms', 'millisecond', 'milliseconds'].includes(normalized)) return 1
  if (['s', 'second', 'seconds'].includes(normalized)) return 1000
  if (['m', 'minute', 'minutes'].includes(normalized)) return 60 * 1000
  if (['h', 'hour', 'hours'].includes(normalized)) return 60 * 60 * 1000
  if (['d', 'day', 'days'].includes(normalized)) return 24 * 60 * 60 * 1000
  if (['w', 'week', 'weeks'].includes(normalized)) return 7 * 24 * 60 * 60 * 1000
  if (['M', 'month', 'months'].includes(unit)) return 30 * 24 * 60 * 60 * 1000
  if (['y', 'year', 'years'].includes(normalized)) return 365 * 24 * 60 * 60 * 1000
  return 1
}

function isDuration(value: BaseValue): value is BaseValueObject & { ms: number } {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !(value instanceof Date) &&
    !Array.isArray(value) &&
    value.type === 'duration' &&
    typeof value.ms === 'number',
  )
}

function addDateDuration(left: BaseValue, right: BaseValue): Date | null {
  if (left instanceof Date && isDuration(right)) return new Date(left.getTime() + right.ms)
  if (right instanceof Date && isDuration(left)) return new Date(right.getTime() + left.ms)
  return null
}

function addDurations(left: BaseValue, right: BaseValue): BaseValueObject | null {
  if (isDuration(left) && isDuration(right)) return { type: 'duration', ms: left.ms + right.ms }
  return null
}

function subtractDateValues(left: BaseValue, right: BaseValue): BaseValue | undefined {
  if (left instanceof Date && isDuration(right)) return new Date(left.getTime() - right.ms)
  if (left instanceof Date && right instanceof Date)
    return { type: 'duration', ms: left.getTime() - right.getTime() }
  if (isDuration(left) && isDuration(right)) return { type: 'duration', ms: left.ms - right.ms }
  return undefined
}

function formatDate(date: Date, format: string): string {
  const parts = {
    yyyy: String(date.getFullYear()),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    dd: String(date.getDate()).padStart(2, '0'),
    HH: String(date.getHours()).padStart(2, '0'),
    mm: String(date.getMinutes()).padStart(2, '0'),
    ss: String(date.getSeconds()).padStart(2, '0'),
  }
  return Object.entries(parts).reduce(
    (output, [token, replacement]) => output.split(token).join(replacement),
    format,
  )
}

function relativeDate(date: Date, from: Date): string {
  return humanizeDuration(date.getTime() - from.getTime())
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
  const label = `${count} ${unit}${count === 1 ? '' : 's'}`
  return ms < 0 ? `${label} ago` : `in ${label}`
}

function compareRows(a: BaseRow, b: BaseRow, sort: BaseSort[]): number {
  for (const entry of sort) {
    const av =
      a.values[entry.property] ?? resolveProperty(a.file, entry.property, formulaFromRow(a))
    const bv =
      b.values[entry.property] ?? resolveProperty(b.file, entry.property, formulaFromRow(b))
    const result = compareValues(av, bv)
    if (result !== 0) return entry.direction === 'desc' ? -result : result
  }
  return 0
}

function compareValues(a: BaseValue, b: BaseValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (isDuration(a) && isDuration(b)) return a.ms - b.ms
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

function valueEquals(actual: BaseValue, expected: BaseValue): boolean {
  if (Array.isArray(actual)) return actual.some((item) => valueEquals(item, expected))
  if (actual instanceof Date && expected instanceof Date)
    return actual.getTime() === expected.getTime()
  if (isDuration(actual) && isDuration(expected)) return actual.ms === expected.ms
  if (isLinkLike(actual) && isLinkLike(expected)) return actual.path === expected.path
  if (isLinkLike(actual) && typeof expected === 'string') return actual.path === expected
  if (typeof actual === 'string' && isLinkLike(expected)) return actual === expected.path
  return String(actual) === String(expected)
}

function isLinkLike(value: BaseValue): value is BaseValueObject & { path: string } {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !(value instanceof Date) &&
    !Array.isArray(value) &&
    typeof value.path === 'string',
  )
}

function valueContains(actual: BaseValue, expected: BaseValue): boolean {
  if (Array.isArray(actual)) return actual.some((item) => valueEquals(item, expected))
  return String(actual ?? '')
    .toLowerCase()
    .includes(String(expected ?? '').toLowerCase())
}

function truthy(value: BaseValue): boolean {
  return Array.isArray(value) ? value.length > 0 : Boolean(value)
}
function numberValues(value: BaseValue): number[] {
  return Array.isArray(value)
    ? value.flatMap(numberValues)
    : typeof value === 'number'
      ? [value]
      : []
}
function titleCase(value: string): string {
  return value
    .replace(/^.*\./, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

type Token = {
  type: 'number' | 'string' | 'identifier' | 'operator' | 'punct' | 'eof'
  value: string
}
function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    const char = source[i]
    if (/\s/.test(char)) {
      i++
      continue
    }
    if (char === '"' || char === "'") {
      const quote = char
      let value = ''
      i++
      while (i < source.length && source[i] !== quote) value += source[i++]
      i++
      tokens.push({ type: 'string', value })
      continue
    }
    if (/\d/.test(char)) {
      let value = ''
      while (i < source.length && /[\d.]/.test(source[i])) value += source[i++]
      tokens.push({ type: 'number', value })
      continue
    }
    const two = source.slice(i, i + 2)
    if (['==', '!=', '>=', '<=', '&&', '||'].includes(two)) {
      tokens.push({ type: 'operator', value: two })
      i += 2
      continue
    }
    if ('+-*/%><!'.includes(char)) {
      tokens.push({ type: 'operator', value: char })
      i++
      continue
    }
    if ('().,[]'.includes(char)) {
      tokens.push({ type: 'punct', value: char })
      i++
      continue
    }
    if (/[A-Za-z_$]/.test(char)) {
      let value = ''
      while (i < source.length && /[A-Za-z0-9_$]/.test(source[i])) value += source[i++]
      tokens.push({ type: 'identifier', value })
      continue
    }
    throw new Error(`Unexpected token ${char}`)
  }
  tokens.push({ type: 'eof', value: '' })
  return tokens
}

class Parser {
  private index = 0
  constructor(private tokens: Token[]) {}
  parse(): ExpressionAst {
    const ast = this.expression(0)
    this.expect('eof')
    return ast
  }
  private current() {
    return this.tokens[this.index]
  }
  private take() {
    return this.tokens[this.index++]
  }
  private expect(type: Token['type'], value?: string) {
    const token = this.take()
    if (token.type !== type || (value && token.value !== value))
      throw new Error(`Expected ${value ?? type}`)
    return token
  }
  private expression(minBp: number): ExpressionAst {
    let left = this.prefix()
    while (true) {
      const token = this.current()
      if (token.type === 'punct' && token.value === '.') {
        this.take()
        const prop = this.expect('identifier').value
        left = { type: 'member', object: left, property: prop }
        continue
      }
      if (token.type === 'punct' && token.value === '(') {
        left = { type: 'call', callee: left, args: this.args() }
        continue
      }
      if (token.type === 'punct' && token.value === '[') {
        this.take()
        const index = this.expression(0)
        this.expect('punct', ']')
        left = { type: 'index', object: left, index }
        continue
      }
      if (token.type !== 'operator') break
      const bp = bindingPower(token.value)
      if (!bp || bp[0] < minBp) break
      const op = this.take().value
      const right = this.expression(bp[1])
      left = { type: 'binary', operator: op, left, right }
    }
    return left
  }
  private prefix(): ExpressionAst {
    const token = this.take()
    if (token.type === 'number') return { type: 'literal', value: Number(token.value) }
    if (token.type === 'string') return { type: 'literal', value: token.value }
    if (token.type === 'identifier') return { type: 'identifier', path: [token.value] }
    if (token.type === 'operator' && token.value === '!')
      return { type: 'unary', operator: '!', argument: this.expression(9) }
    if (token.type === 'punct' && token.value === '(') {
      const ast = this.expression(0)
      this.expect('punct', ')')
      return ast
    }
    throw new Error(`Unexpected ${token.value || token.type}`)
  }
  private args(): ExpressionAst[] {
    this.expect('punct', '(')
    const args: ExpressionAst[] = []
    if (this.current().type === 'punct' && this.current().value === ')') {
      this.take()
      return args
    }
    while (true) {
      args.push(this.expression(0))
      if (this.current().type === 'punct' && this.current().value === ',') {
        this.take()
        continue
      }
      this.expect('punct', ')')
      return args
    }
  }
}

function bindingPower(operator: string): [number, number] | undefined {
  if (operator === '||') return [1, 2]
  if (operator === '&&') return [3, 4]
  if (['==', '!='].includes(operator)) return [5, 6]
  if (['>', '<', '>=', '<='].includes(operator)) return [7, 8]
  if (['+', '-'].includes(operator)) return [9, 10]
  if (['*', '/', '%'].includes(operator)) return [11, 12]
  return undefined
}
