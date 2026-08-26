import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { PropsWithChildren } from 'react';

export function TooltipProvider({ children }: PropsWithChildren) {
  return <TooltipPrimitive.Provider delayDuration={550}>{children}</TooltipPrimitive.Provider>;
}

export function Tooltip({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className="tooltip-content" sideOffset={7}>{label}</TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
