import { useId, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

export function Disclosure({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  return <div className={`disclosure ${className} ${open ? 'is-open' : ''}`}>
    <button className="disclosure-trigger" type="button" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen(value => !value)}>{label}<Icon name="chevron" size={12} /></button>
    <div className="disclosure-reveal" id={contentId} aria-hidden={!open} inert={!open}>
      <div className="disclosure-inner">{children}</div>
    </div>
  </div>;
}
