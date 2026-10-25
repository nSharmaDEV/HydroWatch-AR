import type { ReactNode, RefObject } from 'react'

/** One shared frame; the content owns its panels, not the app shell. */
export function RequestStepLayout({ title, heading, action, supplier, status, progress, topLine, children }: {
  title: string; heading: RefObject<HTMLHeadingElement | null>; action: ReactNode;
  supplier: string; status: ReactNode; progress: ReactNode; topLine?: ReactNode; children: ReactNode;
}) {
  return <div className="request-step-layout">
    <div className="request-frame-topline">{topLine}{progress}</div>
    <div className="request-title-row"><h1 ref={heading} tabIndex={-1}>{title}</h1><span className="request-leader" aria-hidden="true" />{action}</div>
    <div className="request-supplier-line"><p className="request-provider">{supplier}</p>{status}</div>
    {children}
  </div>
}
