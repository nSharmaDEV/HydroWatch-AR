import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import App from '../src/App'
import { EMPTY_SOURCES } from '../src/domain'
import { en, es } from '../src/strings'

it.each(['en', 'es'] as const)('opens existing sources coverage from the %s card info button only', async language => {
  const place = { id: 'ADH:home-source-test', name: 'Test supplier', county: 'Benton', kind: 'system' as const }
  localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [place.id], language, liftWatches: [], checkOnOpen: false }))
  render(<App liveData={{ places: [place], sources: EMPTY_SOURCES, archive: [], coverageStart: null }} />)
  const t = language === 'en' ? en : es
  expect(document.querySelector('.home-alert-options .delivery-status')).toBeNull()
  expect(screen.queryByRole('button', { name: t.manageAlerts })).not.toBeInTheDocument()
  expect(screen.getByRole('switch', { name: t.waterUpdates })).toBeVisible()
  expect(screen.queryByRole('button', { name: t.sources })).not.toBeInTheDocument()
  const info = screen.getByRole('button', { name: language === 'en' ? 'Sources and coverage' : 'Fuentes y cobertura' })
  expect(info).not.toHaveAttribute('aria-haspopup', 'dialog')
  await userEvent.setup().click(info)
  expect(screen.getByRole('heading', { level: 1, name: t.sources })).toBeVisible()
  expect(screen.getByRole('heading', { name: t.coverageHeading })).toBeVisible()
})
