import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRef, useState, type ComponentProps } from 'react'
import { useDisclosureMotion, useMotionPresence, useContentMotion, closeMotionDialog } from '../src/interface-motion'

function MotionDetails(props: ComponentProps<'details'>) {
  const ref = useRef<HTMLDetailsElement>(null)
  useDisclosureMotion(ref)
  return <details {...props} ref={ref} />
}

const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
afterEach(() => {
  vi.restoreAllMocks(); vi.unstubAllGlobals()
  if (originalAnimate) Object.defineProperty(Element.prototype, 'animate', originalAnimate)
  else Reflect.deleteProperty(Element.prototype, 'animate')
})

function animationDriver() {
  const pending: { finish: () => void; cancel: ReturnType<typeof vi.fn> }[] = []
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return { height: this instanceof HTMLDetailsElement && this.open ? 220 : 44, width: 300, x: 0, y: 0, top: 0, left: 0, bottom: 220, right: 300, toJSON() {} }
  })
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: vi.fn(() => {
    let resolve!: () => void
    const finished = new Promise<void>(done => { resolve = done })
    const entry = { finish: resolve, cancel: vi.fn() }
    pending.push(entry)
    return { finished, cancel: entry.cancel }
  }) })
  return pending
}

describe('interface motion', () => {
  it('hides the collapsed panel before releasing the final animation frame', async () => {
    const pending = animationDriver()
    function Panel() {
      const [open, setOpen] = useState(true)
      const motion = useMotionPresence(open, 'slide')
      return <><button onClick={() => setOpen(false)}>Finish collapse</button><div ref={motion.ref} hidden={!motion.present} inert={!open}>Closing panel</div></>
    }
    render(<Panel />)
    fireEvent.click(screen.getByText('Finish collapse'))
    const panel = screen.getByText('Closing panel')
    const hiddenAtRelease: boolean[] = []
    pending.at(-1)!.cancel.mockImplementation(() => { hiddenAtRelease.push(panel.hidden) })
    await act(async () => pending.at(-1)!.finish())
    expect(hiddenAtRelease.length).toBeGreaterThan(0)
    expect(hiddenAtRelease.every(Boolean)).toBe(true)
    expect(panel).not.toBeVisible()
  })

  it('sizes the clipped reveal continuously and retains it through collapse', async () => {
    const pending = animationDriver()
    function Panel() {
      const [open, setOpen] = useState(true)
      const motion = useMotionPresence(open, 'slide')
      return <><button onClick={() => setOpen(false)}>Collapse</button><div ref={motion.ref} hidden={!motion.present} inert={!open}>Panel content</div></>
    }
    render(<Panel />)
    expect(Element.prototype.animate).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration: 567, easing: 'cubic-bezier(.31,.24,.14,1)' }))
    expect(Element.prototype.animate).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ height: '0px' }), expect.objectContaining({ height: '44px' })]), expect.anything())
    expect(screen.getByText('Panel content').style.overflow).toBe('clip')
    fireEvent.click(screen.getByText('Collapse'))
    expect(Element.prototype.animate).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration: 567 }))
    expect(screen.getByText('Panel content')).toBeVisible()
    await act(async () => pending.at(-1)!.finish())
    expect(screen.getByText('Panel content')).not.toBeVisible()
    expect(screen.getByText('Panel content').style.overflow).toBe('')
  })
  it('keeps native disclosure content available until closing finishes, then restores natural height', async () => {
    const pending = animationDriver()
    render(<MotionDetails><summary>More information</summary><button>Content action</button></MotionDetails>)
    const summary = screen.getByText('More information'), details = summary.closest('details')!
    fireEvent.click(summary)
    expect(Element.prototype.animate).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration: 520 }))
    expect(details.open).toBe(true)
    await act(async () => pending.at(-1)!.finish())
    expect(details.style.height).toBe('')
    fireEvent.click(summary)
    expect(Element.prototype.animate).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration: 380 }))
    expect(details.open).toBe(true)
    expect((screen.getByText('Content action') as HTMLElement).inert).toBe(true)
    await act(async () => pending.at(-1)!.finish())
    expect(details.open).toBe(false)
    expect(details.style.height).toBe('')
    expect((screen.getByText('Content action') as HTMLElement).inert).not.toBe(true)
  })

  it('reverses the reveal without obsolete closes or transforming following rows', async () => {
    const pending = animationDriver()
    function Card() {
      const [open, setOpen] = useState(false)
      const motion = useMotionPresence(open, 'slide')
      return <article className="supplier-card"><button onClick={() => setOpen(v => !v)}>Toggle panel</button><div ref={motion.ref} hidden={!motion.present} inert={!open}>Sliding content</div><p>Following row</p></article>
    }
    render(<Card />)
    fireEvent.click(screen.getByText('Toggle panel'))
    const card = screen.getByText('Sliding content').closest('.supplier-card')!
    expect(vi.mocked(Element.prototype.animate).mock.contexts).not.toContain(card)
    expect(pending).toHaveLength(1) // One sized viewport; following rows stay in normal flow.
    expect(vi.mocked(Element.prototype.animate).mock.contexts).not.toContain(screen.getByText('Following row'))
    await act(async () => pending.forEach(animation => animation.finish()))
    fireEvent.click(screen.getByText('Toggle panel'))
    const obsolete = pending.slice(1)
    fireEvent.click(screen.getByText('Toggle panel'))
    await act(async () => obsolete.forEach(animation => animation.finish()))
    expect(screen.getByText('Sliding content')).toBeVisible()
    expect(screen.getByText('Sliding content')).not.toHaveAttribute('inert')
    await act(async () => pending.forEach(animation => animation.finish()))
    const calls = vi.mocked(Element.prototype.animate).mock.calls
    expect(calls.flatMap(([frames]) => frames as Keyframe[]).some(frame => frame.height === '0px')).toBe(true)
    fireEvent.click(screen.getByText('Toggle panel'))
    await act(async () => pending.forEach(animation => animation.finish()))
    expect(screen.getByText('Sliding content')).not.toBeVisible()
    expect(screen.getByText('Following row').style.transform).toBe('')
    expect(vi.mocked(Element.prototype.animate).mock.contexts).not.toContain(card)
  })

  it('finishes sliding exits immediately when reduced motion changes live', async () => {
    const pending = animationDriver()
    const events = new EventTarget()
    const media = { matches: false, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) }
    vi.stubGlobal('matchMedia', () => media)
    function Panel() {
      const [open, setOpen] = useState(true)
      const motion = useMotionPresence(open, 'slide')
      return <><button onClick={() => setOpen(false)}>Close slide</button><div ref={motion.ref} hidden={!motion.present} inert={!open}>Accessible slide</div></>
    }
    render(<Panel />)
    fireEvent.click(screen.getByText('Close slide'))
    act(() => { media.matches = true; events.dispatchEvent(new Event('change')) })
    expect(screen.getByText('Accessible slide')).not.toBeVisible()
    expect(pending.every(animation => animation.cancel.mock.calls.length > 0)).toBe(true)
  })

  it('reverses a closing disclosure instead of running an obsolete completion', async () => {
    const pending = animationDriver()
    render(<MotionDetails open><summary>More</summary><p>Long content</p></MotionDetails>)
    fireEvent.click(screen.getByText('More'))
    const closing = pending.at(-1)!
    fireEvent.click(screen.getByText('More'))
    await act(async () => closing.finish())
    expect(screen.getByText('More').closest('details')!.open).toBe(true)
    await act(async () => pending.at(-1)!.finish())
    expect(screen.getByText('More').closest('details')!.style.height).toBe('')
  })

  it('retains a noninteractive popup for its exit, and removes it afterwards', async () => {
    const pending = animationDriver()
    function Popup() {
      const [open, setOpen] = useState(true)
      const { present, ref } = useMotionPresence(open)
      return <><button onClick={() => setOpen(false)}>Dismiss</button>{present ? <div ref={ref} inert={!open} aria-hidden={!open || undefined} role="dialog">Sources</div> : null}</>
    }
    render(<Popup />)
    expect(Element.prototype.animate).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration: 360 }))
    fireEvent.click(screen.getByText('Dismiss'))
    expect(Element.prototype.animate).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration: 320 }))
    expect(screen.getByText('Sources')).toHaveAttribute('inert')
    await act(async () => pending.at(-1)!.finish())
    expect(screen.queryByText('Sources')).not.toBeInTheDocument()
  })

  it('changes content immediately without motion when reduced motion is requested', () => {
    const pending = animationDriver()
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    function Page() {
      const ref = useRef<HTMLDivElement>(null), [page, setPage] = useState('Home')
      const change = useContentMotion(ref)
      return <div ref={ref}><button onClick={() => change(() => setPage('Places'), 'forward')}>Go</button><h1>{page}</h1></div>
    }
    render(<Page />)
    fireEvent.click(screen.getByText('Go'))
    expect(screen.getByRole('heading')).toHaveTextContent('Places')
    expect(pending).toHaveLength(0)
  })

  it.each([['supplier-info', 320], ['map-detail-sheet', 380]] as const)('keeps %s modal during its slower exit and closes once', async (className, duration) => {
    const pending = animationDriver()
    render(<dialog open className={className}><button>Close</button></dialog>)
    const dialog = screen.getByRole('dialog') as HTMLDialogElement
    const after = vi.fn()
    closeMotionDialog(dialog, after)
    closeMotionDialog(dialog, after)
    expect(Element.prototype.animate).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration }))
    expect(dialog.open).toBe(true)
    await act(async () => pending.at(-1)!.finish())
    expect(dialog.open).toBe(false)
    expect(after).toHaveBeenCalledTimes(1)
  })

  it('commits rapid native transitions once and preserves the latest destination', async () => {
    const captures: { update: () => void; finish: () => void }[] = []
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value: (update: () => void) => {
      let finish!: () => void
      const finished = new Promise<void>(resolve => { finish = resolve })
      captures.push({ update, finish })
      return { ready: Promise.resolve(), finished, skipTransition() {} }
    } })
    function Pages() {
      const ref = useRef<HTMLDivElement>(null), [value, setValue] = useState('Home')
      const change = useContentMotion(ref)
      return <div ref={ref}><button onClick={() => change(() => setValue('Places'))}>Places</button><button onClick={() => change(() => setValue('Home'))}>Home</button><h1>{value}</h1></div>
    }
    try {
      render(<Pages />)
      fireEvent.click(screen.getByRole('button', { name: 'Places' }))
      fireEvent.click(screen.getByRole('button', { name: 'Home' }))
      act(() => captures[1].update())
      act(() => captures[0].update())
      expect(screen.getByRole('heading')).toHaveTextContent('Home')
      await act(async () => captures.forEach(capture => capture.finish()))
      expect(document.documentElement).not.toHaveAttribute('data-wave-motion')
    } finally { Reflect.deleteProperty(document, 'startViewTransition') }
  })
})
