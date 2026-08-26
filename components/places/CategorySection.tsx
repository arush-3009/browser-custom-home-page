import { useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Category, Shortcut } from '../../types/domain';
import { Menu, MenuItem, MenuSeparator } from '../common/Menu';
import { ShortcutTile } from './ShortcutTile';

export function CategorySection({ category, shortcuts, onToggle, onAdd, onEditCategory, onDeleteCategory, onEditShortcut, onDeleteShortcut }: {
  category: Category;
  shortcuts: Shortcut[];
  onToggle: () => void;
  onAdd: () => void;
  onEditCategory: () => void;
  onDeleteCategory: () => void;
  onEditShortcut: (shortcut: Shortcut) => void;
  onDeleteShortcut: (shortcut: Shortcut) => void;
}) {
  const sortable = useSortable({ id: `category:${category.id}`, data: { type: 'category', category } });
  const droppable = useDroppable({ id: `category-drop:${category.id}`, data: { type: 'category-drop', categoryId: category.id } });
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };
  return (
    <article ref={sortable.setNodeRef} style={style} className={`category-panel ${sortable.isDragging ? 'is-dragging' : ''}`}>
      <header className="category-header">
        <div className="category-title-group">
          <button type="button" className="category-drag" aria-label={`Reorder ${category.name} section`} {...sortable.attributes} {...sortable.listeners}><GripVertical size={17} /></button>
          <button type="button" className="category-toggle" onClick={onToggle} aria-expanded={!category.collapsed}>
            {category.collapsed ? <ChevronRight size={17} /> : <ChevronDown size={17} />}
            <span>{category.name}</span>
            <small>{shortcuts.length}</small>
          </button>
        </div>
        <div className="category-actions">
          <button type="button" className="button button--quiet button--small" onClick={onAdd}><Plus size={15} />Add place</button>
          <Menu>
            <MenuItem className="menu-item" onSelect={onEditCategory}><Pencil size={15} />Rename section</MenuItem>
            <MenuSeparator className="menu-separator" />
            <MenuItem className="menu-item menu-item--danger" onSelect={onDeleteCategory}><Trash2 size={15} />Delete section</MenuItem>
          </Menu>
        </div>
      </header>
      {!category.collapsed && (
        <div ref={droppable.setNodeRef} className={`shortcut-grid ${droppable.isOver ? 'is-drop-target' : ''}`}>
          <SortableContext items={shortcuts.map((shortcut) => `shortcut:${shortcut.id}`)} strategy={rectSortingStrategy}>
            {shortcuts.map((shortcut) => <ShortcutTile key={shortcut.id} shortcut={shortcut} onEdit={() => onEditShortcut(shortcut)} onDelete={() => onDeleteShortcut(shortcut)} />)}
          </SortableContext>
          {shortcuts.length === 0 && <button type="button" className="category-empty" onClick={onAdd}><Plus size={17} />Add the first place</button>}
        </div>
      )}
    </article>
  );
}
