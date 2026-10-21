import { useEffect, useState } from 'react'
import logo from '../assets/wave-logo-traced.svg?raw'
import './logo-intro.css'

const sessionKey = 'wave:logo-intro:v1'

function shouldShowIntro() {
  try { return sessionStorage.getItem(sessionKey) !== 'seen' } catch { return true }
}

export default function LogoIntro() {
  const [visible, setVisible] = useState(shouldShowIntro)
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)

  useEffect(() => {
    if (!visible) return
    try { sessionStorage.setItem(sessionKey, 'seen') } catch { /* Storage may be blocked; never block the website. */ }
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media?.matches ?? false)
    media?.addEventListener('change', update)
    // Independent of animationend: removal still happens if CSS animations are disabled.
    const timer = window.setTimeout(() => setVisible(false), reduced ? 650 : 2510)
    return () => { window.clearTimeout(timer); media?.removeEventListener('change', update) }
  }, [visible, reduced])

  return visible ? <div className={`logo-intro${reduced ? ' logo-intro--reduced' : ''}`} aria-hidden="true">
    <div className="logo-intro__art" dangerouslySetInnerHTML={{ __html: logo }} />
  </div> : null
}
