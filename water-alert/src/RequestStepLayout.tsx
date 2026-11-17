import type { ReactNode, RefObject } from 'react'

/** One centred card per screen: progress header, one column of questions, then the footer actions. `wide` is the review screen. */
export function RequestStepLayout({ title, heading, footer, status, progress, wide = false, children }: {
  title: string; heading: RefObject<HTMLHeadingElement | null>; footer: ReactNode;
  status: ReactNode; progress: ReactNode; wide?: boolean; children: ReactNode;
}) {
  return <div className={`request-step-layout request-four-screen${wide ? ' request-wide' : ''}`}>
    <section className="request-card" aria-label={title}>
      <div className="request-card-toolbar">{progress}{status}</div>
      <header className="request-title-row"><h1 ref={heading} tabIndex={-1}>{title}</h1></header>
      <div className="request-card-body">{children}</div>
      {footer ? <div className="request-card-action">{footer}</div> : null}
    </section>
  </div>
}
