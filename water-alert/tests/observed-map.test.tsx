import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ObservedHistory } from '../src/ObservedHistory'
import { emptyState } from '../server/store'
import { withPlaceCatalog } from '../src/place-catalog'
import type { Language } from '../src/domain'

describe('advisory map supplier reference points', () => {
  it('shows directory reference points even before a feed check', () => {
    const state = emptyState()
    render(<ObservedHistory
      archive={state.archive}
      watches={[]}
      coverageStart={null}
      t={{} as never}
      language={'en' as Language}
      places={withPlaceCatalog(state.places)}
      sources={state.sources}
      now={new Date('2026-11-03T12:00:00Z').getTime()}
      active
      onSources={vi.fn()}
    />)
    expect(document.querySelector('.map-count')).toHaveTextContent('1 / 1')
  })
})