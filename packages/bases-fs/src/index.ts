import yaml from 'js-yaml'
import type { BaseFile, BaseValue } from '@bases-react/core'
export { parseBaseFile, parseBase } from '@bases-react/core'

export function loadMarkdownFiles(
  modules: Record<string, string | { default?: string }>,
): BaseFile[] {
  return Object.entries(modules).map(([path, mod]) =>
    parseMarkdownFile(path, typeof mod === 'string' ? mod : String(mod.default ?? '')),
  )
}

export function parseMarkdownFile(path: string, source: string): BaseFile {
  const { frontmatter, body } = parseFrontmatter(source)
  const normalizedPath = path.replace(/^\.\.\//, '').replace(/^\.\//, '')
  const name = normalizedPath.split('/').pop() ?? normalizedPath
  const ext = name.includes('.') ? (name.split('.').pop() ?? '') : ''
  const basename = ext ? name.slice(0, -(ext.length + 1)) : name
  const folder = normalizedPath.includes('/')
    ? normalizedPath.slice(0, normalizedPath.lastIndexOf('/'))
    : ''
  const tags = unique([...toStringArray(frontmatter.tags), ...extractTags(body)])
  return {
    path: normalizedPath,
    name,
    basename,
    folder,
    ext,
    tags,
    links: extractWikiLinks(body),
    properties: frontmatter,
  }
}

function parseFrontmatter(source: string): {
  frontmatter: Record<string, BaseValue>
  body: string
} {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: source }
  try {
    const parsed = yaml.load(match[1], { json: true })
    return { frontmatter: normalizeYamlRecord(parsed), body: match[2] ?? '' }
  } catch {
    return { frontmatter: {}, body: match[2] ?? '' }
  }
}

function normalizeYamlRecord(value: unknown): Record<string, BaseValue> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      normalizeValue(entry),
    ]),
  )
}

function normalizeValue(value: unknown): BaseValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date
  )
    return value
  if (value === undefined) return null
  if (Array.isArray(value)) return value.map(normalizeValue)
  if (typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        normalizeValue(entry),
      ]),
    )
  return String(value)
}

function toStringArray(value: BaseValue | undefined): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') return [value]
  return []
}

function extractTags(body: string): string[] {
  return [...body.matchAll(/(^|\s)#([\p{L}\p{N}/_-]+)/gu)].map((match) => match[2])
}

function extractWikiLinks(body: string): string[] {
  return [...body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((match) => match[1])
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}
