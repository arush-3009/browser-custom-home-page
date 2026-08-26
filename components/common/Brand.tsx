import { PanelsTopLeft } from 'lucide-react';
import clsx from 'clsx';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={clsx('brand', compact && 'brand--compact')} aria-label="Browser Home">
      <span className="brand__mark" aria-hidden="true"><PanelsTopLeft size={compact ? 16 : 18} strokeWidth={2.2} /></span>
      <span>Browser Home</span>
    </div>
  );
}
