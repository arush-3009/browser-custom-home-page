import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import type { PropsWithChildren, ReactNode } from 'react';

export function Menu({ children, label = 'More actions', trigger }: PropsWithChildren<{ label?: string; trigger?: ReactNode }>) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {trigger ?? <button type="button" className="icon-button subtle-control" aria-label={label}><MoreHorizontal size={18} /></button>}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="menu-content" sideOffset={7} align="end">
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export const MenuItem = DropdownMenu.Item;
export const MenuSeparator = DropdownMenu.Separator;
