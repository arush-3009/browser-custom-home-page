import { useEffect, useState } from 'react';
import type { Category, Shortcut } from '../../types/domain';
import { ensureWebUrl } from '../../lib/utils/url';
import { AppDialog } from '../common/Dialog';
import { SelectField } from '../common/SelectField';

export interface PlaceFormValue {
  name: string;
  url: string;
  categoryId?: string;
  newCategoryName?: string;
}

export function PlaceDialog({ open, onOpenChange, categories, shortcut, defaultCategoryId, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  shortcut?: Shortcut | undefined;
  defaultCategoryId?: string | undefined;
  onSave: (value: PlaceFormValue) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('Favorites');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(shortcut?.name ?? '');
    setUrl(shortcut?.url ?? '');
    setCategoryId(shortcut?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '');
    setNewCategoryName('Favorites');
    setError('');
  }, [open, shortcut, defaultCategoryId, categories]);

  const submit = async () => {
    try {
      if (!name.trim()) throw new Error('Enter a name for this place.');
      const normalizedUrl = ensureWebUrl(url);
      if (categories.length === 0 && !newCategoryName.trim()) throw new Error('Name the section for this place.');
      setSaving(true);
      await onSave({
        name: name.trim(),
        url: normalizedUrl,
        ...(categoryId ? { categoryId } : {}),
        ...(categories.length === 0 ? { newCategoryName: newCategoryName.trim() } : {}),
      });
      onOpenChange(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'This place could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={shortcut ? 'Edit place' : 'Add a place'}
      description="Create a visual shortcut to somewhere you return to."
      footer={<>
        <button type="button" className="button button--ghost" onClick={() => onOpenChange(false)}>Cancel</button>
        <button type="button" className="button button--primary" onClick={() => void submit()} disabled={saving}>{saving ? 'Saving…' : 'Save place'}</button>
      </>}
    >
      <div className="form-stack">
        <label className="field-label">Name<input className="text-field" value={name} onChange={(event) => setName(event.target.value)} placeholder="GitHub" autoFocus maxLength={100} /></label>
        <label className="field-label">Website address<input className="text-field" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="github.com" inputMode="url" /></label>
        {categories.length > 0 ? (
          <label className="field-label">Section<SelectField label="Choose section" value={categoryId} onValueChange={setCategoryId} options={categories.map((category) => ({ value: category.id, label: category.name }))} /></label>
        ) : (
          <label className="field-label">First section<input className="text-field" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Favorites" maxLength={80} /></label>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </AppDialog>
  );
}
