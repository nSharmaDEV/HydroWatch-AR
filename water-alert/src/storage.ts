import type { Language, Mode } from './domain'
export interface Preferences { watches: string[]; language: Language; liftWatches: string[]; checkOnOpen: boolean }
export const defaults = (): Preferences => ({ watches: [], language: 'en', liftWatches: [], checkOnOpen: true })
export function loadPreferences(mode: Mode): Preferences {
  try {
    const value = JSON.parse(localStorage.getItem(`water-alert:${mode}:v1`) ?? 'null')
    if (!value || !Array.isArray(value.watches) || !value.watches.every((v: unknown) => typeof v === 'string') || !Array.isArray(value.liftWatches) || !value.liftWatches.every((v: unknown) => typeof v === 'string') || !['en', 'es'].includes(value.language) || typeof value.checkOnOpen !== 'boolean') return defaults()
    return { watches: value.watches, language: value.language, liftWatches: value.liftWatches, checkOnOpen: value.checkOnOpen }
  } catch { return defaults() }
}
export function savePreferences(mode: Mode, value: Preferences) {
  try { localStorage.setItem(`water-alert:${mode}:v1`, JSON.stringify(value)); return true } catch { return false }
}
