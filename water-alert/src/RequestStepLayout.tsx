import type { ReactNode, RefObject } from 'react'

/** One centred card per step: title and supplier at the top, the step's one question, the primary action at the bottom. */
export function RequestStepLayout({ title, heading, action, supplier, status, progress, topLine, children }: {
  title: string; heading: RefObject<HTMLHeadingElement | null>; action: ReactNode;
  supplier: string; status: ReactNode; progress: ReactNode; topLine?: ReactNode; children: ReactNode;
}) {
  return <div className="request-step-layout">
    <div className="request-frame-topline">{topLine}{progress}</div>
    <section className="request-card" aria-label={title}>
      <header className="request-title-row"><h1 ref={heading} tabIndex={-1}>{title}</h1><div className="request-supplier-line"><p className="request-provider">{supplier}</p>{status}</div></header>
      <div className="request-card-body">{children}</div>
      <div className="request-card-action">{action}</div>
    </section>
  </div>
}
