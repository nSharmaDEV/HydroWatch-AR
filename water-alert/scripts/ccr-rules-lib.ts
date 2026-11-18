// Rule-based reader for ADH annual-report (CCR) text. No AI, no key.
//
// It reads only the two sections that carry a report's issues, VIOLATIONS and
// SIGNIFICANT DEFICIENCIES, from the layout-preserved text `pdftotext -layout`
// produces. It is deliberately conservative: it returns issues only when every
// line and every date it sees in those sections is accounted for, and returns
// `unreadable` with a reason otherwise. A wrong issue on a water card is worse
// than none, so it never guesses a row, a column or a category.
//
// Wording and dates are ADH's, as printed. Issue text is English as published;
// only the section headings it recognises carry a Spanish form.
import { REPORT_YEAR, splitPages, titleYear } from './ccr-sync-lib.js'
import type { AnnualReportIssue } from '../src/annual-reports'

export type RulesResult = { ok: true; issues: AnnualReportIssue[]; sections: string[] } | { ok: false; reason: string }
const unreadable = (reason: string): RulesResult => ({ ok: false, reason })

const DATE = /\d{1,2}\/\d{1,2}\/\d{4}/g
/** A column boundary that lands inside a word would corrupt both halves. */
const cutsWord = (line: string, col: number) => col > 0 && col < line.length && /\S/.test(line[col - 1]) && /\S/.test(line[col])
const words = (s: string) => s.toLowerCase().normalize('NFKD').split(/[^a-z0-9]+/).filter(Boolean)
const clean = (s: string) => s.replace(/\s+/g, ' ').trim()
const text = (en: string) => ({ en, es: en })

// Only headings whose meaning is unambiguous are mapped; any other TYPE is unreadable.
const TYPES: { match: RegExp; category: AnnualReportIssue['category']; en: string; es: string }[] = [
  { match: /^(bacteriological|rtcr) monitoring/i, category: 'monitoring', en: 'Bacteriological monitoring', es: 'Monitoreo bacteriológico' },
  { match: /^(state|operator) licensing/i, category: 'licensing', en: 'State licensing', es: 'Licencia estatal' },
  { match: /^public (education|notice)/i, category: 'publicNotice', en: 'Public notice', es: 'Aviso público' },
]

/** A contaminant or upstream result row marked Y needs a person: it is not a table row this reader understands. */
function flaggedResultRow(page: string) {
  return page.split('\n').some(line => /(^|\s)Y(\s|$)/.test(line) && /\b(ppb|ppm|ppt|NTU|pCi\/L|TT|MCL|Violation)\b/i.test(line) && !/^\s*TYPE:/i.test(line))
}

function violationSection(lines: string[]) {
  const start = lines.findIndex(l => /^\s*VIOLATIONS\b/.test(l))
  if (start < 0) return undefined
  const body: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (/SIGNIFICANT DEFICIEN/i.test(line) || /^\s*CCR\s+\d\d\b/.test(line) || /This institution is an equal/i.test(line)) break
    body.push(line)
  }
  return body
}

interface Row { heading: string; title: string[]; periods: { from: string; through: string }[]; action: string[] }

function parseViolations(lines: string[], page: number): AnnualReportIssue[] | string {
  const dateLines = lines.filter(l => (l.match(DATE) ?? []).length)
  if (!dateLines.length) return 'violations section has no dated rows'
  // Column geometry comes from the dated rows themselves: the left text sits
  // before the first date, the action after the second.
  const fromCol = Math.min(...dateLines.map(l => l.search(DATE)))
  const toEnd = Math.min(...dateLines.map(l => { const m = [...l.matchAll(DATE)]; return m.length === 2 ? m[1].index! + m[1][0].length : Infinity }))
  if (!Number.isFinite(toEnd)) return 'a dated row does not have exactly a from and a to date'
  const rows: Row[] = []
  let heading = '', current: Row | undefined, pendingTitle: string[] = [], pendingAction: string[] = [], consumed = 0
  const close = () => { if (current) rows.push(current); current = undefined }
  for (const line of lines) {
    if (!line.trim()) continue
    const type = /^\s*TYPE:\s*(.*?)(?:\s{2,}|$)/.exec(line)
    if (type) { close(); heading = clean(type[1]); pendingTitle = []; pendingAction = [] }
    const dates = [...line.matchAll(DATE)]
    const body = type ? line.replace(/^\s*TYPE:.*?(?=\s{2,}FROM:|\s{2,}\S|$)/, '') : line
    if (/FROM:\s+TO:|CORRECTIVE ACTION:/.test(line)) continue
    if (!dates.length) {
      if (cutsWord(body, fromCol) || cutsWord(body, toEnd)) return 'a column boundary falls inside a word'
      const left = clean(body.slice(0, fromCol)), action = clean(body.slice(toEnd))
      if (!heading) return 'text before any TYPE heading'
      if (left) (current ? current.title : pendingTitle).push(left)
      if (action) (current ? current.action : pendingAction).push(action)
      continue
    }
    if (dates.length !== 2) return 'a dated row does not have exactly a from and a to date'
    consumed += 2
    const left = clean(body.slice(0, dates[0].index)), action = clean(body.slice(dates[1].index! + dates[1][0].length))
    const period = { from: dates[0][0], through: dates[1][0] }
    // A date line with no left text, or one that continues a lowercase phrase,
    // is another period of the same finding rather than a new finding.
    if (current && (!left || /^[a-z]/.test(left))) {
      current.periods.push(period)
      if (left) current.title.push(left)
      if (action) current.action.push(action)
    } else {
      close()
      current = { heading, title: [...pendingTitle, ...(left ? [left] : [])], periods: [period], action: [...pendingAction, ...(action ? [action] : [])] }
      pendingTitle = []; pendingAction = []
    }
  }
  close()
  if (pendingTitle.length || pendingAction.length) return 'text left over after the last dated row'
  const dateCount = lines.reduce((n, l) => n + (l.match(DATE) ?? []).length, 0)
  if (dateCount !== consumed) return 'a date in the violations section was not accounted for'
  const issues: AnnualReportIssue[] = []
  for (const row of rows) {
    const known = TYPES.find(t => t.match.test(row.heading))
    if (!known) return `unrecognised violation type “${row.heading}”`
    const title = clean(row.title.join(' ')), action = clean(row.action.join(' '))
    if (!title) return 'a violation row has no description'
    for (const period of row.periods) {
      issues.push({ category: known.category, heading: { en: known.en, es: known.es }, title: text(title), action: text(action || 'None listed'), reportedFrom: period.from, reportedThrough: period.through, page })
    }
  }
  return issues
}

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'
const surveyDate = (intro: string) => new RegExp(`${DATE.source}|(?:${MONTHS})\\s+\\d{1,2},\\s*\\d{4}`).exec(intro)?.[0]

function parseDeficiencies(lines: string[], page: number): AnnualReportIssue[] | string {
  const start = lines.findIndex(l => /SIGNIFICANT DEFICIEN/i.test(l) && l.trim().length < 60)
  const header = lines.findIndex((l, i) => i > start && /Nature of Deficienc/i.test(l) && /Progress to Date/i.test(l))
  if (start < 0 || header < 0) return 'deficiencies heading found but not its table'
  let col = lines[header].indexOf('Progress to Date')
  // The header is centred over its column, so the right text can start a little
  // left of it. Where a line holds only right-column text, that is the true edge.
  const rightOnly = lines.slice(header + 1).filter(l => /^\s{30,}\S/.test(l)).map(l => l.search(/\S/))
  if (rightOnly.length) col = Math.min(col, ...rightOnly)
  const survey = surveyDate(lines.slice(start + 1, header).join(' '))
  const left: string[] = [], right: string[] = []
  for (const line of lines.slice(header + 1)) {
    if (/This institution is an equal/i.test(line) || /^\s*CCR\s+\d\d\b/.test(line)) break
    if (!line.trim()) continue
    if (cutsWord(line, col)) return 'a column boundary falls inside a word'
    const l = clean(line.slice(0, col)), r = clean(line.slice(col))
    if (l) left.push(l)
    if (r) right.push(r)
  }
  const title = clean(left.join(' '))
  if (!title) return 'deficiencies table has no description'
  return [{
    category: 'significantDeficiency', heading: { en: 'Significant deficiencies', es: 'Deficiencias significativas' },
    dateLabel: { en: 'Survey / inspection date reported', es: 'Fecha de inspección reportada' },
    title: text(title), action: text(clean(right.join(' ')) || 'None listed'), page,
    ...(survey ? { reportedFrom: survey } : {}),
  }]
}

export function readByRules(text: string, pageCount: number): RulesResult {
  const pages = splitPages(text)
  if (!pageCount || pages.length !== pageCount) return unreadable('extracted text pages do not match the PDF')
  if (titleYear(pages[0]) !== REPORT_YEAR) return unreadable('printed report year is not 2025')
  const issues: AnnualReportIssue[] = []
  const sections: string[] = []
  for (const [i, page] of pages.entries()) {
    const lines = page.split('\n')
    if (flaggedResultRow(page)) return unreadable('a result row is marked Y; needs a person or the AI reader')
    const violations = violationSection(lines)
    if (violations) {
      const parsed = parseViolations(violations, i + 1)
      if (typeof parsed === 'string') return unreadable(parsed)
      issues.push(...parsed); sections.push('violations')
    }
    if (lines.some(l => /SIGNIFICANT DEFICIEN/i.test(l) && l.trim().length < 60)) {
      const parsed = parseDeficiencies(lines, i + 1)
      if (typeof parsed === 'string') return unreadable(parsed)
      issues.push(...parsed); sections.push('deficiencies')
    }
  }
  // Last line of defence: nothing shown may contain a word the page does not.
  for (const issue of issues) {
    const onPage = new Set(words(pages[issue.page - 1]))
    const stray = words(`${issue.title.en} ${issue.action.en}`).find(w => !onPage.has(w))
    if (stray) return unreadable(`output word “${stray}” is not on page ${issue.page}`)
  }
  return { ok: true, issues, sections }
}
