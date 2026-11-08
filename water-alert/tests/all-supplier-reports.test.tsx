import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { ANNUAL_REPORTS, LEISURE_HILLS_ID, VILLAGE_WATER_ID } from '../src/annual-reports'
import { AnnualWaterReport } from '../src/AnnualWaterReport'
import { SupplierInformation } from '../src/SupplierProfile'

it.each(Object.keys(ANNUAL_REPORTS).flatMap(id => (['en', 'es'] as const).map(language => ({ id, language }))))('keeps $id $language findings inside the warning panel without the redundant tools entry', async ({ id, language }) => {
  const user = userEvent.setup()
  const { container } = render(<SupplierInformation place={{ id, name: id, county: 'Arkansas', kind: 'system' }} language={language} sample={false} onView={() => {}} />)
  await user.click(screen.getByRole('button', { name: language === 'en' ? /^Provider information/ : /^Información del proveedor/ }))
  expect(screen.queryByRole('button', { name: /Supplier details & tools|Detalles y herramientas del proveedor/ })).toBeNull()
  const toggle = container.querySelector<HTMLButtonElement>('.report-toggle')
  if (toggle) {
    const panel = container.querySelector('.report-summary-issues')!
    expect(panel).toHaveClass('provider-card')
    // Findings keep the heading to "Annual report ··· PDF" (count lives in the chip); the toggle sits inside the same card.
    expect(panel.querySelector('.provider-card-heading .status-pill')).toBeNull()
    expect(panel.querySelector('.provider-card-heading h4 .sr-only')).not.toBeNull()
    expect(panel).toContainElement(toggle)
    await user.click(toggle)
    const issues = document.getElementById(toggle.getAttribute('aria-controls')!)!
    expect(panel).toContainElement(issues)
    expect(issues).toBeVisible()
    expect(panel.querySelectorAll('.report-issues>ol>li').length).toBeGreaterThan(0)
    await user.click(toggle)
    expect(issues).not.toBeVisible()
  }
})

const gurdon = 'ADH:734db608102088dbce04b8d92156cc248a9cc375a70905fe288aca9f5f550c4a'
const centralLogan = 'ADH:410e67db91f7d62c58b60070829a626df9b22f370e9f034925149311abe84287'
const riverside = 'ADH:12bb8f46cb9fd02f88bf88b6d20172df4c34e235781dd5d43199b24761259eba'

it('covers the 46 currently offered suppliers without treating missing reports as clean', () => {
  expect(Object.keys(ANNUAL_REPORTS)).toHaveLength(46)
  const reports = Object.values(ANNUAL_REPORTS).flat()
  expect(reports.filter(r => r.state === 'reviewed')).toHaveLength(41)
  expect(reports.filter(r => r.state === 'unreviewed')).toHaveLength(1)
  expect(reports.filter(r => r.state === 'unavailable')).toHaveLength(4)
  for (const report of reports) expect(report.year).toBe(2025)
})

it.each([
  ['ADH:573b41ace89198422234fda05a66c8043cfaf5b9110349079912b75c64741bd0', '068', 1, 2],
  ['ADH:e3a609125c8dbbdc5a0f94d2b9f301a5ea1bf1c8a7fdb26411b27070ada05b9c', '498', 1, 2],
  ['ADH:2c15921bcf6d2b37db97fbab65ba8adde0b65ca7cb8654a0dfe547bb7036dd09', '459', 1, 2],
  ['ADH:74ade4dfe3721f77ed2756a11406ffc00e45dbdbcc6c956745dbb8573d4153ea', '882', 1, 2],
  ['ADH:0f8b954e9aa2f3d1deeb3b2b8125ca21afe1e6716b670b5a6ca3449f03a6219d', '388', 1, 2],
  [centralLogan, '845', 2, 2],
  ['ADH:39e0d7b57f74fdf7084a73ed951a0068e326d23223986d271b4d4f2ee8845e35', '837', 1, 2],
  ['ADH:f8b097675075d67ac8a3501f358dd18c8d8ea84afa903488c53b50d35ce93c87', '772', 1, 3],
  ['ADH:b603457dbbdc01ccdf6783a16bdd384e032259488d9e4eed5dcd872aa1557c89', '857', 1, 2],
  ['ADH:a505cc396de76ffa77fbb8ef7caff101fd0a7cfa3198841287784d13d89ad9c7', '042', 3, 3],
  ['ADH:02cb014bef8a82412f4e855b029446ca9bdeade1bd8655f44abb39350e718682', '500', 4, 2],
  ['ADH:1f17d89c87a89f004a71c5917ebc694d83031c66eabf12e52a59f855baa1daa0', '735', 2, 2],
  ['ADH:2d4c0fafe8c636fbc7555d68cec719635be1e66e6eccf62f71269a6a4a2a19dd', '063', 3, 2],
  ['ADH:6e9a20f3e00cb91c44f1085265928d4ad99e308ef8bd53ef628c89f8a753162b', '507', 1, 3],
  ['ADH:dbf53925bdd33aa59425250c763c498e78d49d9b9dafa33585f495b829f2d212', '492', 2, 3],
  [gurdon, '087', 1, 2],
  ['ADH:d1bf471be8487e1b4003bb2e98916593413537252b895fe5a05f3e68f29f081d', '352', 1, 2],
  ['ADH:4822f1d434ff61879c00969ae7478b76dd5920b3c441521a060300be10fb1873', '1075', 1, 2],
] as const)('keeps %s findings on the exact system PDF and physical page', (id, pws, count, page) => {
  const report = ANNUAL_REPORTS[id]?.[0]
  expect(report?.state).toBe('reviewed')
  if (report?.state !== 'reviewed') return
  expect(report.url).toBe(`https://health.arkansas.gov/eng/d.aspx?P=${pws}&YEAR=2025`)
  expect(report.issues).toHaveLength(count)
  for (const issue of report.issues) {
    expect(issue.page).toBe(page)
    expect(issue.title.en).toBeTruthy()
    expect(issue.title.es).toBeTruthy()
    expect(issue.action.en).toBeTruthy()
    expect(issue.action.es).toBeTruthy()
  }
})

it.each(['en', 'es'] as const)('shows Gurdon deficiencies with source and historical limits in %s', async language => {
  const es = language === 'es'
  render(<AnnualWaterReport reports={ANNUAL_REPORTS[gurdon] ?? []} language={language} />)
  expect(Array.from(document.querySelectorAll('.report-category-list li'), node => node.textContent)).toEqual([es ? '1 Deficiencia significativa' : '1 Significant deficiency'])
  expect(screen.queryByText(/Historical report|Informe histórico/)).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: es ? 'Ver 1 hallazgo' : 'View 1 finding' }))
  expect(screen.getByText(/04\/22\/2025/)).toBeVisible()
  expect(screen.getByText(es ? /lubricante.*grado alimentario/ : /lubricant.*food-grade/)).toBeVisible()
  expect(screen.getByRole('link', { name: es ? 'Informe, página 2' : 'Report, page 2' })).toHaveAttribute('href', 'https://health.arkansas.gov/eng/d.aspx?P=087&YEAR=2025#page=2')
  expect(screen.getByText(es ? /Este informe de 2025 es histórico; no es una evaluación actual/ : /This 2025 report is historical, not a current compliance/)).toBeVisible()
})

it('counts a finding printed with two intervals once in the categories list (Salem)', () => {
  // Salem Water Users LLC, PWS 492: two source rows for one finding with separate intervals.
  const salem = ANNUAL_REPORTS['ADH:dbf53925bdd33aa59425250c763c498e78d49d9b9dafa33585f495b829f2d212']
  render(<AnnualWaterReport reports={salem} language="en" />)
  const counts = Array.from(document.querySelectorAll('.report-category-count'), node => Number(node.textContent))
  expect(counts).toEqual([1])
  expect(screen.getByRole('button', { name: /^View 1 / })).toBeVisible()
})

it('exposes Central Logan’s contradictory HAA5 statements without a clean finding', async () => {
  render(<AnnualWaterReport reports={ANNUAL_REPORTS[centralLogan] ?? []} language="en" />)
  expect(screen.getByText(/table.*Y.*footnote.*no violations/i)).toBeVisible()
  expect(screen.queryByText('No violations reported')).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'View 2 findings' }))
  expect(screen.getByRole('heading', { name: /HAA5.*conflict/ })).toBeVisible()
  expect(screen.getAllByText('Not provided in the report').length).toBeGreaterThan(0)
})

it.each(['en', 'es'] as const)('explains a missing transient-system PDF with directory provenance in %s', async language => {
  const es = language === 'es'
  render(<AnnualWaterReport reports={ANNUAL_REPORTS[riverside] ?? []} language={language} />)
  expect(screen.getByText(es ? 'No se encontró informe de 2025' : 'No 2025 report found')).toBeVisible()
  // No document, so no historical-document caveat and no bold year implying one exists.
  expect(screen.queryByText(es ? /Informe histórico/ : /Historical report/)).toBeNull()
  expect(screen.getByRole('heading', { name: es ? 'Informe anual' : 'Annual report' })).toBeVisible()
  expect(screen.getByText(es ? /transitorio no comunitario/ : /transient non-community/)).toBeVisible()
  expect(screen.getByRole('link', { name: es ? 'Directorio de ADH' : 'ADH directory' })).toHaveAttribute('href', 'https://health.arkansas.gov/eng/WS.aspx?ID=T0467')
  expect(screen.queryByText('No violations reported')).toBeNull()
})

it('records the Nov 7, 2026 batch with its own review date and no invented findings', () => {
  const clean = { '366': 'ADH:bb6a0aa1382bcc8f9601a373787af07a4417c969236d8b26cdeb8c394c09a74f', '371': 'ADH:dd0c55cca8bf449b3f415c40312ee2da965c2e0b15d053a40e2d8da8ada8cd20', '306': 'ADH:16a31dc011c391cdb733b42db4608fdac7c088f71b22c5d7c1ba42d34bb31841', '452': 'ADH:b7db04ae8b18e90d01194739cab0a5929fecf1131d014c4ebf31903efade1f81', '868': 'ADH:a22c9f829de3dcc786845de6e2019a0449eb002c08e2b61265357f1b788dd6bc', '525': 'ADH:4a74934a1f0a929abb23264229fec04364722bc065a1246e0c4ed52b9a60b324', '140': 'ADH:61c7e65a2b401bf11e1afc021445d676e894ab790911718270d364d09618063a' }
  for (const [pws, id] of Object.entries(clean)) {
    const report = ANNUAL_REPORTS[id]?.[0]
    expect(report, pws).toMatchObject({ state: 'reviewed', reviewedOn: '2026-11-07', url: `https://health.arkansas.gov/eng/d.aspx?P=${pws}&YEAR=2025`, issues: [] })
  }
  const northHoward = ANNUAL_REPORTS['ADH:4822f1d434ff61879c00969ae7478b76dd5920b3c441521a060300be10fb1873']?.[0]
  expect(northHoward).toMatchObject({ reviewedOn: '2026-11-07', issues: [{ category: 'monitoring', reportedFrom: '12/1/2025', reportedThrough: '12/31/2025', page: 2 }] })
})

it('maps Village Water LLC to the same PWS 747 report as Leisure Hills by ADH directory ID', () => {
  expect(ANNUAL_REPORTS[VILLAGE_WATER_ID]).toBe(ANNUAL_REPORTS[LEISURE_HILLS_ID])
  expect(ANNUAL_REPORTS[VILLAGE_WATER_ID]?.[0]).toHaveProperty('url', 'https://health.arkansas.gov/eng/d.aspx?P=747&YEAR=2025')
})

it.each([
  ['ADH:bc78112e18850b3c73772317623bb248d573780fa1fa9ddfc27be31e06772796', 'N0009', /non-transient non-community/],
  ['ADH:59ea414b9de925682e918f76f10c1f537214a14af92b033ee92df0846dda6382', 'T0467', /a transient non-community/],
] as const)('keeps %s unavailable with its ADH directory ID instead of a clean result', async (id, pws, type) => {
  render(<AnnualWaterReport reports={ANNUAL_REPORTS[id] ?? []} language="en" />)
  expect(screen.getByText('No 2025 report found')).toBeVisible()
  expect(screen.getByText(type)).toHaveTextContent(/Checked Nov 7, 2026/)
  expect(screen.getByRole('link', { name: 'ADH directory' })).toHaveAttribute('href', `https://health.arkansas.gov/eng/WS.aspx?ID=${pws}`)
  expect(screen.queryByText('No violations reported')).toBeNull()
})
