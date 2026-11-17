import { describe, expect, it } from 'vitest'
import { helpExample, selectedHelpExample } from '../src/help-prompts'
import type { IssueType } from '../src/help-requests'

describe('Help field examples', () => {
  it.each(['service', 'quality', 'billing', 'advisory', 'report', 'other', 'legal'] as IssueType[])('offers concise, distinct examples for %s in both languages', issue => {
    for (const es of [false, true]) {
      const observation = helpExample(issue, 'description', es)
      const action = helpExample(issue, 'action', es)
      expect(observation).toMatch(es ? /^Por ejemplo:/ : /^For example:/)
      expect(action).toMatch(es ? /^Por ejemplo:/ : /^For example:/)
      expect(observation).not.toBe(action)
      expect(observation.length).toBeLessThan(120)
      expect(action.length).toBeLessThan(120)
    }
  })
})

describe('selection-aware examples', () => {
  it('suggests relevant media for color and pressure, but not smell', () => {
    expect(selectedHelpExample('quality', 'description', false, { first: 'An unusual color' }, {})).toMatch(/color.*photo or video/i)
    expect(selectedHelpExample('quality', 'description', false, { second: 'An unusual smell' }, {})).not.toMatch(/photo|video/i)
    expect(selectedHelpExample('service', 'description', false, { second: 'Lower pressure than usual' }, {})).toMatch(/pressure.*video/i)
  })
  it('tailors actions to selected requests and uses a neutral fallback for multiple selections', () => {
    expect(selectedHelpExample('service', 'action', false, {}, { second: 'Share an update' })).toMatch(/update/i)
    expect(selectedHelpExample('quality', 'action', false, { first: 'An unusual color' }, { first: 'Investigate' })).toMatch(/photo|video/i)
    expect(selectedHelpExample('quality', 'description', false, { first: 'color', second: 'smell' }, {})).not.toMatch(/photo|video/i)
    expect(selectedHelpExample('quality', 'description', true, { second: 'olor' }, {})).toMatch(/olor/i)
  })
})
