import type { ReactNode, RefObject } from 'react'

/** One centred card per step: title and supplier at the top, the step's one question, the primary action at the bottom. */
export function RequestStepLayout({ title, heading, action, supplier, status, progress, topLine, children }: {
  title: string; heading: RefObject<HTMLHeadingElement | null>; action: ReactNode;
  supplier: string; status: ReactNode; progress: ReactNode; topLine?: ReactNode; children: ReactNode;
}) {
  return <div className="request-step-layout request-four-screen">
    <section className="request-card" aria-label={title}>
      <div className="request-card-toolbar">{topLine}<div className="request-frame-topline">{progress}</div></div>
      <header className="request-title-row"><h1 ref={heading} tabIndex={-1}>{title}</h1>{supplier || status ? <div className="request-supplier-line">{supplier ? <p className="request-provider">{supplier}</p> : null}{status}</div> : null}</header>
      <div className="request-card-body">{children}</div>
      {action ? <div className="request-card-action">{action}</div> : null}
    </section>
  </div>
}
