import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { ExternalLink, GripVertical, Pencil, Trash2 } from 'lucide-react';
import type { Shortcut } from '../../types/domain';
import { Favicon } from '../common/Favicon';
import { Menu, MenuItem, MenuSeparator } from '../common/Menu';

export function ShortcutTile({ shortcut, onEdit, onDelete }: {
  shortcut: Shortcut;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const sortable = useSortable({ id: `shortcut:${shortcut.id}`, data: { type: 'shortcut', shortcut } });
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };
  return (
    <div ref={sortable.setNodeRef} style={style} className={`shortcut-tile-wrap ${sortable.isDragging ? 'is-dragging' : ''}`}>
      <a className="shortcut-tile" href={shortcut.url} title={`${shortcut.name} — ${shortcut.url}`}>
        <span className="shortcut-tile__logo"><Favicon url={shortcut.url} name={shortcut.name} source={shortcut.faviconUrl} size="large" /></span>
        <span className="shortcut-tile__name">{shortcut.name}</span>
      </a>
      <div className="shortcut-tile__menu" onPointerDown={(event) => event.stopPropagation()}>
        <Menu label={`${shortcut.name} actions`}>
          <MenuItem className="menu-item" onSelect={onEdit}><Pencil size={15} />Edit</MenuItem>
          <MenuItem className="menu-item" onSelect={() => window.open(shortcut.url, '_blank')}><ExternalLink size={15} />Open in new tab</MenuItem>
          <MenuSeparator className="menu-separator" />
          <MenuItem className="menu-item menu-item--danger" onSelect={onDelete}><Trash2 size={15} />Delete</MenuItem>
        </Menu>
      </div>
      <button type="button" className="shortcut-tile__drag" aria-label={`Reorder ${shortcut.name}`} {...sortable.attributes} {...sortable.listeners}><GripVertical size={15} /></button>
    </div>
  );
}
