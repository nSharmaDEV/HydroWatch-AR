import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
if (typeof window !== 'undefined') window.scrollTo = vi.fn()
// jsdom lacks native modal methods; browser checks exercise real focus containment.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); this.querySelector<HTMLElement>('button')?.focus() }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) }
}
afterEach(() => { cleanup(); if (typeof localStorage !== 'undefined') localStorage.clear() })
