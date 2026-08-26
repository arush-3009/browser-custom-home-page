import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Compass, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BrowserHomeData, Category, Shortcut } from '../../types/domain';
import { createCategory, deleteCategory, moveShortcut, normalizeShortcutOrder, reorderCategories, upsertShortcut } from '../../features/places/operations';
import { nowIso } from '../../lib/utils/id';
import { AppDialog } from '../common/Dialog';
import { Favicon } from '../common/Favicon';
import { useToast } from '../common/Toast';
import { CategoryDialog } from './CategoryDialog';
import { CategorySection } from './CategorySection';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';
import { PlaceDialog, type PlaceFormValue } from './PlaceDialog';

interface PlacesSectionProps {
  data: BrowserHomeData;
  mutate: (mutator: (data: BrowserHomeData) => BrowserHomeData) => Promise<BrowserHomeData>;
}

export function PlacesSection({ data, mutate }: PlacesSectionProps) {
  const { show } = useToast();
  const [placeDialog, setPlaceDialog] = useState<{ open: boolean; shortcut?: Shortcut; categoryId?: string }>({ open: false });
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; category?: Category }>({ open: false });
  const [deleteCategoryState, setDeleteCategoryState] = useState<Category | null>(null);
  const [deleteShortcutState, setDeleteShortcutState] = useState<Shortcut | null>(null);
  const [activeShortcut, setActiveShortcut] = useState<Shortcut | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const categories = useMemo(() => [...data.categories].sort((a, b) => a.order - b.order), [data.categories]);

  const savePlace = async (value: PlaceFormValue) => {
    await mutate((current) => {
      let next = current;
      let categoryId = value.categoryId;
      if (!categoryId && value.newCategoryName) {
        next = createCategory(next, value.newCategoryName);
        categoryId = next.categories.at(-1)?.id;
      }
      if (!categoryId) throw new Error('Choose a section.');
      return upsertShortcut(next, {
        ...(placeDialog.shortcut ? { id: placeDialog.shortcut.id } : {}),
        name: value.name,
        url: value.url,
        categoryId,
      });
    });
    show(placeDialog.shortcut ? 'Place updated' : 'Place added');
  };

  const saveCategory = async (name: string) => {
    await mutate((current) => {
      if (!categoryDialog.category) return createCategory(current, name);
      return {
        ...current,
        categories: current.categories.map((category) => category.id === categoryDialog.category!.id
          ? { ...category, name, updatedAt: nowIso() }
          : category),
      };
    });
    show(categoryDialog.category ? 'Section renamed' : 'Section created');
  };

  const onDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith('shortcut:')) setActiveShortcut(data.shortcuts.find((shortcut) => `shortcut:${shortcut.id}` === id) ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveShortcut(null);
    if (!event.over || event.active.id === event.over.id) return;
    const activeId = String(event.active.id);
    const overId = String(event.over.id);

    if (activeId.startsWith('category:')) {
      const activeCategoryId = activeId.replace('category:', '');
      const overData = event.over.data.current;
      const overCategoryId = overId.startsWith('category:')
        ? overId.replace('category:', '')
        : overId.startsWith('category-drop:')
          ? overId.replace('category-drop:', '')
          : typeof overData?.categoryId === 'string'
            ? overData.categoryId
            : overData?.shortcut && typeof (overData.shortcut as Shortcut).categoryId === 'string'
              ? (overData.shortcut as Shortcut).categoryId
              : undefined;
      if (!overCategoryId) return;
      void mutate((current) => reorderCategories(current, activeCategoryId, overCategoryId));
      return;
    }

    if (!activeId.startsWith('shortcut:')) return;
    const shortcutId = activeId.replace('shortcut:', '');
    let targetCategoryId: string | undefined;
    let targetIndex = 0;
    if (overId.startsWith('shortcut:')) {
      const overShortcut = data.shortcuts.find((shortcut) => `shortcut:${shortcut.id}` === overId);
      targetCategoryId = overShortcut?.categoryId;
      targetIndex = [...data.shortcuts]
        .filter((shortcut) => shortcut.categoryId === targetCategoryId)
        .sort((a, b) => a.order - b.order)
        .findIndex((shortcut) => shortcut.id === overShortcut?.id);
    } else {
      targetCategoryId = (event.over.data.current?.categoryId as string | undefined)
        ?? (overId.startsWith('category:') ? overId.replace('category:', '') : undefined)
        ?? (overId.startsWith('category-drop:') ? overId.replace('category-drop:', '') : undefined);
      targetIndex = data.shortcuts.filter((shortcut) => shortcut.categoryId === targetCategoryId).length;
    }
    if (!targetCategoryId) return;
    void mutate((current) => moveShortcut(current, shortcutId, targetCategoryId, Math.max(0, targetIndex)));
  };

  const deleteShortcut = async () => {
    if (!deleteShortcutState) return;
    const categoryId = deleteShortcutState.categoryId;
    await mutate((current) => ({
      ...current,
      shortcuts: normalizeShortcutOrder(current.shortcuts.filter((shortcut) => shortcut.id !== deleteShortcutState.id), categoryId),
    }));
    setDeleteShortcutState(null);
    show('Place removed', { tone: 'info' });
  };

  return (
    <section className="content-section" aria-labelledby="places-heading">
      <div className="section-heading-row section-heading-row--compact">
        <p id="places-heading" className="eyebrow"><Compass size={15} />Places <span className="eyebrow__divider">/</span> Shortcuts</p>
        {categories.length > 0 && <button type="button" className="button button--quiet" onClick={() => setCategoryDialog({ open: true })}><Plus size={16} />New section</button>}
      </div>

      {categories.length === 0 ? (
        <div className="empty-state empty-state--places">
          <span className="empty-state__icon"><Compass size={23} /></span>
          <div><h3>Your internet, organized your way.</h3><p>Start with one place you return to. Browser Home will create its first section with it.</p></div>
          <button type="button" className="button button--primary" onClick={() => setPlaceDialog({ open: true })}><Plus size={16} />Add your first website</button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveShortcut(null)}>
          <SortableContext items={categories.map((category) => `category:${category.id}`)} strategy={verticalListSortingStrategy}>
            <div className="category-stack">
              {categories.map((category) => {
                const shortcuts = data.shortcuts.filter((shortcut) => shortcut.categoryId === category.id).sort((a, b) => a.order - b.order);
                return <CategorySection
                  key={category.id}
                  category={category}
                  shortcuts={shortcuts}
                  onToggle={() => void mutate((current) => ({ ...current, categories: current.categories.map((item) => item.id === category.id ? { ...item, collapsed: !item.collapsed, updatedAt: nowIso() } : item) }))}
                  onAdd={() => setPlaceDialog({ open: true, categoryId: category.id })}
                  onEditCategory={() => setCategoryDialog({ open: true, category })}
                  onDeleteCategory={() => setDeleteCategoryState(category)}
                  onEditShortcut={(shortcut) => setPlaceDialog({ open: true, shortcut })}
                  onDeleteShortcut={setDeleteShortcutState}
                />;
              })}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
            {activeShortcut && <div className="shortcut-drag-overlay"><Favicon url={activeShortcut.url} name={activeShortcut.name} source={activeShortcut.faviconUrl} size="large" /><span>{activeShortcut.name}</span></div>}
          </DragOverlay>
        </DndContext>
      )}

      <PlaceDialog open={placeDialog.open} onOpenChange={(open) => setPlaceDialog((current) => ({ ...current, open }))} categories={categories} shortcut={placeDialog.shortcut} defaultCategoryId={placeDialog.categoryId} onSave={savePlace} />
      <CategoryDialog open={categoryDialog.open} onOpenChange={(open) => setCategoryDialog((current) => ({ ...current, open }))} initialName={categoryDialog.category?.name} onSave={saveCategory} />
      <DeleteCategoryDialog
        open={Boolean(deleteCategoryState)}
        onOpenChange={(open) => { if (!open) setDeleteCategoryState(null); }}
        category={deleteCategoryState}
        shortcutCount={data.shortcuts.filter((shortcut) => shortcut.categoryId === deleteCategoryState?.id).length}
        categories={categories}
        onConfirm={async (strategy) => {
          if (!deleteCategoryState) return;
          await mutate((current) => deleteCategory(current, deleteCategoryState.id, strategy));
          setDeleteCategoryState(null);
          show('Section deleted', { tone: 'info' });
        }}
      />
      <AppDialog
        open={Boolean(deleteShortcutState)}
        onOpenChange={(open) => { if (!open) setDeleteShortcutState(null); }}
        title={`Remove “${deleteShortcutState?.name ?? 'this place'}”?`}
        description="This removes the shortcut from Browser Home. It does not affect the website or your browser history."
        size="small"
        footer={<>
          <button type="button" className="button button--ghost" onClick={() => setDeleteShortcutState(null)}>Cancel</button>
          <button type="button" className="button button--danger" onClick={() => void deleteShortcut()}>Remove place</button>
        </>}
      ><p className="notice">You can add it again at any time.</p></AppDialog>
    </section>
  );
}
